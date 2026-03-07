import React, { useState, useMemo } from 'react';
import { Budget, Transaction } from '../types';
import { CATEGORY_ICONS, CATEGORIES } from '../constants';
import { Edit2, Plus, Trash2, X, TrendingDown, AlertCircle, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BudgetManagerProps {
    budgets: Budget[];
    transactions: Transaction[];
    onAddBudget: (b: Budget) => Promise<void>;
    onUpdateBudget: (b: Budget) => Promise<void>;
    onDeleteBudget: (id: number) => Promise<void>;
}

export function BudgetManager({ budgets, transactions, onAddBudget, onUpdateBudget, onDeleteBudget }: BudgetManagerProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [editId, setEditId] = useState<number | null>(null);
    const [formData, setFormData] = useState({ categoria: CATEGORIES[0], valor_limite: '' });

    // Current month/year filter for budgets
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const currentBudgets = useMemo(() => {
        return budgets.filter(b => b.mes === currentMonth && b.ano === currentYear);
    }, [budgets, currentMonth, currentYear]);

    // Current month transactions to calculate progress
    const currentTransactions = useMemo(() => {
        return transactions.filter(t => {
            if (t.type !== 'expense') return false;
            // Handle timezone safely by appending T12:00:00Z to YYYY-MM-DD to avoid timezone shifting
            const dateStr = t.date.includes('T') ? t.date : t.date + 'T12:00:00Z';
            const d = new Date(dateStr);
            return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
        });
    }, [transactions, currentMonth, currentYear]);

    const handleSave = async () => {
        if (!formData.valor_limite || isNaN(Number(formData.valor_limite))) return;

        try {
            if (editId) {
                const existing = budgets.find(b => b.id === editId);
                if (existing) {
                    await onUpdateBudget({ ...existing, valor_limite: Number(formData.valor_limite) });
                }
            } else {
                await onAddBudget({
                    id: 0,
                    user_id: 0,
                    categoria: formData.categoria,
                    valor_limite: Number(formData.valor_limite),
                    mes: currentMonth,
                    ano: currentYear
                });
            }
            setIsModalOpen(false);
            setEditId(null);
            setFormData({ categoria: CATEGORIES[0], valor_limite: '' });
        } catch (error) {
            console.error(error);
        }
    };

    const handleEdit = (b: Budget) => {
        setEditId(b.id);
        setFormData({ categoria: b.categoria, valor_limite: String(b.valor_limite) });
        setIsModalOpen(true);
    };

    const confirmDelete = async () => {
        if (deleteId) {
            await onDeleteBudget(deleteId);
            setIsDeleteModalOpen(false);
            setDeleteId(null);
        }
    };

    // Helper for formatting
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                        <Wallet className="w-6 h-6 text-primary-500" />
                        Orçamento Mensal
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Acompanhe seus limites de gastos por categoria neste mês.
                    </p>
                </div>
                <button
                    onClick={() => {
                        setEditId(null);
                        setFormData({ categoria: CATEGORIES[0], valor_limite: '' });
                        setIsModalOpen(true);
                    }}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 hover:-translate-y-0.5 active:scale-95"
                >
                    <Plus className="w-5 h-5" /> Novo Orçamento
                </button>
            </div>

            {currentBudgets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {currentBudgets.map(b => {
                        const Icon = CATEGORY_ICONS[b.categoria] || TrendingDown;
                        const spent = currentTransactions.filter(t => t.category === b.categoria).reduce((acc, t) => acc + t.amount, 0);
                        const progress = Math.min((spent / b.valor_limite) * 100, 100);
                        const isOver = spent > b.valor_limite;
                        const isNear = progress >= 85 && !isOver;

                        return (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={b.id}
                                className="bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none transition-all duration-300 relative overflow-hidden group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${isOver ? 'bg-rose-500 shadow-rose-500/30' : isNear ? 'bg-amber-500 shadow-amber-500/30' : 'bg-primary-500 shadow-primary-500/30'}`}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-white text-lg leading-tight">{b.categoria}</h4>
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                                                {progress.toFixed(0)}% Usado
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-1 xl:opacity-0 xl:group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEdit(b)}
                                            className="p-2 text-slate-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-xl transition-colors"
                                            title="Editar"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => { setDeleteId(b.id); setIsDeleteModalOpen(true); }}
                                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"
                                            title="Excluir"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="mb-2 flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Gasto Atual</p>
                                        <p className={`text-xl font-black tracking-tight ${isOver ? 'text-rose-500' : 'text-slate-800 dark:text-white'}`}>
                                            {formatCurrency(spent)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Limite</p>
                                        <p className="text-sm font-bold text-slate-500">
                                            {formatCurrency(b.valor_limite)}
                                        </p>
                                    </div>
                                </div>

                                <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-3 relative">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        className={`absolute top-0 left-0 h-full rounded-full ${isOver ? 'bg-rose-500' : isNear ? 'bg-amber-500' : 'bg-primary-500'}`}
                                    />
                                </div>

                                {(isOver || isNear) && (
                                    <div className={`mt-3 flex items-center gap-1.5 text-xs font-bold ${isOver ? 'text-rose-500' : 'text-amber-500'} bg-slate-50 dark:bg-slate-800 p-2 rounded-lg`}>
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        {isOver ? 'Você ultrapassou o limite deste mês!' : 'Atenção: você está próximo do limite mensal.'}
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-16 bg-white dark:bg-slate-850 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm"
                >
                    <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-slate-700">
                        <Wallet className="w-10 h-10 text-slate-400" />
                    </div>
                    <h4 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Nenhum limite definido</h4>
                    <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
                        Crie orçamentos para acompanhar seus gastos e não estourar o limite no fim do mês.
                    </p>
                    <button
                        onClick={() => {
                            setEditId(null);
                            setFormData({ categoria: CATEGORIES[0], valor_limite: '' });
                            setIsModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold hover:scale-105 transition-all shadow-lg"
                    >
                        <Plus className="w-5 h-5" /> Criar Primeiro Orçamento
                    </button>
                </motion.div>
            )}

            {/* Form Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-slate-850 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl relative"
                        >
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="absolute top-6 right-6 p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-500/20 text-primary-500 flex items-center justify-center">
                                    <Wallet className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 dark:text-white">
                                        {editId ? 'Editar Limite' : 'Novo Orçamento'}
                                    </h2>
                                    <p className="text-sm text-slate-500">Defina um teto para seus gastos</p>
                                </div>
                            </div>

                            <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                        Categoria
                                    </label>
                                    <select
                                        disabled={editId !== null}
                                        value={formData.categoria}
                                        onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                                        className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all disabled:opacity-50"
                                    >
                                        {CATEGORIES.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                    {editId && <p className="text-xs text-slate-500 mt-1">A categoria não pode ser alterada.</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                        Limite Mensal (R$)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">R$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.valor_limite}
                                            onChange={(e) => setFormData({ ...formData, valor_limite: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all font-semibold"
                                            placeholder="0.00"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 py-3.5 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!formData.valor_limite}
                                        className="flex-1 py-3.5 px-4 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition-colors disabled:opacity-50 shadow-lg shadow-primary-500/30 flex justify-center items-center"
                                    >
                                        {editId ? 'Salvar Edição' : 'Criar Limite'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {isDeleteModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-slate-850 rounded-3xl p-6 md:p-8 w-full max-w-sm shadow-2xl relative text-center"
                        >
                            <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">Excluir Orçamento</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
                                Tem certeza de que deseja excluir este orçamento? Seu histórico de transações não será afetado.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setIsDeleteModalOpen(false); setDeleteId(null); }}
                                    className="flex-1 py-3.5 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 py-3.5 px-4 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/30"
                                >
                                    Excluir
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
