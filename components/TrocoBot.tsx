import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, ChevronDown, Sparkles, TrendingDown, Target, Lightbulb, TrendingUp, CreditCard as CardIcon, MessageCircle, Trash2, History, Plus, Minus, Activity, CalendarDays } from 'lucide-react';
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
    const [showAllPrompts, setShowAllPrompts] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const BOT_ICON_URL = "https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FTroc%C3%B4%2FGemini_Generated_Image_s9cllds9cllds9cl.png&version_id=null";

    // Auto-scroll para a última mensagem
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    // Scroll para o fim ao abrir a janela
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                scrollToBottom();
            }, 150);
        }
    }, [isOpen]);

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
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const monthElapsed = (now.getDate() / daysInMonth) * 100;

        let text = `📅 **Resumo do Mês (${now.getDate()}/${now.getMonth() + 1})**\n`;
        text += `Entrou: **${formatCurrency(income)}**\nSaiu: **${formatCurrency(expense)}**\n`;

        if (income > 0) {
            const spentRatio = (expense / income) * 100;
            text += `\nJá se foram **${monthElapsed.toFixed(0)}%** dos dias do mês e você já engoliu **${spentRatio.toFixed(0)}%** da sua renda monetária do período.\n`;

            if (spentRatio > monthElapsed + 15) text += `\n⚠️ Ritmo alucinante! Você está queimando o limite mais rápido do que os dias passam. Ajuste os freios!`;
            else if (spentRatio < monthElapsed) text += `\n✅ Passo de tartaruga e carteira de leão! Você está gastando bem menos do que o ritmo do mês dita. Mantenha assim.`;
        }

        if (balance > 0) {
            text += `\nSeu saldo superavitário atual é **${formatCurrency(balance)}** livres. Já pensou onde vai focar o aporte? �`;
        } else if (balance < 0) {
            text += `\nSeu déficit atual é de **${formatCurrency(Math.abs(balance))}**. Estamos vivendo do cheque especial interno! 🚨`;
        }

        return text;
    };

    const getTopExpense = () => {
        const expenses = currentMonthTransactions.filter(t => t.type === 'expense');
        if (expenses.length === 0) return "Perfeito! Você não tem *nenhuma* despesa catalogada neste mês até o momento. Um autêntico monge financeiro! 🧘‍♂️";

        const totalExpense = expenses.reduce((acc, curr) => acc + Number(curr.amount), 0);

        const byCategory = expenses.reduce((acc, curr) => {
            acc[curr.category] = (acc[curr.category] || 0) + Number(curr.amount);
            return acc;
        }, {} as Record<string, number>);

        const sortedCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

        let text = `🛒 **Seus Top 3 Ralos Financeiros deste mês**:\n\n`;
        const medals = ['🥇', '🥈', '🥉'];

        sortedCategories.slice(0, 3).forEach(([cat, amt], index) => {
            const perc = ((amt / totalExpense) * 100).toFixed(1);
            text += `${medals[index]} **${cat}**: ${formatCurrency(amt)} (${perc}% de tudo que saiu)\n`;
        });

        text += `\nDe olho no campeão (${sortedCategories[0][0]}). Diminuir 20% do orçamento do ${medals[0]} lugar faz mais diferença do que cortar o cafezinho! 🔍`;
        return text;
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

    const getHealthScoreDetails = () => {
        let income = 0;
        let expense = 0;
        currentMonthTransactions.forEach(t => {
            const val = Number(t.amount);
            if (t.type === 'income') income += val;
            else expense += val;
        });

        if (income === 0 && expense === 0) return "Sua saúde financeira está em stand-by neste mês. Cadastre suas rendas e gastos para eu poder te avaliar!";
        if (income === 0) return `Você gastou **${formatCurrency(expense)}** mas não registrou nenhuma entrada ainda. Cuidado para não queimar suas reservas! ⚠️`;

        const savedPerc = ((income - expense) / income) * 100;

        let text = `🩺 **Raio-X da sua Saúde Financeira**\n\n`;
        text += `Você guardou/investiu **${savedPerc.toFixed(1)}%** de toda a grana que fez neste mês.\n`;

        if (savedPerc >= 20) text += `\n🌟 Padrão Ouro! Você está seguindo à risca a literatura financeira e poupando agressivamente. Seu eu do futuro agradece!`;
        else if (savedPerc > 0) text += `\n👍 Caminho certo, mas pode melhorar. Tente poupar um pouco mais cortando os excessos para acelerar sua riqueza.`;
        else text += `\n🚨 UTI Financeira! Você está gastando mais do que ganha (-${Math.abs(savedPerc).toFixed(1)}%). É hora de um freio emergencial nos cartões!`;

        return text;
    };

    const getYearTopExpense = () => {
        const yearExpenses = transactions.filter(t => t.type === 'expense' && new Date(t.date).getFullYear() === now.getFullYear());
        if (yearExpenses.length === 0) return "Nenhuma despesa registrada neste ano ainda.";

        const byCategory = yearExpenses.reduce((acc, curr) => {
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

        return `No acumulado do ANO, o seu maior dreno financeiro é **${maxCategory}** com bizarros **${formatCurrency(maxAmount)}** vazados. \n\nImagine esse valor investido a juros compostos? É hora de rebaixar essa categoria! 🔪`;
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
            // Mindset e Hábitos
            "A regra 50-30-20 sugere 50% da renda para necessidades, 30% para desejos e maravilhosos 20% para multiplicar (investir).",
            "Pague a si mesmo primeiro! A regra de ouro é: Caiu o salário? Separe o % do bilhão antes de ir pagar o primeiro boleto.",
            "Demitir assinaturas fantasmas de streaming! Aquilo que você não acessa a 30 dias não merece seu precioso dinheiro.",
            "O seu padrão de vida deve caber em 70% do que você ganha. Os outros 30% são a sua passagem para a liberdade.",
            "Dinheiro não aceita desaforo. Anotar todos os seus gastos não é ser 'pão duro', é ter inteligência financeira adulta.",
            "O cartão de crédito não é uma extensão do seu salário. É apenas um meio de pagamento. Use com sabedoria e ganhe cashback!",
            "Evite o 'efeito Diderot' (comprar algo novo e sentir a necessidade de atualizar todo o resto para combinar).",
            "Não compre o que você não precisa, com o dinheiro que você não tem, para impressionar quem você não conhece.",

            // Investimentos
            "Você sabia que o Juro Composto é a 8ª Maravilha do Mundo? O tempo é o ingrediente secreto dos bilionários. Comece hoje.",
            "Reserva de Emergência é oxigênio. Tente juntar entre 3 a 6 meses do seu CUSTO de Vida (Não do seu ganho) na renda fixa.",
            "Vise sempre a qualidade das empresas (Ações e FIIs) que te pagam dividendos ao invés de tentar acertar a loteria.",
            "Diversificação é a única refeição grátis do mercado financeiro. Não coloque todos os seus ovos na mesma cesta.",
            "Investir não é sobre ficar rico rápido, é sobre ficar rico com certeza. O jogo é focado no longo prazo (anos e décadas).",
            "Ações não são bilhetes de loteria, elas representam frações de negócios reais. Seja sócio de boas empresas.",
            "Fundos Imobiliários (FIIs) são uma excelente forma de receber 'aluguéis' todos os meses sem a dor de cabeça de um inquilino real.",
            "Não tente adivinhar o momento perfeito do mercado (Market Timing). Aportes constantes vencem qualquer bola de cristal.",
            "O medo de ficar de fora (FOMO) é o maior destruidor de patrimônio. Nunca invista na dica quente do taxista ou do cunhado.",
            "Renda Fixa não é fixa se você vender antes do vencimento (Marcação a Mercado). Estude os títulos do Tesouro Direto!",

            // Compras e Economia Diária
            "A regra das 24 horas: Viu algo na internet e quis comprar? Coloque no carrinho e espere 24h. Na maioria das vezes, o desejo passa.",
            "Fazer supermercado com fome e sem lista é pedir para gastar 30% a mais na conta final. Vá alimentado!",
            "Reavalie anualmente seus seguros (carro, vida, residencial) e planos de celular/internet. A lealdade raramente compensa.",
            "Marmita é a maior arma secreta contra faturas altas de cartão de crédito no almoço. Cozinhe em casa e veja a mágica.",
            "O custo de um carro vai muito além da parcela. Calcule IPVA, seguro, manutenção, gasolina e a desvalorização antes de comprar.",
            "Pechinchar não é vergonha, é habilidade. Pedir desconto pagando à vista sempre te deixará com mais dinheiro no bolso.",
            "Em eletrodomésticos, o 'barato sai caro' aplica-se quase sempre. Compre marcas que duram anos, e não meses.",

            // Estratégia
            "Transforme seus hobbies em renda extra. Se você gosta de editar fotos ou consertar coisas, por que não fazer uns trocados no final de semana?",
            "Educação é o ativo de maior ROI (Retorno sobre Investimento). Um curso de R$100 que te ensina a ganhar R$2.000 mensais é a melhor ação da bolsa.",
            "Acompanhe seu Patrimônio Líquido a cada 3 meses. Somar tudo que você tem menos o que você deve, é a métrica definitiva do sucesso financeiro.",
            "Suas metas precisam ter nome, valor e prazo! 'Quero viajar' é um desejo. 'Viagem para o Chile por R$4.000 em 24 meses' é uma META.",
            "Automatize seus investimentos. Programe a transferência da corretora para o mesmo dia do pagamento do salário.",
            "Aumentar a renda é muito mais poderoso do que apenas cortar o cafezinho. Foque energia em ser mais valioso para o mercado."
        ];
        return "💡 Pílula de Sabedoria:\n\n" + tips[Math.floor(Math.random() * tips.length)];
    };

    const getRecentTransactions = () => {
        if (transactions.length === 0) return "Você ainda não tem transações registradas. Comece a anotar tudo para ter controle total!";

        const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3);
        let text = "Aqui estão suas 3 movimentações mais recentes:\n\n";

        sorted.forEach(t => {
            const icon = t.type === 'income' ? '🟢' : '🔴';
            const dateStr = new Date(t.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
            text += `${icon} **${t.description || 'Transação'}**: ${formatCurrency(Number(t.amount))} em ${dateStr}\n`;
        });

        return text;
    };

    // --- Handlers Interativos ---

    const handleClearChat = () => {
        setMessages([
            {
                id: Date.now().toString(),
                sender: 'bot',
                text: `Chat limpo! Prontinho, lousa em branco 🧼.\nComo posso ajudar você a multiplicar seus ganhos hoje? 🚀`,
            }
        ]);
    };

    const handleActionClick = (actionText: string, actionType: 'summary' | 'expense' | 'goals' | 'tip' | 'cards' | 'inv' | 'recent' | 'health' | 'yearexpense') => {
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
            else if (actionType === 'recent') botText = getRecentTransactions();
            else if (actionType === 'health') botText = getHealthScoreDetails();
            else if (actionType === 'yearexpense') botText = getYearTopExpense();

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
                        className="fixed bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] right-6 z-[9999] w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-[0_8px_30px_-5px_var(--tw-shadow-color)] shadow-slate-300/50 dark:shadow-slate-900/50 flex items-center justify-center cursor-pointer border-[1.5px] border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 group"
                    >
                        {/* Ícone Genérico de Mensagem quando minimizado */}
                        <MessageCircle
                            className="w-6 h-6 sm:w-7 sm:h-7 text-primary-500 transform group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300 relative z-10"
                            strokeWidth={2.5}
                        />

                        {/* Status Indicator */}
                        <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-rose-500 border-2 border-white dark:border-slate-800 rounded-full z-20 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
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
                                            </h3>
                                            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium tracking-wide flex items-center gap-1.5 mt-0.5">
                                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                                                Online e Preparado
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleClearChat}
                                            className="w-9 h-9 rounded-full bg-slate-200/50 hover:bg-slate-300/50 dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center text-slate-500 hover:text-rose-500 dark:text-slate-300 dark:hover:text-rose-400 transition-colors backdrop-blur-sm"
                                            title="Limpar Chat"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setIsOpen(false)}
                                            className="w-9 h-9 rounded-full bg-slate-200/50 hover:bg-slate-300/50 dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center text-slate-500 dark:text-slate-300 transition-colors backdrop-blur-sm"
                                            title="Minimizar"
                                        >
                                            <ChevronDown className="w-5 h-5" />
                                        </button>
                                    </div>
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
                                <div className="p-4 sm:p-5 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-t border-slate-200/50 dark:border-slate-800/50 shrink-0 relative z-20 transition-all duration-300">
                                    <div className="flex items-center justify-between mb-3 pl-1">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tópicos de Análise V2</p>
                                        <button
                                            onClick={() => setShowAllPrompts(!showAllPrompts)}
                                            className="text-[10px] font-bold text-primary-500 uppercase tracking-wider flex items-center gap-1 hover:underline"
                                        >
                                            {showAllPrompts ? <><Minus className="w-3 h-3" /> Ver Menos</> : <><Plus className="w-3 h-3" /> Mais Opções</>}
                                        </button>
                                    </div>
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

                                        {/* Core view vs Expanded view */}
                                        {(showAllPrompts) && (
                                            <>
                                                <button
                                                    onClick={() => handleActionClick("Investimentos", 'inv')}
                                                    className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-[12px] font-semibold text-slate-700 dark:text-slate-200 transition-all border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 animate-fade-in"
                                                >
                                                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                                                    Investimentos
                                                </button>
                                                <button
                                                    onClick={() => handleActionClick("Transações", 'recent')}
                                                    className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-[12px] font-semibold text-slate-700 dark:text-slate-200 transition-all border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 animate-fade-in"
                                                >
                                                    <History className="w-3.5 h-3.5 text-blue-500" />
                                                    Transações Recentes
                                                </button>
                                                <button
                                                    onClick={() => handleActionClick("Saúde Financeira", 'health')}
                                                    className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-[12px] font-semibold text-slate-700 dark:text-slate-200 transition-all border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 animate-fade-in"
                                                >
                                                    <Activity className="w-3.5 h-3.5 text-teal-500" />
                                                    Saúde Financeira
                                                </button>
                                                <button
                                                    onClick={() => handleActionClick("Maior Custo Anual", 'yearexpense')}
                                                    className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-[12px] font-semibold text-slate-700 dark:text-slate-200 transition-all border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 animate-fade-in"
                                                >
                                                    <CalendarDays className="w-3.5 h-3.5 text-orange-500" />
                                                    Maior Custo Anual
                                                </button>
                                            </>
                                        )}

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
