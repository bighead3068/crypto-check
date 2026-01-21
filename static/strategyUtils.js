// Strategy Recommendation Engine

const STRATEGIES = {
    TREND_FOLLOWING: {
        name: "趨勢跟蹤 (Trend Following)",
        params: "EMA 20/50 交叉, ATR 止損 2x",
        risk: "盤整市場容易頻繁磨損",
        desc: "利用資產的強趨勢特性，長期持有直到趨勢反轉。"
    },
    MEAN_REVERSION: {
        name: "均值回歸 (Mean Reversion)",
        params: "布林通道 (20, 2), RSI < 30 買入",
        risk: "強烈單邊突破時會持續虧損",
        desc: "適合在震盪區間內高拋低吸，利用價格回歸均值的特性。"
    },
    GRID_TRADING: {
        name: "網格交易 (Grid Trading)",
        params: "區間 +/- 15%, 格數 20-50",
        risk: "跌破區間需止損，資金利用率較低",
        desc: "在特定價格區間內自動化低買高賣，最適合高波動震盪幣種。"
    },
    MACD_BREAKOUT: {
        name: "MACD 動能突破",
        params: "MACD (12,26,9) 黃金交叉, 0軸上方",
        risk: "假突破多，需配合成交量確認",
        desc: "捕捉動能增強的瞬間介入，適合波段操作。"
    },
    DCA: {
        name: "定期定額 (DCA)",
        params: "每週固定投入, 下跌 10% 加倍",
        risk: "需長期資金支持，短期帳面虧損",
        desc: "對抗市場波動的最佳懶人策略，適合長期看好的主流資產。"
    },
    VOLATILITY_BREAKOUT: {
        name: "波動率突破 (Kelter Channel)",
        params: "突破 Kelter 通道 (20, 1.5 ATR)",
        risk: "假突破頻發",
        desc: "當價格劇烈波動突破平靜區間時追入，捕捉爆發行情。"
    }
};

function generateStrategies(asset) {
    if (!asset) return [];

    const symbol = asset.symbol;
    const strategies = [];

    // 1. Classification based on Asset Type
    const MAJORS = ["BTC", "ETH", "BNB", "SOL"];
    const MEMES = ["DOGE", "SHIB", "PEPE"];
    const STABLE_ALT = ["ADA", "XRP", "LTC"];

    // Heuristics derived from market knowledge & asset data
    const isMajor = MAJORS.includes(symbol);
    const isMeme = MEMES.includes(symbol);
    const isHighWinRate = asset.win_rate > 80;
    const isOversold = asset.rsi < 35;
    const isHighVol = asset.sparkline && calculateVolatility(asset.sparkline) > 0.05; // Simplified check

    // Logic Tree

    if (isMajor) {
        // Majors: Trend, DCA, Breakout
        strategies.push({
            ...STRATEGIES.TREND_FOLLOWING,
            reason: `作為市值巨大的主流幣 (${symbol})，長期趨勢最為穩定，適合跟隨趨勢操作。`
        });
        strategies.push({
            ...STRATEGIES.DCA,
            reason: `${symbol} 是加密貨幣的基石，長期持有勝率極高，適合無腦定投累積。`
        });
        strategies.push({
            ...STRATEGIES.MACD_BREAKOUT,
            reason: "主流幣流動性佳，技術指標 (MACD) 的訊號準確度較高。"
        });
    } else if (isMeme) {
        // Memes: Grid, Volatility, Reversion
        strategies.push({
            ...STRATEGIES.GRID_TRADING,
            reason: `${symbol} 具有極高的日內波動率，是網格機器人刷單的絕佳標的。`
        });
        strategies.push({
            ...STRATEGIES.VOLATILITY_BREAKOUT,
            reason: "迷因幣常有爆發性行情，一旦突破關鍵位往往伴隨數倍漲幅。"
        });
        strategies.push({
            ...STRATEGIES.MEAN_REVERSION,
            reason: "暴漲之後必有暴跌，利用乖離率過大時進行反向操作利潤豐厚。"
        });
    } else {
        // Alts: Standard Mix
        if (isHighWinRate) {
            strategies.push({
                ...STRATEGIES.MEAN_REVERSION,
                reason: `歷史數據顯示 ${symbol} 回測勝率高達 ${asset.win_rate}%，顯示其價格規律性強，適合均值回歸。`
            });
        }

        strategies.push({
            ...STRATEGIES.MACD_BREAKOUT,
            reason: "適合捕捉中型市值的波段行情。"
        });

        if (isOversold) {
            strategies.push({
                ...STRATEGIES.Grid_TRADING, // Fallback or specific logic
                ...STRATEGIES.MEAN_REVERSION,
                reason: "目前 RSI 處於超賣區，反彈機率大。"
            });
        } else {
            strategies.push({
                ...STRATEGIES.GRID_TRADING,
                reason: "適合在目前的震盪區間內進行自動化套利。"
            });
        }
    }

    // Ensure we have 3 distinct strategies (dedupe if needed, though logic above separates well)
    // Fill with defaults if < 3
    if (strategies.length < 3) {
        strategies.push({
            ...STRATEGIES.TREND_FOLLOWING,
            reason: "通用策略，適合大多數行情。"
        });
    }

    return strategies.slice(0, 3);
}

function calculateVolatility(prices) {
    if (!prices || prices.length < 2) return 0;
    const changes = [];
    for (let i = 1; i < prices.length; i++) {
        changes.push(Math.abs((prices[i] - prices[i - 1]) / prices[i - 1]));
    }
    const avg = changes.reduce((a, b) => a + b, 0) / changes.length;
    return avg;
}

window.generateStrategies = generateStrategies;
