from fastapi import APIRouter, HTTPException
import httpx
import os, time, logging

router = APIRouter(tags=["prices"])

COINGECKO = "https://api.coingecko.com/api/v3/simple/price"
CACHE = {}
CACHE_TTL = 60  # seconds

MOCK_MODE = os.getenv("MOCK_PRICES", "false").lower() == "true"
logger = logging.getLogger(__name__)

@router.get("/{symbol}")
async def get_price(symbol: str):
    symbol = (symbol or "").lower()
    mapping = {"eth": "ethereum", "usdc": "usd-coin"}
    coin_id = mapping.get(symbol, symbol)
    now = time.time()

    # 🎭 Mock mode (fixed demo prices)
    if MOCK_MODE:
        mock_prices = {"eth": 2780.55, "usdc": 1.00}
        return {
            "symbol": symbol.upper(),
            "price": mock_prices.get(symbol, 100.0),
            "currency": "USD",
            "note": "mock price (MOCK_PRICES=true)"
        }

    # 💾 Cache
    if coin_id in CACHE:
        ts, data = CACHE[coin_id]
        if now - ts < CACHE_TTL:
            logger.info(f"💾 Serving {symbol.upper()} price from cache")
            return data

    # 🌍 Fetch from CoinGecko
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(COINGECKO, params={"ids": coin_id, "vs_currencies": "usd"})
            r.raise_for_status()
            data = r.json()
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 429:  # Too many requests
            logger.warning(f"⚠️ Rate-limited by CoinGecko for {symbol.upper()}")
            if coin_id in CACHE:
                _, cached = CACHE[coin_id]
                return {**cached, "note": "⚠️ stale cached value (CoinGecko 429)"}
            # fallback hardcoded
            return {
                "symbol": symbol.upper(),
                "price": 1800.0 if symbol == "eth" else 1.0,
                "currency": "USD",
                "note": "⚠️ demo fallback (CoinGecko 429)"
            }
        raise HTTPException(e.response.status_code, f"CoinGecko error: {e}")
    except Exception as e:
        logger.error(f"❌ Price fetch failed for {symbol.upper()}: {e}")
        if coin_id in CACHE:
            _, cached = CACHE[coin_id]
            return {**cached, "note": "⚠️ stale cached value (fetch error)"}
        # fallback demo
        return {
            "symbol": symbol.upper(),
            "price": 1800.0 if symbol == "eth" else 1.0,
            "currency": "USD",
            "note": "⚠️ demo fallback (fetch error)"
        }

    # ✅ Validate
    if coin_id not in data or "usd" not in data[coin_id]:
        raise HTTPException(404, f"Price for {symbol.upper()} not found")

    result = {
        "symbol": symbol.upper(),
        "price": data[coin_id]["usd"],
        "currency": "USD",
    }
    CACHE[coin_id] = (now, result)
    logger.info(f"✅ Updated {symbol.upper()} price: {result['price']}")
    return result
