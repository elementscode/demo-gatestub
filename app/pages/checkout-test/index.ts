import { NotFoundError, Request, Response, redirect } from "@elements/app";
import { testCheckout } from "#app/shared/stripe";
import { loadCheckoutOrder } from "./services";
import html from "./template";

/** Stands in for Stripe Checkout in development until a key is set. */
export default function route(req: Request, res: Response) {
  if (!testCheckout()) {
    throw new NotFoundError();
  }

  let order = loadCheckoutOrder(String(req.params.token));

  if (!order) {
    throw new NotFoundError();
  }

  if (order.status === "paid") {
    redirect(`/orders/${order.token}`);
    return;
  }

  if (!order.open) {
    redirect(`/shows/${order.showId}?canceled=1`);
    return;
  }

  res.setHeader("Cache-Control", "private, no-store");

  return new html({ order });
}
