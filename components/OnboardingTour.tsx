import React, { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step, TooltipRenderProps } from 'react-joyride';
import { X, ChevronRight } from 'lucide-react';

interface OnboardingTourProps {
    userId: number;
    user?: any;
    isTermsAccepted?: boolean;
}

const TOUR_STEPS: Step[] = [
    {
        target: 'body',
        placement: 'center',
        content: (
            <div className="text-center space-y-3 p-2">
                <div className="flex justify-center mb-2">
                    <span className="text-4xl">✨</span>
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Bem-vindo ao Trocô! 🎉</h2>
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                    Ficamos felizes em ter você aqui. Preparamos um tour rápido para você conhecer as principais funcionalidades e começar a cuidar do seu dinheiro do jeito certo!
                </p>
            </div>
        ),
        disableBeacon: true,
    },
    {
        target: '#tour-dashboard-balance',
        placement: 'bottom',
        content: (
            <div>
                <h3 className="font-bold text-slate-800 dark:text-white mb-2">Seu Painel de Controle</h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm">
                    Este é o seu saldo principal. Ele calcula automaticamente o que você já recebeu e o que já pagou no mês atual, te dando uma visão clara da sua saúde financeira.
                </p>
            </div>
        ),
    },
    {
        target: '#tour-nav-transactions',
        placement: 'right',
        content: (
            <div>
                <h3 className="font-bold text-slate-800 dark:text-white mb-2">Transações Diárias</h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm">
                    Acesse esta aba para registrar e gerenciar todas as suas receitas e despesas. É o coração do controle do seu fluxo de caixa diário.
                </p>
            </div>
        ),
    },
    {
        target: '#tour-nav-cards',
        placement: 'right',
        content: (
            <div>
                <h3 className="font-bold text-slate-800 dark:text-white mb-2">Cartões de Crédito</h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm">
                    Crie e gerencie seus cartões aqui. O Trocô permite lançar despesas diretamente na fatura de um cartão e calcula seu limite disponível em tempo real!
                </p>
            </div>
        ),
    },
    {
        target: '#tour-nav-goals',
        placement: 'right',
        content: (
            <div>
                <h3 className="font-bold text-slate-800 dark:text-white mb-2">Metas Financeiras</h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm">
                    Quer viajar ou comprar um carro? Crie e acompanhe metas, e destine dinheiro para elas até atingir o seu objetivo.
                </p>
            </div>
        ),
    },
    {
        target: '#tour-nav-subscriptions',
        placement: 'right',
        content: (
            <div>
                <h3 className="font-bold text-slate-800 dark:text-white mb-2">Gestor de Assinaturas 🔄</h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm">
                    Visualize todas as suas assinaturas recorrentes em um painel dedicado. Veja quanto você gasta mensalmente e anualmente — e descubra o que pode cancelar.
                </p>
            </div>
        ),
    },
    {
        target: '#tour-nav-investments',
        placement: 'right',
        content: (
            <div>
                <h3 className="font-bold text-slate-800 dark:text-white mb-2">Investimentos</h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm">
                    Acompanhe sua carteira de investimentos (Ações, FIIs, Crypto, etc) registrando suas compras e rentabilidades de um jeito simples.
                </p>
            </div>
        ),
    },
    {
        target: '#tour-privacy-toggle',
        placement: 'bottom',
        content: (
            <div>
                <h3 className="font-bold text-slate-800 dark:text-white mb-2">Modo Privacidade</h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm">
                    Está em público? Clique aqui para embaçar e ocultar todos os seus valores sensíveis instantaneamente.
                </p>
            </div>
        ),
    },
    {
        target: '#tour-theme-toggle',
        placement: 'bottom',
        content: (
            <div>
                <h3 className="font-bold text-slate-800 dark:text-white mb-2">Modo Escuro</h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm">
                    Você prefere o lado sombrio? Alterne entre o tema claro e o escuro com apenas um clique.
                </p>
            </div>
        ),
    },
    {
        target: 'body',
        placement: 'center',
        content: (
            <div className="text-center space-y-3">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Tudo pronto! 🚀</h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm">
                    Agora é com você. Explore a plataforma, arraste os cartões do dashboard para personalizar, e cuide bem do seu dinheiro! Se precisar, a IA no WhatsApp está à disposição.
                </p>
            </div>
        ),
    }
];

