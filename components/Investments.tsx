import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Investment, InvestmentType, UserProfile } from '../types';
import {
    TrendingUp, TrendingDown, Plus, Pencil, Trash2, X, Search,
    DollarSign, BarChart2, Briefcase, AlertCircle, ChevronDown,
    Building2, Bitcoin, Globe, Landmark, LineChart, Package,
    ArrowUpRight, ArrowDownRight, Info, RefreshCw, CheckCircle2,
    TrendingUp as TrendUp, Activity, Wifi, WifiOff, Clock,
    Layers, Home, ShieldCheck, Coins, Flame, Star
} from 'lucide-react';
import {
    PieChart, Pie, Cell, Tooltip as PieTooltip, Legend, ResponsiveContainer,
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import ConfirmationModal from './ConfirmationModal';
import {
    fetchInvestmentPrices, fetchMarketOverview,
    PriceResult, MarketOverview, UPDATABLE_TYPES
} from '../services/priceApi';

// ─── Types & Helpers ─────────────────────────────────────────────────────────

interface InvestmentsProps {
    investments: Investment[];
    onAdd: (inv: Investment) => Promise<void>;
    onEdit: (inv: Investment) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onUpdatePrices: (updates: { id: string; current_price: number }[]) => Promise<void>;
    user: UserProfile;
    privacyMode?: boolean;
}

const INVESTMENT_TYPES: InvestmentType[] = [
    // Brasil
    'Ações', 'FII', 'ETF', 'BDR', 'Tesouro Direto', 'Renda Fixa', 'Debêntures',
    // Internacional
    'Stocks EUA', 'REITs',
    // Crypto
    'Crypto',
    // Alternativos
    'Imóvel', 'Previdência', 'Commodities',
    // Genérico
    'Outros',
];

// Types that don't have individual units/prices — user just enters total invested amount
const SIMPLE_TYPES: InvestmentType[] = [
    'Renda Fixa', 'Tesouro Direto', 'Debêntures', 'Previdência', 'Imóvel', 'Commodities',
];
const isSimpleType = (t: InvestmentType) => SIMPLE_TYPES.includes(t);

const TYPE_META: Record<InvestmentType, { color: string; bg: string; darkBg: string; icon: React.FC<any> }> = {
    // Brasil
    'Ações': { color: '#3B82F6', bg: 'bg-blue-50', darkBg: 'dark:bg-blue-500/10', icon: LineChart },
    'FII': { color: '#8B5CF6', bg: 'bg-violet-50', darkBg: 'dark:bg-violet-500/10', icon: Building2 },
    'ETF': { color: '#06B6D4', bg: 'bg-cyan-50', darkBg: 'dark:bg-cyan-500/10', icon: BarChart2 },
    'BDR': { color: '#0EA5E9', bg: 'bg-sky-50', darkBg: 'dark:bg-sky-500/10', icon: Layers },
    'Tesouro Direto': { color: '#10B981', bg: 'bg-emerald-50', darkBg: 'dark:bg-emerald-500/10', icon: ShieldCheck },
    'Renda Fixa': { color: '#22C55E', bg: 'bg-green-50', darkBg: 'dark:bg-green-500/10', icon: Landmark },
    'Debêntures': { color: '#84CC16', bg: 'bg-lime-50', darkBg: 'dark:bg-lime-500/10', icon: Briefcase },
    // Internacional
    'Stocks EUA': { color: '#EC4899', bg: 'bg-pink-50', darkBg: 'dark:bg-pink-500/10', icon: Globe },
    'REITs': { color: '#F43F5E', bg: 'bg-rose-50', darkBg: 'dark:bg-rose-500/10', icon: Home },
    // Crypto
    'Crypto': { color: '#F59E0B', bg: 'bg-amber-50', darkBg: 'dark:bg-amber-500/10', icon: Bitcoin },
    // Alternativos
    'Imóvel': { color: '#F97316', bg: 'bg-orange-50', darkBg: 'dark:bg-orange-500/10', icon: Home },
    'Previdência': { color: '#A855F7', bg: 'bg-purple-50', darkBg: 'dark:bg-purple-500/10', icon: Star },
    'Commodities': { color: '#EF4444', bg: 'bg-red-50', darkBg: 'dark:bg-red-500/10', icon: Flame },
    'Outros': { color: '#64748B', bg: 'bg-slate-50', darkBg: 'dark:bg-slate-500/10', icon: Package },
};

const PIE_COLORS = [
    '#3B82F6', '#8B5CF6', '#06B6D4', '#0EA5E9', '#10B981', '#22C55E', '#84CC16',
    '#EC4899', '#F43F5E', '#F59E0B', '#F97316', '#A855F7', '#EF4444', '#64748B',
];

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatPercent = (val: number) =>
    `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;

const getNextId = () => `inv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// Format a raw numeric string into Brazilian locale while typing
// e.g. '15000'  → '15.000'   (integers / quantity)
// e.g. '15000,5' → '15.000,5' (with decimal part preserved)
const formatNumberBR = (raw: string, allowDecimals = true): string => {
    if (!raw) return '';
    // Keep only digits and at most one comma
    let cleaned = raw.replace(/[^\d,]/g, '');
    if (!allowDecimals) cleaned = cleaned.replace(/,/g, '');
    const parts = cleaned.split(',');
    // Format integer part with dots as thousand separators
    const intFormatted = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    if (parts.length > 1) {
        return intFormatted + ',' + parts[1];
    }
    return intFormatted;
};

// Parse a BR-formatted string back to a JS number
// '15.000,50' → 15000.50
const parseNumberBR = (val: string): number => {
    if (!val) return 0;
    const normalized = val.replace(/\./g, '').replace(',', '.');
    return parseFloat(normalized) || 0;
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const BlurText = ({ children, privacyMode }: { children: React.ReactNode; privacyMode: boolean }) => (
    <span className={`transition-all duration-700 inline-block align-middle ${privacyMode ? 'filter blur-[8px] opacity-60 select-none cursor-default' : 'filter blur-0 opacity-100'
        }`}>
        {children}
    </span>
);

const TypeBadge = ({ type }: { type: InvestmentType }) => {
    const meta = TYPE_META[type];
    const Icon = meta.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${meta.bg} ${meta.darkBg}`}
            style={{ color: meta.color }}>
            <Icon className="w-3 h-3" />
            {type}
        </span>
    );
};

// ─── Market Overview Bar ─────────────────────────────────────────────────────

const MarketTicker = ({
    label, value, change, format = 'currency', loading
}: {
    label: string;
    value?: number;
    change?: number;
    format?: 'currency' | 'points' | 'crypto';
    loading?: boolean;
}) => {
    const formatVal = (v: number) => {
        if (format === 'points') return v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        if (format === 'crypto') return v >= 1_000 ? `R$\u00a0${(v / 1_000).toFixed(1)}k` : `R$\u00a0${v.toFixed(2)}`;
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
    };
    const isPositive = (change ?? 0) >= 0;
    return (
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{label}</span>
            {loading ? (
                <div className="h-3 w-14 rounded animate-pulse bg-slate-200 dark:bg-slate-700" />
            ) : value != null ? (
                <>
                    <span className="text-sm font-bold text-slate-800 dark:text-white whitespace-nowrap">{formatVal(value)}</span>
                    {change != null && (
                        <span className={`text-xs font-bold whitespace-nowrap ${isPositive ? 'text-emerald-500' : 'text-rose-500'
                            }`}>
                            {isPositive ? '+' : ''}{change.toFixed(2)}%
                        </span>
                    )}
                </>
            ) : (
                <span className="text-xs text-slate-400">—</span>
            )}
        </div>
    );
};

// ─── Empty State ─────────────────────────────────────────────────────────────

const EmptyState = ({ onAdd }: { onAdd: () => void }) => (
    <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/30">
            <TrendingUp className="w-10 h-10 text-white" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Sua carteira está vazia</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-6">
            Comece adicionando seus investimentos para acompanhar o desempenho da sua carteira.
        </p>
        <button
            onClick={onAdd}
            className="px-6 py-3 rounded-2xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 active:scale-95 transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2"
        >
            <Plus className="w-5 h-5" />
            Adicionar Primeiro Investimento
        </button>
    </div>
);

// ─── Add/Edit Modal ───────────────────────────────────────────────────────────

interface ModalProps {
    investment?: Investment | null;
    userId: number;
    onClose: () => void;
    onSave: (inv: Investment) => Promise<void>;
}

const InvestmentModal: React.FC<ModalProps> = ({ investment, userId, onClose, onSave }) => {
    const isEdit = !!investment;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Helper: format an existing number for initial display
    const numToBR = (n?: number) => n != null && n > 0
        ? formatNumberBR(n.toLocaleString('pt-BR', { maximumFractionDigits: 8, useGrouping: false }).replace('.', ','))
        : '';

    const [form, setForm] = useState({
        name: investment?.name || '',
        ticker: investment?.ticker || '',
        type: investment?.type || 'Ações' as InvestmentType,
        quantity: numToBR(investment?.quantity),
        purchase_price: numToBR(investment?.purchase_price),
        current_price: numToBR(investment?.current_price),
        // For simple types: total invested amount
        invested_amount: investment && isSimpleType(investment.type)
            ? numToBR(investment.purchase_price * (investment.quantity || 1))
            : '',
        purchase_date: investment?.purchase_date || new Date().toISOString().split('T')[0],
        broker: investment?.broker || '',
        notes: investment?.notes || '',
    });

    const set = (field: string, val: string) => setForm(prev => ({ ...prev, [field]: val }));

    const isSimple = isSimpleType(form.type);

    // For simple types, we track just a single monetary amount (quantity=1, purchase=current=amount)
    const qtyNum = isSimple ? 1 : parseNumberBR(form.quantity);
    const buyNum = isSimple ? parseNumberBR(form.invested_amount) : parseNumberBR(form.purchase_price);
    const curNum = isSimple ? parseNumberBR(form.invested_amount) : parseNumberBR(form.current_price);
    const currentValue = qtyNum * curNum;
    const cost = qtyNum * buyNum;
    const pnl = currentValue - cost;
    const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const simple = isSimpleType(form.type);
        const investedAmt = parseNumberBR(form.invested_amount);
        const qty = simple ? 1 : parseNumberBR(form.quantity);
        const buyPrice = simple ? investedAmt : parseNumberBR(form.purchase_price);
        const curPrice = simple ? investedAmt : parseNumberBR(form.current_price);

        if (!form.name.trim()) { setError('Nome do ativo é obrigatório.'); return; }
        if (simple && investedAmt <= 0) { setError('Valor investido deve ser maior que zero.'); return; }
        if (!simple && qty <= 0) { setError('Quantidade deve ser maior que zero.'); return; }
        if (!simple && buyPrice <= 0) { setError('Preço de compra deve ser maior que zero.'); return; }
        if (!simple && curPrice <= 0) { setError('Preço atual deve ser maior que zero.'); return; }

        setLoading(true);
        try {
            const inv: Investment = {
                id: investment?.id || getNextId(),
                user_id: userId,
                name: form.name.trim(),
                ticker: form.ticker.trim() || undefined,
                type: form.type,
                quantity: qty,
                purchase_price: buyPrice,
                current_price: curPrice,
                purchase_date: form.purchase_date,
                broker: form.broker.trim() || undefined,
                notes: form.notes.trim() || undefined,
            };
            await onSave(inv);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar investimento.');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm placeholder-slate-400";
    const labelClass = "block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider";

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
                <div className="relative w-full max-w-2xl bg-white dark:bg-slate-850 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 animate-fade-in-up overflow-hidden">

                    {/* Header */}
                    <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 p-6 flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-white">
                                {isEdit ? 'Editar Investimento' : 'Adicionar Investimento'}
                            </h3>
                            <p className="text-emerald-100 text-sm mt-0.5">
                                {isEdit ? 'Atualize os dados do ativo' : 'Registre um novo ativo na sua carteira'}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Live Preview Bar */}
                    {(qtyNum > 0 && buyNum > 0) && (
                        <div className="flex flex-wrap gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                            <div className="text-xs">
                                <span className="text-slate-500 block">Custo Total</span>
                                <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(cost)}</span>
                            </div>
                            {curNum > 0 && (
                                <>
                                    <div className="text-xs">
                                        <span className="text-slate-500 block">Valor Atual</span>
                                        <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(currentValue)}</span>
                                    </div>
                                    <div className="text-xs">
                                        <span className="text-slate-500 block">Resultado</span>
                                        <span className={`font-bold ${pnl >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                            {formatCurrency(pnl)} ({formatPercent(pnlPct)})
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        {error && (
                            <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-3 flex items-center gap-2 text-sm text-rose-600 dark:text-rose-300">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        {/* Row 1: Name + Ticker */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="sm:col-span-2">
                                <label className={labelClass}>Nome do Ativo *</label>
                                <input className={inputClass} placeholder="Ex: Petrobras, Tesouro Selic 2027" value={form.name} onChange={e => set('name', e.target.value)} required />
                            </div>
                            <div>
                                <label className={labelClass}>Ticker / Código</label>
                                <input className={inputClass} placeholder="PETR4, BTC" value={form.ticker} onChange={e => set('ticker', e.target.value.toUpperCase())} />
                            </div>
                        </div>

                        {/* Row 2: Type + Broker */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Tipo de Ativo *</label>
                                <div className="relative">
                                    <select
                                        className={`${inputClass} appearance-none pr-10`}
                                        value={form.type}
                                        onChange={e => set('type', e.target.value)}
                                    >
                                        {INVESTMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Corretora</label>
                                <input className={inputClass} placeholder="Ex: XP, Rico, Clear" value={form.broker} onChange={e => set('broker', e.target.value)} />
                            </div>
                        </div>

                        {/* Row 3: Qty + Prices — only for non-simple types */}
                        {!isSimple ? (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className={labelClass}>Quantidade *</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        className={inputClass}
                                        placeholder="0"
                                        value={form.quantity}
                                        onChange={e => set('quantity', formatNumberBR(e.target.value, true))}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Preço de Compra (R$) *</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        className={inputClass}
                                        placeholder="0,00"
                                        value={form.purchase_price}
                                        onChange={e => set('purchase_price', formatNumberBR(e.target.value, true))}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Preço Atual (R$) *</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        className={inputClass}
                                        placeholder="0,00"
                                        value={form.current_price}
                                        onChange={e => set('current_price', formatNumberBR(e.target.value, true))}
                                    />
                                </div>
                            </div>
                        ) : (
                            /* Simple type: just total amount invested */
                            <div>
                                <label className={labelClass}>Valor Investido (R$) *</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    className={inputClass}
                                    placeholder="0,00"
                                    value={form.invested_amount}
                                    onChange={e => set('invested_amount', formatNumberBR(e.target.value, true))}
                                />
                                <p className="text-xs text-slate-400 mt-1.5">💡 Para {form.type}, basta o valor total aplicado. Sem necessidade de cotas ou preço unitário.</p>
                            </div>
                        )}

                        {/* Row 4: Date + Notes */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Data de Compra *</label>
                                <input type="date" className={inputClass} value={form.purchase_date} onChange={e => set('purchase_date', e.target.value)} required />
                            </div>
                            <div>
                                <label className={labelClass}>Observações</label>
                                <input className={inputClass} placeholder="Notas adicionais..." value={form.notes} onChange={e => set('notes', e.target.value)} />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-medium text-sm">
                                Cancelar
                            </button>
                            <button type="submit" disabled={loading}
                                className="px-6 py-2.5 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 active:scale-95 transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-70 text-sm flex items-center gap-2">
                                {loading ? (
                                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Salvando...</>
                                ) : (
                                    <><Plus className="w-4 h-4" />{isEdit ? 'Salvar Alterações' : 'Adicionar Ativo'}</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const Investments: React.FC<InvestmentsProps> = ({
    investments,
    onAdd,
    onEdit,
    onDelete,
    onUpdatePrices,
    user,
    privacyMode = false
}) => {
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<InvestmentType | 'Todos'>('Todos');
    const [showModal, setShowModal] = useState(false);
    const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'list' | 'charts'>('list');

    // ── Price Update state
    const [priceResults, setPriceResults] = useState<Map<string, PriceResult>>(new Map());
    const [updatingPrices, setUpdatingPrices] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [updateError, setUpdateError] = useState<string | null>(null);
    const [updateSuccess, setUpdateSuccess] = useState(false);

    // ── Market overview state
    const [market, setMarket] = useState<MarketOverview | null>(null);
    const [marketLoading, setMarketLoading] = useState(false);

    // Load market overview on mount
    useEffect(() => {
        setMarketLoading(true);
        fetchMarketOverview()
            .then(setMarket)
            .finally(() => setMarketLoading(false));
    }, []);

    // Auto-dismiss success
    useEffect(() => {
        if (!updateSuccess) return;
        const t = setTimeout(() => setUpdateSuccess(false), 4000);
        return () => clearTimeout(t);
    }, [updateSuccess]);

    const handleUpdatePrices = useCallback(async () => {
        if (updatingPrices) return;
        setUpdatingPrices(true);
        setUpdateError(null);
        setUpdateSuccess(false);
        try {
            const results = await fetchInvestmentPrices(investments);
            const map = new Map<string, PriceResult>();
            const updates: { id: string; current_price: number }[] = [];

            for (const r of results) {
                map.set(r.investmentId, r);
                if (!r.error && r.price > 0) {
                    updates.push({ id: r.investmentId, current_price: r.price });
                }
            }

            setPriceResults(map);
            setLastUpdated(new Date());

            if (updates.length > 0) {
                await onUpdatePrices(updates);
                setUpdateSuccess(true);
            } else {
                setUpdateError('Nenhum preço pôde ser atualizado. Verifique os tickers.');
            }

            // Refresh market overview in parallel
            fetchMarketOverview().then(setMarket);
        } catch (err: any) {
            setUpdateError(err.message || 'Erro ao atualizar preços.');
        } finally {
            setUpdatingPrices(false);
        }
    }, [investments, updatingPrices, onUpdatePrices]);

    const lastUpdatedLabel = lastUpdated
        ? lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : null;

    const updatableCount = investments.filter(i => UPDATABLE_TYPES.includes(i.type) && (i.ticker || i.name)).length;

    // ── Derived / filtered list
    const filtered = useMemo(() => {
        return investments.filter(inv => {
            const matchType = filterType === 'Todos' || inv.type === filterType;
            const q = search.toLowerCase();
            const matchSearch = !q || inv.name.toLowerCase().includes(q) || (inv.ticker || '').toLowerCase().includes(q);
            return matchType && matchSearch;
        });
    }, [investments, search, filterType]);

    // ── Summary stats
    const stats = useMemo(() => {
        const totalCost = investments.reduce((s, i) => s + i.quantity * i.purchase_price, 0);
        const totalCurrent = investments.reduce((s, i) => s + i.quantity * i.current_price, 0);
        const pnlAbs = totalCurrent - totalCost;
        const pnlPct = totalCost > 0 ? (pnlAbs / totalCost) * 100 : 0;
        return { totalCost, totalCurrent, pnlAbs, pnlPct, count: investments.length };
    }, [investments]);

    // ── Allocation by type (pie)
    const allocationData = useMemo(() => {
        const grouped: Record<string, number> = {};
        investments.forEach(inv => {
            const val = inv.quantity * inv.current_price;
            grouped[inv.type] = (grouped[inv.type] || 0) + val;
        });
        return Object.entries(grouped).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [investments]);

    // ── Monthly evolution (area chart, last 6 months based on purchase_date)
    const evolutionData = useMemo(() => {
        const months: { name: string; cost: number; value: number }[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const year = d.getFullYear();
            const month = d.getMonth();
            const label = d.toLocaleDateString('pt-BR', { month: 'short' });
            const cutoff = new Date(year, month + 1, 0); // last day of month

            const active = investments.filter(inv => {
                const pd = new Date(inv.purchase_date + 'T00:00:00');
                return pd <= cutoff;
            });

            const cost = active.reduce((s, inv) => s + inv.quantity * inv.purchase_price, 0);
            const value = active.reduce((s, inv) => s + inv.quantity * inv.current_price, 0);

            months.push({
                name: label.charAt(0).toUpperCase() + label.slice(1),
                cost,
                value
            });
        }
        return months;
    }, [investments]);

    const openAdd = () => { setEditingInvestment(null); setShowModal(true); };
    const openEdit = (inv: Investment) => { setEditingInvestment(inv); setShowModal(true); };

    const handleSave = async (inv: Investment) => {
        if (editingInvestment) {
            await onEdit(inv);
        } else {
            await onAdd(inv);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deletingId) return;
        await onDelete(deletingId);
        setDeletingId(null);
    };

    // ── Responsive: show investment cards instead of table on small screens
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    return (
        <div className="space-y-6">

            {/* ── Page Header ─────────────────────────────── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                        <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <TrendingUp className="w-5 h-5 text-white" />
                        </span>
                        Investimentos
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Acompanhe e gerencie sua carteira de investimentos.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Update Prices Button */}
                    {updatableCount > 0 && (
                        <button
                            onClick={handleUpdatePrices}
                            disabled={updatingPrices}
                            title={`Atualizar preços de ${updatableCount} ativo(s) via Brapi/CoinGecko`}
                            className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${updatingPrices
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                : updateSuccess
                                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 hover:text-emerald-600 dark:hover:text-emerald-400 shadow-sm'
                                }`}
                        >
                            {updatingPrices ? (
                                <><RefreshCw className="w-4 h-4 animate-spin" />Atualizando...</>
                            ) : updateSuccess ? (
                                <><CheckCircle2 className="w-4 h-4" />Atualizado!</>
                            ) : (
                                <><RefreshCw className="w-4 h-4" />Atualizar Preços</>
                            )}
                        </button>
                    )}
                    <button
                        onClick={openAdd}
                        className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 active:scale-95 transition-all shadow-lg shadow-emerald-500/30 text-sm whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" />
                        Adicionar Ativo
                    </button>
                </div>
            </div>

            {/* ── Market Overview Bar ──────────────────────── */}
            <div className="flex flex-wrap gap-3">
                <MarketTicker label="IBOV" value={market?.ibov?.value} change={market?.ibov?.change} format="points" loading={marketLoading} />
                <MarketTicker label="USD/BRL" value={market?.usdBrl?.value} change={market?.usdBrl?.change} format="currency" loading={marketLoading} />
                <MarketTicker label="BTC" value={market?.btcBrl?.value} change={market?.btcBrl?.change} format="crypto" loading={marketLoading} />
                {lastUpdatedLabel && (
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs text-slate-400 bg-white/60 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                        <Clock className="w-3 h-3" />
                        Preços: {lastUpdatedLabel}
                    </div>
                )}
                {updateError && (
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs text-rose-500 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                        <AlertCircle className="w-3 h-3" />{updateError}
                    </div>
                )}
            </div>

            {/* ── Summary Cards ───────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Investido */}
                <div className="bg-white dark:bg-slate-850 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-none relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute top-0 right-0 p-5 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                        <DollarSign className="w-20 h-20" />
                    </div>
                    <div className="p-2.5 w-fit rounded-2xl bg-blue-50 dark:bg-blue-500/10 mb-3">
                        <DollarSign className="w-5 h-5 text-blue-500" />
                    </div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Investido</p>
                    <p className="text-xl font-bold text-slate-800 dark:text-white mt-1 truncate">
                        <BlurText privacyMode={privacyMode}>{formatCurrency(stats.totalCost)}</BlurText>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{stats.count} ativos</p>
                </div>

                {/* Patrimônio Atual */}
                <div className="bg-white dark:bg-slate-850 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-none relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute top-0 right-0 p-5 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                        <Briefcase className="w-20 h-20" />
                    </div>
                    <div className="p-2.5 w-fit rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 mb-3">
                        <Briefcase className="w-5 h-5 text-emerald-500" />
                    </div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Patrimônio Atual</p>
                    <p className="text-xl font-bold text-slate-800 dark:text-white mt-1 truncate">
                        <BlurText privacyMode={privacyMode}>{formatCurrency(stats.totalCurrent)}</BlurText>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Valor de mercado</p>
                </div>

                {/* Lucro/Prejuízo */}
                <div className={`rounded-3xl p-5 border shadow-lg dark:shadow-none relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 col-span-2 lg:col-span-1 ${stats.pnlAbs >= 0
                    ? 'bg-white dark:bg-slate-850 border-slate-100 dark:border-slate-800 shadow-slate-200/50'
                    : 'bg-white dark:bg-slate-850 border-slate-100 dark:border-slate-800 shadow-slate-200/50'
                    }`}>
                    <div className="absolute top-0 right-0 p-5 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                        {stats.pnlAbs >= 0 ? <TrendingUp className="w-20 h-20" /> : <TrendingDown className="w-20 h-20" />}
                    </div>
                    <div className={`p-2.5 w-fit rounded-2xl mb-3 ${stats.pnlAbs >= 0 ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-rose-50 dark:bg-rose-500/10'}`}>
                        {stats.pnlAbs >= 0
                            ? <ArrowUpRight className="w-5 h-5 text-emerald-500" />
                            : <ArrowDownRight className="w-5 h-5 text-rose-500" />}
                    </div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Lucro / Prejuízo</p>
                    <p className={`text-xl font-bold mt-1 truncate ${stats.pnlAbs >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                        <BlurText privacyMode={privacyMode}>{formatCurrency(stats.pnlAbs)}</BlurText>
                    </p>
                    <p className={`text-xs font-semibold mt-1 ${stats.pnlAbs >= 0 ? 'text-emerald-500' : 'text-rose-400'}`}>
                        {stats.totalCost > 0 ? formatPercent(stats.pnlPct) : '—'}
                    </p>
                </div>

                {/* Diversificação */}
                <div className="bg-white dark:bg-slate-850 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-none relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 hidden lg:block">
                    <div className="absolute top-0 right-0 p-5 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                        <BarChart2 className="w-20 h-20" />
                    </div>
                    <div className="p-2.5 w-fit rounded-2xl bg-violet-50 dark:bg-violet-500/10 mb-3">
                        <BarChart2 className="w-5 h-5 text-violet-500" />
                    </div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Diversificação</p>
                    <p className="text-xl font-bold text-slate-800 dark:text-white mt-1">{allocationData.length} tipos</p>
                    <div className="flex gap-1 mt-2 flex-wrap">
                        {allocationData.slice(0, 4).map((a) => (
                            <span key={a.name} className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                style={{ background: `${TYPE_META[a.name as InvestmentType]?.color}20`, color: TYPE_META[a.name as InvestmentType]?.color }}>
                                {a.name}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Charts + List Tabs ───────────────────────── */}
            {investments.length > 0 && (
                <div className="bg-white dark:bg-slate-850 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-none overflow-hidden">
                    {/* Tab Switch */}
                    <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 pt-4 gap-4">
                        {(['list', 'charts'] as const).map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)}
                                className={`pb-3 text-sm font-semibold border-b-2 transition-all ${activeTab === tab
                                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                    }`}>
                                {tab === 'list' ? '📋 Carteira' : '📊 Gráficos'}
                            </button>
                        ))}
                    </div>

                    {/* ── Charts Tab */}
                    {activeTab === 'charts' && (
                        <div className="p-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
                            {/* Pie: Allocation */}
                            <div className="lg:col-span-2">
                                <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">Alocação por Tipo</h3>
                                <p className="text-xs text-slate-500 mb-4">Distribuição do patrimônio atual</p>
                                {allocationData.length > 0 ? (
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={allocationData} cx="50%" cy="50%"
                                                    innerRadius={60} outerRadius={85}
                                                    paddingAngle={4} dataKey="value" stroke="none">
                                                    {allocationData.map((_, i) => (
                                                        <Cell key={i} fill={TYPE_META[_.name as InvestmentType]?.color || PIE_COLORS[i % PIE_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <PieTooltip
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px -2px rgb(0 0 0 / 0.15)' }}
                                                    formatter={(value: number) => [formatCurrency(value), 'Valor']}
                                                />
                                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '12px' }}
                                                    formatter={v => <span className="text-xs text-slate-500">{v}</span>} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div className="h-64 flex items-center justify-center text-slate-400 text-sm">Sem dados</div>
                                )}

                                {/* Allocation Table */}
                                <div className="mt-4 space-y-2">
                                    {allocationData.map((item) => {
                                        const pct = stats.totalCurrent > 0 ? (item.value / stats.totalCurrent) * 100 : 0;
                                        const color = TYPE_META[item.name as InvestmentType]?.color || '#64748b';
                                        return (
                                            <div key={item.name} className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                                                <span className="text-xs text-slate-600 dark:text-slate-300 flex-1">{item.name}</span>
                                                <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 max-w-[80px]">
                                                    <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
                                                </div>
                                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 w-10 text-right">{pct.toFixed(0)}%</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Area: Evolution */}
                            <div className="lg:col-span-3">
                                <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">Evolução da Carteira</h3>
                                <p className="text-xs text-slate-500 mb-4">Custo acumulado vs. Valor de mercado (últimos 6 meses)</p>
                                <div className="h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={evolutionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="gradValue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="gradCost" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }}
                                                tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: 'rgba(255,255,255,0.97)', borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px -2px rgb(0 0 0 / 0.15)', color: '#1e293b' }}
                                                formatter={(value: number, name: string) => [formatCurrency(value), name === 'value' ? 'Valor Atual' : 'Custo']}
                                            />
                                            <Area type="monotone" dataKey="cost" name="Custo" stroke="#3B82F6" strokeWidth={2} fill="url(#gradCost)" dot={false} />
                                            <Area type="monotone" dataKey="value" name="Valor" stroke="#10B981" strokeWidth={3} fill="url(#gradValue)" dot={false} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── List Tab */}
                    {activeTab === 'list' && (
                        <div className="p-6 space-y-4">
                            {/* Filters */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                {/* Search */}
                                <div className="relative flex-1 min-w-0">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="Buscar por nome ou ticker..."
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                    />
                                </div>

                                {/* Type Filter */}
                                <div className="flex gap-2 flex-wrap">
                                    {(['Todos', ...INVESTMENT_TYPES] as const).map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setFilterType(t as any)}
                                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${filterType === t
                                                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                }`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Desktop Table */}
                            {filtered.length > 0 ? (
                                <>
                                    <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-slate-900">
                                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Ativo</th>
                                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Tipo</th>
                                                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Qtd</th>
                                                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Pr. Compra</th>
                                                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Pr. Atual</th>
                                                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Custo Total</th>
                                                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Valor Atual</th>
                                                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Resultado</th>
                                                    <th className="px-5 py-3.5"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                                {filtered.map(inv => {
                                                    const cost = inv.quantity * inv.purchase_price;
                                                    const current = inv.quantity * inv.current_price;
                                                    const pnl = current - cost;
                                                    const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
                                                    return (
                                                        <tr key={inv.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors group">
                                                            <td className="px-5 py-4">
                                                                <div className="font-semibold text-slate-800 dark:text-white">{inv.name}</div>
                                                                {inv.ticker && <div className="text-xs text-slate-400 font-mono">{inv.ticker}</div>}
                                                                {inv.broker && <div className="text-xs text-slate-400">{inv.broker}</div>}
                                                            </td>
                                                            <td className="px-5 py-4"><TypeBadge type={inv.type} /></td>
                                                            <td className="px-5 py-4 text-right text-slate-600 dark:text-slate-300">{inv.quantity.toLocaleString('pt-BR')}</td>
                                                            <td className="px-5 py-4 text-right">
                                                                <BlurText privacyMode={privacyMode}>{formatCurrency(inv.purchase_price)}</BlurText>
                                                            </td>
                                                            <td className="px-5 py-4 text-right">
                                                                <div className="flex flex-col items-end gap-0.5">
                                                                    <span className={inv.current_price >= inv.purchase_price ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-rose-500 font-semibold'}>
                                                                        <BlurText privacyMode={privacyMode}>{formatCurrency(inv.current_price)}</BlurText>
                                                                    </span>
                                                                    {(() => {
                                                                        const r = priceResults.get(inv.id);
                                                                        if (!r) return null;
                                                                        if (r.error) return (
                                                                            <span title={r.error} className="text-[10px] text-amber-500 flex items-center gap-0.5">
                                                                                <AlertCircle className="w-2.5 h-2.5" />erro
                                                                            </span>
                                                                        );
                                                                        const pos = r.change >= 0;
                                                                        return (
                                                                            <span className={`text-[10px] font-bold flex items-center gap-0.5 ${pos ? 'text-emerald-500' : 'text-rose-500'
                                                                                }`}>
                                                                                {pos ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                                                                                {pos ? '+' : ''}{r.change.toFixed(2)}% hoje
                                                                            </span>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            </td>
                                                            <td className="px-5 py-4 text-right text-slate-600 dark:text-slate-300">
                                                                <BlurText privacyMode={privacyMode}>{formatCurrency(cost)}</BlurText>
                                                            </td>
                                                            <td className="px-5 py-4 text-right font-semibold text-slate-800 dark:text-white">
                                                                <BlurText privacyMode={privacyMode}>{formatCurrency(current)}</BlurText>
                                                            </td>
                                                            <td className="px-5 py-4 text-right">
                                                                <div className={`font-bold text-sm ${pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                                                                    <BlurText privacyMode={privacyMode}>{formatCurrency(pnl)}</BlurText>
                                                                </div>
                                                                <div className={`text-xs font-semibold ${pnl >= 0 ? 'text-emerald-500' : 'text-rose-400'}`}>
                                                                    {formatPercent(pnlPct)}
                                                                </div>
                                                            </td>
                                                            <td className="px-5 py-4">
                                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button onClick={() => openEdit(inv)}
                                                                        className="p-2 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                                                                        <Pencil className="w-4 h-4" />
                                                                    </button>
                                                                    <button onClick={() => setDeletingId(inv.id)}
                                                                        className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors">
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile Cards */}
                                    <div className="md:hidden space-y-3">
                                        {filtered.map(inv => {
                                            const cost = inv.quantity * inv.purchase_price;
                                            const current = inv.quantity * inv.current_price;
                                            const pnl = current - cost;
                                            const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
                                            return (
                                                <div key={inv.id} className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div>
                                                            <p className="font-bold text-slate-800 dark:text-white">{inv.name}</p>
                                                            {inv.ticker && <p className="text-xs font-mono text-slate-400">{inv.ticker}</p>}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <TypeBadge type={inv.type} />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                                        <div>
                                                            <p className="text-xs text-slate-400">Valor Investido</p>
                                                            <p className="font-semibold text-slate-700 dark:text-slate-200">
                                                                <BlurText privacyMode={privacyMode}>{formatCurrency(cost)}</BlurText>
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-slate-400">Valor Atual</p>
                                                            <p className="font-semibold text-slate-800 dark:text-white">
                                                                <BlurText privacyMode={privacyMode}>{formatCurrency(current)}</BlurText>
                                                            </p>
                                                            {(() => {
                                                                const r = priceResults.get(inv.id);
                                                                if (!r || r.error) return null;
                                                                const pos = r.change >= 0;
                                                                return (
                                                                    <p className={`text-xs font-bold mt-0.5 ${pos ? 'text-emerald-500' : 'text-rose-500'
                                                                        }`}>
                                                                        {pos ? '+' : ''}{r.change.toFixed(2)}% hoje
                                                                    </p>
                                                                );
                                                            })()}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-slate-400">Resultado</p>
                                                            <p className={`font-bold ${pnl >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                                <BlurText privacyMode={privacyMode}>{formatCurrency(pnl)}</BlurText>
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-slate-400">Rentabilidade</p>
                                                            <p className={`font-bold ${pnl >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{formatPercent(pnlPct)}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                                                        <button onClick={() => openEdit(inv)}
                                                            className="flex-1 py-2 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 transition-colors flex items-center justify-center gap-1">
                                                            <Pencil className="w-3 h-3" /> Editar
                                                        </button>
                                                        <button onClick={() => setDeletingId(inv.id)}
                                                            className="flex-1 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 transition-colors flex items-center justify-center gap-1">
                                                            <Trash2 className="w-3 h-3" /> Excluir
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Footer info */}
                                    <div className="flex justify-between items-center pt-2 text-xs text-slate-400">
                                        <span>{filtered.length} de {investments.length} ativo(s)</span>
                                        <span className="flex items-center gap-1">
                                            {lastUpdated ? (
                                                <><CheckCircle2 className="w-3 h-3 text-emerald-500" />Atualizado via API às {lastUpdatedLabel}</>
                                            ) : (
                                                <><Info className="w-3 h-3" />Clique em "Atualizar Preços" para obter cotações</>
                                            )}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <div className="py-12 text-center text-slate-400 dark:text-slate-600">
                                    <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                    <p className="font-medium">Nenhum ativo encontrado</p>
                                    <p className="text-xs mt-1">Tente mudar os filtros de busca</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Empty state when no investments at all */}
            {investments.length === 0 && <EmptyState onAdd={openAdd} />}

            {/* ── Modals */}
            {showModal && (
                <InvestmentModal
                    investment={editingInvestment}
                    userId={user.id}
                    onClose={() => setShowModal(false)}
                    onSave={handleSave}
                />
            )}

            <ConfirmationModal
                isOpen={!!deletingId}
                onClose={() => setDeletingId(null)}
                onConfirm={handleConfirmDelete}
                title="Excluir Investimento"
                message="Tem certeza que deseja excluir este ativo da sua carteira? Esta ação não pode ser desfeita."
                confirmText="Sim, excluir"
                type="danger"
            />
        </div>
    );
};

export default Investments;
