# backend/services/circle_service.py
from __future__ import annotations
import os, uuid, threading, requests
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv
from backend.services.log_service import add_log

load_dotenv()

CIRCLE_API_KEY = os.getenv("CIRCLE_API_KEY")
CIRCLE_BASE_URL = os.getenv("CIRCLE_BASE_URL", "https://api-sandbox.circle.com/v1")
CIRCLE_BLOCKCHAIN = os.getenv("CIRCLE_BLOCKCHAIN", "ETH-SEPOLIA")
CIRCLE_MODE = (os.getenv("CIRCLE_MODE", "auto") or "auto").lower()
_USE_API = (CIRCLE_MODE in ("api", "auto")) and bool(CIRCLE_API_KEY)
_TIMEOUT = float(os.getenv("CIRCLE_TIMEOUT_SECS", "20"))

_HEADERS = {
    "Authorization": f"Bearer {CIRCLE_API_KEY}" if CIRCLE_API_KEY else "",
    "Content-Type": "application/json",
}

# Simple mock balance (thread-safe)
_lock = threading.Lock()
_mock_usd: float = 100.0

def is_api_enabled() -> bool:
    return _USE_API

def _idem(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12]}"

def _pseudo_id(prefix: str) -> str:
    """Generate a fake Circle transaction id for demo purposes."""
    return f"{prefix}-{uuid.uuid4().hex[:8]}"

def _req(method: str, path: str, json: Optional[dict] = None) -> Dict[str, Any]:
    url = f"{CIRCLE_BASE_URL.rstrip('/')}/{path.lstrip('/')}"
    try:
        r = requests.request(method, url, headers=_HEADERS, json=json, timeout=_TIMEOUT)
        r.raise_for_status()
        add_log("info", f"Circle {method} {path} OK")
        return r.json()
    except Exception as e:
        add_log("error", f"Circle {method} {path} failed: {e}")
        return {"error": str(e)}

def mint_usdc(amount: float, address: str) -> Dict[str, Any]:
    if not amount or amount <= 0:
        raise ValueError("Amount > 0 required")
    if not address:
        raise ValueError("Address required")

    if _USE_API:
        body = {
            "idempotencyKey": _idem("mint"),
            "amount": {"amount": str(amount), "currency": "USD"},
            "blockchain": CIRCLE_BLOCKCHAIN,
            "destinationAddress": address,
        }
        res = _req("POST", "/stablecoins/mint", body)
        if "error" not in res:
            add_log("success", f"Circle mint {amount} USD -> {address}")
        return {
            "status": "submitted",
            "action": "mint",
            "amount": amount,
            "currency": "USDC",
            "circle_response": res,
        }

    # Mock mode
    global _mock_usd
    with _lock:
        _mock_usd += amount
    add_log("success", f"[MOCK] Minted {amount} USDC. USD={_mock_usd}")
    return {
        "status": "submitted",
        "action": "mint",
        "amount": amount,
        "currency": "USDC",
        "circle_tx_id": _pseudo_id("mint"),
        "balance": _mock_usd,
        "note": "Mock Circle mint",
    }

def redeem_usdc(amount: float, address: str) -> Dict[str, Any]:
    if not amount or amount <= 0:
        raise ValueError("Amount > 0 required")
    if not address:
        raise ValueError("Address required")

    if _USE_API:
        body = {
            "idempotencyKey": _idem("redeem"),
            "amount": {"amount": str(amount), "currency": "USD"},
            "blockchain": CIRCLE_BLOCKCHAIN,
            "sourceAddress": address,
        }
        res = _req("POST", "/stablecoins/redeem", body)
        if "error" not in res:
            add_log("success", f"Circle redeem {amount} USD from {address}")
        return {
            "status": "submitted",
            "action": "redeem",
            "amount": amount,
            "currency": "USDC",
            "circle_response": res,
        }

    # Mock mode
    global _mock_usd
    with _lock:
        if amount > _mock_usd:
            raise ValueError("Insufficient Circle balance")
        _mock_usd -= amount
    add_log("success", f"[MOCK] Redeemed {amount} USDC. USD={_mock_usd}")
    return {
        "status": "submitted",
        "action": "redeem",
        "amount": amount,
        "currency": "USDC",
        "circle_tx_id": _pseudo_id("redeem"),
        "balance": _mock_usd,
        "note": "Mock Circle redeem",
    }

def get_circle_balances() -> Dict[str, Any]:
    if _USE_API:
        res = _req("GET", "/balances")
        return {"balances": res.get("data", []), "mode": "api"}
    return {
        "balances": [
            {"currency": "USD", "amount": _mock_usd},
            {"currency": "USDC", "amount": _mock_usd},  # mirror for demo clarity
        ],
        "mode": "mock",
        "note": "Mock Circle account balances",
    }
