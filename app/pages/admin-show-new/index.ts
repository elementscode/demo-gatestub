import { Request, Response } from "@elements/app";
import { requireAdmin } from "#app/shared/services/auth";
import html from "./template";

export default function route(req: Request, res: Response) {
  requireAdmin();

  return new html();
}
