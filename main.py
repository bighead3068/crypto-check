import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import requests
from fastapi.responses import FileResponse
import ccxt
import time
from typing import Dict, List
from datetime import datetime
import os

# Fix: Use absolute path for robustness
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")

app = FastAPI()

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Ensure static directory exists
os.makedirs(STATIC_DIR, exist_ok=True)

# Configuration
SYMBOLS = ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "DOT", "LINK", "AVAX"]
INTERVAL = "1d"
LIMIT = 1000 # Extended to ~2.7 years

# Caching
CACHE = {}
CACHE_TTL = 60 # seconds

# Initialize Exchange
exchange = ccxt.binance()

def fetch_from_coincap(symbol: str) -> List[Dict]:
    """Fallback: Fetches daily OHLCV data from CoinCap."""
    # Map common symbols to CoinCap IDs
    id_map = {
        "BTC": "bitcoin", "ETH": "ethereum", "SOL": "solana", "BNB": "binance-coin",
        "XRP": "xrp", "ADA": "cardano", "DOGE": "dogecoin", "DOT": "polkadot",
        "LINK": "chainlink", "AVAX": "avalanche"
    }
    
    asset_id = id_map.get(symbol)
    if not asset_id:
        print(f"No CoinCap ID found for {symbol}")
        return []
        
    url = f"https://api.coincap.io/v2/assets/{asset_id}/history"
    params = {"interval": "d1"} # daily
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()["data"]
        
        formatted_data = []
        for candle in data:
            # CoinCap returns time in ms
            ts = int(candle["time"])
            date_str = datetime.fromtimestamp(ts / 1000).strftime('%Y-%m-%d')
            
            # CoinCap history doesn't give Open/High/Low reliably in this endpoint, 
            # usually just 'priceUsd'. But for our correlation purpose, Close is most important.
            # We will approximate OHL as Close if missing, or use priceUsd as Close.
            price = float(candle["priceUsd"])
            
            formatted_data.append({
                "timestamp": ts,
                "date": date_str,
                "open": price, # Approximation
                "high": price, # Approximation
                "low": price,  # Approximation
                "close": price,
                "volume": 0    # Not always available in this endpoint
            })
            
        # Reverse to match Binance order (newest first)? 
        # API usually returns oldest first. Our app expects newest first for some logic? 
        # Let's check get_historical_data usage.
        # Original code didn't explicitly sort, Binance returns oldest first. 
        # App seems to handle list order, but let's stick to oldest -> newest (standard).
        
        return formatted_data
    except Exception as e:
        print(f"CoinCap Error {symbol}: {e}")
        return []

def get_historical_data(symbol: str) -> List[Dict]:
    """Fetches daily OHLCV data with fallback to CoinCap."""
    now = time.time()
    if symbol in CACHE:
        timestamp, data = CACHE[symbol]
        if now - timestamp < CACHE_TTL:
            return data

    # Try Binance (CCXT)
    try:
        pair = f"{symbol}/USDT"
        ohlcv = exchange.fetch_ohlcv(pair, timeframe=INTERVAL, limit=LIMIT)
        
        formatted_data = []
        for candle in ohlcv:
            formatted_data.append({
                "timestamp": candle[0],
                "date": datetime.fromtimestamp(candle[0] / 1000).strftime('%Y-%m-%d'),
                "open": float(candle[1]),
                "high": float(candle[2]),
                "low": float(candle[3]),
                "close": float(candle[4]),
                "volume": float(candle[5])
            })
            
        CACHE[symbol] = (now, formatted_data)
        return formatted_data
        
    except Exception as e:
        print(f"Binance (CCXT) failed for {symbol}: {e}. Trying CoinCap...")
        # Fallback to CoinCap
        data = fetch_from_coincap(symbol)
        if data:
            CACHE[symbol] = (now, data)
            return data
        return []

@app.get("/api/history/{symbol}")
def get_symbol_history(symbol: str):
    """Returns full history for a symbol for charting."""
    data = get_historical_data(symbol)
    if not data:
        return {"error": "Data not found"}
    
    # Format for Lightweight Charts
    chart_data = []
    volume_data = []
    
    for d in data:
        chart_data.append({
            "time": d["date"],
            "open": d["open"],
            "high": d["high"],
            "low": d["low"],
            "close": d["close"]
        })
        
        # Color volume bars based on price action
        color = "#26a69a" if d["close"] >= d["open"] else "#ef5350"
        volume_data.append({
            "time": d["date"],
            "value": d["volume"],
            "color": color
        })
        
    return {
        "candlestick": chart_data,
        "volume": volume_data
    }

