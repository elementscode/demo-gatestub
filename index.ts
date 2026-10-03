import { App, getEnv } from "@elements/app";
import config from "#config";
import home from "#app/pages/home";
import show from "#app/pages/show";
import order from "#app/pages/order";
import signin from "#app/pages/signin";
import door from "#app/pages/door";
import admin from "#app/pages/admin";
import adminShow from "#app/pages/admin-show";
import adminShowNew from "#app/pages/admin-show-new";
import checkoutTest from "#app/pages/checkout-test";
import { checkoutReturn, checkoutCancel } from "#app/routes/checkout";
import stripeWebhook from "#app/routes/stripe-webhook";
import ticketsEmailPreview from "#app/routes/email-preview";
import servePoster from "#app/routes/poster";
import serveQr from "#app/routes/qr";
import { stripeConfigured } from "#app/shared/stripe";
import notFound from "#app/pages/errors/not-found";
import unhandled from "#app/pages/errors/unhandled";

if (getEnv() === "production" && !stripeConfigured()) {
  throw new Error("STRIPE_SECRET_KEY is required in production.");
}

const app = new App();

app.route("/", home);
app.route("/shows/:id", show);
app.route("/orders/:token", order);
app.route("/signin", signin);
app.route("/door/:id?", door);
app.route("/admin", admin);
app.route("/admin/shows/new", adminShowNew);
app.route("/admin/shows/:id", adminShow);
app.route("/checkout/return", checkoutReturn);
app.route("/checkout/cancel/:token", checkoutCancel);
app.route("/checkout/test/:token", checkoutTest);
app.route({ method: "post", path: "/stripe/webhook", handler: stripeWebhook });
app.route("/posters/:id/:hash", servePoster);
app.route("/qr/:code.png", serveQr);

if (process.env.ENV === "development") {
  app.route("/dev/emails/tickets", ticketsEmailPreview);
}

app.error((req, res, err) => {
  switch (err.statusCode) {
    case 401:
      res.redirect(`/signin?next=${encodeURIComponent(req.url ?? "/")}`);
      return;

    case 404:
      return notFound(req, res, err);

    default:
      return unhandled(req, res, err);
  }
});

app.start(config);
