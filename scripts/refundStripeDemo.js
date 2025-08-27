// scripts/refundStripeDemo.js
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

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

async function refundDemo(productName) {
  const dataPath = path.resolve(__dirname, "stripe-demo.json");
  if (!fs.existsSync(dataPath)) {
    console.error("❌ stripe-demo.json not found, run resetStripeDemo.js first!");
    process.exit(1);
  }

  const demoData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  const subId = demoData.subscriptions[productName];
  if (!subId) {
    console.error(`❌ No subscription found for "${productName}"`);
    process.exit(1);
  }

  console.log(`🔎 Looking up invoices for ${productName} (${subId})...`);
  const invoices = await stripe.invoices.list({
    subscription: subId,
    limit: 1,
    expand: ["data.payment_intent"],
  });

  if (!invoices.data.length) {
    console.error("❌ No invoices found for subscription");
    process.exit(1);
  }

  const pi = invoices.data[0].payment_intent;
  if (!pi || pi.status !== "succeeded") {
    console.error("❌ Latest payment not found or not succeeded");
    process.exit(1);
  }

  const refund = await stripe.refunds.create({
    payment_intent: pi.id,
  });

  console.log(`💸 Refund processed for ${productName} → ${refund.id}`);
}

const productName = process.argv[2];
if (!productName) {
  console.error("❌ Usage: node refundStripeDemo.js \"Netflix\"");
  process.exit(1);
}

refundDemo(productName).catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
