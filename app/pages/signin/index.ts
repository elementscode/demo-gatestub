import { Request, Response, getEnv, redirect, session } from "@elements/app";
import { homeFor } from "#app/shared/services/auth";
import html from "./template";

export default function route(req: Request, res: Response) {
  if (session.isLoggedIn()) {
    redirect(homeFor(session.getOrThrow("role")));
    return;
  }

  // The demo accounts are seeded in development only, so that is the only
  // place their passwords are shown.
  // Only a path on this site, so the link cannot bounce anyone elsewhere.
  let next = String(req.query.next ?? "");
  let safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "";

  return new html({ demo: getEnv() === "development", next: safeNext });
}
