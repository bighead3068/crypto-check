const Sidebar = ({ view, setView, simulatedPrice, handleSimulationChange, applySimulation, resetSimulation, simulationMode, data }) => {
    return (
        <aside className="w-64 glass-panel border-r border-border flex flex-col p-4 z-20">
            <div className="flex items-center gap-3 mb-10 px-2 mt-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold">
                    A
                </div>
                <span className="text-lg font-bold text-white tracking-tight">Antigravity</span>
            </div>

            {/* Market Briefing (AI) */}
            {data && data.briefing && (
                <div className="mb-8 p-4 bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-500/20 rounded-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-50">
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="cyan" strokeWidth="0.5">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M12 2a15 15 0 0 1 9 10 15 15 0 0 1-9 10 15 15 0 0 1-9-10 15 15 0 0 1 9-10z"></path>
                        </svg>
                    </div>
                    <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                        AI 每日快訊
                    </h3>
                    <div className="text-xs font-semibold text-white mb-2">{data.briefing.title}</div>
                    <p className="text-[10px] text-gray-300 leading-relaxed font-mono opacity-80">
                        {data.briefing.summary}
                    </p>
                    <div className="mt-2 text-[9px] text-gray-500 text-right">{data.briefing.timestamp}</div>
                </div>
            )}

            <nav className="flex-1 space-y-1">
                <div
                    onClick={() => setView('dashboard')}
                    className={`nav-item px-3 py-2 rounded-md flex items-center gap-3 cursor-pointer transition-all hover:bg-white/5 ${view === 'dashboard' ? 'active' : 'opacity-60'}`}
                >
                    <IconActivity />
                    <span className="font-medium">市場儀表板</span>
                </div>
                <div
                    onClick={() => setView('charts')}
                    className={`nav-item px-3 py-2 rounded-md flex items-center gap-3 cursor-pointer transition-all hover:bg-white/5 ${view === 'charts' ? 'active' : 'opacity-60'}`}
                >
                    <IconActivity />
                    <span className="font-medium">TradingView 行情</span>
                </div>
                <div
                    onClick={() => setView('backtest')}
                    className={`nav-item px-3 py-2 rounded-md flex items-center gap-3 cursor-pointer transition-all hover:bg-white/5 ${view === 'backtest' ? 'active' : 'opacity-60'}`}
                >
                    <IconBox />
                    <span className="font-medium">歷史回測</span>
                </div>
                {/* Scenario Simulator */}
                <div className="mt-8 pt-8 border-t border-white/5">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">情境模擬 (Simulator)</h3>
                    <div className="px-2">
                        <div className="mb-2 flex justify-between text-sm">
                            <span className="text-gray-400">BTC 目標價</span>
                            <span className="text-cyan-400 font-mono font-bold">{simulatedPrice ? formatMoney(simulatedPrice) : '-'}</span>
                        </div>
                        <input
                            type="range"
                            min="10000"
                            max="200000"
                            step="1000"
                            value={simulatedPrice || 0}
                            onChange={handleSimulationChange}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400 mb-4"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={applySimulation}
                                className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-600 text-black font-bold rounded text-xs transition-colors"
                            >
                                開始模擬
                            </button>
                            {simulationMode && (
                                <button
                                    onClick={resetSimulation}
                                    className="py-2 px-3 bg-white/10 hover:bg-white/20 text-white rounded text-xs transition-colors"
                                >
                                    重置
                                </button>
                            )}
                        </div>
                        {simulationMode && (
                            <div className="mt-3 text-[10px] text-yellow-400/80 leading-relaxed border border-yellow-400/20 bg-yellow-400/5 p-2 rounded">
                                ⚠️ 現在是模擬模式。所有分析皆基於假設 BTC = {formatMoney(simulatedPrice)} 的情境。
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            <div className="mt-auto px-2 py-4 border-t border-white/5">
                <div className="text-xs text-gray-500 mb-2">TARGET BTC PRICE</div>
                <div className="text-xl font-bold text-white font-mono">
                    {data ? formatMoney(data.target_btc) : 'Loading...'}
                </div>
                <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    Live Connection
                </div>
            </div>
        </aside>
    );
};

window.Sidebar = Sidebar;
