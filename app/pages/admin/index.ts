import { Request, Response, sql } from "@elements/app";
import { requireAdmin } from "#app/shared/services/auth";
import { listedShows, ticketTypes } from "#app/shared/services/shows";
import html, { PastShow } from "./template";

export default function route(req: Request, res: Response) {
  requireAdmin();

  let past = sql<PastShow>(`
    select s.id, s.title, s.startsAt,
           coalesce(sum(t.sold), 0)::int as sold,
           coalesce(sum(t.quantity), 0)::int as capacity,
           coalesce(sum(t.checkedIn), 0)::int as checkedIn,
           coalesce(sum(t.sold * t.priceCents), 0)::int as revenue
      from shows s
      left join ticketTypes t on t.showId = s.id
     where s.startsAt <= now() - interval '4 hours'
     group by s.id
     order by s.startsAt desc
     limit 20
  `).all();

  return new html({ shows: listedShows(), types: ticketTypes.view(), past });
}
