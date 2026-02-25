import React from 'react';
import { createPortal } from 'react-dom';
import { X, ShieldCheck, Sparkles, TrendingUp, CreditCard, BellRing } from 'lucide-react';

interface LimitPaywallModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description: string;
    userEmail?: string;
}

const LimitPaywallModal: React.FC<LimitPaywallModalProps> = ({ isOpen, onClose, title, description, userEmail }) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[200] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                    aria-hidden="true"
                    onClick={onClose}
                />

                <div className="relative transform overflow-hidden rounded-3xl bg-white dark:bg-slate-900 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-slate-200 dark:border-slate-800 animate-scale-in">

                    {/* Header */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 px-6 py-8 text-center sm:px-8">
                        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>

                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="relative z-10 flex flex-col items-center">
                            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-black/10 border border-white/20">
                                <Sparkles className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-2xl font-black text-white mb-2 tracking-tight" id="modal-title">
                                {title}
                            </h3>
                            <p className="text-emerald-50 font-medium">
                                {description}
                            </p>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="px-6 py-6 sm:px-8 mt-2">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-4 uppercase tracking-wider">
                            Benefícios do Super Trocô:
                        </h4>

                        <div className="space-y-4 mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg shrink-0">
                                    <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Cartões e Lançamentos Ilimitados</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Nunca mais se preocupe com limites no app.</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg shrink-0">
                                    <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Gestão de Investimentos</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Acompanhe sua carteira e cotações em tempo real.</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg shrink-0">
                                    <BellRing className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Notificações Inteligentes</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Receba alertas de vencimento via WhatsApp e Email.</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <a
                                href={userEmail ? `https://pay.kirvano.com/5e032963-787d-49de-b407-c3d1c4724c9d?email=${encodeURIComponent(userEmail)}` : "https://pay.kirvano.com/5e032963-787d-49de-b407-c3d1c4724c9d"}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={onClose}
                                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                            >
                                <ShieldCheck className="w-5 h-5" />
                                Fazer Upgrade Agora
                            </a>
                            <button
                                onClick={onClose}
                                className="w-full px-6 py-3 font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors"
                            >
                                Continuar na versão grátis
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default LimitPaywallModal;
