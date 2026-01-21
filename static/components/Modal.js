const { useRef, useEffect, useState } = React;

const Modal = ({ selectedAsset, setSelectedAsset }) => {
    const chartContainerRef = useRef(null);
    const [chartData, setChartData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (selectedAsset) {
            fetchHistory(selectedAsset.symbol);
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
                    // Format for Lightweight Charts (needs {time, open, high, low, close})
                    const candlestick = history.map(h => ({
                        time: h.date, // 'yyyy-mm-dd'
                        open: h.open,
                        high: h.high,
                        low: h.low,
                        close: h.close
                    })).sort((a, b) => new Date(a.time) - new Date(b.time)); // Ensure ascending order

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

                    <div className="grid grid-cols-2 gap-4">
                        {/* Sniper Score Badge */}
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
