const { useState, useEffect } = React;

function App() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [targetBtc, setTargetBtc] = useState(null);
    const [currentBtc, setCurrentBtc] = useState(null);
    const [simulationMode, setSimulationMode] = useState(false);
    const [simulatedPrice, setSimulatedPrice] = useState(100000);
    const [view, setView] = useState('dashboard'); // 'dashboard' | 'backtest' | 'charts'
    const [selectedAsset, setSelectedAsset] = useState(null);

    const [marketData, setMarketData] = useState({}); // Keep raw data in state
    const [wsStatus, setWsStatus] = useState("DISCONNECTED");
    const [timeframe, setTimeframe] = useState("1d");

    // Toast State
    const [toast, setToast] = useState(null); // { message, type }

    // Expose showToast globally
    useEffect(() => {
        window.showToast = (message, type = 'success') => {
            setToast({ message, type });
            setTimeout(() => setToast(null), 3000);
        };
    }, []);

    // Re-fetch when timeframe changes (except initial which is handled below or by this effect)
    useEffect(() => {
        fetchFullHistory();
    }, [timeframe]);

    // Expose marketData to window for StrategyModal to access history
    useEffect(() => {
        window.marketData = marketData;
    }, [marketData]);

    useEffect(() => {
        // WebSocket logic (unchanged)
        let ws = null;

        // WebSocket Connection for Analysis Data (Restored)
        if (window.connectWS) {
            ws = window.connectWS(
                (livePrices) => {
                    if (simulationMode) return;
                    setMarketData(prevData => {
                        if (!prevData || Object.keys(prevData).length === 0) return prevData;
                        const updatedData = window.updateMarketData(prevData, livePrices);
                        runAnalysis(updatedData);
                        return updatedData;
                    });
                },
                (status) => setWsStatus(status)
            );
        }
        return () => { if (ws) ws.close(); };
    }, []);

    // Fetches full history based on current timeframe
    const fetchFullHistory = async () => {
        if (!loading && simulationMode) return;

        // Only set loading if we don't have data or explicitly switching context
        setLoading(true);

        try {
            if (!window.SYMBOLS || !window.fetchHistoricalData || !window.calculateAnalysis) {
                console.warn("Utils not loaded, retrying...");
                setTimeout(fetchFullHistory, 500);
                return;
            }

            const symbols = window.SYMBOLS;
            const newMarketData = {};

            // Fetch all concurrently with timeframe
            await Promise.all(symbols.map(async (sym) => {
                const history = await window.fetchHistoricalData(sym, timeframe);
                if (history && history.length > 0) {
                    newMarketData[sym] = history;
                }
            }));

            setMarketData(newMarketData);
            runAnalysis(newMarketData);

        } catch (e) {
            console.error("History Fetch Error:", e);
        } finally {
            setLoading(false);
        }
    };

    // Derived Analysis
    const runAnalysis = (currentData, customTarget = null) => {
        if (!currentData) return;

        // Use simulation target if active and no custom passed
        // If in simulation mode, we ignore live updates anyway in the WS callback

        const result = window.calculateAnalysis(currentData, customTarget);
        if (result) {
            setData(result);
            if (!simulationMode) {
                setTargetBtc(result.target_btc);
                setCurrentBtc(result.current_btc);
                setSimulatedPrice(result.current_btc);
            }
        }
    };

    // Legacy adapter for button click "Refresh Data"
    const fetchAnalysis = (customTarget = null) => {
        // If user manually clicks refresh, do full history fetch
        fetchFullHistory();
    };

    const handleSimulationChange = (e) => {
        setSimulatedPrice(Number(e.target.value));
    };

    const applySimulation = () => {
        setSimulationMode(true);
        // Recalculate with simulated price target
        runAnalysis(marketData, simulatedPrice);
    };

    const resetSimulation = () => {
        setSimulationMode(false);
        setSimulatedPrice(currentBtc);
        runAnalysis(marketData, null);
    };

    return (
        <div className="flex w-screen h-screen bg-bg text-gray-300">
            {/* Sidebar */}
            <Sidebar
                view={view}
                setView={setView}
                simulatedPrice={simulatedPrice}
                handleSimulationChange={handleSimulationChange}
                applySimulation={applySimulation}
                resetSimulation={resetSimulation}
                simulationMode={simulationMode}
                data={data}
            />

            {/* Main Content */}
            <main className="flex-1 overflow-auto relative">
                {/* Background Glow */}
                <div className="absolute top-[-20%] left-[20%] w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[128px] pointer-events-none"></div>
                <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[128px] pointer-events-none"></div>

                <div className="p-8 max-w-7xl mx-auto relative z-10">
                    {/* Toast Notification */}
                    {toast && (
                        <div className="fixed top-8 right-8 z-50 animate-fade-in-down">
                            <div className={`glass-panel px-6 py-4 rounded-xl border flex items-center gap-3 shadow-2xl ${toast.type === 'success' ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                                }`}>
                                {toast.type === 'success' ? (
                                    <i data-lucide="check-circle" className="w-5 h-5"></i>
                                ) : (
                                    <i data-lucide="info" className="w-5 h-5"></i>
                                )}
                                <span className="font-bold">{toast.message}</span>
                            </div>
                        </div>
                    )}

                    {/* Header */}
                    <header className="flex justify-between items-end mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">
                                {view === 'dashboard' ? '加密貨幣價值分析' : view === 'charts' ? 'TradingView 行情' : '歷史回測詳情'}
                            </h1>
                            <p className="text-gray-400">
                                {view === 'dashboard' ? '基於比特幣歷史對位模型 (BTC Correlation Model)' : view === 'charts' ? '專業級可視化圖表' : '檢視系統選用的歷史匹配日期與價格快照'}
                                {data && view !== 'charts' && <span className="ml-2 px-2 py-0.5 rounded-full bg-white/10 text-xs">匹配樣本數: {data.match_count} 天</span>}
                                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${wsStatus === 'CONNECTED' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {wsStatus === 'CONNECTED' ? '● Live' : '○ Offline'}
                                </span>
                            </p>
                        </div>

                    </header>

                    {/* View Content */}
                    {loading ? (
                        <div className="p-12 text-center text-gray-500 glass-panel rounded-2xl">
                            <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                            正在從 Binance 獲取即時數據...
                        </div>
                    ) : (
                        <>
                            {view === 'dashboard' && (
                                <Dashboard
                                    data={data}
                                    setSelectedAsset={setSelectedAsset}
                                    timeframe={timeframe}
                                    setTimeframe={setTimeframe}
                                />
                            )}

                            {view === 'charts' && (
                                <div className="h-[800px] glass-panel p-1 rounded-2xl overflow-hidden">
                                    {/* This uses the definition from TradingViewWidget.js */}
                                    <TradingViewWidget />
                                </div>
                            )}

                            {view === 'backtest' && (
                                <Backtest data={data} />
                            )}
                        </>
                    )}
                </div>

                {/* Modal */}
                {selectedAsset && (
                    <Modal selectedAsset={selectedAsset} setSelectedAsset={setSelectedAsset} />
                )}
            </main>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
