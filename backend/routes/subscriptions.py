# backend/routes/subscriptions.py

from fastapi import APIRouter, HTTPException, Request
import os

from backend.services.subscriptions_service import (
    get_subscription_status,
    create_guest_subscription,
    pause_subscription,
    resume_subscription,
    cancel_subscription,
    reset_subscriptions,
)

router = APIRouter(tags=["subscriptions"])


@router.get("/{user_id}")
def status(user_id: str):
    """Get subscriptions for a user (auto-create if missing)"""
    snap = get_subscription_status(user_id)
    if not snap["subscriptions"]:  # 👈 if no subs, create mock
        subs = create_guest_subscription(user_id)
        return {"subs": subs, "balance": 20.0}  # 👈 initial balance
    return {"subs": snap["subscriptions"], "balance": snap["balance"] or 20.0}


@router.post("/create/{user_id}")
def create(user_id: str):
    """Create guest subscriptions (mock data)"""
    subs = create_guest_subscription(user_id)
    return {"subs": subs, "balance": 20.0}  # 👈 initial balance


@router.post("/{user_id}/pause/{sub_id}")
def pause(user_id: str, sub_id: str):
    subs = pause_subscription(user_id, sub_id)
    return {"subs": subs, "balance": 20.0}


@router.post("/{user_id}/resume/{sub_id}")
def resume(user_id: str, sub_id: str):
    subs = resume_subscription(user_id, sub_id)
    return {"subs": subs, "balance": 20.0}


@router.post("/{user_id}/cancel/{sub_id}")
def cancel(user_id: str, sub_id: str):
    subs = cancel_subscription(user_id, sub_id)
    return {"subs": subs, "balance": 20.0}


@router.post("/reset/{user_id}")
def reset(user_id: str):
    """Reset subscriptions back to default mock state"""
    subs = reset_subscriptions(user_id)
    return {"subs": subs, "balance": 20.0}


# Optional — Webhook stub (ignored in mock mode)
@router.post("/stripe/webhook")
async def webhook(_: Request):
    return {"mock": True, "received": True, "note": "Webhook ignored in demo mode"}
