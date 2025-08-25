# backend/routes/users.py

import uuid, threading
from datetime import datetime
from typing import Dict, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from backend.services.log_service import add_log
from backend.services.subscriptions_service import (
    get_subscription_status, create_guest_subscription
)

# ❌ remove prefix
router = APIRouter(tags=["users"])

_lock = threading.RLock()
_users: Dict[int, Dict[str, object]] = {}

def _now(): return datetime.utcnow().isoformat()
def _username(): return f"guest_{uuid.uuid4().hex[:8]}"

class UserOut(BaseModel):
    id: int
    username: str
    plan: str
    active: bool
    renews_on: Optional[str] = None
    created_at: str

@router.get("/health")
def health(): return {"ok": True, "count": len(_users)}

@router.get("/")
def list_users(limit: int = Query(50, ge=1, le=1000)):
    with _lock: vals = list(_users.values())[-limit:]
    return {"users": [UserOut(**u) for u in vals], "count": len(vals)}

@router.delete("/clear")
def clear_users():
    with _lock: _users.clear()
    add_log("action", "All users cleared")
    return {"ok": True, "count": 0}

@router.post("/login/guest", response_model=UserOut)
def guest_login():
    uid = len(_users) + 1
    sub = create_guest_subscription(str(uid))
    user = {
        "id": uid,
        "username": _username(),
        "plan": sub.get("plan", "Free"),
        "active": (sub.get("status") == "Active"),
        "renews_on": sub.get("renews_on"),
        "created_at": _now(),
    }
    with _lock: _users[uid] = user
    add_log("action", "Guest user created", {"id": uid, "plan": user["plan"]})
    return UserOut(**user)

@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int):
    with _lock: user = _users.get(user_id)
    if not user: raise HTTPException(404, "User not found")
    return UserOut(**user)

@router.get("/{user_id}/subscription")
def subscription(user_id: int):
    try:
        snap = get_subscription_status(str(user_id))
        return {
            "plan": snap.get("plan"),
            "status": snap.get("status"),
            "renews_on": snap.get("renews_on"),
            "last_used": snap.get("last_used"),
        }
    except Exception as e:
        raise HTTPException(500, str(e))
