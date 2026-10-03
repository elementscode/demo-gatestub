-- demo rows: two venue logins, five shows with posters, and ticket sales
/** @env development */

insert into users (email, name, passwordHash, role) values
  ('admin@gatestub.test', 'Ramona Vega', crypt('backstage', genSalt('bf', 10)), 'admin'),
  ('door@gatestub.test',  'Theo Park',   crypt('frontdoor', genSalt('bf', 10)), 'door');

create temporary table seedShows (
  slot integer,
  dayOffset integer,
  title text,
  support text,
  description text,
  doorsTime time,
  showTime time,
  gaPrice integer,
  gaQty integer,
  gaSold integer,
  balconyPrice integer,
  balconyQty integer,
  balconySold integer,
  poster text
) on commit drop;

insert into seedShows values
(1, 0, 'Mercury Fuzz Choir', 'with Lowercase Saints',
 'Fuzz-drenched dream pop from the band that sold out the Gatehouse twice last winter. Expect it loud.',
 '19:30', '20:30', 2200, 220, 176, 3500, 60, 54,
 $svg$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900" width="600" height="900">
<rect width="600" height="900" fill="#14060f"/>
<g fill="none" stroke="#ff2d78" stroke-width="14">
<circle cx="300" cy="360" r="60"/><circle cx="300" cy="360" r="110" opacity=".8"/><circle cx="300" cy="360" r="160" opacity=".6"/><circle cx="300" cy="360" r="210" opacity=".4"/><circle cx="300" cy="360" r="260" opacity=".25"/><circle cx="300" cy="360" r="310" opacity=".12"/>
</g>
<circle cx="300" cy="360" r="28" fill="#ffd166"/>
<rect x="0" y="640" width="600" height="260" fill="#ff2d78"/>
<text x="40" y="720" font-family="Impact, 'Arial Narrow', sans-serif" font-size="74" fill="#14060f" letter-spacing="2">MERCURY</text>
<text x="40" y="800" font-family="Impact, 'Arial Narrow', sans-serif" font-size="88" fill="#14060f" letter-spacing="2">FUZZ CHOIR</text>
<text x="40" y="856" font-family="Helvetica, Arial, sans-serif" font-size="24" font-weight="700" fill="#14060f" letter-spacing="6">+ LOWERCASE SAINTS</text>
<text x="40" y="80" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="700" fill="#ffd166" letter-spacing="8">THE GATEHOUSE</text>
</svg>$svg$),

(2, 6, 'Marigold Tape', 'with June Hollow',
 'Sun-warped soul and tape-loop grooves. A seven-piece band with two drummers and a horn section.',
 '19:00', '20:00', 1800, 220, 131, 3000, 60, 22,
 $svg$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900" width="600" height="900">
<rect width="600" height="900" fill="#ffb627"/>
<g fill="#e2461f">
<path d="M300 420 L300 -200 L360 -200 Z"/><path d="M300 420 L700 0 L720 60 Z"/><path d="M300 420 L900 380 L900 450 Z"/><path d="M300 420 L-100 0 L-120 60 Z"/><path d="M300 420 L-300 380 L-300 450 Z"/><path d="M300 420 L-60 -200 L0 -200 Z"/><path d="M300 420 L620 -200 L680 -200 Z"/>
</g>
<circle cx="300" cy="420" r="150" fill="#e2461f"/>
<circle cx="300" cy="420" r="112" fill="#ffb627"/>
<rect x="200" y="392" width="200" height="56" rx="10" fill="#3b1a0b"/>
<circle cx="245" cy="420" r="16" fill="#ffb627"/><circle cx="355" cy="420" r="16" fill="#ffb627"/>
<text x="300" y="720" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="92" fill="#3b1a0b">Marigold</text>
<text x="300" y="800" text-anchor="middle" font-family="Impact, 'Arial Narrow', sans-serif" font-size="80" fill="#3b1a0b" letter-spacing="24">TAPE</text>
<text x="300" y="858" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="700" fill="#3b1a0b" letter-spacing="6">WITH JUNE HOLLOW</text>
</svg>$svg$),

