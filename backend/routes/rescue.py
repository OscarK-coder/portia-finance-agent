from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
from backend.services.log_service import add_log
from backend.services.rescue_service import (
    generate_rescue_plan, get_rescue_plans,
    approve_plan, cancel_plan, execute_plan, clear_plans
)

router = APIRouter(tags=["rescue"])

_ALLOWED_STATUSES = {"pending", "approved", "executing", "succeeded", "failed", "cancelled"}


class StepOut(BaseModel):
    id: str
    action: str
    params: Dict[str, Any] = {}
    status: str
    result: Optional[Any] = None


class PlanOut(BaseModel):
    id: str
    event: str
    description: str
    steps: List[StepOut]
    requires_approval: bool
    status: str
    created_at: str
    user: Optional[str] = None


class PlansResponse(BaseModel):
    plans: List[PlanOut]
    count: int


class ActionResponse(BaseModel):
    ok: bool
    plan: PlanOut


class CreatePlanRequest(BaseModel):
    event: str = Field(..., min_length=3)
    user: Optional[str] = "user1"   # ✅ renamed from user_id → user


@router.get("/health")
def health():
    return {"ok": True, "count": len(get_rescue_plans(limit=1))}


@router.post("/generate", response_model=PlanOut)
def create_plan(payload: CreatePlanRequest):
    # ✅ use correct parameter name
    plan = generate_rescue_plan(payload.event, user=payload.user or "user1")
    if not plan:
        raise HTTPException(404, "No rescue plan available")
    add_log("warning", "Rescue plan generated", {"event": payload.event})
    return plan  # type: ignore


@router.get("/", response_model=PlansResponse)
def list_plans(limit: int = Query(50, ge=1, le=1000), status: Optional[str] = None):
    if status and status.lower() not in _ALLOWED_STATUSES:
        raise HTTPException(422, f"Invalid status. Use: {', '.join(sorted(_ALLOWED_STATUSES))}")
    plans = get_rescue_plans(limit=limit, status=status.lower() if status else None)
    return PlansResponse(plans=plans, count=len(plans))


def _act(fn, pid: str, log_msg: str):
    plan = fn(pid)
    if not plan:
        raise HTTPException(404, "Plan not found")
    add_log("action", f"{log_msg}: {pid}")
    return ActionResponse(ok=True, plan=plan)  # type: ignore


@router.post("/{plan_id}/approve", response_model=ActionResponse)
def approve(plan_id: str):
    return _act(approve_plan, plan_id, "Plan approved")


@router.post("/{plan_id}/cancel", response_model=ActionResponse)
def cancel(plan_id: str):
    return _act(cancel_plan, plan_id, "Plan cancelled")


@router.post("/{plan_id}/execute", response_model=ActionResponse)
def execute(plan_id: str):
    try:
        return _act(execute_plan, plan_id, "Plan executed")
    except ValueError as e:
        raise HTTPException(422, str(e))


@router.delete("/")
def clear():
    clear_plans()
    add_log("action", "All rescue plans cleared")
    return {"ok": True}
