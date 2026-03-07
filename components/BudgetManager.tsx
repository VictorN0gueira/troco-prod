import React, { useState, useMemo } from 'react';
import { Budget, Transaction } from '../types';
import { CATEGORY_ICONS, CATEGORIES } from '../constants';
import { Edit2, Plus, Trash2, X, Check, Search, TrendingDown, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BudgetManagerProps {
    budgets: Budget[];
    transactions: Transaction[];
    onAddBudget: (b: Budget) => Promise<void>;
    onUpdateBudget: (b: Budget) => Promise<void>;
    onDeleteBudget: (id: number) => Promise<void>;
}

export function BudgetManager({ budgets, transactions, onAddBudget, onUpdateBudget, onDeleteBudget }: BudgetManagerProps) {
    const [isAdding, setIsAdding] = useState(false);
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
            const d = new Date(t.date);
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
            setIsAdding(false);
            setEditId(null);
            setFormData({ categoria: CATEGORIES[0], valor_limite: '' });
        } catch (error) {
            console.error(error);
        }
    };

    const handleEdit = (b: Budget) => {
        setEditId(b.id);
        setFormData({ categoria: b.categoria, valor_limite: String(b.valor_limite) });
        setIsAdding(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm("Remover este limite de orçamento?")) {
            await onDeleteBudget(id);
        }
    };

    // Helper for formatting
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Orçamento Mensal</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Defina tetos de gastos por categoria para este mês.</p>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => {
                            setEditId(null);
                            setFormData({ categoria: CATEGORIES[0], valor_limite: '' });
                            setIsAdding(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-semibold hover:bg-primary-600 transition-all"
                    >
                        <Plus className="w-4 h-4" /> Novo Teto
                    </button>
                )}
            </div>

            <AnimatePresence>
                {isAdding && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 config-mode">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Categoria</label>
                                <select
                                    disabled={editId !== null}
                                    value={formData.categoria}
                                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                                >
                                    {CATEGORIES.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Limite Mensal (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.valor_limite}
                                    onChange={(e) => setFormData({ ...formData, valor_limite: e.target.value })}
                                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                                    placeholder="Ex: 800.00"
                                />
                            </div>
                            <div className="flex items-end gap-2 lg:col-span-1">
                                <button
                                    onClick={handleSave}
                                    disabled={!formData.valor_limite}
                                    className="flex-1 p-2.5 bg-emerald-500 text-white rounded-lg flex items-center justify-center hover:bg-emerald-600 disabled:opacity-50"
                                >
                                    <Check className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => { setIsAdding(false); setEditId(null); }}
                                    className="p-2.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {currentBudgets.length > 0 ? (
                <div className="space-y-4">
                    {currentBudgets.map(b => {
                        const Icon = CATEGORY_ICONS[b.categoria] || TrendingDown;
                        const spent = currentTransactions.filter(t => t.category === b.categoria).reduce((acc, t) => acc + t.amount, 0);
                        const progress = Math.min((spent / b.valor_limite) * 100, 100);
                        const isOver = spent > b.valor_limite;
                        const isNear = progress >= 85 && !isOver;

                        return (
                            <div key={b.id} className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl relative overflow-hidden group">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800 dark:text-white">{b.categoria}</p>
                                            <p className="text-xs text-slate-500">
                                                {formatCurrency(spent)} de {formatCurrency(b.valor_limite)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEdit(b)} className="p-1.5 text-slate-400 hover:text-primary-500 rounded-md hover:bg-primary-50 dark:hover:bg-primary-900/20">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(b.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        className={`h-full rounded-full ${isOver ? 'bg-red-500' : isNear ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                    />
                                </div>
                                {(isOver || isNear) && (
                                    <div className={`mt-2 flex items-center gap-1.5 text-xs font-semibold ${isOver ? 'text-red-500' : 'text-amber-500'}`}>
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        {isOver ? 'Orçamento excedido!' : 'Próximo do limite.'}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                        <TrendingDown className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Nenhum limite definido para este mês.</p>
                </div>
            )}
        </div>
    );
}
