const TradingViewMarketList = () => {
    const containerRef = React.useRef(null);

    React.useEffect(() => {
        if (!containerRef.current) return;

        // Clear previous content to prevent duplicates
        containerRef.current.innerHTML = '';

        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-market-quotes.js";
        script.async = true;
        script.innerHTML = JSON.stringify({
            "width": "100%",
            "height": "550",
            "symbolsGroups": [
                {
                    "name": "Crypto Assets",
                    "originalName": "Indices",
                    "symbols": [
                        { "name": "BINANCE:BTCUSDT", "displayName": "Bitcoin" },
                        { "name": "BINANCE:ETHUSDT", "displayName": "Ethereum" },
                        { "name": "BINANCE:SOLUSDT", "displayName": "Solana" },
                        { "name": "BINANCE:BNBUSDT", "displayName": "BNB" },
                        { "name": "BINANCE:XRPUSDT", "displayName": "XRP" },
                        { "name": "BINANCE:ADAUSDT", "displayName": "Cardano" },
                        { "name": "BINANCE:DOGEUSDT", "displayName": "Dogecoin" },
                        { "name": "BINANCE:DOTUSDT", "displayName": "Polkadot" },
                        { "name": "BINANCE:LINKUSDT", "displayName": "Chainlink" },
                        { "name": "BINANCE:AVAXUSDT", "displayName": "Avalanche" }
                    ]
                }
            ],
            "showSymbolLogo": true,
            "isTransparent": true,
            "colorTheme": "dark",
            "locale": "en"
        });

        containerRef.current.appendChild(script);
    }, []);

    return (
        <div className="tradingview-widget-container" ref={containerRef}>
            <div className="tradingview-widget-container__widget"></div>
        </div>
    );
};

window.TradingViewMarketList = TradingViewMarketList;
