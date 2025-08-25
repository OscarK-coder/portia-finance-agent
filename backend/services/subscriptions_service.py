# backend/services/subscriptions_service.py

from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

# In-memory stores
_subs: Dict[str, List[Dict[str, Any]]] = {}
_logs: List[Dict[str, Any]] = []


def _mock(user: str) -> List[Dict[str, Any]]:
    """Default mock subscriptions for a user"""
    now = datetime.now()
    _subs[user] = [
        {
            "id": "sub_netflix",
            "plan": "Netflix Premium",
            "status": "active",
            "renews_on": (now + timedelta(days=5)).isoformat(),
            "logo": "https://logo.clearbit.com/netflix.com",
        },
        {
            "id": "sub_spotify",
            "plan": "Spotify Premium",
            "status": "paused",
            "renews_on": (now + timedelta(days=2)).isoformat(),
            "logo": "https://logo.clearbit.com/spotify.com",
        },
        {
            "id": "sub_prime",
            "plan": "Amazon Prime",
            "status": "active",
            "renews_on": (now + timedelta(days=1)).isoformat(),
            "logo": "https://logo.clearbit.com/primevideo.com",
        },
        {
            "id": "sub_disney",
            "plan": "Disney+ Hotstar",
            "status": "canceled",
            "renews_on": None,
            "logo": "https://logo.clearbit.com/disneyplus.com",
        },
    ]
    _log(user, "reset (default mock loaded)")
    return _subs[user]


def _log(user: str, action: str, extra: Optional[dict] = None):
    """Append an entry to audit logs"""
    _logs.append({
        "id": len(_logs) + 1,
        "type": "action",
        "message": f"User {user} {action}",
        "timestamp": datetime.now().isoformat(),
        "details": extra or {}
    })


# ----------------------------
# Core Subscription Functions
# ----------------------------

def get_subscription_status(user: str) -> Dict[str, Any]:
    if user not in _subs:
        _mock(user)
    return {"subscriptions": _subs[user], "balance": 42.0}


def create_guest_subscription(user: str) -> List[Dict[str, Any]]:
    subs = _mock(user)
    _log(user, "created guest subscriptions")
    return subs


def pause_subscription(user: str, sub_id: str) -> List[Dict[str, Any]]:
    if user not in _subs:
        _mock(user)
    for s in _subs[user]:
        if s["id"] == sub_id and s["status"] == "active":
            s["status"] = "paused"
            _log(user, "paused subscription", {"sub_id": sub_id})
    return _subs[user]


def resume_subscription(user: str, sub_id: str) -> List[Dict[str, Any]]:
    if user not in _subs:
        _mock(user)
    for s in _subs[user]:
        if s["id"] == sub_id and s["status"] == "paused":
            s["status"] = "active"
            _log(user, "resumed subscription", {"sub_id": sub_id})
    return _subs[user]


def cancel_subscription(user: str, sub_id: str) -> List[Dict[str, Any]]:
    if user not in _subs:
        _mock(user)
    for s in _subs[user]:
        if s["id"] == sub_id and s["status"] in ("active", "paused", "trialing"):
            s["status"] = "canceled"
            _log(user, "canceled subscription", {"sub_id": sub_id})
    return _subs[user]


def reset_subscriptions(user: str = "user1") -> List[Dict[str, Any]]:
    subs = _mock(user)
    _log(user, "reset subscriptions to default mock state")
    return subs


# ----------------------------
# Logs
# ----------------------------

def get_logs() -> List[Dict[str, Any]]:
    """Return all audit logs"""
    return list(_logs)
