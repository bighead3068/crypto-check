const StrategyModal = ({ asset, onClose }) => {
    const [strategies, setStrategies] = React.useState([]);
    const [atr, setAtr] = React.useState(0);
    const [activeStrategy, setActiveStrategy] = React.useState(null);

    // Position Sizing State
    const [capital, setCapital] = React.useState(10000);
    const [riskPercent, setRiskPercent] = React.useState(1.0);
    const [atrMultiplier, setAtrMultiplier] = React.useState(2.0); // Default 2x ATR

    React.useEffect(() => {
        if (asset) {
            // Get history from global window.marketData
            const history = window.marketData && window.marketData[asset.symbol] ? window.marketData[asset.symbol] : [];

            // Generate Strategies
            const generatedStrategies = window.generateStrategies(asset, history);
            setStrategies(generatedStrategies);

            // Calculate ATR
            const calculatedATR = window.calculateATR(history, 14);
            setAtr(calculatedATR);
        }
    }, [asset]);

    if (!asset) return null;

    // Handle Apply Strategy
    const handleApply = (strat) => {
        setActiveStrategy(strat);

        // Adjust Calculator Params based on Strategy Logic (Heuristic)
        let newMultiplier = 2.0;
        let newRisk = 1.0;

        if (strat.name.includes("Trend Following")) {
            newMultiplier = 2.0; // Standard Trend
            newRisk = 1.0;
        } else if (strat.name.includes("Mean Reversion")) {
            newMultiplier = 1.5; // Tighter stop for revisions
            newRisk = 2.0; // Higher confidence/reward
        } else if (strat.name.includes("Grid") || strat.name.includes("網格")) {
            newMultiplier = 3.0; // Wide range for Grid
            newRisk = 5.0; // Allocating for grid
        } else if (strat.name.includes("Breakout")) {
            newMultiplier = 1.0; // Tight stop for breakout
            newRisk = 1.5;
        }

        setAtrMultiplier(newMultiplier);
        setRiskPercent(newRisk);

        if (window.showToast) {
            window.showToast(`已套用策略：${strat.name} (ATR x${newMultiplier}, Risk ${newRisk}%)`, 'success');
        }
    };

    // Position Sizing Calculations
    const stopLossDist = atrMultiplier * atr;
    const stopLossPrice = asset.current_price - stopLossDist;
    const riskAmount = capital * (riskPercent / 100);
    const positionSizeUnits = atr > 0 ? riskAmount / stopLossDist : 0;
    const positionSizeUsd = positionSizeUnits * asset.current_price;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/80 animate-backdrop backdrop-blur-sm"
                onClick={onClose}
            ></div>
            <div className="glass-panel w-full max-w-4xl rounded-2xl relative animate-modal overflow-hidden shadow-2xl ring-1 ring-white/10 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-white/10 bg-white/5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-purple-500/20">
                            {asset.symbol[0]}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">{asset.symbol} 策略推薦</h2>
                            <div className="text-sm text-gray-400">基於過往市場特性與波動分析</div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <IconX />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 overflow-y-auto custom-scrollbar bg-[#0f1115]">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {strategies.map((strat, idx) => {
                            const isActive = activeStrategy && activeStrategy.name === strat.name;
                            return (
                                <div key={idx} className={`rounded-xl border p-6 flex flex-col transition-all hover:-translate-y-1 group ${isActive
                                        ? 'bg-cyan-500/10 border-cyan-500 shadow-lg shadow-cyan-500/20'
                                        : 'bg-white/5 border-white/5 hover:border-cyan-500/30'
                                    }`}>
                                    <div className="mb-4">
                                        <div className="flex justify-between items-start">
                                            <h3 className={`text-lg font-bold mb-2 ${isActive ? 'text-cyan-300' : 'text-cyan-400'}`}>
                                                {strat.name}
                                            </h3>
                                            {isActive && <span className="px-2 py-0.5 bg-cyan-500 text-black text-[10px] font-bold rounded">ACTIVE</span>}
                                        </div>
                                        <p className="text-gray-300 text-sm leading-relaxed min-h-[60px]">{strat.desc}</p>
                                    </div>

                                    <div className="space-y-4 flex-1">
                                        <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">推薦理由</div>
                                            <div className="text-xs text-emerald-300 leading-relaxed font-medium">
                                                {strat.reason}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">建議參數</div>
                                            <div className="text-sm font-mono text-white bg-white/5 px-2 py-1.5 rounded border border-white/5">
                                                {strat.params}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">風險提示</div>
                                            <div className="text-xs text-rose-300 flex items-start gap-1">
                                                <IconAlertTriangle size={12} className="mt-0.5 shrink-0" />
                                                {strat.risk}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-4 border-t border-white/5">
                                        <button
                                            onClick={() => handleApply(strat)}
                                            className={`w-full py-2 text-sm font-bold rounded-lg transition-all shadow-lg active:scale-95 ${isActive
                                                    ? 'bg-green-600 text-white shadow-green-500/20 cursor-default'
                                                    : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-500/20'
                                                }`}>
                                            {isActive ? '已套用 (Applied)' : '套用此策略'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Position Sizing Calculator */}
                    <div className="mt-8 p-6 bg-gray-900/50 rounded-xl border border-gray-700/50 relative overflow-hidden">
                        {/* Background indicator for active strategy */}
                        {activeStrategy && (
                            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                                <div className="text-4xl font-bold text-cyan-500">{activeStrategy.name}</div>
                            </div>
                        )}

                        <div className="flex items-center gap-2 mb-4 text-purple-400">
                            <i data-lucide="calculator" className="w-5 h-5"></i>
                            <h3 className="font-bold text-lg">
                                AI 倉位管理 {activeStrategy ? `(${activeStrategy.name.split(' ')[0]})` : '(ATR-Based)'}
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Inputs */}
                            <div className="space-y-4">
                                <div>
                                    <label className="text-gray-400 text-sm block mb-1">交易本金 (USD)</label>
                                    <input
                                        type="number"
                                        value={capital}
                                        onChange={(e) => setCapital(parseFloat(e.target.value) || 0)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:border-purple-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-gray-400 text-sm block mb-1">單筆風險 (%)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={riskPercent}
                                            onChange={(e) => setRiskPercent(parseFloat(e.target.value) || 0)}
                                            className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:border-purple-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-sm block mb-1">止損倍數 (xATR)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={atrMultiplier}
                                            onChange={(e) => setAtrMultiplier(parseFloat(e.target.value) || 0)}
                                            className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:border-purple-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Results */}
                            <div className="bg-black/30 p-4 rounded-lg border border-gray-700/30 flex flex-col justify-center space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">當前波動 (ATR)</span>
                                    <span className="text-yellow-400 font-mono">${window.formatNumber(atr)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">建議止損價 (Stop Loss)</span>
                                    <span className="text-red-400 font-mono">${window.formatNumber(stopLossPrice)}</span>
                                </div>
                                <div className="h-px bg-gray-700/50 my-2"></div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-300 font-bold">建議開倉規模</span>
                                    <div className="text-right">
                                        <div className="text-xl font-bold text-green-400 font-mono">
                                            {window.formatCurrency(positionSizeUsd)}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {window.formatNumber(positionSizeUnits)} {asset.symbol}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};

window.StrategyModal = StrategyModal;
