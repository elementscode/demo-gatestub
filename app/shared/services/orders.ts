import { sql } from "@elements/app";

export interface OrderTicket {
  id: string;
  code: string;
  holderName: string;
  typeName: string;
  checkedInAt: Date | null;
}

export interface Order {
  id: string;
  token: string;
  name: string;
  email: string;
  status: "pending" | "paid" | "expired";
  amountTotal: number;
  showId: string;
  title: string;
  support: string;
  doorsAt: Date;
  startsAt: Date;
  tickets: OrderTicket[];
}

function load(where: ReturnType<typeof sql.raw>): Order | undefined {
  let order = sql<Omit<Order, "tickets">>(`
    select o.id, o.token, o.name, o.email, o.status, o.amountTotal, o.showId,
           s.title, s.support, s.doorsAt, s.startsAt
      from orders o
      join shows s on s.id = o.showId
     where ${where}
  `).first();

  if (!order) {
    return undefined;
  }

  let tickets = sql<OrderTicket>(`
    select k.id, k.code, k.holderName, t.name as typeName, k.checkedInAt
      from tickets k
      join ticketTypes t on t.id = k.ticketTypeId
     where k.orderId = ${order.id}
     order by t.position, k.id
  `).all();

  return { ...order, tickets };
}

export function orderByToken(token: string): Order | undefined {
  return load(sql.raw(`o.token = ${token}`));
}

export function orderById(id: string): Order | undefined {
  return load(sql.raw(`o.id = ${id}`));
}
