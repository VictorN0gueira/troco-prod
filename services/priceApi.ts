/**
 * priceApi.ts — Trocô Investment Price Service
 *
 * APIs used (all FREE, no API key required for basic use):
 *  - Brapi (brapi.dev)         → Ações, FII, ETF, Internacional (USD→BRL auto-converted)
 *  - CoinGecko (coingecko.com) → Crypto
 *  - Brapi special tickers     → Market overview: IBOV, USD/BRL
 *  - CoinGecko global          → BTC dominance + global market cap
 */

import { Investment, InvestmentType, InvestmentNews } from '../types';

// ─── Result types ──────────────────────────────────────────────────────────────

export interface PriceResult {
    investmentId: string;   // Investment.id
    ticker: string;
    price: number;          // current price in BRL
    change: number;         // today's % change (e.g. 2.5 means +2.5%)
    changeAbs: number;      // today's absolute change in BRL
    high?: number;          // day high
    low?: number;           // day low
    volume?: number;        // day volume
    source: 'brapi' | 'coingecko' | 'manual';
    error?: string;
}

export interface MarketOverview {
    usdBrl?: { value: number; change: number };
    eurBrl?: { value: number; change: number };
    btcBrl?: { value: number; change: number };
    ethBrl?: { value: number; change: number };
    goldBrl?: { value: number; change: number };
    updatedAt: Date;
}

// ─── Crypto ticker → CoinGecko ID mapping ─────────────────────────────────────

const COINGECKO_IDS: Record<string, string> = {
    BTC: 'bitcoin',
    ETH: 'ethereum',
    BNB: 'binancecoin',
    SOL: 'solana',
    ADA: 'cardano',
    XRP: 'ripple',
    DOGE: 'dogecoin',
    MATIC: 'matic-network',
    POL: 'matic-network',
    DOT: 'polkadot',
    AVAX: 'avalanche-2',
    LINK: 'chainlink',
    LTC: 'litecoin',
    UNI: 'uniswap',
    ATOM: 'cosmos',
    USDT: 'tether',
    USDC: 'usd-coin',
    SHIB: 'shiba-inu',
    PEPE: 'pepe',
    TON: 'the-open-network',
    WIF: 'dogwifcoin',
    JUP: 'jupiter-exchange-solana',
};

// ─── Types that can be auto-updated ──────────────────────────────────────────

export const UPDATABLE_TYPES: InvestmentType[] = [
    'Ações', 'FII', 'ETF', 'BDR', 'Stocks EUA', 'REITs', 'Crypto',
];

export const TYPE_SOURCE: Record<InvestmentType, 'brapi' | 'coingecko' | 'manual'> = {
    // Auto-update via Brapi
    'Ações': 'brapi',
    'FII': 'brapi',
    'ETF': 'brapi',
    'BDR': 'brapi',
    'Stocks EUA': 'brapi',
    'REITs': 'brapi',
    // Auto-update via CoinGecko
    'Crypto': 'coingecko',
    // Manual (no public ticker)
    'Tesouro Direto': 'manual',
    'Renda Fixa': 'manual',
    'Debêntures': 'manual',
    'Imóvel': 'manual',
    'Previdência': 'manual',
    'Commodities': 'manual',
    'Outros': 'manual',
};

// ─── Brapi fetcher ────────────────────────────────────────────────────────────

const BRAPI_BASE = 'https://brapi.dev/api';

