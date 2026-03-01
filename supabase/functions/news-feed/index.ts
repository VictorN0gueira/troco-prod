import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// ─── In-memory cache (lives for the duration of the function instance) ─────────
const cache = new Map<string, { data: NewsItem[]; fetchedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ─── Types ─────────────────────────────────────────────────────────────────────
interface NewsItem {
    title: string;
    description: string;
    url: string;
    image?: string;
    source: string;
    sourceColor: string;
    timestamp: string;
    category: string;
    sentiment: "positive" | "negative" | "neutral";
}

// ─── News Sources ───────────────────────────────────────────────────────────────
const SOURCES = [
    {
        url: "https://www.infomoney.com.br/mercados/feed/",
        name: "InfoMoney",
        color: "#10B981",
    },
    {
        url: "https://www.infomoney.com.br/onde-investir/feed/",
        name: "InfoMoney",
        color: "#10B981",
    },
    {
        url: "https://exame.com/invest/feed/",
        name: "Exame Invest",
        color: "#8B5CF6",
    },
    {
        url: "https://portaldobitcoin.uol.com.br/feed/",
        name: "Portal Bitcoin",
        color: "#F59E0B",
    },
    {
        url: "https://valor.globo.com/rss/financas/index.ghtml",
        name: "Valor Econômico",
        color: "#3B82F6",
    },
];

const FALLBACK_IMAGES = [
    "https://images.unsplash.com/photo-1611974715853-2b8ef967d752?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1580519542036-c47de6196ba5?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1579621970588-a35d0e7ab9b6?q=80&w=800&auto=format&fit=crop",
];

// ─── XML RSS Parser (pure Deno, no external deps) ──────────────────────────────

function extractTag(xml: string, tag: string): string {
    // Try CDATA first
    const cdataRe = new RegExp(
        `<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`,
        "i"
    );
    const cdataMatch = xml.match(cdataRe);
    if (cdataMatch) return cdataMatch[1].trim();

    // Plain text
    const plainRe = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
    const plainMatch = xml.match(plainRe);
    if (plainMatch) return decodeHtmlEntities(plainMatch[1].trim());

    return "";
}

function extractAttr(xml: string, tag: string, attr: string): string {
    const re = new RegExp(`<${tag}[^>]+${attr}="([^"]*)"`, "i");
    const match = xml.match(re);
    return match ? match[1] : "";
}

function decodeHtmlEntities(str: string): string {
    return str
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ")
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripHtml(html: string): string {
    return html
        .replace(/<[^>]+>/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
}

function extractImage(itemXml: string, descHtml: string): string {
    // 1. <media:content url="...">
    let img = extractAttr(itemXml, "media:content", "url");
    if (img) return img;

    // 2. <enclosure url="...">
    img = extractAttr(itemXml, "enclosure", "url");
    if (img && /\.(jpg|jpeg|png|webp|gif)/i.test(img)) return img;

    // 3. <img src="..."> inside description
    const imgMatch = descHtml.match(/<img[^>]+src="([^"]+)"/i);
    if (imgMatch) return imgMatch[1];

    // 4. <media:thumbnail url="...">
    img = extractAttr(itemXml, "media:thumbnail", "url");
    if (img) return img;

    return "";
}

function splitItems(xml: string): string[] {
    const items: string[] = [];
    let start = 0;
    while (true) {
        const itemStart = xml.indexOf("<item>", start);
        if (itemStart === -1) break;
        const itemEnd = xml.indexOf("</item>", itemStart);
        if (itemEnd === -1) break;
        items.push(xml.slice(itemStart + 6, itemEnd));
        start = itemEnd + 7;
    }
    return items;
}

// ─── Category & Sentiment ──────────────────────────────────────────────────────

function detectCategory(text: string): string {
    const t = text.toLowerCase();
    const maps: [string[], string][] = [
        [
            [
                "bitcoin", "btc", "ethereum", "eth", "cripto", "crypto", "blockchain",
                "altcoin", "nft", "defi", "solana", "xrp", "dogecoin", "binance",
            ],
            "Cripto",
        ],
        [
            [
                "selic", "cdi", "tesouro", "renda fixa", "ipca", "inflação", "copom",
                "juros", "debenture", "cdb", "lci", "lca", "poupança", "taxa básica",
            ],
            "Renda Fixa",
        ],
        [
            [
                "ibovespa", "ibov", "bovespa", "ação", "ações", "bolsa", "b3",
                "dividendo", "balanço", "resultado", "petr4", "vale3", "itub4", "fii",
            ],
            "Ações",
        ],
        [
            [
                "dólar", "euro", "câmbio", "moeda", "divisas", "usd", "eur",
                "banco central", "fed", "real brasileiro",
            ],
            "Câmbio",
        ],
        [
            [
                "eua", "china", "europa", "nasdaq", "dow jones", "s&p", "sp500",
                "trump", "wall street", "internacional", "global", "mundial",
            ],
            "Internacional",
        ],
    ];
    for (const [terms, cat] of maps) {
        if (terms.some((term) => t.includes(term))) return cat;
    }
    return "Geral";
}

function detectSentiment(title: string): "positive" | "negative" | "neutral" {
    const t = title.toLowerCase();
    const pos = [
        "alta", "sobe", "subiu", "valoriza", "lucro", "crescimento", "recorde",
        "máxima", "otimismo", "recuperação", "dispara", "avança", "supera",
    ];
    const neg = [
        "queda", "cai", "caiu", "perde", "perda", "prejuízo", "baixa", "risco",
        "mínima", "crise", "colapso", "pessimismo", "despenca", "recua", "tensão",
    ];
    if (pos.some((w) => t.includes(w))) return "positive";
    if (neg.some((w) => t.includes(w))) return "negative";
    return "neutral";
}

// ─── Fetch & parse a single RSS feed ───────────────────────────────────────────

async function fetchRSSFeed(
    sourceUrl: string,
    sourceName: string,
    sourceColor: string,
    maxItems = 10
): Promise<NewsItem[]> {
    const res = await fetch(sourceUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; TrocoBot/1.0)" },
        signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status} for ${sourceUrl}`);

    const xml = await res.text();
    const rawItems = splitItems(xml);

    const items: NewsItem[] = [];

    for (const raw of rawItems.slice(0, maxItems)) {
        const title = extractTag(raw, "title");
        if (!title) continue;

        const rawDesc = extractTag(raw, "description") || extractTag(raw, "content:encoded");
        const cleanDesc = stripHtml(rawDesc).slice(0, 220);
        const image = extractImage(raw, rawDesc) ||
            FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)];

        const link = extractTag(raw, "link") ||
            extractAttr(raw, "link", "href") ||
            "#";

        const pubDate = extractTag(raw, "pubDate") || new Date().toISOString();

        items.push({
            title,
            description: cleanDesc || title,
            url: link,
            image,
            source: sourceName,
            sourceColor,
            timestamp: pubDate,
            category: detectCategory(`${title} ${cleanDesc}`),
            sentiment: detectSentiment(title),
        });
    }

    return items;
}

// ─── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const CACHE_KEY = "news_all";
        const cached = cache.get(CACHE_KEY);
        const now = Date.now();

        if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
            return new Response(JSON.stringify({ articles: cached.data, cached: true }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Fetch all sources in parallel — failures are caught per-source
        const results = await Promise.allSettled(
            SOURCES.map((s) => fetchRSSFeed(s.url, s.name, s.color, 10))
        );

        const allItems: NewsItem[] = [];
        for (const result of results) {
            if (result.status === "fulfilled") {
                allItems.push(...result.value);
            }
        }

        // Sort by date descending
        allItems.sort(
            (a, b) =>
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        // Deduplicate by first 60 chars of title
        const seen = new Set<string>();
        const deduped = allItems.filter((item) => {
            const key = item.title.toLowerCase().slice(0, 60);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        // Store in cache
        cache.set(CACHE_KEY, { data: deduped, fetchedAt: now });

        return new Response(
            JSON.stringify({ articles: deduped, cached: false, count: deduped.length }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (err) {
        console.error("news-feed error:", err);
        return new Response(
            JSON.stringify({ error: err instanceof Error ? err.message : String(err), articles: [] }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 500,
            }
        );
    }
});
