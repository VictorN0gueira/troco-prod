import React from 'react';
import { Sparkles, TrendingUp, BellRing, Lock, ShieldCheck, Newspaper, CreditCard } from 'lucide-react';

interface SuperPaywallProps {
    feature: 'Investimentos' | 'Insights de Mercado' | 'Notificações Premium' | 'Cartões Ilimitados' | 'Lançamentos Ilimitados' | 'Relatórios Avançados';
    userEmail?: string;
}

const SuperPaywall: React.FC<SuperPaywallProps> = ({ feature, userEmail }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-fade-in-up">
            {/* Icon Stack */}
            <div className="relative mb-8 group">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
                <div className="relative w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-500/30 transform group-hover:scale-105 transition-transform duration-500">
                    <Lock className="w-10 h-10 text-white" />
                    <div className="absolute -top-3 -right-3 w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center border-4 border-slate-50 dark:border-slate-900 shadow-lg">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                    </div>
                </div>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-white mb-4 tracking-tight">
                Desbloqueie {feature === 'Investimentos' ? 'os' : feature === 'Insights de Mercado' ? 'os' : 'as'} <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-emerald-600">
                    {feature}
                </span>
            </h2>

            <p className="text-slate-500 dark:text-slate-400 max-w-lg mb-10 text-lg leading-relaxed">
                A versão base do Trocô te leva longe, mas o <strong>Super Trocô</strong> te leva ao topo. Assine hoje mesmo e tenha o controle absoluto da sua vida financeira.
            </p>

            {/* Benefits Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl w-full text-left mb-10">
                <div className="flex items-start gap-3 p-4 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50">
                    <div className="p-2 bg-amber-50 dark:bg-amber-500/10 rounded-xl">
                        <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-white text-sm">Carteira de Investimentos</h4>
                        <p className="text-xs text-slate-500 mt-1">Gestão completa e cotações da B3 e Criptomoedas.</p>
                    </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
                        <Newspaper className="w-5 h-5 text-emerald-600 shadow-emerald-500/20" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-white text-sm">Insights de Mercado</h4>
                        <p className="text-xs text-slate-500 mt-1">Notícias financeiras dedicadas em tempo real.</p>
                    </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50">
                    <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
                        <BellRing className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-white text-sm">Notificações Inteligentes</h4>
                        <p className="text-xs text-slate-500 mt-1">Avisos via WhatsApp e Email sobre fatura e alertas.</p>
                    </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50">
                    <div className="p-2 bg-purple-50 dark:bg-purple-500/10 rounded-xl">
                        <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-white text-sm">Tudo Ilimitado</h4>
                        <p className="text-xs text-slate-500 mt-1">Chega de barreiras. Lançamentos e cartões infinitos.</p>
                    </div>
                </div>
            </div>

            <a
                href={userEmail ? `https://pay.kirvano.com/5e032963-787d-49de-b407-c3d1c4724c9d?email=${encodeURIComponent(userEmail)}` : "https://pay.kirvano.com/5e032963-787d-49de-b407-c3d1c4724c9d"}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-300 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/30 overflow-hidden"
            >
                <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black" />
                <span className="relative flex items-center gap-2 text-lg">
                    <ShieldCheck className="w-5 h-5" />
                    Assinar o Super Trocô
                </span>
            </a>
            <p className="mt-4 text-xs font-medium text-slate-400 uppercase tracking-widest">Cancele quando quiser</p>
        </div>
    );
};

export default SuperPaywall;
