const { useState, useEffect } = React;

function App() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [targetBtc, setTargetBtc] = useState(null); // The actual target used for calculation
    const [currentBtc, setCurrentBtc] = useState(null); // Real market price
    const [simulationMode, setSimulationMode] = useState(false);
    const [simulatedPrice, setSimulatedPrice] = useState(100000); // Default placeholder
    const [view, setView] = useState('dashboard'); // 'dashboard' | 'backtest'
    const [selectedAsset, setSelectedAsset] = useState(null); // For Modal

    useEffect(() => {
        fetchAnalysis();
    }, []);

    const fetchAnalysis = async (customTarget = null) => {
        setLoading(true);
        try {
            let url = '/api/analysis';
            if (customTarget) {
                url += `?target_btc=${customTarget}`;
            }
            const res = await fetch(url);
            const json = await res.json();
            setData(json);
            setTargetBtc(json.target_btc);
            if (json.current_btc && !currentBtc) {
                setCurrentBtc(json.current_btc);
                setSimulatedPrice(json.current_btc); // Initialize slider to real price
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSimulationChange = (e) => {
        setSimulatedPrice(Number(e.target.value));
    };

    const applySimulation = () => {
        setSimulationMode(true);
        fetchAnalysis(simulatedPrice);
    };

    const resetSimulation = () => {
        setSimulationMode(false);
        setSimulatedPrice(currentBtc);
        fetchAnalysis(null);
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
                    {/* Header */}
                    <header className="flex justify-between items-end mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">
                                {view === 'dashboard' ? '加密貨幣價值分析' : '歷史回測詳情'}
                            </h1>
                            <p className="text-gray-400">
                                {view === 'dashboard' ? '基於比特幣歷史對位模型 (BTC Correlation Model)' : '檢視系統選用的歷史匹配日期與價格快照'}
                                {data && <span className="ml-2 px-2 py-0.5 rounded-full bg-white/10 text-xs">匹配樣本數: {data.match_count} 天</span>}
                            </p>
                        </div>
                        <button
                            onClick={() => fetchAnalysis()}
                            className="px-4 py-2 bg-white text-black hover:bg-gray-200 transaction-colors rounded-full font-medium text-sm flex items-center gap-2"
                        >
                            刷新數據
                        </button>
                    </header>

                    {/* View Content */}
                    {loading ? (
                        <div className="p-12 text-center text-gray-500 glass-panel rounded-2xl">
                            <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                            正在分析鏈上數據...
                        </div>
                    ) : (
                        <>
                            {view === 'dashboard' && (
                                <Dashboard data={data} setSelectedAsset={setSelectedAsset} />
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
