import { getAppUrl, sql, tx, ValidationError } from "@elements/app";
import type { FieldErrors } from "@elements/app";
import { stripe, testCheckout } from "#app/shared/stripe";
import { ensureWebhook } from "#app/shared/stripe-webhook";
import { SendTicketsJob } from "#app/jobs/send-tickets";

export interface OrderForm {
  showId: string;
  name: string;
  email: string;
  quantities: Record<string, number>;
}

export const MAX_PER_ORDER = 10;

interface Line {
  ticketTypeId: string;
  name: string;
  priceCents: number;
  quantity: number;
}

function isEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

/**
 * Holds the tickets and returns the url to send the buyer to: Stripe
 * Checkout, or the in-app test checkout when there is no key. Prices and
 * stock are read here, under a row lock, never from the browser.
 */
export async function startOrder(form: OrderForm): Promise<string> {
  let name = form.name.trim();
  let email = form.email.trim().toLowerCase();
  let errors: FieldErrors<OrderForm> = {};

  if (!name) {
    errors.name = ["Enter the name the door will look for."];
  }

  if (!isEmail(email)) {
    errors.email = ["Enter an email for your tickets."];
  }

  let wanted = Object.entries(form.quantities)
    .map(([id, n]) => [id, Math.floor(Number(n) || 0)] as const)
    .filter(([, n]) => n > 0);

  let total = wanted.reduce((sum, [, n]) => sum + n, 0);

  if (total === 0) {
    errors.quantities = ["Pick at least one ticket."];
  } else if (total > MAX_PER_ORDER) {
    errors.quantities = [`Up to ${MAX_PER_ORDER} tickets per order.`];
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  let order = tx(() => {
    let lines: Line[] = [];

    for (let [id, quantity] of wanted) {
      // Pending orders that have not expired hold their tickets.
      let t = sql<{ name: string; priceCents: number; available: number }>(`
        select t.name, t.priceCents,
               t.quantity - t.sold - coalesce((
                 select sum(l.quantity) from orderLines l join orders o on o.id = l.orderId
                  where l.ticketTypeId = t.id and o.status = 'pending' and o.expiresAt > now()
               ), 0)::int as available
          from ticketTypes t
          join shows s on s.id = t.showId
         where t.id = ${id} and t.showId = ${form.showId} and s.startsAt > now() - interval '1 hour'
           for update of t
      `).first();

      if (!t) {
        throw new ValidationError<OrderForm>({ quantities: ["That show is no longer on sale."] });
      }

      if (t.available < quantity) {
        throw new ValidationError<OrderForm>({
          quantities: [t.available === 0 ? `${t.name} just sold out.` : `Only ${t.available} ${t.name} left.`],
        });
      }

      lines.push({ ticketTypeId: id, name: t.name, priceCents: t.priceCents, quantity });
    }

    let amount = lines.reduce((sum, l) => sum + l.priceCents * l.quantity, 0);

    let created = sql<{ id: string; token: string }>(`
      insert into orders (showId, name, email, amountTotal)
           values (${form.showId}, ${name}, ${email}, ${amount})
        returning id, token
    `).firstOrThrow();

    for (let l of lines) {
      sql(`
        insert into orderLines (orderId, ticketTypeId, quantity, unitAmount)
             values (${created.id}, ${l.ticketTypeId}, ${l.quantity}, ${l.priceCents})
      `);
    }

    return { ...created, lines };
  });

  if (testCheckout()) {
    return `/checkout/test/${order.token}`;
  }

  await ensureWebhook();

  let show = sql<{ title: string }>(`select title from shows where id = ${form.showId}`).firstOrThrow();

  let checkout = await stripe().checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: email,
    client_reference_id: order.id,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    line_items: order.lines.map((l) => ({
      quantity: l.quantity,
      price_data: {
        currency: "usd",
        unit_amount: l.priceCents,
        product_data: { name: `${show.title}: ${l.name}` },
      },
    })),
    success_url: `${getAppUrl()}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${getAppUrl()}/checkout/cancel/${order.token}`,
  });

  return checkout.url!;
}

/**
 * Records a paid session and issues its tickets. Idempotent: the return page
 * and the webhook both call it, in either order, any number of times. Returns
 * the order's token, or "" when there is no order.
 */
export async function fulfillCheckout(sessionId: string): Promise<string> {
  let checkout = await stripe().checkout.sessions.retrieve(sessionId);
  let orderId = checkout.client_reference_id;

  if (!orderId) {
    return "";
  }

  let order = sql<{ token: string }>(`select token from orders where id = ${orderId}`).first();

  if (!order) {
    return "";
  }

  if (checkout.payment_status === "paid") {
    recordPayment(checkout.id, orderId, checkout.amount_total!, checkout.currency!);
  }

  return order.token;
}

/**
 * The one place a payment is recorded, real or test: the payment row, the
 * paid status, the tickets and their email, all once.
 */
export function recordPayment(sessionId: string, orderId: string, amountTotal: number, currency: string) {
  tx(() => {
    sql(`
      insert into payments (stripeSessionId, orderId, amountTotal, currency)
           values (${sessionId}, ${orderId}, ${amountTotal}, ${currency})
      on conflict (stripeSessionId) do nothing
    `);

    // An order that expired while the buyer was paying is still paid for.
    let paid = sql<{ id: string }>(`
      update orders set status = 'paid', amountTotal = ${amountTotal}
       where id = ${orderId} and status <> 'paid'
      returning id
    `).first();

    if (!paid) {
      return;
    }

    sql(`
      insert into tickets (orderId, showId, ticketTypeId, holderName, email)
      select o.id, o.showId, l.ticketTypeId, o.name, o.email
        from orders o
        join orderLines l on l.orderId = o.id
        cross join lateral generate_series(1, l.quantity)
       where o.id = ${orderId}
    `);

    new SendTicketsJob({ orderId }).schedule();
  });
}

/** The buyer backed out of Checkout: release the held tickets. */
export function releaseOrder(token: string): string | undefined {
  return sql<{ showId: string }>(`
    update orders set status = 'expired'
     where token = ${token} and status = 'pending'
    returning showId
  `).first()?.showId;
}
