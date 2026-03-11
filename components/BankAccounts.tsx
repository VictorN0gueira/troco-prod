import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { BankAccount, Transaction, UserProfile } from '../types';
import { Wallet, Plus, Edit2, Trash2, Building2, MoreVertical, X, Check, Landmark, Coins, Briefcase, ChevronLeft, ChevronRight, ArrowRightLeft } from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency, maskCurrency, parseCurrency } from '../utils';
import ConfirmationModal from './ConfirmationModal';
import TransferModal from './TransferModal';

interface BankAccountsProps {
    accounts: BankAccount[];
    transactions: Transaction[];
    onAdd: (a: BankAccount) => Promise<void>;
    onEdit: (a: BankAccount) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    onAddTransaction: (t: Transaction) => Promise<void>;
    user: UserProfile;
    setIsLimitModalOpen?: (open: boolean) => void;
}

const ACCOUNT_TYPES = [
    { id: 'Conta Corrente', icon: Landmark },
    { id: 'Poupança', icon: Coins },
    { id: 'Investimentos', icon: Briefcase },
    { id: 'Outros', icon: Wallet },
];

const COLORS = [
    '#0ea5e9', // sky-500
    '#22c55e', // green-500
    '#eab308', // yellow-500
    '#f97316', // orange-500
    '#ef4444', // red-500
    '#d946ef', // fuchsia-500
    '#8b5cf6', // violet-500
    '#64748b', // slate-500
];

