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
async function fetchHistoricalData(symbol) {
    const pair = PAIR_MAP[symbol];
    if (!pair) return [];

    try {
        // Fetch 1 year of daily data
        const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${pair}&interval=1d&limit=365`);
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
        history_matches: matchedIndices.slice(0, 50).map(i => ({
            date: btcHistory[i].date,
            price: btcHistory[i].close
        })),
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
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function formatNumber(value) {
    return new Intl.NumberFormat('en-US').format(value);
}

const formatMoney = formatCurrency;

// Expose to window for App.js usage
window.fetchHistoricalData = fetchHistoricalData;
window.calculateAnalysis = calculateAnalysis;
window.SYMBOLS = SYMBOLS;
window.formatCurrency = formatCurrency;
window.formatMoney = formatMoney;
window.formatNumber = formatNumber;
