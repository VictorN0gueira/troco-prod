import React, { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

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

const OnboardingTour: React.FC<OnboardingTourProps> = ({ userId, user }) => {
    const [run, setRun] = useState(false);

    useEffect(() => {
        // Apenas rodar quando o ID do usuário for válido (logado com sucesso)
        // E apenas rodar na raiz/dashboard (para os elementos existirem)
        if (!userId || userId === 0 || !user) return;

        // Evita rodar na tela de edição ou configurações se o login foi profundo
        if (window.location.hash !== '#/dashboard') return;

        // Verificar se o tour já foi completado
        const tourStatus = localStorage.getItem(`troco_tour_completed_${userId}`);

        if (!tourStatus) {
            // Check if user is old (created more than 3 days ago)
            // If so, let's not bother them with the onboarding tour.
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

            // Pequeno delay para garantir que o React renderizou a DOM e as animações de entrada acabaram
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
            hideCloseButton
            run={run}
            scrollToFirstStep
            showProgress
            showSkipButton
            steps={TOUR_STEPS}
            styles={{
                options: {
                    zIndex: 10000,
                    primaryColor: '#10B981', // Emerald-500
                    textColor: '#1e293b', // Slate-800 for better contrast
                    backgroundColor: '#ffffff',
                    overlayColor: 'rgba(15, 23, 42, 0.7)', // Slate-900 at 70% opacity
                },
                buttonNext: {
                    backgroundColor: '#10B981',
                    color: '#ffffff', // Explicitly white for contrast
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: 600,
                },
                buttonBack: {
                    marginRight: 10,
                    color: '#475569', // Slate-600
                    fontWeight: 500,
                },
                buttonSkip: {
                    color: '#94a3b8',
                    fontWeight: 500,
                },
                tooltipContainer: {
                    textAlign: 'left' as const,
                },
                tooltip: {
                    padding: 24,
                    borderRadius: '16px',
                    backgroundColor: '#ffffff', // Guarantee white bg
                }
            }}
            locale={{
                back: 'Voltar',
                close: 'Fechar',
                last: 'Concluir Tour',
                next: 'Próximo',
                skip: 'Pular Tour',
            }}
        />
    );
};

export default OnboardingTour;
