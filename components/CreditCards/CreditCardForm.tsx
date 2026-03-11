import React, { ChangeEvent, FormEvent } from 'react';
import { X, CalendarClock, Calendar, Percent, Check } from 'lucide-react';
import { CreditCard } from '../../types';
import { renderBrandIcon } from './BrandIconsWrapper'; // We will create this wrapper or just import from BrandIcons where we also add the logic

const PRESET_COLORS = [
    '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#6366F1', '#EF4444', '#1F2937'
];

const BRANDS = [
    'Mastercard', 'Visa', 'Elo', 'American Express', 'Hipercard', 'Outra'
];

interface FormDataProps {
    name: string;
    limit_amount: string;
    closing_day: string;
    due_day: string;
    color: string;
    brand: string;
    current_usage: string;
    cashback_rate: string;
}

interface CreditCardFormProps {
    formData: FormDataProps;
    setFormData: React.Dispatch<React.SetStateAction<FormDataProps>>;
    editingCard: CreditCard | null;
    loading: boolean;
    onClose: () => void;
    onSubmit: (e: FormEvent) => void;
    formatCurrency: (value: number) => string;
}

const CreditCardForm: React.FC<CreditCardFormProps> = ({
    formData,
    setFormData,
    editingCard,
    loading,
    onClose,
    onSubmit,
    formatCurrency
}) => {

    const handleLimitChange = (e: ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, "");
        if (!rawValue) {
            setFormData({ ...formData, limit_amount: '' });
            return;
        }
        const numberValue = Number(rawValue) / 100;
        setFormData({ ...formData, limit_amount: formatCurrency(numberValue) });
    };

    return (
        <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
                className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm transition-opacity"
                aria-hidden="true"
                onClick={onClose}
            />
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block transform overflow-hidden rounded-3xl bg-white dark:bg-slate-850 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-slate-100 dark:border-slate-800 align-bottom sm:align-middle w-full">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 rounded-t-3xl">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                        {editingCard ? 'Editar Cartão' : 'Novo Cartão'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="p-6 space-y-5">
                    {/* Name */}
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

                    {/* Limit */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Limite do Cartão</label>
                        <input
                            type="text"
                            required
                            value={formData.limit_amount}
                            onChange={handleLimitChange}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all font-mono"
                            placeholder="R$ 0,00"
                        />
                    </div>

                    {/* Current Usage */}
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

                    {/* Dates */}
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

                    {/* Color Picker */}
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

                    {/* Submit Button */}
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
    );
};

export default CreditCardForm;
