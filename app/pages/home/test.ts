import { test, equal, sql } from "@elements/app";
import { fixture } from "#app/shared/fixtures";
import { listedShows, leftLabel, remaining, TicketType } from "#app/shared/services/shows";

function type(quantity: number, sold: number): TicketType {
  return { id: "t", showId: "s", name: "GA", priceCents: 2000, quantity, sold, checkedIn: 0, position: 0 };
}

test("home", () => {
  test("lists upcoming shows soonest first, and drops finished ones", () => {
    let f = fixture();
    let lastWeekId = sql<{ id: string }>(`
      insert into shows (title, doorsAt, startsAt)
           values ('Last Week', now() - interval '7 days', now() - interval '7 days')
        returning id
    `).firstOrThrow().id;

    let shows = listedShows();
    let starts = shows.map((s) => s.startsAt.getTime());
    equal(starts, [...starts].sort((a, b) => a - b));

    let mine = new Set([f.showId, f.otherShowId, lastWeekId]);
    let listed = shows.filter((s) => mine.has(s.id));
    equal(listed.map((s) => s.title), ["Fixture Band", "Other Band"]);
    equal(listed.map((s) => s.id), [f.showId, f.otherShowId]);
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
