import React, { useMemo, useState } from 'react';
import { Transaction, Goal, UserProfile } from '../types';
import { HeartPulse, CheckCircle2, XCircle, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { getTodayLocalDate } from '../utils';

interface HealthScoreProps {
    transactions: Transaction[];
    goals: Goal[];
    user: UserProfile;
}

export const HealthScore: React.FC<HealthScoreProps> = ({ transactions, goals, user }) => {
    const [expanded, setExpanded] = useState(false);

    const { score, pillars, label, colorClass } = useMemo(() => {
        const today = getTodayLocalDate();

        // 1. Taxa de Poupança (30pts)
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const thisMonthTxs = transactions.filter(t => {
            const d = new Date(t.date + 'T12:00:00Z');
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        const income = thisMonthTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const expense = thisMonthTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

        let savingsRate = 0;
        if (income > 0) {
            savingsRate = ((income - expense) / income) * 100;
        }

        const savingsPts = Math.min(Math.max((savingsRate / 20) * 30, 0), 30);

        // 2. Lembretes em Dia (20pts)
        const overdue = transactions.filter(t => t.status === 'pending' && t.type === 'expense' && t.date < today).length;
        const remindersPts = overdue === 0 ? 20 : Math.max(20 - (overdue * 5), 0);

        // 3. Metas Ativas (20pts)
        const activeGoals = goals.filter(g => g.current_amount < g.target_amount && new Date(g.deadline) >= new Date());
        const goalsPts = activeGoals.length > 0 ? 20 : 0;

        // 4. Peso Assinaturas (15pts)
        const subsExpense = thisMonthTxs.filter(t => t.type === 'expense' && (t.category.toLowerCase().includes('assinatura') || t.category.toLowerCase().includes('serviço'))).reduce((acc, t) => acc + t.amount, 0);
        let subsPercentage = 0;
        if (income > 0) subsPercentage = (subsExpense / income) * 100;
        const subsPts = subsPercentage < 25 ? 15 : Math.max(15 - ((subsPercentage - 25) * 0.5), 0);

        // 5. Consistência (15pts)
        const monthsWithActivity = new Set();
        const fourMonthsAgo = new Date();
        fourMonthsAgo.setMonth(currentMonth - 4);

        transactions.forEach(t => {
            const d = new Date(t.date + 'T12:00:00Z');
            if (d >= fourMonthsAgo) {
                monthsWithActivity.add(`${d.getFullYear()}-${d.getMonth()}`);
            }
        });

        const consistencyPts = monthsWithActivity.size >= 3 ? 15 : (monthsWithActivity.size * 5);

        // Total
        const totalScore = Math.round(savingsPts + remindersPts + goalsPts + subsPts + consistencyPts);

        let lbl = 'Crítica';
        let col = 'text-rose-500';
        let bg = 'bg-rose-500';
        let ring = 'ring-rose-500';
        let lightBg = 'bg-rose-50 dark:bg-rose-500/10';

        if (totalScore >= 80) {
            lbl = 'Excelente';
            col = 'text-emerald-500';
            bg = 'bg-emerald-500';
            ring = 'ring-emerald-500';
            lightBg = 'bg-emerald-50 dark:bg-emerald-500/10';
        } else if (totalScore >= 60) {
            lbl = 'Boa';
            col = 'text-green-500';
            bg = 'bg-green-500';
            ring = 'ring-green-500';
            lightBg = 'bg-green-50 dark:bg-green-500/10';
        } else if (totalScore >= 40) {
            lbl = 'Regular';
            col = 'text-amber-500';
            bg = 'bg-amber-500';
            ring = 'ring-amber-500';
            lightBg = 'bg-amber-50 dark:bg-amber-500/10';
        }

        return {
            score: totalScore,
            label: lbl,
            colorClass: { col, bg, ring, lightBg },
            pillars: [
                { name: 'Taxa de Poupança', pts: Math.round(savingsPts), max: 30, desc: savingsRate >= 20 ? '+20% de economia' : `${savingsRate.toFixed(1)}% economizado` },
                { name: 'Contas em Dia', pts: Math.round(remindersPts), max: 20, desc: overdue === 0 ? 'Tudo pago' : `${overdue} contas atrasadas` },
                { name: 'Metas Ativas', pts: Math.round(goalsPts), max: 20, desc: activeGoals.length > 0 ? `${activeGoals.length} meta(s) em andamento` : 'Nenhuma meta ativa' },
                { name: 'Assinaturas', pts: Math.round(subsPts), max: 15, desc: `< 25% da renda comprometida` },
                { name: 'Consistência', pts: Math.round(consistencyPts), max: 15, desc: `${monthsWithActivity.size >= 3 ? 'Uso regular' : 'Uso irregular'} do app` }
            ]
        };
    }, [transactions, goals]);

    // SVG parameters for half-circle arc
    const radius = 60;
    const stroke = 12;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * Math.PI; // Half circle
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
        <div className="bg-white dark:bg-slate-850 rounded-3xl p-5 md:p-6 shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col h-full relative overflow-hidden transition-all duration-300">

            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <HeartPulse className={`w-5 h-5 ${colorClass.col}`} />
                        Saúde Financeira
                    </h3>
                    <p className="text-xs text-slate-500">Métricas gerais de bem-estar</p>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center mt-2 relative">
                {/* Arc Chart */}
                <div className="relative w-40 h-24 flex justify-center items-end overflow-hidden mb-2">
                    <svg
                        height={radius * 2}
                        width={radius * 2}
                        className="absolute bottom-0"
                        style={{ transform: 'rotate(180deg)' }}
                    >
                        <circle
                            stroke="#e2e8f0"
                            fill="transparent"
                            strokeWidth={stroke}
                            strokeDasharray={`${circumference} ${circumference}`}
                            r={normalizedRadius}
                            cx={radius}
                            cy={radius}
                            strokeLinecap="round"
                            className="dark:stroke-slate-700"
                        />
                        <circle
                            stroke="currentColor"
                            fill="transparent"
                            strokeWidth={stroke}
                            strokeDasharray={`${circumference} ${circumference}`}
                            style={{ strokeDashoffset }}
                            r={normalizedRadius}
                            cx={radius}
                            cy={radius}
                            strokeLinecap="round"
                            className={`${colorClass.col} transition-all duration-1000 ease-out`}
                        />
                    </svg>
                    <div className="absolute bottom-2 left-0 w-full text-center flex flex-col items-center">
                        <span className={`text-5xl font-black ${colorClass.col} tracking-tighter leading-none`}>{score}</span>
                    </div>
                </div>

                <div className={`mt-2 mb-4 px-4 py-1.5 rounded-full text-sm font-bold ${colorClass.lightBg} ${colorClass.col}`}>
                    {label}
                </div>
            </div>

            {/* Expand/Collapse Button */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-center gap-1 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors border-t border-slate-100 dark:border-slate-800"
            >
                {expanded ? (
                    <>Ver menos <ChevronUp className="w-4 h-4" /></>
                ) : (
                    <>Detalhes <ChevronDown className="w-4 h-4" /></>
                )}
            </button>

            {/* Details (Expanded State) */}
            {expanded && (
                <div className="mt-4 space-y-3 animate-fade-in-up">
                    {pillars.map((p, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl">
                            <div>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{p.name}</p>
                                <p className="text-xs text-slate-500">{p.desc}</p>
                            </div>
                            <div className="text-right">
                                <span className={`text-sm font-bold ${p.pts === p.max ? 'text-emerald-500' : p.pts === 0 ? 'text-rose-500' : 'text-amber-500'}`}>
                                    {p.pts} <span className="text-xs font-medium text-slate-400">/ {p.max}</span>
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
