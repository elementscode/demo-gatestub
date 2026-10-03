import { test, equal, sql } from "@elements/app";
import { fixture } from "#app/shared/fixtures";
import { listedShows, leftLabel, remaining, TicketType } from "#app/shared/services/shows";

function type(quantity: number, sold: number): TicketType {
  return { id: "t", showId: "s", name: "GA", priceCents: 2000, quantity, sold, checkedIn: 0, position: 0 };
}

test("home", () => {
  test("lists upcoming shows soonest first, and drops finished ones", () => {
    let f = fixture();
    sql(`insert into shows (title, doorsAt, startsAt) values ('Last Week', now() - interval '7 days', now() - interval '7 days')`);

    let titles = listedShows().map((s) => s.title);
    equal(titles, ["Fixture Band", "Other Band"]);
    equal(listedShows()[0].id, f.showId);
  });

  test("sold counts follow tickets issued", () => {
    let f = fixture();
    equal(sql<{ sold: number }>(`select sold from ticketTypes where id = ${f.gaId}`).firstOrThrow().sold, 2);
  });

  test("remaining labels", () => {
    equal(leftLabel(type(10, 10)), "Sold out");
    equal(leftLabel(type(10, 3)), "7 left");
    equal(remaining(type(10, 12)), 0);
  });
});
