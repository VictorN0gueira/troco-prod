import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Transaction } from '../types';
import { ChevronLeft, ChevronRight, X, ArrowUpCircle, ArrowDownCircle, RefreshCw, CheckCircle2, Circle, Plus, Filter } from 'lucide-react';
import { parseDateFromDB, formatDateDisplay, getProjectedTransactions, generateTransactionId } from '../utils';
import { motion, AnimatePresence } from 'framer-motion';

// Helper para pegar dias no mês
const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
};

// Helper para pegar dia da semana do dia 1 (0-6)
const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
};

interface CalendarViewProps {
    transactions: Transaction[];
    onAddTransaction: (t: Transaction) => Promise<void>;
    onUpdateTransaction: (t: Transaction) => Promise<void>;
}

type FilterType = 'all' | 'pending' | 'completed';

const CalendarView: React.FC<CalendarViewProps> = ({ transactions, onAddTransaction, onUpdateTransaction }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null); // YYYY-MM-DD
    const [direction, setDirection] = useState(0); // Para animação -1 ou 1
    const [filter, setFilter] = useState<FilterType>('all');

    // Quick Add Form States
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [quickType, setQuickType] = useState<'income' | 'expense'>('expense');
    const [quickAmount, setQuickAmount] = useState('');
    const [quickDesc, setQuickDesc] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Atela para focar quando abrir o quick add
    const quickDescRef = useRef<HTMLInputElement>(null);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (showQuickAdd) {
                if (e.key === 'Escape') setShowQuickAdd(false);
                return; // Não navegar meses se modal de form aberto
            }
            if (selectedDate) {
                if (e.key === 'Escape') setSelectedDate(null);
                return;
            }
            if (e.key === 'ArrowLeft') {
                prevMonth();
            } else if (e.key === 'ArrowRight') {
                nextMonth();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedDate, showQuickAdd, currentDate]);

    // Focus quick add
    useEffect(() => {
        if (showQuickAdd && quickDescRef.current) {
            setTimeout(() => quickDescRef.current?.focus(), 100);
        }
    }, [showQuickAdd]);

    // Navegação
    const nextMonth = () => {
        setDirection(1);
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setDirection(-1);
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const displayMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    // Agrupar transações por data com suporte a recorrência visual
    const { transactionsByDate, monthSummary } = useMemo(() => {
        const map: Record<string, { income: number, expense: number, items: Transaction[], pendingCount: number }> = {};
        const summary = { totalIncome: 0, totalExpense: 0, totalPending: 0 };

        // Dados da visualização atual
        const viewYear = currentDate.getFullYear();
        const viewMonth = currentDate.getMonth();

        // Obtém lista unificada (Reais + Projetadas)
        const allTransactionsForView = getProjectedTransactions(transactions, viewMonth, viewYear);

        allTransactionsForView.forEach(t => {
            // Apply filter FIRST
            if (filter === 'pending' && t.status !== 'pending') return;
            if (filter === 'completed' && t.status !== 'completed') return;

            const dateStr = t.date; // Já vem no formato YYYY-MM-DD da função utilitária

            if (!map[dateStr]) {
                map[dateStr] = { income: 0, expense: 0, items: [], pendingCount: 0 };
            }

            // Evita duplicatas de ID (segurança extra)
            if (!map[dateStr].items.some(i => i.id === t.id)) {
                map[dateStr].items.push(t);

                if (t.type === 'income') {
                    map[dateStr].income += Number(t.amount);
                    summary.totalIncome += Number(t.amount);
                } else {
                    map[dateStr].expense += Number(t.amount);
                    summary.totalExpense += Number(t.amount);
                }

                if (t.status === 'pending') {
                    map[dateStr].pendingCount += 1;
                    summary.totalPending += 1;
                }
            }
        });

        // Ordenar items de cada dia (receitas primeiro, depois despesas)
        Object.keys(map).forEach(date => {
            map[date].items.sort((a, b) => {
                if (a.type !== b.type) return a.type === 'income' ? -1 : 1;
                return Number(b.amount) - Number(a.amount);
            });
        });

        return { transactionsByDate: map, monthSummary: summary };
    }, [transactions, currentDate, filter]);

    // Geração da Grade do Calendário
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);

    const calendarDays: Array<{ day: number | null, isWeekend: boolean }> = [];
    // Padding para o mês anterior
    for (let i = 0; i < firstDay; i++) {
        calendarDays.push({ day: null, isWeekend: false });
    }
    // Dias do mês atual
    for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), i).getDay();
        calendarDays.push({ day: i, isWeekend: d === 0 || d === 6 });
    }

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const handleDateClick = (day: number) => {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const dateStr = `${year}-${month}-${dayStr}`;
        setSelectedDate(dateStr);
        setShowQuickAdd(false);
    };

    const selectedTransactions = selectedDate ? (transactionsByDate[selectedDate]?.items || []) : [];

    const handleToggleStatus = async (tx: Transaction) => {
        // Verifica se é uma transação virtual (recorrente projetada)
        const isVirtual = String(tx.id).includes('-rec-');
        const newStatus = tx.status === 'completed' ? 'pending' : 'completed';

        if (isVirtual) {
            // INSTANCIAÇÃO:
            // Se for virtual e o usuário marcou como completa, criamos uma nova transação REAL.
            // Se o usuário tentar marcar como pendente uma virtual que já é pendente... bem, nada acontece (mas a UI não deve permitir).
            // Vamos assumir que clicar no check de uma virtual SEMPRE significa "Confirmar/Pagar".

            const newRealTx: Transaction = {
                ...tx,
                id: `inst-${Date.now()}`, // ID temporário, backend vai gerar o real
                status: newStatus,
                isRecurring: false, // A instância concreta NÃO é a flag de recorrencia
                // A data já está correta no objeto virtual (foi projetada no loop do useMemo)
            };

            await onAddTransaction(newRealTx);
        } else {
            // Atualização normal de transação existente
            const updatedTx: Transaction = { ...tx, status: newStatus as 'completed' | 'pending' };
            await onUpdateTransaction(updatedTx);
        }
    };

    const handleQuickAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDate || !quickDesc || !quickAmount) return;

        setIsSaving(true);
        try {
            const newTx: Transaction = {
                id: generateTransactionId(),
                description: quickDesc,
                amount: parseFloat(quickAmount.replace(',', '.')),
                type: quickType,
                category: quickType === 'income' ? 'Outras Receitas' : 'Outros',
                date: selectedDate, // data selecionada no modal
                status: 'completed', // Quick add assumes completed default, can enhance later
                isRecurring: false,
                cardId: undefined, // Fix typing to use undefined instead of null
                installment_group: undefined
            };

            await onAddTransaction(newTx);

            // Reset form but keep modal open to see the new item
            setQuickDesc('');
            setQuickAmount('');
            setShowQuickAdd(false);
        } finally {
            setIsSaving(false);
        }
    }

    // Framer motion variants
    const slideVariants = {
        enter: (direction: number) => {
            return {
                x: direction > 0 ? 30 : -30,
                opacity: 0
            };
        },
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1
        },
        exit: (direction: number) => {
            return {
                zIndex: 0,
                x: direction < 0 ? 30 : -30,
                opacity: 0
            };
        }
    };

    return (
        <div className="space-y-4 md:space-y-6 animate-fade-in-up">
            {/* Header */}
            <div className="flex flex-col xl:flex-row justify-between xl:items-center bg-white dark:bg-slate-850 p-4 md:p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 gap-4">
                <div className="flex flex-col sm:flex-row justify-between items-center w-full xl:w-auto gap-4">
                    <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white flex-shrink-0">Calendário Financeiro</h2>
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl w-full sm:w-auto justify-between sm:justify-center border border-slate-200 dark:border-slate-700/50">
                        <button onClick={prevMonth} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-all hover:shadow-sm active:scale-95">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="px-4 min-w-[140px] text-center font-bold text-slate-700 dark:text-slate-200 capitalize text-sm md:text-base">
                            {displayMonth}
                        </div>
                        <button onClick={nextMonth} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-all hover:shadow-sm active:scale-95">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Filters & Summary */}
                <div className="flex flex-wrap items-center justify-between gap-4 w-full xl:w-auto">
                    {/* Summary Mini Cards */}
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-center">
                        <div className="bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-800/30 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(monthSummary.totalIncome)}</span>
                        </div>
                        <div className="bg-rose-50 dark:bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-100 dark:border-rose-800/30 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                            <span className="text-xs font-bold text-rose-700 dark:text-rose-400">{formatCurrency(monthSummary.totalExpense)}</span>
                        </div>
                    </div>

                    {/* Filter Dropdown */}
                    <div className="relative w-full sm:w-auto flex justify-end">
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
                            <button
                                onClick={() => setFilter('all')}
                                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'all' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                Todos
                            </button>
                            <button
                                onClick={() => setFilter('pending')}
                                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${filter === 'pending' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                Pendentes {monthSummary.totalPending > 0 && filter !== 'pending' && <span className="flex w-2 h-2 rounded-full bg-amber-500"></span>}
                            </button>
                            <button
                                onClick={() => setFilter('completed')}
                                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'completed' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                Pagos
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Calendar Grid Container with relative for absolute positioning of animation */}
            <div className="bg-white dark:bg-slate-850 p-2 sm:p-4 md:p-6 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-800 overflow-hidden relative">

                {/* Weekday Headers */}
                <div className="grid grid-cols-7 mb-2 md:mb-4 relative z-10">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, idx) => (
                        <div key={day} className={`text-center text-[10px] md:text-sm font-semibold uppercase tracking-wider py-1 md:py-2 rounded-t-lg
                             ${(idx === 0 || idx === 6) ? 'text-slate-400 bg-slate-50/50 dark:bg-slate-800/30' : 'text-slate-500'}
                        `}>
                            {day}
                        </div>
                    ))}
                </div>

                <AnimatePresence initial={false} custom={direction} mode="wait">
                    <motion.div
                        key={currentDate.toISOString()}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                            x: { type: "spring", stiffness: 300, damping: 30 },
                            opacity: { duration: 0.2 }
                        }}
                        className="grid grid-cols-7 gap-1 sm:gap-2 lg:gap-3 xl:gap-4 relative z-0"
                    >
                        {calendarDays.map((dateObj, index) => {
                            if (dateObj.day === null) {
                                return <div key={`empty-${index}`} className={`h-16 sm:h-24 lg:h-32 rounded-xl border border-transparent ${dateObj.isWeekend ? 'bg-slate-50/30 dark:bg-slate-800/10' : ''}`}></div>;
                            }

                            const day = dateObj.day;
                            const isWeekend = dateObj.isWeekend;

                            // Construct date string key
                            const year = currentDate.getFullYear();
                            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                            const dayStr = String(day).padStart(2, '0');
                            const dateKey = `${year}-${month}-${dayStr}`;

                            const data = transactionsByDate[dateKey];
                            const hasIncome = data?.income > 0;
                            const hasExpense = data?.expense > 0;
                            const hasPending = data?.pendingCount > 0;

                            // Heatmap Logic
                            let backgroundClass = isWeekend ? 'bg-slate-50/50 dark:bg-slate-800/20' : 'bg-white dark:bg-slate-800';
                            let borderClass = 'border-slate-100 dark:border-slate-700/50';

                            if (data) {
                                const balance = data.income - data.expense;
                                if (balance > 0) {
                                    backgroundClass = 'bg-emerald-50/30 dark:bg-emerald-900/10';
                                    borderClass = 'border-emerald-100 dark:border-emerald-800/30';
                                } else if (balance < 0) {
                                    backgroundClass = 'bg-rose-50/30 dark:bg-rose-900/10';
                                    borderClass = 'border-rose-100 dark:border-rose-800/30';
                                }
                            }

                            // Check if today
                            const todayStr = new Date().toISOString().split('T')[0];
                            const isToday = dateKey === todayStr;

                            if (isToday) {
                                backgroundClass = 'bg-primary-50/50 dark:bg-primary-900/10';
                                borderClass = 'border-primary-200 dark:border-primary-800 shadow-sm';
                            }

                            // Tooltip content
                            const tooltipContent = data?.items.slice(0, 5).map(t => `${t.type === 'income' ? '+' : '-'} ${t.description}`).join('\n') || '';
                            const extraCount = (data?.items.length || 0) > 5 ? `\n...e mais ${(data?.items.length || 0) - 5}` : '';

                            return (
                                <div
                                    key={day}
                                    onClick={() => handleDateClick(day)}
                                    title={tooltipContent ? tooltipContent + extraCount : undefined}
                                    className={`
                                        h-16 sm:h-24 lg:h-32 rounded-xl sm:rounded-2xl border p-1 sm:p-2 flex flex-col justify-between cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-95 sm:active:scale-100
                                        ${backgroundClass} ${borderClass} hover:border-slate-300 dark:hover:border-slate-500 group relative
                                    `}
                                >
                                    {/* Indicador de Pendência superior direito no mobile */}
                                    {hasPending && (
                                        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 sm:hidden"></div>
                                    )}

                                    <div className="flex justify-center sm:justify-between items-start">
                                        <span className={`
                                            text-[10px] sm:text-sm font-bold w-5 h-5 sm:w-7 sm:h-7 flex items-center justify-center rounded-full transition-colors
                                            ${isToday ? 'bg-primary-500 text-white shadow-md ring-2 ring-primary-500/30 ring-offset-1 dark:ring-offset-slate-800 animate-pulse' : 'text-slate-700 dark:text-slate-300 group-hover:bg-slate-100 dark:group-hover:bg-slate-700'}
                                            ${isWeekend && !isToday ? 'text-slate-400' : ''}
                                        `}>
                                            {day}
                                        </span>

                                        {/* Desktop Plus Icon on hover */}
                                        <div className="hidden lg:flex opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Plus className="w-4 h-4 text-slate-400" />
                                        </div>
                                    </div>

                                    {/* Indicators / Summary */}

                                    {/* MOBILE VIEW: Apenas bolinhas (Dots) */}
                                    <div className="flex sm:hidden justify-center gap-1 mt-1">
                                        {hasIncome && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                                        {hasExpense && <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>}
                                    </div>

                                    {/* DESKTOP VIEW: Pills */}
                                    <div className="hidden sm:flex flex-col gap-1 mt-1 overflow-hidden">
                                        {data?.items.slice(0, 3).map((item, i) => (
                                            <div key={item.id + '-' + i} className={`
                                                flex items-center gap-1 text-[10px] 2xl:text-xs font-medium px-1.5 py-0.5 rounded-md truncate shadow-sm border
                                                ${item.type === 'income'
                                                    ? 'text-emerald-700 bg-emerald-100/80 dark:bg-emerald-500/10 border-emerald-200/50 dark:border-emerald-900/30'
                                                    : 'text-rose-700 bg-rose-50/80 dark:bg-rose-500/10 border-rose-200/50 dark:border-rose-900/30'}
                                                ${item.status === 'pending' ? 'opacity-70' : ''}
                                                transition-colors
                                             `}>
                                                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'} ${item.status === 'pending' ? 'animate-pulse' : ''}`}></div>
                                                <span className="truncate flex-1">{item.description}</span>
                                                <span className="font-bold flex-shrink-0 ml-1">{formatCurrency(item.amount)}</span>
                                            </div>
                                        ))}
                                        {data?.items && data.items.length > 3 && (
                                            <div className="text-[10px] text-slate-400 text-center font-bold mt-0.5">
                                                +{data.items.length - 3} mais
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Modal for Details with Glassmorphism */}
            <AnimatePresence>
                {selectedDate && (
                    <div className="fixed inset-0 z-50 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-0 sm:p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity"
                                onClick={() => setSelectedDate(null)}
                            />

                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                className="relative w-full max-w-lg bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 h-[85vh] sm:h-auto max-h-[90vh] flex flex-col"
                            >
                                <div className="p-5 border-b border-slate-200/50 dark:border-slate-700/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30 flex-shrink-0">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                            Resumo do Dia
                                        </h3>
                                        <p className="text-sm font-medium text-slate-500">{formatDateDisplay(selectedDate)}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setShowQuickAdd(!showQuickAdd)}
                                            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold transition-all ${showQuickAdd ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300' : 'bg-primary-500 text-white hover:bg-primary-600 shadow-md shadow-primary-500/20'}`}
                                        >
                                            <Plus className={`w-4 h-4 transition-transform ${showQuickAdd ? 'rotate-45' : ''}`} />
                                            <span className="hidden sm:inline">{showQuickAdd ? 'Cancelar' : 'Adicionar'}</span>
                                        </button>
                                        <button onClick={() => setSelectedDate(null)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
                                            <X className="w-5 h-5 text-slate-500" />
                                        </button>
                                    </div>
                                </div>

                                {/* Quick Add Form */}
                                <AnimatePresence>
                                    {showQuickAdd && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="border-b border-slate-200/50 dark:border-slate-700/50 overflow-hidden bg-slate-50/50 dark:bg-slate-900/50"
                                        >
                                            <form onSubmit={handleQuickAdd} className="p-5 space-y-4">
                                                <div className="flex bg-slate-200/50 dark:bg-slate-800 p-1 rounded-xl">
                                                    <button
                                                        type="button"
                                                        onClick={() => setQuickType('expense')}
                                                        className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1 ${quickType === 'expense' ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                    >
                                                        <ArrowDownCircle className="w-4 h-4" /> Despesa
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setQuickType('income')}
                                                        className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1 ${quickType === 'income' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                    >
                                                        <ArrowUpCircle className="w-4 h-4" /> Receita
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Valor</label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                                                            <input
                                                                type="text"
                                                                inputMode="decimal"
                                                                required
                                                                value={quickAmount}
                                                                onChange={(e) => setQuickAmount(e.target.value.replace(/[^0-9,.]/g, ''))}
                                                                placeholder="0,00"
                                                                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 border text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Descrição</label>
                                                        <input
                                                            type="text"
                                                            required
                                                            ref={quickDescRef}
                                                            value={quickDesc}
                                                            onChange={(e) => setQuickDesc(e.target.value)}
                                                            placeholder="Ex: Padaria"
                                                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 border text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                                        />
                                                    </div>
                                                </div>
                                                <button
                                                    type="submit"
                                                    disabled={isSaving}
                                                    className="w-full py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm"
                                                >
                                                    {isSaving ? 'Salvando...' : 'Salvar no Calendário'}
                                                </button>
                                            </form>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="p-3 sm:p-5 overflow-y-auto custom-scrollbar flex-1">
                                    {selectedTransactions.length === 0 ? (
                                        <div className="text-center py-12 flex flex-col items-center">
                                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                                <CalendarViewIcon className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                            </div>
                                            <p className="text-slate-500 font-medium">Nenhuma movimentação neste dia.</p>
                                            {!showQuickAdd && (
                                                <button onClick={() => setShowQuickAdd(true)} className="mt-4 text-primary-500 font-bold hover:underline text-sm">
                                                    Adicionar nova agora
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {selectedTransactions.map(t => (
                                                <div key={t.id} className="flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-sm hover:shadow-md border border-slate-100 dark:border-slate-700/50 transition-all group">
                                                    <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                                                        <button
                                                            onClick={() => handleToggleStatus(t)}
                                                            className={`
                                                                p-2 sm:p-2.5 rounded-full transition-all flex-shrink-0 border-2
                                                                ${t.status === 'completed'
                                                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-400 shadow-sm'
                                                                    : 'bg-slate-50 border-slate-200 text-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-600 hover:border-emerald-300 hover:text-emerald-400'}
                                                            `}
                                                            title={t.status === 'completed' ? 'Marcar como pendente' : 'Marcar como pago'}
                                                        >
                                                            {t.status === 'completed' ? <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" /> : <Circle className="w-5 h-5 sm:w-6 sm:h-6" />}
                                                        </button>

                                                        <div className="truncate">
                                                            <div className="flex items-center gap-1.5 mb-1">
                                                                <p className={`font-bold text-sm sm:text-base truncate transition-colors ${t.status === 'completed' ? 'text-slate-800 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400'}`}>
                                                                    {t.description}
                                                                </p>
                                                                {t.isRecurring && (
                                                                    <div className="bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 p-1 rounded-md">
                                                                        <RefreshCw className="w-3 h-3" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] sm:text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                                                                {t.category}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex-shrink-0 ml-2">
                                                        <p className={`font-bold text-sm sm:text-lg tracking-tight ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} ${t.status === 'pending' ? 'opacity-80' : ''}`}>
                                                            {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                                                        </p>
                                                        <p className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${t.status === 'completed' ? 'text-emerald-500/70' : 'text-amber-500/80 animate-pulse'}`}>
                                                            {t.status === 'completed' ? 'Liquidado' : 'Pendente'}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 sm:p-5 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-200/50 dark:border-slate-700/50 flex justify-between tracking-tight font-bold flex-shrink-0 safe-area-bottom rounded-b-3xl">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Entradas</span>
                                        <span className="text-emerald-600 text-sm sm:text-base">{formatCurrency(transactionsByDate[selectedDate]?.income || 0)}</span>
                                    </div>
                                    <div className="flex flex-col text-right">
                                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Saídas</span>
                                        <span className="text-rose-600 text-sm sm:text-base">{formatCurrency(transactionsByDate[selectedDate]?.expense || 0)}</span>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Fallback icon definition since we removed lucide-react generic Calendar
const CalendarViewIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
        <line x1="16" x2="16" y1="2" y2="6" />
        <line x1="8" x2="8" y1="2" y2="6" />
        <line x1="3" x2="21" y1="10" y2="10" />
        <path d="M8 14h.01" />
        <path d="M12 14h.01" />
        <path d="M16 14h.01" />
        <path d="M8 18h.01" />
        <path d="M12 18h.01" />
        <path d="M16 18h.01" />
    </svg>
)

export default CalendarView;