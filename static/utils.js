// Utility functions for crypto analysis

const SYMBOLS = ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "DOT", "LINK", "AVAX"];

// Map display symbols to Binance pairs
const PAIR_MAP = {
    "BTC": "BTCUSDT", "ETH": "ETHUSDT", "SOL": "SOLUSDT", "BNB": "BNBUSDT",
    "XRP": "XRPUSDT", "ADA": "ADAUSDT", "DOGE": "DOGEUSDT", "DOT": "DOTUSDT",
    "LINK": "LINKUSDT", "AVAX": "AVAXUSDT"
};

/**
 * Fetches historical data for a symbol from Binance Public API (Client-Side)
 * This is generally accessible from user browsers even if cloud servers are blocked.
 */
async function fetchHistoricalData(symbol, interval = '1d') {
    const pair = PAIR_MAP[symbol];
    if (!pair) return [];

    try {
        // Fetch data based on interval
        // 4h: recent ~2 months (360 candles)
        // 1d: recent 1 year (365 candles)
        // 1w: recent 3 years (156 candles)
        const limit = interval === '1w' ? 156 : 365;
        const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${interval}&limit=${limit}`);
        if (!response.ok) throw new Error('Network response was not ok: ' + response.statusText);
        const data = await response.json();

        // Transform Binance [time, open, high, low, close, vol, ...] format
        return data.map(candle => ({
            timestamp: candle[0],
            date: new Date(candle[0]).toISOString().split('T')[0],
            open: parseFloat(candle[1]),
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
            volume: parseFloat(candle[5])
        })).reverse(); // Newest first

    } catch (error) {
        console.warn(`Failed to fetch Binance data for ${symbol}, trying backup (CoinGecko)...`, error);
        return await fetchCoinGeckoFallback(symbol);
    }
}

// Fallback to CoinGecko if Binance is blocked for the user
async function fetchCoinGeckoFallback(symbol) {
    const idMap = {
        "BTC": "bitcoin", "ETH": "ethereum", "SOL": "solana", "BNB": "binancecoin",
        "XRP": "ripple", "ADA": "cardano", "DOGE": "dogecoin", "DOT": "polkadot",
        "LINK": "chainlink", "AVAX": "avalanche-2"
    };
    const id = idMap[symbol];
    if (!id) return [];

    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=365`);
        const data = await response.json();
        return data.prices.map(p => ({
            timestamp: p[0],
            date: new Date(p[0]).toISOString().split('T')[0],
            close: p[1],
            open: p[1], high: p[1], low: p[1], // CoinGecko basic point is just price, close enough for model
            volume: 0
        })).reverse();
    } catch (e) {
        console.error("All data sources failed for " + symbol, e);
        return [];
    }
}

/**
 * Performs market analysis entirely on the client side
 */
