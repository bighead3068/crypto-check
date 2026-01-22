import requests
import json

url = "http://127.0.0.1:8000/api/analyze"
payload = {
    "symbol": "BTC",
    "price": 40000,
    "rsi": 25,
    "macd_signal": "bullish",
    "diff_percent": -12.5,
    "status": "Undervalued",
    "volume_ratio": 1.6
}

# Test Local Mode
payload["mode"] = "local"
print("Testing Local Mode...")
try:
    response = requests.post(url, json=payload)
    print(f"Status: {response.status_code}")
    print(f"Source: {response.json().get('source')}")
except Exception as e:
    print(f"Error: {e}")

# Test AI Mode
payload["mode"] = "ai"
print("\nTesting AI Mode...")
try:
    response = requests.post(url, json=payload)
    print(f"Status: {response.status_code}")
    print(f"Source: {response.json().get('source')}")
except Exception as e:
    print(f"Error: {e}")
