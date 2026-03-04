import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, ChevronDown, Sparkles, TrendingDown, Target, Lightbulb, TrendingUp, CreditCard as CardIcon, MessageCircle } from 'lucide-react';
import { Transaction, Goal, UserProfile, CreditCard, Investment } from '../types';

interface TrocoBotProps {
    transactions: Transaction[];
    goals: Goal[];
    cards: CreditCard[];
    investments: Investment[];
    user: UserProfile;
}

type Message = {
    id: string;
    sender: 'bot' | 'user';
    text: string;
    isTyping?: boolean;
};

export default function TrocoBot({ transactions, goals, cards, investments, user }: TrocoBotProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const BOT_ICON_URL = "https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FTroc%C3%B4%2FGemini_Generated_Image_s9cllds9cllds9cl.png&version_id=null";

    // Auto-scroll para a última mensagem
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    // Mensagem inicial de boas-vindas
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([
                {
                    id: Date.now().toString(),
                    sender: 'bot',
                    text: `Olá, ${user.nome ? user.nome.split(' ')[0] : 'lá'}! Sou o **TrocôBot**, seu assistente financeiro premium.\nComo posso ajudar você a multiplicar seus ganhos hoje? 🐷🚀`,
                }
            ]);
        }
    }, [isOpen, messages.length, user.nome]);

    // --- Funções Auxiliares (Rules Engine Local Seguro V2) ---

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const now = new Date();
    const currentMonthTransactions = transactions.filter(t => {
        if (!t.date) return false;
        const date = new Date(t.date);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });

    const getMonthSummary = () => {
        let income = 0;
        let expense = 0;

        currentMonthTransactions.forEach(t => {
            const val = Number(t.amount);
            if (t.type === 'income') income += val;
            else expense += val;
        });

        const balance = income - expense;
        let text = `Neste mês, você embolsou **${formatCurrency(income)}** e investiu/gastou **${formatCurrency(expense)}**.\n`;

        if (balance > 0) {
            text += `Excelente performance! Você tem um saldo superavitário de **${formatCurrency(balance)}** livres. Já pensou onde vai investir? 💸`;
        } else if (balance < 0) {
            text += `Atenção: Seu déficit atual é de **${formatCurrency(Math.abs(balance))}**. Estamos gastando mais do que entra, hora de segurar as pontas! 🚨`;
        } else {
            text += `Tudo no azul, exatamente zero a zero! Cada centavo que entrou, casou com uma despesa. ⚖️`;
        }

        return text;
    };

    const getTopExpense = () => {
        const expenses = currentMonthTransactions.filter(t => t.type === 'expense');
        if (expenses.length === 0) return "Perfeito! Você não tem *nenhuma* despesa catalogada neste mês até o momento. Um monge financeiro! 🧘‍♂️";

        const byCategory = expenses.reduce((acc, curr) => {
            acc[curr.category] = (acc[curr.category] || 0) + Number(curr.amount);
            return acc;
        }, {} as Record<string, number>);

        let maxCategory = '';
        let maxAmount = 0;

        Object.entries(byCategory).forEach(([cat, amt]) => {
            if (amt > maxAmount) {
                maxAmount = amt;
                maxCategory = cat;
            }
        });

        return `O seu calcanhar de aquiles este mês é **${maxCategory}**. Você já despendeu **${formatCurrency(maxAmount)}** apenas nessa categoria. Vale a pena revisar! 🔍`;
    };

    const getGoalsStatus = () => {
        if (goals.length === 0) return "Você ainda não configurou *nenhuma Meta*. Grandes construções começam com um alvo. Que tal criarmos uma Reserva de Emergência hoje?";

        const totalSaved = goals.reduce((acc, g) => acc + Number(g.current_amount), 0);
        const totalTarget = goals.reduce((acc, g) => acc + Number(g.target_amount), 0);
        let percentage = (totalSaved / totalTarget) * 100;
        if (isNaN(percentage)) percentage = 0;

        let text = `Você está administrando **${goals.length} metas** agora.\nPatrimônio acumulado nos sonhos: **${formatCurrency(totalSaved)}**. Isso significa que você já andou **${percentage.toFixed(1)}%** do caminho total! ✨`;

        const closestGoal = [...goals].sort((a, b) => {
            const pA = Number(a.current_amount) / Number(a.target_amount);
            const pB = Number(b.current_amount) / Number(b.target_amount);
            return pB - pA;
        })[0];

        if (closestGoal && Number(closestGoal.current_amount) < Number(closestGoal.target_amount)) {
            const perc = ((Number(closestGoal.current_amount) / Number(closestGoal.target_amount)) * 100).toFixed(0);
            text += `\nA meta mais quente é **"${closestGoal.name || 'Nova Meta'}"** com **${perc}%** dominados. Mantenha o foco que está perto! 🏁`;
        }

        return text;
    };

    const getCardsSummary = () => {
        if (cards.length === 0) return "Você não tem nenhum Cartão de Crédito cadastrado. Usar bem os cartões pode render ótimos cashbacks se pagos em dia! 💳";

        const totalUsage = cards.reduce((acc, c) => acc + Number(c.current_usage), 0);
        const totalLimit = cards.reduce((acc, c) => acc + Number(c.limit_amount), 0);
        const usagePerc = totalLimit > 0 ? ((totalUsage / totalLimit) * 100).toFixed(1) : '0';

        let text = `Você gerencia **${cards.length} cartões** com limite consolidado de **${formatCurrency(totalLimit)}**.\n\nFaturas Em Aberto (Uso): **${formatCurrency(totalUsage)}** (${usagePerc}% do limite global comprometido).`;

        if (Number(usagePerc) > 80) {
            text += `\n\n⚠️ **Alerta:** Você está consumindo quase todo o limite dos seus cartões. Cuidado com o rotativo!`;
        }

        // Achar fatura mais alta
        const highestCard = [...cards].sort((a, b) => Number(b.current_usage) - Number(a.current_usage))[0];
        if (highestCard && Number(highestCard.current_usage) > 0) {
            text += `\nA fatura mais pesada no momento é do **${highestCard.name}** chegando a **${formatCurrency(Number(highestCard.current_usage))}**. Fique de olho no fechamento dia ${highestCard.closing_day}!`;
        }

        return text;
    };

    const getInvestmentsSummary = () => {
        if (investments.length === 0) return "Sua carteira de investimentos está vazia. O primeiro passo para a riqueza é começar a investir o que sobra do mês! 📈";

        const totalInvested = investments.reduce((acc, inv) => acc + (Number(inv.quantity) * Number(inv.current_price)), 0);
        const totalCost = investments.reduce((acc, inv) => acc + (Number(inv.quantity) * Number(inv.purchase_price)), 0);
        const profit = totalInvested - totalCost;
        const profitPerc = totalCost > 0 ? ((profit / totalCost) * 100).toFixed(2) : '0';

        let text = `Você tem **${investments.length} ativos** blindando seu futuro.\n\n💰 Patrimônio Total: **${formatCurrency(totalInvested)}**\n`;

        if (profit > 0) {
            text += `📈 Lucro Acumulado: **+${formatCurrency(profit)} (+${profitPerc}%)**. Seus ativos estão voando! 🦅`;
        } else if (profit < 0) {
            text += `📉 Resultado: **${formatCurrency(profit)} (${profitPerc}%)**. O mercado oscila, faz parte do jogo estratégico!`;
        } else {
            text += `⚖️ Resultado: Empate técnico (0%). Nenhuma valorização expressiva desde as compras.`;
        }

        return text;
    };

    const getRandomTip = () => {
        const tips = [
            "A regra 50-30-20 sugere 50% da renda para necessidades, 30% para desejos e maravilhosos 20% para multiplicar (investir).",
            "Pague a si mesmo primeiro! A regra de ouro é: Caiu o salário? Separe o % do bilhão antes de ir pagar o primeiro boleto.",
            "Você sabia que o Juro Composto é a 8ª Maravilha do Mundo? O tempo é o ingrediente secreto dos bilionários. Comece hoje.",
            "Reserva de Emergência é oxigênio. Tente juntar entre 3 a 6 meses do seu CUSTO de Vida (Não do seu ganho) na renda fixa.",
            "Demitir assinaturas fantasmas de streaming! Aquilo que você não acessa a 30 dias não merece seu precioso dinheiro.",
            "Vise sempre a qualidade das empresas (Ações e FIIs) que te pagam dividendos ao invés de tentar acertar a loteria."
        ];
        return "💡 A dica de milhões de hoje:\n" + tips[Math.floor(Math.random() * tips.length)];
    };

    // --- Handlers Interativos ---

    const handleActionClick = (actionText: string, actionType: 'summary' | 'expense' | 'goals' | 'tip' | 'cards' | 'inv') => {
        // 1. Mensagem do usuário
        const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: actionText };
        setMessages(prev => [...prev, userMsg]);
        setIsTyping(true);

        // 2. Simular "pensamento" da IA 
        setTimeout(() => {
            let botText = '';
            if (actionType === 'summary') botText = getMonthSummary();
            else if (actionType === 'expense') botText = getTopExpense();
            else if (actionType === 'goals') botText = getGoalsStatus();
            else if (actionType === 'tip') botText = getRandomTip();
            else if (actionType === 'cards') botText = getCardsSummary();
            else if (actionType === 'inv') botText = getInvestmentsSummary();

            const botMsg: Message = { id: (Date.now() + 1).toString(), sender: 'bot', text: botText };
            setIsTyping(false);
            setMessages(prev => [...prev, botMsg]);
        }, 1500); // 1.5s delay para realismo premium
    };

    return (
        <>
            {/* FAB Floating Action Button V2 - Z Index Force And Global Fixed */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsOpen(true)}
                        // IMPORTANT: Removed fixed bottom-6 right-6 here as we will wrap both in a high z-index wrapper that is truly global
                        className="fixed bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] right-6 z-[9999] w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-[0_10px_40px_-5px_var(--tw-shadow-color)] shadow-primary-500/40 flex items-center justify-center cursor-pointer border-[3px] border-white dark:border-slate-800 bg-gradient-to-tr from-slate-900 via-slate-800 to-primary-900 group"
                    >
                        <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_50%)]"></div>
                        </div>
                        {/* Ícone Genérico de Mensagem quando minimizado */}
                        <MessageCircle
                            className="w-6 h-6 sm:w-7 sm:h-7 text-white transform group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300 relative z-10"
                            strokeWidth={2.5}
                        />

                        {/* Status Indicator (Removido overflow-hidden do container pai para não cortar a bolinha) */}
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full z-20 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />

                        {/* Premium Glow effect behind it */}
                        <div className="absolute -inset-1 blur-lg rounded-full bg-gradient-to-r from-emerald-500 to-primary-500 opacity-60 group-hover:opacity-100 transition-opacity z-[-1]"></div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chat Windows Modal/Side-panel V2 - UI Premium Glassmorphism */}
            <AnimatePresence>
                {isOpen && (
                    /* Modal Backdrop na versao Mobile e Wrapper Absoluto para z-index real independente do DOM herdado */
                    <div className="fixed inset-0 z-[10000] pointer-events-none sm:pointer-events-auto sm:inset-auto sm:right-6 sm:bottom-6">

                        {/* Mobile Backdrop (Apenas clica pra fechar, invisível nos lados) */}
                        <div
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto sm:hidden"
                            onClick={() => setIsOpen(false)}
                        />

                        <motion.div
                            initial={{ opacity: 0, y: "100%", scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: "100%", scale: 0.95 }}
                            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                            // No mobile, ocupa quase toda altura e gruda no baixo florindo bordas de cima. Desktop mantém o painel flutuante
                            className="absolute bottom-0 left-0 right-0 sm:relative sm:w-[380px] sm:bottom-auto sm:left-auto sm:right-auto origin-bottom pointer-events-auto"
                        >
                            <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl sm:rounded-[2rem] rounded-t-[2rem] shadow-2xl border border-white/20 dark:border-white/5 overflow-hidden flex flex-col h-[85vh] sm:h-[600px] ring-1 ring-slate-900/5 dark:ring-white/5">

                                {/* Premium Header */}
                                <div className="relative p-5 flex items-center justify-between shrink-0 bg-gradient-to-b from-slate-100/50 to-transparent dark:from-slate-800/50 dark:to-transparent border-b border-white/10 dark:border-slate-700/50">
                                    {/* Reflexo super premium top (Glass highlight) */}
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent rounded-b-full"></div>

                                    <div className="flex items-center gap-4">
                                        <div className="relative w-12 h-12 rounded-2xl p-0.5 bg-gradient-to-tr from-emerald-400 to-primary-500 shadow-xl shadow-primary-500/20 overflow-hidden group">
                                            <div className="w-full h-full bg-slate-900 rounded-[14px] overflow-hidden">
                                                <img
                                                    src={BOT_ICON_URL}
                                                    alt="Bot Image"
                                                    className="w-full h-full object-cover transform scale-110 group-hover:scale-125 transition-transform duration-500"
                                                />
                                            </div>
                                            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 dark:text-white text-lg tracking-tight flex items-center gap-2">
                                                Trocô<span className="text-primary-500">Bot</span>
                                                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-md border border-emerald-500/20 ml-1">AI</span>
                                            </h3>
                                            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium tracking-wide flex items-center gap-1.5 mt-0.5">
                                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                                                Online e Preparado
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="w-9 h-9 rounded-full bg-slate-200/50 hover:bg-slate-300/50 dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center text-slate-500 dark:text-slate-300 transition-colors backdrop-blur-sm"
                                    >
                                        <ChevronDown className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Chat Area - Scroll Smooth e Glass BG */}
                                <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-gradient-to-b from-slate-50/50 via-slate-100/30 to-slate-200/30 dark:from-slate-900/50 dark:via-slate-800/30 dark:to-slate-900/50 custom-scrollbar relative">
                                    {/* Efeito decorativo no fundo */}
                                    <div className="absolute top-1/3 left-1/4 w-32 h-32 bg-primary-500/10 dark:bg-primary-400/5 rounded-full blur-[60px] pointer-events-none"></div>
                                    <div className="absolute bottom-1/3 right-1/4 w-32 h-32 bg-emerald-500/10 dark:bg-emerald-400/5 rounded-full blur-[60px] pointer-events-none"></div>

                                    {messages.map((msg) => (
                                        <motion.div
                                            key={msg.id}
                                            initial={{ opacity: 0, y: 10, scale: 0.97 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            className={`flex flex-col relative z-10 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                                        >
                                            <div
                                                className={`max-w-[85%] rounded-[1.25rem] p-4 text-[14px] leading-relaxed shadow-sm backdrop-blur-sm relative overflow-hidden ${msg.sender === 'user'
                                                    // Bolha Premium do Usuário
                                                    ? 'bg-primary-600 dark:bg-primary-500 text-white rounded-br-sm border border-primary-500/50 shadow-primary-500/20'
                                                    // Bolha Premium do Bot
                                                    : 'bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60 rounded-bl-sm inset-shadow-sm'
                                                    }`}
                                                style={{ whiteSpace: 'pre-wrap' }}
                                            >
                                                {/* Highlight Reflexo Glass para a bolha do bot */}
                                                {msg.sender === 'bot' && <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-50"></div>}

                                                <span dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                                            </div>
                                        </motion.div>
                                    ))}

                                    {isTyping && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex flex-col items-start relative z-10"
                                        >
                                            <div className="bg-white/90 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700/60 rounded-[1.25rem] rounded-bl-sm px-4 py-3.5 shadow-sm flex items-center gap-1.5 w-16 justify-center backdrop-blur-sm">
                                                <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                                <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></span>
                                            </div>
                                        </motion.div>
                                    )}
                                    <div ref={messagesEndRef} className="h-4" />
                                </div>

                                {/* Prompts Injetáveis da Interface Premium - Borda Fina no Topo */}
                                <div className="p-4 sm:p-5 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-t border-slate-200/50 dark:border-slate-800/50 shrink-0 relative z-20">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 mb-3">Tópicos de Análise V2</p>
                                    <div className="flex flex-wrap items-center gap-2 pb-2">
                                        <button
                                            onClick={() => handleActionClick("Resumo do Mês", 'summary')}
                                            className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-[12px] font-semibold text-slate-700 dark:text-slate-200 transition-all border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                                        >
                                            <Sparkles className="w-3.5 h-3.5 text-primary-500" />
                                            Balanço Mês
                                        </button>
                                        <button
                                            onClick={() => handleActionClick("Maior Despesa", 'expense')}
                                            className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-[12px] font-semibold text-slate-700 dark:text-slate-200 transition-all border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                                        >
                                            <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                                            Maior Ralo
                                        </button>
                                        <button
                                            onClick={() => handleActionClick("Analisar Cartões", 'cards')}
                                            className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-[12px] font-semibold text-slate-700 dark:text-slate-200 transition-all border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                                        >
                                            <CardIcon className="w-3.5 h-3.5 text-amber-500" />
                                            Faturas
                                        </button>
                                        <button
                                            onClick={() => handleActionClick("Meus Investimentos", 'inv')}
                                            className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-[12px] font-semibold text-slate-700 dark:text-slate-200 transition-all border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                                        >
                                            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                                            Investimentos
                                        </button>
                                        <button
                                            onClick={() => handleActionClick("Minhas Metas", 'goals')}
                                            className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-[12px] font-semibold text-slate-700 dark:text-slate-200 transition-all border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                                        >
                                            <Target className="w-3.5 h-3.5 text-purple-500" />
                                            Metas Futuras
                                        </button>
                                        <button
                                            onClick={() => handleActionClick("Me Dê Uma Dica!", 'tip')}
                                            className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-[12px] font-semibold text-slate-700 dark:text-slate-200 transition-all border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                                        >
                                            <Lightbulb className="w-3.5 h-3.5 text-indigo-500" />
                                            Dica Rápida
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
