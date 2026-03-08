import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    ChevronDown,
    X
} from 'lucide-react';

interface CustomCalendarProps {
    value: string; // ISO Date YYYY-MM-DD or Month YYYY-MM
    onChange: (value: string) => void;
    mode?: 'date' | 'month';
    placeholder?: string;
    className?: string;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const CustomCalendar: React.FC<CustomCalendarProps> = ({
    value,
    onChange,
    mode = 'date',
    placeholder = 'Selecionar data',
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Popover position state
    const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
    const [isMobile, setIsMobile] = useState(false);

    // Internal view state
    const [viewDate, setViewDate] = useState(() => {
        if (value) {
            const isoStr = value.length === 7 ? value + '-01' : value;
            const d = new Date(isoStr + 'T12:00:00');
            return isNaN(d.getTime()) ? new Date() : d;
        }
        return new Date();
    });

    const [viewMode, setViewMode] = useState<'days' | 'months'>(mode === 'month' ? 'months' : 'days');

    // Sync viewMode when calendar opens
    useEffect(() => {
        if (isOpen) {
            setViewMode(mode === 'month' ? 'months' : 'days');
        }
    }, [isOpen, mode]);

    // Sync internal view when value changes externally
    useEffect(() => {
        if (value) {
            const isoStr = value.length === 7 ? value + '-01' : value;
            const newDate = new Date(isoStr + 'T12:00:00');
            if (!isNaN(newDate.getTime())) {
                setViewDate(newDate);
            }
        }
    }, [value]);

    const calculatePosition = useCallback(() => {
        if (!triggerRef.current) return;
        const mobileMode = window.innerWidth < 768;
        setIsMobile(mobileMode);

        if (mobileMode) {
            setPopoverStyle({
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 'min(360px, 90vw)',
                zIndex: 9999,
            });
            return;
        }

        const rect = triggerRef.current.getBoundingClientRect();
        const calendarWidth = 320;
        const calendarHeight = mode === 'month' ? 300 : 420; // Estimativa conservadora
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let left = rect.left;
        let top = rect.bottom + 8;

        if (left + calendarWidth > viewportWidth - 20) {
            left = viewportWidth - calendarWidth - 20;
        }
        if (left < 20) left = 20;

        if (top + calendarHeight > viewportHeight - 20) {
            top = rect.top - calendarHeight - 8;
        }
        if (top < 20) top = 20;

        setPopoverStyle({
            position: 'fixed',
            top,
            left,
            width: calendarWidth,
            zIndex: 9999,
        });
    }, [mode]);

    // Update position on mount and interactions
    useEffect(() => {
        if (isOpen) {
            calculatePosition();
            window.addEventListener('resize', calculatePosition);
            window.addEventListener('scroll', calculatePosition, true);
        }
        return () => {
            window.removeEventListener('resize', calculatePosition);
            window.removeEventListener('scroll', calculatePosition, true);
        };
    }, [isOpen, calculatePosition]);

    const handleToggle = () => {
        setIsOpen(!isOpen);
    };

    const displayValue = useMemo(() => {
        if (!value) return '';
        const isoStr = value.length === 7 ? value + '-01' : value;
        const date = new Date(isoStr + 'T12:00:00');
        if (isNaN(date.getTime())) return value;
        if (mode === 'month') {
            return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        }
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }, [value, mode]);

    const daysInMonth = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const totalDays = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        const days = [];
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = firstDay - 1; i >= 0; i--) {
            days.push({ day: prevMonthLastDay - i, currentMonth: false, date: new Date(year, month, 1 - (firstDay - i)) });
        }
        for (let i = 1; i <= totalDays; i++) {
            days.push({ day: i, currentMonth: true, date: new Date(year, month, i) });
        }
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({ day: i, currentMonth: false, date: new Date(year, month + 1, i) });
        }
        return days;
    }, [viewDate]);

    const handleDayClick = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        onChange(`${y}-${m}-${d}`);
        setIsOpen(false);
    };

    const handleMonthClick = (monthIndex: number) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(monthIndex);
        setViewDate(newDate);
        if (mode === 'month') {
            const y = newDate.getFullYear();
            const m = String(monthIndex + 1).padStart(2, '0');
            onChange(`${y}-${m}`);
            setIsOpen(false);
        } else {
            setViewMode('days');
        }
    };

    const changeYear = (offset: number) => {
        const newDate = new Date(viewDate);
        newDate.setFullYear(newDate.getFullYear() + offset);
        setViewDate(newDate);
    };

    const changeMonth = (offset: number) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setViewDate(newDate);
    };

    const popoverContent = (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-[2px] z-[9998]"
                    />

                    <motion.div
                        ref={popoverRef}
                        initial={isMobile ? { opacity: 0, scale: 0.9, y: 20, x: '-50%' } : { opacity: 0, scale: 0.96, y: -10 }}
                        animate={isMobile ? { opacity: 1, scale: 1, y: '-50%', x: '-50%' } : { opacity: 1, scale: 1, y: 0 }}
                        exit={isMobile ? { opacity: 0, scale: 0.9, y: 20, x: '-50%' } : { opacity: 0, scale: 0.96, y: -10 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        style={popoverStyle}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-5 select-none"
                    >
                        {/* Mobile Header (only for mobile modal feel) */}
                        {isMobile && (
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                                    {mode === 'month' ? 'Escolher Mês' : 'Escolher Data'}
                                </h3>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    <X className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>
                        )}

                        {/* Calendar Header */}
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => viewMode === 'days' ? changeMonth(-1) : changeYear(-1)}
                                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>

                            <button
                                type="button"
                                onClick={() => mode === 'date' && setViewMode(viewMode === 'days' ? 'months' : 'days')}
                                className={`text-base font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider
                                    ${mode === 'date' ? 'hover:text-primary-500 cursor-pointer' : 'cursor-default'}`}
                            >
                                {viewMode === 'days'
                                    ? `${MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}`
                                    : viewDate.getFullYear()
                                }
                            </button>

                            <button
                                type="button"
                                onClick={() => viewMode === 'days' ? changeMonth(1) : changeYear(1)}
                                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Days Grid */}
                        {viewMode === 'days' && (
                            <>
                                <div className="grid grid-cols-7 gap-1 mb-2">
                                    {WEEKDAYS.map(d => (
                                        <span key={d} className="text-[10px] font-black text-center text-slate-400 uppercase tracking-tight">
                                            {d}
                                        </span>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 gap-1.5">
                                    {daysInMonth.map((d, i) => {
                                        const dateStr = `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, '0')}-${String(d.date.getDate()).padStart(2, '0')}`;
                                        const isSelected = value === dateStr;
                                        const isToday = new Date().toDateString() === d.date.toDateString();
                                        return (
                                            <button
                                                type="button"
                                                key={i}
                                                onClick={() => handleDayClick(d.date)}
                                                className={`
                                                    aspect-square rounded-xl text-sm font-bold transition-all flex items-center justify-center relative
                                                    ${!d.currentMonth ? 'text-slate-300 dark:text-slate-700' : 'text-slate-700 dark:text-slate-200'}
                                                    ${isSelected
                                                        ? 'bg-primary-500 !text-white shadow-xl shadow-primary-500/30 ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-slate-900'
                                                        : d.currentMonth ? 'hover:bg-slate-100 dark:hover:bg-slate-800' : ''}
                                                `}
                                            >
                                                {d.day}
                                                {isToday && !isSelected && (
                                                    <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary-500 rounded-full" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        {/* Months Grid */}
                        {viewMode === 'months' && (
                            <div className="grid grid-cols-3 gap-3">
                                {MONTHS.map((m, i) => {
                                    const isSelected = mode === 'month'
                                        ? value === `${viewDate.getFullYear()}-${String(i + 1).padStart(2, '0')}`
                                        : viewDate.getMonth() === i;
                                    const isCurrentMonth = new Date().getMonth() === i && new Date().getFullYear() === viewDate.getFullYear();
                                    return (
                                        <button
                                            type="button"
                                            key={m}
                                            onClick={() => handleMonthClick(i)}
                                            className={`
                                                py-4 rounded-2xl text-sm font-black transition-all text-center
                                                ${isSelected
                                                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}
                                                ${isCurrentMonth && !isSelected ? 'ring-2 ring-inset ring-primary-500/50' : ''}
                                            `}
                                        >
                                            {m.slice(0, 3)}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Footer */}
                        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center gap-4">
                            <button
                                type="button"
                                onClick={() => { onChange(''); setIsOpen(false); }}
                                className="flex-1 py-3 text-xs font-black text-slate-400 hover:text-rose-500 uppercase tracking-widest transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl"
                            >
                                Limpar
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const now = new Date();
                                    if (mode === 'month') {
                                        onChange(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
                                    } else {
                                        onChange(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
                                    }
                                    setIsOpen(false);
                                }}
                                className="flex-1 py-3 text-xs font-black text-primary-500 hover:text-primary-600 uppercase tracking-widest transition-colors hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-xl"
                            >
                                Hoje
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );

    return (
        <div className={`relative ${className}`}>
            <button
                type="button"
                ref={triggerRef}
                onClick={handleToggle}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-transparent focus:ring-2 focus:ring-primary-500 text-slate-700 dark:text-slate-200 outline-none transition-all cursor-pointer group"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <CalendarIcon className="w-4 h-4 text-slate-400 group-hover:text-primary-500 transition-colors shrink-0" />
                    <span className={`text-sm truncate ${displayValue ? 'font-black text-slate-800 dark:text-white' : 'text-slate-400'}`}>
                        {displayValue || placeholder}
                    </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {typeof document !== 'undefined' && createPortal(popoverContent, document.body)}
        </div>
    );
};
