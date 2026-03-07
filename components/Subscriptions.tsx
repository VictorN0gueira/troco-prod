import React, { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Repeat, TrendingDown, Calendar, Trash2, X, Pencil,
    AlertTriangle, ChevronDown, ChevronUp, Search,
    RefreshCw, Zap, Check, Loader2, Plus, ArrowUpDown,
    TrendingUp, ArrowUp, Minus, Clock
} from 'lucide-react';
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Transaction, UserProfile } from '../types';
import { CATEGORIES, CATEGORY_ICONS } from '../constants';
import { getTodayLocalDate, generateTransactionId } from '../utils';
import { CustomSelect } from './CustomSelect';
import LimitPaywallModal from './LimitPaywallModal';
import { OverLimitBanner } from './FreePlanBadge';

interface SubscriptionsProps {
    transactions: Transaction[];
    user: UserProfile;
    onDeleteTransaction: (id: string) => Promise<void>;
    onUpdateTransaction: (t: Transaction) => Promise<void>;
    onAddTransaction: (t: Transaction) => Promise<void>;
}

const FREE_SUBSCRIPTION_LIMIT = 5;


interface SubscriptionGroup {
    key: string;
    description: string;
    category: string;
    latestDate: string;
    monthlyAvg: number;
    yearCost: number;
    occurrences: Transaction[];
    trendPercent: number;  // % change first→last price
    nextDueDate: string;   // ISO string predicted
}

// ── Icon mapping ────────────────────────────────────────────
const SUBSCRIPTION_ICONS: Record<string, string> = {
    netflix: '🎬', spotify: '🎵', amazon: '📦', prime: '📦',
    youtube: '▶️', disney: '🏰', hbo: '🎭', globoplay: '📺',
    deezer: '🎶', apple: '🍎', icloud: '☁️', dropbox: '📁',
    microsoft: '💻', office: '💻', adobe: '🎨',
    academia: '💪', gym: '💪', crossfit: '🏋️',
    plano: '💊', farmácia: '💊', médico: '🏥',
    telefone: '📱', celular: '📱', internet: '🌐',
    tim: '📱', vivo: '📱', claro: '📱', oi: '📱', net: '🌐',
    luz: '💡', energia: '💡', água: '💧', gás: '🔥',
    aluguel: '🏠', condomínio: '🏢', iptu: '🏘️',
    seguro: '🛡️', financiamento: '🏦', cartão: '💳', anuidade: '💳',
    faculdade: '🎓', escola: '🎓', curso: '🎓',
    default: '📋',
};
const getIcon = (d: string) => {
    const l = d.toLowerCase();
    for (const [k, v] of Object.entries(SUBSCRIPTION_ICONS)) if (l.includes(k)) return v;
    return SUBSCRIPTION_ICONS.default;
};

