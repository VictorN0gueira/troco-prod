import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { X, Plus, Coins, TrendingUp, Trash2, Loader2 } from 'lucide-react';
import { Investment } from '../../types';
import { formatCurrency, formatNumberBR, parseNumberBR } from './helpers';
import { CustomCalendar } from '../ui/CustomCalendar';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from '../../supabaseClient';

interface Dividend {
    id: number;
    user_id: number;
    investment_id: number;
    investment_name: string;
    type: 'dividend' | 'jcp' | 'rendimento' | 'bonus';
    amount: number;
    date: string;
    notes?: string;
}

interface Props {
    investments: Investment[];
    userId: number;
    onClose: () => void;
}

const DIVIDEND_TYPES = [
    { value: 'dividend', label: 'Dividendo' },
    { value: 'jcp', label: 'JCP' },
    { value: 'rendimento', label: 'Rendimento FII' },
    { value: 'bonus', label: 'Bonificação' },
];

const Dividendos: React.FC<Props> = ({ investments, userId, onClose }) => {
    const [dividends, setDividends] = useState<Dividend[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        investmentId: investments[0]?.id || '',
        type: 'dividend' as Dividend['type'],
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
    });

    const fetchDividends = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('dividends')
                .select('*')
                .eq('user_id', userId)
                .order('date', { ascending: false });
            if (error) throw error;
            setDividends(data || []);
        } catch (err) {
            console.error('Erro ao buscar dividendos:', err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => { fetchDividends(); }, [fetchDividends]);

    const handleAdd = async () => {
        const amount = parseNumberBR(form.amount);
        if (!form.investmentId || amount <= 0) return;
        const inv = investments.find(i => String(i.id) === String(form.investmentId));
        setSaving(true);
        try {
            const { error } = await supabase.from('dividends').insert({
                user_id: userId,
                investment_id: Number(form.investmentId),
                investment_name: inv?.name || '',
                type: form.type,
                amount,
                date: form.date,
                notes: form.notes || null,
            });
            if (error) throw error;
            await fetchDividends();
            setShowForm(false);
            setForm(prev => ({ ...prev, amount: '', notes: '' }));
        } catch (err) {
            console.error('Erro ao salvar dividendo:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            const { error } = await supabase.from('dividends').delete().eq('id', id);
            if (error) throw error;
            setDividends(prev => prev.filter(d => d.id !== id));
        } catch (err) {
            console.error('Erro ao deletar dividendo:', err);
        }
    };

    const totalReceived = useMemo(() => dividends.reduce((s, d) => s + Number(d.amount), 0), [dividends]);
    const totalInvested = useMemo(() => investments.reduce((s, i) => s + i.quantity * i.purchase_price, 0), [investments]);
    const yieldOnCost = totalInvested > 0 ? (totalReceived / totalInvested) * 100 : 0;

    const monthlyData = useMemo(() => {
        const months: { name: string; total: number }[] = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const year = d.getFullYear();
            const month = d.getMonth();
            const label = d.toLocaleDateString('pt-BR', { month: 'short' });
            const total = dividends
                .filter(div => { const dd = new Date(div.date); return dd.getFullYear() === year && dd.getMonth() === month; })
                .reduce((s, div) => s + Number(div.amount), 0);
            months.push({ name: label.charAt(0).toUpperCase() + label.slice(1), total: Math.round(total * 100) / 100 });
        }
        return months;
    }, [dividends]);

    const inputClass = "w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm placeholder-slate-400";
    const labelClass = "block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider";

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
                <div className="relative w-full max-w-3xl bg-white dark:bg-slate-850 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 animate-fade-in-up overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col">

                    {/* Header — mobile stacked */}
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4 sm:p-6 shrink-0">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-white/20 shrink-0"><Coins className="w-5 h-5 sm:w-6 sm:h-6 text-white" /></div>
                                <div className="min-w-0">
                                    <h3 className="text-base sm:text-xl font-bold text-white leading-tight">Dividendos & Proventos</h3>
                                    <p className="text-emerald-100 text-xs sm:text-sm mt-0.5 hidden sm:block">Acompanhe seus rendimentos passivos</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-white/20 text-white hover:bg-white/30 transition-colors text-xs sm:text-sm font-bold">
                                    <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Registrar
                                </button>
                                <button onClick={onClose} className="p-1.5 sm:p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"><X className="w-4 h-4 sm:w-5 sm:h-5" /></button>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto">
                        {loading ? (
                            <div className="py-12 text-center"><Loader2 className="w-8 h-8 mx-auto animate-spin text-emerald-500" /></div>
                        ) : (
                            <>
                                {/* Summary — stacks on mobile */}
                                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center">
                                        <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5 sm:mb-1">Total Recebido</p>
                                        <p className="text-sm sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 break-all">{formatCurrency(totalReceived)}</p>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center">
                                        <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5 sm:mb-1">Registros</p>
                                        <p className="text-sm sm:text-lg font-bold text-slate-800 dark:text-white">{dividends.length}</p>
                                    </div>
                                    <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center">
                                        <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5 sm:mb-1 flex items-center justify-center gap-1"><TrendingUp className="w-3 h-3" /> YoC</p>
                                        <p className="text-sm sm:text-lg font-bold text-violet-600 dark:text-violet-400">{yieldOnCost.toFixed(2)}%</p>
                                    </div>
                                </div>

                                {showForm && (
                                    <div className="bg-slate-50 dark:bg-slate-900 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-3 sm:space-y-4">
                                        <h4 className="text-sm font-bold text-slate-800 dark:text-white">Novo Provento</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                            <div>
                                                <label className={labelClass}>Ativo *</label>
                                                <select value={form.investmentId} onChange={e => setForm(prev => ({ ...prev, investmentId: e.target.value }))} className={inputClass}>
                                                    {investments.map(inv => (<option key={inv.id} value={inv.id}>{inv.name} {inv.ticker ? `(${inv.ticker})` : ''}</option>))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelClass}>Tipo *</label>
                                                <select value={form.type} onChange={e => setForm(prev => ({ ...prev, type: e.target.value as Dividend['type'] }))} className={inputClass}>
                                                    {DIVIDEND_TYPES.map(t => (<option key={t.value} value={t.value}>{t.label}</option>))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelClass}>Valor (R$) *</label>
                                                <input type="text" inputMode="decimal" className={inputClass} placeholder="0,00"
                                                    value={form.amount} onChange={e => setForm(prev => ({ ...prev, amount: formatNumberBR(e.target.value, true) }))} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>Data</label>
                                                <CustomCalendar mode="date" value={form.date} onChange={val => setForm(prev => ({ ...prev, date: val }))} />
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">Cancelar</button>
                                            <button onClick={handleAdd} disabled={saving}
                                                className="px-5 py-2 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 active:scale-95 transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-70">
                                                {saving ? 'Salvando...' : 'Registrar'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {dividends.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-3">Proventos Mensais</h4>
                                        <div className="h-40 sm:h-48">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 9 }} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 9 }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`} />
                                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px -2px rgb(0 0 0 / 0.15)', fontSize: '12px' }} formatter={(val: number) => [formatCurrency(val), 'Proventos']} />
                                                    <Bar dataKey="total" radius={[4, 4, 0, 0]} barSize={18}>
                                                        {monthlyData.map((entry, i) => (<Cell key={i} fill={entry.total > 0 ? '#10B981' : '#e2e8f0'} />))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-3">Histórico de Proventos</h4>
                                    {dividends.length === 0 ? (
                                        <div className="py-8 text-center text-slate-400">
                                            <Coins className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                            <p className="text-sm">Nenhum provento registrado</p>
                                            <p className="text-xs mt-1">Clique em "Registrar" para adicionar</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-60 overflow-y-auto">
                                            {dividends.map(div => {
                                                const typeLabel = DIVIDEND_TYPES.find(t => t.value === div.type)?.label || div.type;
                                                return (
                                                    <div key={div.id} className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-50 dark:bg-slate-900 rounded-xl group gap-2">
                                                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                                            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 shrink-0"><Coins className="w-3.5 h-3.5 text-emerald-500" /></div>
                                                            <div className="min-w-0">
                                                                <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-white truncate">{div.investment_name}</p>
                                                                <p className="text-[10px] text-slate-400">{typeLabel} · {new Date(div.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(Number(div.amount))}</span>
                                                            <button onClick={() => handleDelete(div.id)}
                                                                className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
                                                                <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dividendos;
