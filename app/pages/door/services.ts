import { session, sql, ValidationError } from "@elements/app";
import { requireStaff } from "#app/shared/services/auth";

export interface TicketHit {
  id: string;
  code: string;
  holderName: string;
  email: string;
  typeName: string;
  checkedInAt: Date | null;
}

export interface CheckInResult {
  status: "valid" | "already" | "notfound" | "wrongshow";
  code: string;
  ticketId: string;
  holderName: string;
  typeName: string;
  checkedInAt: Date | null;
  checkedInBy: string;
  otherShow: string;
  otherShowAt: Date | null;
  // Tickets on the same order not yet in: the rest of a group arriving.
  orderWaiting: number;
  at: number;
}

interface TicketRow {
  id: string;
  code: string;
  orderId: string;
  showId: string;
  holderName: string;
  typeName: string;
  checkedInAt: Date | null;
  checkedInBy: string | null;
  title: string;
  startsAt: Date;
}

/** A scan is the code alone, but accept a pasted url or stray whitespace too. */
export function normalizeCode(raw: string): string {
  let text = raw.trim().split("/").pop() ?? "";

  return text.replace(/\.png$/i, "").replace(/[^0-9a-f]/gi, "").toUpperCase();
}

function result(status: CheckInResult["status"], code: string, t?: TicketRow): CheckInResult {
  return {
    status,
    code,
    ticketId: t?.id ?? "",
    holderName: t?.holderName ?? "",
    typeName: t?.typeName ?? "",
    checkedInAt: t?.checkedInAt ?? null,
    checkedInBy: t?.checkedInBy ?? "",
    otherShow: status === "wrongshow" ? t?.title ?? "" : "",
    otherShowAt: status === "wrongshow" ? t?.startsAt ?? null : null,
    orderWaiting: 0,
    at: Date.now(),
  };
}

function admit(showId: string, where: ReturnType<typeof sql.raw>, code: string): CheckInResult {
  requireStaff();

  let t = sql<TicketRow>(`
    select k.id, k.code, k.orderId, k.showId, k.holderName, k.checkedInAt,
           t.name as typeName, u.name as checkedInBy, s.title, s.startsAt
      from tickets k
      join ticketTypes t on t.id = k.ticketTypeId
      join shows s on s.id = k.showId
      left join users u on u.id = k.checkedInBy
     where ${where}
  `).first();

  if (!t) {
    return result("notfound", code);
  }

  if (t.showId !== showId) {
    return result("wrongshow", t.code, t);
  }

  // The where clause makes two phones scanning one code at once safe: only
  // one update matches, and the other phone sees "already checked in".
  let admitted = sql<{ checkedInAt: Date }>(`
    update tickets set checkedInAt = now(), checkedInBy = ${session.getOrThrow("userId")}
     where id = ${t.id} and checkedInAt is null
    returning checkedInAt
  `).first();

  if (!admitted) {
    return result("already", t.code, t);
  }

  let r = result("valid", t.code, { ...t, checkedInAt: admitted.checkedInAt, checkedInBy: session.getOrThrow("userName") });
  r.orderWaiting = sql<{ n: number }>(`
    select count(*)::int as n from tickets where orderId = ${t.orderId} and checkedInAt is null
  `).firstOrThrow().n;

  return r;
}

/** @rpc */
export function checkInCode(showId: string, raw: string): CheckInResult {
  let code = normalizeCode(raw);

  if (!code) {
    requireStaff();

    return result("notfound", raw.trim().slice(0, 40));
  }

  return admit(showId, sql.raw(`k.code = ${code}`), code);
}

/** @rpc */
export function checkInTicket(showId: string, ticketId: string): CheckInResult {
  return admit(showId, sql.raw(`k.id = ${ticketId}`), "");
}

/**
 * Mistakes happen at a busy door: put a ticket back to not checked in.
 *
 * @rpc
 */
export function undoCheckIn(showId: string, ticketId: string) {
  requireStaff();

  sql(`update tickets set checkedInAt = null, checkedInBy = null where id = ${ticketId} and showId = ${showId}`);
}

/** @rpc */
export function searchTickets(showId: string, query: string): TicketHit[] {
  requireStaff();

  let q = query.trim();

  if (q.length < 2) {
    return [];
  }

  if (q.length > 80) {
    throw new ValidationError("Search is too long.");
  }

  let like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  let code = normalizeCode(q);

  return sql<TicketHit>(`
    select k.id, k.code, k.holderName, k.email, t.name as typeName, k.checkedInAt
      from tickets k
      join ticketTypes t on t.id = k.ticketTypeId
     where k.showId = ${showId}
       and (k.holderName ilike ${like} or k.email ilike ${like} or (${code.length >= 4} and k.code like ${`${code}%`}))
     order by k.checkedInAt is not null, lower(k.holderName), t.position, k.id
     limit 40
  `).all();
}