def generate_market_briefing(results: List[Dict], btc_price: float) -> Dict:
    """Generates a rule-based AI market briefing."""
    
    # 1. Market Sentiment
    undervalued_count = sum(1 for r in results if r["status"] == "Undervalued")
    overvalued_count = sum(1 for r in results if r["status"] == "Overvalued")
    
    sentiment = "中性觀望"
    if undervalued_count > len(results) / 2:
        sentiment = "看漲機會 (Bullish)"
    elif overvalued_count > len(results) / 2:
        sentiment = "過熱警告 (Overheated)"
        
    # 2. Top Pick
    top_pick = results[0] if results else None
    
    # 3. Briefing Text
    briefing_text = f"目前 BTC 價格為 **${btc_price:,.0f}**。 "
    
    if sentiment == "看漲機會 (Bullish)":
        briefing_text += "相對於 BTC，市場顯示出廣泛的被低估信號，這可能是佈局的好時機。"
    elif sentiment == "過熱警告 (Overheated)":
        briefing_text += "許多資產相對於歷史均值已顯著高估，建議注意回調風險。"
    else:
        briefing_text += "目前市場風險回報比呈現平衡狀態，建議專注於個體代幣表現。"
        
    if top_pick:
        briefing_text += f"\n\n**本週精選：{top_pick['symbol']}** (評分: {top_pick['sniper_score']})"
        if top_pick['status'] == 'Undervalued':
            briefing_text += "目前處於被低估區域，且各項動能指標良好。"
            
    return {
        "title": f"市場情緒：{sentiment}",
        "summary": briefing_text,
        "timestamp": datetime.now().strftime("%H:%M")
    }

def generate_mock_data(target_btc=95000):
    """Generates realistic mock data when all APIs fail."""
    mock_results = []
    import random
    
    # Generate mock BTC data first
    current_btc = target_btc * random.uniform(0.98, 1.02)
    
    for sym in SYMBOLS:
        # Generate random price movement (Sparkline) - Random Walk
        sparkline = []
        price_point = 0.5
        for _ in range(20):
            change = random.uniform(-0.1, 0.1)
            price_point = max(0.1, min(0.9, price_point + change))
            sparkline.append(price_point)
            
        if sym == "BTC":
            mock_results.append({
                "symbol": "BTC",
                "current_price": current_btc, 
                "avg_hist_price": current_btc,
                "diff_percent": 0.0, 
                "status": "Benchmark", 
                "sniper_score": 50,
                "win_rate": 50, 
                "potential_upside": 0, 
                "correlation": 1.0, 
                "rsi": random.choice([45, 50, 55]), 
                "volume_ratio": 1.0, 
                "sparkline": sparkline
            })
            continue
            
        # Randomize Diff
        diff_percent = random.uniform(-25, 25)
        
        # Calculate Mock Prices derived from diff
        # diff = (current - avg) / avg  => current = avg * (1 + diff)
        # Let's say avg is correlated to BTC mock price * ratio
        base_ratio = {
            "ETH": 0.05, "SOL": 0.002, "BNB": 0.006, "XRP": 0.00001, 
            "ADA": 0.000005, "DOGE": 0.000001, "DOT": 0.00008, 
            "LINK": 0.00015, "AVAX": 0.0003
        }.get(sym, 0.01)
        
        avg_hist_price = current_btc * base_ratio
        current_price = avg_hist_price * (1 + (diff_percent / 100))
        
        # Determine Status
        status = "Balanced"
        if diff_percent < -10: status = "Undervalued"
        elif diff_percent > 10: status = "Overvalued"
        
        # Sniper Score
        sniper_score = random.randint(30, 95)
        if status == "Undervalued": sniper_score = min(100, sniper_score + 20)
        
        mock_results.append({
            "symbol": sym, 
            "current_price": current_price, 
            "avg_hist_price": avg_hist_price, 
            "diff_percent": diff_percent, 
            "status": status,
            "sniper_score": sniper_score,
            "win_rate": random.randint(40, 80), 
            "potential_upside": abs(diff_percent) if diff_percent < 0 else 0, 
            "correlation": random.uniform(0.7, 0.99), 
            "rsi": random.randint(30, 70), 
            "volume_ratio": random.uniform(0.8, 2.5),
            "sparkline": sparkline
        })
    
    return {
        "target_btc": target_btc,
        "current_btc": current_btc,
        "match_count": 0,
        "results": sorted(mock_results, key=lambda x: x["sniper_score"], reverse=True),
        "history_matches": [],
        "briefing": {
            "title": "⚠️ 系統離線模式 (Simulated Data)",
            "summary": "數據源連接失敗 (IP blocked)。下表顯示的是基於目標價生成的「模擬情境」，僅供測試與介面預覽，非真實市場報價。",
            "timestamp": datetime.now().strftime("%H:%M")
        }
    }

