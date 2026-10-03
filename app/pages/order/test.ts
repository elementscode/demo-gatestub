import { test, equal, assert, Email } from "@elements/app";
import { fixture } from "#app/shared/fixtures";
import { orderByToken } from "#app/shared/services/orders";
import { qrPng } from "#app/shared/qr";
import { SendTicketsJob } from "#app/jobs/send-tickets";
import TicketsEmail from "#app/emails/tickets";

test("order", () => {
  test("loads an order and its tickets by token only", () => {
    let f = fixture();
    let order = orderByToken(f.orderToken)!;

    equal(order.title, "Fixture Band");
    equal(order.tickets.map((t) => t.code).sort(), [...f.codes].sort());
    equal(orderByToken("not-a-token"), undefined);
  });

  test("the email carries one QR code per ticket", () => {
    let f = fixture();
    let e = new Email({ to: "ada@example.com", subject: "t", body: new TicketsEmail({ order: orderByToken(f.orderToken)! }) });

    for (let code of f.codes) {
      assert(e.html.includes(`/qr/${code}.png`), `missing QR for ${code}`);
    }

    assert(e.text.includes("Ada Lovelace"));
  });

  test("the ticket email job sends for a paid order", () => {
    let f = fixture();
    new SendTicketsJob({ orderId: f.orderId }).run();
  });

  test("QR codes are PNGs", () => {
    let png = qrPng("AB12CD34EF56AB78");
    equal([...png.subarray(1, 4)].map((b) => String.fromCharCode(b)).join(""), "PNG");
    equal(png.readUInt32BE(16), png.readUInt32BE(20));
  });
});
