import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Transaction, Budget, CreditCard } from '../types';
import { generateCashflowProjection } from '../projection';
import { TrendingUp, AlertCircle, Calendar } from 'lucide-react';

interface CashflowChartProps {
    monthlyTransactions: Transaction[];
    budgets: Budget[];
    cards: CreditCard[];
    viewMonth: number;
    viewYear: number;
    privacyMode: boolean;
}

export const CashflowChart: React.FC<CashflowChartProps> = ({
    monthlyTransactions,
    budgets,
    cards,
    viewMonth,
    viewYear,
    privacyMode
}) => {
    const projectionData = useMemo(() => {
        return generateCashflowProjection(monthlyTransactions, budgets, viewMonth, viewYear);
    }, [monthlyTransactions, budgets, viewMonth, viewYear]);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const today = new Date();
    const isCurrentMonth = today.getMonth() === viewMonth && today.getFullYear() === viewYear;
    const currentDay = today.getDate();

    // Find projected balance at end of month
    const endOfMonthBalance = projectionData.length > 0 ? projectionData[projectionData.length - 1].balance : 0;
    const isPositive = endOfMonthBalance >= 0;

    return (
        <div className="bg-white dark:bg-slate-850 rounded-3xl p-5 md:p-6 shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-500" />
                        Previsão do Mês
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Projeção até o fim do mês simulando pendências
                    </p>
                </div>
            </div>

            {/* Resumo da Previsão */}
            <div className={`mb-6 p-4 rounded-2xl flex items-center gap-4 ${isPositive ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400'}`}>
                {isPositive ? <TrendingUp className="w-8 h-8 opacity-80" /> : <AlertCircle className="w-8 h-8 opacity-80" />}
                <div>
                    <p className="text-xs font-medium uppercase tracking-wider opacity-80">Previsão Dia {projectionData.length}</p>
                    <div className="text-2xl font-bold">
                        {privacyMode ? 'R$ ***' : formatCurrency(endOfMonthBalance)}
                    </div>
                    <p className="text-sm opacity-90 mt-0.5">
                        {isPositive ? 'Sobra prevista no final do mês. 🥳' : 'Atenção: Risco de fechar no vermelho! ⚠️'}
                    </p>
                </div>
            </div>

            <div className="flex-1 min-h-[220px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={projectionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorProjectedBalance" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.3} />
                        <XAxis
                            dataKey="day"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 11 }}
                            tickFormatter={(val) => `Dia ${val}`}
                            dy={10}
                            interval="preserveStartEnd"
                            minTickGap={20}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 11 }}
                            tickFormatter={(value) => {
                                if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}k`;
                                return String(value);
                            }}
                        />
                        <RechartsTooltip
                            contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                borderRadius: '12px',
                                border: 'none',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                color: '#1e293b'
                            }}
                            labelFormatter={(label) => `Dia ${label}`}
                            formatter={(value: number) => privacyMode ? ['***', 'Saldo'] : [formatCurrency(value), 'Saldo']}
                        />
                        {isCurrentMonth && (
                            <ReferenceLine
                                x={currentDay}
                                stroke="#94a3b8"
                                strokeDasharray="3 3"
                                label={{ position: 'top', value: 'Hoje', fill: '#94a3b8', fontSize: 10 }}
                            />
                        )}
                        <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="3 3" />
                        <Area
                            type="monotone"
                            dataKey="balance"
                            stroke="#6366f1"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorProjectedBalance)"
                            name="Saldo Projetado"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
