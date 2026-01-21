import requests

try:
    response = requests.get("https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=5", timeout=5)
    print(f"Status: {response.status_code}")
    print(f"Data: {response.text[:100]}...")
except Exception as e:
    print(f"Error: {e}")
