import { File, sql, tx, ValidationError } from "@elements/app";
import type { FieldErrors } from "@elements/app";
import config from "#config";
import { requireAdmin } from "#app/shared/services/auth";
import { TypeForm, parseType } from "#app/pages/admin-show/services";

export interface ShowForm {
  title: string;
  support: string;
  description: string;
  date: string;
  doors: string;
  starts: string;
  poster: File | null;
  types: TypeForm[];
}

const POSTER_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

const MAX_POSTER = 4 * 1024 * 1024;

/** @rpc */
export function createShow(form: ShowForm): string {
  requireAdmin();

  let errors: FieldErrors<ShowForm> = {};
  let title = form.title.trim();

  if (!title) {
    errors.title = ["Give the show a title."];
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
    errors.date = ["Pick a date."];
  }

  if (!/^\d{2}:\d{2}$/.test(form.doors)) {
    errors.doors = ["Set a doors time."];
  }

  if (!/^\d{2}:\d{2}$/.test(form.starts)) {
    errors.starts = ["Set a show time."];
  } else if (form.doors && form.starts < form.doors) {
    errors.starts = ["The show starts after doors open."];
  }

  if (form.poster && !POSTER_TYPES.has(form.poster.contentType)) {
    errors.poster = ["Use a PNG, JPEG, WebP or GIF image."];
  } else if (form.poster && form.poster.size > MAX_POSTER) {
    errors.poster = ["Keep the poster under 4 MB."];
  }

  let types = form.types.filter((t) => t.name.trim() || t.price || t.quantity);

  if (types.length === 0) {
    errors.types = ["Add at least one ticket type."];
  }

  let parsed = [];

  for (let t of types) {
    try {
      parsed.push(parseType(t));
    } catch (err: any) {
      let first = err instanceof ValidationError && err.errors ? Object.values(err.errors)[0] : undefined;
      errors.types = [`${t.name.trim() || "A ticket type"}: ${(first as string[] | undefined)?.[0] ?? err.message}`];
      break;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  let tz = config.venue.timezone;

  return tx(() => {
    let show = sql<{ id: string; startsAt: Date }>(`
      insert into shows (title, support, description, doorsAt, startsAt, posterType, posterData)
           values (${title},
                   ${form.support.trim()},
                   ${form.description.trim()},
                   (${form.date}::date + ${form.doors}::time) at time zone ${tz},
                   (${form.date}::date + ${form.starts}::time) at time zone ${tz},
                   ${form.poster?.contentType ?? null},
                   ${form.poster?.data ?? null})
        returning id, startsAt
    `).firstOrThrow();

    if (show.startsAt.getTime() < Date.now() - 60 * 60 * 1000) {
      throw new ValidationError<ShowForm>({ date: ["That date has passed."] });
    }

    parsed.forEach((t, position) => {
      sql(`
        insert into ticketTypes (showId, name, priceCents, quantity, position)
             values (${show.id}, ${t.name}, ${t.priceCents}, ${t.quantity}, ${position})
      `);
    });

    return show.id;
  });
}
