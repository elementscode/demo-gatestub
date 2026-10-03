import { Request, Response, NotFoundError, sql } from "@elements/app";
import TicketsEmail from "#app/emails/tickets";
import { orderByToken } from "#app/shared/services/orders";

/** Development only: the ticket email for a real order, or the newest one. */
export default function ticketsEmailPreview(req: Request, res: Response) {
  let token = req.query.order
    ? String(req.query.order)
    : sql<{ token: string }>(`select token from orders where status = 'paid' order by createdAt desc limit 1`).first()?.token;

  let order = token ? orderByToken(token) : undefined;

  if (!order) {
    throw new NotFoundError();
  }

  return new TicketsEmail({ order });
}
