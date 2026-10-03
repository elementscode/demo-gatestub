import { Request, Response } from "@elements/app";
import { listedShows, ticketTypes } from "#app/shared/services/shows";
import html from "./template";

export default function route(req: Request, res: Response) {
  return new html({ shows: listedShows(), types: ticketTypes.view() });
}
