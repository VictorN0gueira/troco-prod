import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { ChevronLeft, ChevronRight, X, ArrowUpCircle, ArrowDownCircle, RefreshCw, CheckCircle2, Circle } from 'lucide-react';
import { parseDateFromDB, formatDateDisplay, getProjectedTransactions } from '../utils';

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

const CalendarView: React.FC<CalendarViewProps> = ({ transactions, onAddTransaction, onUpdateTransaction }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null); // YYYY-MM-DD

    // Navegação
    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const displayMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    // Agrupar transações por data com suporte a recorrência visual
    const transactionsByDate = useMemo(() => {
        const map: Record<string, { income: number, expense: number, items: Transaction[] }> = {};

        // Dados da visualização atual
        const viewYear = currentDate.getFullYear();
        const viewMonth = currentDate.getMonth();

        // Obtém lista unificada (Reais + Projetadas)
        const allTransactionsForView = getProjectedTransactions(transactions, viewMonth, viewYear);

        allTransactionsForView.forEach(t => {
            const dateStr = t.date; // Já vem no formato YYYY-MM-DD da função utilitária

            if (!map[dateStr]) {
                map[dateStr] = { income: 0, expense: 0, items: [] };
            }

            // Evita duplicatas de ID (segurança extra)
            if (!map[dateStr].items.some(i => i.id === t.id)) {
                map[dateStr].items.push(t);
                if (t.type === 'income') {
                    map[dateStr].income += Number(t.amount);
                } else {
                    map[dateStr].expense += Number(t.amount);
                }
            }
        });

        return map;
    }, [transactions, currentDate]);

    // Geração da Grade do Calendário
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);

    const calendarDays = [];
    // Padding para o mês anterior
    for (let i = 0; i < firstDay; i++) {
        calendarDays.push(null);
    }
    // Dias do mês atual
    for (let i = 1; i <= daysInMonth; i++) {
        calendarDays.push(i);
    }

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    // Handle Date Click
    const handleDateClick = (day: number) => {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const dateStr = `${year}-${month}-${dayStr}`;
        setSelectedDate(dateStr);
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

    return (
        <div className="space-y-4 md:space-y-6 animate-fade-in-up">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-slate-850 p-4 md:p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 gap-4">
                <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">Calendário Financeiro</h2>
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl w-full sm:w-auto justify-between sm:justify-start">
                    <button onClick={prevMonth} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors shadow-sm">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="px-4 min-w-[140px] text-center font-bold text-slate-700 dark:text-slate-200 capitalize text-sm md:text-base">
                        {displayMonth}
                    </div>
                    <button onClick={nextMonth} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors shadow-sm">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="bg-white dark:bg-slate-850 p-3 md:p-6 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-800">
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 mb-2 md:mb-4">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                        <div key={day} className="text-center text-[10px] md:text-sm font-semibold text-slate-400 uppercase tracking-wider py-1 md:py-2">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days */}
                {/* Ajuste no gap para mobile (gap-1) e desktop (gap-4) */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2 lg:gap-4">
                    {calendarDays.map((day, index) => {
                        if (day === null) {
                            return <div key={`empty-${index}`} className="h-16 sm:h-24 lg:h-32 rounded-xl bg-slate-50/50 dark:bg-slate-900/20 border border-transparent"></div>;
                        }

                        // Construct date string key
                        const year = currentDate.getFullYear();
                        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                        const dayStr = String(day).padStart(2, '0');
                        const dateKey = `${year}-${month}-${dayStr}`;

                        const data = transactionsByDate[dateKey];
                        const hasIncome = data?.income > 0;
                        const hasExpense = data?.expense > 0;

                        // Check if today
                        const todayStr = new Date().toISOString().split('T')[0];
                        const isToday = dateKey === todayStr;

                        return (
                            <div
                                key={day}
                                onClick={() => handleDateClick(day)}
                                className={`
                            h-16 sm:h-24 lg:h-32 rounded-xl sm:rounded-2xl border p-1 sm:p-2 flex flex-col justify-between cursor-pointer transition-all hover:shadow-md active:scale-95 sm:active:scale-100 sm:hover:scale-[1.02]
                            ${isToday
                                        ? 'bg-primary-50 dark:bg-primary-900/10 border-primary-200 dark:border-primary-800'
                                        : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}
                        `}
                            >
                                <div className="flex justify-center sm:justify-between items-start">
                                    <span className={`
                                text-[10px] sm:text-sm font-bold w-5 h-5 sm:w-7 sm:h-7 flex items-center justify-center rounded-full
                                ${isToday ? 'bg-primary-500 text-white' : 'text-slate-700 dark:text-slate-300'}
                             `}>
                                        {day}
                                    </span>
                                </div>

                                {/* Indicators / Summary */}

                                {/* MOBILE VIEW: Apenas bolinhas (Dots) */}
                                <div className="flex sm:hidden justify-center gap-1 mt-1">
                                    {hasIncome && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                                    {hasExpense && <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>}
                                </div>

                                {/* DESKTOP VIEW: Pills com Valores */}
                                <div className="hidden sm:flex flex-col gap-1 mt-1">
                                    {hasIncome && (
                                        <div className="flex items-center gap-1 text-[10px] lg:text-xs font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-md truncate shadow-sm border border-emerald-100 dark:border-emerald-900/30">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 animate-pulse"></div>
                                            <span className="truncate">{formatCurrency(data.income)}</span>
                                        </div>
                                    )}
                                    {hasExpense && (
                                        <div className="flex items-center gap-1 text-[10px] lg:text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-1.5 py-0.5 rounded-md truncate shadow-sm border border-rose-100 dark:border-rose-900/30">
                                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0"></div>
                                            <span className="truncate">{formatCurrency(data.expense)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Modal for Details */}
            {selectedDate && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedDate(null)} />
                        <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl animate-scale-in overflow-hidden border border-slate-100 dark:border-slate-700 h-[80vh] sm:h-auto flex flex-col">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 flex-shrink-0">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Detalhes do Dia</h3>
                                    <p className="text-sm text-slate-500">{formatDateDisplay(selectedDate)}</p>
                                </div>
                                <button onClick={() => setSelectedDate(null)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                    <X className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>
                            <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
                                {selectedTransactions.length === 0 ? (
                                    <div className="text-center py-8 text-slate-500">
                                        Nenhuma transação neste dia.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {selectedTransactions.map(t => (
                                            <div key={t.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-slate-100 dark:border-slate-700/50 transition-colors group">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <button
                                                        onClick={() => handleToggleStatus(t)}
                                                        className={`
                                                    p-2 rounded-full transition-colors
                                                    ${t.status === 'completed'
                                                                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                                : 'bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600 hover:bg-emerald-50 hover:text-emerald-500'}
                                                `}
                                                    >
                                                        {t.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                                    </button>

                                                    <div className="truncate">
                                                        <div className="flex items-center gap-1">
                                                            <p className="font-bold text-slate-800 dark:text-white truncate">{t.description}</p>
                                                            {t.isRecurring && <RefreshCw className="w-3 h-3 text-slate-400" />}
                                                        </div>
                                                        <p className="text-xs text-slate-500">{t.category}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right flex-shrink-0 ml-2">
                                                    <p className={`font-bold ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                        {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400">{t.status === 'completed' ? 'Pago' : 'Pendente'}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex justify-between text-sm font-bold flex-shrink-0 safe-area-bottom">
                                <div className="text-emerald-600">Entradas: {formatCurrency(transactionsByDate[selectedDate]?.income || 0)}</div>
                                <div className="text-rose-600">Saídas: {formatCurrency(transactionsByDate[selectedDate]?.expense || 0)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarView;