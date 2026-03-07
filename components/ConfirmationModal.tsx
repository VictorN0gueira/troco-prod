import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    type = 'danger',
    isLoading = false
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'danger': return <Trash2 className="w-6 h-6 text-red-600" />;
            case 'warning': return <AlertTriangle className="w-6 h-6 text-amber-600" />;
            case 'info': return <Info className="w-6 h-6 text-blue-600" />;
        }
    };

    const getButtonColor = () => {
        switch (type) {
            case 'danger': return 'bg-red-500 hover:bg-red-600 focus:ring-red-500';
            case 'warning': return 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-500';
            case 'info': return 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500';
        }
    };

    const getBgColor = () => {
        switch (type) {
            case 'danger': return 'bg-red-100 dark:bg-red-900/30';
            case 'warning': return 'bg-amber-100 dark:bg-amber-900/30';
            case 'info': return 'bg-blue-100 dark:bg-blue-900/30';
        }
    };

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                    aria-labelledby="modal-title"
                    role="dialog"
                    aria-modal="true"
                >
                    <div
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
                        aria-hidden="true"
                        onClick={isLoading ? undefined : onClose}
                    />

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 w-full max-w-sm relative z-10 shadow-2xl text-center border border-slate-100 dark:border-slate-700"
                    >
                        <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6 ${getBgColor()}`}>
                            {getIcon()}
                        </div>

                        <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2" id="modal-title">
                            {title}
                        </h3>

                        <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm">
                            {message}
                        </p>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                disabled={isLoading}
                                onClick={onClose}
                                className="flex-1 py-3.5 bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 transition-all"
                            >
                                {cancelText}
                            </button>
                            <button
                                type="button"
                                disabled={isLoading}
                                onClick={onConfirm}
                                className={`flex-1 py-3.5 text-white rounded-xl font-bold active:scale-95 transition-all shadow-lg shadow-black/10 disabled:opacity-70 flex items-center justify-center gap-2 ${getButtonColor()}`}
                            >
                                {isLoading ? 'Processando...' : confirmText}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default ConfirmationModal;
