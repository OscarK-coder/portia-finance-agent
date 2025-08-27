from fastapi import APIRouter, HTTPException, Query
from backend.services.crypto_service import (
    get_price, get_balance, check_tx, is_chain_enabled,
    DEMO_WALLET, JUDGE_WALLET, EXPLORER
)

try:
    from backend.portia_client import run_agent as _run_agent
except Exception:
    _run_agent = None

router = APIRouter(tags=["crypto"])


@router.get("/health")
def health():
    return {"ok": True, "mode": "api" if is_chain_enabled() else "mock"}


@router.get("/price")
def price(symbol: str = Query("USDC")):
    try:
        res = get_price(symbol)
        if not res:
            raise ValueError("no result")
        return res
    except Exception:
        # fallback demo price
        return {"symbol": symbol, "price": 4425.12, "currency": "USD"}


@router.get("/wallet/balance")
def balance(address: str = Query(DEMO_WALLET)):
    try:
        return get_balance(address)
    except Exception:
        # fallback demo balance
        return {
            "address": address,
            "usdc": 120.0,
            "eth": 0.42,
            "explorer": f"{EXPLORER}/address/{address}"
        }


@router.post("/transfer")
def transfer(
    receiver: str = Query(JUDGE_WALLET),
    amount: float = Query(1.0),
    sender: str = Query(DEMO_WALLET),
):
    """
    Simulated transfer endpoint.
    Circle integration removed — now returns a fake tx hash.
    """
    try:
        # If later you implement actual transfers, replace this block
        return {
            "status": "ok",
            "tx_hash": "0xDEMOHASH123",
            "explorer": f"{EXPLORER}/tx/0xDEMOHASH123",
            "from": sender,
            "to": receiver,
            "amount": amount
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/check_tx")
def check(tx_hash: str = Query("0xDEMOHASH")):
    try:
        return check_tx(tx_hash)
    except Exception:
        # fallback demo response
        return {"tx_hash": tx_hash, "status": "confirmed"}


@router.get("/ask-agent")
def ask_agent(query: str = Query(..., min_length=1)):
    if not _run_agent:
        return {"ok": True, "agent_available": False, "response": "[MOCK] Agent disabled"}
    try:
        result = _run_agent(query)
        if hasattr(result, "model_dump"):
            result = result.model_dump()
        if isinstance(result, dict):
            if "tx_hash" in result and isinstance(result["tx_hash"], str):
                result["explorer"] = f"{EXPLORER}/tx/{result['tx_hash']}"
            if "address" in result and isinstance(result["address"], str):
                result["address_explorer"] = f"{EXPLORER}/address/{result['address']}"
        return result
    except Exception as e:
        raise HTTPException(500, str(e))
