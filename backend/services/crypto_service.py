import os, uuid, time
from typing import Dict, Any, Optional
from dotenv import load_dotenv
from web3 import Web3
import logging

from backend.services import alert_service, log_service

# --- Env ---
load_dotenv()
RPC_URL      = os.getenv("ALCHEMY_RPC_URL", "")
DEMO_WALLET  = os.getenv("DEMO_WALLET_ADDRESS", "0xDEMO1234567890")
DEMO_PK      = os.getenv("DEMO_WALLET_PRIVATE_KEY", "0xPRIVATEKEY")
JUDGE_WALLET = os.getenv("JUDGE_WALLET_ADDRESS", "0xJUDGE1234567890")
USDC_ADDR    = os.getenv("USDC_CONTRACT", "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238")

# --- Web3 ---
w3 = Web3(Web3.HTTPProvider(RPC_URL)) if RPC_URL else None
CHAIN_OK = bool(w3 and w3.is_connected() and USDC_ADDR)

EXPLORER = "https://sepolia.etherscan.io"

# --- Logger ---
logger = logging.getLogger(__name__)

# --- CoinGecko ---
try:
    from pycoingecko import CoinGeckoAPI
    _cg = CoinGeckoAPI()
except Exception:
    _cg = None

_CG_IDS = {"BTC": "bitcoin", "ETH": "ethereum", "SOL": "solana", "DOGE": "dogecoin", "USDC": "usd-coin"}
_MOCK = {"BTC": 67000, "ETH": 3500, "SOL": 150, "DOGE": 0.2, "USDC": 1.0}

# --- ERC-20 ABI ---
ERC20_ABI = [
    {"constant": False,"inputs": [{"name": "_to", "type": "address"},{"name": "_value", "type": "uint256"}],
     "name": "transfer","outputs": [{"name": "", "type": "bool"}],"type": "function"},
    {"constant": True,"inputs": [{"name": "_owner", "type": "address"}],
     "name": "balanceOf","outputs": [{"name": "balance", "type": "uint256"}],"type": "function"},
]

# --- Helpers ---
def _pseudo_tx() -> str: 
    return "0x" + uuid.uuid4().hex * 2

def is_chain_enabled() -> bool: 
    return CHAIN_OK


# --- Prices ---
def get_price(symbol: str = "USDC") -> Optional[Dict[str, Any]]:
    """Fetch price from CoinGecko with fallback to mock."""
    sym = (symbol or "").upper()

    if _cg and sym in _CG_IDS:
        try:
            data = _cg.get_price(ids=[_CG_IDS[sym]], vs_currencies=["usd"])
            price = data.get(_CG_IDS[sym], {}).get("usd")
            if price:
                return {"symbol": sym, "price": float(price), "currency": "USD"}
        except Exception as e:
            logger.warning(f"[crypto_service] CoinGecko error for {sym}: {e}")

    # fallback mock
    if sym in _MOCK:
        return {"symbol": sym, "price": float(_MOCK[sym]), "currency": "USD", "note": "mock fallback"}
    return None


# --- Balances ---
def get_balance(address: str = DEMO_WALLET) -> Dict[str, Any]:
    """Fetch ETH + USDC balance. Always falls back to mock on error."""
    if not address:
        return {"error": "address_required"}

    # No chain? Always return demo
    if not CHAIN_OK:
        return {
            "address": address,
            "usdc": 42.0,
            "eth": 0.123,
            "explorer": f"{EXPLORER}/address/{address}",
            "note": "[MOCK] no chain connection"
        }

    try:
        cs = Web3.to_checksum_address(address)
        eth = float(w3.eth.get_balance(cs)) / 1e18

        contract = w3.eth.contract(address=Web3.to_checksum_address(USDC_ADDR), abi=ERC20_ABI)
        usdc_raw = contract.functions.balanceOf(cs).call()
        usdc = usdc_raw / (10 ** 6)

        return {
            "address": address,
            "usdc": round(usdc, 6),
            "eth": round(eth, 6),
            "explorer": f"{EXPLORER}/address/{address}",
        }
    except Exception as e:
        logger.warning(f"[crypto_service] Balance fetch error for {address}: {e}")
        return {
            "address": address,
            "usdc": 50.0,
            "eth": 0.25,
            "explorer": f"{EXPLORER}/address/{address}",
            "note": f"[MOCK] fallback due to error: {e}"
        }


# --- Transactions ---
def check_tx(tx_hash: str) -> Dict[str, Any]:
    """Check transaction status on-chain or return mock confirmation"""
    if not tx_hash:
        return {"error": "tx_hash required"}

    if not CHAIN_OK:
        # Mock fallback
        return {"tx_hash": tx_hash, "status": "confirmed", "mode": "mock"}

    try:
        receipt = w3.eth.get_transaction_receipt(tx_hash)
        if receipt is None:
            return {"tx_hash": tx_hash, "status": "pending", "mode": "api"}
        status = "confirmed" if receipt.status == 1 else "failed"
        return {
            "tx_hash": tx_hash,
            "status": status,
            "blockNumber": receipt.blockNumber,
            "mode": "api"
        }
    except Exception as e:
        logger.warning(f"[crypto_service] TX check error {tx_hash}: {e}")
        return {
            "tx_hash": tx_hash,
            "status": "error",
            "error": str(e),
            "mode": "api"
        }
