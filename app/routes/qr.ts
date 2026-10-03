import { Request, Response, NotFoundError, sql } from "@elements/app";
import { qrPng } from "#app/shared/qr";

/** /qr/:code.png. The code is the ticket's secret, so only its holder has the url. */
export default function serveQr(req: Request, res: Response) {
  let code = String(req.params.code).toUpperCase();

  if (sql(`select 1 from tickets where code = ${code}`).empty()) {
    throw new NotFoundError();
  }

  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "private, max-age=31536000, immutable");

  return qrPng(code);
}
