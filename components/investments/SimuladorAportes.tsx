import React, { useState, useMemo } from 'react';
import { X, TrendingUp, Calculator, Zap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from './helpers';

interface Props {
    onClose: () => void;
    currentTotal?: number;
}

const PRESETS = [
    { label: 'Conservador', rate: 10, desc: '~CDI' },
    { label: 'Moderado', rate: 14, desc: 'Mix RV+RF' },
    { label: 'Arrojado', rate: 20, desc: 'Ações/Crypto' },
];

const SimuladorAportes: React.FC<Props> = ({ onClose, currentTotal = 0 }) => {
    const [initialAmount, setInitialAmount] = useState(currentTotal);
    const [monthlyContribution, setMonthlyContribution] = useState(500);
    const [annualRate, setAnnualRate] = useState(14);
    const [years, setYears] = useState(10);

    const simulation = useMemo(() => {
        const monthlyRate = Math.pow(1 + annualRate / 100, 1 / 12) - 1;
        const months = years * 12;
        const data: { year: number; invested: number; total: number; earnings: number }[] = [];
        let balance = initialAmount;
        let totalInvested = initialAmount;

        for (let m = 1; m <= months; m++) {
            balance = balance * (1 + monthlyRate) + monthlyContribution;
            totalInvested += monthlyContribution;
            if (m % 12 === 0) {
                data.push({
                    year: m / 12,
                    invested: Math.round(totalInvested),
                    total: Math.round(balance),
                    earnings: Math.round(balance - totalInvested),
                });
            }
        }

        return {
            data,
            finalTotal: Math.round(balance),
            finalInvested: Math.round(totalInvested),
            finalEarnings: Math.round(balance - totalInvested),
        };
    }, [initialAmount, monthlyContribution, annualRate, years]);

    const sliderClass = "w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-200 dark:bg-slate-700 accent-emerald-500";
    const labelClass = "block text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 sm:mb-2";

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />
                <div className="relative w-full max-w-3xl bg-white dark:bg-slate-850 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 animate-fade-in-up overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col">

                    {/* Header */}
                    <div className="bg-gradient-to-r from-violet-500 to-indigo-500 p-4 sm:p-6 shrink-0">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-white/20 shrink-0">
                                    <Calculator className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-base sm:text-xl font-bold text-white leading-tight">Simulador de Aportes</h3>
                                    <p className="text-violet-100 text-xs sm:text-sm mt-0.5 hidden sm:block">Projete o crescimento da sua carteira</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-1.5 sm:p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors shrink-0">
                                <X className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">
                        {/* Presets */}
                        <div className="flex gap-2">
                            {PRESETS.map(p => (
                                <button key={p.label} onClick={() => setAnnualRate(p.rate)}
                                    className={`flex-1 py-2 sm:py-2.5 px-2 sm:px-3 rounded-xl text-xs font-bold transition-all ${annualRate === p.rate
                                        ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}>
                                    <span className="block text-xs">{p.label}</span>
                                    <span className="block text-[9px] sm:text-[10px] font-normal opacity-70 mt-0.5">{p.desc}</span>
                                </button>
                            ))}
                        </div>

                        {/* Sliders */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <div>
                                <label className={labelClass}>Patrimônio Inicial</label>
                                <input type="range" min={0} max={500000} step={1000} value={initialAmount}
                                    onChange={e => setInitialAmount(Number(e.target.value))} className={sliderClass} />
                                <p className="text-sm font-bold text-slate-800 dark:text-white mt-1">{formatCurrency(initialAmount)}</p>
                            </div>
                            <div>
                                <label className={labelClass}>Aporte Mensal</label>
                                <input type="range" min={0} max={10000} step={100} value={monthlyContribution}
                                    onChange={e => setMonthlyContribution(Number(e.target.value))} className={sliderClass} />
                                <p className="text-sm font-bold text-slate-800 dark:text-white mt-1">{formatCurrency(monthlyContribution)}</p>
                            </div>
                            <div>
                                <label className={labelClass}>Rentabilidade Anual (%)</label>
                                <input type="range" min={1} max={40} step={0.5} value={annualRate}
                                    onChange={e => setAnnualRate(Number(e.target.value))} className={sliderClass} />
                                <p className="text-sm font-bold text-slate-800 dark:text-white mt-1">{annualRate.toFixed(1)}% a.a.</p>
                            </div>
                            <div>
                                <label className={labelClass}>Prazo (anos)</label>
                                <input type="range" min={1} max={40} step={1} value={years}
                                    onChange={e => setYears(Number(e.target.value))} className={sliderClass} />
                                <p className="text-sm font-bold text-slate-800 dark:text-white mt-1">{years} anos</p>
                            </div>
                        </div>

                        {/* Results Cards — responsive */}
                        <div className="grid grid-cols-3 gap-2 sm:gap-4">
                            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center">
                                <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5 sm:mb-1">Investido</p>
                                <p className="text-xs sm:text-lg font-bold text-blue-600 dark:text-blue-400 break-all">{formatCurrency(simulation.finalInvested)}</p>
                            </div>
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center">
                                <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5 sm:mb-1">Rendimento</p>
                                <p className="text-xs sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 break-all">{formatCurrency(simulation.finalEarnings)}</p>
                            </div>
                            <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center border border-violet-200 dark:border-violet-700">
                                <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5 sm:mb-1 flex items-center justify-center gap-0.5"><Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Final</p>
                                <p className="text-xs sm:text-lg font-bold text-violet-600 dark:text-violet-400 break-all">{formatCurrency(simulation.finalTotal)}</p>
                            </div>
                        </div>

                        {/* Chart */}
                        <div className="h-52 sm:h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={simulation.data} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="gradInvested" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                    <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }}
                                        tickFormatter={v => `${v}a`} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 9 }}
                                        tickFormatter={v => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(255,255,255,0.97)', borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px -2px rgb(0 0 0 / 0.15)', color: '#1e293b', fontSize: '12px' }}
                                        formatter={(value: number, name: string) => [formatCurrency(value), name === 'total' ? 'Patrimônio' : 'Investido']}
                                        labelFormatter={v => `Ano ${v}`}
                                    />
                                    <Area type="monotone" dataKey="invested" name="Investido" stroke="#3B82F6" strokeWidth={2} fill="url(#gradInvested)" dot={false} />
                                    <Area type="monotone" dataKey="total" name="Patrimônio" stroke="#8B5CF6" strokeWidth={3} fill="url(#gradTotal)" dot={false} />
                                    <Legend wrapperStyle={{ paddingTop: '8px' }}
                                        formatter={v => <span className="text-[10px] sm:text-xs text-slate-500 font-semibold">{v === 'total' ? 'Patrimônio' : 'Investido'}</span>} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SimuladorAportes;
