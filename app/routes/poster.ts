import { Request, Response, NotFoundError, sql } from "@elements/app";

const INLINE = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"]);

const YEAR = 31536000;

/** /posters/:id/:hash. The hash in the url is what makes it safe to cache forever. */
export default function servePoster(req: Request, res: Response) {
  let poster = sql<{ posterType: string; posterData: Buffer; posterHash: string }>(`
    select posterType, posterData, posterHash from shows
     where id = ${req.params.id} and posterData is not null
  `).first();

  if (!poster || !poster.posterHash.startsWith(req.params.hash) || !INLINE.has(poster.posterType)) {
    throw new NotFoundError();
  }

  res.setHeader("Content-Type", poster.posterType);
  res.setHeader("Cache-Control", `public, max-age=${YEAR}, immutable`);
  // An svg opened on its own is a document: no script, whoever uploaded it.
  res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; img-src data:");

  return poster.posterData;
}
