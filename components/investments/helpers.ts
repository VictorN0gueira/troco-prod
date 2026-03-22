import { InvestmentType, Investment } from '../../types';
import {
    LineChart, Building2, BarChart2, Layers, ShieldCheck, Landmark, Briefcase,
    Globe, Home, Bitcoin, Star, Flame, Package
} from 'lucide-react';

// ─── Constants ──────────────────────────────────────────────────────────

export const INVESTMENT_TYPES: InvestmentType[] = [
    'Ações', 'FII', 'ETF', 'BDR', 'Tesouro Direto', 'Renda Fixa', 'Debêntures',
    'Stocks EUA', 'REITs', 'Crypto',
    'Imóvel', 'Previdência', 'Commodities', 'Outros',
];

export const SIMPLE_TYPES: InvestmentType[] = [
    'Renda Fixa', 'Tesouro Direto', 'Debêntures', 'Previdência', 'Imóvel', 'Commodities',
];

export const isSimpleType = (t: InvestmentType) => SIMPLE_TYPES.includes(t);

export const TYPE_META: Record<InvestmentType, { color: string; bg: string; darkBg: string; icon: React.FC<any> }> = {
    'Ações': { color: '#3B82F6', bg: 'bg-blue-50', darkBg: 'dark:bg-blue-500/10', icon: LineChart },
    'FII': { color: '#8B5CF6', bg: 'bg-violet-50', darkBg: 'dark:bg-violet-500/10', icon: Building2 },
    'ETF': { color: '#06B6D4', bg: 'bg-cyan-50', darkBg: 'dark:bg-cyan-500/10', icon: BarChart2 },
    'BDR': { color: '#0EA5E9', bg: 'bg-sky-50', darkBg: 'dark:bg-sky-500/10', icon: Layers },
    'Tesouro Direto': { color: '#10B981', bg: 'bg-emerald-50', darkBg: 'dark:bg-emerald-500/10', icon: ShieldCheck },
    'Renda Fixa': { color: '#22C55E', bg: 'bg-green-50', darkBg: 'dark:bg-green-500/10', icon: Landmark },
    'Debêntures': { color: '#84CC16', bg: 'bg-lime-50', darkBg: 'dark:bg-lime-500/10', icon: Briefcase },
    'Stocks EUA': { color: '#EC4899', bg: 'bg-pink-50', darkBg: 'dark:bg-pink-500/10', icon: Globe },
    'REITs': { color: '#F43F5E', bg: 'bg-rose-50', darkBg: 'dark:bg-rose-500/10', icon: Home },
    'Crypto': { color: '#F59E0B', bg: 'bg-amber-50', darkBg: 'dark:bg-amber-500/10', icon: Bitcoin },
    'Imóvel': { color: '#F97316', bg: 'bg-orange-50', darkBg: 'dark:bg-orange-500/10', icon: Home },
    'Previdência': { color: '#A855F7', bg: 'bg-purple-50', darkBg: 'dark:bg-purple-500/10', icon: Star },
    'Commodities': { color: '#EF4444', bg: 'bg-red-50', darkBg: 'dark:bg-red-500/10', icon: Flame },
    'Outros': { color: '#64748B', bg: 'bg-slate-50', darkBg: 'dark:bg-slate-500/10', icon: Package },
};

export const PIE_COLORS = [
    '#3B82F6', '#8B5CF6', '#06B6D4', '#0EA5E9', '#10B981', '#22C55E', '#84CC16',
    '#EC4899', '#F43F5E', '#F59E0B', '#F97316', '#A855F7', '#EF4444', '#64748B',
];

// ─── Formatters ─────────────────────────────────────────────────────────

export const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export const formatPercent = (val: number) =>
    `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;

export const getNextId = () => `inv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export const formatNumberBR = (raw: string, allowDecimals = true): string => {
    if (!raw) return '';
    let cleaned = raw.replace(/[^\d,]/g, '');
    if (!allowDecimals) cleaned = cleaned.replace(/,/g, '');
    const parts = cleaned.split(',');
    const intFormatted = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    if (parts.length > 1) return intFormatted + ',' + parts[1];
    return intFormatted;
};

