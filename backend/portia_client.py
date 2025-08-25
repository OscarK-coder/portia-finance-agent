import os
import concurrent.futures
from dotenv import load_dotenv
from typing import Dict, Any  # ✅ FIX: import Dict

from portia import Portia, default_config

# --- Load env ---
load_dotenv()
PORTIA_API_KEY = os.getenv("PORTIA_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not PORTIA_API_KEY:
    raise RuntimeError("❌ Missing PORTIA_API_KEY in .env")
if not OPENAI_API_KEY:
    raise RuntimeError("❌ Missing OPENAI_API_KEY in .env")

# --- Import backend services ---
from backend.services import (
    crypto_service,
    circle_service,
    subscriptions_service,
    alert_watcher,
    alert_service,
)

# --- Tool registry ---
TOOLS = {
    # Crypto
    "get_crypto_price": (
        crypto_service.get_price,
        "Get the latest price of a cryptocurrency (BTC, ETH, SOL, DOGE, USDC). Returns {symbol, price, currency}."
    ),
    "get_wallet_balance": (
        crypto_service.get_balance,
        "Check the wallet balance of a given address, including ETH and USDC. Returns {address, usdc, eth, explorer}."
    ),
    "transfer_usdc": (
        crypto_service.transfer_usdc,
        "Transfer USDC tokens to another wallet. Returns {status, tx_hash, explorer, to, amount}."
    ),
    "check_transaction": (
        crypto_service.check_tx,
        "Check the status of a blockchain transaction. Returns {status, block?, explorer}."
    ),

    # Circle
    "mint_usdc": (
        circle_service.mint_usdc,
        "Mint USDC into a Circle account. Returns {status, action:'mint', amount, currency, circle_tx_id or circle_response, balance?, note}."
    ),
    "redeem_usdc": (
        circle_service.redeem_usdc,
        "Redeem USDC back into fiat via Circle. Returns {status, action:'redeem', amount, currency, circle_tx_id or circle_response, balance?, note}."
    ),
    "get_circle_balances": (
        circle_service.get_circle_balances,
        "Get Circle account balances. Returns {balances:[{currency, amount}], mode, note}."
    ),

    # Subscriptions
    "subscriptions": (
        subscriptions_service.get_subscription_status,
        "Return all current subscriptions (plan, status, renewal date). Always use for subscription queries."
    ),
    "get_subscriptions": (subscriptions_service.get_subscription_status, "Alias"),
    "what_subscriptions_do_i_have": (subscriptions_service.get_subscription_status, "Alias"),
    "list_active_subscriptions": (subscriptions_service.get_subscription_status, "Alias"),
    "subscription_status": (subscriptions_service.get_subscription_status, "Alias"),

    "pause_subscription": (subscriptions_service.pause_subscription, "Pause sub"),
    "resume_subscription": (subscriptions_service.resume_subscription, "Resume sub"),
    "cancel_subscription": (subscriptions_service.cancel_subscription, "Cancel sub"),

    # Alerts
    "check_alerts": (
        alert_watcher.get_recent_alerts,
        "Get recent enriched alerts across crypto, Circle, and subscriptions."
    ),
    "trigger_demo_event": (
        alert_service.trigger_demo_event,
        "Trigger a demo alert manually. Options: wallet_low, market_drop, subscription_expired, failed_tx, crypto_to_fiat, circle_low."
    ),
}

# --- Build Portia client ---
cfg = default_config()
finance_agent = Portia(
    config=cfg,
    tools={name: func for name, (func, _) in TOOLS.items()},
)

print("✅ Portia client initialized with tools:")
for name, (_, desc) in TOOLS.items():
    print(f"   • {name} — {desc}")


def run_agent(prompt: str, timeout: int = 20) -> Dict[str, Any]:
    """Run Portia agent with timeout + advisory output for demo clarity"""
    print(f"🤖 Portia prompt → {prompt}")
    with concurrent.futures.ThreadPoolExecutor() as executor:
        future = executor.submit(finance_agent.run, prompt)
        try:
            result = future.result(timeout=timeout)

            # Normalize
            if hasattr(result, "model_dump"):
                result = result.model_dump()

            recommendations = result.get("recommendations", [])
            summary = result.get("summary", "")

            if not summary and recommendations:
                summary = "⚠️ Suggested actions: " + ", ".join(
                    [r.split("—")[0].strip() for r in recommendations]
                )

            result["advisor_output"] = {
                "recommendations": recommendations,
                "summary": summary,
            }

            if recommendations:
                print("💡 Advisor-style reasoning:")
                for i, rec in enumerate(recommendations, start=1):
                    print(f"   {i}. {rec}")
            if summary:
                print(f"📝 Summary: {summary}")

            return result

        except concurrent.futures.TimeoutError:
            print("⏳ Portia run timed out")
            return {
                "error": "Portia run timed out",
                "advisor_output": {"recommendations": [], "summary": "⚠️ Agent timed out."},
            }
        except Exception as e:
            print(f"❌ Portia run failed: {e}")
            return {
                "error": str(e),
                "advisor_output": {"recommendations": [], "summary": f"⚠️ Agent error: {e}"},
            }


# --- Local demo alerts for hackathon presentation ---
def trigger_demo_event(event_type: str) -> Dict[str, Any]:
    """Manually trigger demo alerts (for live presentations)."""

    demo_alerts = {
        "wallet_low": {
            "id": 999,
            "level": "warning",
            "type": "crypto",
            "message": "Demo wallet USDC low (balance = 8)",
            "context": {"wallet": "0xDEMO123", "usdc": 8},
            "recommendations": ["Top up USDC from Treasury — ensure balance >= 100"],
        },
        "market_drop": {
            "id": 1000,
            "level": "error",
            "type": "crypto",
            "message": "Ethereum price dropped -10% in the last hour",
            "context": {"symbol": "ETH", "drop_pct": -10},
            "recommendations": ["Sell partial ETH position — limit further downside"],
        },
        "subscription_expired": {
            "id": 1001,
            "level": "warning",
            "type": "subscription",
            "message": "User1 subscription expiring soon (2025-09-01)",
            "context": {"user": "user1", "renews_on": "2025-09-01"},
            "recommendations": ["Renew subscription now — avoid service interruption"],
        },
        "failed_tx": {
            "id": 1002,
            "level": "error",
            "type": "crypto",
            "message": "Transaction failed due to insufficient gas",
            "context": {"tx_hash": "0xFAILED123"},
            "recommendations": ["Re-submit transaction with higher gas fee"],
        },
        "crypto_to_fiat": {
            "id": 1003,
            "level": "info",
            "type": "circle",
            "message": "Convert 100 USDC to fiat (PayPal transfer)",
            "context": {"amount": 100, "currency": "USDC", "destination": "PayPal"},
            "recommendations": ["Execute transfer to PayPal — confirm receipt"],
        },
        "circle_low": {
            "id": 1004,
            "level": "warning",
            "type": "circle",
            "message": "Circle USD balance low (balance = 40)",
            "context": {"balance": {"currency": "USD", "amount": 40}},
            "recommendations": ["Add funds to Circle account — maintain buffer > $500"],
        },
    }

    if event_type not in demo_alerts:
        return {"error": f"Unknown demo event type: {event_type}"}

    alert = demo_alerts[event_type]
    alert["summary"] = f"⚠️ {alert['message']} Suggested actions: " + ", ".join(
        alert["recommendations"]
    )
    alert["advisor_output"] = {
        "recommendations": alert["recommendations"],
        "summary": alert["summary"],
    }
    return alert
