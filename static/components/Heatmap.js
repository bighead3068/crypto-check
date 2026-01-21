const Heatmap = ({ data, setSelectedAsset }) => {
    if (!data || !data.results) return null;

    return (
        <div className="glass-panel p-6 rounded-2xl mb-8 animate-fade-in">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <IconActivity />
                市場熱力圖 (Market Heatmap)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {data.results.map((item) => {
                    // Determine Color Intensity based on Diff Percent
                    let bgClass = "bg-gray-500/20";
                    let textClass = "text-gray-300";

                    if (item.diff_percent < -15) {
                        bgClass = "bg-emerald-500/40 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]";
                        textClass = "text-emerald-100";
                    } else if (item.diff_percent < -5) {
                        bgClass = "bg-emerald-500/20 border border-emerald-500/30";
                        textClass = "text-emerald-400";
                    } else if (item.diff_percent > 15) {
                        bgClass = "bg-rose-500/40 border border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)]";
                        textClass = "text-rose-100";
                    } else if (item.diff_percent > 5) {
                        bgClass = "bg-rose-500/20 border border-rose-500/30";
                        textClass = "text-rose-400";
                    }

                    return (
                        <div
                            key={item.symbol}
                            onClick={() => setSelectedAsset(item)}
                            className={`${bgClass} p-3 rounded-lg cursor-pointer transition-all hover:scale-105 flex flex-col items-center justify-center h-24 relative overflow-hidden group`}
                        >
                            <span className={`font-bold text-lg ${textClass}`}>{item.symbol}</span>
                            <span className={`text-xs font-mono mt-1 ${textClass}`}>
                                {item.diff_percent > 0 ? '+' : ''}{item.diff_percent.toFixed(1)}%
                            </span>
                            {item.sniper_score > 80 && item.status === 'Undervalued' && (
                                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-400">
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-500/40 rounded"></div> 強力低估 (Buy)</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-500/20 rounded"></div> 低估</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-500/20 rounded"></div> 均衡</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-rose-500/20 rounded"></div> 高估</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-rose-500/40 rounded"></div> 嚴重高估 (Sell)</div>
            </div>
        </div>
    );
};

window.Heatmap = Heatmap;
