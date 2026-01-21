const Dashboard = ({ data, setSelectedAsset }) => {
    const [searchTerm, setSearchTerm] = React.useState("");

    const filteredData = React.useMemo(() => {
        if (!data || !data.results) return [];
        if (!searchTerm) return data.results;
        return data.results.filter(item =>
            item.symbol.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [data, searchTerm]);

    return (
        <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl shadow-black/50 animate-fade-in">
            <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                <h3 className="font-semibold text-white">資產分析列表</h3>
                <div className="relative">
                    <IconSearch className="absolute left-3 top-2.5 text-gray-500 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="搜尋代幣..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-black/40 border border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500/50 w-64 transition-all"
                    />
                </div>
            </div>

            {/* Market Heatmap */}
            <div className="px-6 pt-6">
                <Heatmap data={data} setSelectedAsset={setSelectedAsset} />
            </div>

            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-white/5">
                        <th className="px-6 py-4">資產名稱</th>
                        <th className="px-6 py-4 text-right">當前價格</th>
                        <th className="px-6 py-4 text-right">歷史合理價 (均值)</th>
                        <th className="px-6 py-4 text-center">7日走勢</th>
                        <th className="px-6 py-4 text-right">偏差幅度 (Diff)</th>
                        <th className="px-6 py-4 text-center">狀態評估</th>
                    </tr>
                </thead>
                <tbody className="text-sm divide-y divide-white/5">
                    {filteredData.map((item) => (
                        <tr
                            key={item.symbol}
                            onClick={() => setSelectedAsset(item)}
                            className="hover:bg-white/5 transition-colors group cursor-pointer border-b border-transparent hover:border-white/5"
                        >
                            <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-gray-300 group-hover:bg-cyan-500/20 group-hover:text-cyan-400 transition-colors">
                                    {item.symbol[0]}
                                </div>
                                {item.symbol}
                            </td>
                            <td className="px-6 py-4 text-right font-mono text-gray-300">
                                {formatMoney(item.current_price)}
                            </td>
                            <td className="px-6 py-4 text-right font-mono text-gray-400">
                                {formatMoney(item.avg_hist_price)}
                            </td>
                            <td className="px-6 py-4 w-32">
                                {/* Sparkline */}
                                {item.sparkline && item.sparkline.length > 0 && (
                                    <svg width="100" height="30" className="overflow-visible">
                                        <polyline
                                            points={item.sparkline.map((val, i) => `${i * (100 / (item.sparkline.length - 1))},${30 - (val * 30)}`).join(' ')}
                                            fill="none"
                                            stroke={item.sparkline[item.sparkline.length - 1] > item.sparkline[0] ? '#10b981' : '#f43f5e'}
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                )}
                            </td>
                            <td className={`px-6 py-4 text-right font-bold ${item.diff_percent < 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {item.diff_percent > 0 ? '+' : ''}{item.diff_percent.toFixed(2)}%
                            </td>
                            <td className="px-6 py-4 text-center">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                                    ${item.status === 'Undervalued' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]' :
                                        item.status === 'Overvalued' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.2)]' :
                                            'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                                    {item.status === 'Undervalued' ? '● 被低估' :
                                        item.status === 'Overvalued' ? '● 被高估' : '均衡'}
                                </span>
                            </td>
                        </tr>
                    ))}
                    {filteredData.length === 0 && (
                        <tr>
                            <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                找不到符合 "{searchTerm}" 的資產
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

window.Dashboard = Dashboard;
