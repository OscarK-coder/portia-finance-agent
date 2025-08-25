# backend/routes/crypto.py

from fastapi import APIRouter, HTTPException, Query
from backend.services.crypto_service import (
    get_price, get_balance, transfer_usdc, check_tx, is_chain_enabled,
    DEMO_WALLET, JUDGE_WALLET
)

try:
    from backend.portia_client import run_agent as _run_agent
except Exception:
    _run_agent = None

EXPLORER = "https://sepolia.etherscan.io"

# ❌ no prefix here, just tags
router = APIRouter(tags=["crypto"])

@router.get("/health")
def health():
    return {"ok": True, "mode": "api" if is_chain_enabled() else "mock"}

@router.get("/price")
def price(symbol: str = Query("USDC")):
    res = get_price(symbol)
    if not res:
        return {"error": f"Symbol {symbol} not found"}
    return res

@router.get("/wallet/balance")   # ✅ match frontend api.ts
def balance(address: str = Query(DEMO_WALLET)):
    return get_balance(address)

@router.post("/transfer")
def transfer(receiver: str = Query(JUDGE_WALLET), amount: float = Query(1.0)):
    res = transfer_usdc(receiver, amount)
    if "error" in res:
        raise HTTPException(422, res["error"])
    return res

@router.post("/check_tx")
def check(tx_hash: str = Query("0xDEMOHASH")):
    return check_tx(tx_hash)

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
