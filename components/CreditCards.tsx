import React, { useState, ChangeEvent, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import { CreditCard, UserProfile, Transaction } from '../types';
import { Plus, Trash2, Edit2, CreditCard as CardIcon, X, Check, Calendar, CalendarClock, TrendingUp, AlertCircle, Wallet, Star, ShieldCheck, ShieldAlert, ShieldX, Percent, ChevronLeft, ChevronRight, BarChart2, History, Lock } from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import ConfirmationModal from './ConfirmationModal';
import { useNotification } from '../contexts/NotificationContext';
import { getInvoiceReferenceDate, isInvoiceClosed } from '../utils';

import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, CartesianGrid } from 'recharts';

import LimitPaywallModal from './LimitPaywallModal';
import { UsageMeter } from './FreePlanBadge';
import { MastercardIcon, VisaIcon, EloIcon, AmexIcon, HipercardIcon, GenericCardIcon } from './BrandIcons';
import { GlareCard } from './ui/glare-card';

interface CreditCardsProps {
    user: UserProfile;
    cards: CreditCard[];
    transactions: Transaction[];
    fetchCards: (userId: number) => Promise<void>;
    payCardInvoice: (cardId: number, amount: number, transactionIds: string[]) => void;
}

const CreditCards: React.FC<CreditCardsProps> = ({ user, cards, transactions, fetchCards, payCardInvoice }) => {
    const [loading, setLoading] = useState(false);
    const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
    const { showNotification } = useNotification();

    // Confirmation Modal State
    const [cardToDelete, setCardToDelete] = useState<number | null>(null);

    // Invoice Payment Confirmation State
    const [invoiceToPay, setInvoiceToPay] = useState<{ id: number, amount: number, transactionIds: string[] } | null>(null);
    const [isPayInvoiceModalOpen, setIsPayInvoiceModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 6;

    // Invoice Visual State
    const [viewingInvoice, setViewingInvoice] = useState<CreditCard | null>(null);
    const [currentInvoiceDate, setCurrentInvoiceDate] = useState(new Date());
    const [invoiceTab, setInvoiceTab] = useState<'transactions' | 'history'>('transactions');

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        limit_amount: '',
        closing_day: '',
        due_day: '',
        color: '#10B981',
        brand: 'Mastercard',
        current_usage: '',
        cashback_rate: '',
    });

    // Formatting Helper
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const handleLimitChange = (e: ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, "");
        if (!rawValue) {
            setFormData({ ...formData, limit_amount: '' });
            return;
        }
        const numberValue = Number(rawValue) / 100;
        setFormData({ ...formData, limit_amount: formatCurrency(numberValue) });
    };

    // Helper: Get Invoice Date for a transaction
    const getTransactionInvoiceDate = (date: string, closingDay: number) => {
        return getInvoiceReferenceDate(date, closingDay);
    }

    // ─── Health Score (0-100) ─────────────────────────────────────────────────
    const getHealthScore = (usagePct: number): { label: string; color: string; icon: React.ReactNode; bg: string } => {
        if (usagePct <= 30) return { label: 'Saudável', color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: <ShieldCheck className="w-3.5 h-3.5" /> };
        if (usagePct <= 70) return { label: 'Atenção', color: 'text-amber-500', bg: 'bg-amber-500/10', icon: <ShieldAlert className="w-3.5 h-3.5" /> };
        return { label: 'Crítico', color: 'text-rose-500', bg: 'bg-rose-500/10', icon: <ShieldX className="w-3.5 h-3.5" /> };
    };

    // ─── Consolidated Summary ────────────────────────────────────────────────
    const getConsolidatedSummary = () => {
        let totalLimit = 0, totalUsed = 0, totalInvoice = 0, totalCashback = 0;
        cards.forEach(card => {
            const m = getCardMetrics(card);
            totalLimit += card.limit_amount;
            totalUsed += m.totalUsedLimit;
            totalInvoice += m.invoiceAmount;
            if (card.cashback_rate) totalCashback += m.invoiceAmount * (card.cashback_rate / 100);
        });
        return { totalLimit, totalUsed, totalInvoice, totalCashback, availableLimit: totalLimit - totalUsed };
    };

    const getCardMetrics = (card: CreditCard) => {
        const { id: cardId, limit_amount: limit, closing_day: closingDay, current_usage: dbUsage } = card;
        const now = new Date();
        const currentInvoiceMonth = now.getDate() >= closingDay
            ? new Date(now.getFullYear(), now.getMonth() + 1, 1)
            : new Date(now.getFullYear(), now.getMonth(), 1);

        const cardTransactions = transactions.filter(t => {
            if (t.cardId !== cardId || t.type !== 'expense') return false;

            const tInvoiceDate = getTransactionInvoiceDate(t.date, closingDay);
            return tInvoiceDate.getTime() === currentInvoiceMonth.getTime();
        });

        const invoiceAmount = cardTransactions.reduce((sum, t) => sum + t.amount, 0);

        // Available limit should consider ALL pending expenses
        const allPendingExpenses = transactions.filter(t => t.cardId === cardId && t.status === 'pending' && t.type === 'expense');
        const computedUsage = allPendingExpenses.reduce((sum, t) => sum + t.amount, 0);

        // Use the higher of DB-stored usage or computed from transactions
        const totalUsedLimit = Math.max(dbUsage || 0, computedUsage);
        const availableLimit = limit - totalUsedLimit;
        const usagePercentage = Math.min(150, (totalUsedLimit / limit) * 100); // cap at 150% for visual

        return { invoiceAmount, availableLimit, currentInvoiceMonth, totalUsedLimit, usagePercentage };
    };

    const handleOpenModal = (card?: CreditCard) => {
        const isSuper = user?.status_assinatura === 'active';
        if (!card && !isSuper && cards.length >= 2) { setIsLimitModalOpen(true); return; }

        if (card) {
            setEditingCard(card);
            setFormData({
                name: card.name,
                limit_amount: formatCurrency(card.limit_amount),
                closing_day: card.closing_day.toString(),
                due_day: card.due_day.toString(),
                color: card.color,
                brand: card.brand || 'Mastercard',
                current_usage: card.current_usage ? formatCurrency(card.current_usage) : '',
                cashback_rate: card.cashback_rate ? card.cashback_rate.toString() : '',
            });
        } else {
            setEditingCard(null);
            setFormData({ name: '', limit_amount: '', closing_day: '', due_day: '', color: '#10B981', brand: 'Mastercard', current_usage: '', cashback_rate: '' });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const rawAmount = formData.limit_amount.toString().replace(/\D/g, "");
        const limitFloat = rawAmount ? Number(rawAmount) / 100 : 0;

        const rawUsage = formData.current_usage.toString().replace(/\D/g, "");
        const usageFloat = rawUsage ? Number(rawUsage) / 100 : 0;

        const payload = {
            user_id: user.id,
            name: formData.name,
            limit_amount: limitFloat,
            current_usage: usageFloat,
            closing_day: parseInt(formData.closing_day),
            due_day: parseInt(formData.due_day),
            color: formData.color,
            brand: formData.brand,
            cashback_rate: formData.cashback_rate ? parseFloat(formData.cashback_rate) : null,
        };

        try {
            if (editingCard) {
                const { error } = await supabase
                    .from('credit_cards')
                    .update(payload)
                    .eq('id', editingCard.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('credit_cards')
                    .insert([payload]);
                if (error) throw error;
            }
            await fetchCards(user.id);
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving card:', error);
            showNotification({
                title: 'Erro',
                message: 'Erro ao salvar cartão.',
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (id: number) => {
        setCardToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!cardToDelete) return;

        try {
            const { error } = await supabase.from('credit_cards').delete().eq('id', cardToDelete);
            if (error) throw error;
            fetchCards(user.id);
            setIsDeleteModalOpen(false);
            setCardToDelete(null);
        } catch (error) {
            console.error("Error deleting:", error);
            showNotification({
                title: 'Erro',
                message: 'Erro ao excluir o cartão.',
                type: 'error'
            });
        }
    };

    // Visual Helper for Gradient
    const getGradient = (hexColor: string) => {
        return `linear-gradient(135deg, ${hexColor} 0%, ${adjustColor(hexColor, -40)} 100%)`;
    };

    function adjustColor(color: string, amount: number) {
        return '#' + color.replace(/^#/, '').replace(/../g, color => ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
    }

    const handleViewInvoice = (card: CreditCard) => {
        setViewingInvoice(card);
        // Set initial invoice date based on current date and closing date
        const now = new Date();
        const initialDate = now.getDate() >= card.closing_day
            ? new Date(now.getFullYear(), now.getMonth() + 1, 1)
            : new Date(now.getFullYear(), now.getMonth(), 1);
        setCurrentInvoiceDate(initialDate);
    };

    const handlePayInvoiceClick = (id: number, amount: number, transactionIds: string[]) => {
        setInvoiceToPay({ id, amount, transactionIds });
        setIsPayInvoiceModalOpen(true);
    };

    const confirmPayInvoice = () => {
        if (!invoiceToPay) return;
        payCardInvoice(invoiceToPay.id, invoiceToPay.amount, invoiceToPay.transactionIds);
        setViewingInvoice(null);
        setIsPayInvoiceModalOpen(false);
        setInvoiceToPay(null);
    };

    // Invoice Navigation
    const prevInvoice = () => {
        setCurrentInvoiceDate(prev => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() - 1);
            return d;
        });
    };

    const nextInvoice = () => {
        setCurrentInvoiceDate(prev => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() + 1);
            return d;
        });
    };

    const renderBrandIcon = (brandName?: string, className = "h-4") => {
        const name = brandName?.toLowerCase() || '';

        // Helper inline block para centralizar icones pequenos no formato de texto
        const inlineClass = `inline-flex items-center justify-center ${className}`;

        if (name.includes('master')) return <MastercardIcon className={className} />;
        if (name.includes('visa')) return <VisaIcon className={className} />;
        if (name.includes('elo')) return <EloIcon className={className} />;
        if (name.includes('american') || name.includes('amex')) return <AmexIcon className={className} />;
        if (name.includes('hipercard')) return <HipercardIcon className={className} />;

        return <GenericCardIcon className={className} />;
    };

    // Bank Logo Helper
    const getBankLogo = (cardName: string) => {
        const n = cardName.toLowerCase();
        if (n.includes('nu') || n.includes('roxinho')) return <div className="w-8 h-8 rounded-lg bg-[#8A05BE] flex items-center justify-center font-bold text-white text-xs">nu</div>;
        if (n.includes('itaú') || n.includes('itau')) return <div className="w-8 h-8 rounded-lg bg-[#EC7000] flex items-center justify-center font-bold text-blue-900 text-xs">itaú</div>;
        if (n.includes('inter')) return <div className="w-8 h-8 rounded-lg bg-[#FF7A00] flex items-center justify-center font-bold text-white text-[10px]">inter</div>;
        if (n.includes('c6')) return <div className="w-8 h-8 rounded-lg bg-[#242424] border border-white/20 flex items-center justify-center font-bold text-white text-xs">C6</div>;
        if (n.includes('xp')) return <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center font-bold text-[#FFD700] text-xs">XP</div>;
        if (n.includes('bradesco')) return <div className="w-8 h-8 rounded-lg bg-[#CC092F] flex items-center justify-center font-bold text-white text-[9px]">Bradesco</div>;
        if (n.includes('bb') || n.includes('brasil')) return <div className="w-8 h-8 rounded-lg bg-[#F9D308] flex items-center justify-center font-bold text-[#003DA5] text-xs">bb</div>;
        if (n.includes('santander')) return <div className="w-8 h-8 rounded-lg bg-[#EC0000] flex items-center justify-center font-bold text-[8px]">Santander</div>;
        if (n.includes('btg')) return <div className="w-8 h-8 rounded-lg bg-[#002D54] flex items-center justify-center font-bold text-white text-[10px]">BTG</div>;

        return <CardIcon className="w-8 h-8 opacity-80" />;
    };

    // Variants para a animação staggered
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, scale: 0.9 },
        show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
    };

    const PRESET_COLORS = [
        '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#6366F1', '#EF4444', '#1F2937'
    ];

    const BRANDS = [
        'Mastercard', 'Visa', 'Elo', 'American Express', 'Hipercard', 'Outra'
    ];

    return (
        <div className="space-y-6 sm:space-y-8 animate-fade-in-up">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">Meus Cartões</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Gerencie seus limites e vencimentos</p>
                    {user.status_assinatura !== 'active' && (
                        <div className="mt-2 max-w-[200px]"><UsageMeter current={cards.length} max={2} label="cartões" /></div>
                    )}
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-primary-500/20 active:scale-95 self-start sm:self-auto"
                >
                    <Plus className="w-5 h-5" />
                    Novo Cartão
                </button>
            </div>

            {/* ── Consolidated Summary Panel ─────────────────────────────── */}
            {cards.length > 0 && (() => {
                const s = getConsolidatedSummary();
                const totalPct = Math.min(100, (s.totalUsed / s.totalLimit) * 100);
                const barColor = totalPct >= 80 ? '#EF4444' : totalPct >= 50 ? '#F59E0B' : '#10B981';
                return (
                    <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 sm:p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <Wallet className="w-5 h-5 text-emerald-500" />
                            <h3 className="font-bold text-slate-800 dark:text-white">Resumo Consolidado</h3>
                            <span className="text-xs text-slate-400 ml-1">{cards.length} cartão{cards.length !== 1 ? 'ões' : ''}</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                            {[
                                { label: 'Limite Total', value: s.totalLimit, color: 'text-slate-800 dark:text-white' },
                                { label: 'Utilizado', value: s.totalUsed, color: totalPct >= 80 ? 'text-rose-500' : 'text-amber-500' },
                                { label: 'Disponível', value: s.availableLimit, color: 'text-emerald-500' },
                                { label: 'Faturas Abertas', value: s.totalInvoice, color: 'text-blue-500' },
                            ].map(item => (
                                <div key={item.label} className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3">
                                    <p className="text-xs text-slate-400 mb-1">{item.label}</p>
                                    <p className={`font-bold text-sm sm:text-base ${item.color}`}>
                                        R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${totalPct}%`, background: barColor }} />
                        </div>
                        <div className="flex justify-between mt-1.5 text-xs text-slate-400">
                            <span>{Math.round(totalPct)}% do limite total utilizado</span>
                            {s.totalCashback > 0 && (
                                <span className="flex items-center gap-1 text-emerald-500 font-semibold">
                                    <Star className="w-3 h-3" />
                                    Cashback estimado: R$ {s.totalCashback.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* ── Due Date Timeline ──────────────────────────────────────── */}
            {cards.length > 0 && (() => {
                const today = new Date().getDate();
                const sorted = [...cards].sort((a, b) => {
                    const dA = a.due_day >= today ? a.due_day - today : a.due_day + 31 - today;
                    const dB = b.due_day >= today ? b.due_day - today : b.due_day + 31 - today;
                    return dA - dB;
                });
                return (
                    <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 sm:p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <Calendar className="w-5 h-5 text-blue-500" />
                            <h3 className="font-bold text-slate-800 dark:text-white">Próximos Vencimentos</h3>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            {sorted.map(card => {
                                let days = card.due_day - today;
                                if (days < 0) days += 31;
                                const urgent = days <= 3;
                                const soon = days <= 7;
                                const { invoiceAmount } = getCardMetrics(card);
                                return (
                                    <div key={card.id}
                                        className={`flex items-center gap-3 flex-1 p-3 rounded-xl border transition-all
                                            ${urgent ? 'border-rose-200 dark:border-rose-800/50 bg-rose-50 dark:bg-rose-900/10'
                                                : soon ? 'border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/10'
                                                    : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30'}`}
                                    >
                                        <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-black text-white text-sm"
                                            style={{ background: card.color }}>
                                            {card.due_day}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-slate-800 dark:text-white text-sm truncate">{card.name}</p>
                                            <p className={`text-xs font-medium ${urgent ? 'text-rose-500' : soon ? 'text-amber-500' : 'text-slate-400'}`}>
                                                {days === 0 ? '⚠ Vence HOJE' : `${days}d restante${days !== 1 ? 's' : ''}`}
                                            </p>
                                            {invoiceAmount > 0 && (
                                                <p className="text-xs text-slate-400">R$ {invoiceAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}

            <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
                variants={containerVariants}
                initial="hidden"
                animate="show"
            >
                <AnimatePresence>
                    {cards.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((card) => {
                        const { invoiceAmount, availableLimit, currentInvoiceMonth, totalUsedLimit, usagePercentage } = getCardMetrics(card);

                        const isOverLimit = totalUsedLimit > card.limit_amount;
                        const barColor = usagePercentage >= 100 ? '#EF4444'
                            : usagePercentage >= 75 ? '#F59E0B'
                                : '#34D399';
                        const clampedPct = Math.min(100, usagePercentage);
                        const health = getHealthScore(usagePercentage);
                        const cashback = card.cashback_rate ? invoiceAmount * (card.cashback_rate / 100) : 0;

                        return (
                            <motion.div
                                key={card.id}
                                className="relative group"
                                variants={itemVariants}
                                layout
                                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                            >
                                {/* 3D Card Visual */}
                                <GlareCard className="w-full">
                                    <div
                                        className="h-64 w-full rounded-2xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between cursor-pointer"
                                        style={{ background: getGradient(card.color) }}
                                        onClick={() => handleViewInvoice(card)}
                                    >
                                        {/* ... (Card Visuals remain the same) ... */}
                                        {/* Background Pattern */}
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl -ml-5 -mb-5"></div>

                                        <div className="flex justify-between items-start relative z-10">
                                            <div className="flex items-center gap-3">
                                                {getBankLogo(card.name)}
                                                <div>
                                                    <div className="mb-0.5">
                                                        {renderBrandIcon(card.brand, "h-5 text-white/90")}
                                                    </div>
                                                    <h3 className="text-xl font-bold mt-0.5 tracking-wide">{card.name}</h3>
                                                </div>
                                            </div>

                                            {/* Right-side badges: Smart Alert → Health Score */}
                                            <div className="flex flex-col items-end gap-1">
                                                {(() => {
                                                    const today = new Date().getDate();
                                                    const bestDay = today >= card.closing_day && today <= card.closing_day + 3;
                                                    let daysToDue = card.due_day - today;
                                                    if (daysToDue < 0) daysToDue += 31;
                                                    const dueSoon = daysToDue <= 5 && daysToDue >= 0;

                                                    const refDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
                                                    const isClosed = isInvoiceClosed(card.closing_day, refDate);

                                                    if (isClosed) return <span className="bg-rose-500/80 backdrop-blur-sm text-white text-[10px] uppercase font-bold px-2 py-1 rounded-full flex items-center gap-1 animate-pulse"><Lock className="w-3 h-3" /> Fatura Fechada</span>;
                                                    if (bestDay) return <span className="bg-emerald-500/80 backdrop-blur-sm text-white text-[10px] uppercase font-bold px-2 py-1 rounded-full flex items-center gap-1"><Check className="w-3 h-3" /> Melhor Dia</span>;
                                                    if (dueSoon) return <span className="bg-orange-500/80 backdrop-blur-sm text-white text-[10px] uppercase font-bold px-2 py-1 rounded-full flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Vence em {daysToDue}d</span>;
                                                    return null;
                                                })()}
                                                <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-black/20 backdrop-blur-sm ${health.color}`}>
                                                    {health.icon} {health.label}
                                                </span>
                                                {cashback > 0 && (
                                                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-white/20 text-white">
                                                        <Star className="w-3 h-3" />
                                                        R$ {cashback.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-4 relative z-10">
                                            <div>
                                                {/* Usage header row */}
                                                <div className="flex justify-between text-xs mb-1 opacity-90">
                                                    <span>Valor Consumido</span>
                                                    <span className="font-bold">R$ {totalUsedLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                </div>

                                                {/* Colour-coded limit progress bar */}
                                                <div className="relative w-full bg-black/30 rounded-full h-3 overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-700 ease-out"
                                                        style={{ width: `${clampedPct}%`, background: barColor, boxShadow: `0 0 8px ${barColor}99` }}
                                                    />
                                                    {/* Overflow flash when over limit */}
                                                    {isOverLimit && (
                                                        <div className="absolute inset-0 rounded-full animate-pulse bg-red-500/30" />
                                                    )}
                                                </div>

                                                {/* Bottom row */}
                                                <div className="flex justify-between text-xs mt-1.5 opacity-90">
                                                    <span className="flex items-center gap-1">
                                                        {isOverLimit
                                                            ? <span className="font-black text-red-300 animate-pulse">⚠ ESTOURADO</span>
                                                            : <span>Disponível</span>
                                                        }
                                                    </span>
                                                    <span className="font-bold" style={{ color: isOverLimit ? '#FCA5A5' : 'white' }}>
                                                        R$ {Math.abs(availableLimit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center text-sm pt-2 border-t border-white/20">
                                                <div className="flex items-center gap-1.5">
                                                    <CalendarClock className="w-4 h-4 opacity-75" />
                                                    <span>Fecha dia {card.closing_day}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="w-4 h-4 opacity-75" />
                                                    <span>Vence dia {card.due_day}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-[2px] rounded-2xl z-20">
                                            <span className="bg-white text-slate-900 px-4 py-2 rounded-full font-bold text-sm shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform">
                                                Ver Fatura
                                            </span>
                                        </div>
                                    </div>
                                </GlareCard>

                                {/* Action Buttons — always visible on mobile, hover on desktop */}
                                <div className="flex gap-2 mt-2 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleOpenModal(card); }}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-800/30 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-semibold transition-all active:scale-95 border border-blue-200 dark:border-blue-700/50"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" /> Editar
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(card.id); }}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:hover:bg-rose-800/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold transition-all active:scale-95 border border-rose-200 dark:border-rose-700/50"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Excluir
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {/* ── Cards Grid ─────────────────────────────────────────────── */}
                {cards.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl"
                    >
                        <CardIcon className="w-12 h-12 mb-4 opacity-50" />
                        <p>Nenhum cartão cadastrado ainda.</p>
                    </motion.div>
                )}
            </motion.div>

            {/* Pagination Controls */}
            {cards.length > ITEMS_PER_PAGE && (
                <div className="flex justify-center items-center gap-4 mt-8">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <div className="w-5 h-5 flex items-center justify-center">←</div>
                    </button>

                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Página {currentPage} de {Math.ceil(cards.length / ITEMS_PER_PAGE)}
                    </span>

                    <button
                        onClick={() => setCurrentPage(p => Math.min(Math.ceil(cards.length / ITEMS_PER_PAGE), p + 1))}
                        disabled={currentPage === Math.ceil(cards.length / ITEMS_PER_PAGE)}
                        className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <div className="w-5 h-5 flex items-center justify-center">→</div>
                    </button>
                </div>
            )}

            {/* Create/Edit Modal with Portal */}
            {isModalOpen && createPortal(
                <div className="fixed inset-0 z-[100] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                        <div
                            className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm transition-opacity"
                            aria-hidden="true"
                            onClick={() => setIsModalOpen(false)}
                        />
                        <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>
                        <div className="relative inline-block transform overflow-hidden rounded-3xl bg-white dark:bg-slate-850 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-slate-100 dark:border-slate-800 align-bottom sm:align-middle w-full">
                            {/* ... (Existing Modal Content) ... */}
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 rounded-t-3xl">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                                    {editingCard ? 'Editar Cartão' : 'Novo Cartão'}
                                </h3>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nome do Cartão</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all placeholder-slate-400"
                                        placeholder="Ex: Nubank, XP Visa Infinite"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Limite do Cartão</label>
                                    <input
                                        type="text" // Type text for masking
                                        required
                                        value={formData.limit_amount}
                                        onChange={handleLimitChange}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all font-mono"
                                        placeholder="R$ 0,00"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Valor Já Consumido
                                        <span className="ml-2 text-xs text-slate-400 font-normal">(quanto já foi gasto no limite)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.current_usage}
                                        onChange={e => {
                                            const raw = e.target.value.replace(/\D/g, '');
                                            const num = raw ? Number(raw) / 100 : 0;
                                            setFormData({ ...formData, current_usage: raw ? formatCurrency(num) : '' });
                                        }}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all font-mono"
                                        placeholder="R$ 0,00"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Dia Fechamento</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min="1" max="31"
                                                required
                                                value={formData.closing_day}
                                                onChange={e => setFormData({ ...formData, closing_day: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                                placeholder="Ex: 5"
                                            />
                                            <CalendarClock className="absolute right-3 top-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Dia Vencimento</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min="1" max="31"
                                                required
                                                value={formData.due_day}
                                                onChange={e => setFormData({ ...formData, due_day: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                                placeholder="Ex: 12"
                                            />
                                            <Calendar className="absolute right-3 top-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>

                                {/* Cashback Rate */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Cashback
                                        <span className="ml-2 text-xs text-slate-400 font-normal">(opcional — % sobre os gastos)</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="0" max="10" step="0.1"
                                            value={formData.cashback_rate}
                                            onChange={e => setFormData({ ...formData, cashback_rate: e.target.value })}
                                            className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                            placeholder="Ex: 1.5"
                                        />
                                        <Percent className="absolute right-3 top-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>

                                {/* Brand Selector */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Bandeira</label>
                                    <div className="flex flex-wrap gap-2 sm:gap-3">
                                        {BRANDS.map(brand => (
                                            <button
                                                key={brand}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, brand })}
                                                className={`flex items-center gap-2.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border transition-all text-sm font-medium
                                                    ${formData.brand === brand
                                                        ? 'bg-primary-500 text-white border-primary-500 shadow-md ring-2 ring-primary-500/20'
                                                        : 'bg-white hover:bg-slate-50 dark:bg-slate-900/50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-center w-8">
                                                    {renderBrandIcon(brand, formData.brand === brand ? "h-5 text-white" : "h-5 text-slate-500 dark:text-slate-400")}
                                                </div>
                                                <span className="truncate">{brand}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Cor do Cartão</label>
                                    <div className="flex flex-wrap gap-4 pb-2">
                                        {PRESET_COLORS.map(color => (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, color })}
                                                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${formData.color === color ? 'ring-2 ring-offset-4 ring-primary-500 shadow-md' : 'hover:scale-110'}`}
                                                style={{ background: color }}
                                            >
                                                {formData.color === color && <Check className="w-5 h-5 text-white drop-shadow-md" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-primary-500/25 active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (editingCard ? 'Atualizar Cartão' : 'Criar Cartão')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Invoice View Modal */}
            {viewingInvoice && createPortal(
                <div className="fixed inset-0 z-[100] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                        <div
                            className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm transition-opacity"
                            aria-hidden="true"
                            onClick={() => setViewingInvoice(null)}
                        />
                        <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>
                        <div className="relative inline-block transform overflow-hidden rounded-3xl bg-white dark:bg-slate-850 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl border border-slate-100 dark:border-slate-800 align-bottom sm:align-middle w-full">

                            {/* Header */}
                            <div className="relative p-6 text-white overflow-hidden" style={{ background: getGradient(viewingInvoice.color) }}>
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                                <button
                                    onClick={() => setViewingInvoice(null)}
                                    className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/30 text-white rounded-full transition-colors z-20"
                                >
                                    <X className="w-5 h-5" />
                                </button>

                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-2">
                                        <CardIcon className="w-8 h-8 opacity-90" />
                                        <h3 className="text-2xl font-bold tracking-tight">{viewingInvoice.name}</h3>
                                    </div>

                                    {/* Date Navigation */}
                                    <div className="flex items-center gap-4 mt-4 bg-black/20 backdrop-blur-sm rounded-xl p-2 w-fit">
                                        <button onClick={prevInvoice} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                                            <div className="w-6 h-6 flex items-center justify-center">←</div>
                                        </button>
                                        <div className="text-center min-w-[120px]">
                                            <span className="text-xs uppercase tracking-wider opacity-80 block">Competência</span>
                                            <span className="font-bold">
                                                {currentInvoiceDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                            </span>
                                        </div>
                                        <button onClick={nextInvoice} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                                            <div className="w-6 h-6 flex items-center justify-center">→</div>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                {/* Metrics Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                    <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Fatura de {currentInvoiceDate.toLocaleDateString('pt-BR', { month: 'long' })}</p>
                                        {(() => {
                                            const invoiceTxs = transactions.filter(t => {
                                                if (t.cardId !== viewingInvoice.id || t.type !== 'expense') return false;
                                                const tInvoiceDate = getTransactionInvoiceDate(t.date, viewingInvoice.closing_day);
                                                return tInvoiceDate.getTime() === currentInvoiceDate.getTime();
                                            });
                                            const invoiceTotal = invoiceTxs.reduce((sum, t) => sum + t.amount, 0);

                                            // Global limit usage — MAX of DB-stored or computed from transactions
                                            const allPending = transactions.filter(t => t.cardId === viewingInvoice.id && t.status === 'pending' && t.type === 'expense');
                                            const computedUsage = allPending.reduce((sum, t) => sum + t.amount, 0);
                                            const totalUsedLimit = Math.max(viewingInvoice.current_usage || 0, computedUsage);
                                            const usagePercentage = Math.min(100, (totalUsedLimit / viewingInvoice.limit_amount) * 100);
                                            const barClr = usagePercentage >= 100 ? '#EF4444' : usagePercentage >= 75 ? '#F59E0B' : '#10B981';

                                            return (
                                                <>
                                                    <p className="text-2xl font-bold text-slate-800 dark:text-white">
                                                        R$ {totalUsedLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </p>
                                                    {invoiceTotal > 0 && invoiceTotal !== totalUsedLimit && (
                                                        <p className="text-xs text-slate-400 mt-0.5">Fatura do mês: R$ {invoiceTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                    )}
                                                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mt-3 overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full transition-all duration-700"
                                                            style={{ width: `${usagePercentage}%`, background: barClr }}
                                                        />
                                                    </div>
                                                    <p className="text-xs text-slate-400 mt-2">
                                                        {Math.round(usagePercentage)}% do limite total utilizado
                                                    </p>
                                                </>
                                            );
                                        })()}
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Limite Disponível Global</p>
                                        {(() => {
                                            const allPending = transactions.filter(t => t.cardId === viewingInvoice.id && t.status === 'pending' && t.type === 'expense');
                                            const computedUsage = allPending.reduce((sum, t) => sum + t.amount, 0);
                                            const totalUsedLimit = Math.max(viewingInvoice.current_usage || 0, computedUsage);
                                            const available = viewingInvoice.limit_amount - totalUsedLimit;
                                            const isOver = available < 0;

                                            return (
                                                <p className={`text-2xl font-bold ${isOver ? 'text-red-500' : 'text-emerald-500'}`}>
                                                    {isOver ? '-' : ''}R$ {Math.abs(available).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </p>
                                            )
                                        })()}

                                        <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
                                            <Calendar className="w-3 h-3" />
                                            <span>Fecha dia {viewingInvoice.closing_day}</span>
                                            <span className="mx-1">•</span>
                                            <CalendarClock className="w-3 h-3" />
                                            <span>Vence dia {viewingInvoice.due_day}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Charts & Analysis */}
                                {(() => {
                                    const invoiceTxs = transactions.filter(t => {
                                        if (t.cardId !== viewingInvoice.id || t.type !== 'expense') return false;
                                        const tInvoiceDate = getTransactionInvoiceDate(t.date, viewingInvoice.closing_day);
                                        return tInvoiceDate.getTime() === currentInvoiceDate.getTime();
                                    });

                                    // Bar Chart Data (Last 6 months)
                                    const barData = Array.from({ length: 6 }).map((_, i) => {
                                        const d = new Date(currentInvoiceDate);
                                        d.setMonth(d.getMonth() - (5 - i));

                                        const mtxs = transactions.filter(t => {
                                            if (t.cardId !== viewingInvoice.id || t.type !== 'expense') return false;
                                            const tInvDate = getTransactionInvoiceDate(t.date, viewingInvoice.closing_day);
                                            return tInvDate.getTime() === d.getTime();
                                        });

                                        return {
                                            name: d.toLocaleDateString('pt-BR', { month: 'short' }),
                                            amount: mtxs.reduce((sum, t) => sum + t.amount, 0)
                                        };
                                    });

                                    // Pie Chart Data
                                    const categoryTotals = invoiceTxs.reduce((acc, t) => {
                                        acc[t.category] = (acc[t.category] || 0) + t.amount;
                                        return acc;
                                    }, {} as Record<string, number>);

                                    const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#6366F1'];
                                    const pieData = Object.entries(categoryTotals)
                                        .map(([name, value]) => ({ name, value }))
                                        .sort((a, b) => b.value - a.value);

                                    return invoiceTxs.length > 0 || barData.some(d => d.amount > 0) ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                            {/* Evolution Bar Chart */}
                                            <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Evolução (6 meses)</h4>
                                                <div className="h-40">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                                                            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                                                            <Tooltip
                                                                cursor={{ fill: 'rgba(51, 65, 85, 0.1)' }}
                                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                                formatter={(val: number) => [`R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Fatura']}
                                                            />
                                                            <Bar dataKey="amount" fill={viewingInvoice.color} radius={[4, 4, 0, 0]} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>

                                            {/* Category Pie Chart */}
                                            <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Por Categoria</h4>
                                                <div className="h-40 flex items-center justify-between">
                                                    <div className="w-1/2 h-full">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <PieChart>
                                                                <Pie
                                                                    data={pieData}
                                                                    innerRadius={30}
                                                                    outerRadius={45}
                                                                    paddingAngle={5}
                                                                    dataKey="value"
                                                                >
                                                                    {pieData.map((entry, index) => (
                                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                                    ))}
                                                                </Pie>
                                                                <Tooltip formatter={(val: number) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                                                            </PieChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                    <div className="w-1/2 overflow-y-auto max-h-40 custom-scrollbar pr-1">
                                                        {pieData.map((entry, index) => (
                                                            <div key={entry.name} className="flex items-center justify-between text-xs mb-2 last:mb-0">
                                                                <div className="flex items-center gap-1.5 truncate">
                                                                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                                                    <span className="text-slate-600 dark:text-slate-300 truncate" title={entry.name}>{entry.name}</span>
                                                                </div>
                                                                <span className="font-medium text-slate-800 dark:text-white ml-2">
                                                                    {Math.round((entry.value / categoryTotals[entry.name]) * 100) || Math.round((entry.value / pieData.reduce((s, d) => s + d.value, 0)) * 100)}%
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : null;
                                })()}

                                {/* Transaction List or History Tabs */}
                                <div>
                                    <div className="flex gap-4 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
                                        <button
                                            onClick={() => setInvoiceTab('transactions')}
                                            className={`font-bold pb-2 border-b-2 transition-colors flex items-center gap-2 ${invoiceTab === 'transactions' ? 'text-primary-500 border-primary-500' : 'text-slate-400 border-transparent hover:text-slate-600 dark:hover:text-slate-300'}`}
                                        >
                                            <TrendingUp className="w-4 h-4" />
                                            Fatura Atual
                                        </button>
                                        <button
                                            onClick={() => setInvoiceTab('history')}
                                            className={`font-bold pb-2 border-b-2 transition-colors flex items-center gap-2 ${invoiceTab === 'history' ? 'text-primary-500 border-primary-500' : 'text-slate-400 border-transparent hover:text-slate-600 dark:hover:text-slate-300'}`}
                                        >
                                            <History className="w-4 h-4" />
                                            Histórico de Pagamentos
                                        </button>
                                    </div>

                                    {invoiceTab === 'transactions' ? (
                                        <>
                                            <div className="flex justify-between items-center mb-4">
                                                <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                                    Transações nesta Fatura
                                                </h4>

                                                {(() => {
                                                    const invoiceTxs = transactions.filter(t => {
                                                        if (t.cardId !== viewingInvoice.id || t.type !== 'expense') return false;
                                                        const tInvoiceDate = getTransactionInvoiceDate(t.date, viewingInvoice.closing_day);
                                                        return tInvoiceDate.getTime() === currentInvoiceDate.getTime();
                                                    });
                                                    // Permite pagar as que estão pendentes e pertencem a essa fatura
                                                    const pendingInInvoice = invoiceTxs.filter(t => t.status === 'pending');
                                                    const pendingAmount = pendingInInvoice.reduce((s, t) => s + t.amount, 0);

                                                    if (pendingInInvoice.length > 0) {
                                                        return (
                                                            <button
                                                                onClick={() => {
                                                                    handlePayInvoiceClick(viewingInvoice.id, pendingAmount, pendingInInvoice.map(t => t.id));
                                                                }}
                                                                className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-sm shadow-emerald-500/20 transition-all flex items-center gap-1"
                                                            >
                                                                <Check className="w-3.5 h-3.5" />
                                                                Pagar Fatura
                                                            </button>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </div>

                                            <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                                {(() => {
                                                    const invoiceTxs = transactions.filter(t => {
                                                        if (t.cardId !== viewingInvoice.id || t.type !== 'expense') return false;
                                                        const tInvoiceDate = getTransactionInvoiceDate(t.date, viewingInvoice.closing_day);
                                                        return tInvoiceDate.getTime() === currentInvoiceDate.getTime();
                                                    })
                                                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                                                    return (
                                                        <>
                                                            {invoiceTxs.map((transaction) => (
                                                                <div key={transaction.id} className="flex justify-between items-center p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 transition-colors">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center text-red-500">
                                                                            <TrendingUp className="w-5 h-5 transform rotate-180" />
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-semibold text-slate-800 dark:text-white">{transaction.description}</p>
                                                                            <p className="text-xs text-slate-400">
                                                                                {new Date(transaction.date + 'T12:00:00').toLocaleDateString('pt-BR')} • {transaction.category}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <span className="font-bold text-red-500">
                                                                        - R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                    </span>
                                                                </div>
                                                            ))}

                                                            {invoiceTxs.length === 0 && (
                                                                <div className="text-center py-8 text-slate-400">
                                                                    <div className="bg-slate-50 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                                                                        <Check className="w-8 h-8 opacity-50" />
                                                                    </div>
                                                                    <p>Nenhuma transação nesta fatura.</p>
                                                                </div>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                            {(() => {
                                                const historyTxs = transactions.filter(t =>
                                                    t.cardId === viewingInvoice.id &&
                                                    t.description.startsWith('Pagamento de Fatura') &&
                                                    t.type === 'expense'
                                                ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                                                return (
                                                    <>
                                                        {historyTxs.map((transaction) => (
                                                            <div key={transaction.id} className="flex justify-between items-center p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 transition-colors">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                                                        <Check className="w-5 h-5" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-semibold text-slate-800 dark:text-white">{transaction.description}</p>
                                                                        <p className="text-xs text-slate-400">
                                                                            {new Date(transaction.date + 'T12:00:00').toLocaleDateString('pt-BR')} • {transaction.category}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <span className="font-bold text-emerald-500">
                                                                    R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                </span>
                                                            </div>
                                                        ))}

                                                        {historyTxs.length === 0 && (
                                                            <div className="text-center py-8 text-slate-400">
                                                                <div className="bg-slate-50 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                                                                    <History className="w-8 h-8 opacity-50" />
                                                                </div>
                                                                <p>Nenhum pagamento registrado ainda.</p>
                                                            </div>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Excluir Cartão"
                message="Tem certeza que deseja excluir este cartão? Todas as transações associadas perderão o vínculo, mas não serão apagadas."
                confirmText="Excluir"
                cancelText="Cancelar"
                type="danger"
            />

            {/* Limit Reached Modal */}
            <LimitPaywallModal
                isOpen={isLimitModalOpen}
                onClose={() => setIsLimitModalOpen(false)}
                title="Limite Atingido"
                description="No plano gratuito você pode ter até 2 cartões. Assine o Super Trocô para cadastrar cartões ilimitados e ter controle total."
                userEmail={user?.email}
            />

            {/* Pay Invoice Confirmation Modal */}
            <ConfirmationModal
                isOpen={isPayInvoiceModalOpen}
                onClose={() => setIsPayInvoiceModalOpen(false)}
                onConfirm={confirmPayInvoice}
                title="Pagar Fatura"
                message={`Tem certeza que deseja registrar o pagamento desta fatura no valor de R$ ${invoiceToPay?.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}? As transações serão marcadas como pagas e o limite do cartão será liberado.`}
                confirmText="Pagar Fatura"
                cancelText="Cancelar"
                type="info"
            />
        </div>
    );
};

export default CreditCards;
