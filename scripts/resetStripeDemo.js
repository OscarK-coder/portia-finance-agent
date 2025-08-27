// scripts/resetStripeDemo.js
import Stripe from "stripe";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

if (!process.env.STRIPE_SECRET_KEY) {
  console.error("❌ STRIPE_SECRET_KEY missing");
  process.exit(1);
}
console.log("✅ Using key:", process.env.STRIPE_SECRET_KEY.slice(0, 10) + "...");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

async function resetDemo() {
  // 1. Delete old demo customers
  const oldCustomers = await stripe.customers.list({ limit: 10 });
  for (const c of oldCustomers.data) {
    if (c.email?.includes("demo-user")) {
      console.log("🗑 Deleting old demo customer:", c.id);
      await stripe.customers.del(c.id);
    }
  }

  // 2. Create demo customer
  const customer = await stripe.customers.create({
    email: "demo-user@example.com",
    name: "Demo User",
    payment_method: "pm_card_visa", // ✅ attach test payment method
    invoice_settings: { default_payment_method: "pm_card_visa" },
  });
  console.log("✅ Customer created:", customer.id);

  // 3. Demo products
  const products = [
    { name: "Spotify Premium", price: 999 },
    { name: "Netflix", price: 1549 },
    { name: "Apple Music", price: 1099 },
    { name: "ChatGPT Plus", price: 2000 },
    { name: "Amazon Prime", price: 1499 },
  ];

  const subsMap = {};

  for (const p of products) {
    const product = await stripe.products.create({ name: p.name });
    const price = await stripe.prices.create({
      unit_amount: p.price,
      currency: "usd",
      recurring: { interval: "month" },
      product: product.id,
    });

    const sub = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: price.id }],
      expand: ["latest_invoice.payment_intent"],
    });

    // ✅ Confirm first payment so balance moves into Available
    const pi = sub.latest_invoice.payment_intent;
    if (pi && pi.status !== "succeeded") {
      await stripe.paymentIntents.confirm(pi.id);
      console.log(`💳 Confirmed payment for ${p.name} → ${pi.id}`);
    }

    subsMap[p.name] = sub.id;
    console.log(`📦 Subscribed to ${p.name} → ${sub.id}`);
  }

  // 4. Save demo mapping
  const demoData = {
    customerId: customer.id,
    subscriptions: subsMap,
  };
  const outPath = path.resolve(__dirname, "stripe-demo.json");
  fs.writeFileSync(outPath, JSON.stringify(demoData, null, 2));
  console.log("💾 Saved mapping to", outPath);

  console.log("🎉 Demo reset complete! Funds should now show in Stripe balance.");
}

resetDemo().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
