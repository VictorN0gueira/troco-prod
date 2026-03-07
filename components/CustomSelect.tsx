import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface CustomSelectOption {
    value: string;
    label: string;
    icon?: React.ReactNode;
}

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: (string | CustomSelectOption)[];
    disabled?: boolean;
    className?: string;
    placeholder?: string;
    size?: 'sm' | 'md';
}

export function CustomSelect({ value, onChange, options, disabled, className, placeholder = 'Selecione...', size = 'md' }: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const listboxRef = useRef<HTMLDivElement>(null);

    // Format options uniformly
    const formattedOptions: CustomSelectOption[] = options.map(opt =>
        typeof opt === 'string' ? { value: opt, label: opt } : opt
    );

    const selectedOption = formattedOptions.find(opt => opt.value === value) || (value ? { value, label: value } : null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Calculate position to prevent overflowing bottom of screen
    const [menuPosition, setMenuPosition] = useState<'bottom' | 'top'>('bottom');

    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;

            // If space below is less than typical menu height (240px) and space above is greater, open upwards
            if (spaceBelow < 240 && spaceAbove > spaceBelow) {
                setMenuPosition('top');
            } else {
                setMenuPosition('bottom');
            }
        }
    }, [isOpen]);

    return (
        <div className={`relative ${className || ''}`} ref={containerRef}>
            <button
                type="button"
                className={`w-full flex items-center justify-between border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer'} ${size === 'sm' ? 'px-2 py-1 rounded-lg text-xs font-semibold' : 'p-3.5 rounded-xl'}`}
                onClick={() => !disabled && setIsOpen(!isOpen)} disabled={disabled}
            >
                <div className="flex items-center gap-2 truncate">
                    {selectedOption?.icon && <span className="text-slate-500">{selectedOption.icon}</span>}
                    <span className="truncate">{selectedOption?.label || placeholder}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen && menuPosition === 'bottom' ? 'rotate-180' : ''} ${isOpen && menuPosition === 'top' ? 'rotate-0' : ''} ${!isOpen && menuPosition === 'top' ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        ref={listboxRef}
                        initial={{ opacity: 0, y: menuPosition === 'bottom' ? -10 : 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: menuPosition === 'bottom' ? -10 : 10 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute z-[100] w-full bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col ${menuPosition === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'}`}
                        style={{ maxHeight: '240px' }}
                    >
                        <div className="p-1.5 flex flex-col gap-0.5 overflow-y-auto min-h-0 custom-scrollbar">
                            {formattedOptions.map(option => (
                                <button
                                    key={option.value}
                                    type="button"
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors flex-shrink-0 ${value === option.value ? 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400 font-bold' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'}`}
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                    }}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        {option.icon && <span className="opacity-70">{option.icon}</span>}
                                        <span className="truncate">{option.label}</span>
                                    </div>
                                    {value === option.value && <Check className="w-4 h-4 shrink-0" />}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
