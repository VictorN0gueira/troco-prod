import React, { useState, ChangeEvent, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import { CreditCard, UserProfile, Transaction, BankAccount } from '../types';
import { Plus, Trash2, Edit2, CreditCard as CardIcon, X, Check, Calendar, CalendarClock, TrendingUp, AlertCircle, Wallet, Star, ShieldCheck, ShieldAlert, ShieldX, Percent, ChevronLeft, ChevronRight, BarChart2, History, Lock } from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import ConfirmationModal from './ConfirmationModal';
import { useNotification } from '../contexts/NotificationContext';
import { getInvoiceReferenceDate, isInvoiceClosed } from '../utils';

import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, CartesianGrid } from 'recharts';

import LimitPaywallModal from './LimitPaywallModal';
import { UsageMeter } from './FreePlanBadge';
import { GlareCard } from './ui/glare-card';
import { CustomSelect } from './CustomSelect';
import CreditCardForm from './CreditCards/CreditCardForm';
import InvoiceViewer from './CreditCards/InvoiceViewer';
import { renderBrandIcon } from './CreditCards/BrandIconsWrapper';
import { getBankLogo } from './CreditCards/BankLogosWrapper';

interface CreditCardsProps {
    user: UserProfile;
    cards: CreditCard[];
    transactions: Transaction[];
    accounts?: BankAccount[];
    fetchCards: (userId: number) => Promise<void>;
    payCardInvoice: (cardId: number, amount: number, transactionIds: string[], accountId?: string) => void;
}

const CreditCards: React.FC<CreditCardsProps> = ({ user, cards, transactions, accounts = [], fetchCards, payCardInvoice }) => {
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
    const [paymentAccountId, setPaymentAccountId] = useState<string>('');
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
        payCardInvoice(invoiceToPay.id, invoiceToPay.amount, invoiceToPay.transactionIds, paymentAccountId || undefined);
        setViewingInvoice(null);
        setIsPayInvoiceModalOpen(false);
        setInvoiceToPay(null);
        setPaymentAccountId('');
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

    // BankLogoHelper extracted to Wrapper

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

    // Brands and Presets removed

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
                    <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                        <div
                            className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm transition-opacity"
                            aria-hidden="true"
                            onClick={() => setIsModalOpen(false)}
                        />
                        <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>
                        <div className="relative inline-block transform overflow-hidden rounded-3xl bg-white dark:bg-slate-850 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-slate-100 dark:border-slate-800 align-bottom sm:align-middle w-full">
                            <CreditCardForm
                                formData={formData}
                                setFormData={setFormData}
                                editingCard={editingCard}
                                loading={loading}
                                onClose={() => setIsModalOpen(false)}
                                onSubmit={handleSubmit}
                                formatCurrency={formatCurrency}
                            />
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Invoice View Modal */}
            {viewingInvoice && createPortal(
                <InvoiceViewer
                    viewingInvoice={viewingInvoice}
                    transactions={transactions}
                    currentInvoiceDate={currentInvoiceDate}
                    invoiceTab={invoiceTab}
                    setInvoiceTab={setInvoiceTab}
                    onClose={() => setViewingInvoice(null)}
                    prevInvoice={prevInvoice}
                    nextInvoice={nextInvoice}
                    handlePayInvoiceClick={handlePayInvoiceClick}
                />,
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
            >
                {accounts.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Debitar da Conta:
                        </label>
                        <CustomSelect
                            value={paymentAccountId}
                            onChange={(val) => setPaymentAccountId(val)}
                            options={[
                                { value: '', label: 'Nenhuma (Caixa Global)' },
                                ...accounts.map(acc => ({
                                    value: acc.id,
                                    label: acc.name
                                }))
                            ]}
                        />
                    </div>
                )}
            </ConfirmationModal>
        </div>
    );
};

export default CreditCards;
