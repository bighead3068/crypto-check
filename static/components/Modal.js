const { useRef, useEffect, useState } = React;

const Modal = ({ selectedAsset, setSelectedAsset }) => {
    const chartContainerRef = useRef(null);
    const [chartData, setChartData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [analysis, setAnalysis] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);

    useEffect(() => {
        if (selectedAsset) {
            fetchHistory(selectedAsset.symbol);
            setAnalysis(null); // Reset analysis on new asset
        }
    }, [selectedAsset]);

    useEffect(() => {
        if (!chartContainerRef.current || !chartData) return;

        // Ensure global is available
        if (!window.LightweightCharts) {
            console.error("LightweightCharts library not found");
            return;
        }

        let chart;
        try {
            console.log("Creating chart with data:", chartData);

            chart = window.LightweightCharts.createChart(chartContainerRef.current, {
                layout: {
                    background: { type: 'solid', color: 'transparent' },
                    textColor: '#9ca3af',
                },
                grid: {
                    vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
                    horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
                },
                width: chartContainerRef.current.clientWidth,
                height: 320,
                timeScale: {
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    timeVisible: true,
                },
                rightPriceScale: {
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    scaleMargins: {
                        top: 0.1,
                        bottom: 0.2,
                    },
                },
            });

            // Candlestick Series (v5 API)
            const candlestickSeries = chart.addSeries(window.LightweightCharts.CandlestickSeries, {
                upColor: '#10b981',
                downColor: '#ef4444',
                borderVisible: false,
                wickUpColor: '#10b981',
                wickDownColor: '#ef4444',
            });
            candlestickSeries.setData(chartData.candlestick);

            // Volume Series (v5 API)
            const volumeSeries = chart.addSeries(window.LightweightCharts.HistogramSeries, {
                color: '#26a69a',
                priceFormat: {
                    type: 'volume',
                },
                priceScaleId: 'volume',
            });

            // Configure Volume Scale to appear at bottom
            chart.priceScale('volume').applyOptions({
                scaleMargins: {
                    top: 0.8, // Place at bottom 20%
                    bottom: 0,
                },
            });

            if (chartData.volume) {
                volumeSeries.setData(chartData.volume);
            }

            // Fit Content
            chart.timeScale().fitContent();

        } catch (err) {
            console.error("Error creating chart:", err);
        }

        // Resize handler
        const handleResize = () => {
            if (chartContainerRef.current && chart) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            if (chart) chart.remove();
        };

    }, [chartData]);

    const fetchHistory = async (symbol) => {
        setLoading(true);
        try {
            // Use client-side fetcher instead of missing backend API
            if (window.fetchHistoricalData) {
                const history = await window.fetchHistoricalData(symbol);
                if (history && history.length > 0) {
                    // Format for Lightweight Charts
                    const candlestick = history.map(h => ({
                        time: h.date, // 'yyyy-mm-dd'
                        open: h.open,
                        high: h.high,
                        low: h.low,
                        close: h.close
                    })).sort((a, b) => new Date(a.time) - new Date(b.time));

                    const volume = history.map(h => ({
                        time: h.date,
                        value: h.volume,
                        color: h.close >= h.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
                    })).sort((a, b) => new Date(a.time) - new Date(b.time));

                    setChartData({ candlestick, volume });
                }
            } else {
                console.error("fetchHistoricalData not found in window");
            }
        } catch (e) {
            console.error("Failed to load chart data", e);
        } finally {
            setLoading(false);
        }
    };

    const [error, setError] = React.useState(null);
    const [showKeyInput, setShowKeyInput] = React.useState(false);
    const [userApiKey, setUserApiKey] = React.useState(localStorage.getItem("GEMINI_USER_KEY") || "");

    const saveKeyAndRetry = () => {
        if (!userApiKey.trim()) return;
        localStorage.setItem("GEMINI_USER_KEY", userApiKey.trim());
        setShowKeyInput(false);
        runAIAnalysis("ai", true); // Retry with direct client mode
    };

    const runDirectClientAI = async (payload) => {
        const key = localStorage.getItem("GEMINI_USER_KEY");
        if (!key) {
            setShowKeyInput(true);
            throw new Error("請輸入 API Key 以在網頁版啟用 AI 功能");
        }

        const prompt = `You are a crypto analyst. Analyze this asset: ${payload.symbol}, Price: ${payload.price}, RSI: ${payload.rsi}, MACD: ${payload.macd_signal}, Val Gap: ${payload.diff_percent}%. Response JSON ONLY: {title, summary, support_resistance, action, confidence(0-100)}. Use Traditional Chinese.`;

        // Retry strategy: Try newer models first, fall back to stable ones
        const models = [
            "gemini-2.5-flash",
            "gemini-2.0-flash",
            "gemini-1.5-flash",
            "gemini-1.5-pro"
        ];

        let lastError = null;

        for (const model of models) {
            try {
                // console.log(`Trying model: ${model}`);
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { response_mime_type: "application/json" }
                    })
                });

                if (!response.ok) {
                    if (response.status === 400 || response.status === 403) {
                        localStorage.removeItem("GEMINI_USER_KEY");
                        setShowKeyInput(true);
                        throw new Error("API Key 無效或過期，請重新輸入");
                    }
                    // For 503 or 404, throw to trigger fallback to next model
                    const errDetail = await response.text();
                    throw new Error(`Model ${model} failed with ${response.status}: ${errDetail}`);
                }

                const data = await response.json();
                const text = data.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
                const parsed = JSON.parse(text);
                parsed.source = `AI (${model} / Client)`;
                return parsed;

            } catch (e) {
                console.warn(`Attempt with ${model} failed:`, e);
                lastError = e;
                // If it's an Auth error, stop immediately, don't retry others
                if (e.message.includes("Key 無效")) throw e;
            }
        }

        throw new Error(lastError?.message || "所有 AI 模型皆暫時無法使用，請稍後再試");
    };

    const runAIAnalysis = async (mode = "auto", forceClient = false) => {
        if (!selectedAsset) return;
        setAnalysis(null);
        setError(null);
        setAnalyzing(true);

        try {
            const payload = {
                symbol: selectedAsset.symbol,
                price: selectedAsset.current_price,
                rsi: selectedAsset.rsi,
                macd_signal: selectedAsset.macd.macd > selectedAsset.macd.signal ? "bullish" : "bearish",
                diff_percent: selectedAsset.diff_percent,
                status: selectedAsset.status,
                volume_ratio: selectedAsset.volume_ratio,
                mode: mode
            };

            // Force client mode if on GitHub Pages or if backend failed previously
            const isStaticSite = window.location.hostname.includes("github.io");

            if (forceClient || isStaticSite) {
                const result = await runDirectClientAI(payload);
                setAnalysis(result);
                return;
            }

            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                // If backend 404s (e.g. static site) or fails, try client-side fallback
                if (response.status === 404 || response.status === 405) {
                    console.warn("Backend missing, switching to Client-Side AI...");
                    const result = await runDirectClientAI(payload);
                    setAnalysis(result);
                    return;
                }
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.detail || "AI 分析服務暫時無法使用");
            }

            const result = await response.json();
            setAnalysis(result);

        } catch (e) {
            console.error("Analysis failed", e);
            setError(e.message);
            // window.showToast(e.message, "error"); // Optional: Keep toast or rely on UI
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 animate-backdrop"
                onClick={() => setSelectedAsset(null)}
            ></div>
            <div className="glass-panel w-full max-w-2xl rounded-2xl relative animate-modal overflow-hidden shadow-2xl ring-1 ring-white/10 flex flex-col max-h-[90vh]">
                {/* Modal Header */}
                <div className="p-6 border-b border-white/10 bg-white/5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-cyan-500/20">
                            {selectedAsset.symbol[0]}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">{selectedAsset.symbol}</h2>
                            <div className="text-sm text-gray-400 font-mono">{formatMoney(selectedAsset.current_price)}</div>
                        </div>
                    </div>
                    <button
                        onClick={() => setSelectedAsset(null)}
                        className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <IconX />
                    </button>
                </div>

                {/* Modal Body (Scrollable) */}
                <div className="p-6 overflow-y-auto custom-scrollbar">

                    {/* Chart Container */}
                    <div className="mb-6 bg-black/20 rounded-xl border border-white/5 overflow-hidden relative" style={{ height: '320px' }}>
                        {loading && (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                                <div className="animate-spin w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full mr-2"></div>
                                載入圖表數據...
                            </div>
                        )}
                        <div ref={chartContainerRef} className="w-full h-full"></div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        {/* Sniper Score (Full Width) */}
                        <div className="col-span-2 flex items-center justify-between bg-white/5 rounded-xl p-4 border border-white/5">
                            <div>
                                <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">狙擊評分 (Sniper Score)</div>
                                <div className="text-xs text-gray-500">綜合動能、相關性與價值分析</div>
                            </div>
                            <div className="text-right">
                                <div className={`text-5xl font-bold font-mono ${selectedAsset.sniper_score > 80 ? 'text-cyan-400' : selectedAsset.sniper_score > 50 ? 'text-emerald-400' : 'text-gray-400'}`}>
                                    {selectedAsset.sniper_score}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">RSI (動能)</div>
                            <div className="flex items-center justify-between">
                                <span className={`text-xl font-bold font-mono ${selectedAsset.rsi < 30 ? 'text-emerald-400' : selectedAsset.rsi > 70 ? 'text-rose-400' : 'text-white'}`}>
                                    {selectedAsset.rsi.toFixed(1)}
                                </span>
                                {selectedAsset.rsi < 30 && <span className="px-2 py-1 rounded text-xs bg-emerald-500/20 text-emerald-400 font-bold">超賣區</span>}
                                {selectedAsset.rsi > 70 && <span className="px-2 py-1 rounded text-xs bg-rose-500/20 text-rose-400 font-bold">超買區</span>}
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">量能 (Volume)</div>
                            <div className="flex items-center justify-between">
                                <span className="text-xl font-bold font-mono text-white">{selectedAsset.volume_ratio.toFixed(1)}x</span>
                                {selectedAsset.volume_ratio > 1.5 ?
                                    <span className="text-cyan-400 text-xs font-bold flex items-center gap-1">🔥 放量</span> :
                                    <span className="text-gray-500 text-xs">平穩</span>
                                }
                            </div>
                        </div>
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">歷史勝率</div>
                            <div className={`text-xl font-bold font-mono ${selectedAsset.win_rate > 60 ? 'text-emerald-400' : 'text-white'}`}>
                                {selectedAsset.win_rate.toFixed(1)}%
                            </div>
                        </div>
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">潛在漲幅</div>
                            <div className={`text-xl font-bold font-mono ${selectedAsset.potential_upside > 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
                                {selectedAsset.potential_upside > 0 ? '+' : ''}{selectedAsset.potential_upside.toFixed(1)}%
                            </div>
                        </div>
                    </div>

                    {/* AI Analysis Section */}
                    <div className="border-t border-white/10 pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <IconActivity /> AI 深度分析
                            </h3>
                            {!analysis && !analyzing && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => runAIAnalysis("local")}
                                        className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-lg transition-all flex items-center gap-2"
                                    >
                                        <IconCpu /> <span>📊 公式運算</span>
                                    </button>
                                    <button
                                        onClick={() => runAIAnalysis("ai")}
                                        className="px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-bold rounded-lg transition-all shadow-lg hover:shadow-cyan-500/25 flex items-center gap-2"
                                    >
                                        <IconActivity /> <span>✨ AI 深度分析</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {showKeyInput && (
                            <div className="p-6 rounded-xl bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border border-indigo-500/30 text-center animate-fade-in-up">
                                <IconCpu className="w-8 h-8 text-indigo-400 mx-auto mb-3" />
                                <h4 className="text-white font-bold mb-2">啟用網頁版 AI 功能</h4>
                                <p className="text-gray-300 text-xs mb-4">
                                    由於 GitHub Pages 是靜態網站，請輸入您的 Gemini API Key 以直接連線 Google 伺服器。<br />
                                    <span className="opacity-50">(Key 僅儲存於您的瀏覽器，不會上傳)</span>
                                </p>
                                <input
                                    type="password"
                                    value={userApiKey}
                                    onChange={(e) => setUserApiKey(e.target.value)}
                                    placeholder="貼上 API Key (AIza...)"
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm mb-3 focus:border-indigo-500 outline-none"
                                />
                                <div className="flex gap-2 justify-center">
                                    <button
                                        onClick={() => setShowKeyInput(false)}
                                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-300 text-sm rounded-lg"
                                    >
                                        取消
                                    </button>
                                    <button
                                        onClick={saveKeyAndRetry}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg shadow-lg"
                                    >
                                        儲存並分析
                                    </button>
                                </div>
                            </div>
                        )}

                        {analyzing && (
                            <div className="p-8 rounded-xl bg-white/5 border border-white/10 text-center animate-pulse">
                                <div className="text-cyan-400 font-mono text-sm mb-2">AI 正在解讀市場數據...</div>
                                <div className="w-48 h-1 bg-gray-700 rounded-full mx-auto overflow-hidden">
                                    <div className="w-1/2 h-full bg-cyan-500 animate-slide"></div>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center animate-fade-in-up">
                                <div className="text-red-400 font-bold mb-1">分析失敗</div>
                                <div className="text-red-300 text-sm mb-3">{error}</div>
                                <button
                                    onClick={() => runAIAnalysis("local")}
                                    className="px-4 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-bold rounded-lg transition-all"
                                >
                                    使用公式運算 (Fallback)
                                </button>
                            </div>
                        )}

                        {analysis && (
                            <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-xl border border-white/10 overflow-hidden animate-fade-in-up">
                                <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                                    <h4 className="font-bold text-cyan-300">{analysis.title}</h4>
                                    <div className="flex gap-2">
                                        {analysis.source && (
                                            <span className={`px-2 py-0.5 text-xs rounded font-mono font-bold border ${analysis.source.includes("AI") ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
                                                {analysis.source === "AI" ? "⚡ AI Model" : analysis.source}
                                            </span>
                                        )}
                                        <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded font-mono">
                                            信心指數: {analysis.confidence}%
                                        </span>
                                    </div>
                                </div>
                                <div className="p-5 space-y-4">
                                    <p className="text-gray-300 leading-relaxed text-sm">
                                        {analysis.summary}
                                    </p>

                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div className="bg-black/40 p-3 rounded-lg border border-white/5">
                                            <div className="text-xs text-gray-500 mb-1">關鍵點位</div>
                                            <div className="text-sm font-mono text-white">{analysis.support_resistance}</div>
                                        </div>
                                        <div className="bg-black/40 p-3 rounded-lg border border-white/5">
                                            <div className="text-xs text-gray-500 mb-1">建議操作</div>
                                            <div className={`text-sm font-bold ${analysis.action.includes("Buy") || analysis.action.includes("買") ? 'text-green-400' : analysis.action.includes("Sell") ? 'text-red-400' : 'text-yellow-400'}`}>
                                                {analysis.action}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 bg-white/5 border-t border-white/5 text-center shrink-0">
                    <button
                        onClick={() => setSelectedAsset(null)}
                        className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors"
                    >
                        關閉
                    </button>
                </div>
            </div>
        </div>
    );
};
window.Modal = Modal;
