import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
    const [menuPosition, setMenuPosition] = useState<'bottom' | 'top'>('bottom');
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

    // Format options uniformly
    const formattedOptions: CustomSelectOption[] = options.map(opt =>
        typeof opt === 'string' ? { value: opt, label: opt } : opt
    );

    const selectedOption = formattedOptions.find(opt => opt.value === value) || (value ? { value, label: value } : null);

    const updatePosition = useCallback(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const menuHeight = Math.min(240, formattedOptions.length * 45 + 10);

            if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
                setMenuPosition('top');
                setCoords({
                    top: rect.top - 8,
                    left: rect.left,
                    width: rect.width
                });
            } else {
                setMenuPosition('bottom');
                setCoords({
                    top: rect.bottom + 8,
                    left: rect.left,
                    width: rect.width
                });
            }
        }
    }, [isOpen, formattedOptions.length]);

    useEffect(() => {
        if (isOpen) {
            updatePosition();
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
            
            const handleClickOutside = (event: MouseEvent) => {
                if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                    const portalDropdown = document.getElementById('custom-select-portal');
                    if (portalDropdown && portalDropdown.contains(event.target as Node)) return;
                    setIsOpen(false);
                }
            };

            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                window.removeEventListener('scroll', updatePosition, true);
                window.removeEventListener('resize', updatePosition);
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [isOpen, updatePosition]);

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

            {isOpen && createPortal(
                <div 
                    id="custom-select-portal"
                    className="fixed inset-0 z-[1000] pointer-events-none"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setIsOpen(false);
                    }}
                >
                    <div className="absolute inset-0 pointer-events-auto" onClick={() => setIsOpen(false)} />
                    <AnimatePresence>
                        <motion.div
                            initial={{ opacity: 0, y: menuPosition === 'bottom' ? -10 : 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: menuPosition === 'bottom' ? -10 : 10, scale: 0.95 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className={`fixed z-[1001] bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col pointer-events-auto`}
                            style={{ 
                                top: menuPosition === 'bottom' ? coords.top : 'auto',
                                bottom: menuPosition === 'top' ? (window.innerHeight - coords.top) : 'auto',
                                left: coords.left,
                                width: coords.width,
                                maxHeight: '240px'
                            }}
                        >
                            <div className="p-1.5 flex flex-col gap-0.5 overflow-y-auto min-h-0 custom-scrollbar">
                                {formattedOptions.map(option => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors flex-shrink-0 ${value === option.value ? 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400 font-bold' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'}`}
                                        onClick={() => {
                                            onChange(option.value);
                                            setIsOpen(false);
                                        }}
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            {option.icon && <span className="opacity-70">{option.icon}</span>}
                                            <span className="truncate text-sm">{option.label}</span>
                                        </div>
                                        {value === option.value && <Check className="w-4 h-4 shrink-0" />}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>,
                document.body
            )}
        </div>
    );
}
