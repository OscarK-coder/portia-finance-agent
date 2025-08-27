import os
import stripe
from datetime import datetime
from typing import Dict, Any

from backend.services.log_service import add_log

# --- Stripe Setup ---
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# --- Friendly Plan Logos ---
PLAN_LOGOS = {
    "Spotify Premium": "https://logo.clearbit.com/spotify.com",
    "ChatGPT Plus": "https://logo.clearbit.com/openai.com",
    "Netflix Premium": "https://logo.clearbit.com/netflix.com",
    "Amazon Prime": "https://logo.clearbit.com/primevideo.com",
    "Disney+ Hotstar": "https://logo.clearbit.com/disneyplus.com",
}


# ----------------------------
# Core Subscription Functions
# ----------------------------

def get_subscription_status(user: str) -> Dict[str, Any]:
    """Fetch subscriptions for a given user (by email or customer id)."""
    try:
        customers = stripe.Customer.list(email=user, limit=1).data
        if not customers:
            return {"subscriptions": [], "balance": 0.0}

        customer = customers[0]
        subs = stripe.Subscription.list(customer=customer.id, limit=10).data

        subscriptions = []
        for s in subs:
            plan_obj = s["items"]["data"][0]["plan"]
            plan_name = plan_obj.get("nickname") or plan_obj["id"]
            logo = PLAN_LOGOS.get(plan_name)

            subscriptions.append({
                "id": s.id,
                "plan": plan_name,
                "status": s.status,
                "renews_on": datetime.fromtimestamp(s.current_period_end).isoformat()
                if s.current_period_end else None,
                "logo": logo,
            })

        add_log("info", f"Fetched {len(subscriptions)} subscriptions", {"user": user})
        return {"subscriptions": subscriptions, "balance": 0.0}

    except Exception as e:
        add_log("error", "Stripe fetch subscriptions failed", {"err": str(e)})
        return {"subscriptions": [], "balance": 0.0}


def pause_subscription(user: str, sub_id: str):
    """Pause a Stripe subscription (mark uncollectible)."""
    try:
        stripe.Subscription.modify(sub_id, pause_collection={"behavior": "mark_uncollectible"})
        add_log("action", f"Paused subscription {sub_id}", {"user": user})
        return get_subscription_status(user)
    except Exception as e:
        add_log("error", "Pause subscription failed", {"err": str(e)})
        raise


def resume_subscription(user: str, sub_id: str):
    """Resume a paused Stripe subscription."""
    try:
        stripe.Subscription.modify(sub_id, pause_collection="")
        add_log("action", f"Resumed subscription {sub_id}", {"user": user})
        return get_subscription_status(user)
    except Exception as e:
        add_log("error", "Resume subscription failed", {"err": str(e)})
        raise


def cancel_subscription(user: str, sub_id: str):
    """Cancel a Stripe subscription (immediate prorated refund if enabled)."""
    try:
        stripe.Subscription.delete(sub_id, invoice_now=True, prorate=True)
        add_log("action", f"Canceled subscription {sub_id}", {"user": user})
        return get_subscription_status(user)
    except Exception as e:
        add_log("error", "Cancel subscription failed", {"err": str(e)})
        raise


def refund_subscription(user: str, sub_id: str) -> Dict[str, Any]:
    """Refund the latest payment for a subscription."""
    try:
        # 1. Find the latest invoice
        invoices = stripe.Invoice.list(subscription=sub_id, limit=1)
        if not invoices.data:
            add_log("error", f"No invoices found for subscription {sub_id}", {"user": user})
            return {"status": "error", "message": "No invoices found"}

        payment_intent_id = invoices.data[0].payment_intent
        if not payment_intent_id:
            add_log("error", f"No payment intent for subscription {sub_id}", {"user": user})
            return {"status": "error", "message": "No payment intent found"}

        # 2. Process refund
        refund = stripe.Refund.create(payment_intent=payment_intent_id)

        # 3. Log success
        add_log("action", f"Refund processed for subscription {sub_id}", {
            "refund_id": refund.id,
            "user": user,
        })

        return {"status": "success", "refund_id": refund.id}

    except Exception as e:
        add_log("error", "Refund subscription failed", {"err": str(e), "user": user})
        return {"status": "error", "message": str(e)}


def update_subscription(user: str, sub_id: str, new_price_id: str):
    """
    Update a Stripe subscription by switching to a new plan (price_id).
    Example: Move from Spotify Premium to ChatGPT Plus.
    """
    try:
        sub = stripe.Subscription.retrieve(sub_id)
        item_id = sub["items"]["data"][0].id

        updated = stripe.Subscription.modify(
            sub_id,
            cancel_at_period_end=False,
            proration_behavior="create_prorations",
            items=[{
                "id": item_id,
                "price": new_price_id
            }],
        )

        add_log("action", f"Updated subscription {sub_id}", {"user": user, "new_price": new_price_id})
        return get_subscription_status(user)

    except Exception as e:
        add_log("error", "Update subscription failed", {"err": str(e)})
        raise
