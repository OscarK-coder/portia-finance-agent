# backend/services/alert_watcher.py
import asyncio
import threading
from collections import deque
from datetime import datetime
from typing import List, Dict

from backend.services import alert_service

# Buffer of enriched recent alerts (max 100)
_recent_alerts: deque[Dict] = deque(maxlen=100)

# Lock for thread safety
_lock = threading.Lock()


def _advisor_style_enrichment(alert: Dict) -> Dict:
    """Advisor-style enrichment with reasoning + plans."""
    msg = alert.get("message", "").lower()

    if "btc crossed" in msg or "eth price" in msg or "dropped" in msg:
        alert["recommendations"] = [
            "✋ Hold position — Ride out short-term volatility.",
            "💱 Sell 30% to USDC — Reduce exposure while keeping upside.",
            "💸 Cash out to PayPal — Fully hedge by moving to fiat."
        ]
        alert["plans"] = [
            {"option": "Plan 1", "steps": ["log('Hold position')"]},
            {"option": "Plan 2", "steps": ["convert_eth_to_usdc(30%)"]},
            {"option": "Plan 3", "steps": [
                "convert_eth_to_usdc(30%)",
                "redeem_usdc(amount=<converted>, destination=PayPal)"
            ]}
        ]

    elif "wallet" in msg and "low" in msg:
        alert["recommendations"] = [
            "🟡 Mint 50 USDC via Circle — Restores balance above $50.",
            "🔀 Transfer from backup wallet — Avoid minting fees."
        ]
        alert["plans"] = [
            {"option": "Plan 1", "steps": ["mint_usdc(amount=50, address=DEMO_WALLET)"]},
            {"option": "Plan 2", "steps": ["transfer_usdc(receiver=DEMO_WALLET, amount=50)"]}
        ]

    elif "subscription" in msg:
        alert["recommendations"] = [
            "🔄 Resume subscription — Keep features uninterrupted.",
            "⬇️ Downgrade to Free — Save costs until next salary credit.",
            "🔁 Renew subscription — Pre-pay for next cycle."
        ]
        alert["plans"] = [
            {"option": "Plan 1", "steps": ["resume_subscription(user1)"]},
            {"option": "Plan 2", "steps": ["cancel_subscription(user1)"]},
            {"option": "Plan 3", "steps": [
                "pause_subscription(user1)",
                "resume_subscription(user1)"
            ]}
        ]

    elif "transaction failed" in msg:
        alert["recommendations"] = [
            "⛽ Retry with higher gas — +20% gas ensures confirmation.",
            "✂️ Retry smaller amount — Reduce transfer size.",
            "🔀 Use backup wallet — Ensure transfer completes."
        ]
        alert["plans"] = [
            {"option": "Plan 1", "steps": ["retry_tx(gas_multiplier=1.2)"]},
            {"option": "Plan 2", "steps": ["transfer_usdc(receiver, amount/2)"]},
            {"option": "Plan 3", "steps": ["transfer_from_backup_wallet(receiver, amount)"]}
        ]

    elif "circle" in msg and "low" in msg:
        alert["recommendations"] = [
            "💳 Top-up with 100 USDC — Maintain $100 minimum balance.",
            "🔁 Redeem USDC back — Rebalance treasury."
        ]
        alert["plans"] = [
            {"option": "Plan 1", "steps": ["mint_usdc(amount=100, address=Circle)"]},
            {"option": "Plan 2", "steps": ["redeem_usdc(amount=40, address=Circle)"]}
        ]

    # Attach summary
    if "recommendations" in alert:
        alert["summary"] = f"⚠️ {alert['message']} Suggested actions: " + \
            ", ".join([r.split('—')[0].strip() for r in alert["recommendations"]])

    return alert


async def _watch_loop(interval: int = 15):
    """Background loop to check alerts periodically."""
    while True:
        try:
            new_count = alert_service.check_alerts()
            if new_count > 0:
                alerts = alert_service.get_alerts(limit=new_count)
                with _lock:
                    for a in alerts:
                        enriched = _advisor_style_enrichment(dict(a))
                        if enriched not in _recent_alerts:
                            _recent_alerts.append(enriched)
                print(f"[ALERT WATCHER] 🚨 {new_count} new alerts at {datetime.now()}")
        except Exception as e:
            print(f"[ALERT WATCHER] ❌ Error: {e}")
        await asyncio.sleep(interval)


def get_recent_alerts(limit: int = 20) -> List[Dict]:
    """Get most recent enriched alerts from buffer."""
    with _lock:
        return list(_recent_alerts)[-limit:]


def start_watcher(loop_interval: int = 15):
    """Kick off the background watcher in a thread-safe way."""
    loop = asyncio.get_event_loop()
    loop.create_task(_watch_loop(interval=loop_interval))
    print(f"[ALERT WATCHER] ✅ Started background alert watcher (every {loop_interval}s)")