function calculateAnalysis(marketData, targetBtc) {
    if (!marketData["BTC"] || marketData["BTC"].length === 0) {
        return null;
    }

    const btcHistory = marketData["BTC"];
    const currentBtc = btcHistory[0].close;

    if (targetBtc === null || targetBtc === undefined) {
        targetBtc = currentBtc;
    }

    // Find matching dates
    const matchedIndices = [];
    const threshold = 0.02;

    btcHistory.forEach((candle, index) => {
        if (candle.close >= targetBtc * (1 - threshold) && candle.close <= targetBtc * (1 + threshold)) {
            matchedIndices.push(index);
        }
    });

    const results = [];

    SYMBOLS.forEach(sym => {
        if (!marketData[sym] || marketData[sym].length === 0) return;

        const history = marketData[sym];
        const currentPrice = history[0].close;

        if (sym === "BTC") {
            results.push({
                symbol: "BTC",
                current_price: currentPrice,
                avg_hist_price: currentPrice,
                diff_percent: 0,
                status: "Benchmark",
                sniper_score: 50,
                win_rate: 50,
                potential_upside: 0,
                correlation: 1.0,
                rsi: calculateRSI(history),
                macd: calculateMACD(history),
                volume_ratio: 1.0,
                sparkline: history.slice(0, 30).map(d => d.close).reverse()
            });
            return;
        }

        const pricesOnDates = matchedIndices
            .filter(i => i < history.length)
            .map(i => history[i].close);

        if (pricesOnDates.length === 0) return;

        const avgHistPrice = pricesOnDates.reduce((a, b) => a + b, 0) / pricesOnDates.length;
        const diffPercent = ((currentPrice - avgHistPrice) / avgHistPrice) * 100;

        const wins = pricesOnDates.filter(p => p > currentPrice).length;
        const winRate = (wins / pricesOnDates.length) * 100;

        const potentialUpside = currentPrice < avgHistPrice
            ? ((avgHistPrice - currentPrice) / currentPrice) * 100
            : 0;

        let sniperScore = 50;
        if (diffPercent < -10) sniperScore += 20;
        else if (diffPercent < 0) sniperScore += 10;
        else if (diffPercent > 10) sniperScore -= 20;

        if (winRate > 80) sniperScore += 15;

        const rsi = calculateRSI(history);
        if (rsi < 30) sniperScore += 15;
        else if (rsi > 70) sniperScore -= 15;

        const macdData = calculateMACD(history);
        // MACD Scoring: Bullish crossover (MACD > Signal) = Good
        if (macdData.macd > macdData.signal) sniperScore += 10;
        else sniperScore -= 10;

        sniperScore = Math.min(100, Math.max(0, sniperScore));

        let status = "Balanced";
        if (diffPercent < -10) status = "Undervalued";
        else if (diffPercent > 10) status = "Overvalued";

        const recentHistory = history.slice(0, 30).map(d => d.close).reverse();
        const minPrice = Math.min(...recentHistory);
        const maxPrice = Math.max(...recentHistory);
        const range = maxPrice - minPrice;

        // Normalize to 0.2 - 1.0 range (keep some baseline)
        const normalizedSparkline = recentHistory.map(p =>
            range === 0 ? 0.5 : 0.2 + ((p - minPrice) / range) * 0.8
        );

        results.push({
            symbol: sym,
            current_price: currentPrice,
            avg_hist_price: avgHistPrice,
            diff_percent: diffPercent,
            status: status,
            sniper_score: Math.round(sniperScore),
            win_rate: Math.round(winRate),
            potential_upside: potentialUpside,
            correlation: 0.85,
            rsi: Math.round(rsi),
            macd: macdData,
            volume_ratio: 1.0,
            sparkline: normalizedSparkline
        });
    });

    results.sort((a, b) => b.sniper_score - a.sniper_score);

    return {
        target_btc: targetBtc,
        current_btc: currentBtc,
        match_count: matchedIndices.length,
        results: results,
        history_matches: matchedIndices.slice(0, 50).map(i => {
            const date = btcHistory[i].date;
            const assets = {};
            SYMBOLS.forEach(sym => {
                if (sym === "BTC") return;
                if (marketData[sym]) {
                    const candle = marketData[sym].find(c => c.date === date);
                    if (candle) assets[sym] = candle.close;
                }
            });
            return {
                date: date,
                btc_price: btcHistory[i].close,
                assets: assets
            };
        }),
        briefing: generateBriefing(results, currentBtc)
    };
}

function calculateRSI(history) {
    if (history.length < 15) return 50;
    const recent = history.slice(0, 15).map(d => d.close).reverse();
    let gains = 0, losses = 0;
    for (let i = 1; i < recent.length; i++) {
        const change = recent[i] - recent[i - 1];
        if (change > 0) gains += change;
        else losses += Math.abs(change);
    }
    if (losses === 0) return 100;
    const rs = (gains / 14) / (losses / 14);
    return 100 - (100 / (1 + rs));
}

function calculateMACD(history) {
    // Need at least 26 + 9 periods
    if (history.length < 35) return { macd: 0, signal: 0, histogram: 0 };

    // Get close prices, newest first in 'history', but EMA calc usually needs oldest first or consistent iteration
    // History is [newest, ..., oldest]
    // Let's take recent 100 points and reverse to [oldest, ..., newest] for EMA calc
    const closes = history.slice(0, 100).map(d => d.close).reverse();

    const ema12 = calculateEMA(closes, 12);
    const ema26 = calculateEMA(closes, 26);

    const macdLine = [];
    // We only care about the latest values, but we need the series for Signal Line
    // EMA arrays are same length as closes, aligned
    for (let i = 0; i < closes.length; i++) {
        macdLine.push(ema12[i] - ema26[i]);
    }

    // Signal line is EMA 9 of MACD Line
    const signalLine = calculateEMA(macdLine, 9);

    const latestMACD = macdLine[macdLine.length - 1];
    const latestSignal = signalLine[signalLine.length - 1];
    const histogram = latestMACD - latestSignal;

    return {
        macd: latestMACD,
        signal: latestSignal,
        histogram: histogram
    };
}

