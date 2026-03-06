import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Repeat, TrendingDown, Calendar, Trash2, X,
    AlertTriangle, ChevronDown, ChevronUp, Search,
    RefreshCw, Zap
} from 'lucide-react';
import { Transaction, UserProfile } from '../types';

interface SubscriptionsProps {
    transactions: Transaction[];
    user: UserProfile;
    onDeleteTransaction: (id: string) => Promise<void>;
}

interface SubscriptionGroup {
    key: string;
    description: string;
    category: string;
    latestDate: string;
    monthlyAvg: number;
    yearCost: number;
    occurrences: Transaction[];
    isMarkedForCancel: boolean;
}

// Emoji/icon mapping for common subscription names
const SUBSCRIPTION_ICONS: Record<string, string> = {
    netflix: '🎬', spotify: '🎵', amazon: '📦', prime: '📦',
    youtube: '▶️', disney: '🏰', hbo: '🎭', globoplay: '📺',
    deezer: '🎶', apple: '🍎', icloud: '☁️', dropbox: '📁',
    microsoft: '💻', office: '💻', adobe: '🎨',
    academia: '💪', gym: '💪', crossfit: '🏋️',
    plano: '💊', saúde: '💊', clinica: '🏥', médico: '🏥',
    telefone: '📱', celular: '📱', internet: '🌐', tim: '📱',
    vivo: '📱', claro: '📱', oi: '📱', net: '🌐',
    luz: '💡', energia: '💡', água: '💧', gás: '🔥',
    aluguel: '🏠', condomínio: '🏢', iptu: '🏘️',
    seguro: '🛡️', cartão: '💳', anuidade: '💳',
    default: '📋'
};

const getIcon = (description: string): string => {
    const lower = description.toLowerCase();
    for (const [key, icon] of Object.entries(SUBSCRIPTION_ICONS)) {
        if (lower.includes(key)) return icon;
    }
    return SUBSCRIPTION_ICONS.default;
};

