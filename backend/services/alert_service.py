from __future__ import annotations
from collections import deque
from datetime import datetime, timedelta
from enum import Enum
from typing import Deque, Dict, List, Optional, Sequence

import backend.services.crypto_service as crypto_service
from backend.services.log_service import add_log
from backend.services.subscriptions_service import get_subscription_status

# Config
DEMO_WALLET = "0x9ba79e76F4d1B06fA48855DC34e3D6E7bb1BED2B"
_alerts: Deque[Dict[str, object]] = deque(maxlen=200)


# --- Enums ---
class AlertLevel(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"


class AlertType(str, Enum):
    CRYPTO = "crypto"
    SUBSCRIPTION = "subscription"
    # Circle removed


def _now() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


# --- Core API ---
def add_alert(
    msg: str,
    level: AlertLevel | str = AlertLevel.WARNING,
    ctx: Optional[dict] = None,
    atype: AlertType | str = AlertType.CRYPTO,
):
    lvl = AlertLevel(level) if isinstance(level, str) else level
    t = AlertType(atype) if isinstance(atype, str) else atype
    alert = {
        "id": len(_alerts) + 1,
        "level": lvl.value,
        "type": t.value,
        "message": msg,
        "timestamp": _now(),
    }
    if ctx:
        alert["context"] = ctx
    _alerts.append(alert)
    add_log(lvl.value, f"ALERT [{t.value.upper()}]: {msg}")
    return alert


def get_alerts(limit: int = 20, level: Optional[str] = None, atype: Optional[str] = None) -> List[Dict]:
    results = list(_alerts)
    if level:
        results = [a for a in results if a["level"] == level]
    if atype:
        results = [a for a in results if a["type"] == atype]
    return results[-limit:]


def clear_alerts():
    _alerts.clear()


def resolve_alert(alert_id: int) -> bool:
    """Resolve (remove) a single alert by ID."""
    for alert in list(_alerts):
        if alert.get("id") == alert_id:
            try:
                _alerts.remove(alert)
                add_log("info", f"Resolved alert {alert.get('message')}")
                return True
            except ValueError:
                pass
    return False


# --- Checkers ---
def check_crypto_alerts() -> int:
    count = 0
    try:
        btc = crypto_service.get_price("BTC")
        price = float(btc["price"]) if btc and "price" in btc else None
        if price and price > 70_000:
            add_alert(f"BTC crossed $70K! Current: {price:.2f}", AlertLevel.INFO, atype=AlertType.CRYPTO)
            count += 1
    except Exception as e:
        add_alert(f"Error fetching BTC price: {e}", AlertLevel.ERROR, atype=AlertType.CRYPTO)
        count += 1

    try:
        bal = crypto_service.get_balance(DEMO_WALLET)
        eth, usdc = float(bal.get("eth", 0)), float(bal.get("usdc", 0))
        if eth < 0.01:
            add_alert("Demo wallet ETH critically low", AlertLevel.WARNING, {"wallet": DEMO_WALLET}, AlertType.CRYPTO)
            count += 1
        if usdc < 10:
            add_alert("Demo wallet USDC low", AlertLevel.WARNING, {"wallet": DEMO_WALLET}, AlertType.CRYPTO)
            count += 1
    except Exception as e:
        add_alert(f"Error checking demo wallet: {e}", AlertLevel.ERROR, atype=AlertType.CRYPTO)
        count += 1
    return count


def check_subscription_alerts(users: Sequence[str] = ("user1", "user2", "user3")) -> int:
    count = 0
    for u in users:
        try:
            s = get_subscription_status(u) or {}
            state, renew = s.get("status", ""), s.get("renews_on")
            if state.lower() == "canceled":
                add_alert(f"{u} subscription cancelled", AlertLevel.ERROR, {"user": u}, AlertType.SUBSCRIPTION)
                count += 1
            if state.lower() == "paused":
                add_alert(f"{u} subscription paused", AlertLevel.WARNING, {"user": u}, AlertType.SUBSCRIPTION)
                count += 1
            if renew:
                try:
                    dt = datetime.fromisoformat(str(renew))
                    if dt - datetime.now() < timedelta(days=3):
                        add_alert(
                            f"{u} subscription expiring soon ({dt.date()})",
                            AlertLevel.WARNING,
                            {"user": u, "renews_on": dt.isoformat()},
                            AlertType.SUBSCRIPTION,
                        )
                        count += 1
                except Exception:
                    pass
        except Exception as e:
            add_alert(f"Error checking subscription for {u}: {e}", AlertLevel.ERROR, {"user": u}, AlertType.SUBSCRIPTION)
            count += 1
    return count


def check_alerts(users: Sequence[str] = ("user1", "user2", "user3")) -> int:
    return check_crypto_alerts() + check_subscription_alerts(users)
    # Circle removed


# --- Recommendations & Plans ---
def recommend_action(alert: Dict) -> List[str]:
    """Return recommended actions for an alert message."""
    msg = alert.get("message", "").lower()
    if "usdc low" in msg:
        return ["Top up USDC manually", "Transfer from backup wallet"]
    if "eth critically low" in msg:
        return ["Fund ETH from faucet", "Transfer ETH from backup"]
    if "subscription cancelled" in msg:
        return ["Resume subscription", "Downgrade to Free plan"]
    if "subscription expiring" in msg:
        return ["Renew subscription now", "Switch to monthly plan"]
    return ["Investigate issue manually"]


def build_plans(alert: Dict) -> List[Dict]:
    """Return multiple structured plans for Portia to consider."""
    recs = recommend_action(alert)
    return [
        {
            "option": f"Plan {i}",
            "recommendation": r,
            "steps": [{"tool": "ask_agent", "args": {"query": r}}],
        }
        for i, r in enumerate(recs, start=1)
    ]


# --- Demo Events for Presentation ---
def trigger_demo_event(event_type: str) -> Dict:
    """Manually trigger demo alerts (for live presentations)."""
    demo_alert = None

    if event_type == "wallet_low":
        demo_alert = {
            "id": 999,
            "level": "warning",
            "type": "crypto",
            "message": "Demo wallet USDC low (balance = 8)",
            "context": {"wallet": DEMO_WALLET, "usdc": 8},
            "recommendations": ["Top up USDC manually", "Transfer from backup wallet"],
            "plans": build_plans({"message": "usdc low"}),
        }

    elif event_type == "market_drop":
        demo_alert = {
            "id": 1000,
            "level": "error",
            "type": "crypto",
            "message": "Ethereum price dropped -10% in the last hour",
            "context": {"symbol": "ETH", "drop_pct": -10},
            "recommendations": ["Hold ETH position", "Sell 30% ETH to USDC"],
            "plans": [
                {"option": "Plan 1", "steps": ["log('Hold ETH')"]},
                {"option": "Plan 2", "steps": ["convert_eth_to_usdc(30%)"]},
            ],
        }

    elif event_type == "subscription_expired":
        demo_alert = {
            "id": 1001,
            "level": "warning",
            "type": "subscription",
            "message": "User1 subscription expiring soon (2025-09-01)",
            "context": {"user": "user1", "renews_on": "2025-09-01"},
            "recommendations": ["Resume subscription", "Downgrade to Free", "Renew subscription"],
            "plans": build_plans({"message": "subscription expiring"}),
        }

    elif event_type == "failed_tx":
        demo_alert = {
            "id": 1002,
            "level": "error",
            "type": "crypto",
            "message": "Transaction failed due to insufficient gas",
            "context": {"tx_hash": "0xFAILED123"},
            "recommendations": ["Retry with higher gas", "Retry with smaller amount", "Use backup wallet"],
            "plans": build_plans({"message": "transaction failed"}),
        }

    else:
        return {"error": f"Unknown demo event type: {event_type}"}

    # Attach a one-line summary
    demo_alert["summary"] = f"{demo_alert['message']} Suggested actions: {', '.join(demo_alert['recommendations'])}"
    return demo_alert
