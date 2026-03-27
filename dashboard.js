class DashboardController {
    constructor() {
        this.init();
    }

    async init() {
        const settings = await this.loadSettings();
        this.setupClock();
        this.setupMemoryUsage();
        this.setupNetworkSpeed();
        this.setupNetworkStatus();
        this.setupSearch();
        if (settings.bookmarksHistory) {
            this.loadBookmarks();
            this.loadActivity();
        }
        this.setupMarketCharts();
        this.setupHeatmap();
        this.setupEconomicCalendar();
        this.setupForex();
        this.setupTabCounter();
    }

    loadSettings() {
        return new Promise(resolve => {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.sync.get({bookmarksHistory: false}, resolve);
            } else {
                resolve({bookmarksHistory: false});
            }
        });
    }

    // Network Status
    setupNetworkStatus() {
        const checkConnectivity = async () => {
            try {
                const response = await fetch('https://example.com', { 
                    method: 'HEAD',
                    mode: 'no-cors'
                });
                this.updateSystemStatus(true);
            } catch (error) {
                this.updateSystemStatus(false);
            }
        };

        // Check immediately
        checkConnectivity();

        // Check every 10 seconds
        setInterval(checkConnectivity, 10000);

        // Also listen to online/offline events
        window.addEventListener('online', () => this.updateSystemStatus(true));
        window.addEventListener('offline', () => this.updateSystemStatus(false));
    }

    updateSystemStatus(isOnline) {
        const statusIndicator = document.querySelector('.status-indicator');
        const statusText = document.querySelector('.status-text');

        if (isOnline) {
            statusIndicator.classList.remove('offline');
            statusIndicator.classList.add('online');
            statusText.textContent = 'SYSTEM ONLINE';
        } else {
            statusIndicator.classList.remove('online');
            statusIndicator.classList.add('offline');
            statusText.textContent = 'SYSTEM OFFLINE';
        }
    }

    // Clock and Date
    setupClock() {
        const updateTime = () => {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('en-US', { 
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            document.getElementById('clock').textContent = timeStr;
        };
        
        updateTime();
        setInterval(updateTime, 1000);
    }

    // Memory Usage
    setupMemoryUsage() {
        if (typeof chrome !== 'undefined' && chrome.system && chrome.system.memory) {
            const clockElement = document.getElementById('clock');
            if (clockElement) {
                const metricsContainer = document.createElement('div');
                metricsContainer.className = 'metrics-container';
                clockElement.parentNode.insertBefore(metricsContainer, clockElement.nextSibling);
                
                const memoryElement = document.createElement('div');
                memoryElement.id = 'memoryUsage';
                memoryElement.textContent = 'MEM: Loading...';
                metricsContainer.appendChild(memoryElement);
                
                // Update immediately and every 1 seconds
                this.updateMemoryUsage();
                setInterval(() => this.updateMemoryUsage(), 1000);
            }
        }
    }

    // Network Speed
    setupNetworkSpeed() {
        const metricsContainer = document.querySelector('.metrics-container');
        if (metricsContainer) {
            const networkElement = document.createElement('div');
            networkElement.id = 'networkSpeed';
            networkElement.textContent = 'NET: Loading...';
            metricsContainer.appendChild(networkElement);

            this.networkSpeedLast = 'N/A';
            this.networkSpeedFetchInProgress = false;

            // Update immediately and every 1 seconds
            this.updateNetworkSpeed();
            setInterval(() => this.updateNetworkSpeed(), 1000);
        }
    }

    async updateMemoryUsage() {
        try {
            const info = await new Promise(resolve => {
                chrome.system.memory.getInfo(resolve);
            });
            const used = info.capacity - info.availableCapacity;
            const usedGB = (used / (1024 * 1024 * 1024)).toFixed(2);
            const totalGB = (info.capacity / (1024 * 1024 * 1024)).toFixed(2);
            document.getElementById('memoryUsage').textContent = `MEM: ${usedGB}GB / ${totalGB}GB`;
        } catch (error) {
            document.getElementById('memoryUsage').textContent = 'MEM: N/A';
        }
    }

    async updateNetworkSpeed() {
        const networkElement = document.getElementById('networkSpeed');
        if (!networkElement) return;

        if (this.networkSpeedFetchInProgress) {
            return;
        }

        this.networkSpeedFetchInProgress = true;

        try {
            // Keep the previous value until a new measurement is ready
            networkElement.textContent = `NET: ${this.networkSpeedLast} Mbps`;

            const startTime = performance.now();
            const response = await fetch(`https://ontheline.trincoll.edu/images/bookdown/sample-local-pdf.pdf?cacheBust=${Date.now()}`, {
                method: 'GET',
                cache: 'no-cache',
                mode: 'cors'
            });
            const endTime = performance.now();

            if (response.ok) {
                const data = await response.arrayBuffer();
                const sizeBytes = data.byteLength || 2048;
                const durationMs = Math.max(1, endTime - startTime);
                const durationSec = durationMs / 1000;
                const speedBps = sizeBytes * 8 / durationSec;
                const speedMbps = (speedBps / (1024 * 1024)).toFixed(2);

                this.networkSpeedLast = speedMbps;
                networkElement.textContent = `NET: ${speedMbps} Mbps`;
            } else {
                networkElement.textContent = `NET: ${this.networkSpeedLast} Mbps`;
            }
        } catch (error) {
            networkElement.textContent = 'NET: Offline';
        } finally {
            this.networkSpeedFetchInProgress = false;
        }
    }

    // Search Functionality (Google only)
    setupSearch() {
        const searchInput = document.getElementById('searchInput');

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value;
                if (query) {
                    window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
                }
            }
        });
    }

    // Load Bookmarks
    loadBookmarks() {
        const container = document.getElementById('bookmarksList');
        
        const defaultBookmarks = [
            { title: 'Bloomberg', url: 'https://www.bloomberg.com' },
            { title: 'Yahoo Finance', url: 'https://finance.yahoo.com' },
            { title: 'TradingView', url: 'https://www.tradingview.com' },
            { title: 'CoinMarketCap', url: 'https://coinmarketcap.com' },
            { title: 'Federal Reserve', url: 'https://www.federalreserve.gov' }
        ];

        // Sort bookmarks alphabetically
        defaultBookmarks.sort((a, b) => a.title.localeCompare(b.title));

        if (typeof chrome !== 'undefined' && chrome.bookmarks) {
            chrome.bookmarks.getRecent(1000, (bookmarks) => {
                container.innerHTML = '';
                // Sort bookmarks alphabetically
                bookmarks.sort((a, b) => a.title.localeCompare(b.title));
                bookmarks.forEach(bookmark => {
                    this.createBookmarkElement(bookmark, container);
                });
            });
        } else {
            defaultBookmarks.forEach(bookmark => {
                this.createBookmarkElement(bookmark, container);
            });
        }
    }

    createBookmarkElement(bookmark, container) {
        const div = document.createElement('div');
        div.className = 'bookmark-item';
        div.innerHTML = `
            <span style="color: var(--accent-cyan)">›</span>
            <span>${bookmark.title}</span>
        `;
        div.addEventListener('click', () => window.location.href = bookmark.url);
        container.appendChild(div);
    }

    // Activity Feed (Browser History)
    loadActivity() {
        const container = document.getElementById('activityFeed');
        
        if (typeof chrome !== 'undefined' && chrome.history) {
            chrome.history.search({
                text: '',
                maxResults: 10,
                startTime: Date.now() - (7 * 24 * 60 * 60 * 1000) // Last 7 days
            }, (historyItems) => {
                container.innerHTML = '';
                historyItems.forEach(item => {
                    this.createHistoryElement(item, container);
                });
            });
        } else {
            // Fallback for non-extension environment
            const activities = [
                { time: '10:42', text: 'Visited Bloomberg Markets' },
                { time: '09:15', text: 'Checked Yahoo Finance' },
                { time: '08:30', text: 'Viewed TradingView charts' },
                { time: '07:45', text: 'Browsed CoinMarketCap' }
            ];
            
            activities.forEach(act => {
                const div = document.createElement('div');
                div.className = 'activity-item';
                div.innerHTML = `
                    <span class="activity-time">${act.time}</span>
                    <span class="activity-text">${act.text}</span>
                `;
                container.appendChild(div);
            });
        }
    }

    createHistoryElement(item, container) {
        const div = document.createElement('div');
        div.className = 'activity-item';
        const visitTime = new Date(item.lastVisitTime);
        const timeStr = visitTime.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        const title = item.title || item.url;
        
        div.innerHTML = `
            <span class="activity-time">${timeStr}</span>
            <span class="activity-text">${title}</span>
        `;
        div.addEventListener('click', () => window.location.href = item.url);
        container.appendChild(div);
    }

    // ========== MARKET ANALYSIS ==========
    setupMarketCharts() {
        // Initialize with default ticker
        this.updateColumnCharts(1, 'NASDAQ:AAPL');
        
        // Add event listeners for update button
        document.querySelectorAll('.update-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const column = e.target.dataset.column;
                const ticker = document.getElementById(`ticker${column}`).value.trim().toUpperCase();
                if (ticker) {
                    this.updateColumnCharts(column, ticker);
                }
            });
        });
        
        // Load news for the main column
        this.loadNewsFeed(1);
        
        // Auto-refresh news every 5 minutes
        setInterval(() => {
            this.loadNewsFeed(1);
        }, 5 * 60 * 1000);
    }

    // Heatmap Setup
    setupHeatmap() {
        // Load initial heatmap
        this.loadHeatmapIframe('sp500');

        // Add event listeners for tabs
        document.querySelectorAll('.heatmap-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const market = btn.dataset.market;
                
                // Remove active class from all buttons
                document.querySelectorAll('.heatmap-tabs .tab-btn').forEach(b => b.classList.remove('active'));
                // Add active class to clicked button
                btn.classList.add('active');
                
                // Hide all widgets
                document.querySelectorAll('.heatmap-widget').forEach(widget => {
                    widget.classList.remove('active');
                });
                
                // Show selected widget
                const selectedWidget = document.querySelector(`.heatmap-widget[data-market="${market}"]`);
                if (selectedWidget) {
                    selectedWidget.classList.add('active');
                    this.loadHeatmapIframe(market);
                }
            });
        });
    }

    loadHeatmapIframe(market) {
        const heatmapConfigs = {
            sp500: {
                url: 'https://www.tradingview.com/embed-widget/stock-heatmap/',
                config: {
                    "dataSource": "SPX500",
                    "blockSize": "market_cap_basic",
                    "blockColor": "change",
                    "grouping": "sector",
                    "locale": "en",
                    "colorTheme": "dark",
                    "hasTopBar": false,
                    "isDataSetEnabled": false,
                    "isZoomEnabled": true,
                    "hasSymbolTooltip": true,
                    "isMonoSize": false
                }
            },
            crypto: {
                url: 'https://www.tradingview.com/embed-widget/crypto-coins-heatmap/',
                config: {
                    "dataSource": "Crypto",
                    "blockSize": "market_cap_calc",
                    "blockColor": "24h_close_change|5",
                    "locale": "en",
                    "colorTheme": "dark",
                    "hasTopBar": false,
                    "isDataSetEnabled": false,
                    "isZoomEnabled": true,
                    "hasSymbolTooltip": true,
                    "isMonoSize": false
                }
            },
            indonesia: {
                url: 'https://www.tradingview.com/embed-widget/stock-heatmap/',
                config: {
                    "dataSource": "AllID",
                    "blockSize": "market_cap_basic",
                    "blockColor": "change",
                    "grouping": "sector",
                    "locale": "en",
                    "colorTheme": "dark",
                    "hasTopBar": false,
                    "isDataSetEnabled": false,
                    "isZoomEnabled": true,
                    "hasSymbolTooltip": true,
                    "isMonoSize": false
                }
            }
        };

        const config = heatmapConfigs[market];
        if (!config) return;

        const container = document.getElementById(`heatmap-${market}`);
        if (!container) return;

        // Clear previous content
        container.innerHTML = '';

        // Create iframe
        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.frameBorder = '0';
        iframe.allowTransparency = true;
        iframe.scrolling = 'no';
        iframe.allowFullscreen = true;

        const configStr = encodeURIComponent(JSON.stringify(config.config));
        iframe.src = `${config.url}?locale=en#${configStr}`;

        container.appendChild(iframe);
    }

    // Economic Calendar & News Setup
    setupEconomicCalendar() {
        // Load widgets after a short delay to ensure DOM is ready
        setTimeout(() => {
            this.loadEconomicCalendar();
            this.loadTradingviewNews();
        }, 1000);
    }

    loadEconomicCalendar() {
        const container = document.getElementById('economicCalendarContainer');
        if (!container) return;

        // Clear previous content
        container.innerHTML = '';

        // Create iframe
        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.frameBorder = '0';
        iframe.allowTransparency = true;
        iframe.scrolling = 'no';
        iframe.allowFullscreen = true;

        const config = {
            "colorTheme": "dark",
            "isTransparent": false,
            "locale": "en",
            "countryFilter": "ar,au,br,ca,cn,fr,de,in,id,it,jp,kr,mx,ru,sa,za,tr,gb,us,eu",
            "importanceFilter": "-1,0,1",
            "width": "100%",
            "height": 550
        };

        const configStr = encodeURIComponent(JSON.stringify(config));
        iframe.src = `https://www.tradingview.com/embed-widget/events/?locale=en#${configStr}`;

        container.appendChild(iframe);
    }

    loadTradingviewNews() {
        const container = document.getElementById('tradingviewNewsContainer');
        if (!container) return;

        // Clear previous content
        container.innerHTML = '';

        // Create iframe
        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.frameBorder = '0';
        iframe.allowTransparency = true;
        iframe.scrolling = 'no';
        iframe.allowFullscreen = true;

        const config = {
            "displayMode": "regular",
            "feedMode": "all_symbols",
            "colorTheme": "dark",
            "isTransparent": false,
            "locale": "en",
            "width": "100%",
            "height": 550
        };

        const configStr = encodeURIComponent(JSON.stringify(config));
        iframe.src = `https://www.tradingview.com/embed-widget/timeline/?locale=en#${configStr}`;

        container.appendChild(iframe);
    }

    // Forex Setup
    setupForex() {
        this.loadForex();
    }

    loadForex() {
        const container = document.getElementById('forexContainer');
        if (!container) return;

        // Clear previous content
        container.innerHTML = '';

        // Create iframe
        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.frameBorder = '0';
        iframe.allowTransparency = true;
        iframe.scrolling = 'no';

        const config = {
            "colorTheme": "dark",
            "isTransparent": false,
            "currencies": [
                "EUR",
                "USD",
                "JPY",
                "GBP",
                "CHF",
                "AUD",
                "CAD",
                "NZD",
                "CNY",
                "IDR"
            ],
            "backgroundColor": "#0F0F0F",
            "width": "100%",
            "height": 400
        };

        const configStr = encodeURIComponent(JSON.stringify(config));
        iframe.src = `https://www.tradingview.com/embed-widget/forex-cross-rates/?locale=en#${configStr}`;

        container.appendChild(iframe);
    }

    // Tab Counter
    setupTabCounter() {
        const updateTabCount = () => {
            if (typeof chrome !== 'undefined' && chrome.tabs) {
                chrome.tabs.query({}, (tabs) => {
                    const tabCountElement = document.getElementById('tabCount');
                    if (tabCountElement) {
                        tabCountElement.textContent = tabs.length;
                    }
                });
            } else {
                // Fallback for non-extension environment
                const tabCountElement = document.getElementById('tabCount');
                if (tabCountElement) {
                    tabCountElement.textContent = 'N/A';
                }
            }
        };

        // Update immediately
        updateTabCount();

        // Update every 5 seconds
        setInterval(updateTabCount, 5000);
    }

    updateColumnCharts(column, ticker) {
        // Load combined chart with volume shown
        this.loadTradingViewWidget(ticker, `chart${column}-combined`, 'price');
        // Load technical and fundamental widgets
        this.loadTechnicalWidget(ticker, `technical${column}`);
        this.loadFundamentalWidget(ticker, `fundamental${column}`);
    }

    loadTradingViewWidget(symbol, containerId, type = 'price') {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = ''; // clear previous widget

        // Create iframe with MACD and RSI indicators
        const iframe = document.createElement('iframe');
        
        // TradingView lightweight chart with indicators: MACD and RSI
        // Using the embedded widget with technical analysis parameters
        iframe.src = `https://www.tradingview.com/widgetembed/?symbol=${encodeURIComponent(symbol)}&interval=D&theme=dark&hidesidetoolbar=1&hidetoptoolbar=0&hidelegend=0&hidevolume=0&hotlist=0&locale=en&saveimage=1&style=1&timezone=Etc%2FUTC&backgroundColor=%230F0F0F&gridColor=rgba%28242%2C242%2C242%2C0.06%29&withdateranges=0&autosize=1&studies=%5B%7B%22id%22%3A%22MACD%40tv-basicstudies%22%7D%2C%7B%22id%22%3A%22RSI%40tv-basicstudies%22%7D%5D`;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.frameBorder = '0';
        iframe.allowTransparency = true;
        iframe.scrolling = 'no';
        iframe.allowFullscreen = true;

        container.appendChild(iframe);
    }

    loadTechnicalWidget(symbol, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = ''; // clear previous widget

        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.frameBorder = '0';
        iframe.allowTransparency = true;
        iframe.scrolling = 'no';
        iframe.allowFullscreen = true;

        const config = {
            "colorTheme": "dark",
            "displayMode": "multiple",
            "isTransparent": false,
            "locale": "en",
            "interval": "1m",
            "disableInterval": false,
            "width": 425,
            "height": 450,
            "symbol": symbol,
            "showIntervalTabs": true
        };

        const configStr = encodeURIComponent(JSON.stringify(config));
        iframe.src = `https://www.tradingview.com/embed-widget/technical-analysis/?locale=en#${configStr}`;

        container.appendChild(iframe);
    }

    loadFundamentalWidget(symbol, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = ''; // clear previous widget

        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.frameBorder = '0';
        iframe.allowTransparency = true;
        iframe.scrolling = 'no';
        iframe.allowFullscreen = true;

        const config = {
            "symbol": symbol,
            "colorTheme": "dark",
            "displayMode": "regular",
            "isTransparent": false,
            "locale": "en",
            "width": 400,
            "height": 550
        };

        const configStr = encodeURIComponent(JSON.stringify(config));
        iframe.src = `https://www.tradingview.com/embed-widget/financials/?locale=en#${configStr}`;

        container.appendChild(iframe);
    }

    async loadNewsFeed(column) {
        const container = document.getElementById(`news${column}`);
        if (!container) return;

        try {
            // Expanded news sources with CORS-enabled RSS feeds
            const newsSources = [
                // Global News
                {
                    name: 'Al Jazeera',
                    url: 'https://www.aljazeera.com/xml/rss/all.xml',
                    color: '#CC0000',
                    useLocalParser: true
                },
                {
                    name: 'UN News',
                    url: 'https://news.un.org/feed/subscribe/en/news/all/rss.xml',
                    color: '#009EDB',
                    useLocalParser: false
                },
                // Financial News
                {
                    name: 'MarketWatch',
                    url: 'https://www.marketwatch.com/rss/topstories',
                    color: '#00d4ff'
                },
                {
                    name: 'Financial Times',
                    url: 'https://www.ft.com/?format=rss',
                    color: '#CC0000'
                },
                {
                    name: 'The Economist',
                    url: 'https://www.economist.com/latest/rss.xml',
                    color: '#0066CC'
                },
                {
                    name: 'CoinDesk',
                    url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
                    color: '#F7931A'
                },
                // Tech News
                {
                    name: 'Hacker News',
                    url: 'https://news.ycombinator.com/rss',
                    color: '#FF6600'
                },
                {
                    name: 'The Verge',
                    url: 'https://www.theverge.com/rss/index.xml',
                    color: '#DD3322'
                },
                {
                    name: 'Wired',
                    url: 'https://www.wired.com/feed/rss',
                    color: '#DC143C'
                },
                {
                    name: 'Ars Technica',
                    url: 'http://feeds.arstechnica.com/arstechnica/index/',
                    color: '#1a468c'
                },
                {
                    name: 'Defense Blog',
                    url: 'https://defence-blog.com/feed/',
                    color: '#4A5568'
                },
                // Legacy sources (kept for redundancy)
                {
                    name: 'Bloomberg',
                    url: 'https://feeds.bloomberg.com/markets/news.rss',
                    color: '#00f0ff'
                },
                {
                    name: 'The Guardian',
                    url: 'https://www.theguardian.com/world/rss',
                    color: '#00ff9d'
                },
                {
                    name: 'NY Times',
                    url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
                    color: '#ffaa33'
                }
            ];

            // Fetch from all sources simultaneously
            const newsPromises = newsSources.map(source => 
                this.fetchNewsFromSource(source).catch(error => {
                    console.log(`Failed to fetch from ${source.name}:`, error);
                    return [];
                })
            );
            
            const allNewsArrays = await Promise.all(newsPromises);
            const allNews = allNewsArrays.flat();

            // Sort by date and take top 100
            allNews.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
            const topNews = allNews.slice(0, 512);

            // Render news
            container.innerHTML = '';
            topNews.forEach(item => {
                this.createNewsItem(item, container);
            });

        } catch (error) {
            console.error('Error loading news:', error);
            container.innerHTML = '<div class="news-item"><div class="news-title">Unable to load news feed</div></div>';
        }
    }

    async fetchNewsFromSource(source) {
        try {
            // Use local parser if specified (e.g., for Al Jazeera RSS)
            if (source.useLocalParser) {
                try {
                    const response = await fetch(source.url);
                    const text = await response.text();
                    return this.parseRSSLocal(text, source);
                } catch (localError) {
                    console.log(`Local parser failed for ${source.name}:`, localError);
                    return [];
                }
            }
            
            // Use a CORS proxy for RSS feeds
            const proxyUrl = 'https://api.rss2json.com/v1/api.json?rss_url=';
            const response = await fetch(proxyUrl + encodeURIComponent(source.url));
            const data = await response.json();
            
            if (data.status === 'ok') {
                return data.items.map(item => ({
                    title: item.title,
                    link: item.link,
                    pubDate: item.pubDate,
                    source: source.name,
                    color: source.color
                }));
            }
            return [];
        } catch (error) {
            // Fallback: try direct fetch if CORS allows
            try {
                const response = await fetch(source.url);
                const text = await response.text();
                return this.parseRSSLocal(text, source);
            } catch (fallbackError) {
                return [];
            }
        }
    }

    parseRSSLocal(xmlText, source) {
        // Local RSS parser with date format conversion
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlText, 'text/xml');
        
        // Check for parse errors
        if (xml.getElementsByTagName('parsererror').length > 0) {
            console.error('XML parse error');
            return [];
        }
        
        const items = xml.querySelectorAll('item');
        
        return Array.from(items).slice(0, 32).map(item => {
            let pubDateText = item.querySelector('pubDate')?.textContent || new Date().toISOString();
            
            // Convert RFC2822 format: "Fri, 06 Mar 2026 00:00:00 +0000" -> "Fri, 06 Mar 2026 00:00:00 GMT"
            if (pubDateText.includes('+0000')) {
                pubDateText = pubDateText.replace('+0000', 'GMT');
            } else if (pubDateText.match(/[+-]\d{4}$/)) {
                // Handle other timezone formats
                pubDateText = pubDateText.replace(/[+-]\d{4}$/, 'GMT');
            }
            
            return {
                title: item.querySelector('title')?.textContent || 'No title',
                link: item.querySelector('link')?.textContent || '#',
                pubDate: pubDateText,
                source: source.name,
                color: source.color
            };
        });
    }

    parseRSS(xmlText, source) {
        // Simple RSS parser for fallback
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlText, 'text/xml');
        const items = xml.querySelectorAll('item');
        
        return Array.from(items).slice(0, 32).map(item => {
            let pubDateText = item.querySelector('pubDate')?.textContent || new Date().toISOString();
            
            // Convert RFC2822 format: "Fri, 06 Mar 2026 00:00:00 +0000" -> "Fri, 06 Mar 2026 00:00:00 GMT"
            if (pubDateText.includes('+0000')) {
                pubDateText = pubDateText.replace('+0000', 'GMT');
            } else if (pubDateText.match(/[+-]\d{4}$/)) {
                // Handle other timezone formats
                pubDateText = pubDateText.replace(/[+-]\d{4}$/, 'GMT');
            }
            
            return {
                title: item.querySelector('title')?.textContent || 'No title',
                link: item.querySelector('link')?.textContent || '#',
                pubDate: pubDateText,
                source: source.name,
                color: source.color
            };
        });
    }

    createNewsItem(item, container) {
        const div = document.createElement('div');
        div.className = 'news-item';
        
        const pubDate = new Date(item.pubDate);
        const timeAgo = this.getTimeAgo(pubDate);
        
        const titleDiv = document.createElement('div');
        titleDiv.className = 'news-title';
        titleDiv.style.cursor = 'pointer';
        titleDiv.textContent = item.title;
        titleDiv.addEventListener('click', () => {
            window.open(item.link, '_blank');
        });
        
        const metaDiv = document.createElement('div');
        metaDiv.className = 'news-meta';
        metaDiv.innerHTML = `
            <span class="news-source" style="color: ${item.color}">${item.source}</span>
            <span class="news-time">${timeAgo}</span>
        `;
        
        div.appendChild(titleDiv);
        div.appendChild(metaDiv);
        container.appendChild(div);
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        
        const secs = Math.floor(diffMs / 1000);
        const mins = Math.floor(diffMs / (1000 * 60));
        const hrs = Math.floor(diffMs / (1000 * 3600));
        const days = Math.floor(diffMs / (1000 * 3600 * 24));
        
        // Display in appropriate unit (prioritize seconds/minutes for small values)
        if (mins < 1) {
            return `${Math.max(0, secs)}s ago`;
        } else if (mins < 60) {
            return `${Math.max(0, mins)}m ago`;
        } else if (hrs < 24) {
            return `${Math.max(0, hrs)}h ago`;
        } else {
            return `${Math.max(0, days)}d ago`;
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new DashboardController();
});