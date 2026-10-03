import { test, equal, assert, errorf, sql, ValidationError } from "@elements/app";
import { staff } from "#app/shared/fixtures";
import { createShow, ShowForm } from "./services";

function form(overrides: Partial<ShowForm> = {}): ShowForm {
  return {
    title: "Night Swim",
    support: "with Guests",
    description: "",
    date: "2031-06-12",
    doors: "19:00",
    starts: "20:00",
    poster: null,
    types: [
      { name: "General admission", price: "18.50", quantity: "200" },
      { name: "", price: "", quantity: "" },
    ],
    ...overrides,
  };
}

test("new show", () => {
  test("creates the show in venue time with its ticket types", () => {
    staff("admin");

    let id = createShow(form());
    let show = sql<{ doorsLocal: string; startsLocal: string }>(`
      select to_char(doorsAt at time zone 'America/New_York', 'YYYY-MM-DD HH24:MI') as doorsLocal,
             to_char(startsAt at time zone 'America/New_York', 'YYYY-MM-DD HH24:MI') as startsLocal
        from shows where id = ${id}
    `).firstOrThrow();

    equal(show, { doorsLocal: "2031-06-12 19:00", startsLocal: "2031-06-12 20:00" });

    let types = sql<{ name: string; priceCents: number; quantity: number }>(`
      select name, priceCents, quantity from ticketTypes where showId = ${id} order by position
    `).all();
    equal(types, [{ name: "General admission", priceCents: 1850, quantity: 200 }]);
  });

  test("rejects a bad form with field errors", () => {
    staff("admin");

    try {
      createShow(form({ title: "", starts: "18:00", types: [{ name: "GA", price: "free", quantity: "10" }] }));
      errorf("expected a ValidationError");
    } catch (err: any) {
      assert(err instanceof ValidationError);
      assert(!!err.errors?.title && !!err.errors?.starts && !!err.errors?.types, JSON.stringify(err.errors));
    }
  });

  test("door staff cannot create shows", () => {
    staff("door");

    try {
      createShow(form());
      errorf("expected a ForbiddenError");
    } catch (err: any) {
      equal(err.statusCode, 403);
    }
  });
});
