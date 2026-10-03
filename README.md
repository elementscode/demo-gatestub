![Gatestub, event ticketing for a small music venue built with Elements: the admin sales page with five upcoming shows, their gig posters, tickets sold, revenue and tonight's live check-in count.](https://elements.dev/demos/01a0f43a-6df4-7722-a448-0d34d942bb2f/poster?v=a2d0076cfaf9)

# Gatestub

> A demo app built with [Elements](https://elements.dev).

Shows with posters and ticket types, card checkout, one QR code per ticket by email, sales per show, and a phone door check-in with a live count.

**Demo:** [Gatestub](https://elements.dev/demos/01a0f43a-6df4-7722-a448-0d34d942bb2f)

## Agent specs

- **Agent:** Claude Code, Opus 5.5 Medium
- **Time:** 22 min
- **Cost:** $7.43 at API rates, September 2026

## Get started

```bash
elements create gatestub -scaffold=elementscode/demo-gatestub
```

## Seed data and demo accounts

The seed creates The Gatehouse's calendar: tonight's show, Mercury Fuzz Choir,
with 141 of 230 ticket holders already checked in, and four more shows over
the next four weeks, each with a drawn gig poster, general admission and
balcony tickets, and existing orders. The sign-in page lists both logins.

| Email               | Password    | Role  |
| ------------------- | ----------- | ----- |
| admin@gatestub.test | `backstage` | admin |
| door@gatestub.test  | `frontdoor` | door  |

Admins see sales at `/admin` and create shows at `/admin/shows/new`. Door
staff check tickets in at `/door` on a phone, by camera or by name. Phones
only allow the camera over https, so scanning works on `localhost` and once
deployed; search by name works everywhere.

## Payments

Fans pay by card through Stripe Checkout. Without a key, payments run through
the built-in test checkout: the pay button opens an in-app page with the order
and a Pay button, and paying issues the tickets and sends their email exactly
as a real payment does. For real Stripe Checkout, add a Stripe secret key
(sandbox keys are free at
[dashboard.stripe.com/register](https://dashboard.stripe.com/register)) as
`STRIPE_SECRET_KEY` in `config/env/development.env`, and test with card
`4242 4242 4242 4242`. Production requires the key and registers its own
webhook with Stripe on the first checkout. In development, emails (with one
QR code per ticket) go to the project server log instead of being sent.

## How it's built

Gatestub needed guest card checkout, QR code tickets by email, a phone door page, and live ticket and check-in counts. Each of those is a part of Elements, so the agent spent its 22 minutes on the venue's night itself.

### What Elements gave the app

- **Live ticket counts.** Ticket types are a LiveTable. Database triggers keep sold and checked-in counts current as tickets are issued and scanned and broadcast each change, so tickets remaining and checked in versus sold update on every open screen.

- **Card checkout with just an email.** Checkout reads prices and stock under a row lock, holds the tickets and sends the fan to Stripe. Tickets are issued when the fan returns and again when Stripe's webhook arrives, once either way. Until a Stripe key is set, the pay button opens a test checkout inside the app that records the payment through the same function, so tickets and emails work from the start. With one secret key it goes to Stripe, and in production the app registers its own webhook on the first checkout.

- **Ticket emails from a job.** Issuing tickets schedules a job in the same transaction, and it emails one QR code per ticket, inline and as an attachment.

- **Door check-in.** Door staff scan a QR code with the phone's camera or search by name, and an `@rpc` function admits each ticket once and answers valid, already checked in or not found.

- **Sessions and roles.** Admin and door accounts sign in to their own pages, and admins create shows and see sales per show.

- **Data from SQL files.** Migrations define the schema and seed four upcoming shows with drawn posters and sales, plus tonight's show with 141 of 230 checked in. The project server applied each one as soon as it was saved.

### What the project server gave the agent

The project server runs alongside the agent and answers as soon as a file is saved: it type-checks the templates, TypeScript and SQL, applies migrations and reruns the tests, so every question came back right away and the agent kept building.

### What shipped

The app type-checks with zero errors and all 32 tests pass. Every page works on desktop and phone. A real sandbox payment goes through Stripe end to end and issues tickets with their QR codes, and live updates arrive across phones, such as the door count moving on a second phone the moment a ticket is scanned.

**Demo:** [Gatestub](https://elements.dev/demos/01a0f43a-6df4-7722-a448-0d34d942bb2f)

## License

MIT. See [LICENSE](LICENSE).
