import { File, Job, email } from "@elements/app";
import config from "#config";
import TicketsEmail from "#app/emails/tickets";
import { orderById } from "#app/shared/services/orders";
import { qrPng } from "#app/shared/qr";

export interface SendTicketsJobFields {
  orderId: string;
}

/** Scheduled in the transaction that issues the tickets, so it sends only once they exist. */
export class SendTicketsJob extends Job<SendTicketsJobFields> {
  static maxAttempts = 5;
  static timeoutMs = 60_000;

  run() {
    let order = orderById(this.fields.orderId);

    if (!order) {
      return;
    }

    let count = order.tickets.length;

    email({
      to: order.email,
      subject: `Your ${count === 1 ? "ticket" : `${count} tickets`} for ${order.title} at ${config.venue.name}`,
      body: new TicketsEmail({ order }),
      // Attached as well as linked: a client that blocks remote images still
      // has a code to show at the door.
      attachments: order.tickets.map((t, i) => {
        let data = qrPng(t.code);

        return new File({
          name: `ticket-${i + 1}-${t.code}.png`,
          size: data.length,
          contentType: "image/png",
          data: new Uint8Array(data),
          lastModified: new Date(),
        });
      }),
    });
  }
}
