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
 * Cancel a subscription immediately
 * Body: { plan: string }
 */
export async function POST(req: Request) {
  const { plan } = await req.json();
  try {
    const mapping = loadMapping();
    const subId = mapping.subscriptions[plan];
    if (!subId) throw new Error("No subscription ID for plan: " + plan);

    const sub = await stripe.subscriptions.cancel(subId);

    return NextResponse.json({ success: true, sub });
  } catch (err: any) {
    console.error("❌ Stripe cancel error", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
