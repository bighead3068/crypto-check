const TradingViewWidget = () => {
    const container = React.useRef();

    React.useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-screener.js";
        script.type = "text/javascript";
        script.async = true;
        script.innerHTML = JSON.stringify({
            "width": "100%",
            "height": "100%",
            "defaultColumn": "overview",
            "screener_type": "crypto_mkt",
            "displayCurrency": "USD",
            "colorTheme": "dark",
            "locale": "en",
            "isTransparent": true,
            "market": "crypto",
            "showToolbar": true
        });

        container.current.appendChild(script);

        return () => {
            if (container.current) {
                container.current.innerHTML = "";
            }
        };
    }, []);

    return (
        <div className="tradingview-widget-container h-full w-full" ref={container}>
            <div className="tradingview-widget-container__widget h-full w-full"></div>
        </div>
    );
};

window.TradingViewWidget = TradingViewWidget;
