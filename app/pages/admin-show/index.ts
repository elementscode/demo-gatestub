import { Request, Response, NotFoundError } from "@elements/app";
import { requireAdmin } from "#app/shared/services/auth";
import { findShow, ticketTypes } from "#app/shared/services/shows";
import { recentOrders } from "./services";
import html from "./template";

export default function route(req: Request, res: Response) {
  requireAdmin();

  let show = findShow(req.params.id);

  if (!show) {
    throw new NotFoundError();
  }

  return new html({
    show,
    types: ticketTypes.view({ showId: show.id }),
    orders: recentOrders(show.id),
    created: req.query.created === "1",
  });
}