export const parseNumberBR = (val: string): number => {
    if (!val) return 0;
    const normalized = val.replace(/\./g, '').replace(',', '.');
    return parseFloat(normalized) || 0;
};

// ─── Computed helpers ───────────────────────────────────────────────────

export interface ComputedInvestment {
    inv: Investment;
    cost: number;
    current: number;
    pnl: number;
    pnlPct: number;
    weight: number;
}

export const computeStats = (investments: Investment[]) => {
    const totalCost = investments.reduce((s, i) => s + i.quantity * i.purchase_price, 0);
    const totalCurrent = investments.reduce((s, i) => s + i.quantity * i.current_price, 0);
    const pnlAbs = totalCurrent - totalCost;
    const pnlPct = totalCost > 0 ? (pnlAbs / totalCost) * 100 : 0;
    return { totalCost, totalCurrent, pnlAbs, pnlPct, count: investments.length };
};

export const computeDiversificationScore = (investments: Investment[]): number => {
    if (investments.length === 0) return 0;
    const totalVal = investments.reduce((s, i) => s + i.quantity * i.current_price, 0);
    if (totalVal === 0) return 0;

    const types = new Set(investments.map(i => i.type));
    const typeScore = Math.min(types.size / 5, 1) * 4;

    const maxConc = investments.reduce((max, inv) => {
        const w = (inv.quantity * inv.current_price) / totalVal;
        return Math.max(max, w);
    }, 0);
    const concScore = (1 - maxConc) * 4;

    const hasIntl = investments.some(i => ['Stocks EUA', 'REITs', 'BDR'].includes(i.type));
    const hasCrypto = investments.some(i => i.type === 'Crypto');
    const hasFixedIncome = investments.some(i => ['Tesouro Direto', 'Renda Fixa', 'Debêntures'].includes(i.type));
    const intlScore = (hasIntl ? 1 : 0) + (hasCrypto ? 0.5 : 0) + (hasFixedIncome ? 0.5 : 0);

    return Math.min(10, Math.round((typeScore + concScore + intlScore) * 10) / 10);
};

export const computeConcentrationAlert = (investments: Investment[]) => {
    const totalVal = investments.reduce((s, i) => s + i.quantity * i.current_price, 0);
    if (totalVal === 0 || investments.length < 2) return null;
    const biggest = investments.reduce((max, inv) => {
        const w = (inv.quantity * inv.current_price) / totalVal;
        return w > max.weight ? { inv, weight: w } : max;
    }, { inv: investments[0], weight: 0 });
    return biggest.weight >= 0.4 ? biggest : null;
};

// ─── Price Cache ────────────────────────────────────────────────────────

const PRICE_CACHE_KEY = 'troco_investment_prices_cache';
const PRICE_CACHE_TTL = 15 * 60 * 1000; // 15 min

export interface CachedPrices {
    prices: Record<string, number>;
    timestamp: number;
}

export const getPriceCache = (): CachedPrices | null => {
    try {
        const raw = localStorage.getItem(PRICE_CACHE_KEY);
        if (!raw) return null;
        const cached: CachedPrices = JSON.parse(raw);
        if (Date.now() - cached.timestamp > PRICE_CACHE_TTL) return null;
        return cached;
    } catch { return null; }
};

export const setPriceCache = (prices: Record<string, number>) => {
    try {
        const data: CachedPrices = { prices, timestamp: Date.now() };
        localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(data));
    } catch { /* ignore */ }
};

// ─── Allocation Targets (persisted in localStorage) ─────────────────────

const ALLOCATION_TARGETS_KEY = 'troco_allocation_targets';

export type AllocationTargets = Partial<Record<InvestmentType, number>>; // percentages 0-100

export const getAllocationTargets = (): AllocationTargets => {
    try {
        const raw = localStorage.getItem(ALLOCATION_TARGETS_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
};

export const setAllocationTargets = (targets: AllocationTargets) => {
    try {
        localStorage.setItem(ALLOCATION_TARGETS_KEY, JSON.stringify(targets));
    } catch { /* ignore */ }
};
