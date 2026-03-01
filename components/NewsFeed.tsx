import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    ExternalLink, Newspaper, TrendingUp, TrendingDown, Clock, Search,
    RefreshCw, AlertTriangle, ChevronDown, BarChart2, DollarSign,
    Zap, Globe, Bitcoin, Landmark, ArrowUp, ArrowDown, Minus,
    Bookmark, BookmarkCheck, Share2, LayoutGrid, List, X
} from 'lucide-react';
import SuperPaywall from './SuperPaywall';
import { InvestmentNews, UserProfile } from '../types';
import { fetchInvestmentNews, fetchMarketOverview, MarketOverview } from '../services/priceApi';
import { supabase } from '../supabaseClient';

// ─── Types ────────────────────────────────────────────────────────────────────

type NewsCategory = 'Todos' | 'Ações' | 'Cripto' | 'Renda Fixa' | 'Câmbio' | 'Internacional' | 'Geral';
type ViewMode = 'card' | 'compact';

interface SavedNewsRow {
    url: string;
}

const CATEGORIES: { id: NewsCategory; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'Todos', label: 'Todos', icon: <Globe className="w-3.5 h-3.5" />, color: '#64748b' },
    { id: 'Ações', label: 'Ações', icon: <BarChart2 className="w-3.5 h-3.5" />, color: '#10B981' },
    { id: 'Cripto', label: 'Cripto', icon: <Bitcoin className="w-3.5 h-3.5" />, color: '#F59E0B' },
    { id: 'Renda Fixa', label: 'Renda Fixa', icon: <Landmark className="w-3.5 h-3.5" />, color: '#3B82F6' },
    { id: 'Câmbio', label: 'Câmbio', icon: <DollarSign className="w-3.5 h-3.5" />, color: '#8B5CF6' },
    { id: 'Internacional', label: 'Internacional', icon: <Globe className="w-3.5 h-3.5" />, color: '#EC4899' },
];

// ─── Share Helper ─────────────────────────────────────────────────────────────

async function shareArticle(news: InvestmentNews) {
    const shareData = {
        title: news.title,
        text: news.description || news.title,
        url: news.url,
    };
    if (navigator.share && navigator.canShare?.(shareData)) {
        try { await navigator.share(shareData); } catch { /* cancelled */ }
    } else {
        await navigator.clipboard.writeText(`${news.title}\n${news.url}`);
    }
}

// ─── Market Panel ─────────────────────────────────────────────────────────────

