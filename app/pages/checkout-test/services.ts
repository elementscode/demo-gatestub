import { ForbiddenError, ValidationError, sql } from "@elements/app";
import { recordPayment } from "#app/shared/checkout";
import { testCheckout } from "#app/shared/stripe";

export interface TestCheckoutLine {
  name: string;
  unitAmount: number;
  quantity: number;
}

export interface TestCheckoutOrder {
  id: string;
  token: string;
  status: "pending" | "paid" | "expired";
  open: boolean;
  name: string;
  email: string;
  showId: string;
  title: string;
  support: string;
  startsAt: Date;
  posterHash: string | null;
  totalCents: number;
  lines: TestCheckoutLine[];
}

/** The order behind a checkout, by its unguessable token. */
export function loadCheckoutOrder(token: string): TestCheckoutOrder | undefined {
  let order = sql<Omit<TestCheckoutOrder, "lines">>(`
    select o.id, o.token, o.status, o.name, o.email, o.showId,
           o.status = 'pending' and o.expiresAt > now() as open,
           s.title, s.support, s.startsAt, s.posterHash,
           coalesce((select sum(l.unitAmount * l.quantity) from orderLines l where l.orderId = o.id), 0)::int as totalCents
      from orders o
      join shows s on s.id = o.showId
     where o.token = ${token}
  `).first();

  if (!order) {
    return undefined;
  }

  let lines = sql<TestCheckoutLine>(`
    select t.name, l.unitAmount, l.quantity
      from orderLines l
      join ticketTypes t on t.id = l.ticketTypeId
     where l.orderId = ${order.id}
     order by t.position
  `).all();

  return { ...order, lines };
}

/**
 * Pays an order on the test checkout. Development without a Stripe key only.
 * The amount is the held order's, read here, never from the browser. @rpc
 */
export function payTestOrder(token: string): string {
  if (!testCheckout()) {
    throw new ForbiddenError("The test checkout is off.");
  }

  let order = loadCheckoutOrder(token);

  if (!order) {
    throw new ValidationError("Order not found.");
  }

  if (order.status === "paid") {
    return order.token;
  }

  if (!order.open) {
    throw new ValidationError("This checkout expired and the tickets went back on sale.");
  }

  recordPayment(`test_${order.id}`, order.id, order.totalCents, "usd");

  return order.token;
}
