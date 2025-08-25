# backend/main.py

import os
import asyncio
from datetime import datetime
from pathlib import Path
from typing import List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi_utils.tasks import repeat_every
from dotenv import load_dotenv

# Services
from backend.services.alert_service import check_alerts
from backend.services.log_service import add_log

# Routers
from backend.routes.agent import router as agent_router
from backend.routes.alerts import router as alerts_router
from backend.routes.circle import router as circle_router
from backend.routes.crypto import router as crypto_router
from backend.routes.logs import router as logs_router
from backend.routes.rescue import router as rescue_router
from backend.routes.subscriptions import router as subs_router
from backend.routes.users import router as users_router

# --- Suppress asyncio CancelledError spam ---
def _ignore_cancelled_error(loop, context):
    exc = context.get("exception")
    if isinstance(exc, asyncio.CancelledError):
        return
    loop.default_exception_handler(context)

asyncio.get_event_loop().set_exception_handler(_ignore_cancelled_error)

# Load env
ENV_PATH = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=str(ENV_PATH))


def _get_origins() -> List[str]:
    raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").strip()
    return ["*"] if raw == "*" else [o.strip() for o in raw.split(",") if o.strip()]


app = FastAPI(
    title=os.getenv("APP_TITLE", "Finance Agent Backend"),
    version=os.getenv("APP_VERSION", "0.1.0"),
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=_get_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root + health
@app.get("/")
def root():
    return {"message": "Finance Agent Backend 🚀", "time": datetime.utcnow().isoformat()}

@app.get("/health")
def health_check():
    return {"status": "ok", "time": datetime.utcnow().isoformat()}

@app.get("/portia-check")
def portia_check():
    openai_key = os.getenv("OPENAI_API_KEY")
    portia_key = os.getenv("PORTIA_API_KEY")
    return {
        "OPENAI_API_KEY": "✅ Loaded" if openai_key else "❌ Missing",
        "PORTIA_API_KEY": "✅ Loaded" if portia_key else "❌ Missing",
    }

# Routers with clean prefixes
app.include_router(agent_router, prefix="/api/agent")
app.include_router(alerts_router, prefix="/api/alerts")
app.include_router(circle_router, prefix="/api/circle")
app.include_router(crypto_router, prefix="/api/crypto")
app.include_router(logs_router, prefix="/api/logs")
app.include_router(rescue_router, prefix="/api/rescue")
app.include_router(subs_router, prefix="/api/subscriptions")
app.include_router(users_router, prefix="/api/users")

# Background tasks
@app.on_event("startup")
@repeat_every(seconds=30, wait_first=False, raise_exceptions=False)
def background_alert_checker():
    try:
        add_log("info", "🔄 Running periodic alert check")
        n = check_alerts()
        if n:
            add_log("success", f"✅ Generated {n} alerts automatically")
    except Exception as e:
        add_log("error", f"Periodic alert check failed: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("RELOAD", "true").lower() == "true",
    )