(3, 13, 'Kite Harbor', 'with The Paper Moons',
 'Coastal folk rock with three-part harmonies. Their new record, Salt Lines, out the same week.',
 '19:30', '20:30', 2000, 220, 84, 3200, 60, 19,
 $svg$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900" width="600" height="900">
<rect width="600" height="900" fill="#0b2545"/>
<circle cx="420" cy="220" r="90" fill="#f4f1de"/>
<path d="M150 120 L230 200 L150 300 L70 200 Z" fill="#e07a5f"/>
<path d="M150 300 C 170 360, 120 400, 160 460" stroke="#f4f1de" stroke-width="4" fill="none"/>
<g fill="none" stroke-width="18" stroke-linecap="round">
<path d="M-20 520 Q 55 480 130 520 T 280 520 T 430 520 T 580 520 T 730 520" stroke="#3d5a80"/>
<path d="M-20 570 Q 55 530 130 570 T 280 570 T 430 570 T 580 570 T 730 570" stroke="#5c8dbf"/>
<path d="M-20 620 Q 55 580 130 620 T 280 620 T 430 620 T 580 620 T 730 620" stroke="#98c1d9"/>
</g>
<text x="40" y="750" font-family="Impact, 'Arial Narrow', sans-serif" font-size="110" fill="#f4f1de" letter-spacing="4">KITE</text>
<text x="40" y="832" font-family="Impact, 'Arial Narrow', sans-serif" font-size="80" fill="#e07a5f" letter-spacing="4">HARBOR</text>
<text x="40" y="876" font-family="Helvetica, Arial, sans-serif" font-size="20" font-weight="700" fill="#98c1d9" letter-spacing="4">+ THE PAPER MOONS</text>
</svg>$svg$),

(4, 20, 'Neon Orchard', 'with DJ Pomelo',
 'Synth-pop with a light show built in a barn in Vermont. Late show, dancing encouraged.',
 '21:00', '22:00', 2500, 220, 57, 4000, 60, 11,
 $svg$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900" width="600" height="900">
<rect width="600" height="900" fill="#081c15"/>
<g stroke-width="22" stroke-linecap="round">
<line x1="60" y1="620" x2="60" y2="120" stroke="#2dffb3"/>
<line x1="130" y1="620" x2="130" y2="180" stroke="#52b788"/>
<line x1="200" y1="620" x2="200" y2="90" stroke="#2dffb3"/>
<line x1="270" y1="620" x2="270" y2="220" stroke="#95d5b2"/>
<line x1="340" y1="620" x2="340" y2="140" stroke="#2dffb3"/>
<line x1="410" y1="620" x2="410" y2="260" stroke="#52b788"/>
<line x1="480" y1="620" x2="480" y2="110" stroke="#2dffb3"/>
<line x1="550" y1="620" x2="550" y2="200" stroke="#95d5b2"/>
</g>
<g fill="#ff4fd8">
<circle cx="60" cy="120" r="26"/><circle cx="200" cy="90" r="26"/><circle cx="340" cy="140" r="26"/><circle cx="480" cy="110" r="26"/>
</g>
<text x="300" y="740" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="900" font-size="92" fill="#2dffb3" letter-spacing="-2">NEON</text>
<text x="300" y="820" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="900" font-size="80" fill="#ff4fd8" letter-spacing="-2">ORCHARD</text>
<text x="300" y="866" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="20" font-weight="700" fill="#95d5b2" letter-spacing="8">DJ POMELO LATE SET</text>
</svg>$svg$),

(5, 27, 'Rust Belt Rodeo', 'with Carrie Ashgrove',
 'Road-worn country and honky-tonk. Bring your boots, the floor is cleared after the opener.',
 '19:00', '20:00', 2000, 220, 38, 3000, 60, 6,
 $svg$<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900" width="600" height="900">
<rect width="600" height="900" fill="#f2e3c6"/>
<rect width="600" height="460" fill="#c1440e"/>
<circle cx="300" cy="460" r="170" fill="#f29e4c"/>
<rect y="460" width="600" height="440" fill="#f2e3c6"/>
<path d="M0 460 L140 360 L230 430 L330 330 L450 440 L600 380 L600 470 L0 470 Z" fill="#6b2d0c"/>
<g stroke="#6b2d0c" stroke-width="6">
<line x1="0" y1="500" x2="600" y2="500"/><line x1="0" y1="516" x2="600" y2="516"/>
</g>
<text x="300" y="660" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="84" fill="#6b2d0c">RUST BELT</text>
<text x="300" y="730" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="60" fill="#c1440e">Rodeo</text>
<text x="300" y="830" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="700" fill="#6b2d0c" letter-spacing="6">WITH CARRIE ASHGROVE</text>
</svg>$svg$);

