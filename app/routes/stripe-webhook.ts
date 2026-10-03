import { Request, Response } from "@elements/app";
import { stripe } from "#app/shared/stripe";
import { webhookSecret } from "#app/shared/stripe-webhook";
import { fulfillCheckout, releaseOrder } from "#app/shared/checkout";
import { sql } from "@elements/app";

export default async function stripeWebhook(req: Request, res: Response) {
  let event;

  try {
    event = stripe().webhooks.constructEvent(
      req.bodyBuffer!,
      req.headers["stripe-signature"] as string,
      webhookSecret(),
    );
  } catch {
    res.status(400).send("invalid signature");
    return;
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await fulfillCheckout(event.data.object.id);
      break;

    case "checkout.session.expired": {
      let orderId = event.data.object.client_reference_id;
      let order = orderId ? sql<{ token: string }>(`select token from orders where id = ${orderId}`).first() : undefined;

      if (order) {
        releaseOrder(order.token);
      }

      break;
    }
  }

  return "ok";
}