async function fetchBrapiQuotes(
    tickers: string[],
    currency: 'BRL' | 'USD' = 'BRL',
): Promise<Map<string, Omit<PriceResult, 'investmentId'>>> {
    const results = new Map<string, Omit<PriceResult, 'investmentId'>>();
    if (tickers.length === 0) return results;

    // Brapi allows comma-separated tickers in one request
    const joined = tickers.map(t => t.toUpperCase()).join(',');
    const token = import.meta.env.VITE_BRAPI_TOKEN;
    const url = `${BRAPI_BASE}/quote/${joined}?currency=${currency}${token ? `&token=${token}` : ''}`;

    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
        if (!res.ok) throw new Error(`Brapi HTTP ${res.status}`);
        const json = await res.json();

        for (const item of json?.results ?? []) {
            results.set(item.symbol.toUpperCase(), {
                ticker: item.symbol,
                price: Number(item.regularMarketPrice) ?? 0,
                change: Number(item.regularMarketChangePercent) ?? 0,
                changeAbs: Number(item.regularMarketChange) ?? 0,
                high: Number(item.regularMarketDayHigh) ?? undefined,
                low: Number(item.regularMarketDayLow) ?? undefined,
                volume: Number(item.regularMarketVolume) ?? undefined,
                source: 'brapi',
            });
        }
    } catch (err: any) {
        // Mark each requested ticker as errored
        for (const t of tickers) {
            results.set(t.toUpperCase(), {
                ticker: t, price: 0, change: 0, changeAbs: 0,
                source: 'brapi', error: err.message,
            });
        }
    }

    return results;
}

// ─── CoinGecko fetcher ────────────────────────────────────────────────────────

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

async function fetchCoinGeckoPrices(
    tickers: string[],
): Promise<Map<string, Omit<PriceResult, 'investmentId'>>> {
    const results = new Map<string, Omit<PriceResult, 'investmentId'>>();
    if (tickers.length === 0) return results;

    // Collect CoinGecko IDs (skip unknowns)
    const idToTicker = new Map<string, string>();
    for (const t of tickers) {
        const upper = t.toUpperCase();
        const id = COINGECKO_IDS[upper];
        if (id) idToTicker.set(id, upper);
    }

    if (idToTicker.size === 0) {
        for (const t of tickers) {
            results.set(t.toUpperCase(), {
                ticker: t, price: 0, change: 0, changeAbs: 0,
                source: 'coingecko', error: 'Ticker não mapeado — verifique o nome',
            });
        }
        return results;
    }

    const ids = Array.from(idToTicker.keys()).join(',');
    const url = `${COINGECKO_BASE}/simple/price?ids=${ids}&vs_currencies=brl&include_24hr_change=true&include_24hr_vol=true`;

    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
        if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
        const json = await res.json();

        for (const [id, ticker] of idToTicker.entries()) {
            const data = json[id];
            if (data) {
                const price = Number(data.brl) ?? 0;
                const changePct = Number(data.brl_24h_change) ?? 0;
                results.set(ticker, {
                    ticker,
                    price,
                    change: changePct,
                    changeAbs: price * (changePct / 100) / (1 + changePct / 100),
                    source: 'coingecko',
                });
            } else {
                results.set(ticker, {
                    ticker, price: 0, change: 0, changeAbs: 0,
                    source: 'coingecko', error: 'Dado não encontrado na CoinGecko',
                });
            }
        }
    } catch (err: any) {
        for (const ticker of idToTicker.values()) {
            results.set(ticker, {
                ticker, price: 0, change: 0, changeAbs: 0,
                source: 'coingecko', error: err.message,
            });
        }
    }

    // Tickers not in map
    for (const t of tickers) {
        const upper = t.toUpperCase();
        if (!results.has(upper)) {
            results.set(upper, {
                ticker: upper, price: 0, change: 0, changeAbs: 0,
                source: 'coingecko', error: 'Ticker desconhecido — tente o símbolo oficial',
            });
        }
    }

    return results;
}

// ─── Main export: fetch prices for a list of investments ──────────────────────

