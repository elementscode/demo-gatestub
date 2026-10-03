import { Request, Response, NotFoundError } from "@elements/app";
import { findShow, ticketTypes } from "#app/shared/services/shows";
import html from "./template";

export default function route(req: Request, res: Response) {
  let show = findShow(req.params.id);

  if (!show) {
    throw new NotFoundError();
  }

  return new html({
    show,
    types: ticketTypes.view({ showId: show.id }),
    canceled: req.query.canceled === "1",
  });
}
