import { test, equal, assert, sql } from "@elements/app";
import { fixture, counts } from "#app/shared/fixtures";
import { startOrder, releaseOrder, recordPayment } from "#app/shared/checkout";
import { testCheckout } from "#app/shared/stripe";
import { orderByToken } from "#app/shared/services/orders";
import { loadCheckoutOrder, payTestOrder } from "./services";

test("test checkout", () => {
  test("recording a payment marks the order paid and issues its tickets once", () => {
    let f = fixture();
    let order = sql<{ id: string; token: string }>(`
      insert into orders (showId, name, email) values (${f.showId}, 'Nina Simone', 'nina@example.com') returning id, token
    `).firstOrThrow();
    sql(`insert into orderLines (orderId, ticketTypeId, quantity, unitAmount) values (${order.id}, ${f.gaId}, 2, 2000)`);

    recordPayment("cs_test_record", order.id, 4000, "usd");
    recordPayment("cs_test_record", order.id, 4000, "usd");

    let paid = orderByToken(order.token)!;
    equal(paid.status, "paid");
    equal(paid.tickets.length, 2);
    equal(sql(`select 1 from payments where orderId = ${order.id}`).all().length, 1);
  });

  // Tests run against the environment's config. With a Stripe key set,
  // checkout goes to Stripe and the test checkout is off, so these skip.
  test("without a key, checkout goes to the test checkout and paying issues the tickets", async () => {
    if (!testCheckout()) {
      return;
    }

    let f = fixture();
    let soldBefore = counts(f.balconyId).sold;

    let url = await startOrder({
      showId: f.showId,
      name: "Grace Hopper",
      email: "Grace@Example.com",
      quantities: { [f.gaId]: 2, [f.balconyId]: 1 },
    });

    assert(url.startsWith("/checkout/test/"), `expected the test checkout, got ${url}`);

    let token = url.slice("/checkout/test/".length);
    let checkout = loadCheckoutOrder(token)!;
    equal(checkout.totalCents, 2 * 2000 + 3500);
    equal(checkout.lines.map((l) => [l.name, l.quantity]), [["General admission", 2], ["Balcony", 1]]);
    equal(checkout.open, true);

    equal(payTestOrder(token), token);

    let order = orderByToken(token)!;
    equal(order.status, "paid");
    equal(order.amountTotal, 7500);
    equal(order.email, "grace@example.com");
    equal(order.tickets.length, 3);
    equal(order.tickets.every((t) => t.holderName === "Grace Hopper"), true);
    equal(counts(f.balconyId).sold, soldBefore + 1);

    let payment = sql<{ stripeSessionId: string; amountTotal: number }>(`
      select stripeSessionId, amountTotal from payments where orderId = ${order.id}
    `).firstOrThrow();
    equal(payment.stripeSessionId, `test_${order.id}`);
    equal(payment.amountTotal, 7500);

    // Paying again, like a double click or a reload, issues nothing more.
    equal(payTestOrder(token), token);
    equal(orderByToken(token)!.tickets.length, 3);
    equal(sql(`select 1 from payments where orderId = ${order.id}`).all().length, 1);
  });

  test("a canceled checkout cannot be paid", async () => {
    if (!testCheckout()) {
      return;
    }

    let f = fixture();
    let url = await startOrder({ showId: f.showId, name: "Ada", email: "ada@example.com", quantities: { [f.gaId]: 1 } });
    let token = url.slice("/checkout/test/".length);

    equal(releaseOrder(token), f.showId);

    let message = "";

    try {
      payTestOrder(token);
    } catch (err: any) {
      message = err.message;
    }

    equal(message, "This checkout expired and the tickets went back on sale.");
    equal(orderByToken(token)!.tickets.length, 0);
  });
});
