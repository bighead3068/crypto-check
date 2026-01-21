const Dashboard = ({ data, setSelectedAsset }) => {
    const [searchTerm, setSearchTerm] = React.useState("");
    const [filterStatus, setFilterStatus] = React.useState("all");

    if (!data) return null;

    const filteredData = data.results.filter(asset => {
        const matchesSearch = asset.symbol.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === "all" ||
            (filterStatus === "undervalued" && asset.status === "Undervalued") ||
            (filterStatus === "overvalued" && asset.status === "Overvalued");
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6">
            {/* Market Heatmap */}
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-50">
                    <IconActivity />
                </div>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <IconLayoutDashboard /> 市場熱力圖 (Market Heatmap)
                </h3>
                <Heatmap data={data.results} />
            </div>

            {/* Asset List */}
            <div className="glass-panel rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <IconSearch /> 資產分析列表
                    </h3>

                    <div className="flex gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <input
                                type="text"
                                placeholder="搜尋幣種..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                            />
                            <div className="absolute left-3 top-2.5 text-gray-400">
                                <IconSearch />
                            </div>
                        </div>

                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                        >
                            <option value="all">全部狀態</option>
                            <option value="undervalued">被低估 (Undervalued)</option>
                            <option value="overvalued">過熱 (Overvalued)</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-gray-400 text-sm bg-white/5">
                                <th className="px-6 py-4 font-medium">資產</th>
                                <th className="px-6 py-4 font-medium">當前價格</th>
                                <th className="px-6 py-4 font-medium">目標均價 (Model)</th>
                                <th className="px-6 py-4 font-medium">偏差 (Diff)</th>
                                <th className="px-6 py-4 font-medium">狀態</th>
                                <th className="px-6 py-4 font-medium">7日走勢</th>
                                <th className="px-6 py-4 font-medium">操作</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-white/5">
                            {filteredData.length > 0 ? (
                                filteredData.map((asset) => (
                                    <tr
                                        key={asset.symbol}
                                        className="hover:bg-white/5 transition-colors cursor-pointer group"
                                        onClick={() => setSelectedAsset(asset)}
                                    >
                                        <td className="px-6 py-4 font-bold text-white flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${asset.status === 'Undervalued' ? 'bg-cyan-400' : 'bg-gray-500'}`}></span>
                                            {asset.symbol}
                                        </td>
                                        <td className="px-6 py-4">{window.formatMoney(asset.current_price)}</td>
                                        <td className="px-6 py-4 text-gray-400">{window.formatMoney(asset.avg_hist_price)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-md font-medium ${asset.diff_percent < 0
                                                    ? 'bg-cyan-500/10 text-cyan-400'
                                                    : 'bg-red-500/10 text-red-400'
                                                }`}>
                                                {asset.diff_percent > 0 ? '+' : ''}{asset.diff_percent.toFixed(2)}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${asset.status === 'Undervalued'
                                                    ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                                                    : asset.status === 'Overvalued'
                                                        ? 'bg-red-500/10 border-red-500/20 text-red-400'
                                                        : 'bg-gray-500/10 border-gray-500/20 text-gray-400'
                                                }`}>
                                                {asset.status === 'Undervalued' && <IconTrendingUp />}
                                                {asset.status === 'Overvalued' && <IconAlertTriangle />}
                                                {asset.status === 'Undervalued' ? '被低估' : asset.status === 'Overvalued' ? '過熱' : '合理'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 w-32">
                                            <div className="h-8 flex items-end gap-0.5 opacity-50 group-hover:opacity-100 transition-opacity">
                                                {asset.sparkline.map((p, i) => (
                                                    <div
                                                        key={i}
                                                        className={`w-1 rounded-t-sm ${asset.diff_percent < 0 ? 'bg-cyan-400' : 'bg-red-400'}`}
                                                        style={{ height: `${p * 100}%` }}
                                                    ></div>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white">
                                                <IconChevronRight />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                        找不到符合 "{searchTerm}" 的資產
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

window.Dashboard = Dashboard;
