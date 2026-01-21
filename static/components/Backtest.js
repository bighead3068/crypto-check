const Backtest = ({ data }) => {
    const [selectedStrategyAsset, setSelectedStrategyAsset] = React.useState(null);

    return (
        <div className="space-y-6 animate-fade-in relative">
            {/* Strategy Modal */}
            {selectedStrategyAsset && (
                <StrategyModal
                    asset={selectedStrategyAsset}
                    onClose={() => setSelectedStrategyAsset(null)}
                />
            )}

            {/* Smart Analysis Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data && data.results.map((item) => (
                    <div
                        key={item.symbol}
                        onClick={() => setSelectedStrategyAsset(item)}
                        className="glass-panel p-6 rounded-2xl relative overflow-hidden group hover:border-cyan-500/30 transition-all cursor-pointer"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-white">
                                    {item.symbol[0]}
                                </div>
                                <div>
                                    <div className="font-bold text-white text-lg">{item.symbol}</div>
                                    <div className="text-xs text-gray-400">當前: {formatMoney(item.current_price)}</div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-6 mb-2">
                            <div>
                                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">歷史勝率 (Win Rate)</div>
                                <div className={`text-xl font-bold font-mono ${item.win_rate > 60 ? 'text-emerald-400' : 'text-white'}`}>
                                    {item.win_rate ? item.win_rate.toFixed(1) : '0.0'}%
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">潛在漲幅 (Upside)</div>
                                <div className={`text-xl font-bold font-mono ${item.potential_upside > 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
                                    {item.potential_upside > 0 ? '+' : ''}{item.potential_upside ? item.potential_upside.toFixed(1) : '0.0'}%
                                </div>
                            </div>

                            {/* New Stats Row */}
                            <div>
                                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">RSI (動能)</div>
                                <div className={`text-sm font-bold font-mono flex items-center gap-2`}>
                                    <span className={`${item.rsi < 30 ? 'text-emerald-400' : item.rsi > 70 ? 'text-red-400' : 'text-white'}`}>
                                        {item.rsi.toFixed(1)}
                                    </span>
                                    {item.rsi < 30 && <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400">超賣</span>}
                                    {item.rsi > 70 && <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/20 text-red-400">超買</span>}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">量能 (Volume)</div>
                                <div className="text-sm font-bold font-mono">
                                    {item.volume_ratio > 1.5 ? (
                                        <span className="text-cyan-400 flex items-center gap-1">
                                            🔥 放量 ({item.volume_ratio.toFixed(1)}x)
                                        </span>
                                    ) : (
                                        <span className="text-gray-400">
                                            平穩 ({item.volume_ratio.toFixed(1)}x)
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Status Badges */}
                        <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-2">
                            <div className={`px-2 py-1 rounded text-[10px] font-bold ${item.status === 'Undervalued' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-gray-400'}`}>
                                {item.status === 'Undervalued' ? '推薦買入' : '觀察中'}
                            </div>
                            {item.correlation && item.correlation > 0.8 && (
                                <div className="px-2 py-1 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400">
                                    強連動
                                </div>
                            )}
                            {item.correlation && item.correlation < 0.5 && (
                                <div className="px-2 py-1 rounded text-[10px] font-bold bg-red-500/20 text-red-400">
                                    弱連動
                                </div>
                            )}
                        </div>

                        {item.status === 'Undervalued' && item.sniper_score > 70 && (
                            <div className="mt-3 text-xs text-cyan-400/80">
                                🎯 狙擊訊號：低估 + 強動能
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Historical Match Table */}
            <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
                <div className="px-6 py-4 border-b border-white/5 bg-white/5">
                    <h3 className="font-semibold text-white">歷史匹配日期 (Historical Match Dates)</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-white/5">
                                <th className="px-6 py-4">日期</th>
                                <th className="px-6 py-4 text-right text-cyan-400">BTC 價格</th>
                                {data && data.history_matches && data.history_matches.length > 0 &&
                                    Object.keys(data.history_matches[0].assets).map(sym => (
                                        <th key={sym} className="px-6 py-4 text-right">{sym}</th>
                                    ))
                                }
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-white/5">
                            {data && data.history_matches && data.history_matches.map((match, idx) => (
                                <tr key={idx} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 font-mono text-gray-300">{match.date}</td>
                                    <td className="px-6 py-4 text-right font-mono text-cyan-400 font-bold">{formatMoney(match.btc_price)}</td>
                                    {Object.keys(match.assets).map(sym => (
                                        <td key={sym} className="px-6 py-4 text-right font-mono text-gray-400">
                                            {match.assets[sym] ? formatMoney(match.assets[sym]) : '-'}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

window.Backtest = Backtest;
