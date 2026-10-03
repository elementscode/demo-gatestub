import { Request, Response, redirect } from "@elements/app";
import { fulfillCheckout, releaseOrder } from "#app/shared/checkout";

/** Stripe sends the buyer here after paying. */
export async function checkoutReturn(req: Request, res: Response) {
  let token = await fulfillCheckout(String(req.query.session_id ?? ""));

  redirect(token ? `/orders/${token}` : "/");
}

/** Stripe, or the test checkout, sends the buyer here when they back out. */
export function checkoutCancel(req: Request, res: Response) {
  let showId = releaseOrder(String(req.params.token));

  redirect(showId ? `/shows/${showId}?canceled=1` : "/");
}
