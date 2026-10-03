import { LiveTable, ForbiddenError, sql } from "@elements/app";

export interface Show {
  id: string;
  title: string;
  support: string;
  description: string;
  doorsAt: Date;
  startsAt: Date;
  posterHash: string | null;
}

export interface TicketType {
  id: string;
  showId: string;
  name: string;
  priceCents: number;
  quantity: number;
  sold: number;
  checkedIn: number;
  position: number;
}

// A show stays listed until four hours after it starts, so tonight's show is
// still on the door page and the home page while it plays.
const LISTED = sql.raw(`s.startsAt > now() - interval '4 hours'`);

const SHOW_COLUMNS = sql.raw(`s.id, s.title, s.support, s.description, s.doorsAt, s.startsAt, s.posterHash`);

/**
 * Ticket types with their live counts. Tickets are issued and checked in by
 * server code, and a trigger on ticket_types broadcasts every count change on
 * the table's channel, so no browser writes through this table.
 */
export const ticketTypes: LiveTable<TicketType> = new LiveTable<TicketType>({
  select: (partition: { showId?: string }) => {
    if (partition.showId) {
      return sql<TicketType>(`
        select id, showId, name, priceCents, quantity, sold, checkedIn, position
          from ticketTypes
         where showId = ${partition.showId}
      `);
    }

    return sql<TicketType>(`
      select t.id, t.showId, t.name, t.priceCents, t.quantity, t.sold, t.checkedIn, t.position
        from ticketTypes t
        join shows s on s.id = t.showId
       where ${LISTED}
    `);
  },

  insert: () => {
    throw new ForbiddenError();
  },

  update: () => {
    throw new ForbiddenError();
  },

  delete: () => {
    throw new ForbiddenError();
  },
});

export function listedShows(): Show[] {
  return sql<Show>(`
    select ${SHOW_COLUMNS}
      from shows s
     where ${LISTED}
     order by s.startsAt
  `).all();
}

export function findShow(id: string): Show | undefined {
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return undefined;
  }

  return sql<Show>(`select ${SHOW_COLUMNS} from shows s where s.id = ${id}`).first();
}

export function posterUrl(show: Show): string {
  return show.posterHash ? `/posters/${show.id}/${show.posterHash.slice(0, 16)}` : "";
}

export function typesFor(types: Iterable<TicketType>, showId: string): TicketType[] {
  return [...types].filter((t) => t.showId === showId).sort((a, b) => a.position - b.position);
}

export function remaining(t: TicketType): number {
  return Math.max(0, t.quantity - t.sold);
}

export function leftLabel(t: TicketType): string {
  let n = remaining(t);

  if (n === 0) {
    return "Sold out";
  }

  return `${n} left`;
}

export function leftClass(t: TicketType): string[] {
  let n = remaining(t);

  return ["left", n === 0 && "is-out", n > 0 && n <= 20 && "is-low"].filter(Boolean) as string[];
}

export interface Sales {
  sold: number;
  capacity: number;
  checkedIn: number;
  revenue: number;
}

export function sales(types: TicketType[]): Sales {
  return types.reduce(
    (s, t) => ({
      sold: s.sold + t.sold,
      capacity: s.capacity + t.quantity,
      checkedIn: s.checkedIn + t.checkedIn,
      revenue: s.revenue + t.sold * t.priceCents,
    }),
    { sold: 0, capacity: 0, checkedIn: 0, revenue: 0 },
  );
}