do $$
declare
  tz text := 'America/New_York';
  today date := (now() at time zone 'America/New_York')::date;
  doorUser uuid := (select id from users where email = 'door@gatestub.test');
  firstNames text[] := array['Ada','Ben','Cleo','Dev','Eli','Fern','Gus','Hana','Ivy','Jonah','Kira','Leo','Mona','Nico','Opal','Pete','Quinn','Rosa','Sam','Tess','Uma','Vic','Wren','Xavi','Yara','Zeke','Alma','Bo','Cyrus','Dina','Emil','Faye','Gio','Hugo','Iris','Jude','Kai','Lena','Milo','Nora'];
  lastNames text[] := array['Alvarez','Brooks','Chen','Dubois','Ellis','Fischer','Garcia','Hughes','Ito','Jensen','Khan','Lopez','Morgan','Nakamura','Okafor','Patel','Quint','Reyes','Silva','Turner','Ueda','Vance','Walsh','Xu','Young','Zimmer','Abbott','Byrne','Castro','Diaz'];
  s record;
  showId uuid;
  gaId uuid;
  balconyId uuid;
  kind record;
  remaining integer;
  qty integer;
  orderId uuid;
  buyer text;
  buyerEmail text;
  n integer := 0;
  isTonight boolean;
begin
  for s in select * from seedShows order by slot loop
    isTonight := s.dayOffset = 0;

    insert into shows (title, support, description, doorsAt, startsAt, posterType, posterData)
    values (
      s.title, s.support, s.description,
      ((today + s.dayOffset) + s.doorsTime) at time zone tz,
      ((today + s.dayOffset) + s.showTime) at time zone tz,
      'image/svg+xml', convert_to(s.poster, 'UTF8')
    )
    returning id into showId;

    insert into ticketTypes (showId, name, priceCents, quantity, position)
    values (showId, 'General admission', s.gaPrice, s.gaQty, 0)
    returning id into gaId;

    insert into ticketTypes (showId, name, priceCents, quantity, position)
    values (showId, 'Balcony', s.balconyPrice, s.balconyQty, 1)
    returning id into balconyId;

    for kind in
      select gaId as typeId, s.gaSold as target, s.gaPrice as price
      union all
      select balconyId, s.balconySold, s.balconyPrice
    loop
      remaining := kind.target;

      while remaining > 0 loop
        n := n + 1;
        qty := least(remaining, 1 + (n * 7 % 4));
        buyer := firstNames[1 + (n * 13 % array_length(firstNames, 1))] || ' ' || lastNames[1 + (n * 17 % array_length(lastNames, 1))];
        buyerEmail := lower(replace(buyer, ' ', '.')) || n || '@example.com';

        insert into orders (showId, name, email, status, amountTotal, createdAt)
        values (showId, buyer, buyerEmail, 'paid', qty * kind.price, now() - ((n % 20) || ' days')::interval - ((n * 37 % 1440) || ' minutes')::interval)
        returning id into orderId;

        insert into orderLines (orderId, ticketTypeId, quantity, unitAmount)
        values (orderId, kind.typeId, qty, kind.price);

        insert into payments (stripeSessionId, orderId, amountTotal, currency)
        values ('cs_seed_' || orderId, orderId, qty * kind.price, 'usd');

        -- Tonight: about three in five tickets are already through the door,
        -- whole orders at a time, the way a group arrives.
        insert into tickets (orderId, showId, ticketTypeId, holderName, email, checkedInAt, checkedInBy)
        select orderId, showId, kind.typeId, buyer, buyerEmail,
               case when isTonight and n % 5 < 3 then now() - ((n % 45) || ' minutes')::interval end,
               case when isTonight and n % 5 < 3 then doorUser end
          from generate_series(1, qty);

        remaining := remaining - qty;
      end loop;
    end loop;
  end loop;
end;
$$;
