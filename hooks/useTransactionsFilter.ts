import { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { parseCurrency } from '../utils';

interface AdvancedFilters {
    minAmount: string;
    maxAmount: string;
    selectedCategories: string[];
    selectedDate: string;
}

interface SortConfig {
    key: keyof Transaction;
    direction: 'asc' | 'desc';
}

interface UseTransactionsFilterProps {
    transactions: Transaction[];
}

export function useTransactionsFilter({ transactions }: UseTransactionsFilterProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState(''); // Formato YYYY-MM
    const [quickFilter, setQuickFilter] = useState<'all' | 'pending' | 'income' | 'expense' | 'credit'>('all');
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
    const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
        minAmount: '',
        maxAmount: '',
        selectedCategories: [],
        selectedDate: ''
    });

    const filteredTransactions = useMemo(() => {
        return transactions
            .filter(t => {
                const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    t.category.toLowerCase().includes(searchTerm.toLowerCase());

                const matchesDate = filterDate ? t.date.startsWith(filterDate) : true;

                let matchesQuick = true;
                if (quickFilter === 'pending') matchesQuick = t.status === 'pending';
                else if (quickFilter === 'income') matchesQuick = t.type === 'income';
                else if (quickFilter === 'expense') matchesQuick = t.type === 'expense';
                else if (quickFilter === 'credit') matchesQuick = !!t.cardId;

                const numericMin = advancedFilters.minAmount ? parseCurrency(advancedFilters.minAmount) : -Infinity;
                const numericMax = advancedFilters.maxAmount ? parseCurrency(advancedFilters.maxAmount) : Infinity;
                const matchesAmount = t.amount >= numericMin && t.amount <= numericMax;

                const matchesCategories = advancedFilters.selectedCategories.length > 0
                    ? advancedFilters.selectedCategories.includes(t.category)
                    : true;

                const matchesAdvancedDate = advancedFilters.selectedDate ? t.date === advancedFilters.selectedDate : true;

                return matchesSearch && matchesDate && matchesQuick && matchesAmount && matchesCategories && matchesAdvancedDate;
            })
            .sort((a, b) => {
                if (!sortConfig) return 0;

                const { key, direction } = sortConfig;
                const aVal = a[key] ?? '';
                const bVal = b[key] ?? '';

                if (aVal < bVal) return direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return direction === 'asc' ? 1 : -1;
                return 0;
            });
    }, [transactions, searchTerm, filterDate, quickFilter, advancedFilters, sortConfig]);

    const summary = useMemo(() => {
        let income = 0;
        let expense = 0;
        filteredTransactions.forEach(t => {
            if (t.category === 'Transferência' || t.type === 'transfer') return;
            if (t.type === 'income') income += t.amount;
            else if (t.type === 'expense') expense += t.amount;
        });
        return { income, expense, balance: income - expense };
    }, [filteredTransactions]);

    return {
        searchTerm,
        setSearchTerm,
        filterDate,
        setFilterDate,
        quickFilter,
        setQuickFilter,
        sortConfig,
        setSortConfig,
        advancedFilters,
        setAdvancedFilters,
        filteredTransactions,
        summary
    };
}
