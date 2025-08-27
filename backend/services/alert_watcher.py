# backend/services/alert_watcher.py

import asyncio
import threading
from collections import deque
from datetime import datetime
from typing import List, Dict

from backend.services import alert_service, crypto_service

# Buffer of enriched recent alerts (max 100)
_recent_alerts: deque[Dict] = deque(maxlen=100)

# Track pending tx hashes
_pending_txs: set[str] = set()

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

    elif "wallet" in msg and "low" in msg:
        alert["recommendations"] = [
            "🟡 Mint 50 USDC via Circle — Restores balance above $50.",
            "🔀 Transfer from backup wallet — Avoid minting fees."
        ]

    elif "subscription" in msg:
        alert["recommendations"] = [
            "🔄 Resume subscription — Keep features uninterrupted.",
            "⬇️ Downgrade to Free — Save costs until next salary credit.",
            "🔁 Renew subscription — Pre-pay for next cycle."
        ]

    elif "transaction failed" in msg:
        alert["recommendations"] = [
            "⛽ Retry with higher gas — +20% gas ensures confirmation.",
            "✂️ Retry smaller amount — Reduce transfer size.",
            "🔀 Use backup wallet — Ensure transfer completes."
        ]

    elif "circle" in msg and "low" in msg:
        alert["recommendations"] = [
            "💳 Top-up with 100 USDC — Maintain $100 minimum balance.",
            "🔁 Redeem USDC back — Rebalance treasury."
        ]

    # Attach summary
    if "recommendations" in alert:
        alert["summary"] = f"⚠️ {alert['message']} Suggested actions: " + \
            ", ".join([r.split('—')[0].strip() for r in alert["recommendations"]])

    return alert


async def _watch_loop(interval: int = 15):
    """Background loop to check alerts and pending tx confirmations."""
    while True:
        try:
            # 1. Normal alerts (crypto, subscriptions, circle)
            new_count = alert_service.check_alerts()
            if new_count > 0:
                alerts = alert_service.get_alerts(limit=new_count)
                with _lock:
                    for a in alerts:
                        enriched = _advisor_style_enrichment(dict(a))
                        if enriched not in _recent_alerts:
                            _recent_alerts.append(enriched)
                print(f"[ALERT WATCHER] 🚨 {new_count} new alerts at {datetime.now()}")

            # 2. Check pending transactions
            if _pending_txs:
                for tx in list(_pending_txs):
                    res = crypto_service.check_tx(tx)
                    if res.get("status") in ("confirmed", "failed"):
                        with _lock:
                            alert = {
                                "id": int(datetime.utcnow().timestamp() * 1000),
                                "level": "info" if res["status"] == "confirmed" else "error",
                                "type": "crypto",
                                "message": f"Tx {tx} {res['status']} in block {res.get('block')}",
                                "explorer": res.get("explorer"),
                                "timestamp": datetime.utcnow().isoformat(),
                            }
                            _recent_alerts.append(_advisor_style_enrichment(alert))
                        _pending_txs.remove(tx)
                        print(f"[ALERT WATCHER] ✅ Tx {tx} {res['status']}")

        except Exception as e:
            print(f"[ALERT WATCHER] ❌ Error: {e}")
        await asyncio.sleep(interval)


def get_recent_alerts(limit: int = 20) -> List[Dict]:
    """Get most recent enriched alerts, fallback to demo if none."""
    with _lock:
        alerts = list(_recent_alerts)[-limit:]
    if not alerts:
        # fallback demo alerts
        alerts = [
            {
                "id": 1,
                "level": "warning",
                "type": "crypto",
                "message": "Demo wallet USDC low (balance = 8)",
                "recommendations": ["Top up USDC", "Transfer from backup wallet"],
                "summary": "⚠️ Demo wallet USDC low (balance = 8) Suggested actions: Top up USDC, Transfer from backup wallet"
            }
        ]
    return alerts


def start_watcher(loop_interval: int = 15):
    """Kick off the background watcher in a thread-safe way."""
    loop = asyncio.get_event_loop()
    loop.create_task(_watch_loop(interval=loop_interval))
    print(f"[ALERT WATCHER] ✅ Started background alert watcher (every {loop_interval}s)")


def track_tx(tx_hash: str):
    """Register a tx hash for background confirmation checking."""
    with _lock:
        _pending_txs.add(tx_hash)
    print(f"[ALERT WATCHER] ⏳ Tracking tx {tx_hash}")
