# backend/services/log_service.py
from __future__ import annotations
import json, os, threading
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Union

LOG_FILE = Path(os.getenv("AUDIT_LOG_FILE", Path(__file__).resolve().parents[2] / "audit_logs.json"))
LOG_MAX_ENTRIES = int(os.getenv("LOG_MAX_ENTRIES", "1000"))

class LogType(str, Enum):
    INFO="info"; SUCCESS="success"; WARNING="warning"; ERROR="error"; ACTION="action"

LogEntry = Dict[str, object]
_logs: List[LogEntry] = []
_next_id, _lock = 1, threading.RLock()

def _now() -> str: return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

def _save():
    try:
        LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        tmp = LOG_FILE.with_suffix(".tmp")
        with tmp.open("w", encoding="utf-8") as f: json.dump(_logs, f, indent=2)
        tmp.replace(LOG_FILE)
    except Exception as e: print(f"❌ Failed to save logs: {e}")

def load_logs():
    global _logs, _next_id
    try:
        if LOG_FILE.exists(): _logs = json.loads(LOG_FILE.read_text())
    except: _logs = []
    _next_id = (max((e.get("id",0) for e in _logs), default=0) + 1) if _logs else 1

def add_log(t: Union[str,LogType], msg: str, ctx: Optional[dict]=None) -> LogEntry:
    global _next_id
    lvl = LogType(str(t).lower()) if not isinstance(t, LogType) else t
    entry = {"id": _next_id, "type": lvl.value, "message": msg, "timestamp": _now(), **({"context":ctx} if ctx else {})}
    with _lock:
        _logs.append(entry); _next_id += 1
        if len(_logs) > LOG_MAX_ENTRIES: _logs[:] = _logs[-LOG_MAX_ENTRIES:]
        _save()
    return entry

def get_logs(limit:int=50, types:Optional[Sequence[Union[str,LogType]]]=None, since:Optional[datetime]=None) -> List[LogEntry]:
    with _lock: logs=list(_logs)
    if types: 
        want={LogType(str(t).lower()).value if not isinstance(t,LogType) else t.value for t in types}
        logs=[e for e in logs if e.get("type") in want]
    if since:
        logs=[e for e in logs if datetime.strptime(e["timestamp"], "%Y-%m-%d %H:%M:%S")>since]
    return logs[-limit:]

def clear_logs(): 
    global _logs,_next_id
    with _lock: _logs, _next_id=[],1; _save()

# Convenience
def log_info(msg:str,ctx:dict=None): return add_log(LogType.INFO,msg,ctx)
def log_success(msg:str,ctx:dict=None): return add_log(LogType.SUCCESS,msg,ctx)
def log_warning(msg:str,ctx:dict=None): return add_log(LogType.WARNING,msg,ctx)
def log_error(msg:str,ctx:dict=None): return add_log(LogType.ERROR,msg,ctx)
def log_action(msg:str,ctx:dict=None): return add_log(LogType.ACTION,msg,ctx)

load_logs()