const CustomTooltip = ({
    index,
    step,
    backProps,
    closeProps,
    primaryProps,
    tooltipProps,
    isLastStep,
    size,
}: TooltipRenderProps) => {
    const isFirstStep = index === 0;
    return (
        <div
            {...tooltipProps}
            className="flex flex-col max-w-[320px] md:max-w-[400px] bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200/50 dark:border-slate-800/50 animate-in fade-in zoom-in duration-500"
            style={{
                zIndex: 10001,
                backdropFilter: 'blur(20px)',
                backgroundColor: 'rgba(255, 255, 255, 0.92)'
            }}
        >
            <div className={`p-8 md:p-10 ${isLastStep ? 'bg-gradient-to-br from-primary-500/10 to-emerald-500/10' : ''}`}>
                <div className="flex justify-between items-start mb-6">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-500 mb-1.5">Passo {index + 1} de {size}</span>
                        <div className="h-1 w-12 bg-primary-500 rounded-full" />
                    </div>
                    <button
                        onClick={(e) => closeProps.onClick(e as any)}
                        className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all text-slate-400 dark:text-slate-500 active:scale-90"
                        title="Pular Tour"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="relative text-slate-700 dark:text-slate-200">
                    {step.content}
                </div>

                <div className="mt-10 flex items-center justify-between gap-6">
                    <div className="flex gap-2">
                        {Array.from({ length: size }).map((_, i) => (
                            <div
                                key={i}
                                className={`h-1.5 rounded-full transition-all duration-500 ${i === index ? 'w-8 bg-primary-500' : 'w-1.5 bg-slate-200 dark:bg-slate-800'}`}
                            />
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        {!isFirstStep && (
                            <button
                                {...backProps}
                                className="px-4 py-2.5 text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            >
                                Voltar
                            </button>
                        )}
                        <button
                            {...primaryProps}
                            className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-900/20 dark:shadow-white/10"
                        >
                            {isLastStep ? 'Começar Agora' : 'Próximo'}
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const OnboardingTour: React.FC<OnboardingTourProps> = ({ userId, user, isTermsAccepted = true }) => {
    const [run, setRun] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!userId || userId === 0 || !user || !isTermsAccepted) {
            setRun(false);
            return;
        }

        if (window.location.hash !== '#/dashboard') return;

        const tourStatus = localStorage.getItem(`troco_tour_completed_${userId}`);

        if (!tourStatus) {
            if (user?.created_at) {
                const createdAt = new Date(user.created_at);
                const now = new Date();
                const diffTime = Math.abs(now.getTime() - createdAt.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays > 3) {
                    localStorage.setItem(`troco_tour_completed_${userId}`, 'true');
                    return;
                }
            }

            const timer = setTimeout(() => {
                setRun(true);
            }, 1500); // 1.5s delay to let animations finish
            return () => clearTimeout(timer);
        }
    }, [userId, user, isTermsAccepted]);

    const steps = TOUR_STEPS.map(step => {
        if (isMobile && typeof step.target === 'string' && step.target.includes('nav')) {
            return {
                ...step,
                placement: 'bottom' as const,
                content: (
                    <div className="space-y-2">
                        {step.content}
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                            <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Dica Mobile</p>
                            <p className="text-[11px] text-emerald-600 dark:text-emerald-300/80">O menu lateral pode ser aberto clicando no ícone ☰ no topo à esquerda.</p>
                        </div>
                    </div>
                )
            };
        }
        return step;
    });

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

        if (finishedStatuses.includes(status)) {
            setRun(false);
            localStorage.setItem(`troco_tour_completed_${userId}`, 'true');
        }
    };

    return (
        <Joyride
            callback={handleJoyrideCallback}
            continuous
            hideCloseButton // Hide default, we manage it customly
            run={run}
            scrollToFirstStep
            showProgress={false} // Handled customly
            showSkipButton={false} // The X icon serves as skip in custom component
            steps={steps}
            tooltipComponent={CustomTooltip}
            styles={{
                options: {
                    zIndex: 10000,
                    arrowColor: 'transparent', // Custom tooltip shapes clash with arrows, keeping it clean float
                    overlayColor: 'rgba(15, 23, 42, 0.7)',
                }
            }}
        />
    );
};

export default OnboardingTour;
