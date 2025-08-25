from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_subscription_active_user():
    response = client.get("/subscriptions/status/user1")
    assert response.status_code == 200
    data = response.json()
    assert data["active"] is True
    assert data["plan"] == "Pro"

def test_subscription_invalid_user():
    response = client.get("/subscriptions/status/unknown")
    assert response.status_code == 200
    data = response.json()
    assert "error" in data
