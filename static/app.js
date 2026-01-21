const { useState, useEffect } = React;

function App() {
    const [view, setView] = useState('dashboard'); // 'dashboard' | 'backtest'
    // TradingView handles data internally, so major state is removed.

    return (
        <div className="flex w-screen h-screen bg-bg text-gray-300">
            {/* Sidebar - Simplified for now */}
            <div className="w-80 glass-sidebar border-r border-white/10 flex flex-col p-6 hidden md:flex">
                <div className="mb-10 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                        <IconActivity />
                    </div>
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        Crypto Check
                    </h1>
                </div>

                <nav className="space-y-2 flex-1">
                    <button
                        onClick={() => setView('dashboard')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${view === 'dashboard' ? 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 text-white shadow-lg shadow-cyan-500/5' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}
                    >
                        <div className={`${view === 'dashboard' ? 'text-cyan-400' : 'text-gray-500 group-hover:text-gray-300'}`}>
                            <IconLayoutDashboard />
                        </div>
                        <span className="font-medium">市場儀表板</span>
                    </button>

                    {/* Backtest View - Kept for future reference but currently empty */}
                    <button
                        onClick={() => setView('backtest')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${view === 'backtest' ? 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 text-white shadow-lg shadow-cyan-500/5' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}
                    >
                        <div className={`${view === 'backtest' ? 'text-cyan-400' : 'text-gray-500 group-hover:text-gray-300'}`}>
                            <IconHistory />
                        </div>
                        <span className="font-medium">歷史數據 (Coming Soon)</span>
                    </button>
                </nav>

                <div className="mt-auto pt-6 border-t border-white/5">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-white/5 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <h4 className="font-bold text-white mb-1 relative z-10 flex items-center gap-2">
                            <IconZap /> Pro 數據源
                        </h4>
                        <p className="text-xs text-gray-400 relative z-10">
                            Powered by TradingView
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-auto relative">
                {/* Background Glow */}
                <div className="absolute top-[-20%] left-[20%] w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[128px] pointer-events-none"></div>
                <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[128px] pointer-events-none"></div>

                <div className="p-8 h-full flex flex-col relative z-10">
                    {/* Header */}
                    <header className="flex justify-between items-end mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">
                                {view === 'dashboard' ? '加密貨幣即時行情' : '歷史回測'}
                            </h1>
                            <p className="text-gray-400">
                                {view === 'dashboard' ? '即時追蹤市場趨勢與技術評級' : '功能開發中...'}
                            </p>
                        </div>
                    </header>

                    {/* View Content */}
                    <div className="flex-1 min-h-0">
                        {view === 'dashboard' && (
                            <Dashboard />
                        )}

                        {view === 'backtest' && (
                            <div className="h-full flex items-center justify-center text-gray-500">
                                <div>
                                    <IconClock />
                                    <p className="mt-2">歷史回測功能正在升級 TradingView 引擎...</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