export default function BankAccounts({ accounts, transactions, onAdd, onEdit, onDelete, onAddTransaction, user, setIsLimitModalOpen }: BankAccountsProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const { showNotification } = useNotification();
    const [loading, setLoading] = useState(false);
    
    // Transfer Modal state
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [isAddingTransfer, setIsAddingTransfer] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 8;

    const [formData, setFormData] = useState({
        name: '',
        type: 'Conta Corrente',
        color: COLORS[0],
        saldo_inicial: '0,00'
    });

    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [accountToDeleteId, setAccountToDeleteId] = useState<string | null>(null);

    const openModal = (acc?: BankAccount) => {
        const isSuper = user?.status_assinatura === 'active';
        if (!acc && !isSuper && accounts.length >= 2) {
            setIsLimitModalOpen?.(true);
            return;
        }

        if (acc) {
            setEditingId(acc.id);
            setFormData({
                name: acc.name,
                type: acc.type,
                color: acc.color || COLORS[0],
                saldo_inicial: maskCurrency((acc.saldo_inicial || 0).toString())
            });
        } else {
            setEditingId(null);
            setFormData({
                name: '',
                type: 'Conta Corrente',
                color: COLORS[0],
                saldo_inicial: '0,00'
            });
        }
        setIsModalOpen(true);
        setActiveMenu(null);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            showNotification({ title: 'Erro', message: 'Dê um nome para a conta.', type: 'error' });
            return;
        }

        setLoading(true);
        try {
            const dbAcc: BankAccount = {
                id: editingId || '',
                user_id: user.id,
                name: formData.name.trim(),
                type: formData.type,
                color: formData.color,
                saldo_inicial: parseCurrency(formData.saldo_inicial),
                created_at: new Date().toISOString()
            };

            if (editingId) {
                await onEdit(dbAcc);
                showNotification({ title: 'Sucesso', message: 'Conta atualizada!', type: 'success' });
            } else {
                await onAdd(dbAcc);
                showNotification({ title: 'Sucesso', message: 'Conta bancária adicionada!', type: 'success' });
            }
            closeModal();
        } catch (err: any) {
            showNotification({ title: 'Erro', message: err.message || 'Erro ao salvar conta.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (id: string) => {
        setAccountToDeleteId(id);
        setIsDeleteModalOpen(true);
        setActiveMenu(null);
    };

    const handleConfirmDelete = async () => {
        if (!accountToDeleteId) return;

        setLoading(true);
        try {
            await onDelete(accountToDeleteId);
            showNotification({ title: 'Sucesso', message: 'Conta removida.', type: 'success' });
            setIsDeleteModalOpen(false);
            setAccountToDeleteId(null);
        } catch (err) {
            showNotification({ title: 'Erro', message: 'Falha ao remover conta.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    // Handles Transfer Add
    const handleAddTransfer = async (transaction: Transaction) => {
        setIsAddingTransfer(true);
        try {
            await onAddTransaction(transaction);
            setIsTransferModalOpen(false);
            showNotification({
                title: 'Transferência Concluída',
                message: 'A transferência foi registrada com sucesso.',
                type: 'success'
            });
        } catch (error) {
            console.error(error);
        } finally {
            setIsAddingTransfer(false);
        }
    };

    // Calcula saldos baseados nas transações
    const accountBalances = useMemo(() => {
        const balances: Record<string, number> = {};

        // Inicializar com saldo inicial
        accounts.forEach(a => {
            balances[a.id] = Number(a.saldo_inicial) || 0;
        });

        // Somar e subtrair transações
        transactions.forEach(t => {
            // Ignorar transações futuras ou não pagas? Normalmente saldo atual é das completadas
            if (t.status !== 'completed' && String(t.status).toLowerCase() !== 'pago') return;

            if (t.type === 'income' && t.accountId && balances[t.accountId] !== undefined) {
                balances[t.accountId] += t.amount;
            } else if (t.type === 'expense' && t.accountId && balances[t.accountId] !== undefined) {
                balances[t.accountId] -= t.amount;
            } else if (t.type === 'transfer' && t.amount > 0) {
                if (t.accountId && balances[t.accountId] !== undefined) {
                    balances[t.accountId] -= t.amount;
                }
                if (t.destinationAccountId && balances[t.destinationAccountId] !== undefined) {
                    balances[t.destinationAccountId] += t.amount;
                }
            }
        });

        return balances;
    }, [accounts, transactions]);

    // Pagination Logic
    const totalItems = accounts.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    
    React.useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [totalItems, totalPages, currentPage]);

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedAccounts = accounts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // Handle amount change with formatting
    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;
        value = value.replace(/\D/g, '');
        if (value === '') value = '0';
        const numValue = (parseInt(value, 10) / 100).toFixed(2);
        setFormData(prev => ({ ...prev, saldo_inicial: maskCurrency(numValue.toString()) }));
    };


    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in-up pb-24 lg:pb-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                        <Building2 className="w-8 h-8 text-primary-500" />
                        Contas Bancárias
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Gerencie seus saldos e contas em diferentes bancos.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <button
                        onClick={() => setIsTransferModalOpen(true)}
                        className="w-full sm:w-auto px-6 py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl font-bold shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                        <ArrowRightLeft className="w-5 h-5 text-primary-500" />
                        Transferência
                    </button>
                    <button
                        onClick={() => openModal()}
                        className="w-full sm:w-auto px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-lg shadow-primary-500/30 transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        Nova Conta
                    </button>
                </div>
            </div>

            {/* Lista de Contas */}
            {accounts.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm">
                    <Wallet className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-700 dark:text-white mb-2">Nenhuma conta encontrada</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
                        Você ainda não cadastrou nenhuma conta bancária ou carteira. Crie uma para organizar melhor seu dinheiro.
                    </p>
                    <button
                        onClick={() => openModal()}
                        className="px-6 py-2.5 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-bold rounded-xl hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
                    >
                        Criar Minha Primeira Conta
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {paginatedAccounts.map(acc => {
                            const balance = acc.saldo_atual !== undefined ? acc.saldo_atual : (accountBalances[acc.id] || 0);
                            const AccIcon = ACCOUNT_TYPES.find(t => t.id === acc.type)?.icon || Wallet;

                            return (
                                <div
                                    key={acc.id}
                                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
                                >
                                    {/* Cor de Destaque Flutuante */}
                                    <div
                                        className="absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-10 transition-opacity group-hover:opacity-20 pointer-events-none"
                                        style={{ backgroundColor: acc.color || COLORS[0] }}
                                    />

                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 rounded-xl" style={{ backgroundColor: `${acc.color || COLORS[0]}20`, color: acc.color || COLORS[0] }}>
                                                <AccIcon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800 dark:text-white text-lg">{acc.name}</h3>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{acc.type}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Saldo Atual</p>
                                        <p className={`text-2xl font-bold tracking-tight ${balance < 0 ? 'text-red-500' : 'text-slate-800 dark:text-white'}`}>
                                            {formatCurrency(balance)}
                                        </p>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2 mt-6 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); openModal(acc); }}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-800/30 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-semibold transition-all active:scale-95 border border-blue-200 dark:border-blue-700/50"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" /> Editar
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(acc.id); }}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:hover:bg-rose-800/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold transition-all active:scale-95 border border-rose-200 dark:border-rose-700/50"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" /> Excluir
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-6 mt-6">
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Mostrando <span className="font-semibold text-slate-700 dark:text-slate-200">{startIndex + 1}</span> a <span className="font-semibold text-slate-700 dark:text-slate-200">{Math.min(startIndex + ITEMS_PER_PAGE, totalItems)}</span> de <span className="font-semibold text-slate-700 dark:text-slate-200">{totalItems}</span> contas
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal Add/Edit */}
            {isModalOpen && createPortal(
                <AnimatePresence>
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeModal}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]"
                        >
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                                    {editingId ? 'Editar Conta' : 'Nova Conta Bancária'}
                                </h3>
                                <button
                                    onClick={closeModal}
                                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar min-h-0">
                                <form id="accountForm" onSubmit={handleSubmit} className="space-y-6">

                                    {/* Nome da Conta */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Nome da Conta / Instituição
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="Ex: Nubank, Banco Inter..."
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                                        />
                                    </div>

                                    {/* Tipo */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Tipo de Conta
                                        </label>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            {ACCOUNT_TYPES.map(type => {
                                                const Icon = type.icon;
                                                const isSelected = formData.type === type.id;
                                                return (
                                                    <button
                                                        key={type.id}
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({ ...prev, type: type.id }))}
                                                        className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all min-h-[80px] ${isSelected
                                                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                                                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600'
                                                            }`}
                                                    >
                                                        <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? '' : 'opacity-70'}`} />
                                                        <span className="text-[9px] sm:text-[11px] font-bold text-center leading-tight">{type.id}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Saldo Inicial */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Saldo Inicial (Opcional)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">R$</span>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={formData.saldo_inicial}
                                                onChange={handleAmountChange}
                                                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-bold text-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                            />
                                        </div>
                                        <p className="text-xs text-slate-500 mt-2">
                                            Este valor será somado às suas transações para o cálculo final na plataforma.
                                        </p>
                                    </div>

                                    {/* Cor */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                                            Cor de Identificação
                                        </label>
                                        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                                            {COLORS.map(color => (
                                                <button
                                                    key={color}
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                                                    className={`aspect-square rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95 shadow-sm border-2 ${formData.color === color ? 'border-slate-800 dark:border-white scale-110' : 'border-transparent'}`}
                                                    style={{ backgroundColor: color }}
                                                >
                                                    {formData.color === color && <Check className="w-5 h-5 text-white drop-shadow-md" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                </form>
                            </div>

                            <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                <button
                                    type="submit"
                                    form="accountForm"
                                    disabled={loading}
                                    className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-lg shadow-primary-500/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Check className="w-5 h-5" />
                                    )}
                                    {editingId ? 'Salvar Alterações' : 'Criar Conta'}
                                </button>
                            </div>

                        </motion.div>
                    </div>
                </AnimatePresence>,
                document.body
            )}

            {/* Custom Delete Confirmation */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Excluir Conta"
                message="Certeza que deseja remover esta conta? As transações vinculadas a ela ficarão marcadas como 'Sem Conta'."
                confirmText="Excluir"
                type="danger"
                isLoading={loading}
            />

            <TransferModal
                isOpen={isTransferModalOpen}
                onClose={() => setIsTransferModalOpen(false)}
                onSave={handleAddTransfer}
                user={user}
                accounts={accounts}
                isLoading={isAddingTransfer}
            />

            {/* Este componente LimitModal deve ser injetado via prop ou portal se disponível no contexto do App */}
            {/* Como o BankAccounts geralmente é disparado dentro do App que já tem o LimitModal, podemos usar o do contexto se disponível */}
        </div>
    );
}
