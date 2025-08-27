# backend/routers/agent_router.py

from backend.services import alert_service, log_service

@router.post("/agent/ask")
async def ask_agent(req: AskRequest):
    query = req.query.lower()
    start = time.time()

    try:
        raise TimeoutError("simulate")  # force demo
    except Exception:
        # Pick demo response
        if "wallet" in query or "usdc" in query:
            response = {
                "type": "card",
                "variant": "alert",
                "title": "Demo Wallet USDC Low",
                "description": "Your demo wallet balance is under 10 USDC. Suggest topping up to avoid failed payments.",
                "actions": [
                    { "label": "Top up 50 USDC from Treasury", "tool": "mintUSDC", "args": { "amount": 50 } },
                    { "label": "Pause Spotify", "tool": "pauseSubscription", "args": { "id": "spotify" } },
                ],
            }
        elif "netflix" in query:
            response = {
                "type": "card",
                "variant": "subscription",
                "title": "Netflix not used recently",
                "description": "Detected inactivity. Canceling or pausing could save money.",
                "actions": [
                    { "label": "Pause Netflix", "tool": "pauseSubscription", "args": { "id": "netflix" } },
                    { "label": "Cancel Netflix", "tool": "cancelSubscription", "args": { "id": "netflix" } },
                ],
            }
        else:
            response = {
                "type": "card",
                "variant": "info",
                "title": "Demo Recommendation",
                "description": f"Demo fallback for query: {req.query}",
                "actions": [{ "label": "Skip", "tool": "noop" }],
            }

        # ✅ Log query + suggestion
        await log_service.push_log("action", f"Agent handled query: {req.query}")
        await log_service.push_log("info", f"Recommendation: {response['description']}")

        # ✅ Resolve matching alerts
        alerts = await alert_service.get_alerts()
        for alert in alerts:
            if alert.message.lower().startswith(req.query.lower().split()[0]):
                await alert_service.resolve_alert(alert.id)
                await log_service.push_log("success", f"Resolved alert: {alert.message}")

        return {
            "response": response,
            "session_id": "demo",
            "took_ms": int((time.time() - start) * 1000),
            "mode": "demo"
        }
