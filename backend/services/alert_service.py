# backend/services/alert_service.py
from __future__ import annotations
from collections import deque
from datetime import datetime, timedelta
from enum import Enum
from typing import Deque, Dict, List, Optional, Sequence

from backend.services.crypto_service import get_price, get_balance
from backend.services.circle_service import get_circle_balances
from backend.services.log_service import add_log
from backend.services.subscriptions_service import get_subscription_status

# Config
DEMO_WALLET = "0x9ba79e76F4d1B06fA48855DC34e3D6E7bb1BED2B"
_alerts: Deque[Dict[str, object]] = deque(maxlen=200)

class AlertLevel(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"

class AlertType(str, Enum):
    CRYPTO = "crypto"
    SUBSCRIPTION = "subscription"
    CIRCLE = "circle"

def _now() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

# --- Core API ---
def add_alert(msg: str, level: AlertLevel | str = AlertLevel.WARNING, ctx: Optional[dict] = None, atype: AlertType | str = AlertType.CRYPTO):
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

# --- Checkers ---
def check_crypto_alerts() -> int:
    count = 0
    try:
        btc = get_price("BTC")
        price = float(btc["price"]) if btc and "price" in btc else None
        if price and price > 70_000:
            add_alert(f"BTC crossed $70K! Current: {price:.2f}", AlertLevel.INFO, atype=AlertType.CRYPTO)
            count += 1
    except Exception as e:
        add_alert(f"Error fetching BTC price: {e}", AlertLevel.ERROR, atype=AlertType.CRYPTO)
        count += 1

    try:
        bal = get_balance(DEMO_WALLET)
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

def check_subscription_alerts(users: Sequence[str] = ("user1","user2","user3")) -> int:
    count = 0
    for u in users:
        try:
            s = get_subscription_status(u) or {}
            state, renew = s.get("status",""), s.get("renews_on")
            if state == "Canceled":
                add_alert(f"{u} subscription cancelled", AlertLevel.ERROR, {"user":u}, AlertType.SUBSCRIPTION); count+=1
            if state == "Paused":
                add_alert(f"{u} subscription paused", AlertLevel.WARNING, {"user":u}, AlertType.SUBSCRIPTION); count+=1
            if renew:
                try:
                    dt = datetime.fromisoformat(str(renew))
                    if dt - datetime.now() < timedelta(days=3):
                        add_alert(
                            f"{u} subscription expiring soon ({dt.date()})",
                            AlertLevel.WARNING,
                            {"user":u,"renews_on":dt.isoformat()},
                            AlertType.SUBSCRIPTION
                        ); count+=1
                except: pass
        except Exception as e:
            add_alert(f"Error checking subscription for {u}: {e}", AlertLevel.ERROR, {"user":u}, AlertType.SUBSCRIPTION); count+=1
    return count

def check_circle_alerts() -> int:
    count = 0
    try:
        bals = get_circle_balances()
        for b in bals.get("balances", []):
            if b["currency"] in ("USD","USDC") and float(b["amount"]) < 50:
                add_alert(f"Circle {b['currency']} balance low: {b['amount']}", AlertLevel.WARNING, {"balance": b}, AlertType.CIRCLE)
                count += 1
    except Exception as e:
        add_alert(f"Error checking Circle balances: {e}", AlertLevel.ERROR, atype=AlertType.CIRCLE)
        count += 1
    return count

def check_alerts(users: Sequence[str] = ("user1","user2","user3")) -> int:
    return check_crypto_alerts() + check_subscription_alerts(users) + check_circle_alerts()

# --- Recommendations & Plans ---
def recommend_action(alert: Dict) -> List[str]:
    """Return recommended actions for an alert message."""
    msg = alert.get("message","").lower()
    if "usdc low" in msg:
        return ["🟡 Mint 50 USDC via Circle", "🔀 Transfer from backup wallet"]
    if "eth critically low" in msg:
        return ["Fund ETH from faucet", "Transfer ETH from backup"]
    if "subscription cancelled" in msg:
        return ["🔄 Resume subscription", "⬇️ Downgrade to Free plan"]
    if "subscription expiring" in msg:
        return ["Renew subscription now", "Switch to monthly plan"]
    if "circle" in msg and "low" in msg:
        return ["Top up Circle account", "Redeem USDC into Circle"]
    return ["Investigate issue manually"]

def build_plans(alert: Dict) -> List[Dict]:
    """Return multiple structured plans for Portia to consider."""
    recs = recommend_action(alert)
    plans = []
    for i, r in enumerate(recs, start=1):
        plans.append({
            "option": f"Plan {i}",
            "recommendation": r,
            "steps": [{"tool": "ask_agent", "args": {"query": r}}]  # delegate back to Portia
        })
    return plans


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
            "recommendations": [
                "🟡 Mint 50 USDC via Circle — Restores balance above $50 to cover short-term expenses.",
                "🔀 Transfer from backup wallet — Move funds from cold wallet to avoid minting fees."
            ],
            "plans": [
                {"option": "Plan 1", "steps": ["mint_usdc(amount=50, address=DEMO_WALLET)"]},
                {"option": "Plan 2", "steps": ["transfer_usdc(receiver=DEMO_WALLET, amount=50)"]}
            ]
        }

    elif event_type == "market_drop":
        demo_alert = {
            "id": 1000,
            "level": "error",
            "type": "crypto",
            "message": "Ethereum price dropped -10% in the last hour",
            "context": {"symbol": "ETH", "drop_pct": -10},
            "recommendations": [
                "✋ Hold ETH position — Ride out volatility, no action needed.",
                "💱 Sell 30% ETH to USDC — Reduce exposure while keeping upside potential.",
                "💸 Sell ETH → USDC → Transfer to PayPal — Fully hedge risk by cashing out into fiat."
            ],
            "plans": [
                {"option": "Plan 1", "steps": ["log('Hold ETH')"]},
                {"option": "Plan 2", "steps": ["convert_eth_to_usdc(30%)"]},
                {"option": "Plan 3", "steps": [
                    "convert_eth_to_usdc(amount=30%)",
                    "redeem_usdc(amount=<converted>, destination=PayPal)"
                ]}
            ]
        }

    elif event_type == "subscription_expired":
        demo_alert = {
            "id": 1001,
            "level": "warning",
            "type": "subscription",
            "message": "User1 subscription expiring soon (2025-09-01)",
            "context": {"user": "user1", "renews_on": "2025-09-01"},
            "recommendations": [
                "🔄 Resume subscription — Keep all features uninterrupted.",
                "⬇️ Downgrade to Free — Save costs until next salary credit on Sept 5.",
                "🔁 Renew subscription — Pre-pay for next cycle to avoid service disruption."
            ],
            "plans": [
                {"option": "Plan 1", "steps": ["resume_subscription(user1)"]},
                {"option": "Plan 2", "steps": ["cancel_subscription(user1)"]},
                {"option": "Plan 3", "steps": ["pause_subscription(user1)", "resume_subscription(user1)"]}
            ]
        }

    elif event_type == "failed_tx":
        demo_alert = {
            "id": 1002,
            "level": "error",
            "type": "crypto",
            "message": "Transaction failed due to insufficient gas",
            "context": {"tx_hash": "0xFAILED123"},
            "recommendations": [
                "⛽ Retry with higher gas — +20% gas ensures faster confirmation.",
                "✂️ Retry with smaller amount — Reduce transfer size to fit gas limit.",
                "🔀 Use backup wallet — If retry fails, complete transfer from backup wallet."
            ],
            "plans": [
                {"option": "Plan 1", "steps": ["retry_tx(gas_multiplier=1.2)"]},
                {"option": "Plan 2", "steps": ["transfer_usdc(receiver, amount/2)"]},
                {"option": "Plan 3", "steps": ["transfer_from_backup_wallet(receiver, amount)"]}
            ]
        }

    elif event_type == "crypto_to_fiat":
        demo_alert = {
            "id": 1003,
            "level": "info",
            "type": "circle",
            "message": "Convert 100 USDC to fiat (PayPal transfer)",
            "context": {"amount": 100, "currency": "USDC", "destination": "PayPal"},
            "recommendations": [
                "💸 Redeem 100 USDC — Cash out full amount to PayPal.",
                "🔄 Redeem 50 USDC, keep 50 USDC — Cover upcoming subscription while still cashing out half."
            ],
            "plans": [
                {"option": "Plan 1", "steps": ["redeem_usdc(amount=100, destination=PayPal)"]},
                {"option": "Plan 2", "steps": [
                    "redeem_usdc(amount=50, destination=PayPal)",
                    "log('retain 50 USDC for subscription')"
                ]}
            ]
        }

    elif event_type == "circle_low":
        demo_alert = {
            "id": 1004,
            "level": "warning",
            "type": "circle",
            "message": "Circle USD balance low (balance = 40)",
            "context": {"balance": {"currency": "USD", "amount": 40}},
            "recommendations": [
                "💳 Top-up with 100 USDC — Maintain minimum $100 balance for operations.",
                "🔁 Redeem USDC back — Rebalance from wallet to Circle treasury."
            ],
            "plans": [
                {"option": "Plan 1", "steps": ["mint_usdc(amount=100, address=Circle)"]},
                {"option": "Plan 2", "steps": ["redeem_usdc(amount=40, address=Circle)"]}
            ]
        }

    else:
        return {"error": f"Unknown demo event type: {event_type}"}

    # Attach a one-line summary
    demo_alert["summary"] = f"⚠️ {demo_alert['message']} Suggested actions: " + ", ".join(
        [r.split('—')[0].strip() for r in demo_alert["recommendations"]]
    )

    return demo_alert
