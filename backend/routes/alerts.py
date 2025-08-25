# backend/routes/alerts.py

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from backend.services.alert_service import (
    get_alerts, check_alerts, clear_alerts, AlertLevel, trigger_demo_event,
)
from backend.services.alert_watcher import get_recent_alerts
from backend.services.log_service import add_log

# ❌ remove prefix
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

class CheckResult(BaseModel):
    generated: int

@router.get("/", response_model=AlertsResponse)
def fetch_alerts(limit: int = Query(20, ge=1, le=200), level: Optional[str] = None,
                 run_check: bool = True, pretty: bool = Query(False, description="If true, return advisor_output only")):
    if run_check:
        try:
            n = check_alerts()
            if n: add_log("info", f"Generated {n} alerts")
        except Exception as e:
            add_log("error", f"Alert check failed: {e}")

    lvl = None
    if level:
        if level.lower() not in {"info", "warning", "error"}:
            raise HTTPException(status_code=422, detail="Invalid level")
        lvl = AlertLevel(level.lower())

    data = get_alerts(limit=limit, level=lvl.value if lvl else None)

    if pretty:
        clean = [d.get("advisor_output", {"summary": d.get("summary", d.get("message"))}) for d in data]
        return {"alerts": clean, "count": len(clean)}

    return AlertsResponse(alerts=data, count=len(data))

@router.post("/check", response_model=CheckResult)
def trigger_check():
    try:
        n = check_alerts()
        add_log("action", f"Manual alert check: {n}")
        return CheckResult(generated=n)
    except Exception as e:
        add_log("error", f"Manual check failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/")
def reset_alerts():
    try:
        clear_alerts()
        add_log("action", "Alerts cleared")
        return {"ok": True}
    except Exception as e:
        add_log("error", f"Clear failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/recent")
def recent_alerts(limit: int = Query(10, ge=1, le=50), pretty: bool = Query(False)):
    alerts = get_recent_alerts(limit=limit)
    if pretty:
        clean = [a.get("advisor_output", {"summary": a.get("summary", a.get("message"))}) for a in alerts]
        return {"alerts": clean, "count": len(clean)}
    return {"alerts": alerts, "count": len(alerts)}

@router.post("/trigger")
def trigger_alert(event_type: str = Query(...), pretty: bool = Query(False)):
    res = trigger_demo_event(event_type)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    add_log("action", f"Demo event triggered: {event_type}")
    if pretty:
        return res.get("advisor_output", {"summary": res.get("summary", res.get("message"))})
    return res
