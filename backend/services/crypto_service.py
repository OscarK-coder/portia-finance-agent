import os, uuid
from typing import Dict, Any, Optional
from dotenv import load_dotenv
from web3 import Web3

# Try CoinGecko for live prices
try:
    from pycoingecko import CoinGeckoAPI
    _cg = CoinGeckoAPI()
except Exception:
    _cg = None

load_dotenv()

# Env
RPC_URL      = os.getenv("ALCHEMY_RPC_URL", "")
DEMO_WALLET  = os.getenv("DEMO_WALLET_ADDRESS", "0xDEMO1234567890")
DEMO_PK      = os.getenv("DEMO_WALLET_PRIVATE_KEY", "0xPRIVATEKEY")
JUDGE_WALLET = os.getenv("JUDGE_WALLET_ADDRESS", "0xJUDGE1234567890")
USDC_ADDR    = os.getenv("USDC_CONTRACT", "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238")

# Web3
w3 = Web3(Web3.HTTPProvider(RPC_URL)) if RPC_URL else None
CHAIN_OK = bool(w3 and w3.is_connected() and USDC_ADDR)

# Supported coins for pricing
_CG_IDS = {"BTC": "bitcoin", "ETH": "ethereum", "SOL": "solana", "DOGE": "dogecoin", "USDC": "usd-coin"}
_MOCK = {"BTC": 67000, "ETH": 3500, "SOL": 150, "DOGE": 0.2, "USDC": 1.0}

# ERC-20 minimal ABI
ERC20_ABI = [
    {
        "constant": False,
        "inputs": [
            {"name": "_to", "type": "address"},
            {"name": "_value", "type": "uint256"}
        ],
        "name": "transfer",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function",
    },
    {
        "constant": True,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function",
    },
]

EXPLORER = "https://sepolia.etherscan.io"

def _pseudo_tx() -> str:
    return "0x" + uuid.uuid4().hex * 2

def is_chain_enabled() -> bool:
    return CHAIN_OK

def get_price(symbol: str = "USDC") -> Optional[Dict[str, Any]]:
    """Return live price if possible, else mock."""
    sym = (symbol or "").upper()
    if not sym:
        return None

    if _cg and sym in _CG_IDS:
        try:
            data = _cg.get_price(ids=[_CG_IDS[sym]], vs_currencies=["usd"])
            price = data.get(_CG_IDS[sym], {}).get("usd")
            if price:
                return {"symbol": sym, "price": float(price), "currency": "USD"}
        except Exception as e:
            print(f"[crypto_service] CoinGecko error: {e}")

    if sym in _MOCK:
        return {"symbol": sym, "price": float(_MOCK[sym]), "currency": "USD"}
    return None

def get_balance(address: str = DEMO_WALLET) -> Dict[str, Any]:
    """Return ETH + USDC balances with explorer link."""
    if not address:
        return {"error": "address_required"}
    if not CHAIN_OK:
        return {
            "address": address,
            "usdc": 42.0,
            "eth": 0.123,
            "explorer": f"{EXPLORER}/address/{address}",
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
        return {"error": str(e)}

def transfer_usdc(receiver: str = JUDGE_WALLET, amount: float = 1.0) -> Dict[str, Any]:
    """Transfer USDC (real on Sepolia if chain wired)."""
    if not receiver:
        return {"error": "receiver_required"}
    if amount <= 0:
        return {"error": "amount must be >0"}
    if not CHAIN_OK:
        tx_hash = _pseudo_tx()
        return {
            "status": "submitted",
            "tx_hash": tx_hash,
            "explorer": f"{EXPLORER}/tx/{tx_hash}",
            "to": receiver,
            "amount": amount,
        }

    try:
        cs_receiver = Web3.to_checksum_address(receiver)
        contract = w3.eth.contract(address=Web3.to_checksum_address(USDC_ADDR), abi=ERC20_ABI)

        amt_wei = int(amount * (10 ** 6))  # USDC has 6 decimals

        tx = contract.functions.transfer(cs_receiver, amt_wei).build_transaction({
            "from": Web3.to_checksum_address(DEMO_WALLET),
            "nonce": w3.eth.get_transaction_count(DEMO_WALLET),
            "gas": 100000,
            "gasPrice": w3.eth.gas_price,
        })

        signed = w3.eth.account.sign_transaction(tx, private_key=DEMO_PK)
        tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)

        return {
            "status": "submitted",
            "tx_hash": tx_hash.hex(),
            "explorer": f"{EXPLORER}/tx/{tx_hash.hex()}",
            "to": receiver,
            "amount": amount,
        }
    except Exception as e:
        return {"error": str(e)}

def check_tx(tx_hash: str = None) -> Dict[str, Any]:
    """Check tx status with explorer link."""
    if not tx_hash:
        return {"error": "tx_hash_required"}
    if not CHAIN_OK:
        return {"status": "pending", "explorer": f"{EXPLORER}/tx/{tx_hash}"}

    try:
        r = w3.eth.get_transaction_receipt(tx_hash)
        if not r:
            return {"status": "pending", "explorer": f"{EXPLORER}/tx/{tx_hash}"}
        return {
            "status": "confirmed" if r.status == 1 else "failed",
            "block": r.blockNumber,
            "explorer": f"{EXPLORER}/tx/{tx_hash}",
        }
    except Exception as e:
        return {"error": str(e)}
