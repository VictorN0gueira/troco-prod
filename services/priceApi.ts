/**
 * priceApi.ts — Trocô Investment Price Service
 *
 * APIs used (all FREE, no API key required for basic use):
 *  - Brapi (brapi.dev)               → Ações, FII, ETF, Internacional, IBOV (USD→BRL auto-converted)
 *  - CoinGecko (coingecko.com)        → Crypto
 *  - Brapi special tickers            → Market overview: IBOV, USD/BRL
 *  - CoinGecko global                 → BTC dominance + global market cap
 *  - AwesomeAPI (awesomeapi.com.br)   → USD/BRL, EUR/BRL, XAU/BRL (free, CORS-ok)
 *  - BrasilAPI (brasilapi.com.br)     → SELIC/CDI actual rate from Banco Central (free, no auth)
 *  - Mercado Bitcoin                  → BTC price in BRL
 *  - RSS2JSON (api.rss2json.com)      → News from multiple financial RSS feeds
 */

import { Investment, InvestmentType, InvestmentNews } from '../types';
import { supabase } from '../supabaseClient';

// Helper function wrapper for fetch with AbortController for older browsers/iOS
async function fetchWithTimeout(resource: RequestInfo | URL, options: RequestInit & { timeout?: number } = {}) {
    const { timeout = 8000 } = options;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(resource, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

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
    ibov?: { value: number; change: number };
    selic?: { value: number }; // taxa anual % (ex: 10.75)
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

    const joined = tickers.map(t => t.toUpperCase()).join(',');

    try {
        // Tenta buscar via Edge Function no Supabase para não expor a chave publicamente
        const { data: json, error } = await supabase.functions.invoke('brapi', {
            body: { tickers: joined, currency }
        });

        if (error || !json) {
            // Fallback para uso direto consumindo do env localmente em modo dev ou se Edge function falhar/não existir
            const token = import.meta.env.VITE_BRAPI_TOKEN;
            const fallbackUrl = `${BRAPI_BASE}/quote/${joined}?currency=${currency}${token ? `&token=${token}` : ''}`;
            const res = await fetchWithTimeout(fallbackUrl, { timeout: 10_000 });
            if (!res.ok) throw new Error(`Brapi HTTP ${res.status}`);
            const fallbackJson = await res.json();

            for (const item of fallbackJson?.results ?? []) {
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
            return results;
        }

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
        const res = await fetchWithTimeout(url, { timeout: 10_000 });
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
// APIs used (chosen for reliability + CORS support):
//   IBOV    → Brapi via Supabase edge fn (with token) → fallback BOVA11 ETF → fallback direct
//   USD/BRL → AwesomeAPI (economia.awesomeapi.com.br) — 100% free, no auth
//   SELIC   → BrasilAPI /bcb/v1/taxas/selicmeta — returns annual rate % directly (free, no auth)
//   BTC     → Mercado Bitcoin ticker (price) + CoinGecko (24h change%)

// Helper: fetch IBOV with multiple fallbacks
async function fetchIbovData(): Promise<any> {
    // 1st: via Supabase edge function URL with query params (edge fn reads from URL, not body)
    try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (supabaseUrl) {
            const edgeUrl = `${supabaseUrl}/functions/v1/brapi?tickers=%5EBVSP&currency=BRL`;
            const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            const res = await fetchWithTimeout(edgeUrl, {
                headers: anonKey ? { Authorization: `Bearer ${anonKey}` } : {},
                timeout: 8_000,
            });
            if (res.ok) {
                const data = await res.json();
                if (data?.results?.[0]) return data;
            }
        }
    } catch { /* fall through */ }

    // 2nd: BOVA11 ETF as IBOV proxy (tracks IBOV very closely, widely available, free)
    try {
        const token = import.meta.env.VITE_BRAPI_TOKEN;
        const url = `${BRAPI_BASE}/quote/BOVA11${token ? `?token=${token}` : ''}`;
        const res = await fetchWithTimeout(url, { timeout: 8_000 });
        if (res.ok) return res.json();
    } catch { /* fall through */ }

    // 3rd: direct ^BVSP call (may work on free tier without rate limiting)
    try {
        const token = import.meta.env.VITE_BRAPI_TOKEN;
        const url = `${BRAPI_BASE}/quote/%5EBVSP${token ? `?token=${token}` : ''}`;
        const res = await fetchWithTimeout(url, { timeout: 8_000 });
        if (res.ok) return res.json();
    } catch { /* fall through */ }

    return null;
}

// Helper: fetch SELIC annual rate — correct BrasilAPI endpoint
async function fetchSelicRate(): Promise<number | null> {
    // BrasilAPI correct endpoint: returns { nome: "SELIC", valor: 15 } (annual %)
    try {
        const res = await fetchWithTimeout('https://brasilapi.com.br/api/taxas/v1/selic', {
            timeout: 8_000
        });
        if (res.ok) {
            const json = await res.json();
            // Response: { nome: "SELIC", valor: 15 }
            const val = Number(json?.valor ?? 0);
            if (val > 0) return parseFloat(val.toFixed(2));
        }
    } catch { /* fall through */ }

    // Fallback: all rates from BrasilAPI
    try {
        const res = await fetchWithTimeout('https://brasilapi.com.br/api/taxas/v1', {
            timeout: 8_000
        });
        if (res.ok) {
            const arr = await res.json();
            if (Array.isArray(arr)) {
                const selic = arr.find((r: any) =>
                    r.nome?.toLowerCase().includes('selic') ||
                    r.sigla?.toLowerCase().includes('selic')
                );
                const val = Number(selic?.valor ?? 0);
                if (val > 0) return parseFloat(val.toFixed(2));
            }
        }
    } catch { /* fall through */ }

    return null;
}

export async function fetchMarketOverview(): Promise<MarketOverview> {
    const overview: MarketOverview = { updatedAt: new Date() };

    const safe = <T>(name: string, p: Promise<T>): Promise<T | null> =>
        p.catch((e) => {
            console.error(`[MarketOverview] API failed for ${name}:`, e);
            return null;
        });

    const [awesomeJson, mbBtcJson, cgCryptoJson, brapiIbovJson, selicRate] = await Promise.all([
        // USD/BRL + EUR/BRL + XAU/BRL — AwesomeAPI (free, CORS-friendly, no key)
        safe('AwesomeAPI (USD/EUR)',
            fetchWithTimeout('https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,XAU-BRL', {
                timeout: 8_000,
            }).then(r => r.ok ? r.json() : null)
        ),
        // BTC price — Mercado Bitcoin (Brazilian exchange, always available, CORS ok)
        safe('MercadoBitcoin',
            fetchWithTimeout('https://www.mercadobitcoin.net/api/BTC/ticker/', {
                timeout: 8_000,
            }).then(r => r.ok ? r.json() : null)
        ),
        // BTC + ETH price & 24h change — CoinGecko free tier (CORS ok)
        safe('CoinGecko',
            fetchWithTimeout(
                `${COINGECKO_BASE}/simple/price?ids=bitcoin,ethereum&vs_currencies=brl&include_24hr_change=true`,
                { timeout: 8_000 },
            ).then(r => r.ok ? r.json() : null)
        ),
        // IBOV — via helper with multiple fallbacks
        safe('IBOV', fetchIbovData()),
        // SELIC annual rate — via helper with multiple fallbacks
        safe('Selic', fetchSelicRate()),
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

    // ── IBOV — Brapi (via edge fn or direct)
    const ibovResult = (brapiIbovJson as any)?.results?.[0];
    if (ibovResult?.regularMarketPrice) {
        overview.ibov = {
            value: Number(ibovResult.regularMarketPrice),
            change: Number(ibovResult.regularMarketChangePercent ?? 0),
        };
    }

    // ── SELIC — already resolved as annual rate number (or null)
    if (selicRate != null && selicRate > 0) {
        overview.selic = { value: selicRate };
    }

    return overview;
}

// ─── News Category Detection ──────────────────────────────────────────────────

type NewsCategory = 'Ações' | 'Cripto' | 'Renda Fixa' | 'Câmbio' | 'Internacional' | 'Geral';

function detectNewsCategory(title: string, description: string): NewsCategory {
    const text = `${title} ${description}`.toLowerCase();

    const cryptoTerms = ['bitcoin', 'btc', 'ethereum', 'eth', 'cripto', 'crypto', 'blockchain', 'altcoin', 'nft', 'defi', 'stablecoin', 'binance', 'coinbase', 'solana', 'xrp', 'dogecoin'];
    const fixedTerms = ['selic', 'cdi', 'tesouro', 'renda fixa', 'ipca', 'inflação', 'copom', 'juros', 'debenture', 'cdb', 'lci', 'lca', 'poupança', 'taxa'];
    const stockTerms = ['ibovespa', 'ibov', 'bovespa', 'ação', 'ações', 'bolsa', 'petr4', 'vale3', 'itub4', 'b3', 'fii', 'dividendo', 'lucro', 'resultado', 'balanço'];
    const forexTerms = ['dólar', 'euro', 'câmbio', 'real', 'moeda', 'divisas', 'usd', 'eur', 'brl', 'fed', 'banco central'];
    const intlTerms = ['eua', 'estados unidos', 'china', 'europa', 'nasdaq', 'dow jones', 's&p', 'sp500', 'trump', 'fed', 'wall street', 'internacional', 'global', 'mundial'];

    if (cryptoTerms.some(t => text.includes(t))) return 'Cripto';
    if (fixedTerms.some(t => text.includes(t))) return 'Renda Fixa';
    if (stockTerms.some(t => text.includes(t))) return 'Ações';
    if (forexTerms.some(t => text.includes(t))) return 'Câmbio';
    if (intlTerms.some(t => text.includes(t))) return 'Internacional';
    return 'Geral';
}

// ─── News Sentiment Detection ─────────────────────────────────────────────────

export function detectNewsSentiment(title: string): 'positive' | 'negative' | 'neutral' {
    const text = title.toLowerCase();

    const positiveTerms = ['alta', 'sobe', 'subiu', 'valoriza', 'valorização', 'lucro', 'ganho', 'crescimento', 'recorde', 'máxima', 'otimismo', 'alta', 'recuperação', 'dispara', 'avança', 'melhora', 'supera', 'positivo'];
    const negativeTerms = ['queda', 'cai', 'caiu', 'perde', 'perda', 'prejuízo', 'baixa', 'risco', 'mínima', 'crise', 'colapso', 'retração', 'pessimismo', 'despenca', 'recua', 'piora', 'negativo', 'ameaça', 'tensão'];

    if (positiveTerms.some(t => text.includes(t))) return 'positive';
    if (negativeTerms.some(t => text.includes(t))) return 'negative';
    return 'neutral';
}

// ─── News Source Config ───────────────────────────────────────────────────────

const GENERIC_IMAGES = [
    'https://images.unsplash.com/photo-1611974715853-2b8ef967d752?q=80&w=2070&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=2070&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?q=80&w=2069&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1580519542036-c47de6196ba5?q=80&w=2071&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1579621970588-a35d0e7ab9b6?q=80&w=2070&auto=format&fit=crop',
];

// Static fallback — only shown if ALL APIs fail
const STATIC_FALLBACK: InvestmentNews[] = [
    {
        title: 'Mercado financeiro: acompanhe as principais notícias do dia',
        description: 'Acompanhe as atualizações do mercado financeiro, incluindo Ibovespa, câmbio, juros e criptomoedas.',
        url: 'https://www.infomoney.com.br/',
        source: 'InfoMoney', sourceColor: '#10B981',
        timestamp: new Date().toISOString(),
        image: GENERIC_IMAGES[0], category: 'Ações', sentiment: 'neutral',
    },
    {
        title: 'Bitcoin e criptomoedas: últimas atualizações do mercado crypto',
        description: 'O mercado de criptoativos continua em movimento. Acompanhe as últimas análises e preços.',
        url: 'https://portaldobitcoin.uol.com.br/',
        source: 'Portal Bitcoin', sourceColor: '#F59E0B',
        timestamp: new Date().toISOString(),
        image: GENERIC_IMAGES[2], category: 'Cripto', sentiment: 'neutral',
    },
    {
        title: 'Taxa Selic e renda fixa: o que esperar do Copom',
        description: 'Analistas discutem as próximas decisões do Banco Central e o impacto para os investidores de renda fixa.',
        url: 'https://exame.com/invest/',
        source: 'Exame Invest', sourceColor: '#8B5CF6',
        timestamp: new Date().toISOString(),
        image: GENERIC_IMAGES[1], category: 'Renda Fixa', sentiment: 'neutral',
    },
];

export async function fetchInvestmentNews(): Promise<InvestmentNews[]> {
    // ── 1. Primary: Supabase Edge Function (server-side RSS parse, no CORS) ──────
    try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_KEY; // .env.local usa VITE_SUPABASE_KEY

        if (supabaseUrl) {
            const edgeUrl = `${supabaseUrl}/functions/v1/news-feed`;
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            if (anonKey) headers['Authorization'] = `Bearer ${anonKey}`;

            const res = await fetchWithTimeout(edgeUrl, {
                headers,
                timeout: 15_000,
            });

            if (res.ok) {
                const json = await res.json();
                const articles: InvestmentNews[] = json?.articles ?? [];
                if (articles.length > 0) {
                    // Limpar HTML Entities encodados pela Edge Function (ex: &amp;) nas imagens
                    return articles.map(a => ({
                        ...a,
                        image: a.image ? a.image.replace(/&amp;/g, '&') : a.image
                    }));
                }
            }
        }
    } catch (err) {
        console.warn('[news] Edge function failed:', err);
    }

    // ── 2. Fallback: rss2json.com (browser-side, may have rate limits) ──────────
    const RSS_SOURCES = [
        { url: 'https://www.infomoney.com.br/mercados/feed/', name: 'InfoMoney', color: '#10B981' },
        { url: 'https://exame.com/invest/feed/', name: 'Exame Invest', color: '#8B5CF6' },
        { url: 'https://portaldobitcoin.uol.com.br/feed/', name: 'Portal Bitcoin', color: '#F59E0B' },
    ];

    try {
        const promises = RSS_SOURCES.map(async (source) => {
            const encoded = encodeURIComponent(source.url);
            const url = `https://api.rss2json.com/v1/api.json?rss_url=${encoded}`;
            try {
                const res = await fetchWithTimeout(url, { timeout: 8_000 });
                if (!res.ok) return [];
                const json = await res.json();
                if (json.status !== 'ok' || !json.items) return [];
                return json.items.map((item: any) => {
                    let image = item.thumbnail || item.enclosure?.link || '';
                    if (!image && item.description) {
                        const m = item.description.match(/<img[^>]+src="([^">]+)"/);
                        if (m) image = m[1];
                    }
                    if (!image) image = GENERIC_IMAGES[Math.floor(Math.random() * GENERIC_IMAGES.length)];
                    let desc = (item.description || '').replace(/<[^>]*>?/gm, '').trim().slice(0, 200);
                    return {
                        title: item.title,
                        description: desc,
                        url: item.link,
                        image,
                        source: source.name,
                        sourceColor: source.color,
                        timestamp: item.pubDate,
                        category: detectNewsCategory(item.title, desc),
                        sentiment: detectNewsSentiment(item.title),
                    } as InvestmentNews;
                });
            } catch { return []; }
        });

        const results = (await Promise.all(promises)).flat();
        if (results.length > 0) {
            results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            const seen = new Set<string>();
            return results.filter(item => {
                const k = item.title.toLowerCase().slice(0, 60);
                if (seen.has(k)) return false;
                seen.add(k);
                return true;
            }).slice(0, 30);
        }
    } catch (err) {
        console.warn('[news] rss2json fallback failed:', err);
    }

    // ── 3. Last resort: static placeholder articles ───────────────────────────
    return STATIC_FALLBACK;
}

