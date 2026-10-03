import { session, sql } from "@elements/app";

/** Rows for tests. The test database has no demo seed. */
export interface Fixture {
  showId: string;
  otherShowId: string;
  gaId: string;
  balconyId: string;
  orderId: string;
  orderToken: string;
  codes: string[];
  ticketIds: string[];
}

export function staff(role: "admin" | "door" = "door"): string {
  let user = sql<{ id: string; name: string }>(`
    insert into users (email, name, passwordHash, role)
         values (${`${role}-${Math.random()}@test.dev`}, ${`Test ${role}`}, crypt('secret-pass', genSalt('bf', 4)), ${role})
      returning id, name
  `).firstOrThrow();

  session.login({ userId: user.id, userName: user.name, role });

  return user.id;
}

function show(title: string, daysAhead: number): string {
  return sql<{ id: string }>(`
    insert into shows (title, doorsAt, startsAt)
         values (${title}, now() + make_interval(days => ${daysAhead}), now() + make_interval(days => ${daysAhead}, hours => 1))
      returning id
  `).firstOrThrow().id;
}

export function fixture(): Fixture {
  let showId = show("Fixture Band", 1);
  let otherShowId = show("Other Band", 8);

  let gaId = sql<{ id: string }>(`
    insert into ticketTypes (showId, name, priceCents, quantity, position)
         values (${showId}, 'General admission', 2000, 10, 0) returning id
  `).firstOrThrow().id;

  let balconyId = sql<{ id: string }>(`
    insert into ticketTypes (showId, name, priceCents, quantity, position)
         values (${showId}, 'Balcony', 3500, 2, 1) returning id
  `).firstOrThrow().id;

  let order = sql<{ id: string; token: string }>(`
    insert into orders (showId, name, email, status, amountTotal)
         values (${showId}, 'Ada Lovelace', 'ada@example.com', 'paid', 4000) returning id, token
  `).firstOrThrow();

  let tickets = sql<{ id: string; code: string }>(`
    insert into tickets (orderId, showId, ticketTypeId, holderName, email)
    select ${order.id}, ${showId}, ${gaId}, 'Ada Lovelace', 'ada@example.com' from generate_series(1, 2)
    returning id, code
  `).all();

  return {
    showId,
    otherShowId,
    gaId,
    balconyId,
    orderId: order.id,
    orderToken: order.token,
    codes: tickets.map((t) => t.code),
    ticketIds: tickets.map((t) => t.id),
  };
}

export function counts(ticketTypeId: string): { sold: number; checkedIn: number } {
  return sql<{ sold: number; checkedIn: number }>(`select sold, checkedIn from ticketTypes where id = ${ticketTypeId}`).firstOrThrow();
}
