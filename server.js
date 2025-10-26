import express from "express";
import Stripe from "stripe";
import bodyParser from "body-parser";

const app = express();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20",
});

// ✅ Webhook endpoint (works for both test + live)
app.post("/webhook", bodyParser.raw({ type: "application/json" }), (req, res) => {
  const sig = req.headers["stripe-signature"];

  const secret =
    process.env.NODE_ENV === "production"
      ? process.env.STRIPE_WEBHOOK_SECRET_LIVE || process.env.STRIPE_WEBHOOK_SECRET_TEST
      : process.env.STRIPE_WEBHOOK_SECRET_TEST;

  if (!secret) {
    console.error("❌ Missing STRIPE_WEBHOOK_SECRET env var");
    return res.status(500).send("Server misconfigured");
  }

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, secret);
    console.log("✅ Webhook received:", event.type, event.id);

    switch (event.type) {
  case "checkout.session.completed": {
    const session = event.data.object;
    console.log("✅ Checkout complete for:", session.customer_email || session.customer);
    // 1) Identify user via session.client_reference_id or session.metadata.userId
    // 2) Save session.customer and session.subscription in your DB
    // 3) Grant access or mark subscription as active
    break;
  }

  case "invoice.paid": {
    const invoice = event.data.object;
    console.log("💰 Invoice paid:", invoice.id, "Customer:", invoice.customer);
    // Extend access / record payment
    break;
  }

  case "invoice.payment_failed": {
    const invoice = event.data.object;
    console.warn("⚠️ Invoice payment failed for customer:", invoice.customer);
    // Flag account, restrict features, or email the user
    break;
  }

  case "customer.subscription.updated": {
    const sub = event.data.object;
    console.log("🔄 Subscription updated:", sub.id, "status:", sub.status);
    // Update plan or expiry date in DB
    break;
  }

  case "customer.subscription.deleted": {
    const sub = event.data.object;
    console.log("❌ Subscription cancelled:", sub.id);
    // Revoke access immediately or at period end
    break;
  }

  case "customer.subscription.trial_will_end": {
    const sub = event.data.object;
    console.log("⏳ Trial ending soon for:", sub.id);
    // Optional: send reminder email
    break;
  }

  default:
    console.log("ℹ️ Unhandled event:", event.type);
}
    return res.sendStatus(200);
  } catch (err) {
    console.error("❌ Webhook verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

// healthcheck endpoint
app.get("/health", (_req, res) => res.send("ok"));

// start server
const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`🚀 Webhook server listening on port ${port}`));
