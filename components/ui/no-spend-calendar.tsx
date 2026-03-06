import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Flame, Zap, CheckCircle } from 'lucide-react';
import { Transaction } from '../../types';

interface NoSpendCalendarProps {
    transactions: Transaction[];
}

interface DayData {
    day: number;
    total: number;
    isToday: boolean;
    isFuture: boolean;
}

const getColorClass = (data: DayData): string => {
    if (data.isFuture) return 'bg-slate-100 dark:bg-slate-800 border-transparent';
    if (data.isToday && data.total === 0) return 'bg-emerald-500 ring-2 ring-emerald-400 ring-offset-1 border-transparent shadow-lg shadow-emerald-500/40';
    if (data.isToday) return 'bg-rose-500 ring-2 ring-rose-400 ring-offset-1 border-transparent shadow-lg shadow-rose-500/40';
    if (data.total === 0) return 'bg-emerald-400 dark:bg-emerald-500 border-transparent shadow-sm shadow-emerald-400/30';
    if (data.total < 100) return 'bg-yellow-400 dark:bg-yellow-500 border-transparent shadow-sm shadow-yellow-400/30';
    if (data.total < 500) return 'bg-orange-400 dark:bg-orange-500 border-transparent shadow-sm shadow-orange-400/30';
    return 'bg-rose-500 dark:bg-rose-600 border-transparent shadow-sm shadow-rose-400/30';
};

const getTooltip = (data: DayData, formatCurrency: (v: number) => string): string => {
    if (data.isFuture) return `Dia ${data.day} — Futuro`;
    if (data.total === 0) return `Dia ${data.day} — 🟢 Sem gastos!`;
    return `Dia ${data.day} — ${formatCurrency(data.total)} em gastos`;
};

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const NoSpendCalendar: React.FC<NoSpendCalendarProps> = ({ transactions }) => {
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const todayDay = now.getDate();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstWeekday = new Date(year, month, 1).getDay(); // 0=Dom, 6=Sáb

    const monthName = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const displayMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    const calendarData = useMemo((): DayData[] => {
        return Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const paddedMonth = String(month + 1).padStart(2, '0');
            const paddedDay = String(day).padStart(2, '0');
            const dateStr = `${year}-${paddedMonth}-${paddedDay}`;

            const dayExpenses = transactions.filter(t => t.type === 'expense' && t.date === dateStr);
            const total = dayExpenses.reduce((acc, t) => acc + Number(t.amount), 0);

            return {
                day,
                total,
                isToday: day === todayDay,
                isFuture: day > todayDay,
            };
        });
    }, [transactions, year, month, daysInMonth, todayDay]);

    const streak = useMemo(() => {
        let count = 0;
        for (let i = todayDay - 1; i >= 0; i--) {
            const d = calendarData[i];
            if (!d) break;
            if (d.total === 0 && !d.isFuture) count++;
            else break;
        }
        return count;
    }, [calendarData, todayDay]);

    const noSpendDays = calendarData.filter(d => !d.isFuture && d.total === 0).length;
    const totalSpent = calendarData.filter(d => !d.isFuture).reduce((acc, d) => acc + d.total, 0);
    const daysElapsed = todayDay;
    const avgPerDay = daysElapsed > 0 ? totalSpent / daysElapsed : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
            className="bg-white dark:bg-slate-850 rounded-3xl p-5 md:p-6 shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800"
        >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <span>📅</span> Calendário de Gastos
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{displayMonth}</p>
                </div>

                {/* Streak Badge */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    {streak > 0 && (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-400 rounded-full shadow-md shadow-orange-400/30"
                        >
                            <Flame className="w-4 h-4 text-white" strokeWidth={2.5} />
                            <span className="text-white text-xs font-bold">{streak} dias de ofensiva!</span>
                        </motion.div>
                    )}
                    {streak === 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                            <Zap className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Sem ofensiva ativa</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl px-3 py-2.5 text-center">
                    <p className="text-emerald-600 dark:text-emerald-400 text-lg font-bold">{noSpendDays}</p>
                    <p className="text-emerald-700 dark:text-emerald-500 text-[10px] font-semibold">Dias Livres</p>
                </div>
                <div className="bg-rose-50 dark:bg-rose-500/10 rounded-2xl px-3 py-2.5 text-center">
                    <p className="text-rose-600 dark:text-rose-400 text-lg font-bold">{daysElapsed - noSpendDays}</p>
                    <p className="text-rose-700 dark:text-rose-500 text-[10px] font-semibold">Dias com Gasto</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-500/10 rounded-2xl px-3 py-2.5 text-center">
                    <p className="text-blue-600 dark:text-blue-400 text-[13px] font-bold leading-tight">{formatCurrency(avgPerDay)}</p>
                    <p className="text-blue-700 dark:text-blue-500 text-[10px] font-semibold">Média/Dia</p>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="overflow-x-auto -mx-1 px-1">
                {/* Week day labels */}
                <div className="grid grid-cols-7 mb-1 min-w-[280px]">
                    {WEEKDAY_LABELS.map(d => (
                        <p key={d} className="text-center text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 py-1">{d}</p>
                    ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7 gap-1 min-w-[280px]">
                    {/* Empty cells before the 1st */}
                    {Array.from({ length: firstWeekday }).map((_, i) => (
                        <div key={`empty-${i}`} className="aspect-square" />
                    ))}

                    {/* Day cells */}
                    {calendarData.map((data) => (
                        <motion.div
                            key={data.day}
                            initial={false}
                            whileHover={!data.isFuture ? { scale: 1.15, zIndex: 10 } : {}}
                            title={getTooltip(data, formatCurrency)}
                            className={`
                aspect-square rounded-md sm:rounded-lg border relative flex items-center justify-center cursor-default transition-all duration-200
                ${getColorClass(data)}
              `}
                        >
                            <span className={`text-[9px] sm:text-[10px] font-bold select-none
                ${data.isFuture
                                    ? 'text-slate-300 dark:text-slate-600'
                                    : data.total === 0
                                        ? 'text-emerald-900 dark:text-emerald-100'
                                        : 'text-white'
                                }
              `}>
                                {data.day}
                            </span>
                            {/* Today indicator dot */}
                            {data.isToday && (
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-white rounded-full border border-slate-200 dark:border-slate-700 z-10" />
                            )}
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4">
                {[
                    { color: 'bg-emerald-400', label: 'Sem gastos' },
                    { color: 'bg-yellow-400', label: 'Até R$ 100' },
                    { color: 'bg-orange-400', label: 'Até R$ 500' },
                    { color: 'bg-rose-500', label: 'R$ 500+' },
                ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-1.5">
                        <div className={`w-2.5 h-2.5 rounded-sm ${color}`} />
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">{label}</span>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

export default NoSpendCalendar;
