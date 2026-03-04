import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Sparkles, TrendingDown, Target, Lightbulb, ChevronDown } from 'lucide-react';
import { Transaction, Goal, UserProfile } from '../types';

interface TrocoBotProps {
    transactions: Transaction[];
    goals: Goal[];
    user: UserProfile;
}

type Message = {
    id: string;
    sender: 'bot' | 'user';
    text: string;
    isTyping?: boolean;
};

export default function TrocoBot({ transactions, goals, user }: TrocoBotProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

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
                    text: `Olá, ${user.nome ? user.nome.split(' ')[0] : 'lá'}! Sou o TrocôBot 🤖.\nDê uma olhada nos botões abaixo ou me faça uma pergunta rápida sobre suas finanças. Como posso ajudar?`,
                }
            ]);
        }
    }, [isOpen, messages.length, user.nome]);

    // --- Funções de Ajuda (Rules Engine Local Seguro) ---

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    // Calcula tudo focado no MÊS ATUAL para métricas reais e não projetadas futuras.
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
        let text = `Neste mês, você teve receitas de **${formatCurrency(income)}** e despesas de **${formatCurrency(expense)}**.\n`;

        if (balance > 0) {
            text += `Excelente! Você tem um saldo positivo de **${formatCurrency(balance)}**. Guardou um pouquinho? 😉`;
        } else if (balance < 0) {
            text += `Atenção: Suas despesas ultrapassaram receitas em **${formatCurrency(Math.abs(balance))}**. É bom segurar os gastos.`;
        } else {
            text += `Você está exatamente no zero a zero! Cada centavo entrou e saiu.`;
        }

        return text;
    };

    const getTopExpense = () => {
        const expenses = currentMonthTransactions.filter(t => t.type === 'expense');
        if (expenses.length === 0) return "Você ainda não cadastrou nenhuma despesa este mês. Ótimo trabalho (ou cadê a organização? haha).";

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

        return `Sua categoria com maior gasto este mês é **${maxCategory}**, custando **${formatCurrency(maxAmount)}** do seu bolso.`;
    };

    const getGoalsStatus = () => {
        if (goals.length === 0) return "Você ainda não tem metas cadastradas. Que tal ir na aba 'Metas' e criar um objetivo novo, como 'Viagem' ou 'Reserva de Emergência'?";

        const totalSaved = goals.reduce((acc, g) => acc + Number(g.current_amount), 0);
        const totalTarget = goals.reduce((acc, g) => acc + Number(g.target_amount), 0);
        let percentage = (totalSaved / totalTarget) * 100;
        if (isNaN(percentage)) percentage = 0;

        let text = `Você tem ${goals.length} metas ativas.\nNo geral, você já guardou **${formatCurrency(totalSaved)}**. Isso representa **${percentage.toFixed(1)}%** do caminho total das suas metas!`;

        // Achar a meta mais próxima
        const closestGoal = [...goals].sort((a, b) => {
            const pA = Number(a.current_amount) / Number(a.target_amount);
            const pB = Number(b.current_amount) / Number(b.target_amount);
            return pB - pA;
        })[0];

        if (closestGoal && Number(closestGoal.current_amount) < Number(closestGoal.target_amount)) {
            text += `\nA meta mais próxima de bater é **"${closestGoal.name || 'Nova Meta'}"** com ${((Number(closestGoal.current_amount) / Number(closestGoal.target_amount)) * 100).toFixed(0)}% concluída. Falta pouco!`;
        }

        return text;
    };

    const getRandomTip = () => {
        const tips = [
            "Dica: A regra 50-30-20 sugere 50% para necessidades, 30% para desejos e 20% para poupar/investir.",
            "Você sabia que faturas de cartão não são despesas novas? Você só 'rola' o dinheiro que já gastou antes.",
            "Anote pequenos gastos do dia a dia. Aquele cafezinho de R$ 8 todo dia vira R$ 240 no mês!",
            "Uma Reserva de Emergência ideal deve cobrir de 3 a 6 meses do seu custo de vida básico.",
            "Revisitar assinaturas de streaming! Muita gente paga por serviços que não usa há meses.",
            "Pague a si mesmo primeiro: Assim que receber, transfira a quantia dos seus investimentos."
        ];
        return "💡 " + tips[Math.floor(Math.random() * tips.length)];
    };

    // --- Handlers Interativos ---

    const handleActionClick = (actionText: string, actionType: 'summary' | 'expense' | 'goals' | 'tip') => {
        // 1. Mensagem do usuário
        const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: actionText };
        setMessages(prev => [...prev, userMsg]);
        setIsTyping(true);

        // 2. Simular "pensamento"
        setTimeout(() => {
            let botText = '';
            if (actionType === 'summary') botText = getMonthSummary();
            else if (actionType === 'expense') botText = getTopExpense();
            else if (actionType === 'goals') botText = getGoalsStatus();
            else if (actionType === 'tip') botText = getRandomTip();

            const botMsg: Message = { id: (Date.now() + 1).toString(), sender: 'bot', text: botText };
            setIsTyping(false);
            setMessages(prev => [...prev, botMsg]);
        }, 1200); // 1.2s delay para realismo
    };

    // Botões de ação rápida UI
    const ActionButtons = () => (
        <div className="flex flex-wrap gap-2 mt-4 px-4 pb-4 shrink-0">
            <button
                onClick={() => handleActionClick("Resumo do Mês", 'summary')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors border border-slate-200 dark:border-slate-600 shadow-sm"
            >
                <Sparkles className="w-3.5 h-3.5 text-primary-500" />
                Resumo do Mês
            </button>
            <button
                onClick={() => handleActionClick("Maior Despesa", 'expense')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors border border-slate-200 dark:border-slate-600 shadow-sm"
            >
                <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                Maior Ralo
            </button>
            <button
                onClick={() => handleActionClick("Minhas Metas", 'goals')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors border border-slate-200 dark:border-slate-600 shadow-sm"
            >
                <Target className="w-3.5 h-3.5 text-emerald-500" />
                Metas
            </button>
            <button
                onClick={() => handleActionClick("Dica Rápida", 'tip')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors border border-slate-200 dark:border-slate-600 shadow-sm"
            >
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                Dica
            </button>
        </div>
    );

    return (
        <>
            {/* FAB Floating Action Button */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsOpen(true)}
                        className="fixed bottom-6 right-6 z-40 bg-slate-900 dark:bg-white text-white dark:text-slate-900 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center cursor-pointer border-4 border-slate-100 dark:border-slate-800 focus:outline-none ring-4 ring-primary-500/30 group"
                    >
                        <Bot className="w-7 h-7 group-hover:rotate-12 transition-transform" />
                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Chat Windows Modal/Side-panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ ease: "easeInOut", duration: 0.2 }}
                        className="fixed bottom-6 right-6 z-50 w-[340px] sm:w-[380px] origin-bottom-right"
                    >
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-[500px]">

                            {/* Header */}
                            <div className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 p-4 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm relative">
                                        <Bot className="w-6 h-6 text-primary-400" />
                                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-800 rounded-full"></span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-sm">TrocôBot</h3>
                                        <p className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">Assistente Inteligente</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 transition-colors"
                                >
                                    <ChevronDown className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Chat Area */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-800/50 custom-scrollbar">
                                {messages.map((msg) => (
                                    <motion.div
                                        key={msg.id}
                                        initial={{ opacity: 0, scale: 0.9, originY: 1 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                                    >
                                        <div
                                            className={`max-w-[85%] rounded-2xl p-3 text-sm ${msg.sender === 'user'
                                                ? 'bg-primary-500 text-white rounded-br-sm'
                                                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-600 rounded-bl-sm shadow-sm'
                                                }`}
                                            style={{ whiteSpace: 'pre-wrap' }}
                                        >
                                            {/* Format bold text from parser simply for now */}
                                            <span dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                                        </div>
                                    </motion.div>
                                ))}

                                {isTyping && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9, originY: 1 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex flex-col items-start"
                                    >
                                        <div className="bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl rounded-bl-sm p-4 shadow-sm flex items-center gap-1.5 h-10 w-16 justify-center">
                                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                                        </div>
                                    </motion.div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Prompts Injetáveis da Interface Baseada em Ação em Vez de Teclado (Foco em Velocidade + UX Mobile + Zero IA Paga) */}
                            <div className="bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 shrink-0">
                                <ActionButtons />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
