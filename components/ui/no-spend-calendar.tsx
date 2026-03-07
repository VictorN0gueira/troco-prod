import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Flame, Zap } from 'lucide-react';
import { Transaction } from '../../types';

interface NoSpendCalendarProps {
    transactions: Transaction[];
    compact?: boolean;
}

interface DayData {
    day: number;
    total: number;
    isToday: boolean;
    isFuture: boolean;
}

const getCellColor = (data: DayData): string => {
    if (data.isFuture) return 'bg-slate-100 dark:bg-slate-800/60 text-slate-300 dark:text-slate-600';
    if (data.total === 0 && data.isToday) return 'bg-emerald-500 ring-2 ring-emerald-300 ring-offset-1 dark:ring-offset-slate-900 text-white shadow-lg shadow-emerald-400/40';
    if (data.total > 0 && data.isToday) return 'bg-rose-500 ring-2 ring-rose-300 ring-offset-1 dark:ring-offset-slate-900 text-white shadow-lg shadow-rose-400/40';
    if (data.total === 0) return 'bg-emerald-100 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300';
    if (data.total < 100) return 'bg-amber-100 dark:bg-amber-500/25 text-amber-700 dark:text-amber-300';
    if (data.total < 500) return 'bg-orange-100 dark:bg-orange-500/25 text-orange-700 dark:text-orange-300';
    return 'bg-rose-100 dark:bg-rose-500/25 text-rose-700 dark:text-rose-300';
};

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const NoSpendCalendar: React.FC<NoSpendCalendarProps> = ({ transactions, compact = false }) => {
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const todayDay = now.getDate();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstWeekday = new Date(year, month, 1).getDay();

    const monthName = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const displayMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    const calendarData = useMemo((): DayData[] => {
        return Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayExpenses = transactions.filter(t => t.type === 'expense' && t.date === dateStr);
            const total = dayExpenses.reduce((acc, t) => acc + Number(t.amount), 0);
            return { day, total, isToday: day === todayDay, isFuture: day > todayDay };
        });
    }, [transactions, year, month, daysInMonth, todayDay]);

    const streak = useMemo(() => {
        let count = 0;
        for (let i = todayDay - 1; i >= 0; i--) {
            if (calendarData[i] && calendarData[i].total === 0) count++;
            else break;
        }
        return count;
    }, [calendarData, todayDay]);

    const noSpendDays = calendarData.filter(d => !d.isFuture && d.total === 0).length;
    const spendDays = todayDay - noSpendDays;
    const totalSpent = calendarData.filter(d => !d.isFuture).reduce((acc, d) => acc + d.total, 0);
    const avgPerDay = todayDay > 0 ? totalSpent / todayDay : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: 0.15 }}
            className="bg-white dark:bg-slate-850 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-none overflow-hidden"
        >
            {/* Two-column layout on desktop: left=info, right=calendar */}
            <div className={`flex flex-col lg:flex-row ${compact ? 'lg:flex-col' : ''}`}>

                {/* ── Left Panel: Title + Stats ── */}
                {!compact && (
                    <div className="lg:w-[280px] xl:w-[320px] flex-shrink-0 p-5 md:p-6 flex flex-col gap-5 lg:border-r border-slate-100 dark:border-slate-800">
                        {/* Title */}
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xl">📅</span>
                                <h3 className="text-base font-bold text-slate-800 dark:text-white">Calendário de Gastos</h3>
                            </div>
                            <p className="text-xs text-slate-400 dark:text-slate-500 pl-7">{displayMonth}</p>
                        </div>

                        {/* Streak Badge */}
                        {streak > 0 ? (
                            <motion.div
                                initial={{ scale: 0.85, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-400 rounded-2xl shadow-md shadow-orange-300/30 self-start w-full"
                            >
                                <Flame className="w-5 h-5 text-white flex-shrink-0" strokeWidth={2.5} />
                                <div>
                                    <p className="text-white font-bold text-sm leading-none">{streak} {streak === 1 ? 'dia' : 'dias'} de ofensiva!</p>
                                    <p className="text-orange-100 text-[10px] mt-0.5">Sem gastar nenhum centavo</p>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="flex items-center gap-2.5 px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl self-start w-full">
                                <Zap className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                <div>
                                    <p className="text-slate-600 dark:text-slate-300 font-semibold text-sm leading-none">Sem ofensiva</p>
                                    <p className="text-slate-400 text-[10px] mt-0.5">Registre um dia sem gastos!</p>
                                </div>
                            </div>
                        )}

                        {/* Stats cards */}
                        <div className="grid grid-cols-3 lg:grid-cols-1 gap-2">
                            <div className="flex lg:flex-row flex-col lg:items-center justify-between bg-emerald-50 dark:bg-emerald-500/10 rounded-xl px-3 py-2.5">
                                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Dias Livres</span>
                                <span className="text-lg lg:text-base font-bold text-emerald-700 dark:text-emerald-300">{noSpendDays}</span>
                            </div>
                            <div className="flex lg:flex-row flex-col lg:items-center justify-between bg-rose-50 dark:bg-rose-500/10 rounded-xl px-3 py-2.5">
                                <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">Dias c/ Gasto</span>
                                <span className="text-lg lg:text-base font-bold text-rose-700 dark:text-rose-300">{spendDays}</span>
                            </div>
                            <div className="flex lg:flex-row flex-col lg:items-center justify-between bg-blue-50 dark:bg-blue-500/10 rounded-xl px-3 py-2.5">
                                <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">Média/Dia</span>
                                <span className="text-xs lg:text-sm font-bold text-blue-700 dark:text-blue-300">{formatCurrency(avgPerDay)}</span>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="hidden lg:flex flex-col gap-1.5 mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                            {[
                                { color: 'bg-emerald-400', label: 'Sem gastos' },
                                { color: 'bg-amber-400', label: 'Até R$ 100' },
                                { color: 'bg-orange-400', label: 'Até R$ 500' },
                                { color: 'bg-rose-400', label: 'R$ 500+' },
                            ].map(({ color, label }) => (
                                <div key={label} className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-sm flex-shrink-0 ${color}`} />
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Right Panel: Calendar Grid ── */}
                <div className={`flex-1 ${compact ? 'p-2' : 'p-4 md:p-5'} overflow-x-auto`}>
                    {/* Weekday labels */}
                    <div className="grid grid-cols-7 mb-2 min-w-[280px]">
                        {WEEKDAY_LABELS.map(d => (
                            <p key={d} className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 py-1 tracking-wide">{d}</p>
                        ))}
                    </div>

                    {/* Day cells */}
                    <div className="grid grid-cols-7 gap-1.5 min-w-[280px]">
                        {/* Empty cells to offset the 1st day */}
                        {Array.from({ length: firstWeekday }).map((_, i) => (
                            <div key={`e-${i}`} />
                        ))}

                        {calendarData.map((data) => (
                            <motion.div
                                key={data.day}
                                whileHover={!data.isFuture ? { scale: 1.12 } : {}}
                                title={
                                    data.isFuture
                                        ? `Dia ${data.day}`
                                        : data.total === 0
                                            ? `Dia ${data.day} — 🟢 Sem gastos!`
                                            : `Dia ${data.day} — ${formatCurrency(data.total)}`
                                }
                                className={`
                  rounded-lg flex items-center justify-center
                  w-full aspect-square
                  text-[11px] sm:text-xs font-bold cursor-default
                  transition-all duration-150
                  ${getCellColor(data)}
                `}
                            >
                                {data.day}
                            </motion.div>
                        ))}
                    </div>

                    {/* Mobile legend */}
                    <div className="flex lg:hidden flex-wrap items-center gap-x-3 gap-y-1 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                        {[
                            { color: 'bg-emerald-400', label: 'Sem gastos' },
                            { color: 'bg-amber-400', label: 'Até R$ 100' },
                            { color: 'bg-orange-400', label: 'Até R$ 500' },
                            { color: 'bg-rose-400', label: 'R$ 500+' },
                        ].map(({ color, label }) => (
                            <div key={label} className="flex items-center gap-1.5">
                                <div className={`w-2.5 h-2.5 rounded-sm ${color}`} />
                                <span className="text-[10px] text-slate-500 dark:text-slate-400">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </motion.div>
    );
};

export default NoSpendCalendar;
