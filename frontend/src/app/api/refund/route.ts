import { NextResponse } from "next/server";
import Stripe from "stripe";
import fs from "fs";
import path from "path";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20" as Stripe.LatestApiVersion,
});

function loadMapping() {
  const file = path.resolve(process.cwd(), "scripts/stripe-demo.json");
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

/**
 * Refund latest payment for a subscription
 * Body: { plan: string }
 */
export async function POST(req: Request) {
  const { plan } = await req.json();
  try {
    const mapping = loadMapping();
    const subId = mapping.subscriptions[plan];
    if (!subId) throw new Error("No subscription ID for plan: " + plan);

    // 1. Get latest invoice (expand payment_intent)
    const invoices = await stripe.invoices.list({
      subscription: subId,
      limit: 1,
      expand: ["data.payment_intent"], // ✅ include PI
    });

    if (!invoices.data.length) {
      throw new Error("No invoices found for subscription");
    }

    // ✅ Narrowed type
    const invoice = invoices.data[0] as Stripe.Invoice & {
      payment_intent?: string | Stripe.PaymentIntent | null;
    };

    const paymentIntentId =
      typeof invoice.payment_intent === "string"
        ? invoice.payment_intent
        : invoice.payment_intent?.id;

    if (!paymentIntentId) {
      throw new Error("No payment intent found for subscription");
    }

    // 2. Refund
    const refund = await stripe.refunds.create({ payment_intent: paymentIntentId });

    return NextResponse.json({ success: true, refund });
  } catch (err: any) {
    console.error("❌ Stripe refund error", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
