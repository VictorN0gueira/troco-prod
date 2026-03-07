import React from 'react';
import { BudgetManager } from './BudgetManager';
import { Budget, Transaction } from '../types';

interface BudgetsProps {
    budgets: Budget[];
    transactions: Transaction[];
    addBudget: (b: Budget) => Promise<void>;
    updateBudget: (b: Budget) => Promise<void>;
    deleteBudget: (id: number) => Promise<void>;
}

export default function Budgets({
    budgets,
    transactions,
    addBudget,
    updateBudget,
    deleteBudget
}: BudgetsProps) {
    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in-up pb-32">
            <header className="mb-8">
                <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Orçamentos</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Defina e acompanhe limites de gastos mensais por categoria.</p>
            </header>

            <div className="bg-white dark:bg-slate-850 p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                <BudgetManager
                    budgets={budgets}
                    transactions={transactions}
                    onAddBudget={addBudget}
                    onUpdateBudget={updateBudget}
                    onDeleteBudget={deleteBudget}
                />
            </div>
        </div>
    );
}
