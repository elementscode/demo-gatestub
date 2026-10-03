import { test, equal, assert, errorf, sql, ValidationError } from "@elements/app";
import { fixture } from "#app/shared/fixtures";
import { startOrder, releaseOrder } from "#app/shared/checkout";
import { totalCents, ticketCount } from "./template";

async function rejects(fn: () => Promise<unknown>): Promise<Record<string, string[] | undefined>> {
  try {
    await fn();
  } catch (err: any) {
    assert(err instanceof ValidationError, `expected a ValidationError, got ${err.message}`);

    return err.errors ?? {};
  }

  errorf("expected the order to be rejected");

  return {};
}

test("show page checkout", () => {
  test("rejects a missing name, email and empty basket before Stripe", async () => {
    let f = fixture();
    let errors = await rejects(() => startOrder({ showId: f.showId, name: " ", email: "nope", quantities: { [f.gaId]: 0 } }));

    assert(!!errors.name, "name error");
    assert(!!errors.email, "email error");
    assert(!!errors.quantities, "quantities error");
  });

  test("refuses more than are left, counting unexpired holds", async () => {
    let f = fixture();

    // Two balcony seats exist; a pending checkout is holding one.
    let held = sql<{ id: string }>(`
      insert into orders (showId, name, email) values (${f.showId}, 'Holder', 'h@example.com') returning id
    `).firstOrThrow();
    sql(`insert into orderLines (orderId, ticketTypeId, quantity, unitAmount) values (${held.id}, ${f.balconyId}, 1, 3500)`);

    let errors = await rejects(() => startOrder({ showId: f.showId, name: "Ada", email: "ada@example.com", quantities: { [f.balconyId]: 2 } }));
    equal(errors.quantities, ["Only 1 Balcony left."]);
    equal(sql(`select 1 from orders where email = 'ada@example.com' and status = 'pending'`).all().length, 0);
  });

  test("an expired hold frees its tickets", () => {
    let f = fixture();
    let held = sql<{ id: string; token: string }>(`
      insert into orders (showId, name, email) values (${f.showId}, 'Holder', 'h@example.com') returning id, token
    `).firstOrThrow();
    sql(`insert into orderLines (orderId, ticketTypeId, quantity, unitAmount) values (${held.id}, ${f.balconyId}, 2, 3500)`);

    equal(releaseOrder(held.token), f.showId);
    equal(releaseOrder(held.token), undefined);
  });

  test("totals the basket from the live prices", () => {
    let f = fixture();
    let types = sql<any>(`select id, priceCents from ticketTypes where showId = ${f.showId}`).all();
    let form: any = { quantities: { [f.gaId]: 2, [f.balconyId]: 1 } };

    equal(totalCents(form, types), 2 * 2000 + 3500);
    equal(ticketCount(form), 3);
  });
});
