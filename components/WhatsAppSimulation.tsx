import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCheck, Send, Mic, Play } from 'lucide-react';

const WhatsAppSimulation: React.FC = () => {
    const [messages, setMessages] = useState<{ id: string; text: string | React.ReactNode; isBot: boolean; time: string; status?: 'sent' | 'delivered' | 'read' }[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [step, setStep] = useState(0);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const currentTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    useEffect(() => {
        // Reset simulation animation
        setMessages([]);
        setStep(1);
    }, []);

    useEffect(() => {
        let timeout: NodeJS.Timeout;

        const runSimulation = async () => {
            if (step === 1) {
                // User sends the message
                timeout = setTimeout(() => {
                    setMessages([{
                        id: 'start',
                        text: 'Gastei 25 no corte de cabelo',
                        isBot: false,
                        time: currentTime,
                        status: 'sent'
                    }]);
                    setStep(2);
                }, 1000);
            } else if (step === 2) {
                // Change status to read quickly
                timeout = setTimeout(() => {
                    setMessages(prev => prev.map(m => m.id === 'start' ? { ...m, status: 'read' } : m));
                    setStep(3);
                }, 600);
            } else if (step === 3) {
                // Bot starts typing
                timeout = setTimeout(() => {
                    setIsTyping(true);
                    setStep(4);
                }, 500);
            } else if (step === 4) {
                // Bot sends the response
                timeout = setTimeout(() => {
                    setIsTyping(false);
                    setMessages(prev => [...prev, {
                        id: 'bot_response',
                        text: (
                            <div className="space-y-1 font-mono text-sm">
                                <p>✅ Transação registrada com sucesso!</p>
                                <br />
                                <p>💰 Valor: R$ 25,00</p>
                                <p>🔴 Tipo: Despesa</p>
                                <p>📄 Descrição: Corte de cabelo</p>
                                <p>📁 Categoria: Cuidados Pessoais</p>
                                <p>📅 Data: 25-02-2026</p>
                                <p>📌 Status: Pago</p>
                                <br />
                                <p>🆔 ID da transação: 5TPJ5</p>
                                <br />
                                <p>❌ Para excluir, envie:</p>
                                <p className="bg-emerald-900/40 p-1 rounded inline-block text-emerald-200">excluir 5TPJ5</p>
                                <br />
                                <p>Sua transação foi salva! 📝</p>
                            </div>
                        ),
                        isBot: true,
                        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                    }]);
                    setStep(5);
                }, 1800);
            } else if (step === 5) {
                // User sends an audio simulating investment
                timeout = setTimeout(() => {
                    setMessages(prev => [...prev, {
                        id: 'inv',
                        text: (
                            <div className="flex items-center gap-3 min-w-[200px] py-1">
                                <button className="w-9 h-9 rounded-full bg-[#00a884] flex items-center justify-center shrink-0">
                                    <Play className="w-4 h-4 text-white ml-0.5" />
                                </button>
                                <div className="flex-1 flex flex-col gap-1">
                                    <div className="flex items-center gap-0.5 h-4">
                                        {[...Array(15)].map((_, i) => (
                                            <div key={i} className="w-1 bg-white/40 rounded-full animate-pulse" style={{ height: `${Math.random() * 80 + 20}%`, animationDelay: `${i * 0.1}s` }} />
                                        ))}
                                    </div>
                                    <span className="text-[10px] text-white/70 font-semibold font-sans">0:04</span>
                                </div>
                            </div>
                        ),
                        isBot: false,
                        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                        status: 'sent'
                    }]);
                    setStep(6);
                }, 4000);
            } else if (step === 6) {
                timeout = setTimeout(() => {
                    setMessages(prev => prev.map(m => m.id === 'inv' ? { ...m, status: 'read' } : m));
                    setStep(7);
                }, 800);
            } else if (step === 7) {
                timeout = setTimeout(() => {
                    setIsTyping(true);
                    setStep(8);
                }, 600);
            } else if (step === 8) {
                timeout = setTimeout(() => {
                    setIsTyping(false);
                    setMessages(prev => [...prev, {
                        id: 'bot_inv',
                        text: (
                            <div className="space-y-1 font-mono text-sm">
                                <p>📈 Investimento registrado!</p>
                                <br />
                                <p>🏷️ Ativo: Caixinha Nubank (CaixinhaNUB)</p>
                                <p>📂 Tipo: Renda Fixa</p>
                                <p>🔢 Quantidade: 1</p>
                                <p>💵 Preço unitário: R$ 5000,00</p>
                                <p>💰 Total investido: R$ 5000,00</p>
                                <p>📅 Data: 25-02-2026</p>
                                <p>🏦 Corretora: Não informada</p>
                                <br />
                                <p className="text-slate-500">━━━━━━━━━━━━━━━━━━</p>
                                <p>✅ Aporte salvo na sua carteira!</p>
                            </div>
                        ),
                        isBot: true,
                        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                    }]);
                    setStep(9);
                }, 2000);
            } else if (step === 9) {
                timeout = setTimeout(() => {
                    setMessages(prev => [...prev, {
                        id: 'rep',
                        text: 'Quero meu relatório mensal',
                        isBot: false,
                        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                        status: 'sent'
                    }]);
                    setStep(10);
                }, 4000);
            } else if (step === 10) {
                timeout = setTimeout(() => {
                    setMessages(prev => prev.map(m => m.id === 'rep' ? { ...m, status: 'read' } : m));
                    setStep(11);
                }, 600);
            } else if (step === 11) {
                timeout = setTimeout(() => {
                    setIsTyping(true);
                    setStep(12);
                }, 500);
            } else if (step === 12) {
                timeout = setTimeout(() => {
                    setIsTyping(false);
                    setMessages(prev => [...prev, {
                        id: 'bot_rep',
                        text: (
                            <div className="space-y-1 font-mono text-sm leading-relaxed">
                                <p>📋 Relatório Detalhado</p>
                                <p>📅 Período: Este mês (01-02-2026 a 25-02-2026)</p>
                                <p className="text-slate-500 py-1">━━━━━━━━━━━━━━━━━━</p>
                                <p>💰 <b className="font-bold text-[#e9edef]">RESUMO</b></p>
                                <p>🟢 Receitas: R$ 10.000,00</p>
                                <p>🔴 Despesas: R$ 0,00</p>
                                <p>📈 Saldo: R$ 10.000,00</p>
                                <p className="text-slate-500 py-1">━━━━━━━━━━━━━━━━━━</p>
                                <p>📝 <b className="font-bold text-[#e9edef]">TRANSAÇÕES (1)</b></p>
                                <p className="mt-1">🟢 Recebimento de salário</p>
                                <p>💵 R$ 10.000,00</p>
                                <p>📅 25-02-2026</p>
                                <p>🏷️ Trabalho</p>
                                <p>📌 ✅ Pago</p>
                                <p className="text-slate-500 py-1">━━━━━━━━━━━━━━━━━━</p>
                                <p>💡 <b className="font-bold text-[#e9edef]">ANÁLISE</b></p>
                                <p className="mt-1">🎉 Parabéns! Suas receitas superaram as despesas neste mês.</p>
                                <p className="mt-2 text-emerald-300">Sugestão: Considere guardar parte desse saldo para uma reserva de emergência ou investimentos futuros.</p>
                                <p className="text-slate-500 py-1">━━━━━━━━━━━━━━━━━━</p>
                                <p className="text-xs opacity-60">📅 Gerado em: 25-02-2026 às 23:41</p>
                            </div>
                        ),
                        isBot: true,
                        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                    }]);

                    setTimeout(() => setStep(0), 12000);
                }, 2200);
            } else if (step === 0) {
                // reset state 
                setMessages([]);
                setStep(1);
            }
        };

        runSimulation();

        return () => clearTimeout(timeout);
    }, [step, currentTime]);


    return (
        <div className="w-full max-w-sm mx-auto bg-[#0b141a] rounded-[2.5rem] overflow-hidden border-8 border-slate-800 shadow-2xl relative flex flex-col h-[550px]">
            {/* Header */}
            <div className="bg-[#202c33] px-4 py-3 flex items-center gap-3 z-10 shrink-0 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center shrink-0 overflow-hidden relative border border-emerald-400">
                    <img src="/agent-avatar.jpg" alt="Trocô Bot" className="w-full h-full object-cover opacity-90" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-[#e9edef] font-semibold text-[16px] truncate leading-tight">Agente Trocô</h3>
                    <p className="text-[#8696a0] text-[13px] truncate">{isTyping ? 'digitando...' : 'online'}</p>
                </div>
            </div>

            {/* Chat Area - Using WhatsApp Web dark mode colors */}
            <div
                ref={chatContainerRef}
                className="flex-1 p-4 overflow-y-auto bg-[#0b141a] bg-opacity-95 flex flex-col gap-3 scroll-smooth pattern-bg relative"
                style={{ backgroundImage: 'radial-gradient(#202c33 1px, transparent 1px)', backgroundSize: '16px 16px' }}
            >
                {/* Date Header */}
                <div className="flex justify-center my-2">
                    <span className="bg-[#182229] text-[#8696a0] text-xs px-3 py-1 rounded-lg uppercase">Hoje</span>
                </div>

                <AnimatePresence initial={false}>
                    {messages.map((msgBase) => {
                        const isUser = !msgBase.isBot;
                        return (
                            <motion.div
                                key={msgBase.id}
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`relative max-w-[85%] px-3 py-2 rounded-lg shadow-sm text-[15px] leading-relaxed
                                    ${isUser
                                        ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none'
                                        : 'bg-[#202c33] text-[#e9edef] rounded-tl-none'
                                    }`}
                                >
                                    {/* Tail for bubbles */}
                                    <div className={`absolute top-0 w-3 h-3
                                        ${isUser
                                            ? '-right-2.5 bg-[#005c4b]'
                                            : '-left-2.5 bg-[#202c33]'
                                        } 
                                        [clip-path:polygon(${isUser ? '0_0%,100%_0%,0_100%' : '0_0%,100%_0%,100%_100%'})]`}
                                    />

                                    <div className="break-words mr-4 mb-2">{msgBase.text}</div>

                                    <div className="absolute right-2 bottom-1.5 flex items-center gap-1.5">
                                        <span className="text-[10px] text-white/50">{msgBase.time}</span>
                                        {isUser && msgBase.status && (
                                            <CheckCheck
                                                className={`w-[14px] h-[14px] ${msgBase.status === 'read' ? 'text-[#53bdeb]' : 'text-white/50'}`}
                                                strokeWidth={2.5}
                                            />
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )
                    })}
                </AnimatePresence>

                {/* Typing indicator */}
                {isTyping && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex justify-start"
                    >
                        <div className="bg-[#202c33] rounded-lg rounded-tl-none px-4 py-3 relative border border-slate-700/50">
                            <div className="absolute top-0 -left-2.5 w-3 h-3 bg-[#202c33] [clip-path:polygon(0_0%,100%_0%,100%_100%)] border-t border-l border-slate-700/50" />
                            <div className="flex gap-1">
                                {[1, 2, 3].map(i => (
                                    <motion.div
                                        key={i}
                                        className="w-1.5 h-1.5 bg-[#8696a0] rounded-full"
                                        animate={{ y: [0, -4, 0] }}
                                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                                    />
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Input Area */}
            <div className="bg-[#202c33] px-3 py-3 flex items-center gap-2 z-10 shrink-0">
                <div className="flex-1 bg-[#2a3942] rounded-full px-4 py-2.5 text-[#8696a0] text-[15px]">
                    Mensagem
                </div>
                <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center shrink-0">
                    <Mic className="w-5 h-5 text-white" />
                </div>
            </div>
        </div>
    );
};

export default WhatsAppSimulation;
