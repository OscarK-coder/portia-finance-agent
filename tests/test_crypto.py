from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_crypto_btc_price():
    response = client.get("/crypto/price/BTC")
    assert response.status_code == 200
    data = response.json()
    assert data["symbol"] == "BTC"
    assert "price" in data

def test_crypto_invalid_symbol():
    response = client.get("/crypto/price/INVALID")
    assert response.status_code == 200
    data = response.json()
    assert "error" in data
