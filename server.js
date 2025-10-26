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
      case "checkout.session.completed":
        // handle successful checkout
        break;
      case "invoice.paid":
        // handle successful invoice payment
        break;
      case "invoice.payment_failed":
        // handle failed payment
        break;
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        // handle subscription changes
        break;
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