function calculateEMA(data, period) {
    const k = 2 / (period + 1);
    const emaArray = [data[0]]; // Start with SMA (or just first price for simplicity)
    for (let i = 1; i < data.length; i++) {
        const ema = data[i] * k + emaArray[i - 1] * (1 - k);
        emaArray.push(ema);
    }
    return emaArray;
}

function generateBriefing(results, btcPrice) {
    const undervaluedCount = results.filter(r => r.status === "Undervalued").length;
    let sentiment = "中性觀望";
    let summary = `目前 BTC 價格為 $${btcPrice.toLocaleString()}。`;
    if (undervaluedCount > results.length / 2) {
        sentiment = "看漲機會 (Bullish)";
        summary += " 市場顯示出廣泛的被低估信號，這可能是佈局的好時機。";
    } else {
        summary += " 市場風險回報比呈現平衡狀態。";
    }
    return {
        title: `市場情緒：${sentiment}`,
        summary: summary,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
}

function formatCurrency(value) {
    if (value === null || value === undefined) return "$0.00";

    let options = { style: 'currency', currency: 'USD' };

    if (value < 1.0) {
        options.minimumFractionDigits = 6;
        options.maximumFractionDigits = 6;
    } else if (value < 100) {
        options.minimumFractionDigits = 4;
        options.maximumFractionDigits = 4;
    } else {
        options.minimumFractionDigits = 2;
        options.maximumFractionDigits = 2;
    }

    return new Intl.NumberFormat('en-US', options).format(value);
}

function formatNumber(value) {
    return new Intl.NumberFormat('en-US').format(value);
}

const formatMoney = formatCurrency;

/**
 * Fetches real-time prices for all tracked symbols.
 * Returns a map of symbol -> price.
 */
async function fetchLivePrices() {
    // Construct symbol param for Binance
    // e.g. ["BTCUSDT","ETHUSDT"]
    const pairs = SYMBOLS.map(s => `"${PAIR_MAP[s]}"`).join(",");
    // Binance V3 ticker/price doesn't support comma sep lists in all endpoints, 
    // but ticker/price?symbol=... is single. 
    // Actually, /api/v3/ticker/price returns ALL if no symbol provided (heavy).
    // Better to use batch or individual. 
    // For small list (10 items), fetch all is fine (~2MB?) or just minimal.
    // Actually /api/v3/ticker/price is light. All pairs is ~100KB.

    // Better approach: Use symbol only if supported multiple. Binance API docs say symbol (string) or symbols (array of strings) for some EPs.
    // ticker/price supports 'symbol' (one) or 'symbols' (list).

    // Let's safe encode.
    const symbolsParam = encodeURIComponent(JSON.stringify(SYMBOLS.map(s => PAIR_MAP[s])));

    try {
        const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbols=${symbolsParam}`);
        if (!response.ok) throw new Error("Price fetch failed");

        const data = await response.json();
        // data eq: [{symbol: "BTCUSDT", price: "20000.00"}, ...]

        const priceMap = {};
        data.forEach(item => {
            // Find our symbol key from pair map (reverse lookup or just iterate)
            const sym = Object.keys(PAIR_MAP).find(key => PAIR_MAP[key] === item.symbol);
            if (sym) {
                priceMap[sym] = parseFloat(item.price);
            }
        });
        return priceMap;
    } catch (e) {
        console.error("Live price fetch failed", e);
        return null;
    }
}

/**
 * Updates the latest candle of historical data with the new live price
 * to allow 'blinking' updates without re-fetching history.
 */
function updateMarketData(currentMarketData, livePrices) {
    if (!currentMarketData || !livePrices) return currentMarketData;

    const newData = { ...currentMarketData };
    let changed = false;

    Object.keys(livePrices).forEach(sym => {
        if (newData[sym] && newData[sym].length > 0) {
            // Clone the history array to avoid mutation if needed, 
            // but for performance we might just mutate the head item if we are careful 
            // or clone the head.

            // Shallow clone array
            const newHistory = [...newData[sym]];

            // Get latest candle
            const latest = { ...newHistory[0] };

            // Update close price
            latest.close = livePrices[sym];

            // Update High/Low if price breaks them
            if (latest.close > latest.high) latest.high = latest.close;
            if (latest.close < latest.low) latest.low = latest.close;

            // Replace head
            newHistory[0] = latest;
            newData[sym] = newHistory;
            changed = true;
        }
    });

    return changed ? newData : currentMarketData;
}

/**
 * Connects to Binance WebSocket for real-time trade updates (Jumping prices).
 * streams: <symbol>@trade
 */
function connectWS(onPriceUpdate, onStatusChange) {
    if (!SYMBOLS || SYMBOLS.length === 0) return null;

    // Construct stream names: lowercasepair@ticker
    // e.g. btcusdt@ticker
    // Note: @ticker updates every 1000ms. @trade updates every trade (too fast).
    const streams = SYMBOLS.map(s => `${PAIR_MAP[s].toLowerCase()}@ticker`).join('/');
    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`;

    console.log("Connecting to WebSocket (Ticker Stream):", wsUrl);
    if (onStatusChange) onStatusChange("CONNECTING");

    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            // Ticker format: { stream: "btcusdt@ticker", data: { s: "BTCUSDT", c: "20000.00", ... } }
            // Trade format: { ..., p: "..." }
            // let's handle both or just ticker. Ticker uses 'c' for current close price.
            const data = message.data;
            if (data) {
                const symbolPair = data.s; // e.g. BTCUSDT
                // Ticker 'c', Trade 'p'
                const price = parseFloat(data.c || data.p);

                if (!isNaN(price)) {
                    // Find our symbol key (BTC from BTCUSDT)
                    const sym = Object.keys(PAIR_MAP).find(key => PAIR_MAP[key] === symbolPair);
                    if (sym) {
                        onPriceUpdate({ [sym]: price });
                    }
                }
            }
        } catch (e) {
            console.error("WS Parse Error", e);
        }
    };

    ws.onopen = () => {
        console.log("WebSocket Connected");
        if (onStatusChange) onStatusChange("CONNECTED");
    };

    ws.onerror = (e) => {
        console.error("WebSocket Error:", e);
        if (onStatusChange) onStatusChange("ERROR");
    };

    ws.onclose = () => {
        console.log("WebSocket Closed");
        if (onStatusChange) onStatusChange("DISCONNECTED");
    };

    return ws;
}
// Expose to window for App.js usage
window.fetchHistoricalData = fetchHistoricalData;
window.fetchLivePrices = fetchLivePrices; // Keep as fallback/initial
window.connectWS = connectWS;
window.updateMarketData = updateMarketData;
window.calculateAnalysis = calculateAnalysis;
window.SYMBOLS = SYMBOLS;
window.formatCurrency = formatCurrency;
window.formatMoney = formatMoney;
window.formatNumber = formatNumber;

/**
 * Calculates Average True Range (ATR) for volatility measuring
 */
function calculateATR(history, period = 14) {
    if (!history || history.length < period + 1) return 0;

    // history is [newest, ..., oldest]
    // ATR needs chronological order: [oldest, ..., newest]
    const ChronoHistory = [...history].reverse();

    let trs = [];
    for (let i = 1; i < ChronoHistory.length; i++) {
        const high = ChronoHistory[i].high;
        const low = ChronoHistory[i].low;
        const prevClose = ChronoHistory[i - 1].close;

        const tr = Math.max(
            high - low,
            Math.abs(high - prevClose),
            Math.abs(low - prevClose)
        );
        trs.push(tr);
    }

    // Initial ATR is simple average of first 'period' TRs
    let atr = trs.slice(0, period).reduce((sum, tr) => sum + tr, 0) / period;

    // Subsequent ATRs = (PrevATR * (period-1) + CurrentTR) / period
    for (let i = period; i < trs.length; i++) {
        atr = (atr * (period - 1) + trs[i]) / period;
    }

    return atr;
}

window.calculateATR = calculateATR;
