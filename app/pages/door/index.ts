import { Request, Response, NotFoundError, redirect } from "@elements/app";
import { requireStaff } from "#app/shared/services/auth";
import { findShow, listedShows, ticketTypes } from "#app/shared/services/shows";
import html from "./template";

export default function route(req: Request, res: Response) {
  requireStaff();

  let shows = listedShows();

  if (!req.params.id) {
    if (shows.length === 0) {
      throw new NotFoundError("No shows on the calendar.");
    }

    redirect(`/door/${shows[0].id}`);
    return;
  }

  let show = findShow(req.params.id);

  if (!show) {
    throw new NotFoundError();
  }

  return new html({
    show,
    shows: shows.map((s) => ({ id: s.id, title: s.title, startsAt: s.startsAt })),
    types: ticketTypes.view({ showId: show.id }),
  });
}