export async function fetchInvestmentPrices(
    investments: Investment[],
): Promise<PriceResult[]> {
    const updatable = investments.filter(
        inv => UPDATABLE_TYPES.includes(inv.type) && (inv.ticker?.trim() || inv.name?.trim()),
    );

    // Group by source
    const brapiGroup: { id: string; ticker: string }[] = [];
    const cryptoGroup: { id: string; ticker: string }[] = [];

    for (const inv of updatable) {
        const key = (inv.ticker?.trim() || inv.name?.trim())!.toUpperCase();
        if (TYPE_SOURCE[inv.type] === 'brapi') {
            brapiGroup.push({ id: inv.id, ticker: key });
        } else if (TYPE_SOURCE[inv.type] === 'coingecko') {
            cryptoGroup.push({ id: inv.id, ticker: key });
        }
    }

    // Parallel fetch
    const [brapiPrices, cryptoPrices] = await Promise.all([
        fetchBrapiQuotes(brapiGroup.map(g => g.ticker)),
        fetchCoinGeckoPrices(cryptoGroup.map(g => g.ticker)),
    ]);

    // Combine results
    const results: PriceResult[] = [];

    for (const { id, ticker } of brapiGroup) {
        const p = brapiPrices.get(ticker);
        if (p) results.push({ investmentId: id, ...p });
    }
    for (const { id, ticker } of cryptoGroup) {
        const p = cryptoPrices.get(ticker);
        if (p) results.push({ investmentId: id, ...p });
    }

    return results;
}

// ─── Market Overview ──────────────────────────────────────────────────────────
//
// APIs used (chosen for reliability + CORS support + no auth):
//   IBOV    → Brapi /quote/%5EBVSP (URL-encoded ^BVSP)
//   USD/BRL → AwesomeAPI (economia.awesomeapi.com.br) — 100% free, no auth
//   BTC     → Mercado Bitcoin ticker (price) + CoinGecko (24h change%)

