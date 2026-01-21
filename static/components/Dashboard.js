const Dashboard = () => {
    return (
        <div className="space-y-6 h-[800px]">
            {/* TradingView Widget Container */}
            <div className="glass-panel p-1 h-full rounded-2xl overflow-hidden border border-white/10 relative">
                <TradingViewWidget />
            </div>
        </div>
    );
};

window.Dashboard = Dashboard;
