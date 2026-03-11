import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ArrowRightLeft } from 'lucide-react';
import { BankAccount, Transaction, UserProfile } from '../types';
import { getTodayLocalDate, maskCurrency, parseCurrency, generateTransactionId } from '../utils';
import { CustomSelect } from './CustomSelect';

interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (t: Transaction) => Promise<void>;
    accounts: BankAccount[];
    user: UserProfile;
    isLoading?: boolean;
}

export default function TransferModal({ isOpen, onClose, onSave, accounts, user, isLoading = false }: TransferModalProps) {
    const [amount, setAmount] = useState('');
    const [sourceAccountId, setSourceAccountId] = useState('');
    const [destinationAccountId, setDestinationAccountId] = useState('');
    const [date, setDate] = useState(getTodayLocalDate());

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;
        value = value.replace(/\D/g, '');
        if (value === '') value = '0';
        const numValue = (parseInt(value, 10) / 100).toFixed(2);
        setAmount(maskCurrency(numValue.toString()));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!amount || parseCurrency(amount) <= 0) {
            alert("O valor da transferência deve ser maior que zero.");
            return;
        }

        if (!sourceAccountId || !destinationAccountId) {
            alert("Selecione ambas as contas (origem e destino).");
            return;
        }

        if (sourceAccountId === destinationAccountId) {
            alert("A conta de origem não pode ser a mesma de destino.");
            return;
        }

        const numericAmount = parseCurrency(amount);

        const newTransfer: Transaction = {
            id: generateTransactionId(8),
            description: `Transferência entre contas`,
            amount: numericAmount,
            type: 'transfer',
            category: 'Transferência',
            date: date,
            status: 'completed',
            isRecurring: false,
            accountId: sourceAccountId,
            destinationAccountId: destinationAccountId,
        };

        await onSave(newTransfer);
    };

    if (!isOpen) return null;

    const accountOptions = [
        { value: '', label: 'Selecione uma conta' },
        ...accounts.map(acc => ({ value: acc.id, label: acc.name }))
    ];

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    onClick={onClose}
                />
                
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 shrink-0">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <ArrowRightLeft className="w-6 h-6 text-primary-500" />
                                Nova Transferência
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Mova dinheiro entre suas contas
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="overflow-y-auto flex-1 min-h-0 p-6 scrollbar-hide">
                        <form id="transferForm" onSubmit={handleSubmit} className="space-y-6">
                            {/* Valor */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Valor da Transferência
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">R$</span>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        required
                                        value={amount}
                                        onChange={handleAmountChange}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-bold text-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Conta Origem */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Conta de Origem (Sai dinheiro)
                                </label>
                                <CustomSelect
                                    value={sourceAccountId}
                                    onChange={(val: string) => setSourceAccountId(val)}
                                    options={accountOptions}
                                />
                            </div>

                            {/* Conta Destino */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Conta de Destino (Entra dinheiro)
                                </label>
                                <CustomSelect
                                    value={destinationAccountId}
                                    onChange={(val: string) => setDestinationAccountId(val)}
                                    options={accountOptions}
                                />
                            </div>

                            {/* Data */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Data
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                />
                            </div>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 shrink-0">
                        <button
                            type="submit"
                            form="transferForm"
                            disabled={isLoading}
                            className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-lg shadow-primary-500/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Check className="w-5 h-5" />
                            )}
                            Transferir Agora
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
}
