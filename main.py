from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uvicorn
import os
import random
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

class AssetData(BaseModel):
    symbol: str
    price: float
    rsi: float
    macd_signal: str  # "bullish" or "bearish" based on hist
    diff_percent: float
    status: str
    volume_ratio: float
    mode: str = "auto"  # "auto", "ai", "local"

class AnalysisResponse(BaseModel):
    title: str
    summary: str
    support_resistance: str
    action: str
    confidence: int
    source: str = "AI"

@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_asset(data: AssetData):
    api_key = os.environ.get("GEMINI_API_KEY")
    
    # 0. Strict Mode Check (Force Reveal)
    if data.mode == "ai" and not api_key:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Gemini API Key not configured in .env")

    # 1. Real AI Generation (if Key exists and mode is not local)
    if api_key and data.mode != "local":
        try:
            import requests
            import json
            
            prompt = f"""
            You are a professional crypto trading analyst. Analyze the following asset data and return a JSON RESPONSE ONLY.
            Do not include markdown formatting (like ```json ... ```), just raw JSON.
            Focus on practical, actionable advice. Use Traditional Chinese (zh-TW).
            
            Asset Data:
            Symbol: {data.symbol}
            Price: {data.price}
            RSI: {data.rsi}
            MACD Signal: {data.macd_signal}
            Valuation Gap: {data.diff_percent}% ({data.status})
            Volume Ratio: {data.volume_ratio}
            
            Expected JSON Format:
            {{
                "title": "Short catchy headline (e.g. 強烈買入信號)",
                "summary": "2-3 sentences analyzing the technical setup.",
                "support_resistance": "Support: $X | Resistance: $Y",
                "action": "Action (e.g. 積極買入 Strong Buy)",
                "confidence": Integer 0-100
            }}
            """
            
            # Auto-detect best model
            model_name = "models/gemini-1.5-pro" # default fallback
            try:
                models_url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
                models_resp = requests.get(models_url, timeout=5)
                if models_resp.status_code == 200:
                    models_data = models_resp.json().get("models", [])
                    available_models = [m['name'] for m in models_data if "generateContent" in m.get("supportedGenerationMethods", [])]
                    
                    # Priority list (Updated for 2026 availability)
                    priorities = [
                        "models/gemini-2.5-flash", 
                        "models/gemini-2.0-flash", 
                        "models/gemini-1.5-flash", 
                        "models/gemini-1.5-pro", 
                        "models/gemini-pro"
                    ]
                    for p in priorities:
                        # loose match to handle versions like -001
                        matches = [m for m in available_models if p in m]
                        if matches:
                            model_name = matches[0]
                            break
                    print(f"Selected Gemini Model: {model_name}")
            except Exception as ex:
                print(f"Model detection failed, using default: {ex}")

            url = f"https://generativelanguage.googleapis.com/v1beta/{model_name}:generateContent?key={api_key}"
            
            payload = {
                "contents": [{
                    "parts": [{"text": prompt}]
                }],
                "generationConfig": {
                    "response_mime_type": "application/json"
                }
            }
            
            result = requests.post(url, json=payload, timeout=10)
            if result.status_code != 200:
                error_msg = f"Gemini API Error: {result.status_code} {result.text}"
                if data.mode == "ai":
                     raise HTTPException(status_code=503, detail=error_msg)
                print(f"{error_msg} - Falling back to local engine.")
                # Allow fallthrough to local logic only if mode != "ai"
            else:
                # Extract text from Gemini structure
                result_json = result.json()
                try:
                    text_content = result_json['candidates'][0]['content']['parts'][0]['text']
                    # Clean up code blocks if present
                    text_content = text_content.replace('```json', '').replace('```', '').strip()
                    parsed_result = json.loads(text_content)
                    parsed_result["source"] = f"AI ({model_name})"
                    return AnalysisResponse(**parsed_result)
                except (KeyError, json.JSONDecodeError, IndexError) as e:
                     if data.mode == "ai":
                         raise HTTPException(status_code=500, detail=f"AI Parse Error: {str(e)}")
                     print(f"AI Parse Failed: {e} - Falling back.")

        except Exception as e:
            if data.mode == "ai":
                 raise HTTPException(status_code=503, detail=f"AI Request Failed: {str(e)}")
            print(f"Gemini API Exception: {e} - Falling back to local engine.")

    # 2. Rule-based Fallback (Original Logic)
    # This mimics an LLM by assembling coherent narratives from technical data
    
    # ... Determine Sentiment
    sentiment_score = 0
    if data.rsi < 35: sentiment_score += 2
    elif data.rsi > 70: sentiment_score -= 2
    
    if data.diff_percent < -10: sentiment_score += 2
    elif data.diff_percent > 15: sentiment_score -= 2
    
    if data.macd_signal == "bullish": sentiment_score += 1
    else: sentiment_score -= 1

    if data.volume_ratio > 1.2: 
        # Volume validates trend
        sentiment_score *= 1.2

    # ... Generate Title
    titles = []
    if sentiment_score > 2:
        titles = ["強烈買入信號", "觸底反彈機會", "價值嚴重低估", "多頭動能積蓄中"]
        action = "積極買入 (Strong Buy)"
    elif sentiment_score > 0:
        titles = ["溫和看漲", "逢低佈局", "趨勢轉強", "持續關注"]
        action = "分批建倉 (Accumulate)"
    elif sentiment_score < -2:
        titles = ["過熱警報", "獲利了結建議", "回調風險高", "頂部信號浮現"]
        action = "賣出/減倉 (Sell/Reduce)"
    else:
        titles = ["市場觀望", "方向未明", "區間震盪", "等待突破"]
        action = "持有/觀望 (Hold)"
    
    title = random.choice(titles)

    # ... Generate Summary Narrative
    narrative = []
    
    # RSI Context
    if data.rsi < 30:
        narrative.append(f"RSI 指標目前位於 {data.rsi}，顯示市場處於極度超賣狀態。通常這預示著價格可能隨時出現反彈。")
    elif data.rsi > 75:
        narrative.append(f"RSI 已達到 {data.rsi} 的高位，市場情緒過熱，短期內回調風險顯著增加。")
    else:
        narrative.append(f"RSI 處於 {data.rsi} 的中性區域，市場供需相對平衡。")

    # Valuation Context
    if data.diff_percent < 0:
        narrative.append(f"根據我們的歷史比對模型，{data.symbol} 目前價格低於其理論估值 {abs(data.diff_percent):.1f}%，這是一個具有吸引力的安全邊際。")
    else:
        narrative.append(f"價格高於歷史平均水平 {data.diff_percent:.1f}%，建議謹慎追高。")

    # MACD & Volume
    if data.macd_signal == "bullish":
        narrative.append("MACD 動能顯示多頭正在掌控局面。")
    else:
        narrative.append("MACD 顯示空頭動能尚未消退，下行壓力猶存。")
    
    if data.volume_ratio > 1.5:
        narrative.append("值得注意的是，近期成交量顯著放大，這通常意味著大資金正在進場或換手。")

    summary = " ".join(narrative)

    # ... Support/Resistance (Simulated based on current price)
    # real logic would need history, here we simulate sensible levels
    p = data.price
    s1 = p * (0.92 if sentiment_score > 0 else 0.85)
    r1 = p * (1.15 if sentiment_score > 0 else 1.05)
    
    sr_text = f"支撐位: ${s1:,.2f} | 壓力位: ${r1:,.2f}"

    return AnalysisResponse(
        title=f"AI 深度分析: {title}",
        summary=summary,
        support_resistance=sr_text,
        action=action,
        confidence=min(95, 60 + int(abs(sentiment_score) * 10)),
        source="Local Algo (Fallback)"
    )

@app.get("/")
async def read_index():
    return FileResponse('index.html')

@app.get("/favicon.ico")
async def favicon():
    return FileResponse('static/favicon.ico') if os.path.exists('static/favicon.ico') else ("", 204)

# Catch-all route for SPA client-side routing
# This must be the last route defined
@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    # Check if the file exists in static (though static is mounted separately, 
    # sometimes relative paths in code might try to hit root)
    # But primarily this is to serve index.html for any non-api, non-static path
    return FileResponse('index.html')

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
