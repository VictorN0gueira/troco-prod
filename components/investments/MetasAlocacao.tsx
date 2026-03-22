import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { X, Target, Save, RotateCcw, Loader2 } from 'lucide-react';
import { Investment, InvestmentType } from '../../types';
import { TYPE_META, INVESTMENT_TYPES, formatCurrency } from './helpers';
import { supabase } from '../../supabaseClient';

type AllocationTargets = Partial<Record<InvestmentType, number>>;

interface Props {
    investments: Investment[];
    userId: number;
    onClose: () => void;
}

const MetasAlocacao: React.FC<Props> = ({ investments, userId, onClose }) => {
    const [targets, setTargets] = useState<AllocationTargets>({});
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const fetchTargets = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('allocation_targets')
                .select('asset_type, target_pct')
                .eq('user_id', userId);
            if (error) throw error;
            const map: AllocationTargets = {};
            (data || []).forEach(row => { map[row.asset_type as InvestmentType] = Number(row.target_pct); });
            setTargets(map);
        } catch (err) {
            console.error('Erro ao buscar metas:', err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => { fetchTargets(); }, [fetchTargets]);

    const totalValue = useMemo(() =>
        investments.reduce((s, i) => s + i.quantity * i.current_price, 0), [investments]);

    const currentAllocation = useMemo(() => {
        const grouped: Partial<Record<InvestmentType, number>> = {};
        investments.forEach(inv => {
            const val = inv.quantity * inv.current_price;
            grouped[inv.type] = (grouped[inv.type] || 0) + val;
        });
        return grouped;
    }, [investments]);

    const activeTypes = useMemo(() => {
        const types = new Set<InvestmentType>();
        Object.keys(targets).forEach(t => types.add(t as InvestmentType));
        Object.keys(currentAllocation).forEach(t => types.add(t as InvestmentType));
        return INVESTMENT_TYPES.filter(t => types.has(t));
    }, [targets, currentAllocation]);

    const totalTarget = Object.values(targets).reduce((s, v) => s + (v || 0), 0);
    const hasTargets = Object.keys(targets).length > 0 && totalTarget > 0;

    const handleSave = async () => {
        setSaving(true);
        try {
            await supabase.from('allocation_targets').delete().eq('user_id', userId);
            const rows = Object.entries(targets)
                .filter(([, pct]) => pct && pct > 0)
                .map(([type, pct]) => ({ user_id: userId, asset_type: type, target_pct: pct }));
            if (rows.length > 0) {
                const { error } = await supabase.from('allocation_targets').insert(rows);
                if (error) throw error;
            }
            setEditing(false);
        } catch (err) {
            console.error('Erro ao salvar metas:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        try {
            await supabase.from('allocation_targets').delete().eq('user_id', userId);
            setTargets({});
            setEditing(false);
        } catch (err) {
            console.error('Erro ao resetar metas:', err);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
                <div className="relative w-full max-w-2xl bg-white dark:bg-slate-850 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 animate-fade-in-up overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col">

                    {/* Header — mobile-friendly */}
                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 sm:p-6 shrink-0">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-white/20 shrink-0"><Target className="w-5 h-5 sm:w-6 sm:h-6 text-white" /></div>
                                <div className="min-w-0">
                                    <h3 className="text-base sm:text-xl font-bold text-white leading-tight">Metas de Alocação</h3>
                                    <p className="text-amber-100 text-xs sm:text-sm mt-0.5 hidden sm:block">Defina seu portfólio ideal</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                {editing && (
                                    <>
                                        <button onClick={handleReset} className="p-1.5 sm:p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors" title="Resetar">
                                            <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        </button>
                                        <button onClick={handleSave} disabled={saving}
                                            className="flex items-center gap-1 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-white/20 text-white hover:bg-white/30 transition-colors text-xs sm:text-sm font-bold disabled:opacity-70">
                                            <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {saving ? '...' : 'Salvar'}
                                        </button>
                                    </>
                                )}
                                {!editing && (
                                    <button onClick={() => setEditing(true)}
                                        className="flex items-center gap-1 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-white/20 text-white hover:bg-white/30 transition-colors text-xs sm:text-sm font-bold">
                                        Editar
                                    </button>
                                )}
                                <button onClick={onClose} className="p-1.5 sm:p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"><X className="w-4 h-4 sm:w-5 sm:h-5" /></button>
                            </div>
                        </div>
                    </div>

                    {editing && totalTarget !== 100 && totalTarget > 0 && (
                        <div className="px-4 sm:px-6 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-[10px] sm:text-xs font-semibold text-center">
                            ⚠️ Total: {totalTarget.toFixed(0)}% (ideal: 100%)
                        </div>
                    )}

                    <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto">
                        {loading ? (
                            <div className="py-12 text-center"><Loader2 className="w-8 h-8 mx-auto animate-spin text-amber-500" /></div>
                        ) : (
                            <>
                                {INVESTMENT_TYPES.map(type => {
                                    const meta = TYPE_META[type];
                                    const Icon = meta.icon;
                                    const currentVal = currentAllocation[type] || 0;
                                    const currentPct = totalValue > 0 ? (currentVal / totalValue) * 100 : 0;
                                    const targetPct = targets[type] || 0;
                                    const gap = currentPct - targetPct;
                                    const showRow = editing || currentPct > 0 || targetPct > 0;
                                    if (!showRow) return null;

                                    return (
                                        <div key={type} className="space-y-1.5 py-2 border-b border-slate-50 dark:border-slate-800 last:border-0">
                                            {/* Row label */}
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className={`p-1 sm:p-1.5 rounded-lg ${meta.bg} ${meta.darkBg} shrink-0`}>
                                                        <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ color: meta.color }} />
                                                    </div>
                                                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{type}</span>
                                                </div>
                                                {hasTargets && targetPct > 0 && !editing && (
                                                    <div className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${Math.abs(gap) < 3 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : gap > 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-500'}`}>
                                                        {Math.abs(gap) < 3 ? '✓ OK' : gap > 0 ? `+${gap.toFixed(0)}%` : `${gap.toFixed(0)}%`}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Bars */}
                                            <div className="space-y-1 pl-7 sm:pl-9">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] sm:text-[10px] text-slate-400 w-8 shrink-0">Atual</span>
                                                    <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 sm:h-2 min-w-0">
                                                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(currentPct, 100)}%`, background: meta.color }} />
                                                    </div>
                                                    <span className="text-[10px] sm:text-xs font-bold w-10 text-right shrink-0" style={{ color: meta.color }}>{currentPct.toFixed(1)}%</span>
                                                </div>
                                                {(targetPct > 0 || editing) && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] sm:text-[10px] text-slate-400 w-8 shrink-0">Meta</span>
                                                        {editing ? (
                                                            <input type="range" min={0} max={100} step={1} value={targetPct}
                                                                onChange={e => setTargets(prev => ({ ...prev, [type]: Number(e.target.value) }))}
                                                                className="flex-1 h-1.5 sm:h-2 rounded-full appearance-none cursor-pointer bg-slate-200 dark:bg-slate-700 accent-amber-500 min-w-0" />
                                                        ) : (
                                                            <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 sm:h-2 min-w-0">
                                                                <div className="h-full rounded-full transition-all duration-500 bg-amber-400 opacity-60" style={{ width: `${Math.min(targetPct, 100)}%` }} />
                                                            </div>
                                                        )}
                                                        <span className="text-[10px] sm:text-xs font-bold text-amber-500 w-10 text-right shrink-0">{targetPct.toFixed(0)}%</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {hasTargets && !editing && (
                                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                        <h4 className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Rebalanceamento</h4>
                                        <div className="space-y-2">
                                            {activeTypes.filter(t => targets[t] && targets[t]! > 0).map(type => {
                                                const currentVal = currentAllocation[type] || 0;
                                                const targetVal = totalValue * ((targets[type] || 0) / 100);
                                                const diff = targetVal - currentVal;
                                                if (Math.abs(diff) < 10) return null;
                                                return (
                                                    <div key={type} className="flex items-center justify-between text-xs gap-2">
                                                        <span className="text-slate-600 dark:text-slate-400 truncate min-w-0">{type}</span>
                                                        <span className={`font-bold shrink-0 ${diff > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                            {diff > 0 ? `Aportar ${formatCurrency(diff)}` : `Reduzir ${formatCurrency(Math.abs(diff))}`}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MetasAlocacao;
