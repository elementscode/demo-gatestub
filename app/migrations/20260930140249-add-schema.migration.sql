-- add schema

-- Auto-update updatedAt on row changes.
create or replace function touchUpdatedAt()
returns trigger
language plpgsql
as $$
begin
  new.updatedAt = now();
  return new;
end;
$$;

create type userRole as enum ('admin', 'door');

create table users (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  email text not null unique,
  name text not null,
  passwordHash text not null,
  role userRole not null default 'door'
);

create trigger usersTouchUpdatedAt
  before update on users
  for each row execute function touchUpdatedAt();

create table shows (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  title text not null,
  support text not null default '',
  description text not null default '',
  doorsAt timestamptz not null,
  startsAt timestamptz not null,
  posterType text,
  posterData bytea,
  -- The poster's cache key: a new poster is a new URL.
  posterHash text generated always as (encode(sha256(posterData), 'hex')) stored
);

create index showsStartsAtIdx on shows (startsAt);

create trigger showsTouchUpdatedAt
  before update on shows
  for each row execute function touchUpdatedAt();

-- sold and checkedIn are kept by triggers on tickets, so every page reading a
-- ticket type reads a count, never an aggregate.
create table ticketTypes (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  showId uuid not null references shows (id) on delete cascade,
  name text not null,
  priceCents integer not null check (priceCents >= 0),
  quantity integer not null check (quantity >= 0),
  sold integer not null default 0,
  checkedIn integer not null default 0,
  position integer not null default 0
);

create index ticketTypesShowIdx on ticketTypes (showId);

create trigger ticketTypesTouchUpdatedAt
  before update on ticketTypes
  for each row execute function touchUpdatedAt();

create type orderStatus as enum ('pending', 'paid', 'expired');

create table orders (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  showId uuid not null references shows (id),
  -- The buyer's link to their tickets. Unguessable, unlike the time-ordered id.
  token text not null unique default encode(genRandomBytes(18), 'hex'),
  name text not null,
  email text not null,
  status orderStatus not null default 'pending',
  amountTotal integer not null default 0,
  expiresAt timestamptz not null default now() + interval '35 minutes'
);

create index ordersShowIdx on orders (showId);

create trigger ordersTouchUpdatedAt
  before update on orders
  for each row execute function touchUpdatedAt();

create table orderLines (
  id uuid primary key default uuidGenerateV7(),
  orderId uuid not null references orders (id) on delete cascade,
  ticketTypeId uuid not null references ticketTypes (id),
  quantity integer not null check (quantity > 0),
  unitAmount integer not null
);

create index orderLinesOrderIdx on orderLines (orderId);

create table tickets (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  orderId uuid not null references orders (id),
  showId uuid not null references shows (id),
  ticketTypeId uuid not null references ticketTypes (id),
  -- What the QR code carries.
  code text not null unique default upper(encode(genRandomBytes(8), 'hex')),
  holderName text not null,
  email text not null,
  checkedInAt timestamptz,
  checkedInBy uuid references users (id)
);

create index ticketsShowIdx on tickets (showId);
create index ticketsHolderIdx on tickets (showId, lower(holderName));

create trigger ticketsTouchUpdatedAt
  before update on tickets
  for each row execute function touchUpdatedAt();

create table payments (
  id uuid primary key default uuidGenerateV7(),
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  stripeSessionId text not null unique,
  orderId uuid not null references orders (id),
  amountTotal integer not null,
  currency text not null
);

create trigger paymentsTouchUpdatedAt
  before update on payments
  for each row execute function touchUpdatedAt();

-- One row per url the app has served from in production, with the signing
-- secret Stripe returned when the app registered that endpoint.
create table stripeWebhooks (
  url text primary key,
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  endpointId text not null,
  secret text not null
);

create trigger stripeWebhooksTouchUpdatedAt
  before update on stripeWebhooks
  for each row execute function touchUpdatedAt();

-- Every ticket issued or checked in moves its type's counts, whichever path
-- wrote it: checkout, the door, a seed, or psql.
create or replace function ticketsCount() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update ticketTypes
       set sold = sold + 1,
           checkedIn = checkedIn + (case when new.checkedInAt is null then 0 else 1 end)
     where id = new.ticketTypeId;

  elsif tg_op = 'DELETE' then
    update ticketTypes
       set sold = sold - 1,
           checkedIn = checkedIn - (case when old.checkedInAt is null then 0 else 1 end)
     where id = old.ticketTypeId;

  elsif (old.checkedInAt is null) <> (new.checkedInAt is null) then
    update ticketTypes
       set checkedIn = checkedIn + (case when new.checkedInAt is null then -1 else 1 end)
     where id = new.ticketTypeId;
  end if;

  return null;
end;
$$;

create trigger ticketsCountTrigger
  after insert or update or delete on tickets
  for each row execute function ticketsCount();

-- Broadcast every ticket type change on the table's channel: the listings, one
-- show's page, the door and the admin all hear it.
create or replace function ticketTypesNotify() returns trigger
language plpgsql as $$
declare
  r record;
  payload text;
begin
  r := coalesce(new, old);

  payload := json_build_object(
    'op', lower(tg_op),
    'data', json_build_object(
      'id', r.id,
      'showId', r.showId,
      'name', r.name,
      'priceCents', r.priceCents,
      'quantity', r.quantity,
      'sold', r.sold,
      'checkedIn', r.checkedIn,
      'position', r.position
    )
  )::text;

  perform pg_notify(channel_name('ticket_types'), payload);

  return r;
end;
$$;

create trigger ticketTypesNotifyTrigger
  after insert or update or delete on ticketTypes
  for each row execute function ticketTypesNotify();