const CATEGORY_COLORS: Record<string, string> = {
    'Alimentação': 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
    'Entretenimento': 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
    'Saúde': 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
    'Transporte': 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
    'Utilidades': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300',
    'Moradia': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
    'Tecnologia': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300',
    'Educação': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
    'default': 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

const getCategoryColor = (category: string): string =>
    CATEGORY_COLORS[category] || CATEGORY_COLORS['default'];

const Subscriptions: React.FC<SubscriptionsProps> = ({ transactions, user, onDeleteTransaction }) => {
    const [cancelList, setCancelList] = useState<Set<string>>(new Set());
    const [expandedKey, setExpandedKey] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [confirmDelete, setConfirmDelete] = useState<{ key: string; id: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    // Detect subscriptions from transactions with isRecurring=true, type=expense
    const subscriptions = useMemo((): SubscriptionGroup[] => {
        const recurring = transactions.filter(t => t.type === 'expense' && t.isRecurring === true);

        // Group by normalized description
        const grouped = new Map<string, Transaction[]>();
        recurring.forEach(t => {
            const key = t.description.trim().toLowerCase();
            const existing = grouped.get(key) || [];
            grouped.set(key, [...existing, t]);
        });

        return Array.from(grouped.entries()).map(([key, txs]) => {
            const sorted = [...txs].sort((a, b) => b.date.localeCompare(a.date));
            const totalSpent = txs.reduce((acc, t) => acc + Number(t.amount), 0);
            const monthlyAvg = totalSpent / Math.max(txs.length, 1);

            return {
                key,
                description: sorted[0].description,
                category: sorted[0].category || 'Outros',
                latestDate: sorted[0].date,
                monthlyAvg,
                yearCost: monthlyAvg * 12,
                occurrences: sorted,
                isMarkedForCancel: cancelList.has(key),
            };
        }).sort((a, b) => b.monthlyAvg - a.monthlyAvg);
    }, [transactions, cancelList]);

    const filtered = useMemo(() => {
        if (!search.trim()) return subscriptions;
        const q = search.toLowerCase();
        return subscriptions.filter(s =>
            s.description.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
        );
    }, [subscriptions, search]);

    const totalMonthly = subscriptions.reduce((acc, s) => acc + s.monthlyAvg, 0);
    const totalYearly = totalMonthly * 12;
    const cancelSavings = subscriptions
        .filter(s => cancelList.has(s.key))
        .reduce((acc, s) => acc + s.monthlyAvg, 0);

    const toggleCancel = (key: string) => {
        setCancelList(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const handleDeleteLatest = async () => {
        if (!confirmDelete) return;
        setIsDeleting(true);
        try {
            await onDeleteTransaction(confirmDelete.id);
            setConfirmDelete(null);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                    <Repeat className="w-7 h-7 text-primary-500" />
                    Assinaturas Recorrentes
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                    Despesas que se repetem mensalmente — controle o que você realmente usa.
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
                    className="bg-white dark:bg-slate-850 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-rose-100 dark:bg-rose-500/20 rounded-xl">
                            <TrendingDown className="w-4 h-4 text-rose-500" />
                        </div>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Gasto Mensal</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{formatCurrency(totalMonthly)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{subscriptions.length} assinatura{subscriptions.length !== 1 ? 's' : ''} ativas</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}
                    className="bg-white dark:bg-slate-850 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-xl">
                            <Calendar className="w-4 h-4 text-amber-500" />
                        </div>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Impacto Anual</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{formatCurrency(totalYearly)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">em 12 meses projetados</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
                    className={`rounded-2xl p-5 border shadow-sm transition-all ${cancelList.size > 0
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                        : 'bg-white dark:bg-slate-850 border-slate-100 dark:border-slate-800'}`}
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-xl ${cancelList.size > 0 ? 'bg-emerald-100 dark:bg-emerald-500/30' : 'bg-slate-100 dark:bg-slate-700'}`}>
                            <Zap className={`w-4 h-4 ${cancelList.size > 0 ? 'text-emerald-500' : 'text-slate-400'}`} />
                        </div>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Sim. Cancelamento</span>
                    </div>
                    <p className={`text-2xl font-bold ${cancelList.size > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-white'}`}>
                        {cancelList.size > 0 ? `+ ${formatCurrency(cancelSavings)}/mês` : '—'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                        {cancelList.size > 0
                            ? `${formatCurrency(cancelSavings * 12)}/ano de economia`
                            : 'Marque itens para simular'}
                    </p>
                </motion.div>
            </div>

            {/* Search & List */}
            <div className="bg-white dark:bg-slate-850 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                {/* Search bar */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar assinatura..."
                            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                        />
                    </div>
                </div>

                {/* Subscription list */}
                {subscriptions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                            <RefreshCw className="w-7 h-7 text-slate-400" />
                        </div>
                        <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">Nenhuma assinatura detectada</h3>
                        <p className="text-sm text-slate-400 max-w-xs">
                            Ao adicionar uma transação, marque a opção <strong>"Recorrente"</strong> para que ela apareça aqui automaticamente.
                        </p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 text-sm">
                        Nenhuma assinatura encontrada para "<strong>{search}</strong>"
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filtered.map((sub, index) => {
                            const isExpanded = expandedKey === sub.key;
                            const isCanceling = cancelList.has(sub.key);
                            const icon = getIcon(sub.description);
                            const catColor = getCategoryColor(sub.category);

                            return (
                                <motion.div
                                    key={sub.key}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.04 }}
                                    className={`transition-colors ${isCanceling ? 'bg-emerald-50/60 dark:bg-emerald-900/10' : ''}`}
                                >
                                    {/* Main Row */}
                                    <div className="flex items-center gap-3 px-4 py-4">
                                        {/* Checkbox para cancelamento simulado */}
                                        <button
                                            onClick={() => toggleCancel(sub.key)}
                                            title={isCanceling ? 'Desmarcar' : 'Marcar para cancelar'}
                                            className={`w-5 h-5 flex-shrink-0 rounded-md border-2 transition-all flex items-center justify-center
                        ${isCanceling
                                                    ? 'bg-emerald-500 border-emerald-500'
                                                    : 'border-slate-300 dark:border-slate-600 hover:border-primary-400'
                                                }`}
                                        >
                                            {isCanceling && <X className="w-3 h-3 text-white" strokeWidth={3} />}
                                        </button>

                                        {/* Icon */}
                                        <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl">
                                            {icon}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className={`font-semibold text-sm text-slate-800 dark:text-white truncate ${isCanceling ? 'line-through opacity-50' : ''}`}>
                                                    {sub.description}
                                                </p>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${catColor}`}>
                                                    {sub.category}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                <p className="text-[11px] text-slate-400">
                                                    {sub.occurrences.length}× registrada · última em {new Date(sub.latestDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Values */}
                                        <div className="text-right flex-shrink-0 hidden sm:block">
                                            <p className="font-bold text-slate-800 dark:text-white text-sm">{formatCurrency(sub.monthlyAvg)}<span className="text-xs font-normal text-slate-400">/mês</span></p>
                                            <p className="text-[11px] text-slate-400">{formatCurrency(sub.yearCost)}/ano</p>
                                        </div>

                                        {/* Expand Toggle */}
                                        <button
                                            onClick={() => setExpandedKey(isExpanded ? null : sub.key)}
                                            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all ml-1"
                                        >
                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </button>
                                    </div>

                                    {/* Mobile values row */}
                                    <div className="sm:hidden px-4 pb-3 flex items-center justify-between">
                                        <p className="font-bold text-slate-800 dark:text-white text-sm">
                                            {formatCurrency(sub.monthlyAvg)}<span className="text-xs font-normal text-slate-400">/mês</span>
                                        </p>
                                        <p className="text-[11px] text-slate-400">{formatCurrency(sub.yearCost)}/ano</p>
                                    </div>

                                    {/* Expanded: Occurrences */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="px-4 pb-4 space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-3 ml-8">
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Histórico de ocorrências</p>
                                                    {sub.occurrences.map(tx => (
                                                        <div key={tx.id} className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 group transition-colors">
                                                            <span className="text-slate-500 dark:text-slate-400 text-xs">
                                                                {new Date(tx.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-semibold text-slate-700 dark:text-slate-200">{formatCurrency(Number(tx.amount))}</span>
                                                                <button
                                                                    onClick={() => setConfirmDelete({ key: sub.key, id: tx.id })}
                                                                    className="p-1 text-slate-300 hover:text-rose-500 rounded opacity-0 group-hover:opacity-100 transition-all"
                                                                    title="Excluir esta ocorrência"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
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
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 20, opacity: 0 }}
                            className="sticky bottom-0 p-4 border-t border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-between gap-3 flex-wrap"
                        >
                            <div>
                                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                                    💡 Cancelando {cancelList.size} assinatura{cancelList.size > 1 ? 's' : ''}...
                                </p>
                                <p className="text-xs text-emerald-600 dark:text-emerald-500">
                                    Você economizaria <strong>{formatCurrency(cancelSavings)}/mês</strong> · {formatCurrency(cancelSavings * 12)}/ano
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

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {confirmDelete && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
                        onClick={() => !isDeleting && setConfirmDelete(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.92, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2.5 bg-rose-100 dark:bg-rose-500/20 rounded-xl">
                                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                                </div>
                                <h3 className="font-bold text-slate-800 dark:text-white">Excluir ocorrência?</h3>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                                Essa ação remove apenas este registro específico. As demais ocorrências dessa assinatura permanecem intactas.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmDelete(null)}
                                    disabled={isDeleting}
                                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleDeleteLatest}
                                    disabled={isDeleting}
                                    className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 active:scale-95 transition-all disabled:opacity-60"
                                >
                                    {isDeleting ? 'Excluindo...' : 'Excluir'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Subscriptions;
