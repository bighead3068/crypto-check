from main import fetch_from_coincap, get_historical_data
import ccxt

# Setup: Force CCXT to fail by giving it a bad timeout or invalid config if possible, 
# or just test fetch_from_coincap directly first.

print("Testing direct CoinCap fetch...")
data = fetch_from_coincap("BTC")
print(f"CoinCap BTC Data: {len(data)} records")
if data:
    print(f"Sample: {data[0]}")

print("\nTesting Fallback Logic...")
# We can't easily break ccxt instance without monkeypatching, 
# but we can try fetching a symbol that might fail on Binance but map to CoinCap? 
# or just temporarily break the code?
# Lets just trust get_historical_data structure if fetch_from_coincap works.

# Actually, we can monkeypatch the exchange object in main to verify logic
import main
def mock_fetch_ohlcv(*args, **kwargs):
    raise Exception("Simulated Binance Error")

# Replace the method on the instance
main.exchange.fetch_ohlcv = mock_fetch_ohlcv

try:
    data_fallback = main.get_historical_data("BTC")
    print(f"Fallback BTC Data: {len(data_fallback)} records")
    print(f"Source confirmed as fallback if this prints.")
except Exception as e:
    print(f"Fallback failed: {e}")