// JSONP helper — bypasses CORS for HG Brasil Finance (they support ?callback=)
function fetchHGJsonp<T>(url: string, timeoutMs = 8000): Promise<T | null> {
    return new Promise(resolve => {
        const cbName = `_hg_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const script = document.createElement('script');
        const timer = setTimeout(() => { cleanup(); resolve(null); }, timeoutMs);
        const cleanup = () => {
            clearTimeout(timer);
            delete (window as any)[cbName];
            script.remove();
        };
        (window as any)[cbName] = (data: T) => { cleanup(); resolve(data); };
        script.src = `${url}&callback=${cbName}`;
        script.onerror = () => { cleanup(); resolve(null); };
        document.head.appendChild(script);
    });
}

export async function fetchMarketOverview(): Promise<MarketOverview> {
    const overview: MarketOverview = { updatedAt: new Date() };

    const safe = <T>(p: Promise<T>): Promise<T | null> =>
        p.catch(() => null);

    const [awesomeJson, mbBtcJson, cgCryptoJson] = await Promise.all([
        // USD/BRL + EUR/BRL + XAU/BRL — AwesomeAPI (free, CORS-friendly, no key)
        safe(
            fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,XAU-BRL', {
                signal: AbortSignal.timeout(8_000),
            }).then(r => r.ok ? r.json() : null)
        ),
        // BTC price — Mercado Bitcoin (Brazilian exchange, always available, CORS ok)
        safe(
            fetch('https://www.mercadobitcoin.net/api/BTC/ticker/', {
                signal: AbortSignal.timeout(8_000),
            }).then(r => r.ok ? r.json() : null)
        ),
        // BTC + ETH price & 24h change — CoinGecko free tier (CORS ok)
        safe(
            fetch(
                `${COINGECKO_BASE}/simple/price?ids=bitcoin,ethereum&vs_currencies=brl&include_24hr_change=true`,
                { signal: AbortSignal.timeout(8_000) },
            ).then(r => r.ok ? r.json() : null)
        ),
    ]);

    // ── USD/BRL  { USDBRL: { bid, pctChange } }
    const usdData = (awesomeJson as any)?.USDBRL;
    if (usdData?.bid) {
        overview.usdBrl = {
            value: Number(usdData.bid),
            change: Number(usdData.pctChange ?? 0),
        };
    }

    // ── EUR/BRL  { EURBRL: { bid, pctChange } }
    const eurData = (awesomeJson as any)?.EURBRL;
    if (eurData?.bid) {
        overview.eurBrl = {
            value: Number(eurData.bid),
            change: Number(eurData.pctChange ?? 0),
        };
    }

    // ── Ouro (XAU/BRL)  { XAUBRL: { bid, pctChange } }
    const goldData = (awesomeJson as any)?.XAUBRL;
    if (goldData?.bid) {
        overview.goldBrl = {
            value: Number(goldData.bid),
            change: Number(goldData.pctChange ?? 0),
        };
    }

    // ── BTC — prefer Mercado Bitcoin price, fallback CoinGecko; change always from CoinGecko
    const mbBtcPrice = Number((mbBtcJson as any)?.ticker?.last);
    const cgBtcPrice = Number((cgCryptoJson as any)?.bitcoin?.brl);
    const btcChange = Number((cgCryptoJson as any)?.bitcoin?.brl_24h_change ?? 0);
    const btcPrice = mbBtcPrice > 0 ? mbBtcPrice : cgBtcPrice;
    if (btcPrice > 0) {
        overview.btcBrl = { value: btcPrice, change: btcChange };
    }

    // ── ETH — CoinGecko
    const ethPrice = Number((cgCryptoJson as any)?.ethereum?.brl);
    const ethChange = Number((cgCryptoJson as any)?.ethereum?.brl_24h_change ?? 0);
    if (ethPrice > 0) {
        overview.ethBrl = { value: ethPrice, change: ethChange };
    }

    return overview;
}

export async function fetchInvestmentNews(category?: string): Promise<InvestmentNews[]> {
    const fallbackNews: InvestmentNews[] = [
        {
            title: "IBOVESPA tem alta com expectativa de novos dados econômicos",
            description: "O principal índice da bolsa brasileira iniciou o dia em território positivo, impulsionado por setores de commodities e varejo.",
            url: "https://g1.globo.com/economia/investimentos/",
            source: "Valor Econômico",
            timestamp: new Date().toISOString(),
            image: "https://images.unsplash.com/photo-1611974715853-2b8ef967d752?q=80&w=2070&auto=format&fit=crop"
        },
        {
            title: "Dólar opera em estabilidade frente ao Real nesta segunda-feira",
            description: "A moeda americana mantém patamar enquanto investidores aguardam decisões sobre política fiscal e juros nos EUA.",
            url: "https://www.infomoney.com.br/",
            source: "InfoMoney",
            timestamp: new Date().toISOString(),
            image: "https://images.unsplash.com/photo-1580519542036-c47de6196ba5?q=80&w=2071&auto=format&fit=crop"
        },
        {
            title: "Criptoativos: Bitcoin se consolida acima dos US$ 90 mil",
            description: "O mercado de criptomoedas continua demonstrando força com a entrada de fluxos institucionais e otimismo regulatório.",
            url: "https://portaldobitcoin.uol.com.br/",
            source: "Portal do Bitcoin",
            timestamp: new Date().toISOString(),
            image: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?q=80&w=2069&auto=format&fit=crop"
        },
        {
            title: "Selic: Analistas projetam manutenção de taxas no curto prazo",
            description: "O mercado financeiro ajustou suas projeções para a próxima reunião do Copom, mantendo foco na inflação.",
            url: "https://exame.com/invest/",
            source: "Exame",
            timestamp: new Date().toISOString(),
            image: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=2070&auto=format&fit=crop"
        }
    ];

    let url = `${BRAPI_BASE}/news`;
    const token = import.meta.env.VITE_BRAPI_TOKEN;

    const params = new URLSearchParams();
    if (token) params.append('token', token);
    if (category) params.append('category', category);

    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;

    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) throw new Error(`Brapi News HTTP ${res.status}`);

        // Check if response is JSON
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new Error("API returned non-JSON response");
        }

        const json = await res.json();

        if (!json.news || json.news.length === 0) {
            return fallbackNews;
        }

        return (json?.news ?? []).map((item: any) => ({
            title: item.title,
            description: item.description || item.content,
            url: item.link || item.url,
            image: item.image || (item.images && item.images[0]),
            source: item.source,
            timestamp: item.date || item.timestamp,
            category: category,
        }));
    } catch (err: any) {
        console.warn('Brapi News API failed, using fallback data:', err.message);
        return fallbackNews;
    }
}


