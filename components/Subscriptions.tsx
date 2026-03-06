import React, { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Repeat, TrendingDown, Calendar, Trash2, X, Pencil,
    AlertTriangle, ChevronDown, ChevronUp, Search,
    RefreshCw, Zap, Check, Loader2
} from 'lucide-react';
import { Transaction, UserProfile } from '../types';
import { CATEGORIES, CATEGORY_ICONS } from '../constants';

interface SubscriptionsProps {
    transactions: Transaction[];
    user: UserProfile;
    onDeleteTransaction: (id: string) => Promise<void>;
    onUpdateTransaction: (t: Transaction) => Promise<void>;
}

interface SubscriptionGroup {
    key: string;
    description: string;
    category: string;
    latestDate: string;
    monthlyAvg: number;
    yearCost: number;
    occurrences: Transaction[];
}

// ── Icon mapping ───────────────────────────────────────────────
const SUBSCRIPTION_ICONS: Record<string, string> = {
    netflix: '🎬', spotify: '🎵', amazon: '📦', prime: '📦',
    youtube: '▶️', disney: '🏰', hbo: '🎭', globoplay: '📺',
    deezer: '🎶', apple: '🍎', icloud: '☁️', dropbox: '📁',
    microsoft: '💻', office: '💻', adobe: '🎨',
    academia: '💪', gym: '💪', crossfit: '🏋️',
    plano: '💊', farmácia: '💊', clinic: '🏥', médico: '🏥',
    telefone: '📱', celular: '📱', internet: '🌐',
    tim: '📱', vivo: '📱', claro: '📱', oi: '📱', net: '🌐',
    luz: '💡', energia: '💡', água: '💧', gás: '🔥',
    aluguel: '🏠', condomínio: '🏢', iptu: '🏘️',
    seguro: '🛡️', financiamento: '🏦', cartão: '💳', anuidade: '💳',
    faculdade: '🎓', escola: '🎓', curso: '🎓',
    default: '📋',
};

const getIcon = (description: string): string => {
    const lower = description.toLowerCase();
    for (const [key, icon] of Object.entries(SUBSCRIPTION_ICONS)) {
        if (lower.includes(key)) return icon;
    }
    return SUBSCRIPTION_ICONS.default;
};

// ── Helpers ────────────────────────────────────────────────────
const fmt = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const fmtDate = (dateStr: string) =>
    new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'short', year: 'numeric',
    });

const CATEGORY_COLOR: Record<string, string> = {
    'Alimentação': 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
    'Transporte': 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
    'Lazer': 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
    'Saúde': 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
    'Educação': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
    'Moradia': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
    'Tecnologia': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300',
    'Assinaturas': 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
    'Financeiro': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300',
};
const getCatColor = (cat: string) => CATEGORY_COLOR[cat] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';

// ── Edit Modal ─────────────────────────────────────────────────
interface EditModalProps {
    transaction: Transaction;
    onSave: (t: Transaction) => Promise<void>;
    onClose: () => void;
}

