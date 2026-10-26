![Ticket sales with QR check-in, built by Claude Code on Elements: the admin sales page with five upcoming shows, their gig posters, tickets sold, revenue and tonight's live check-in count.](https://elements.dev/demos/01a0f43a-6df4-7722-a448-0d34d942bb2f/poster?v=a2d0076cfaf9)

# Ticket sales with QR check-in, built by Claude Code on Elements

> Gatestub is a full-stack app built with Claude Code on Elements.

Shows with posters and ticket types, card checkout, one QR code per ticket by email, sales per show, and a phone door check-in with a live count.

[Run this app on your machine](https://elements.dev/demos/01a0f43a-6df4-7722-a448-0d34d942bb2f). Use this demo as inspiration, or as the starting point for your own app. Your agent creates a new app with this one as the scaffold, and you prompt it to add whatever features you want.

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

- **Live ticket counts.** Ticket types are a LiveTable. Database triggers keep sold and checked-in counts current as tickets are issued and scanned and broadcast each change, so tickets remaining and checked in versus sold update on every open screen.

- **Card checkout with just an email.** Checkout reads prices and stock under a row lock, holds the tickets and sends the fan to Stripe. Tickets are issued when the fan returns and again when Stripe's webhook arrives, once either way. Until a Stripe key is set, the pay button opens a test checkout inside the app that records the payment through the same function, so tickets and emails work from the start. With one secret key it goes to Stripe, and in production the app registers its own webhook on the first checkout.

- **Ticket emails from a job.** Issuing tickets schedules a job in the same transaction, and it emails one QR code per ticket, inline and as an attachment.

- **Door check-in.** Door staff scan a QR code with the phone's camera or search by name, and an `@rpc` function admits each ticket once and answers valid, already checked in or not found.

- **Sessions and roles.** Admin and door accounts sign in to their own pages, and admins create shows and see sales per show.

- **Data from SQL files.** Migrations define the schema and seed four upcoming shows with drawn posters and sales, plus tonight's show with 141 of 230 checked in. The project server applied each one as soon as it was saved.

## Why Elements

Elements is an integrated full-stack app framework and a project server. The project server checks the agent's work as it builds: it type-checks the server and browser code, analyzes the program, applies migrations and runs the tests, then reports the results to the agent. A security mistake, such as calling a server-only function from the browser, is a compile error. The agent reads the report and fixes its own mistakes before it tells you a feature is done. The same checks run on every feature you ask for next.
