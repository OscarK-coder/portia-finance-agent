# backend/routes/alerts.py
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from backend.services.alert_service import (
    get_alerts, check_alerts, clear_alerts,
    AlertLevel, trigger_demo_event, resolve_alert
)
from backend.services.alert_watcher import get_recent_alerts
from backend.services.log_service import add_log

router = APIRouter(tags=["alerts"])

class AlertOut(BaseModel):
    id: int
    level: str
    type: Optional[str] = None
    message: str
    timestamp: Optional[str] = None
    context: Optional[Dict[str, Any]] = None
    recommendations: Optional[List[str]] = None
    plans: Optional[List[Dict[str, Any]]] = None
    summary: Optional[str] = None
    advisor_output: Optional[Dict[str, Any]] = None

class AlertsResponse(BaseModel):
    alerts: List[AlertOut]
    count: int

@router.get("/", response_model=AlertsResponse)
def fetch_alerts(limit: int = Query(20, ge=1, le=200), run_check: bool = False):
    try:
        data = get_alerts(limit=limit)
        if not data:
            # fallback demo alerts
            data = [
                {"id": 1, "level": "warning", "type": "crypto", "message": "Demo wallet USDC low"},
                {"id": 2, "level": "error", "type": "crypto", "message": "Ethereum price dropped 10%"},
            ]
        return AlertsResponse(alerts=data, count=len(data))
    except Exception:
        return AlertsResponse(alerts=[
            {"id": 999, "level": "info", "type": "demo", "message": "Demo alert active"}
        ], count=1)

@router.delete("/")
def reset_alerts():
    try:
        clear_alerts()
        add_log("action", "Alerts cleared")
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{alert_id}")
def resolve(alert_id: int):
    try:
        ok = resolve_alert(alert_id)
        if not ok:
            raise HTTPException(404, detail="Alert not found")
        return {"ok": True, "id": alert_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/trigger")
def trigger_alert(event_type: str = Query(...)):
    try:
        res = trigger_demo_event(event_type)
        if "error" in res:
            raise HTTPException(status_code=400, detail=res["error"])
        return res
    except Exception:
        return {"id": 1000, "level": "info", "message": f"Demo event: {event_type}"}
