# backend/routes/stripe_demo.py
import subprocess, os
from fastapi import APIRouter, HTTPException

router = APIRouter(tags=["stripe-demo"])

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../scripts"))

@router.post("/reset")
def reset_demo():
    try:
        result = subprocess.run(
            ["node", os.path.join(BASE, "resetStripeDemo.js")],
            capture_output=True, text=True, check=True
        )
        return {"status": "ok", "output": result.stdout}
    except subprocess.CalledProcessError as e:
        raise HTTPException(500, f"Reset failed: {e.stderr}")

@router.post("/refund/{product}")
def refund_demo(product: str):
    try:
        result = subprocess.run(
            ["node", os.path.join(BASE, "refundStripeDemo.js"), product],
            capture_output=True, text=True, check=True
        )
        return {"status": "ok", "output": result.stdout}
    except subprocess.CalledProcessError as e:
        raise HTTPException(500, f"Refund failed: {e.stderr}")
