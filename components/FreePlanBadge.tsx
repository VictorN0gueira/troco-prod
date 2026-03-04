import React from 'react';
import { Sparkles, Zap } from 'lucide-react';

interface FreePlanBadgeProps {
    /** Clique redireciona para upgrade — ex: abrir modal pro ou link de pagamento */
    onClick?: () => void;
    /** Compact: para sidebar / Full: para local de destaque */
    variant?: 'compact' | 'full';
}

/**
 * Selo visual indicando plano gratuito.
 * Exibido apenas para usuários sem plano ativo.
 */
export const FreePlanBadge: React.FC<FreePlanBadgeProps> = ({
    onClick,
    variant = 'compact'
}) => {
    if (variant === 'full') {
        return (
            <button
                onClick={onClick}
                className="w-full group relative overflow-hidden rounded-2xl p-4 text-left transition-all duration-300 hover:scale-[1.02] focus:outline-none"
                style={{
                    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    boxShadow: '0 0 20px rgba(99, 102, 241, 0.15)'
                }}
            >
                {/* Glow animado de fundo */}
                <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                        background: 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.15) 0%, transparent 70%)'
                    }}
                />

                {/* Estrelinhas decorativas */}
                <div className="absolute top-2 right-3 text-indigo-400/40 animate-pulse">
                    <Sparkles className="w-4 h-4" />
                </div>
                <div className="absolute bottom-2 right-8 text-violet-400/30 animate-pulse delay-500">
                    <Sparkles className="w-3 h-3" />
                </div>

                <div className="relative z-10 flex items-center gap-3">
                    {/* Ícone */}
                    <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                    >
                        <Zap className="w-4 h-4 text-white fill-white" />
                    </div>

                    {/* Texto */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                                Plano Gratuito
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wide">
                                FREE
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-tight">
                            Assine o Super Trocô ✨
                        </p>
                    </div>

                    {/* Arrow */}
                    <div className="text-indigo-400 group-hover:translate-x-0.5 transition-transform">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </div>
            </button>
        );
    }

    // Variant: compact (para header/topbar)
    return (
        <button
            onClick={onClick}
            className="group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all duration-200 hover:scale-105 focus:outline-none"
            style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                color: '#818cf8',
                boxShadow: '0 0 12px rgba(99, 102, 241, 0.2)'
            }}
            title="Você está no plano gratuito. Clique para ver planos."
        >
            <Zap className="w-3 h-3 fill-current" />
            <span>Free</span>
        </button>
    );
};

// ─────────────────────────────────────────────────────────────────────────────

interface UsageMeterProps {
    /** Quantidade atual usada */
    current: number;
    /** Limite máximo do plano free */
    max: number;
    /** Label descritivo (ex: "transações este mês") */
    label: string;
    /** Tamanho do componente */
    size?: 'sm' | 'md';
}

/**
 * Indicador de uso X/Y com barra de progresso colorida por nível de preenchimento.
 * Exibido apenas quando o usuário está no plano free.
 */
export const UsageMeter: React.FC<UsageMeterProps> = ({
    current,
    max,
    label,
    size = 'md'
}) => {
    const pct = Math.min((current / max) * 100, 100);

    // Cores adaptadas ao nível de uso
    const getColor = () => {
        if (pct >= 100) return { bar: '#ef4444', text: 'text-rose-500', bg: 'bg-rose-500' };
        if (pct >= 80) return { bar: '#f59e0b', text: 'text-amber-500', bg: 'bg-amber-500' };
        return { bar: '#10b981', text: 'text-emerald-500', bg: 'bg-emerald-500' };
    };

    const color = getColor();
    const isCompact = size === 'sm';

    return (
        <div className={`flex items-center gap-2 ${isCompact ? 'text-xs' : 'text-sm'}`}>
            {/* Barra de progresso */}
            <div className={`flex-1 bg-slate-100 dark:bg-slate-700/60 rounded-full overflow-hidden ${isCompact ? 'h-1.5' : 'h-2'}`}>
                <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${pct}%`, backgroundColor: color.bar }}
                />
            </div>

            {/* X/Y */}
            <span className={`font-bold tabular-nums whitespace-nowrap ${color.text}`}>
                {current}<span className="text-slate-400 font-normal">/{max}</span>
            </span>

            {/* Label (oculto em sm) */}
            {!isCompact && (
                <span className="text-slate-400 text-xs hidden sm:inline">{label}</span>
            )}
        </div>
    );
};
