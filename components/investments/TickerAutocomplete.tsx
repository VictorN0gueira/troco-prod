import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, Check } from 'lucide-react';

interface TickerAutocompleteProps {
    value: string;
    onChange: (ticker: string) => void;
    onSelect?: (ticker: string) => void;
    className?: string;
    placeholder?: string;
}

// Cache global da lista de tickers (compartilhado entre instâncias)
let allTickers: string[] = [];
let cacheTimestamp = 0;
const CACHE_TTL = 1000 * 60 * 30; // 30 min

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || '';

async function loadAllTickers(): Promise<string[]> {
    const now = Date.now();
    if (allTickers.length > 0 && (now - cacheTimestamp) < CACHE_TTL) {
        return allTickers;
    }

    try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/ticker-search`, {
            headers: { 'apikey': SUPABASE_KEY },
        });
        if (!res.ok) return allTickers;
        const json = await res.json();
        if (json?.tickers?.length > 0) {
            allTickers = json.tickers;
            cacheTimestamp = now;
        }
    } catch { /* fail silently */ }

    return allTickers;
}

// Pré-carrega ao importar
loadAllTickers();

function filterTickers(query: string): string[] {
    if (!query || query.length < 2) return [];
    const upper = query.toUpperCase();
    // Prioriza tickers que COMEÇAM com a busca, depois os que CONTÊM
    const startsWith: string[] = [];
    const contains: string[] = [];

    for (const t of allTickers) {
        if (t.startsWith(upper)) startsWith.push(t);
        else if (t.includes(upper)) contains.push(t);
        if (startsWith.length + contains.length >= 12) break;
    }

    return [...startsWith, ...contains].slice(0, 12);
}

function getTickerBadge(ticker: string) {
    if (/^\^/.test(ticker)) return { label: 'Índice', color: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' };
    if (ticker.endsWith('11') && ticker.length >= 6) return { label: 'FII', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' };
    if (/^[A-Z]{4}(3|4)$/.test(ticker)) return { label: 'Ação', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' };
    if (/^[A-Z]{4}(34|35)$/.test(ticker)) return { label: 'BDR', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' };
    return null;
}

const TickerAutocomplete: React.FC<TickerAutocompleteProps> = ({
    value,
    onChange,
    onSelect,
    className = '',
    placeholder = 'PETR4, MXRF11...',
}) => {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [highlightIdx, setHighlightIdx] = useState(-1);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const close = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    const doSearch = useCallback(async (query: string) => {
        if (query.length < 2) {
            setSuggestions([]);
            setIsOpen(false);
            return;
        }

        setLoading(true);
        try {
            // Garante que tickers estão carregados
            if (allTickers.length === 0) await loadAllTickers();
            const results = filterTickers(query);
            setSuggestions(results);
            setIsOpen(results.length > 0);
            setHighlightIdx(-1);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.toUpperCase();
        onChange(val);
        doSearch(val);
    };

    const handleSelect = (ticker: string) => {
        onChange(ticker);
        onSelect?.(ticker);
        setIsOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen || suggestions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightIdx(p => (p + 1) % suggestions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightIdx(p => p <= 0 ? suggestions.length - 1 : p - 1);
        } else if (e.key === 'Enter' && highlightIdx >= 0) {
            e.preventDefault();
            handleSelect(suggestions[highlightIdx]);
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    return (
        <div ref={wrapperRef} className="relative">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
                <input
                    type="text"
                    className={`!pl-9 ${className}`}
                    placeholder={placeholder}
                    value={value}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => { if (value.length >= 2) doSearch(value); }}
                    autoComplete="off"
                />
                {loading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 animate-spin" />
                )}
            </div>

            {isOpen && suggestions.length > 0 && (
                <div className="absolute z-[200] w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-52 overflow-y-auto">
                    {suggestions.map((ticker, i) => {
                        const badge = getTickerBadge(ticker);
                        const isHighlighted = i === highlightIdx;

                        return (
                            <button
                                key={ticker}
                                type="button"
                                className={`w-full px-3 py-2.5 flex items-center justify-between text-left text-sm transition-colors
                                    ${isHighlighted ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}
                                    ${i === 0 ? 'rounded-t-xl' : ''} ${i === suggestions.length - 1 ? 'rounded-b-xl' : ''}
                                `}
                                onClick={() => handleSelect(ticker)}
                                onMouseEnter={() => setHighlightIdx(i)}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-slate-800 dark:text-white">{ticker}</span>
                                    {badge && (
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badge.color}`}>
                                            {badge.label}
                                        </span>
                                    )}
                                </div>
                                {ticker === value && <Check className="w-4 h-4 text-emerald-500" />}
                            </button>
                        );
                    })}
                </div>
            )}

            {isOpen && suggestions.length === 0 && !loading && value.length >= 2 && (
                <div className="absolute z-[200] w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-3 text-center">
                    <p className="text-xs text-slate-500">Nenhum ticker "{value}" encontrado na B3</p>
                    <p className="text-[10px] text-slate-400 mt-1">Você pode usar este código manualmente</p>
                </div>
            )}
        </div>
    );
};

export default TickerAutocomplete;
