import React, { useState, useMemo } from 'react';
import { X, Calculator, AlertCircle, Info } from 'lucide-react';
import { Investment, InvestmentType } from '../../types';
import { formatCurrency, TYPE_META } from './helpers';

interface Props {
    investments: Investment[];
    onClose: () => void;
}

const TAX_RULES: Record<string, { rate: number; exemption: string; notes: string }> = {
    'Ações': { rate: 15, exemption: 'Vendas até R$ 20.000/mês isentas', notes: 'Day trade: 20%' },
    'FII': { rate: 20, exemption: 'Dividendos isentos para PF', notes: 'Sem isenção de R$ 20k' },
    'ETF': { rate: 15, exemption: 'Sem isenção de R$ 20k', notes: 'ETF de renda fixa: tabela regressiva' },
    'BDR': { rate: 15, exemption: 'Sem isenção de R$ 20k', notes: 'Day trade: 20%' },
    'Tesouro Direto': { rate: 15, exemption: 'Tabela regressiva (22,5% a 15%)', notes: 'IOF até 30 dias' },
    'Renda Fixa': { rate: 15, exemption: 'Tabela regressiva', notes: 'CDB, LCI/LCA isentas para PF' },
    'Debêntures': { rate: 15, exemption: 'Incentivadas: isentas', notes: 'Tabela regressiva não-incentivadas' },
    'Stocks EUA': { rate: 15, exemption: 'Vendas até R$ 35.000/mês isentas', notes: 'Conversão pelo PTAX' },
    'REITs': { rate: 15, exemption: 'Vendas até R$ 35.000/mês isentas', notes: 'Dividendos: 30% retido nos EUA' },
    'Crypto': { rate: 15, exemption: 'Vendas até R$ 35.000/mês isentas', notes: 'Acima R$ 5M/mês: 22,5%' },
    'Imóvel': { rate: 15, exemption: 'Único imóvel até R$ 440k isento', notes: 'Pode usar fator redutor' },
    'Previdência': { rate: 15, exemption: 'PGBL: deduz até 12% da renda', notes: 'VGBL: IR só sobre rendimento' },
    'Commodities': { rate: 15, exemption: 'Depende do veículo', notes: 'Futuros: 15%' },
    'Outros': { rate: 15, exemption: '-', notes: 'Verificar caso a caso' },
};

