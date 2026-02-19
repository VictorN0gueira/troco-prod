import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, Info, X } from 'lucide-react';

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
        <div className="fixed inset-0 z-[100] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div
                    className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm transition-opacity"
                    aria-hidden="true"
                    onClick={isLoading ? undefined : onClose}
                />

                <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>

                <div className="relative inline-block transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-slate-100 dark:border-slate-700 animate-scale-in">
                    <div className="p-6">
                        <div className="flex items-start gap-4">
                            <div className={`flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full ${getBgColor()}`}>
                                {getIcon()}
                            </div>
                            <div className="flex-1 mt-1">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-6" id="modal-title">
                                    {title}
                                </h3>
                                <div className="mt-2">
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        {message}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                disabled={isLoading}
                                className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 flex flex-row-reverse gap-3">
                        <button
                            type="button"
                            disabled={isLoading}
                            onClick={onConfirm}
                            className={`w-full sm:w-auto inline-flex justify-center rounded-xl border border-transparent px-4 py-2 text-base font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm transition-colors ${getButtonColor()} ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {isLoading ? 'Processando...' : confirmText}
                        </button>
                        <button
                            type="button"
                            disabled={isLoading}
                            onClick={onClose}
                            className="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-base font-medium text-slate-700 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:text-sm transition-colors"
                        >
                            {cancelText}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ConfirmationModal;
