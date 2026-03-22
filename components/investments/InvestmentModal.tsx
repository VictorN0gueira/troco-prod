import React, { useState } from 'react';
import { Investment, InvestmentType } from '../../types';
import { Plus, X, AlertCircle } from 'lucide-react';
import { CustomSelect } from '../CustomSelect';
import { CustomCalendar } from '../ui/CustomCalendar';
import TickerAutocomplete from './TickerAutocomplete';
import {
    INVESTMENT_TYPES, isSimpleType, formatCurrency, formatPercent,
    formatNumberBR, parseNumberBR, getNextId
} from './helpers';

interface ModalProps {
    investment?: Investment | null;
    userId: number;
    onClose: () => void;
    onSave: (inv: Investment) => Promise<void>;
}

const InvestmentModal: React.FC<ModalProps> = ({ investment, userId, onClose, onSave }) => {
    const isEdit = !!investment;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const numToBR = (n?: number) => n != null && n > 0
        ? formatNumberBR(n.toLocaleString('pt-BR', { maximumFractionDigits: 8, useGrouping: false }).replace('.', ','))
        : '';

    const [form, setForm] = useState({
        name: investment?.name || '',
        ticker: investment?.ticker || '',
        type: investment?.type || 'Ações' as InvestmentType,
        quantity: numToBR(investment?.quantity),
        purchase_price: numToBR(investment?.purchase_price),
        current_price: numToBR(investment?.current_price),
        invested_amount: investment && isSimpleType(investment.type)
            ? numToBR(investment.purchase_price * (investment.quantity || 1))
            : '',
        current_amount: investment && isSimpleType(investment.type)
            ? numToBR(investment.current_price * (investment.quantity || 1))
            : '',
        purchase_date: investment?.purchase_date || new Date().toISOString().split('T')[0],
        broker: investment?.broker || '',
        notes: investment?.notes || '',
    });

    const set = (field: string, val: string) => setForm(prev => ({ ...prev, [field]: val }));

    const isSimple = isSimpleType(form.type);
    const qtyNum = isSimple ? 1 : parseNumberBR(form.quantity);
    const buyNum = isSimple ? parseNumberBR(form.invested_amount) : parseNumberBR(form.purchase_price);
    const curNum = isSimple ? parseNumberBR(form.current_amount) : parseNumberBR(form.current_price);
    const currentValue = qtyNum * curNum;
    const cost = qtyNum * buyNum;
    const pnl = currentValue - cost;
    const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const simple = isSimpleType(form.type);
        const investedAmt = parseNumberBR(form.invested_amount);
        const currentAmt = form.current_amount.trim() === '' ? investedAmt : parseNumberBR(form.current_amount);
        const qty = simple ? 1 : parseNumberBR(form.quantity);
        const buyPrice = simple ? investedAmt : parseNumberBR(form.purchase_price);
        const curPrice = simple ? currentAmt : parseNumberBR(form.current_price);

        if (!form.name.trim()) { setError('Nome do ativo é obrigatório.'); return; }
        if (simple && investedAmt <= 0) { setError('Valor investido deve ser maior que zero.'); return; }
        if (!simple && qty <= 0) { setError('Quantidade deve ser maior que zero.'); return; }
        if (!simple && buyPrice <= 0) { setError('Preço de compra deve ser maior que zero.'); return; }
        if (!simple && curPrice <= 0) { setError('Preço atual deve ser maior que zero.'); return; }

        setLoading(true);
        try {
            const inv: Investment = {
                id: investment?.id || getNextId(),
                user_id: userId,
                name: form.name.trim(),
                ticker: form.ticker.trim() || undefined,
                type: form.type,
                quantity: qty,
                purchase_price: buyPrice,
                current_price: curPrice,
                purchase_date: form.purchase_date,
                broker: form.broker.trim() || undefined,
                notes: form.notes.trim() || undefined,
            };
            await onSave(inv);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar investimento.');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm placeholder-slate-400";
    const labelClass = "block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider";

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
                <div className="relative w-full max-w-2xl bg-white dark:bg-slate-850 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 animate-fade-in-up overflow-hidden">

                    {/* Header */}
                    <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 p-6 flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-white">
                                {isEdit ? 'Editar Investimento' : 'Adicionar Investimento'}
                            </h3>
                            <p className="text-emerald-100 text-sm mt-0.5">
                                {isEdit ? 'Atualize os dados do ativo' : 'Registre um novo ativo na sua carteira'}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Live Preview Bar */}
                    {(qtyNum > 0 && buyNum > 0) && (
                        <div className="flex flex-wrap gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                            <div className="text-xs">
                                <span className="text-slate-500 block">Custo Total</span>
                                <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(cost)}</span>
                            </div>
                            {curNum > 0 && (
                                <>
                                    <div className="text-xs">
                                        <span className="text-slate-500 block">Valor Atual</span>
                                        <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(currentValue)}</span>
                                    </div>
                                    <div className="text-xs">
                                        <span className="text-slate-500 block">Resultado</span>
                                        <span className={`font-bold ${pnl >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                            {formatCurrency(pnl)} ({formatPercent(pnlPct)})
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        {error && (
                            <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-3 flex items-center gap-2 text-sm text-rose-600 dark:text-rose-300">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        {/* Row 1: Name + Ticker */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="sm:col-span-2">
                                <label className={labelClass}>Nome do Ativo *</label>
                                <input className={inputClass} placeholder="Ex: Petrobras, Tesouro Selic 2027" value={form.name} onChange={e => set('name', e.target.value)} required />
                            </div>
                            <div>
                                <label className={labelClass}>Ticker / Código</label>
                                <TickerAutocomplete
                                    value={form.ticker}
                                    onChange={val => set('ticker', val)}
                                    onSelect={ticker => {
                                        set('ticker', ticker);
                                        if (!form.name.trim()) set('name', ticker);
                                    }}
                                    className={inputClass}
                                    placeholder="PETR4, MXRF11..."
                                />
                            </div>
                        </div>

                        {/* Row 2: Type + Broker */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Tipo de Ativo *</label>
                                <CustomSelect value={form.type} onChange={val => set('type', val)} options={INVESTMENT_TYPES} />
                            </div>
                            <div>
                                <label className={labelClass}>Corretora</label>
                                <input className={inputClass} placeholder="Ex: XP, Rico, Clear" value={form.broker} onChange={e => set('broker', e.target.value)} />
                            </div>
                        </div>

                        {/* Row 3: Qty + Prices */}
                        {!isSimple ? (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className={labelClass}>Quantidade *</label>
                                    <input type="text" inputMode="decimal" className={inputClass} placeholder="0"
                                        value={form.quantity} onChange={e => set('quantity', formatNumberBR(e.target.value, true))} />
                                </div>
                                <div>
                                    <label className={labelClass}>Preço de Compra (R$) *</label>
                                    <input type="text" inputMode="decimal" className={inputClass} placeholder="0,00"
                                        value={form.purchase_price} onChange={e => set('purchase_price', formatNumberBR(e.target.value, true))} />
                                </div>
                                <div>
                                    <label className={labelClass}>Preço Atual (R$) *</label>
                                    <input type="text" inputMode="decimal" className={inputClass} placeholder="0,00"
                                        value={form.current_price} onChange={e => set('current_price', formatNumberBR(e.target.value, true))} />
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Valor Investido (Custo) *</label>
                                    <input type="text" inputMode="decimal" className={inputClass} placeholder="0,00"
                                        value={form.invested_amount}
                                        onChange={e => {
                                            const val = formatNumberBR(e.target.value, true);
                                            setForm(prev => {
                                                const next = { ...prev, invested_amount: val };
                                                if (!prev.current_amount || prev.current_amount === prev.invested_amount) {
                                                    next.current_amount = val;
                                                }
                                                return next;
                                            });
                                        }}
                                    />
                                    <p className="text-xs text-slate-400 mt-1.5 leading-snug">💡 Total que você aplicou.</p>
                                </div>
                                <div>
                                    <label className={labelClass}>Saldo Atual *</label>
                                    <input type="text" inputMode="decimal" className={inputClass} placeholder="0,00"
                                        value={form.current_amount} onChange={e => set('current_amount', formatNumberBR(e.target.value, true))} />
                                    <p className="text-xs text-slate-400 mt-1.5 leading-snug">💡 Valor de hoje (com rendimentos).</p>
                                </div>
                            </div>
                        )}

                        {/* Row 4: Date + Notes */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Data de Compra *</label>
                                <CustomCalendar mode="date" value={form.purchase_date} onChange={(val) => set('purchase_date', val)} />
                            </div>
                            <div>
                                <label className={labelClass}>Observações</label>
                                <input className={inputClass} placeholder="Notas adicionais..." value={form.notes} onChange={e => set('notes', e.target.value)} />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-medium text-sm">
                                Cancelar
                            </button>
                            <button type="submit" disabled={loading}
                                className="px-6 py-2.5 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 active:scale-95 transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-70 text-sm flex items-center gap-2">
                                {loading ? (
                                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Salvando...</>
                                ) : (
                                    <><Plus className="w-4 h-4" />{isEdit ? 'Salvar Alterações' : 'Adicionar Ativo'}</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default InvestmentModal;