const CalculadoraIR: React.FC<Props> = ({ investments, onClose }) => {
    const [sellPercentage, setSellPercentage] = useState(100);

    const taxEstimate = useMemo(() => {
        const byType: {
            type: InvestmentType; cost: number; current: number; gain: number;
            taxRate: number; estimatedTax: number; isExempt: boolean;
        }[] = [];

        const grouped = new Map<InvestmentType, { cost: number; current: number }>();
        investments.forEach(inv => {
            const cost = inv.quantity * inv.purchase_price;
            const current = inv.quantity * inv.current_price;
            const existing = grouped.get(inv.type) || { cost: 0, current: 0 };
            grouped.set(inv.type, { cost: existing.cost + cost, current: existing.current + current });
        });

        let totalTax = 0;
        let totalGain = 0;

        grouped.forEach((vals, type) => {
            const sellFactor = sellPercentage / 100;
            const cost = vals.cost * sellFactor;
            const current = vals.current * sellFactor;
            const gain = current - cost;
            const rules = TAX_RULES[type] || TAX_RULES['Outros'];
            const taxRate = rules.rate;
            const estimatedTax = gain > 0 ? gain * (taxRate / 100) : 0;
            const isExempt = gain <= 0;

            byType.push({ type, cost, current, gain, taxRate, estimatedTax, isExempt });
            if (gain > 0) { totalTax += estimatedTax; totalGain += gain; }
        });

        return { byType: byType.sort((a, b) => b.gain - a.gain), totalTax, totalGain };
    }, [investments, sellPercentage]);

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
                <div className="relative w-full max-w-2xl bg-white dark:bg-slate-850 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 animate-fade-in-up overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col">

                    {/* Header — mobile-friendly */}
                    <div className="bg-gradient-to-r from-rose-500 to-pink-500 p-4 sm:p-6 shrink-0">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-white/20 shrink-0">
                                    <Calculator className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-base sm:text-xl font-bold text-white leading-tight">Calculadora de IR</h3>
                                    <p className="text-rose-100 text-xs sm:text-sm mt-0.5 hidden sm:block">Estimativa de imposto sobre ganhos</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-1.5 sm:p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors shrink-0">
                                <X className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Disclaimer */}
                    <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-amber-50 dark:bg-amber-900/20 flex items-start gap-2 shrink-0">
                        <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <p className="text-[10px] sm:text-xs text-amber-700 dark:text-amber-300">
                            <strong>Estimativa simplificada.</strong> Consulte um contador para fins de declaração.
                        </p>
                    </div>

                    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto">
                        {/* Sell slider */}
                        <div>
                            <label className="block text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 sm:mb-2">
                                Simular venda de {sellPercentage}% da carteira
                            </label>
                            <input type="range" min={10} max={100} step={5} value={sellPercentage}
                                onChange={e => setSellPercentage(Number(e.target.value))}
                                className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-200 dark:bg-slate-700 accent-rose-500" />
                        </div>

                        {/* Summary cards — responsive */}
                        <div className="grid grid-cols-3 gap-2 sm:gap-4">
                            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center">
                                <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5 sm:mb-1">Ganho</p>
                                <p className={`text-xs sm:text-lg font-bold break-all ${taxEstimate.totalGain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                                    {formatCurrency(taxEstimate.totalGain)}
                                </p>
                            </div>
                            <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center border-2 border-rose-200 dark:border-rose-700">
                                <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5 sm:mb-1">IR</p>
                                <p className="text-xs sm:text-lg font-bold text-rose-600 dark:text-rose-400 break-all">
                                    {formatCurrency(taxEstimate.totalTax)}
                                </p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center">
                                <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5 sm:mb-1">Líquido</p>
                                <p className="text-xs sm:text-lg font-bold text-slate-800 dark:text-white break-all">
                                    {formatCurrency(taxEstimate.totalGain - taxEstimate.totalTax)}
                                </p>
                            </div>
                        </div>

                        {/* By type breakdown — mobile-friendly */}
                        <div className="space-y-2 sm:space-y-3">
                            <h4 className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">Detalhamento por Tipo</h4>
                            {taxEstimate.byType.map(item => {
                                const meta = TYPE_META[item.type];
                                const Icon = meta.icon;
                                const rules = TAX_RULES[item.type] || TAX_RULES['Outros'];

                                return (
                                    <div key={item.type} className="bg-slate-50 dark:bg-slate-900 rounded-xl sm:rounded-2xl p-3 sm:p-4">
                                        {/* Type header */}
                                        <div className="flex items-center justify-between mb-1.5 sm:mb-2 gap-2">
                                            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                                                <div className={`p-1 sm:p-1.5 rounded-lg ${meta.bg} ${meta.darkBg} shrink-0`}>
                                                    <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ color: meta.color }} />
                                                </div>
                                                <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white truncate">{item.type}</span>
                                                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 bg-slate-200 dark:bg-slate-800 px-1 sm:px-1.5 py-0.5 rounded shrink-0">
                                                    {item.taxRate}%
                                                </span>
                                            </div>
                                            <span className={`text-xs sm:text-sm font-bold shrink-0 ${item.gain >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                {formatCurrency(item.gain)}
                                            </span>
                                        </div>
                                        {/* Cost/Current + Tax */}
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-0 text-[10px] sm:text-xs text-slate-500">
                                            <span className="truncate">Custo: {formatCurrency(item.cost)} → Atual: {formatCurrency(item.current)}</span>
                                            <span className="font-bold text-rose-500 shrink-0">
                                                IR: {item.estimatedTax > 0 ? formatCurrency(item.estimatedTax) : 'Isento'}
                                            </span>
                                        </div>
                                        {/* Notes */}
                                        <div className="flex items-start gap-1 mt-1.5 sm:mt-2 text-[9px] sm:text-[10px] text-slate-400">
                                            <Info className="w-2.5 h-2.5 sm:w-3 sm:h-3 mt-0.5 flex-shrink-0" />
                                            <span>{rules.exemption}. {rules.notes}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalculadoraIR;
