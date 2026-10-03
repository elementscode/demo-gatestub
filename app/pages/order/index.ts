import { Request, Response, NotFoundError } from "@elements/app";
import { orderByToken } from "#app/shared/services/orders";
import html from "./template";

export default function route(req: Request, res: Response) {
  let order = orderByToken(String(req.params.token));

  if (!order) {
    throw new NotFoundError();
  }

  res.setHeader("Cache-Control", "private, no-store");

  return new html({ order });
}
