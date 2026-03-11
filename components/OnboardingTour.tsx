import React, { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step, TooltipRenderProps } from 'react-joyride';
import { X, ChevronRight } from 'lucide-react';

interface OnboardingTourProps {
    userId: number;
    user?: any;
}

const TOUR_STEPS: Step[] = [
    {
        target: 'body',
        placement: 'center',
        content: (
            <div className="text-center space-y-3">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Bem-vindo ao Trocô! 🎉</h2>
                <p className="text-slate-600 dark:text-slate-300 text-sm">
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
}: TooltipRenderProps) => {
    return (
        <div
            {...tooltipProps}
            className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700/50 p-6 sm:p-8 max-w-[90vw] sm:max-w-sm w-full mx-auto"
        >
            <div className="flex justify-between items-start mb-4">
                {step.title && (
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white w-full pr-6">
                        {step.title}
                    </h3>
                )}
                {/* Always push X button to top right even without title */}
                <button
                    {...closeProps}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95"
                    aria-label="Pular Tour"
                    title="Pular Tour"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="text-slate-600 dark:text-slate-300 text-sm mb-8 leading-relaxed">
                {step.content}
            </div>

            <div className="flex items-center justify-between mt-auto">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-full">
                    {index + 1} / {TOUR_STEPS.length}
                </div>
                <div className="flex items-center gap-2">
                    {index > 0 && (
                        <button
                            {...backProps}
                            className="px-4 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all active:scale-95"
                        >
                            Voltar
                        </button>
                    )}
                    <button
                        {...primaryProps}
                        className="px-5 py-2 text-sm font-bold text-white bg-primary-500 hover:bg-primary-600 active:scale-95 rounded-xl transition-all shadow-lg shadow-primary-500/30 flex items-center justify-center gap-1 min-w-[100px]"
                    >
                        {isLastStep ? 'Concluir' : 'Próximo'}
                        {!isLastStep && <ChevronRight className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
};

const OnboardingTour: React.FC<OnboardingTourProps> = ({ userId, user }) => {
    const [run, setRun] = useState(false);

    useEffect(() => {
        if (!userId || userId === 0 || !user) return;
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
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [userId, user]);

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
            steps={TOUR_STEPS}
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
