import React, { useState } from 'react';
import {
    Target, Plus, Edit2, Trash2, TrendingUp, AlertCircle, CheckCircle2,
    X, DollarSign, Calendar as CalendarIcon, Flag,
    ShoppingCart, Star, Gift, Trophy, BookOpen, Briefcase, Music, Laptop, AlertTriangle, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Goal, UserProfile } from '../types';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import LimitPaywallModal from './LimitPaywallModal';
import ConfirmationModal from './ConfirmationModal';
import { UsageMeter, OverLimitBanner } from './FreePlanBadge';

interface GoalsProps {
    goals: Goal[];
    onAdd: (goal: Goal) => Promise<void>;
    onEdit: (goal: Goal) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onAddMoney: (id: string, amount: number) => Promise<void>;
    user: UserProfile;
    privacyMode: boolean;
}

const PRESET_COLORS = [
    { value: '#10B981', label: 'Esmeralda', name: 'emerald' },
    { value: '#3B82F6', label: 'Azul', name: 'blue' },
    { value: '#8B5CF6', label: 'Roxo', name: 'violet' },
    { value: '#F59E0B', label: 'Âmbar', name: 'amber' },
    { value: '#EF4444', label: 'Vermelho', name: 'red' },
    { value: '#EC4899', label: 'Rosa', name: 'pink' }
];

const PRESET_ICONS = [
    'Target', 'Car', 'Home', 'Plane', 'Wallet', 'GraduationCap', 'Heart', 'Coffee',
    'ShoppingCart', 'Star', 'Gift', 'Trophy', 'BookOpen', 'Briefcase', 'Music', 'Laptop'
];

