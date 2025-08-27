// types/stripe-overrides.d.ts

import Stripe from "stripe";

/**
 * Extend Stripe's Invoice type so TS stops complaining about
 * `payment_intent` and other expandable fields we actually use.
 */
declare module "stripe" {
  namespace Stripe {
    interface Invoice {
      // Normally typed as `never` unless expanded
      payment_intent?: string | Stripe.PaymentIntent | null;
      latest_invoice?: string | Stripe.Invoice | null;
      subscription?: string | Stripe.Subscription | null;
    }

    interface Subscription {
      // Add convenience typing for items
      latest_invoice?: string | Stripe.Invoice | null;
    }
  }
}