const EditModal: React.FC<EditModalProps> = ({ transaction, onSave, onClose }) => {
    const [form, setForm] = useState({
        description: transaction.description,
        amount: String(transaction.amount),
        category: transaction.category,
        date: transaction.date,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        const amount = parseFloat(form.amount.replace(',', '.'));
        if (!form.description.trim()) { setError('Descrição obrigatória'); return; }
        if (isNaN(amount) || amount <= 0) { setError('Valor inválido'); return; }
        setSaving(true);
        setError(null);
        try {
            await onSave({
                ...transaction,
                description: form.description.trim(),
                amount,
                category: form.category,
                date: form.date,
            });
            onClose();
        } catch {
            setError('Erro ao salvar. Tente novamente.');
            setSaving(false);
        }
    };

    const CategoryIcon = CATEGORY_ICONS[form.category];

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
                <div className="flex items-center justify-between mb-5">
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg flex items-center gap-2">
                        <Pencil className="w-4 h-4 text-primary-500" /> Editar Assinatura
                    </h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Description */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Descrição</label>
                        <input
                            type="text"
                            value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                            placeholder="Ex: Netflix, Academia..."
                        />
                    </div>

                    {/* Amount + Date row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Valor (R$)</label>
                            <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={form.amount}
                                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Data</label>
                            <input
                                type="date"
                                value={form.date}
                                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                            />
                        </div>
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Categoria</label>
                        <div className="relative">
                            {CategoryIcon && (
                                <CategoryIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            )}
                            <select
                                value={form.category}
                                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all appearance-none"
                            >
                                {CATEGORIES.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {error && (
                        <p className="text-xs text-rose-500 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" /> {error}
                        </p>
                    )}
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-bold hover:bg-primary-600 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

// ── Delete Confirmation ────────────────────────────────────────
interface DeleteModalProps {
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
    onClose: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ title, message, onConfirm, onClose }) => {
    const [loading, setLoading] = useState(false);
    const handle = async () => {
        setLoading(true);
        try { await onConfirm(); onClose(); } finally { setLoading(false); }
    };
    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => !loading && onClose()}
        >
            <motion.div
                initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            >
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 bg-rose-100 dark:bg-rose-500/20 rounded-xl">
                        <AlertTriangle className="w-5 h-5 text-rose-500" />
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-white">{title}</h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">{message}</p>
                <div className="flex gap-3">
                    <button onClick={onClose} disabled={loading} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
                        Cancelar
                    </button>
                    <button onClick={handle} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        {loading ? 'Excluindo...' : 'Excluir'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

// ══════════════════════════════════════════════════════════════
//  Main Component
// ══════════════════════════════════════════════════════════════
const Subscriptions: React.FC<SubscriptionsProps> = ({
    transactions,
    onDeleteTransaction,
    onUpdateTransaction,
}) => {
    const [cancelList, setCancelList] = useState<Set<string>>(new Set());
    const [expandedKey, setExpandedKey] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    // Modals state
    const [editTarget, setEditTarget] = useState<Transaction | null>(null);
    const [deleteOneTarget, setDeleteOneTarget] = useState<{ id: string } | null>(null);
    const [deleteAllTarget, setDeleteAllTarget] = useState<SubscriptionGroup | null>(null);

    // ── Data ──────────────────────────────────────────────────
    const subscriptions = useMemo((): SubscriptionGroup[] => {
        const recurring = transactions.filter(t => t.type === 'expense' && t.isRecurring === true);
        const grouped = new Map<string, Transaction[]>();
        recurring.forEach(t => {
            const key = t.description.trim().toLowerCase();
            grouped.set(key, [...(grouped.get(key) ?? []), t]);
        });
        return Array.from(grouped.entries()).map(([key, txs]) => {
            const sorted = [...txs].sort((a, b) => b.date.localeCompare(a.date));
            const total = txs.reduce((acc, t) => acc + Number(t.amount), 0);
            const monthlyAvg = total / Math.max(txs.length, 1);
            return {
                key,
                description: sorted[0].description,
                category: sorted[0].category || 'Outros',
                latestDate: sorted[0].date,
                monthlyAvg,
                yearCost: monthlyAvg * 12,
                occurrences: sorted,
            };
        }).sort((a, b) => b.monthlyAvg - a.monthlyAvg);
    }, [transactions]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return q ? subscriptions.filter(s => s.description.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)) : subscriptions;
    }, [subscriptions, search]);

    const totalMonthly = subscriptions.reduce((acc, s) => acc + s.monthlyAvg, 0);
    const totalYearly = totalMonthly * 12;
    const cancelSavings = subscriptions.filter(s => cancelList.has(s.key)).reduce((acc, s) => acc + s.monthlyAvg, 0);

    const toggleCancel = (key: string) => {
        setCancelList(prev => {
            const n = new Set(prev);
            n.has(key) ? n.delete(key) : n.add(key);
            return n;
        });
    };

    const handleDeleteAll = useCallback(async (sub: SubscriptionGroup) => {
        for (const tx of sub.occurrences) {
            await onDeleteTransaction(tx.id);
        }
    }, [onDeleteTransaction]);

    // ── Render ────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                    <Repeat className="w-7 h-7 text-primary-500" />
                    Assinaturas Recorrentes
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                    Controle seus gastos fixos — edite, cancele e simule economias em tempo real.
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    {
                        icon: <TrendingDown className="w-4 h-4 text-rose-500" />,
                        bg: 'bg-rose-100 dark:bg-rose-500/20',
                        label: 'Gasto Mensal',
                        value: fmt(totalMonthly),
                        sub: `${subscriptions.length} assinatura${subscriptions.length !== 1 ? 's' : ''} ativas`,
                        delay: 0,
                    },
                    {
                        icon: <Calendar className="w-4 h-4 text-amber-500" />,
                        bg: 'bg-amber-100 dark:bg-amber-500/20',
                        label: 'Impacto Anual',
                        value: fmt(totalYearly),
                        sub: 'em 12 meses projetados',
                        delay: 0.07,
                    },
                    {
                        icon: <Zap className={`w-4 h-4 ${cancelList.size > 0 ? 'text-emerald-500' : 'text-slate-400'}`} />,
                        bg: cancelList.size > 0 ? 'bg-emerald-100 dark:bg-emerald-500/30' : 'bg-slate-100 dark:bg-slate-700',
                        label: 'Sim. Cancelamento',
                        value: cancelList.size > 0 ? `+ ${fmt(cancelSavings)}/mês` : '—',
                        sub: cancelList.size > 0 ? `${fmt(cancelSavings * 12)}/ano de economia` : 'Marque itens para simular',
                        highlight: cancelList.size > 0,
                        delay: 0.14,
                    },
                ].map(({ icon, bg, label, value, sub, highlight, delay }) => (
                    <motion.div
                        key={label}
                        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
                        className={`rounded-2xl p-5 border shadow-sm transition-all
              ${highlight
                                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                                : 'bg-white dark:bg-slate-850 border-slate-100 dark:border-slate-800'}`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-xl ${bg}`}>{icon}</div>
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
                        </div>
                        <p className={`text-2xl font-bold ${highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-white'}`}>{value}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
                    </motion.div>
                ))}
            </div>

            {/* Main Card */}
            <div className="bg-white dark:bg-slate-850 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">

                {/* Search */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar por nome ou categoria..."
                            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                        />
                    </div>
                </div>

                {/* Empty state */}
                {subscriptions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                            <RefreshCw className="w-7 h-7 text-slate-400" />
                        </div>
                        <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-2">Nenhuma assinatura detectada</h3>
                        <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
                            Ao adicionar uma transação de despesa, ative a opção <strong>"Recorrente"</strong> para que ela apareça aqui com análise automática.
                        </p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 text-sm">
                        Nenhum resultado para <strong>"{search}"</strong>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filtered.map((sub, index) => {
                            const isExpanded = expandedKey === sub.key;
                            const isCanceling = cancelList.has(sub.key);
                            const icon = getIcon(sub.description);
                            const catColor = getCatColor(sub.category);
                            const CatIcon = CATEGORY_ICONS[sub.category];

                            return (
                                <motion.div
                                    key={sub.key}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.04 }}
                                    className={`transition-colors ${isCanceling ? 'bg-emerald-50/60 dark:bg-emerald-900/10' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'}`}
                                >
                                    {/* Main Row */}
                                    <div className="flex items-center gap-2 sm:gap-3 px-4 py-4">
                                        {/* Cancel checkbox */}
                                        <button
                                            onClick={() => toggleCancel(sub.key)}
                                            title={isCanceling ? 'Desmarcar' : 'Marcar para simular cancelamento'}
                                            className={`w-5 h-5 flex-shrink-0 rounded-md border-2 transition-all flex items-center justify-center
                        ${isCanceling
                                                    ? 'bg-emerald-500 border-emerald-500'
                                                    : 'border-slate-300 dark:border-slate-600 hover:border-primary-400'}`}
                                        >
                                            {isCanceling && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                        </button>

                                        {/* Emoji icon */}
                                        <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl">
                                            {icon}
                                        </div>

                                        {/* Title + category */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className={`font-semibold text-sm text-slate-800 dark:text-white truncate max-w-[180px] sm:max-w-none
                          ${isCanceling ? 'line-through opacity-40' : ''}`}>
                                                    {sub.description}
                                                </p>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 flex items-center gap-1 ${catColor}`}>
                                                    {CatIcon && <CatIcon className="w-2.5 h-2.5" />}
                                                    {sub.category}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-400 mt-0.5">
                                                {sub.occurrences.length}× registrada · última em {fmtDate(sub.latestDate)}
                                            </p>
                                        </div>

                                        {/* Values (desktop) */}
                                        <div className="text-right flex-shrink-0 hidden sm:block mr-2">
                                            <p className="font-bold text-slate-800 dark:text-white text-sm">
                                                {fmt(sub.monthlyAvg)}<span className="text-xs font-normal text-slate-400">/mês</span>
                                            </p>
                                            <p className="text-[11px] text-rose-400">{fmt(sub.yearCost)}/ano</p>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <button
                                                onClick={() => setEditTarget(sub.occurrences[0])}
                                                className="p-1.5 text-slate-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-lg transition-all"
                                                title="Editar ocorrência mais recente"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => setDeleteAllTarget(sub)}
                                                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all"
                                                title="Excluir todas as ocorrências"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => setExpandedKey(isExpanded ? null : sub.key)}
                                                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all"
                                            >
                                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Mobile values */}
                                    {!isCanceling && (
                                        <div className="sm:hidden flex items-center justify-between px-[72px] pb-3 -mt-2">
                                            <span className="text-sm font-bold text-slate-800 dark:text-white">
                                                {fmt(sub.monthlyAvg)}<span className="text-xs font-normal text-slate-400">/mês</span>
                                            </span>
                                            <span className="text-[11px] text-rose-400">{fmt(sub.yearCost)}/ano</span>
                                        </div>
                                    )}

                                    {/* Expanded history */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800 ml-8">
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                                                        Histórico de Ocorrências ({sub.occurrences.length})
                                                    </p>
                                                    <div className="space-y-1">
                                                        {sub.occurrences.map(tx => (
                                                            <div
                                                                key={tx.id}
                                                                className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 group transition-colors"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${tx.status === 'completed' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                                                    <div>
                                                                        <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">{fmtDate(tx.date)}</p>
                                                                        <p className="text-[10px] text-slate-400">{tx.status === 'completed' ? 'Pago' : 'Pendente'}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{fmt(Number(tx.amount))}</span>
                                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <button
                                                                            onClick={() => setEditTarget(tx)}
                                                                            className="p-1 text-slate-400 hover:text-primary-500 rounded-lg transition-colors"
                                                                            title="Editar"
                                                                        >
                                                                            <Pencil className="w-3 h-3" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setDeleteOneTarget({ id: tx.id })}
                                                                            className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                                                                            title="Excluir esta ocorrência"
                                                                        >
                                                                            <Trash2 className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Delete all button inside expanded */}
                                                    <button
                                                        onClick={() => setDeleteAllTarget(sub)}
                                                        className="mt-3 w-full text-xs font-semibold text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-500/10 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 border border-dashed border-rose-200 dark:border-rose-800"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        Excluir todas as {sub.occurrences.length} ocorrências
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* Cancellation summary bar */}
                <AnimatePresence>
                    {cancelList.size > 0 && (
                        <motion.div
                            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
                            className="sticky bottom-0 p-4 border-t border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-between gap-3 flex-wrap"
                        >
                            <div>
                                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                                    💡 Cancelando {cancelList.size} assinatura{cancelList.size > 1 ? 's' : ''}
                                </p>
                                <p className="text-xs text-emerald-600 dark:text-emerald-500">
                                    Economia de <strong>{fmt(cancelSavings)}/mês</strong> · {fmt(cancelSavings * 12)}/ano
                                </p>
                            </div>
                            <button
                                onClick={() => setCancelList(new Set())}
                                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                            >
                                <X className="w-3 h-3" /> Limpar seleção
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── MODALS ── */}
            <AnimatePresence>
                {editTarget && (
                    <EditModal
                        transaction={editTarget}
                        onSave={onUpdateTransaction}
                        onClose={() => setEditTarget(null)}
                    />
                )}
                {deleteOneTarget && (
                    <DeleteModal
                        title="Excluir ocorrência?"
                        message="Remove apenas este registro. As demais ocorrências desta assinatura permanecem intactas."
                        onConfirm={async () => { await onDeleteTransaction(deleteOneTarget.id); }}
                        onClose={() => setDeleteOneTarget(null)}
                    />
                )}
                {deleteAllTarget && (
                    <DeleteModal
                        title={`Excluir "${deleteAllTarget.description}"?`}
                        message={`Esta ação removerá permanentemente todas as ${deleteAllTarget.occurrences.length} ocorrência${deleteAllTarget.occurrences.length > 1 ? 's' : ''} desta assinatura do banco de dados. Esta ação não pode ser desfeita.`}
                        onConfirm={async () => { await handleDeleteAll(deleteAllTarget); }}
                        onClose={() => setDeleteAllTarget(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Subscriptions;
