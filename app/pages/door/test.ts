import { test, equal, assert, errorf, sql, session } from "@elements/app";
import { fixture, staff, counts } from "#app/shared/fixtures";
import { checkInCode, checkInTicket, undoCheckIn, searchTickets, normalizeCode } from "./services";

test("door", () => {
  test("a first scan admits and counts", () => {
    let f = fixture();
    staff();

    let r = checkInCode(f.showId, f.codes[0]);
    equal(r.status, "valid");
    equal(r.holderName, "Ada Lovelace");
    equal(r.typeName, "General admission");
    equal(r.orderWaiting, 1);
    equal(counts(f.gaId), { sold: 2, checkedIn: 1 });
  });

  test("a second scan of the same code is already checked in", () => {
    let f = fixture();
    staff();

    checkInCode(f.showId, f.codes[0]);
    let r = checkInCode(f.showId, f.codes[0].toLowerCase());
    equal(r.status, "already");
    equal(r.checkedInBy, "Test door");
    equal(counts(f.gaId).checkedIn, 1);
  });

  test("an unknown code is not found", () => {
    let f = fixture();
    staff();

    equal(checkInCode(f.showId, "0000000000000000").status, "notfound");
    equal(checkInCode(f.showId, "not a ticket").status, "notfound");
  });

  test("a ticket for another night is the wrong show and is not admitted", () => {
    let f = fixture();
    staff();

    let r = checkInCode(f.otherShowId, f.codes[0]);
    equal(r.status, "wrongshow");
    equal(r.otherShow, "Fixture Band");
    equal(counts(f.gaId).checkedIn, 0);
  });

  test("undo puts the ticket and the count back", () => {
    let f = fixture();
    staff();

    checkInTicket(f.showId, f.ticketIds[0]);
    undoCheckIn(f.showId, f.ticketIds[0]);
    equal(counts(f.gaId).checkedIn, 0);
    equal(checkInTicket(f.showId, f.ticketIds[0]).status, "valid");
  });

  test("search finds by name, email and code, not-yet-in first", () => {
    let f = fixture();
    staff();

    checkInTicket(f.showId, f.ticketIds[0]);

    let hits = searchTickets(f.showId, "lovel");
    equal(hits.length, 2);
    equal(hits[0].checkedInAt, null);
    equal(searchTickets(f.showId, "ada@exa").length, 2);
    equal(searchTickets(f.showId, f.codes[1].slice(0, 6)).length, 1);
    equal(searchTickets(f.otherShowId, "lovel").length, 0);
    equal(searchTickets(f.showId, "a").length, 0);
  });

  test("scanning needs a staff session", () => {
    let f = fixture();

    try {
      checkInCode(f.showId, f.codes[0]);
      errorf("expected an auth error");
    } catch (err: any) {
      assert(err.statusCode === 401, `got ${err.message}`);
    }

    equal(counts(f.gaId).checkedIn, 0);
  });

  test("codes normalize from pasted urls and spacing", () => {
    equal(normalizeCode(" ab12cd34 "), "AB12CD34");
    equal(normalizeCode("http://x/qr/AB12CD34.png"), "AB12CD34");
  });
});
