/**
 * priceApi.ts — Trocô Investment Price Service
 *
 * APIs used (all FREE, no API key required for basic use):
 *  - Brapi (brapi.dev)         → Ações, FII, ETF, Internacional (USD→BRL auto-converted)
 *  - CoinGecko (coingecko.com) → Crypto
 *  - Brapi special tickers     → Market overview: IBOV, USD/BRL
 *  - CoinGecko global          → BTC dominance + global market cap
 */

import { Investment, InvestmentType } from '../types';

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
    ibov?: { value: number; change: number };
    usdBrl?: { value: number; change: number };
    btcBrl?: { value: number; change: number };
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
    const url = `${BRAPI_BASE}/quote/${joined}?currency=${currency}`;

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

export async function fetchMarketOverview(): Promise<MarketOverview> {
    const overview: MarketOverview = { updatedAt: new Date() };

    const safe = <T>(p: Promise<T>): Promise<T | null> =>
        p.catch(() => null);

    const [ibovJson, usdJson, mbTickerJson, cgBtcJson] = await Promise.all([
        // IBOV — %5E is URL-encoded ^ (required for Brapi index tickers)
        safe(
            fetch(`${BRAPI_BASE}/quote/%5EBVSP`, { signal: AbortSignal.timeout(8_000) })
                .then(r => r.ok ? r.json() : null)
        ),
        // USD/BRL — AwesomeAPI: completely free, CORS-friendly, no API key
        safe(
            fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL', {
                signal: AbortSignal.timeout(8_000),
            }).then(r => r.ok ? r.json() : null)
        ),
        // BTC price — Mercado Bitcoin (Brazilian exchange, always available)
        safe(
            fetch('https://www.mercadobitcoin.net/api/BTC/ticker/', {
                signal: AbortSignal.timeout(8_000),
            }).then(r => r.ok ? r.json() : null)
        ),
        // BTC 24h change% — CoinGecko (free tier)
        safe(
            fetch(
                `${COINGECKO_BASE}/simple/price?ids=bitcoin&vs_currencies=brl&include_24hr_change=true`,
                { signal: AbortSignal.timeout(8_000) },
            ).then(r => r.ok ? r.json() : null)
        ),
    ]);

    // ── IBOV
    // Brapi returns: { results: [{ symbol, regularMarketPrice, regularMarketChangePercent }] }
    const ibovData = (ibovJson as any)?.results?.[0];
    if (ibovData?.regularMarketPrice > 0) {
        overview.ibov = {
            value: Number(ibovData.regularMarketPrice),
            change: Number(ibovData.regularMarketChangePercent ?? 0),
        };
    }

    // ── USD/BRL
    // AwesomeAPI returns: { USDBRL: { bid: "5.82", pctChange: "0.18" } }
    const usdData = (usdJson as any)?.USDBRL;
    if (usdData?.bid) {
        overview.usdBrl = {
            value: Number(usdData.bid),
            change: Number(usdData.pctChange ?? 0),
        };
    }

    // ── BTC
    // Mercado Bitcoin returns: { ticker: { last: "349000.00", ... } }
    // CoinGecko returns: { bitcoin: { brl: 349000, brl_24h_change: 0.36 } }
    const mbPrice = Number((mbTickerJson as any)?.ticker?.last);
    const cgChange = Number((cgBtcJson as any)?.bitcoin?.brl_24h_change ?? 0);
    const cgPrice = Number((cgBtcJson as any)?.bitcoin?.brl);

    const btcPrice = mbPrice > 0 ? mbPrice : cgPrice;   // prefer MB, fallback CG
    if (btcPrice > 0) {
        overview.btcBrl = { value: btcPrice, change: cgChange };
    }

    return overview;
}