const MarketPanel = ({ market, loading }: { market: MarketOverview | null; loading: boolean }) => {
    const items = [
        { label: 'IBOV', value: market?.ibov?.value, change: market?.ibov?.change, format: 'points' },
        { label: 'USD/BRL', value: market?.usdBrl?.value, change: market?.usdBrl?.change, format: 'currency' },
        { label: 'BTC', value: market?.btcBrl?.value, change: market?.btcBrl?.change, format: 'crypto' },
        { label: 'Selic a.a.', value: market?.selic?.value, change: undefined, format: 'rate' },
    ];

    const formatVal = (value: number, format: string) => {
        if (format === 'points') return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
        if (format === 'crypto') return value >= 1000
            ? `R$ ${(value / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`
            : `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (format === 'rate') return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
        return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <div className="flex flex-wrap gap-2 mb-6">
            {items.map(item => {
                const isPos = (item.change ?? 0) >= 0;
                return (
                    <div key={item.label} className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 shadow-sm">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{item.label}</span>
                        {loading ? (
                            <div className="h-4 w-14 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
                        ) : item.value != null ? (
                            <>
                                <span className="text-sm font-bold text-slate-800 dark:text-white">{formatVal(item.value, item.format)}</span>
                                {item.change != null && (
                                    <span className={`text-xs font-bold flex items-center gap-0.5 ${isPos ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {isPos ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                                        {Math.abs(item.change).toFixed(2)}%
                                    </span>
                                )}
                                {item.format === 'rate' && (
                                    <span className="text-xs text-slate-400">ao ano</span>
                                )}
                            </>
                        ) : (
                            <span className="text-xs text-slate-400">—</span>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// ─── Sentiment Bar ────────────────────────────────────────────────────────────

const SentimentBar = ({ news }: { news: InvestmentNews[] }) => {
    const total = news.length;
    if (total === 0) return null;

    const positive = news.filter(n => n.sentiment === 'positive').length;
    const negative = news.filter(n => n.sentiment === 'negative').length;

    const posPct = Math.round((positive / total) * 100);
    const negPct = Math.round((negative / total) * 100);
    const neuPct = 100 - posPct - negPct;
    const dominant = posPct >= negPct ? 'positive' : 'negative';

    return (
        <div className="mb-6 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-bold text-slate-700 dark:text-white">Sentimento do Mercado</span>
                    <span className="hidden sm:inline text-xs text-slate-400">baseado em {total} notícias</span>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${dominant === 'positive'
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-100 dark:bg-rose-900/30 text-rose-500'}`}>
                    {dominant === 'positive' ? '📈 Otimista' : '📉 Pessimista'}
                </span>
            </div>
            <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
                {posPct > 0 && <div className="bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${posPct}%` }} />}
                {neuPct > 0 && <div className="bg-slate-300 dark:bg-slate-600 rounded-full transition-all duration-700" style={{ width: `${neuPct}%` }} />}
                {negPct > 0 && <div className="bg-rose-500 rounded-full transition-all duration-700" style={{ width: `${negPct}%` }} />}
            </div>
            <div className="flex flex-wrap justify-between mt-2 gap-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />{posPct}% positivo</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 inline-block" />{neuPct}% neutro</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />{negPct}% negativo</span>
            </div>
        </div>
    );
};

// ─── Action Buttons (Bookmark + Share) ────────────────────────────────────────

const NewsActions = ({
    news, savedUrls, onToggleSave, dark = false
}: {
    news: InvestmentNews;
    savedUrls: Set<string>;
    onToggleSave: (news: InvestmentNews) => void;
    dark?: boolean;
}) => {
    const isSaved = savedUrls.has(news.url);
    const [sharing, setSharing] = useState(false);
    const [shared, setShared] = useState(false);

    const handleShare = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (sharing) return;
        setSharing(true);
        await shareArticle(news);
        setShared(true);
        setTimeout(() => { setSharing(false); setShared(false); }, 2000);
    };

    const handleSave = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onToggleSave(news);
    };

    const base = dark
        ? 'p-1.5 rounded-lg transition-all active:scale-90'
        : 'p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all active:scale-90';

    return (
        <div className="flex items-center gap-1">
            <button onClick={handleSave} title={isSaved ? 'Remover dos salvos' : 'Salvar notícia'} className={base}>
                {isSaved
                    ? <BookmarkCheck className={`w-4 h-4 ${dark ? 'text-emerald-500' : 'text-emerald-300'}`} />
                    : <Bookmark className={`w-4 h-4 ${dark ? 'text-slate-400 hover:text-emerald-500' : 'text-white/70 hover:text-white'}`} />
                }
            </button>
            <button onClick={handleShare} title="Compartilhar" className={base}>
                <Share2 className={`w-4 h-4 ${shared ? (dark ? 'text-emerald-500' : 'text-emerald-300') : (dark ? 'text-slate-400 hover:text-emerald-500' : 'text-white/70 hover:text-white')}`} />
            </button>
        </div>
    );
};

// ─── Hero Card ────────────────────────────────────────────────────────────────

const HeroCard = ({ news, savedUrls, onToggleSave }: {
    news: InvestmentNews;
    savedUrls: Set<string>;
    onToggleSave: (news: InvestmentNews) => void;
}) => {
    const formattedDate = news.timestamp ? new Date(news.timestamp).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
    }) : '';

    const sentimentIcon = news.sentiment === 'positive'
        ? <TrendingUp className="w-4 h-4 text-emerald-400" />
        : news.sentiment === 'negative'
            ? <TrendingDown className="w-4 h-4 text-rose-400" />
            : <Minus className="w-4 h-4 text-slate-400" />;

    return (
        <div className="group mb-6 relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-500">
            {news.image && (
                <div className="absolute inset-0">
                    <img src={news.image} alt={news.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/70 to-slate-900/20" />
                </div>
            )}
            <div className={`relative p-5 sm:p-8 ${news.image ? 'min-h-[260px] sm:min-h-[320px] flex flex-col justify-end' : 'bg-gradient-to-br from-emerald-600 to-cyan-600 min-h-[200px] flex flex-col justify-end'}`}>
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 flex-wrap">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white"
                        style={{ backgroundColor: news.sourceColor || '#10B981' }}>
                        {news.source}
                    </span>
                    {news.category && (
                        <span className="px-2.5 py-1 rounded-full bg-white/20 text-white text-xs font-semibold">
                            {news.category}
                        </span>
                    )}
                    <div className="flex items-center gap-1.5 text-white/70 text-xs ml-auto">
                        <Clock className="w-3 h-3" />
                        {formattedDate}
                    </div>
                </div>
                <h2 className="text-lg sm:text-2xl font-black text-white mb-2 sm:mb-3 leading-tight max-w-3xl">
                    {news.title}
                </h2>
                <p className="text-white/75 text-sm mb-4 sm:mb-5 max-w-2xl line-clamp-2 hidden sm:block">{news.description}</p>
                <div className="flex items-center justify-between">
                    <a href={news.url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-emerald-50 transition-colors active:scale-95">
                        Ler matéria completa
                        <ExternalLink className="w-4 h-4" />
                    </a>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 text-white/70 text-xs">
                            {sentimentIcon}
                            <span className="hidden sm:inline capitalize">
                                {news.sentiment === 'positive' ? 'Positivo' : news.sentiment === 'negative' ? 'Negativo' : 'Neutro'}
                            </span>
                        </div>
                        <NewsActions news={news} savedUrls={savedUrls} onToggleSave={onToggleSave} dark={false} />
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── News Card (grid mode) ────────────────────────────────────────────────────

const NewsCard = ({ news, savedUrls, onToggleSave }: {
    news: InvestmentNews;
    savedUrls: Set<string>;
    onToggleSave: (news: InvestmentNews) => void;
}) => {
    const formattedDate = news.timestamp ? new Date(news.timestamp).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
    }) : '';

    const sentimentBg = news.sentiment === 'positive'
        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
        : news.sentiment === 'negative'
            ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-500'
            : 'bg-slate-100 dark:bg-slate-700/50 text-slate-500';

    const SentimentIcon = news.sentiment === 'positive' ? TrendingUp : news.sentiment === 'negative' ? TrendingDown : Minus;

    return (
        <div className="group bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full active:scale-[0.98]">
            {news.image && (
                <div className="relative h-44 overflow-hidden flex-shrink-0">
                    <img src={news.image} alt={news.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    {/* Save button overlay */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <NewsActions news={news} savedUrls={savedUrls} onToggleSave={onToggleSave} dark={false} />
                    </div>
                </div>
            )}

            <div className="p-4 sm:p-5 flex flex-col flex-grow">
                <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white"
                        style={{ backgroundColor: news.sourceColor || '#10B981' }}>
                        {news.source}
                    </span>
                    <div className="flex items-center gap-1">
                        {news.category && news.category !== 'Geral' && (
                            <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
                                {news.category}
                            </span>
                        )}
                        {/* Always show actions on mobile (no hover) */}
                        <div className="sm:hidden">
                            <NewsActions news={news} savedUrls={savedUrls} onToggleSave={onToggleSave} dark={true} />
                        </div>
                    </div>
                </div>

                {formattedDate && (
                    <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-xs mb-2">
                        <Clock className="w-3 h-3" />
                        {formattedDate}
                    </div>
                )}

                <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-2 line-clamp-3 leading-snug group-hover:text-emerald-500 transition-colors">
                    {news.title}
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-3 leading-relaxed flex-grow">
                    {news.description}
                </p>

                <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700/50">
                    <a href={news.url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors">
                        Ler notícia completa
                        <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${sentimentBg}`}>
                            <SentimentIcon className="w-3 h-3" />
                            {news.sentiment === 'positive' ? '+' : news.sentiment === 'negative' ? '−' : '≈'}
                        </div>
                        {/* Desktop actions (hidden on mobile, shown via hover on card image) */}
                        <div className="hidden sm:flex">
                            <NewsActions news={news} savedUrls={savedUrls} onToggleSave={onToggleSave} dark={true} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Compact Row (list mode) ──────────────────────────────────────────────────

const CompactRow = ({ news, savedUrls, onToggleSave }: {
    news: InvestmentNews;
    savedUrls: Set<string>;
    onToggleSave: (news: InvestmentNews) => void;
}) => {
    const formattedDate = news.timestamp ? new Date(news.timestamp).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    }) : '';

    const sentimentColor = news.sentiment === 'positive' ? 'text-emerald-500' : news.sentiment === 'negative' ? 'text-rose-500' : 'text-slate-400';
    const SentimentIcon = news.sentiment === 'positive' ? TrendingUp : news.sentiment === 'negative' ? TrendingDown : Minus;

    return (
        <div className="group flex items-start gap-3 p-3 sm:p-4 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800/50 transition-all duration-200 active:scale-[0.99]">
            {/* Thumbnail */}
            {news.image && (
                <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden">
                    <img src={news.image} alt={news.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-white"
                        style={{ backgroundColor: news.sourceColor || '#10B981' }}>
                        {news.source}
                    </span>
                    {news.category && news.category !== 'Geral' && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-semibold">
                            {news.category}
                        </span>
                    )}
                    <span className={`${sentimentColor} ml-auto`}>
                        <SentimentIcon className="w-3.5 h-3.5" />
                    </span>
                </div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-white line-clamp-2 leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors mb-1">
                    {news.title}
                </h3>
                <div className="flex items-center gap-3">
                    {formattedDate && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />{formattedDate}
                        </span>
                    )}
                    <a href={news.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">
                        Ler <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
            </div>

            {/* Actions */}
            <div className="flex-shrink-0 flex items-center">
                <NewsActions news={news} savedUrls={savedUrls} onToggleSave={onToggleSave} dark={true} />
            </div>
        </div>
    );
};

// ─── Skeleton Loaders ─────────────────────────────────────────────────────────

const SkeletonCard = () => (
    <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl h-[360px] overflow-hidden animate-pulse">
        <div className="h-44 bg-slate-100 dark:bg-slate-700" />
        <div className="p-5 space-y-3">
            <div className="flex gap-2">
                <div className="h-5 w-20 bg-slate-100 dark:bg-slate-700 rounded-lg" />
                <div className="h-5 w-16 bg-slate-100 dark:bg-slate-700 rounded-lg" />
            </div>
            <div className="h-3 w-24 bg-slate-100 dark:bg-slate-700 rounded" />
            <div className="space-y-2">
                <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded" />
                <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded w-4/5" />
            </div>
        </div>
    </div>
);

const SkeletonRow = () => (
    <div className="flex items-start gap-3 p-4 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl animate-pulse">
        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
            <div className="h-3 w-24 bg-slate-100 dark:bg-slate-700 rounded" />
            <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded w-full" />
            <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded w-3/4" />
            <div className="h-3 w-16 bg-slate-100 dark:bg-slate-700 rounded" />
        </div>
    </div>
);

// ─── Saved News Drawer (mobile-friendly side panel) ───────────────────────────

const SavedDrawer = ({
    open, onClose, savedNews, savedUrls, onToggleSave
}: {
    open: boolean;
    onClose: () => void;
    savedNews: InvestmentNews[];
    savedUrls: Set<string>;
    onToggleSave: (news: InvestmentNews) => void;
}) => {
    if (!open) return null;
    return (
        <>
            {/* Overlay */}
            <div className="fixed inset-0 bg-black/40 z-40 animate-fade-in" onClick={onClose} />
            {/* Drawer */}
            <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-slide-in-right">
                <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                        <BookmarkCheck className="w-5 h-5 text-emerald-500" />
                        <h2 className="font-bold text-slate-800 dark:text-white">Notícias Salvas</h2>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 font-bold">
                            {savedNews.length}
                        </span>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {savedNews.length === 0 ? (
                        <div className="text-center py-16">
                            <Bookmark className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                                Nenhuma notícia salva ainda.
                            </p>
                            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                                Clique no 🔖 de qualquer notícia para salvar.
                            </p>
                        </div>
                    ) : (
                        savedNews.map((item, idx) => (
                            <CompactRow key={`saved-${item.url}-${idx}`} news={item} savedUrls={savedUrls} onToggleSave={onToggleSave} />
                        ))
                    )}
                </div>
            </div>
        </>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const NewsFeed = ({ user }: { user: UserProfile }) => {
    const isSuper = user?.status_assinatura === 'active';

    if (!isSuper) {
        return <SuperPaywall feature="Insights de Mercado" userEmail={user?.email} />;
    }

    const [news, setNews] = useState<InvestmentNews[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState('');
    const [activeCategory, setActiveCategory] = useState<NewsCategory>('Todos');
    const [visibleCount, setVisibleCount] = useState(9);
    const [market, setMarket] = useState<MarketOverview | null>(null);
    const [marketLoading, setMarketLoading] = useState(true);

    // New UX state
    const [viewMode, setViewMode] = useState<ViewMode>('card');
    const [savedUrls, setSavedUrls] = useState<Set<string>>(new Set());
    const [savedNews, setSavedNews] = useState<InvestmentNews[]>([]);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [toastMsg, setToastMsg] = useState('');
    const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showToast = (msg: string) => {
        setToastMsg(msg);
        if (toastRef.current) clearTimeout(toastRef.current);
        toastRef.current = setTimeout(() => setToastMsg(''), 2500);
    };

    // Load saved news from Supabase
    const loadSaved = useCallback(async () => {
        try {
            const { data } = await supabase
                .from('saved_news')
                .select('*')
                .eq('user_id', user.id)
                .order('saved_at', { ascending: false });
            if (data) {
                setSavedUrls(new Set(data.map((r: any) => r.url)));
                setSavedNews(data.map((r: any) => ({
                    title: r.title,
                    description: r.description,
                    url: r.url,
                    image: r.image,
                    source: r.source,
                    sourceColor: r.source_color,
                    category: r.category,
                    sentiment: r.sentiment,
                    timestamp: r.timestamp,
                })));
            }
        } catch { /* silent */ }
    }, [user.id]);

    // Toggle save/unsave
    const handleToggleSave = useCallback(async (item: InvestmentNews) => {
        const alreadySaved = savedUrls.has(item.url);
        if (alreadySaved) {
            // Optimistic remove
            setSavedUrls(prev => { const s = new Set(prev); s.delete(item.url); return s; });
            setSavedNews(prev => prev.filter(n => n.url !== item.url));
            showToast('Notícia removida dos salvos');
            await supabase.from('saved_news').delete().eq('user_id', user.id).eq('url', item.url);
        } else {
            // Optimistic add
            setSavedUrls(prev => new Set(prev).add(item.url));
            setSavedNews(prev => [item, ...prev]);
            showToast('Notícia salva! 🔖');
            await supabase.from('saved_news').upsert({
                user_id: user.id,
                url: item.url,
                title: item.title,
                description: item.description,
                image: item.image,
                source: item.source,
                source_color: item.sourceColor,
                category: item.category,
                sentiment: item.sentiment,
                timestamp: item.timestamp,
            });
        }
    }, [savedUrls, user.id]);

    const loadNews = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // BACKEND SECURITY CHECK: Prevent React State Spoofing for Premium Features
            const { data: dbUser } = await supabase.from('usuarios').select('tem_plano').eq('id', user.id).single();
            if (!dbUser?.tem_plano) {
                setError('Assinatura inválida no servidor. Atualize a página.');
                setNews([]);
                setLoading(false);
                return;
            }
            const data = await fetchInvestmentNews();
            if (data.length === 0) {
                setError('Nenhuma notícia encontrada no momento.');
            } else {
                setNews(data);
            }
        } catch {
            setError('Erro ao carregar notícias. Tente novamente mais tarde.');
        } finally {
            setLoading(false);
        }
    }, [user.id]);

    const loadMarket = useCallback(async () => {
        setMarketLoading(true);
        try {
            const data = await fetchMarketOverview();
            setMarket(data);
        } catch { /* silent */ } finally {
            setMarketLoading(false);
        }
    }, []);

    useEffect(() => {
        loadNews();
        loadMarket();
        loadSaved();

        const newsInterval = setInterval(loadNews, 5 * 60 * 1000);
        const marketInterval = setInterval(loadMarket, 2 * 60 * 1000);
        return () => {
            clearInterval(newsInterval);
            clearInterval(marketInterval);
        };
    }, [loadNews, loadMarket, loadSaved]);

    const filteredNews = useMemo(() => {
        return news.filter(item => {
            const matchesSearch = !filter || (
                item.title.toLowerCase().includes(filter.toLowerCase()) ||
                item.description.toLowerCase().includes(filter.toLowerCase()) ||
                item.source.toLowerCase().includes(filter.toLowerCase())
            );
            const matchesCategory = activeCategory === 'Todos' ||
                (item.category || 'Geral') === activeCategory;
            return matchesSearch && matchesCategory;
        });
    }, [news, filter, activeCategory]);

    const heroNews = filteredNews[0];
    const listNews = filteredNews.slice(viewMode === 'card' ? 1 : 0, visibleCount + (viewMode === 'card' ? 1 : 0));
    const hasMore = filteredNews.length > visibleCount + (viewMode === 'card' ? 1 : 0);

    const handleRefresh = () => {
        setVisibleCount(9);
        loadNews();
        loadMarket();
    };

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 animate-fade-in">
            {/* Toast */}
            {toastMsg && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-slate-800 text-white text-sm font-semibold rounded-2xl shadow-2xl animate-fade-in flex items-center gap-2">
                    {toastMsg}
                </div>
            )}

            {/* Saved Drawer */}
            <SavedDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                savedNews={savedNews}
                savedUrls={savedUrls}
                onToggleSave={handleToggleSave}
            />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white mb-1 flex items-center gap-2 sm:gap-3">
                        <Newspaper className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500" />
                        Insights do Mercado
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                        Atualizações financeiras de múltiplas fontes, em tempo real.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Search */}
                    <div className="relative flex-1 sm:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={filter}
                            onChange={(e) => { setFilter(e.target.value); setVisibleCount(9); }}
                            className="pl-8 pr-3 py-2.5 w-full sm:w-48 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        />
                        {filter && (
                            <button onClick={() => setFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                                <X className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                        )}
                    </div>

                    {/* View toggle */}
                    <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800">
                        <button
                            onClick={() => setViewMode('card')}
                            className={`p-2.5 transition-colors ${viewMode === 'card' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                            title="Modo cards"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('compact')}
                            className={`p-2.5 transition-colors ${viewMode === 'compact' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                            title="Modo compacto"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Saved */}
                    <button
                        onClick={() => setDrawerOpen(true)}
                        className="relative p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                        title="Notícias salvas"
                    >
                        <Bookmark className="w-4 h-4 text-slate-500" />
                        {savedUrls.size > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                {savedUrls.size > 9 ? '9+' : savedUrls.size}
                            </span>
                        )}
                    </button>

                    {/* Refresh */}
                    <button
                        onClick={handleRefresh}
                        disabled={loading}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Market Panel */}
            <MarketPanel market={market} loading={marketLoading} />

            {/* Category Filters — scrollable on mobile */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => { setActiveCategory(cat.id); setVisibleCount(9); }}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${activeCategory === cat.id
                            ? 'text-white border-transparent shadow-lg'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'}`}
                        style={activeCategory === cat.id ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
                    >
                        {cat.icon}
                        <span className="whitespace-nowrap">{cat.label}</span>
                        {cat.id !== 'Todos' && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeCategory === cat.id
                                ? 'bg-white/25 text-white'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                                {news.filter(n => (n.category || 'Geral') === cat.id).length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Sentiment Bar */}
            {!loading && !error && news.length > 0 && (
                <SentimentBar news={
                    activeCategory === 'Todos' ? news : news.filter(n => (n.category || 'Geral') === activeCategory)
                } />
            )}

            {/* Content Area */}
            {loading ? (
                viewMode === 'card' ? (
                    <div className="space-y-6">
                        <div className="h-64 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-3xl animate-pulse" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <SkeletonRow key={i} />)}
                    </div>
                )
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-16 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{error}</h3>
                    <button onClick={loadNews}
                        className="mt-4 px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors">
                        Tentar novamente
                    </button>
                </div>
            ) : filteredNews.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <Newspaper className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                        Nenhuma notícia encontrada{filter ? ` para "${filter}"` : ''}.
                    </p>
                    <button onClick={() => { setFilter(''); setActiveCategory('Todos'); }}
                        className="mt-4 text-sm text-emerald-500 hover:underline font-semibold">
                        Limpar filtros
                    </button>
                </div>
            ) : (
                <>
                    {/* Card mode: Hero + grid */}
                    {viewMode === 'card' && (
                        <>
                            {heroNews && (
                                <HeroCard news={heroNews} savedUrls={savedUrls} onToggleSave={handleToggleSave} />
                            )}
                            {listNews.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                    {listNews.map((item, idx) => (
                                        <NewsCard key={`${item.url}-${idx}`} news={item} savedUrls={savedUrls} onToggleSave={handleToggleSave} />
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* Compact mode: list */}
                    {viewMode === 'compact' && (
                        <div className="space-y-2">
                            {listNews.map((item, idx) => (
                                <CompactRow key={`${item.url}-${idx}`} news={item} savedUrls={savedUrls} onToggleSave={handleToggleSave} />
                            ))}
                        </div>
                    )}

                    {/* Load More */}
                    {hasMore && (
                        <div className="flex justify-center mt-8">
                            <button
                                onClick={() => setVisibleCount(v => v + 9)}
                                className="flex items-center gap-2 px-6 sm:px-8 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:border-emerald-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all shadow-sm active:scale-95"
                            >
                                <ChevronDown className="w-4 h-4" />
                                Carregar mais ({filteredNews.length - visibleCount - (viewMode === 'card' ? 1 : 0)} restantes)
                            </button>
                        </div>
                    )}

                    {/* Stats footer */}
                    <div className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
                        Exibindo {Math.min(visibleCount + (viewMode === 'card' ? 1 : 0), filteredNews.length)} de {filteredNews.length} notícias •{' '}
                        Atualizado: {market?.updatedAt ? new Date(market.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'} •{' '}
                        Fontes: InfoMoney, Exame Invest, Valor Econômico, Portal Bitcoin
                    </div>
                </>
            )}
        </div>
    );
};

export default NewsFeed;
