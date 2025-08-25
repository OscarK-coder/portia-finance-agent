# backend/routes/agent.py

import os, uuid, time, asyncio
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, Any, Dict

from backend.services.log_service import add_log
from backend.portia_client import run_agent

# ❌ no prefix here, just tags
router = APIRouter(tags=["Agent"])

AGENT_MODE = os.getenv("AGENT_MODE", "auto").lower()  # api | mock | auto
DEFAULT_TIMEOUT = 30  # seconds


def _agent_mode() -> str:
    if AGENT_MODE == "api":
        return "api"
    elif AGENT_MODE == "mock":
        return "mock"
    else:
        return "api" if os.getenv("PORTIA_API_KEY") else "mock"


class AgentQuery(BaseModel):
    query: str = Field(..., min_length=1, max_length=4000)
    user_id: Optional[str] = "user1"


class AgentResponse(BaseModel):
    response: Any
    session_id: str
    took_ms: int
    mode: str
    executed_tools: Optional[Any] = None
    debug: Optional[Dict[str, Any]] = None


def _call_agent_sync(prompt: str, debug: bool = False) -> Dict[str, Any]:
    if _agent_mode() == "mock":
        q = prompt.lower()
        now = time.strftime("%H:%M:%S")
        if "alert" in q:
            reply = {
                "id": int(time.time() * 1000),
                "type": "card",
                "variant": "alert",
                "title": "High Gas Fees",
                "description": "ETH gas fees are unusually high. Suggest waiting ~5 mins.",
            }
        elif "treasury" in q:
            reply = {
                "id": int(time.time() * 1000),
                "type": "card",
                "variant": "treasury",
                "title": "Treasury Snapshot",
                "description": "Total Treasury: $5,200 (USDC + ETH + Circle). Healthy reserves.",
            }
        elif "subscription" in q:
            reply = {
                "id": int(time.time() * 1000),
                "type": "card",
                "variant": "subscription",
                "title": "Subscriptions",
                "description": "Spotify Premium: Active • ChatGPT Plus: Paused",
            }
        else:
            reply = {
                "id": int(time.time() * 1000),
                "type": "info",
                "message": f"🤖 Portia: I’ve noted your query '{prompt}'. Here’s my recommendation...",
                "timestamp": now,
            }
        return {"response": reply, "executed_tools": [], "debug": {"mode": "mock", "query": prompt} if debug else None}

    # API mode
    result = run_agent(prompt, timeout=DEFAULT_TIMEOUT)
    if "error" in result:
        return {"response": result["error"], "executed_tools": [], "debug": None}

    executed_tools = []
    if isinstance(result, dict):
        steps = result.get("steps", [])
        for s in steps:
            executed_tools.append(s.get("tool_name") or s.get("action"))

        final_output = result.get("outputs", {}).get("final_output", {})
        reply = final_output.get("summary") or final_output.get("value") or result

        return {"response": reply, "executed_tools": executed_tools, "debug": result if debug else None}

    return {"response": str(result), "executed_tools": [], "debug": result if debug else None}


@router.get("/health")
async def health():
    return {"ok": True, "mode": _agent_mode()}


@router.post("/ask", response_model=AgentResponse)
async def ask_agent(payload: AgentQuery, debug: bool = Query(False, description="Return debug info?")):
    if not payload.query.strip():
        raise HTTPException(status_code=422, detail="Query must not be empty")

    session_id = uuid.uuid4().hex[:8]
    t0 = time.perf_counter()

    try:
        res = await asyncio.wait_for(
            asyncio.to_thread(_call_agent_sync, payload.query.strip(), debug),
            timeout=DEFAULT_TIMEOUT,
        )
        took_ms = int((time.perf_counter() - t0) * 1000)

        add_log("action", "Agent query", {
            "session": session_id,
            "mode": _agent_mode(),
            "user": payload.user_id,
            "query": payload.query,
            "executed_tools": res.get("executed_tools"),
        })

        return AgentResponse(
            response=res["response"],
            session_id=session_id,
            took_ms=took_ms,
            mode=_agent_mode(),
            executed_tools=res.get("executed_tools"),
            debug=res.get("debug"),
        )

    except asyncio.TimeoutError:
        add_log("error", "Agent timeout", {"session": session_id})
        raise HTTPException(status_code=504, detail="Agent timed out")
    except Exception as e:
        add_log("error", "Agent error", {"session": session_id, "err": str(e)})
        raise HTTPException(status_code=500, detail=str(e))
