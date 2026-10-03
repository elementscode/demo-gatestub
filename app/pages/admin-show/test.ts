import { test, equal, errorf, sql } from "@elements/app";
import { fixture, staff } from "#app/shared/fixtures";
import { sales } from "#app/shared/services/shows";
import { addTicketType, setQuantity, recentOrders } from "./services";

test("admin show", () => {
  test("adds a ticket type after the last one", () => {
    let f = fixture();
    staff("admin");

    addTicketType(f.showId, { name: "VIP", price: "$55", quantity: "12" });
    let vip = sql<{ priceCents: number; position: number }>(`select priceCents, position from ticketTypes where showId = ${f.showId} and name = 'VIP'`).firstOrThrow();
    equal(vip, { priceCents: 5500, position: 2 });
  });

  test("quantity cannot drop below what has sold", () => {
    let f = fixture();
    staff("admin");

    setQuantity(f.gaId, 40);

    try {
      setQuantity(f.gaId, 1);
      errorf("expected a ValidationError");
    } catch (err: any) {
      equal(err.message, "Quantity can't go below the 2 already sold.");
    }
  });

  test("sales per show and recent orders", () => {
    let f = fixture();
    let types = sql<any>(`select * from ticketTypes where showId = ${f.showId}`).all();

    equal(sales(types), { sold: 2, capacity: 12, checkedIn: 0, revenue: 4000 });
    equal(recentOrders(f.showId).map((o) => [o.name, o.tickets]), [["Ada Lovelace", 2]]);
  });
});