export default function Goals({ goals, onAdd, onEdit, onDelete, onAddMoney, user, privacyMode }: GoalsProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAddMoneyModalOpen, setIsAddMoneyModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [goalToDelete, setGoalToDelete] = useState<string | null>(null);
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
    const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [targetAmount, setTargetAmount] = useState('');
    const [currentAmount, setCurrentAmount] = useState('');
    const [deadline, setDeadline] = useState('');
    const [color, setColor] = useState(PRESET_COLORS[0].value);
    const [icon, setIcon] = useState(PRESET_ICONS[0]);
    const [addAmount, setAddAmount] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [showIconPicker, setShowIconPicker] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [addMoneyError, setAddMoneyError] = useState<string | null>(null);
    const itemsPerPage = 6;
    const totalPages = Math.ceil(goals.length / itemsPerPage);

    // Get current items
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentGoals = goals.slice(indexOfFirstItem, indexOfLastItem);

    const formatCurrencyInput = (value: string) => {
        const digits = value.replace(/\D/g, '');
        if (!digits) return '';
        const numberValue = parseInt(digits, 10) / 100;
        return numberValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const parseCurrency = (value: string) => {
        return Number(value.replace(/\./g, '').replace(',', '.'));
    };

    const formatCurrency = (value: number) => {
        if (privacyMode) return 'R$ •••••';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const getTodayLocalDate = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const openAddModal = () => {
        if (user && user.status_assinatura !== 'active') {
            if (goals.length >= 5) {
                setIsLimitModalOpen(true);
                return;
            }
        }

        setEditingGoal(null);
        setName('');
        setTargetAmount('');
        setCurrentAmount('');
        setDeadline(getTodayLocalDate());
        setColor('#3b82f6');
        setIcon('Target');
        setShowIconPicker(false);
        setIsModalOpen(true);
    };

    const openEditModal = (goal: Goal) => {
        setEditingGoal(goal);
        setName(goal.name);
        setTargetAmount(formatCurrencyInput((goal.target_amount * 100).toFixed(0)));
        setCurrentAmount(formatCurrencyInput((goal.current_amount * 100).toFixed(0)));
        setDeadline(goal.deadline);
        setColor(goal.color || PRESET_COLORS[0].value);
        setIcon(goal.icon || PRESET_ICONS[0]);
        setShowIconPicker(false);
        setIsModalOpen(true);
    };

    const openAddMoneyModal = (id: string) => {
        setSelectedGoalId(id);
        setAddAmount('');
        setIsAddMoneyModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setIsLoading(true);

        const parsedTarget = parseCurrency(targetAmount);
        const parsedCurrent = editingGoal ? parseCurrency(currentAmount) : 0;

        if (isNaN(parsedTarget) || parsedTarget <= 0) {
            setFormError('Informe um valor alvo válido maior que zero.');
            setIsLoading(false);
            return;
        }

        const goalData = {
            id: editingGoal ? editingGoal.id : Date.now().toString(),
            user_id: user.id,
            name,
            target_amount: parsedTarget,
            current_amount: parsedCurrent,
            deadline,
            color,
            icon
        };

        try {
            if (editingGoal) {
                await onEdit(goalData);
            } else {
                await onAdd(goalData);
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error("Erro ao salvar meta:", error);
            setFormError('Erro ao salvar a meta. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddMoney = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGoalId) return;
        setAddMoneyError(null);

        setIsLoading(true);
        try {
            const parsedAdd = parseCurrency(addAmount);
            if (isNaN(parsedAdd) || parsedAdd <= 0) {
                setAddMoneyError('Informe um valor válido maior que zero.');
                setIsLoading(false);
                return;
            }
            await onAddMoney(selectedGoalId, parsedAdd);
            setIsAddMoneyModalOpen(false);
        } catch (error) {
            console.error("Erro ao adicionar dinheiro:", error);
            setAddMoneyError('Erro ao guardar dinheiro. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    const openDeleteModal = (id: string) => {
        setGoalToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!goalToDelete) return;
        setIsLoading(true);
        try {
            await onDelete(goalToDelete);
            setIsDeleteModalOpen(false);
            setGoalToDelete(null);
        } catch (error) {
            console.error("Erro ao excluir meta:", error);
            alert("Erro ao excluir meta.");
        } finally {
            setIsLoading(false);
        }
    };

    const renderIcon = (iconName: string, className = "w-6 h-6") => {
        switch (iconName) {
            case 'Car': return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>;
            case 'Home': return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
            case 'Plane': return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>;
            case 'Wallet': return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
            case 'GraduationCap': return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14v6" /></svg>;
            case 'Heart': return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>;
            case 'Coffee': return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
            case 'ShoppingCart': return <ShoppingCart className={className} />;
            case 'Star': return <Star className={className} />;
            case 'Gift': return <Gift className={className} />;
            case 'Trophy': return <Trophy className={className} />;
            case 'BookOpen': return <BookOpen className={className} />;
            case 'Briefcase': return <Briefcase className={className} />;
            case 'Music': return <Music className={className} />;
            case 'Laptop': return <Laptop className={className} />;
            case 'Target':
            default: return <Target className={className} />;
        }
    };

    const calculateProgress = (current: number, target: number) => {
        if (target === 0) return 0;
        const percentage = (current / target) * 100;
        return Math.min(Math.max(percentage, 0), 100);
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
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20 lg:pb-0">
            {/* Over-limit banner — grandfathering: dados herdados do Pro são preservados */}
            {user && user.status_assinatura !== 'active' && goals.length > 5 && (
                <OverLimitBanner label="metas financeiras" current={goals.length} limit={5} />
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                        <Target className="w-8 h-8 text-primary-500" />
                        Minhas Metas
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Defina seus objetivos e acompanhe seu progresso.</p>
                    {/* Indicador de uso para plano free */}
                    {user.status_assinatura !== 'active' && (
                        <div className="mt-2 max-w-xs">
                            <UsageMeter current={goals.length} max={5} label="metas" />
                        </div>
                    )}
                </div>
                <button
                    onClick={openAddModal}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all font-semibold shadow-lg shadow-primary-500/30 active:scale-95 whitespace-nowrap"
                >
                    <Plus className="w-5 h-5" />
                    Nova Meta
                </button>
            </div>

            {goals.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 text-center border border-slate-200 dark:border-slate-700 shadow-sm animate-scale-in flex flex-col items-center justify-center">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700/50 rounded-full flex items-center justify-center mb-4">
                        <Flag className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Nenhuma meta ainda</h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md">
                        Comece a planejar seu futuro! Crie metas para uma viagem, reserva de emergência ou comprar um carro novo.
                    </p>
                    <button
                        onClick={openAddModal}
                        className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all font-semibold shadow-lg shadow-primary-500/30"
                    >
                        <Plus className="w-5 h-5" />
                        Criar Minha Primeira Meta
                    </button>
                </div>
            ) : (
                <div className="space-y-8">
                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                    >
                        <AnimatePresence>
                            {currentGoals.map(goal => {
                                const progress = calculateProgress(goal.current_amount, goal.target_amount);
                                const isCompleted = progress >= 100;

                                return (
                                    <motion.div
                                        key={goal.id}
                                        variants={itemVariants}
                                        layout
                                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                        className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] transition-all hover:-translate-y-1 hover:shadow-xl relative overflow-hidden group flex flex-col"
                                    >
                                        {/* Cor de fundo borrada superior */}
                                        <div
                                            className="absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"
                                            style={{ backgroundColor: goal.color }}
                                        />

                                        <div className="flex justify-between items-start mb-6 relative z-10">
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner"
                                                    style={{ backgroundColor: `${goal.color}20`, color: goal.color }}
                                                >
                                                    {renderIcon(goal.icon)}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg text-slate-800 dark:text-white leading-tight">{goal.name}</h3>
                                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                                                        <CalendarIcon className="w-3.5 h-3.5" />
                                                        {new Date(goal.deadline + 'T00:00:00').toLocaleDateString('pt-BR')}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openEditModal(goal)}
                                                    className="p-2 text-slate-400 hover:text-primary-500 bg-slate-50 hover:bg-primary-50 dark:bg-slate-700 dark:hover:bg-primary-900/40 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => openDeleteModal(goal.id)}
                                                    className="p-2 text-slate-400 hover:text-danger-500 bg-slate-50 hover:bg-danger-50 dark:bg-slate-700 dark:hover:bg-danger-900/40 rounded-lg transition-colors"
                                                    title="Excluir"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex-1 mt-2">
                                            <div className="flex justify-between items-end mb-2">
                                                <div>
                                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Guardado</p>
                                                    <p className="text-xl font-bold flex items-center gap-1" style={{ color: goal.color }}>
                                                        {formatCurrency(goal.current_amount)}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Objetivo</p>
                                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                        {formatCurrency(goal.target_amount)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 mb-2 overflow-hidden shadow-inner relative">
                                                <div
                                                    className="h-3 rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                                                    style={{
                                                        width: `${progress}%`,
                                                        backgroundColor: goal.color,
                                                    }}
                                                >
                                                    {/* Efeito de brilho na barra */}
                                                    <div className="absolute top-0 right-0 bottom-0 left-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                                    Progresso
                                                </span>
                                                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${goal.color}15`, color: goal.color }}>
                                                    {progress.toFixed(1)}%
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-700/50">
                                            <button
                                                onClick={() => openAddMoneyModal(goal.id)}
                                                disabled={isCompleted}
                                                className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all ${isCompleted
                                                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 cursor-not-allowed'
                                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 shadow-sm'
                                                    }`}
                                            >
                                                {isCompleted ? (
                                                    <>
                                                        <CheckCircle2 className="w-5 h-5" />
                                                        Meta Alcançada!
                                                    </>
                                                ) : (
                                                    <>
                                                        <DollarSign className="w-5 h-5" />
                                                        Guardar Dinheiro
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </motion.div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700/50 pt-6 mt-6">
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                                Mostrando <span className="font-semibold text-slate-800 dark:text-white">{indexOfFirstItem + 1}</span> a <span className="font-semibold text-slate-800 dark:text-white">{Math.min(indexOfLastItem, goals.length)}</span> de <span className="font-semibold text-slate-800 dark:text-white">{goals.length}</span> metas
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>

                                <div className="flex gap-1">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`w-10 h-10 rounded-xl font-bold transition-colors ${currentPage === page
                                                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                                                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                                                }`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal Nova/Editar Meta */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className="flex min-h-full items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md relative z-10 shadow-2xl animate-scale-in">
                            <div className="p-6 md:p-8">
                                <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700/50 p-2 rounded-full">
                                    <X className="w-5 h-5" />
                                </button>
                                <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-3">
                                    <Target className="w-7 h-7 text-primary-500" />
                                    {editingGoal ? 'Editar Meta' : 'Nova Meta'}
                                </h3>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Nome da Meta</label>
                                        <input
                                            type="text"
                                            required
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            placeholder="Ex: Viagem para Europa"
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Valor Alvo (R$)</label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            required
                                            value={targetAmount}
                                            onChange={e => setTargetAmount(formatCurrencyInput(e.target.value))}
                                            placeholder="Ex: 5000.00"
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                        />
                                    </div>

                                    {editingGoal && (
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Valor Atual (R$)</label>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                required
                                                value={currentAmount}
                                                onChange={e => setCurrentAmount(formatCurrencyInput(e.target.value))}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                            />
                                            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" />
                                                Edite apenas se precisar fazer uma correção manual.
                                            </p>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Data Limite</label>
                                        <input
                                            type="date"
                                            required
                                            min={getTodayLocalDate()}
                                            value={deadline}
                                            onChange={e => setDeadline(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Cor da Meta</label>
                                        <div className="flex flex-wrap gap-3">
                                            {PRESET_COLORS.map(c => (
                                                <button
                                                    key={c.value}
                                                    type="button"
                                                    onClick={() => setColor(c.value)}
                                                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${color === c.value ? 'ring-4 ring-offset-2 ring-emerald-500 dark:ring-offset-slate-800 scale-110' : 'hover:scale-110'}`}
                                                    style={{ backgroundColor: c.value }}
                                                    title={c.label}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Ícone — seletor compacto */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Ícone</label>
                                        <div className="flex items-center gap-3">
                                            {/* Preview do ícone selecionado */}
                                            <div
                                                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                                                style={{ backgroundColor: `${color}20`, color }}
                                            >
                                                {renderIcon(icon, 'w-6 h-6')}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setShowIconPicker(p => !p)}
                                                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-left"
                                            >
                                                {showIconPicker ? 'Fechar seleção' : 'Trocar ícone'}
                                            </button>
                                        </div>
                                        {/* Grid expansível */}
                                        {showIconPicker && (
                                            <div className="grid grid-cols-8 gap-2 mt-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                                                {PRESET_ICONS.map(i => (
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        onClick={() => { setIcon(i); setShowIconPicker(false); }}
                                                        className={`aspect-square rounded-xl flex items-center justify-center transition-all p-1.5 ${icon === i
                                                            ? 'bg-primary-500 text-white shadow-md'
                                                            : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                                                            }`}
                                                    >
                                                        {renderIcon(i, 'w-5 h-5')}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-2">
                                        {formError && (
                                            <div className="mb-3 flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700 rounded-xl text-rose-600 dark:text-rose-400 text-sm font-medium">
                                                <AlertTriangle className="w-4 h-4 flex-shrink-0" />{formError}
                                            </div>
                                        )}
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full py-4 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 active:scale-95 transition-all shadow-lg shadow-primary-500/30 disabled:opacity-70 flex justify-center items-center gap-2"
                                        >
                                            {isLoading ? 'Salvando...' : editingGoal ? 'Salvar Alterações' : 'Criar Meta'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Adicionar Dinheiro */}
            {
                isAddMoneyModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsAddMoneyModalOpen(false)} />
                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 w-full max-w-sm relative z-10 shadow-2xl animate-scale-in text-center">
                            <div className="mx-auto w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-6">
                                <DollarSign className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Guardar Dinheiro</h3>
                            <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm">
                                Quanto você deseja adicionar a esta meta hoje?
                            </p>

                            <form onSubmit={handleAddMoney} className="space-y-6">
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-lg">R$</span>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        required
                                        value={addAmount}
                                        onChange={e => setAddAmount(formatCurrencyInput(e.target.value))}
                                        autoFocus
                                        placeholder="0,00"
                                        className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/10 text-slate-800 dark:text-white focus:ring-0 focus:border-emerald-500 outline-none text-2xl font-bold text-center"
                                    />
                                </div>
                                {addMoneyError && (
                                    <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700 rounded-xl text-rose-600 dark:text-rose-400 text-sm font-medium">
                                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />{addMoneyError}
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddMoneyModalOpen(false)}
                                        className="flex-1 py-3.5 bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="flex-1 py-3.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 active:scale-95 transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-70"
                                    >
                                        {isLoading ? '...' : 'Confirmar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Modal Excluir Meta */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Excluir Meta"
                message="Tem certeza que deseja excluir esta meta? Esta ação não pode ser desfeita e os dados serão removidos."
                confirmText="Excluir"
                cancelText="Cancelar"
                type="danger"
                isLoading={isLoading}
            />

            {/* Limit Reached Modal */}
            <LimitPaywallModal
                isOpen={isLimitModalOpen}
                onClose={() => setIsLimitModalOpen(false)}
                title="Limite Atingido"
                description="No plano gratuito você pode criar até 5 metas. Assine o Super Trocô para criar metas ilimitadas e realizar seus sonhos mais rápido."
                userEmail={user?.email}
            />
        </div >
    );
}