@app.get("/api/analysis")
def get_analysis(target_btc: float = None):
    market_data = {}
    
    # Fetch data concurrently using ThreadPoolExecutor
    import concurrent.futures
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        future_to_symbol = {executor.submit(get_historical_data, sym): sym for sym in SYMBOLS}
        for future in concurrent.futures.as_completed(future_to_symbol):
            sym = future_to_symbol[future]
            try:
                data = future.result()
                if data:
                    market_data[sym] = data
            except Exception as e:
                print(f"Error processing {sym}: {e}")
        
    if "BTC" not in market_data:
        print("Critical Error: Failed to fetch BTC data from all sources. Serving Mock Data.")
        return generate_mock_data(target_btc or 95000)
        
    # Determine target price
    current_btc = market_data["BTC"][-1]["close"]
    if target_btc is None:
        target_btc = current_btc
        
    # Find matching dates
    btc_history = market_data["BTC"]
    matched_indices = []
    threshold = 0.02
    
    for i, candle in enumerate(btc_history):
        if (1 - threshold) * target_btc <= candle["close"] <= (1 + threshold) * target_btc:
            matched_indices.append(i)
            
    # Calculate stats
    results = []
    for sym in SYMBOLS:
        if sym not in market_data: continue
        
        history = market_data[sym]
        current_price = history[-1]["close"]
        
        if sym == "BTC":
            results.append({
                "symbol": "BTC",
                "current_price": current_price,
                "avg_hist_price": current_price,
                "diff_percent": 0,
                "status": "Benchmark",
                "sniper_score": 0,
                "win_rate": 0,
                "potential_upside": 0,
                "correlation": 1.0,
                "rsi": 50,
                "volume_ratio": 1.0
            })
            continue

        # Calculate Correlation with BTC (Simple Pearson based on last 90 days)
        # We need aligned lists of prices
        btc_prices_90 = [d["close"] for d in btc_history[:90]]
        asset_prices_90 = [d["close"] for d in history[:90]]
        
        correlation = 0
        if len(btc_prices_90) == len(asset_prices_90) and len(btc_prices_90) > 1:
            mean_btc = sum(btc_prices_90) / len(btc_prices_90)
            mean_asset = sum(asset_prices_90) / len(asset_prices_90)
            
            numerator = sum((b - mean_btc) * (a - mean_asset) for b, a in zip(btc_prices_90, asset_prices_90))
            denom_btc = sum((b - mean_btc) ** 2 for b in btc_prices_90)
            denom_asset = sum((a - mean_asset) ** 2 for a in asset_prices_90)
            
            if denom_btc > 0 and denom_asset > 0:
                correlation = numerator / ((denom_btc ** 0.5) * (denom_asset ** 0.5))

        prices_on_dates = [history[i]["close"] for i in matched_indices if i < len(history)]
        
        if not prices_on_dates:
            continue
            
        avg_hist_price = sum(prices_on_dates) / len(prices_on_dates)
        diff_percent = ((current_price - avg_hist_price) / avg_hist_price) * 100
        
        # Statistical Analysis
        # Win Rate: % of times historical price was HIGHER than current price (meaning buying now is cheaper)
        wins = sum(1 for p in prices_on_dates if p > current_price)
        win_rate = (wins / len(prices_on_dates)) * 100
        
        # Potential Upside
        potential_upside = 0
        if current_price < avg_hist_price:
             potential_upside = ((avg_hist_price - current_price) / current_price) * 100

        # --- Accuracy Improvements ---
        
        # 1. RSI (Relative Strength Index) - 14 days
        rsi = 50 # Default neutral
        # history is already newest to oldest, so history[0] is today, history[1] is yesterday, etc.
        if len(history) >= 15: # Need at least 15 days for 14 periods of change
            # We need the last 15 days to calc change, then 14 periods
            # history[0] is today, history[14] is 14 days ago.
            # We need to iterate from oldest to newest for RSI calculation.
            # So, we take history[14]...history[0] and reverse it.
            recent_closes_for_rsi = [d["close"] for d in history[0:15]] # Get 15 most recent
            recent_closes_for_rsi.reverse() # Now it's oldest (14 days ago) to newest (today)
            
            gains = []
            losses = []
            
            for i in range(1, len(recent_closes_for_rsi)):
                delta = recent_closes_for_rsi[i] - recent_closes_for_rsi[i-1]
                if delta > 0:
                    gains.append(delta)
                    losses.append(0)
                else:
                    gains.append(0)
                    losses.append(abs(delta))
            
            # Calculate average gain and loss over the 14 periods
            # The `gains` and `losses` lists will have 14 elements (from 15 closes)
            if len(gains) >= 14: # Ensure we have enough data points for 14 periods
                avg_gain = sum(gains[-14:]) / 14
                avg_loss = sum(losses[-14:]) / 14
                
                if avg_loss == 0:
                    rsi = 100
                else:
                    rs = avg_gain / avg_loss
                    rsi = 100 - (100 / (1 + rs))

                    rsi = 100 - (100 / (1 + rs))

        # 1.5 Sparklines (Last 7 days normalized for plotting)
        # We need the last 7 days. history[0] = today. history[6] = 7 days ago.
        sparkline = []
        if len(history) >= 7:
            # Get last 7 prices (reversed to be chronological: old -> new)
            last_7 = [d["close"] for d in history[0:7]]
            last_7.reverse()
            
            # Normalize to 0-1 range for easy SVG plotting
            min_val = min(last_7)
            max_val = max(last_7)
            range_val = max_val - min_val if max_val > min_val else 1
            
            sparkline = [(p - min_val) / range_val for p in last_7]

        # 2. Volume Trend
        current_volume = history[0]["volume"]
        # Get 30d avg volume (excluding today)
        # history[1] is yesterday, history[30] is 30 days ago.
        vols = [d["volume"] for d in history[1:31]] # Get volumes from yesterday to 30 days ago
        avg_volume = sum(vols) / len(vols) if vols else 0
        
        volume_ratio = 0
        if avg_volume > 0:
            volume_ratio = current_volume / avg_volume
            
        # 3. Sniper Score (0-100)
        sniper_score = 50 # Base
        # correlation is already calculated above
        
        # Undervalued bonus
        if diff_percent < -10: sniper_score += 20
        elif diff_percent < 0: sniper_score += 10
        elif diff_percent > 10: sniper_score -= 20
        
        # Win Rate bonus
        if win_rate > 80: sniper_score += 15
        elif win_rate > 50: sniper_score += 5
        
        # Correlation bonus
        if correlation > 0.8: sniper_score += 10
        elif correlation < 0.3: sniper_score -= 10
        
        # RSI bonus (Low RSI = Bought low = Good)
        if rsi < 30: sniper_score += 15 # Oversold -> Buy sig
        elif rsi > 70: sniper_score -= 15 # Overbought -> bad
        
        # Volume bonus
        if volume_ratio > 1.5: sniper_score += 10 # High activity
        
        # Cap score
        sniper_score = min(100, max(0, sniper_score))

        status = "Balanced"
        if diff_percent < -10: status = "Undervalued"
        elif diff_percent > 10: status = "Overvalued"
        
        results.append({
            "symbol": sym,
            "current_price": current_price,
            "avg_hist_price": avg_hist_price,
            "diff_percent": diff_percent,
            "status": status,
            "win_rate": win_rate,
            "potential_upside": potential_upside,
            "correlation": correlation,
            "rsi": rsi,
            "volume_ratio": volume_ratio,
            "sparkline": sparkline,
            "sniper_score": sniper_score
        })
        
    # Sort by Sniper Score (highest first)
    results.sort(key=lambda x: x["sniper_score"], reverse=True)
        
    # Collect detailed history for backtest view
    history_matches = []
    
    # Iterate through each matched index to build a daily snapshot
    for idx in matched_indices:
        if idx >= len(btc_history): continue
        
        snapshot = {
            "date": btc_history[idx]["date"],
            "btc_price": btc_history[idx]["close"],
            "assets": {}
        }
        
        for sym in SYMBOLS:
            if sym == "BTC": continue
            if sym in market_data and idx < len(market_data[sym]):
                snapshot["assets"][sym] = market_data[sym][idx]["close"]
        
        history_matches.append(snapshot)

    # Sort matches by date (descending)
    history_matches.sort(key=lambda x: x["date"], reverse=True)
    
    # Generate Briefing
    briefing = generate_market_briefing(results, current_btc)

    return {
        "target_btc": target_btc,
        "current_btc": current_btc,  # Expose current BTC price for frontend sync
        "match_count": len(matched_indices),
        "results": results,
        "history_matches": history_matches,
        "briefing": briefing
    }



# Serve React App
@app.get("/")
async def serve_index():
    return FileResponse(os.path.join(STATIC_DIR, 'index.html'))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
