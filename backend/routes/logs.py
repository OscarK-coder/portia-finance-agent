# backend/routes/logs.py

from datetime import datetime
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from backend.services.log_service import get_logs, clear_logs, LogType, add_log

# ❌ remove prefix
router = APIRouter(tags=["logs"])

class LogEntryOut(BaseModel):
    id: int
    type: str
    message: str
    timestamp: str
    context: Optional[Dict[str, Any]] = None

class LogsResponse(BaseModel):
    logs: List[LogEntryOut]
    count: int

def _validate_types(type_: Optional[str], types: Optional[List[str]]) -> Optional[List[LogType]]:
    vals = [t.lower() for t in ([type_] if type_ else []) + (types or [])]
    if not vals: return None
    try:
        return [LogType(v) for v in vals]
    except Exception:
        raise HTTPException(422, detail="Invalid log type. Use: info, success, warning, error, action")

@router.get("/", response_model=LogsResponse)
def fetch_logs(limit: int = Query(50, ge=1, le=1000),
               type_: Optional[str] = Query(None, alias="type"),
               types: Optional[List[str]] = Query(None, alias="types"),
               since: Optional[str] = None):
    levels = _validate_types(type_, types)
    since_dt = None
    if since:
        try: since_dt = datetime.fromisoformat(since)
        except Exception: raise HTTPException(422, detail="Invalid 'since' timestamp")
    logs = get_logs(limit=limit, types=levels, since=since_dt)
    return LogsResponse(logs=logs, count=len(logs))

@router.delete("/")
def clear():
    try:
        clear_logs()
        add_log("action", "Audit logs cleared via API")
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
