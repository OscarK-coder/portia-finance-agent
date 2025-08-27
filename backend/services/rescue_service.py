from __future__ import annotations
import os, uuid, threading
from datetime import datetime
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv
from backend.services.log_service import add_log
from backend.services import crypto_service as _crypto

try:
    from backend.services.subscriptions_service import create_checkout_session as _create_checkout_session
except:
    _create_checkout_session = None

try:
    import stripe
except:
    stripe = None

load_dotenv()

# --- Config ---
ALIASES = {
    "DEMO_WALLET": os.getenv("DEMO_WALLET_ADDRESS", "").strip(),
    "JUDGE_WALLET": os.getenv("JUDGE_WALLET_ADDRESS", "").strip(),
    "BACKUP_WALLET": os.getenv("BACKUP_WALLET_ADDRESS", "").strip(),
}
STRIPE_SECRET = os.getenv("STRIPE_SECRET_KEY", "")
_USE_STRIPE = bool(stripe and STRIPE_SECRET and os.getenv("STRIPE_MODE", "auto") in ("api", "auto"))
if _USE_STRIPE:
    stripe.api_key = STRIPE_SECRET

# --- State ---
_lock = threading.RLock()
_plans: List[Dict[str, Any]] = []
_idx = 1


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _alias_to_address(a: str) -> str:
    return ALIASES.get(a.upper().strip(), a)


def _step(action: str, **params):
    return {
        "id": uuid.uuid4().hex[:8],
        "action": action,
        "params": params,
        "status": "pending",
        "result": None,
        "started_at": None,
        "ended_at": None,
    }


def _new_plan(event, desc, steps, user):
    return {
        "id": _next_id(),
        "event": event,
        "description": desc,
        "steps": steps,
        "requires_approval": True,
        "status": "pending",
        "created_at": _now(),
        "user": user,
    }


def _next_id() -> str:
    global _idx
    with _lock:
        pid = f"plan_{_idx}"
        _idx += 1
        return pid


# --- Stripe mock/API ---
def _deposit_to_stripe(amt: float, user="user1") -> Dict[str, Any]:
    if amt <= 0:
        raise ValueError("amount_usd must be >0")
    if _USE_STRIPE:
        intent = stripe.PaymentIntent.create(
            amount=int(amt * 100),
            currency="usd",
            payment_method_types=["card"],
            description=f"USDC off-ramp deposit for {user}",
        )
        add_log("success", f"Stripe deposit ${amt} (pi: {intent.id})")
        return {"status": "success", "stripe_id": intent.id, "amount": amt}
    mid = f"pi_mock_{uuid.uuid4().hex[:8]}"
    add_log("success", f"[MOCK] Stripe deposit ${amt} (pi:{mid})")
    return {"status": "success", "stripe_id": mid, "amount": amt}


# --- Plan generation ---
def generate_rescue_plan(event: str, user="user1") -> Optional[Dict[str, Any]]:
    ev = event.lower()
    if "eth drop" in ev:
        plan = _new_plan(
            event,
            "Sell 30% ETH→USDC→Transfer to Judge",
            [
                _step("sell_eth", percent=30, to="USDC"),
                _step("transfer_usdc", amount="auto", to="JUDGE_WALLET"),
            ],
            user,
        )
    elif "low usdc" in ev:
        plan = _new_plan(
            event,
            "Top up Demo with simulated USDC",
            [_step("transfer_usdc", amount=10, to="DEMO_WALLET")],
            user,
        )
    elif "subscription expiring" in ev:
        plan = _new_plan(
            event,
            f"Renew Pro subscription for {user}",
            [_step("create_checkout_session", plan="Pro", user=user)],
            user,
        )
    elif "wallet compromised" in ev:
        plan = _new_plan(
            event,
            "Transfer all funds to backup wallet",
            [_step("transfer_all", to="BACKUP_WALLET")],
            user,
        )
    else:
        return None
    with _lock:
        _plans.append(plan)
        add_log("warning", f"Rescue plan generated: {plan['description']}")
        return plan


def get_rescue_plans(limit: int | None = None, status: str | None = None) -> List[Dict[str, Any]]:
    with _lock:
        plans = [p for p in _plans if not status or p.get("status") == status]
    return plans[-limit:] if limit else plans


def approve_plan(pid: str) -> Optional[Dict[str, Any]]:
    with _lock:
        for p in _plans:
            if p["id"] == pid and p["status"] == "pending":
                p.update({"status": "approved", "approved_at": _now()})
                add_log("action", f"Plan approved {pid}")
                return p
    return None


def cancel_plan(pid: str) -> Optional[Dict[str, Any]]:
    with _lock:
        for p in _plans:
            if p["id"] == pid and p["status"] in ("pending", "approved"):
                p.update({"status": "cancelled", "cancelled_at": _now()})
                add_log("info", f"Plan cancelled {pid}")
                return p
    return None


# --- Execution ---
def execute_plan(pid: str) -> Optional[Dict[str, Any]]:
    with _lock:
        plan = next((p for p in _plans if p["id"] == pid), None)
    if not plan:
        return None
    if plan["status"] not in ("approved", "executing"):
        raise ValueError("Plan must be approved")
    plan["status"] = "executing"
    plan.setdefault("started_at", _now())
    for step in plan["steps"]:
        if step["status"] in ("success", "skipped"):
            continue
        step["started_at"] = _now()
        action, params = step["action"], step["params"]
        try:
            step.update(status="success", result=_exec_step(action, params, plan))
        except Exception as e:
            step.update(status="failed", result={"error": str(e)}, ended_at=_now())
            plan.update(status="failed", ended_at=_now())
            add_log("error", f"Step {action} failed:{e}")
            return plan
        step["ended_at"] = _now()
    plan.update(status="succeeded", ended_at=_now())
    add_log("success", f"Rescue plan executed: {plan['description']}")
    return plan


# --- Step impl ---
def _exec_step(action: str, params: Dict[str, Any], plan: Dict[str, Any]) -> Any:
    a = action.lower()
    if a == "sell_eth":
        add_log("info", f"[SIM] Sell {params.get('percent')}% ETH→USDC")
        return {"simulated": True}
    if a == "transfer_usdc":
        to = _alias_to_address(params.get("to", ""))
        amt = params.get("amount", "auto")
        if amt == "auto":
            bal = _crypto.get_balance(ALIASES["DEMO_WALLET"])
            amt = max(min(float(bal.get("usdc", 0)), 5), 1)
        add_log("info", f"[SIM] Transfer {amt} USDC to {to}")
        return {"simulated": True, "to": to, "amount": amt}
    if a == "deposit_to_stripe":
        return _deposit_to_stripe(float(params.get("amount", 20)), plan.get("user", "user1"))
    if a == "create_checkout_session":
        if not _create_checkout_session:
            raise RuntimeError("No subscription service")
        return _create_checkout_session(plan.get("user", "user1"), params.get("plan", "Pro"))
    if a == "transfer_all":
        add_log("warning", f"[SIM] Transfer ALL funds to {_alias_to_address(params.get('to', ''))}")
        return {"simulated": True}
    raise ValueError(f"Unknown action {action}")


def clear_plans():
    global _idx
    with _lock:
        _plans.clear()
        _idx = 1
