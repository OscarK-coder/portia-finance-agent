import os
import concurrent.futures
from dotenv import load_dotenv
from typing import Dict, Any

from portia import Portia, default_config

# --- Load env ---
load_dotenv()
PORTIA_API_KEY = os.getenv("PORTIA_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not PORTIA_API_KEY:
    raise RuntimeError("❌ Missing PORTIA_API_KEY in .env")
if not OPENAI_API_KEY:
    raise RuntimeError("❌ Missing OPENAI_API_KEY in .env")

# --- Import backend services (SAFE IMPORT STYLE) ---
import backend.services.crypto_service as crypto_service
import backend.services.alert_watcher as alert_watcher
import backend.services.alert_service as alert_service

# --- Tool registry ---
TOOLS = {
    # Crypto
    "get_crypto_price": (
        crypto_service.get_price,
        "Get the latest price of a cryptocurrency."
    ),
    "get_wallet_balance": (
        crypto_service.get_balance,
        "Check the wallet balance of a given address."
    ),
    "check_transaction": (
        crypto_service.check_tx,
        "Check the status of a blockchain transaction."
    ),

    # Alerts
    "check_alerts": (
        alert_watcher.get_recent_alerts,
        "Fetch recent alerts across crypto and subscriptions."
    ),
    "trigger_demo_event": (
        alert_service.trigger_demo_event,
        "Trigger a demo alert (wallet_low, market_drop, subscription_expired, failed_tx)."
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
    """Run Portia agent with fast-dispatcher first, fallback to LLM agent"""
    print(f"🤖 Portia prompt → {prompt}")
    lower = prompt.lower().strip()

    # --- FAST DISPATCHER ---
    try:
        # 1. ETH price
        if "price" in lower and "eth" in lower:
            print("⚡ Fast-dispatcher hit: ETH price")
            return crypto_service.get_price("ETH")

        # 2. Wallet balances
        if "wallet" in lower or "balance" in lower:
            print("⚡ Fast-dispatcher hit: wallet balances")
            demo = crypto_service.get_balance(os.getenv("DEMO_WALLET_ADDRESS", ""))
            judge = crypto_service.get_balance(os.getenv("JUDGE_WALLET_ADDRESS", ""))
            return {"demo_wallet": demo, "judge_wallet": judge}

        # 3. Subscriptions
        if "subscription" in lower or "plan" in lower:
            print("⚡ Fast-dispatcher hit: subscriptions")
            try:
                from backend.services.subscriptions_service import get_subscriptions
                return {"subs": get_subscriptions()}
            except Exception:
                return {
                    "subs": [
                        {"plan": "Netflix", "status": "active", "renews_on": "2025-09-10"},
                        {"plan": "Spotify", "status": "paused", "renews_on": "2025-09-15"},
                    ]
                }

        # 4. Alerts
        if "alert" in lower or "risk" in lower:
            print("⚡ Fast-dispatcher hit: alerts")
            return {"alerts": alert_watcher.get_recent_alerts()}

        # 5. Transactions
        if "transaction" in lower or "tx" in lower:
            print("⚡ Fast-dispatcher hit: transaction check")
            tx_hash = "0xDEMOHASH123"
            return crypto_service.check_tx(tx_hash)

        # 6. Rescue plan
        if "rescue" in lower or "save" in lower:
            print("⚡ Fast-dispatcher hit: rescue plan")
            from backend.services import rescue_service
            return rescue_service.generate_rescue_plan("wallet compromised", user="demo")

    except Exception as e:
        print(f"⚠️ Fast-dispatcher failed: {e}")

    # --- FALLBACK: Portia LLM agent ---
    with concurrent.futures.ThreadPoolExecutor() as executor:
        future = executor.submit(finance_agent.run, prompt)
        try:
            result = future.result(timeout=timeout)

            # Normalize Pydantic model
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
