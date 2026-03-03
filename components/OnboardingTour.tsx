import React, { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

interface OnboardingTourProps {
    userId: number;
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
        target: '#tour-nav-menu',
        placement: 'right',
        content: (
            <div>
                <h3 className="font-bold text-slate-800 dark:text-white mb-2">Menu Principal</h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm">
                    Aqui você navega por todas as áreas do app: registre Transações, gerencie Cartões, acompanhe Metas e Investimentos. Tudo a um clique!
                </p>
            </div>
        ),
    },
    {
        target: '#tour-dashboard-balance',
        placement: 'bottom',
        content: (
            <div>
                <h3 className="font-bold text-slate-800 dark:text-white mb-2">Seu Painel de Controle</h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm">
                    Este é o seu saldo. Ele calcula automaticamente o que você já recebeu e o que já pagou no mês atual. Você pode arrastar esses cartões para reorganizar a tela!
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
                    Você prefere o lado sombrio? Alterne entre o tema claro e o tema escuro sempre que quiser.
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
                    Agora é com você. Explore a plataforma e transforme sua vida financeira. Precisando de ajuda, nosso agente de WhatsApp está sempre no menu.
                </p>
            </div>
        ),
    }
];

const OnboardingTour: React.FC<OnboardingTourProps> = ({ userId }) => {
    const [run, setRun] = useState(false);

    useEffect(() => {
        // Apenas rodar quando o ID do usuário for válido (logado com sucesso)
        // E apenas rodar na raiz/dashboard (para os elementos existirem)
        if (userId === 0) return;

        // Evita rodar na tela de edição ou configurações se o login foi profundo
        if (window.location.hash !== '#/dashboard') return;

        // Verificar se o tour já foi completado
        const tourStatus = localStorage.getItem(`troco_tour_completed_${userId}`);
        if (!tourStatus) {
            // Pequeno delay para garantir que o React renderizou a DOM e as animações de entrada acabaram
            const timer = setTimeout(() => {
                setRun(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [userId]);

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
                    textColor: '#334155',
                    backgroundColor: '#ffffff',
                    overlayColor: 'rgba(15, 23, 42, 0.7)', // Slate-900 at 70% opacity
                },
                buttonNext: {
                    backgroundColor: '#10B981',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: 600,
                },
                buttonBack: {
                    marginRight: 10,
                    color: '#64748b',
                },
                buttonSkip: {
                    color: '#94a3b8',
                },
                tooltipContainer: {
                    textAlign: 'left' as const,
                },
                tooltip: {
                    padding: 24,
                    borderRadius: '16px',
                }
            }}
            locale={{
                back: 'Voltar',
                close: 'Fechar',
                last: 'Concluir',
                next: 'Próximo',
                skip: 'Pular Tour',
            }}
        />
    );
};

export default OnboardingTour;
