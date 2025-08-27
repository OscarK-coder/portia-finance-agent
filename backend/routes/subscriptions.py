from fastapi import APIRouter
from typing import Dict, Any
from datetime import datetime, timedelta
from backend.services.log_service import add_log

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])

# --- Mock storage ---
MOCK_SUBSCRIPTIONS: Dict[str, list[Dict[str, Any]]] = {
    "demo-user": [
        {
            "id": "sub1",
            "plan": "Netflix",
            "status": "active",
            "renews_on": (datetime.now() + timedelta(days=10)).isoformat(),
            "logo": "https://images.ctfassets.net/4cd45et68cgf/Rx83JoRDMkYNlMC9MKzcB/2b14d5a59fc3937afd3f03191e19502d/Netflix-Symbol.png?w=700&h=456",
            "logoFallback": "N",
        },
        {
            "id": "sub2",
            "plan": "Spotify",
            "status": "active",
            "renews_on": (datetime.now() + timedelta(days=20)).isoformat(),
            "logo": "https://m.media-amazon.com/images/I/51rttY7a+9L._h1_.png",
            "logoFallback": "S",
        },
    ],
    "judge-user": [
        {
            "id": "sub3",
            "plan": "Amazon Prime",
            "status": "active",
            "renews_on": (datetime.now() + timedelta(days=25)).isoformat(),
            "logo": "https://m.media-amazon.com/images/I/31W9hs7w0JL.png",
            "logoFallback": "A",
        },
        {
            "id": "sub4",
            "plan": "ChatGPT Plus",
            "status": "active",
            "renews_on": (datetime.now() + timedelta(days=15)).isoformat(),
            "logo": "https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg",
            "logoFallback": "C",
        },
    ],
}

# Mock balances for each wallet
MOCK_BALANCES: Dict[str, float] = {
    "demo-user": 120.0,
    "judge-user": 85.5,
}


@router.get("/{user_id}")
def status(user_id: str) -> Dict[str, Any]:
    """Fetch subscriptions + balance for given user."""
    subs = MOCK_SUBSCRIPTIONS.get(user_id, [])
    balance = MOCK_BALANCES.get(user_id, 0.0)
    return {"subs": subs, "balance": balance}


def _update_status(user_id: str, sub_id: str, new_status: str):
    subs = MOCK_SUBSCRIPTIONS.get(user_id, [])
    for s in subs:
        if s["id"] == sub_id:
            s["status"] = new_status
            add_log("action", f"{new_status.title()} {sub_id}", {"user": user_id})
    balance = MOCK_BALANCES.get(user_id, 0.0)
    return {"subs": subs, "balance": balance}


@router.post("/{user_id}/pause/{sub_id}")
def pause(user_id: str, sub_id: str):
    return _update_status(user_id, sub_id, "paused")


@router.post("/{user_id}/resume/{sub_id}")
def resume(user_id: str, sub_id: str):
    return _update_status(user_id, sub_id, "active")


@router.post("/{user_id}/cancel/{sub_id}")
def cancel(user_id: str, sub_id: str):
    return _update_status(user_id, sub_id, "canceled")


@router.post("/{user_id}/refund/{sub_id}")
def refund(user_id: str, sub_id: str):
    add_log("action", f"Refund issued for {sub_id}", {"user": user_id})
    return {"ok": True, "message": f"Refund processed for {sub_id}"}