// ── Helpers ─────────────────────────────────────────────────
const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const fmtDate = (s: string) =>
    new Date(s + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

const fmtShort = (s: string) =>
    new Date(s + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

const CHART_COLORS = [
    '#10B981', '#6366F1', '#F59E0B', '#EF4444', '#3B82F6',
    '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#84CC16',
];

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
const getCatColor = (c: string) => CATEGORY_COLOR[c] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';

// Predict next due date: 1 month from the latest occurrence
const predictNextDate = (latestDate: string): string => {
    const d = new Date(latestDate + 'T12:00:00');
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
};

const isOverdue = (nextDate: string): boolean => nextDate < getTodayLocalDate();
const isDueSoon = (nextDate: string): boolean => {
    const today = new Date();
    const next = new Date(nextDate + 'T12:00:00');
    const diff = (next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 5;
};

type SortKey = 'cost-desc' | 'cost-asc' | 'alpha' | 'date-desc';

// ╔══════════════════════════════════════════════════════════╗
//  Quick Add Modal
// ╚══════════════════════════════════════════════════════════╝
interface AddModalProps {
    onSave: (t: Transaction) => Promise<void>;
    onClose: () => void;
}

const AddModal: React.FC<AddModalProps> = ({ onSave, onClose }) => {
    const [form, setForm] = useState({
        description: '',
        amount: '',
        category: 'Assinaturas',
        date: getTodayLocalDate(),
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        const amount = parseFloat(form.amount.replace(',', '.'));
        if (!form.description.trim()) { setError('Descrição obrigatória'); return; }
        if (isNaN(amount) || amount <= 0) { setError('Informe um valor válido'); return; }
        setSaving(true); setError(null);
        try {
            await onSave({
                id: generateTransactionId(),
                description: form.description.trim(),
                amount,
                type: 'expense',
                category: form.category,
                date: form.date,
                status: 'completed',
                isRecurring: true,
            });
            onClose();
        } catch { setError('Erro ao salvar. Tente novamente.'); setSaving(false); }
    };

    const CatIcon = CATEGORY_ICONS[form.category];

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }} onClick={e => e.stopPropagation()}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg flex items-center gap-2">
                        <Plus className="w-5 h-5 text-primary-500" /> Nova Assinatura
                    </h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nome da assinatura</label>
                        <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            placeholder="Ex: Netflix, Academia, Internet..."
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Valor mensal (R$)</label>
                            <input type="number" min="0.01" step="0.01" value={form.amount}
                                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                                placeholder="0,00"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Primeira cobrança</label>
                            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Categoria</label>
                        <CustomSelect
                            value={form.category}
                            onChange={(val: string) => setForm(f => ({ ...f, category: val }))}
                            options={CATEGORIES.map(cat => {
                                const IconComp = CATEGORY_ICONS[cat];
                                return {
                                    value: cat,
                                    label: cat,
                                    icon: IconComp ? <IconComp className="w-4 h-4 mt-0.5" /> : undefined
                                };
                            })}
                            className="w-full"
                        />
                    </div>
                    <div className="flex items-start gap-2 bg-primary-50 dark:bg-primary-500/10 rounded-xl p-3">
                        <Repeat className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-primary-700 dark:text-primary-300">
                            A assinatura será registrada como despesa <strong>recorrente</strong> e aparecerá aqui automaticamente.
                        </p>
                    </div>
                    {error && <p className="text-xs text-rose-500 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />{error}</p>}
                </div>
                <div className="flex gap-3 mt-6">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
                        Cancelar
                    </button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex-1 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-bold hover:bg-primary-600 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        {saving ? 'Salvando...' : 'Adicionar'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

// ╔══════════════════════════════════════════════════════════╗
//  Edit Modal
// ╚══════════════════════════════════════════════════════════╝
interface EditModalProps { transaction: Transaction; onSave: (t: Transaction) => Promise<void>; onClose: () => void; }
const EditModal: React.FC<EditModalProps> = ({ transaction, onSave, onClose }) => {
    const [form, setForm] = useState({ description: transaction.description, amount: String(transaction.amount), category: transaction.category, date: transaction.date });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const CatIcon = CATEGORY_ICONS[form.category];

    const handleSave = async () => {
        const amount = parseFloat(form.amount.replace(',', '.'));
        if (!form.description.trim()) { setError('Descrição obrigatória'); return; }
        if (isNaN(amount) || amount <= 0) { setError('Valor inválido'); return; }
        setSaving(true); setError(null);
        try { await onSave({ ...transaction, description: form.description.trim(), amount, category: form.category, date: form.date }); onClose(); }
        catch { setError('Erro ao salvar.'); setSaving(false); }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
                onClick={e => e.stopPropagation()} className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg flex items-center gap-2"><Pencil className="w-4 h-4 text-primary-500" />Editar Assinatura</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"><X className="w-4 h-4" /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Descrição</label>
                        <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Valor (R$)</label>
                            <input type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Data</label>
                            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Categoria</label>
                        <CustomSelect
                            value={form.category}
                            onChange={(val: string) => setForm(f => ({ ...f, category: val }))}
                            options={CATEGORIES.map(cat => {
                                const IconComp = CATEGORY_ICONS[cat];
                                return {
                                    value: cat,
                                    label: cat,
                                    icon: IconComp ? <IconComp className="w-4 h-4 mt-0.5" /> : undefined
                                };
                            })}
                            className="w-full"
                        />
                    </div>
                    {error && <p className="text-xs text-rose-500 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />{error}</p>}
                </div>
                <div className="flex gap-3 mt-6">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">Cancelar</button>
                    <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-bold hover:bg-primary-600 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}{saving ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

// ╔══════════════════════════════════════════════════════════╗
//  Delete Confirmation Modal
// ╚══════════════════════════════════════════════════════════╝
interface DeleteModalProps { title: string; message: string; onConfirm: () => Promise<void>; onClose: () => void; }
const DeleteModal: React.FC<DeleteModalProps> = ({ title, message, onConfirm, onClose }) => {
    const [loading, setLoading] = useState(false);
    const handle = async () => { setLoading(true); try { await onConfirm(); onClose(); } finally { setLoading(false); } };
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => !loading && onClose()}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
                onClick={e => e.stopPropagation()} className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 bg-rose-100 dark:bg-rose-500/20 rounded-xl"><AlertTriangle className="w-5 h-5 text-rose-500" /></div>
                    <h3 className="font-bold text-slate-800 dark:text-white">{title}</h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">{message}</p>
                <div className="flex gap-3">
                    <button onClick={onClose} disabled={loading} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">Cancelar</button>
                    <button onClick={handle} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}{loading ? 'Excluindo...' : 'Excluir'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

// ╔══════════════════════════════════════════════════════════╗
//  Main Page Component
// ╚══════════════════════════════════════════════════════════╝
const Subscriptions: React.FC<SubscriptionsProps> = ({
    transactions, user, onDeleteTransaction, onUpdateTransaction, onAddTransaction,
}) => {
    const [cancelList, setCancelList] = useState<Set<string>>(new Set());
    const [expandedKey, setExpandedKey] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('cost-desc');
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

    const [showAdd, setShowAdd] = useState(false);
    const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Transaction | null>(null);
    const [deleteOneTarget, setDeleteOneTarget] = useState<{ id: string } | null>(null);
    const [deleteAllTarget, setDeleteAllTarget] = useState<SubscriptionGroup | null>(null);

    // ── Build subscription groups ────────────────────────────
    const subscriptions = useMemo((): SubscriptionGroup[] => {
        const recurring = transactions.filter(t => t.type === 'expense' && t.isRecurring === true);
        const grouped = new Map<string, Transaction[]>();
        recurring.forEach(t => {
            const key = t.description.trim().toLowerCase();
            grouped.set(key, [...(grouped.get(key) ?? []), t]);
        });

        return Array.from(grouped.entries()).map(([key, txs]) => {
            const sorted = [...txs].sort((a, b) => a.date.localeCompare(b.date)); // oldest first
            const total = txs.reduce((acc, t) => acc + Number(t.amount), 0);
            const monthlyAvg = total / Math.max(txs.length, 1);
            const latest = sorted[sorted.length - 1];

            // Trend: first vs last price
            const firstAmt = Number(sorted[0].amount);
            const lastAmt = Number(latest.amount);
            const trendPercent = firstAmt > 0 ? ((lastAmt - firstAmt) / firstAmt) * 100 : 0;

            return {
                key,
                description: latest.description,
                category: latest.category || 'Outros',
                latestDate: latest.date,
                monthlyAvg,
                yearCost: monthlyAvg * 12,
                occurrences: [...sorted].reverse(), // newest first for display
                trendPercent,
                nextDueDate: predictNextDate(latest.date),
            };
        });
    }, [transactions]);

    // ── Sort + Filter ────────────────────────────────────────
    const displayList = useMemo(() => {
        let list = [...subscriptions];
        if (categoryFilter) list = list.filter(s => s.category === categoryFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(s => s.description.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
        }
        switch (sortKey) {
            case 'cost-asc': return list.sort((a, b) => a.monthlyAvg - b.monthlyAvg);
            case 'alpha': return list.sort((a, b) => a.description.localeCompare(b.description));
            case 'date-desc': return list.sort((a, b) => b.latestDate.localeCompare(a.latestDate));
            default: return list.sort((a, b) => b.monthlyAvg - a.monthlyAvg);
        }
    }, [subscriptions, categoryFilter, search, sortKey]);

    // ── Aggregates ───────────────────────────────────────────
    const totalMonthly = subscriptions.reduce((a, s) => a + s.monthlyAvg, 0);
    const cancelSavings = subscriptions.filter(s => cancelList.has(s.key)).reduce((a, s) => a + s.monthlyAvg, 0);

    // Category chart data
    const chartData = useMemo(() => {
        const map = new Map<string, number>();
        subscriptions.forEach(s => map.set(s.category, (map.get(s.category) ?? 0) + s.monthlyAvg));
        return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [subscriptions]);

    // All categories present in data
    const availableCategories = useMemo(() => [...new Set(subscriptions.map(s => s.category))], [subscriptions]);

    // Due soon / overdue counts
    const dueCount = subscriptions.filter(s => isDueSoon(s.nextDueDate) || isOverdue(s.nextDueDate)).length;

    const toggleCancel = (key: string) => setCancelList(prev => {
        const n = new Set(prev);
        n.has(key) ? n.delete(key) : n.add(key);
        return n;
    });

    const isFree = user?.status_assinatura !== 'active';

    // ── Over-limit banner (Grandfathering) ───────────────────
    const overLimitBanner = isFree && subscriptions.length > FREE_SUBSCRIPTION_LIMIT ? (
        <OverLimitBanner label="assinaturas recorrentes" current={subscriptions.length} limit={FREE_SUBSCRIPTION_LIMIT} />
    ) : null;

    // Guard for free plan
    const handleOpenAdd = () => {
        if (isFree && subscriptions.length >= FREE_SUBSCRIPTION_LIMIT) {
            setIsLimitModalOpen(true);
            return;
        }
        setShowAdd(true);
    };


    const handleDeleteAll = useCallback(async (sub: SubscriptionGroup) => {
        for (const tx of sub.occurrences) await onDeleteTransaction(tx.id);
    }, [onDeleteTransaction]);

    // ── Trend component ──────────────────────────────────────
    const TrendBadge = ({ pct }: { pct: number }) => {
        if (Math.abs(pct) < 0.5) return (
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-slate-400">
                <Minus className="w-3 h-3" />Estável
            </span>
        );
        if (pct > 0) return (
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-rose-400">
                <ArrowUp className="w-3 h-3" />+{pct.toFixed(0)}%
            </span>
        );
        return (
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-400">
                <TrendingDown className="w-3 h-3" />{pct.toFixed(0)}%
            </span>
        );
    };

    // ── Next Due component ───────────────────────────────────
    const NextDueBadge = ({ date }: { date: string }) => {
        if (isOverdue(date)) return (
            <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3" />Vencida
            </span>
        );
        if (isDueSoon(date)) return (
            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3" />Vence {fmtShort(date)}
            </span>
        );
        return (
            <span className="text-[10px] text-slate-400">Próx. {fmtShort(date)}</span>
        );
    };

    return (
        <div className="space-y-6">
            {overLimitBanner}

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                        <Repeat className="w-7 h-7 text-primary-500" />Assinaturas Recorrentes
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                        Controle seus gastos fixos — edite, cancele e simule economias.
                        {dueCount > 0 && (
                            <span className="ml-2 text-amber-500 font-semibold">{dueCount} venc{dueCount > 1 ? 'em' : 'e'} em breve!</span>
                        )}
                    </p>
                </div>
                {/* Button + free usage bar */}
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <button onClick={handleOpenAdd}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold text-sm shadow-md shadow-primary-500/30 active:scale-95 transition-all">
                        <Plus className="w-4 h-4" />Nova Assinatura
                    </button>
                    {isFree && (
                        <div className="flex items-center gap-2">
                            <div className="w-28 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${subscriptions.length >= FREE_SUBSCRIPTION_LIMIT
                                        ? 'bg-rose-500'
                                        : subscriptions.length >= FREE_SUBSCRIPTION_LIMIT - 1
                                            ? 'bg-amber-400'
                                            : 'bg-primary-500'
                                        }`}
                                    style={{ width: `${Math.min((subscriptions.length / FREE_SUBSCRIPTION_LIMIT) * 100, 100)}%` }}
                                />
                            </div>
                            <span className={`text-[11px] font-semibold ${subscriptions.length >= FREE_SUBSCRIPTION_LIMIT ? 'text-rose-500' : 'text-slate-400'
                                }`}>
                                {subscriptions.length}/{FREE_SUBSCRIPTION_LIMIT} grátis
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Summary Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { icon: <TrendingDown className="w-4 h-4 text-rose-500" />, bg: 'bg-rose-100 dark:bg-rose-500/20', label: 'Gasto Mensal', value: fmt(totalMonthly), sub: `${subscriptions.length} ativa${subscriptions.length !== 1 ? 's' : ''}`, delay: 0 },
                    { icon: <Calendar className="w-4 h-4 text-amber-500" />, bg: 'bg-amber-100 dark:bg-amber-500/20', label: 'Anual Projetado', value: fmt(totalMonthly * 12), sub: 'nos próximos 12 meses', delay: 0.05 },
                    { icon: <Clock className="w-4 h-4 text-blue-500" />, bg: 'bg-blue-100 dark:bg-blue-500/20', label: 'Próx. Vencimentos', value: String(dueCount), sub: dueCount > 0 ? 'nos próximos 5 dias' : 'tudo em dia ✓', delay: 0.1 },
                    { icon: <Zap className={`w-4 h-4 ${cancelList.size > 0 ? 'text-emerald-500' : 'text-slate-400'}`} />, bg: cancelList.size > 0 ? 'bg-emerald-100 dark:bg-emerald-500/30' : 'bg-slate-100 dark:bg-slate-700', label: 'Sim. Cancelamento', value: cancelList.size > 0 ? `+${fmt(cancelSavings)}/mês` : '—', sub: cancelList.size > 0 ? `${fmt(cancelSavings * 12)}/ano` : 'Marque itens', highlight: cancelList.size > 0, delay: 0.15 },
                ].map(({ icon, bg, label, value, sub, highlight, delay }) => (
                    <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
                        className={`rounded-2xl p-4 border shadow-sm transition-all
              ${highlight ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-white dark:bg-slate-850 border-slate-100 dark:border-slate-800'}`}>
                        <div className="flex items-center gap-2 mb-2">
                            <div className={`p-1.5 rounded-xl ${bg}`}>{icon}</div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</span>
                        </div>
                        <p className={`text-xl font-bold ${highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-white'}`}>{value}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
                    </motion.div>
                ))}
            </div>

            {/* ── Two column layout: chart + list ── */}
            <div className={`gap-6 ${chartData.length > 0 ? 'grid grid-cols-1 lg:grid-cols-3' : ''}`}>

                {/* Category Chart */}
                {chartData.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        className="bg-white dark:bg-slate-850 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 flex flex-col">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-white mb-1">Por categoria</h3>
                        <p className="text-xs text-slate-400 mb-4">Distribuição mensal</p>
                        <div className="flex-1 min-h-[200px]">
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                                        paddingAngle={2} dataKey="value">
                                        {chartData.map((_, idx) => (
                                            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '12px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="space-y-2 mt-2">
                            {chartData.map((d, idx) => (
                                <button key={d.name} onClick={() => setCategoryFilter(categoryFilter === d.name ? null : d.name)}
                                    className={`w-full flex items-center gap-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors ${categoryFilter === d.name ? 'bg-slate-100 dark:bg-slate-700' : ''}`}>
                                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                                    <span className="text-slate-700 dark:text-slate-300 truncate flex-1 text-left">{d.name}</span>
                                    <span className="font-bold text-slate-500 dark:text-slate-400 text-right">{fmt(d.value)}</span>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* ── List Card ── */}
                <div className={`bg-white dark:bg-slate-850 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden ${chartData.length > 0 ? 'lg:col-span-2' : 'col-span-full'}`}>

                    {/* Toolbar */}
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Buscar por nome ou categoria..."
                                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all" />
                        </div>

                        {/* Filters row */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 -mx-1 px-1">
                            {/* Sort */}
                            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 flex-shrink-0 border border-slate-200 dark:border-slate-700">
                                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
                                <CustomSelect
                                    value={sortKey}
                                    onChange={(val: string) => setSortKey(val as SortKey)}
                                    size="sm"
                                    className="w-32"
                                    options={[
                                        { value: 'cost-desc', label: 'Maior custo' },
                                        { value: 'cost-asc', label: 'Menor custo' },
                                        { value: 'alpha', label: 'A–Z' },
                                        { value: 'date-desc', label: 'Mais recente' }
                                    ]}
                                />
                            </div>

                            {/* Category pills */}
                            {availableCategories.map(cat => (
                                <button key={cat} onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                                    className={`text-[11px] font-bold px-3 py-1.5 rounded-full flex-shrink-0 transition-all
                    ${categoryFilter === cat
                                            ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}>
                                    {cat}
                                </button>
                            ))}

                            {categoryFilter && (
                                <button onClick={() => setCategoryFilter(null)} className="text-[11px] font-bold text-rose-400 flex items-center gap-1 flex-shrink-0">
                                    <X className="w-3 h-3" />Limpar
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Subscription list */}
                    {subscriptions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                <RefreshCw className="w-7 h-7 text-slate-400" />
                            </div>
                            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-2">Nenhuma assinatura</h3>
                            <p className="text-sm text-slate-400 max-w-xs mb-5">Adicione transações recorrentes ou crie uma assinatura aqui mesmo.</p>
                            <button onClick={handleOpenAdd}
                                className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-semibold shadow shadow-primary-500/30">
                                <Plus className="w-4 h-4" />Nova Assinatura
                            </button>
                        </div>
                    ) : displayList.length === 0 ? (
                        <div className="py-14 text-center text-slate-400 text-sm">Sem resultados para a busca/filtro atual.</div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {displayList.map((sub, index) => {
                                const isExpanded = expandedKey === sub.key;
                                const isCanceling = cancelList.has(sub.key);
                                const CatIcon = CATEGORY_ICONS[sub.category];
                                const overdue = isOverdue(sub.nextDueDate);
                                const dueSoon = isDueSoon(sub.nextDueDate);

                                return (
                                    <motion.div key={sub.key}
                                        initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.03 }}
                                        className={`transition-colors ${isCanceling ? 'bg-emerald-50/60 dark:bg-emerald-900/10' : overdue ? 'bg-rose-50/40 dark:bg-rose-900/10' : dueSoon ? 'bg-amber-50/40 dark:bg-amber-900/10' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'}`}>

                                        <div className="flex items-center gap-2 sm:gap-3 px-4 py-3.5">
                                            {/* Cancel checkbox */}
                                            <button onClick={() => toggleCancel(sub.key)}
                                                className={`w-5 h-5 flex-shrink-0 rounded-md border-2 transition-all flex items-center justify-center
                          ${isCanceling ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-slate-600 hover:border-primary-400'}`}>
                                                {isCanceling && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                            </button>

                                            {/* Emoji */}
                                            <div className="w-9 h-9 flex-shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg">
                                                {getIcon(sub.description)}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <p className={`font-semibold text-sm text-slate-800 dark:text-white truncate max-w-[150px] sm:max-w-none ${isCanceling ? 'line-through opacity-40' : ''}`}>
                                                        {sub.description}
                                                    </p>
                                                    {CatIcon && (
                                                        <span className={`hidden sm:flex text-[10px] font-bold px-2 py-0.5 rounded-full items-center gap-1 flex-shrink-0 ${getCatColor(sub.category)}`}>
                                                            <CatIcon className="w-2.5 h-2.5" />{sub.category}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                    <NextDueBadge date={sub.nextDueDate} />
                                                    <TrendBadge pct={sub.trendPercent} />
                                                    <span className="text-[10px] text-slate-400">{sub.occurrences.length}×</span>
                                                </div>
                                            </div>

                                            {/* Value (desktop) */}
                                            <div className="text-right flex-shrink-0 hidden sm:block mr-1">
                                                <p className="font-bold text-slate-800 dark:text-white text-sm">{fmt(sub.monthlyAvg)}<span className="text-xs font-normal text-slate-400">/mês</span></p>
                                                <p className="text-[11px] text-rose-400">{fmt(sub.yearCost)}/ano</p>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-0.5">
                                                <button onClick={() => setEditTarget(sub.occurrences[0])}
                                                    className="p-1.5 text-slate-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-lg transition-all" title="Editar">
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => setDeleteAllTarget(sub)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all" title="Excluir todas">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => setExpandedKey(isExpanded ? null : sub.key)}
                                                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all">
                                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Mobile value */}
                                        <div className="sm:hidden flex items-center justify-between px-[72px] pb-3 -mt-1">
                                            <span className="text-sm font-bold text-slate-800 dark:text-white">{fmt(sub.monthlyAvg)}<span className="text-xs font-normal text-slate-400">/mês</span></span>
                                            <span className="text-[11px] text-rose-400">{fmt(sub.yearCost)}/ano</span>
                                        </div>

                                        {/* Expanded history */}
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                                                    <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800 ml-8">
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                                                            Histórico ({sub.occurrences.length} registros)
                                                        </p>
                                                        <div className="space-y-1">
                                                            {sub.occurrences.map(tx => (
                                                                <div key={tx.id} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 group transition-colors">
                                                                    <div className="flex items-center gap-2.5">
                                                                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${tx.status === 'completed' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                                                        <div>
                                                                            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">{fmtDate(tx.date)}</p>
                                                                            <p className="text-[10px] text-slate-400">{tx.status === 'completed' ? 'Pago' : 'Pendente'}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{fmt(Number(tx.amount))}</span>
                                                                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <button onClick={() => setEditTarget(tx)} className="p-1 text-slate-400 hover:text-primary-500 rounded-lg transition-colors"><Pencil className="w-3 h-3" /></button>
                                                                            <button onClick={() => setDeleteOneTarget({ id: tx.id })} className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"><Trash2 className="w-3 h-3" /></button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <button onClick={() => setDeleteAllTarget(sub)}
                                                            className="mt-3 w-full text-xs font-semibold text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-500/10 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 border border-dashed border-rose-200 dark:border-rose-800">
                                                            <Trash2 className="w-3.5 h-3.5" />Excluir todas as {sub.occurrences.length} ocorrências
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

                    {/* Cancel bar */}
                    <AnimatePresence>
                        {cancelList.size > 0 && (
                            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
                                className="sticky bottom-0 p-4 border-t border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-between gap-3 flex-wrap">
                                <div>
                                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                                        💡 Cancelando {cancelList.size} assinatura{cancelList.size > 1 ? 's' : ''}
                                    </p>
                                    <p className="text-xs text-emerald-600 dark:text-emerald-500">
                                        Economia de <strong>{fmt(cancelSavings)}/mês</strong> · {fmt(cancelSavings * 12)}/ano
                                    </p>
                                </div>
                                <button onClick={() => setCancelList(new Set())} className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
                                    <X className="w-3 h-3" />Limpar
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* ── Modals ── */}
            <AnimatePresence>
                {showAdd && <AddModal onSave={onAddTransaction} onClose={() => setShowAdd(false)} />}
                {editTarget && <EditModal transaction={editTarget} onSave={onUpdateTransaction} onClose={() => setEditTarget(null)} />}
                {deleteOneTarget && (
                    <DeleteModal title="Excluir ocorrência?" message="Remove apenas este registro. As demais ocorrências permanecem."
                        onConfirm={async () => { await onDeleteTransaction(deleteOneTarget.id); }}
                        onClose={() => setDeleteOneTarget(null)} />
                )}
                {deleteAllTarget && (
                    <DeleteModal title={`Excluir "${deleteAllTarget.description}"?`}
                        message={`Apaga permanentemente todas as ${deleteAllTarget.occurrences.length} ocorrências desta assinatura do banco de dados. Ação irreversível.`}
                        onConfirm={async () => { await handleDeleteAll(deleteAllTarget); }}
                        onClose={() => setDeleteAllTarget(null)} />
                )}
            </AnimatePresence>

            {/* Free plan paywall */}
            <LimitPaywallModal
                isOpen={isLimitModalOpen}
                onClose={() => setIsLimitModalOpen(false)}
                title="Limite de Assinaturas Atingido"
                description={`No plano gratuito você pode gerenciar até ${FREE_SUBSCRIPTION_LIMIT} assinaturas recorrentes. Assine o Super Trocô para adicionar assinaturas ilimitadas e ter controle total dos seus gastos fixos.`}
                userEmail={user?.email}
            />
        </div>
    );
};

export default Subscriptions;
