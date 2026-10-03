import { sql, ValidationError } from "@elements/app";
import type { FieldErrors } from "@elements/app";
import { requireAdmin } from "#app/shared/services/auth";

export interface RecentOrder {
  id: string;
  token: string;
  name: string;
  email: string;
  tickets: number;
  amountTotal: number;
  createdAt: Date;
}

export interface TypeForm {
  id?: string;
  name: string;
  price: string;
  quantity: string;
}

export function parseType(form: TypeForm): { name: string; priceCents: number; quantity: number } {
  let errors: FieldErrors<TypeForm> = {};
  let name = form.name.trim();
  let price = Number(String(form.price).replace(/[$,\s]/g, ""));
  let quantity = Number(form.quantity);

  if (!name) {
    errors.name = ["Name the ticket type."];
  }

  if (!Number.isFinite(price) || price < 0 || price > 10000) {
    errors.price = ["Enter a price in dollars."];
  }

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000) {
    errors.quantity = ["Enter how many are for sale."];
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  return { name, priceCents: Math.round(price * 100), quantity };
}

/** @rpc */
export function addTicketType(showId: string, form: TypeForm) {
  requireAdmin();

  let t = parseType(form);

  // The trigger on ticket_types broadcasts the new row to every open page.
  sql(`
    insert into ticketTypes (showId, name, priceCents, quantity, position)
    select ${showId}, ${t.name}, ${t.priceCents}, ${t.quantity}, coalesce(max(position) + 1, 0)
      from ticketTypes where showId = ${showId}
  `);
}

/** @rpc */
export function setQuantity(ticketTypeId: string, quantity: number) {
  requireAdmin();

  let row = sql<{ sold: number }>(`select sold from ticketTypes where id = ${ticketTypeId}`).firstOrThrow();

  if (!Number.isInteger(quantity) || quantity < row.sold || quantity > 10000) {
    throw new ValidationError(`Quantity can't go below the ${row.sold} already sold.`);
  }

  sql(`update ticketTypes set quantity = ${quantity} where id = ${ticketTypeId}`);
}

export function recentOrders(showId: string): RecentOrder[] {
  return sql<RecentOrder>(`
    select o.id, o.token, o.name, o.email, o.amountTotal, o.createdAt,
           (select count(*)::int from tickets k where k.orderId = o.id) as tickets
      from orders o
     where o.showId = ${showId} and o.status = 'paid'
     order by o.createdAt desc
     limit 25
  `).all();
}
