# backend/routes/circle.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, validator
from typing import Any, Dict, List

from backend.services.circle_service import mint_usdc, redeem_usdc, get_circle_balances, is_api_enabled
from backend.services.log_service import add_log

# ❌ remove prefix here
router = APIRouter(tags=["circle"])

class AmountRequest(BaseModel):
    amount: float = Field(..., gt=0)
    address: str = Field(..., min_length=4)

    @validator("address")
    def check_addr(cls, v: str) -> str:
        if v.startswith("0x") and len(v) != 42:
            raise ValueError("Invalid Ethereum address length")
        return v

class CircleResult(BaseModel):
    ok: bool
    mode: str
    result: Any

class BalancesResponse(BaseModel):
    ok: bool
    mode: str
    balances: List[Dict[str, Any]]

def _mode() -> str:
    return "api" if is_api_enabled() else "mock"

def _normalize(raw: Any) -> List[Dict[str, Any]]:
    if isinstance(raw, dict):
        avail = (raw.get("data") or {}).get("available", [])
        return [{"currency": i.get("currency"), "amount": float(i.get("amount", 0))} for i in avail]
    if isinstance(raw, list):
        return [{"currency": i.get("currency"), "amount": float(i.get("amount", 0))} for i in raw]
    return [{"currency": "UNKNOWN", "amount": 0}]

@router.get("/health")
def health(): return {"ok": True, "mode": _mode()}

@router.post("/mint", response_model=CircleResult)
def mint(req: AmountRequest):
    try:
        res = mint_usdc(req.amount, req.address)
        add_log("action", "Circle mint", {"amount": req.amount, "to": req.address})
        return CircleResult(ok=True, mode=_mode(), result=res)
    except Exception as e:
        add_log("error", f"Circle mint failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/redeem", response_model=CircleResult)
def redeem(req: AmountRequest):
    try:
        res = redeem_usdc(req.amount, req.address)
        add_log("action", "Circle redeem", {"amount": req.amount, "from": req.address})
        return CircleResult(ok=True, mode=_mode(), result=res)
    except Exception as e:
        add_log("error", f"Circle redeem failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/balances", response_model=BalancesResponse)
def balances():
    try:
        return BalancesResponse(ok=True, mode=_mode(), balances=_normalize(get_circle_balances()))
    except Exception as e:
        add_log("error", f"Circle balances failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
