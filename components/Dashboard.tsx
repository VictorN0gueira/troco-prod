import React, { useMemo, useState } from 'react';
import { Transaction, UserProfile } from '../types';
import { parseDateFromDB } from '../utils';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, Calendar, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Tooltip as PieTooltip, Legend
} from 'recharts';

interface DashboardProps {
  transactions: Transaction[];
  user: UserProfile;
}

const Dashboard: React.FC<DashboardProps> = ({ transactions = [], user }) => {
  // State for Month Selection
  const [currentDate, setCurrentDate] = useState(new Date());

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const firstName = user.nome ? user.nome.split(' ')[0] : 'Usuário';

  // --- Date Navigation Handlers ---
  const nextMonth = () => {
    setCurrentDate(prev => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + 1);
      return next;
    });
  };

  const prevMonth = () => {
    setCurrentDate(prev => {
      const prevDate = new Date(prev);
      prevDate.setMonth(prev.getMonth() - 1);
      return prevDate;
    });
  };

  const currentMonthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  // Capitalize month
  const displayMonth = currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1);

  // --- Data Processing ---

  // 1. Filter Transactions for Selected Month
  const monthlyTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Usa utilitário para converter string DB para objeto Date Local
      const tDate = parseDateFromDB(t.date);
      return (
        tDate.getMonth() === currentDate.getMonth() &&
        tDate.getFullYear() === currentDate.getFullYear()
      );
    });
  }, [transactions, currentDate]);

  // 2. Calculate Totals (Consolidated vs Expected)
  const stats = useMemo(() => {
    let incomePaid = 0;
    let incomePending = 0;
    let expensePaid = 0;
    let expensePending = 0;

    monthlyTransactions.forEach(t => {
      const val = Number(t.amount); // Force number
      if (t.type === 'income') {
        if (t.status === 'completed') incomePaid += val;
        else incomePending += val;
      } else {
        if (t.status === 'completed') expensePaid += val;
        else expensePending += val;
      }
    });

    return {
      income: {
        total: incomePaid + incomePending,
        paid: incomePaid,
        pending: incomePending
      },
      expense: {
        total: expensePaid + expensePending,
        paid: expensePaid,
        pending: expensePending
      },
      balance: {
        realized: incomePaid - expensePaid, // O que de fato entrou/saiu
        projected: (incomePaid + incomePending) - (expensePaid + expensePending) // Previsão
      }
    };
  }, [monthlyTransactions]);

  // 3. Process Chart Data (Last 6 Months History) - Independent of selection
  const chartData = useMemo(() => {
    const data = [];
    const today = new Date(); // Always relative to real today
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const month = d.getMonth();
      const year = d.getFullYear();
      const monthName = d.toLocaleDateString('pt-BR', { month: 'short' });
      
      const monthTxs = transactions.filter(t => {
        const tDate = parseDateFromDB(t.date);
        return tDate.getMonth() === month && tDate.getFullYear() === year;
      });

      const income = monthTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
      const expense = monthTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
      
      data.push({
        name: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        income,
        expense,
        balance: income - expense
      });
    }
    return data;
  }, [transactions]);

  // 4. Process Category Data (Pie Chart) - Based on Selected Month
  const categoryData = useMemo(() => {
    // Only expenses
    const expenses = monthlyTransactions.filter(t => t.type === 'expense');
    
    const grouped = expenses.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + Number(curr.amount);
      return acc;
    }, {} as Record<string, number>);

    const COLORS = [
      '#10B981', '#3B82F6', '#F43F5E', '#F59E0B', '#8B5CF6', 
      '#EC4899', '#6366F1', '#14B8A6', '#84CC16'
    ];

    return Object.entries(grouped)
      .map(([name, value], index) => ({
        name,
        value: Number(value),
        color: COLORS[index % COLORS.length]
      }))
      .sort((a, b) => b.value - a.value);
  }, [monthlyTransactions]);

  return (
    <div className="space-y-6">
      
      {/* Header & Date Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white">
            Olá, <span className="text-primary-500">{firstName}</span>!
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Aqui está o resumo financeiro de <strong>{displayMonth}</strong>.
          </p>
        </div>

        <div className="flex items-center bg-white dark:bg-slate-850 p-1.5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors">
                <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 px-4 min-w-[160px] justify-center text-slate-700 dark:text-white font-semibold">
                <Calendar className="w-4 h-4 text-primary-500" />
                {displayMonth}
            </div>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors">
                <ChevronRight className="w-5 h-5" />
            </button>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        {/* Card 1: Saldo Realizado (Large) */}
        <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 dark:from-emerald-900 dark:to-slate-950 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Wallet className="w-24 h-24 md:w-32 md:h-32" />
          </div>
          <div className="relative z-10 flex flex-col justify-between h-full min-h-[140px]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                 <p className="text-slate-300 font-medium text-sm md:text-base">Saldo Realizado</p>
                 <span className="text-[10px] bg-slate-700/50 px-2 py-0.5 rounded text-slate-300 border border-slate-600">Mês Atual</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mt-1 md:mt-2 truncate">
                {formatCurrency(stats.balance.realized)}
              </h2>
            </div>
            
            <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-slate-300">
               {stats.balance.projected !== stats.balance.realized && (
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-md">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    <span>
                        Previsto: <strong className="text-white">{formatCurrency(stats.balance.projected)}</strong>
                    </span>
                  </div>
               )}
            </div>
          </div>
        </div>

        {/* Card 2: Receitas */}
        <div className="col-span-1 bg-white dark:bg-slate-850 rounded-3xl p-5 md:p-6 shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 transition-transform hover:-translate-y-1 duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl">
              <ArrowUpRight className="w-5 h-5 md:w-6 md:h-6 text-emerald-500" />
            </div>
            {stats.income.pending > 0 && (
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20 px-2 py-1 rounded-full">
                    +{formatCurrency(stats.income.pending)} pendente
                </span>
            )}
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Receitas Totais</p>
          <h3 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white mt-1 truncate">
            {formatCurrency(stats.income.total)}
          </h3>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
             {formatCurrency(stats.income.paid)} recebidos
          </p>
        </div>

        {/* Card 3: Despesas */}
        <div className="col-span-1 bg-white dark:bg-slate-850 rounded-3xl p-5 md:p-6 shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 transition-transform hover:-translate-y-1 duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-rose-50 dark:bg-rose-500/10 rounded-2xl">
              <ArrowDownRight className="w-5 h-5 md:w-6 md:h-6 text-rose-500" />
            </div>
            {stats.expense.pending > 0 && (
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20 px-2 py-1 rounded-full">
                    +{formatCurrency(stats.expense.pending)} pendente
                </span>
            )}
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Despesas Totais</p>
          <h3 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white mt-1 truncate">
            {formatCurrency(stats.expense.total)}
          </h3>
          <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 font-medium">
             {formatCurrency(stats.expense.paid)} pagos
          </p>
        </div>

        {/* Card 4: Main Area Chart */}
        <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-white dark:bg-slate-850 rounded-3xl p-5 md:p-6 shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary-500" />
                Histórico de Fluxo de Caixa
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Últimos 6 meses (Geral)</p>
            </div>
          </div>
          <div className="h-60 md:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={(value) => {
                     if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                     return value;
                  }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    color: '#1e293b'
                  }}
                  itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                  formatter={(value: number) => [formatCurrency(value), 'Valor']}
                />
                <Area 
                  type="monotone" 
                  dataKey="income" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorIncome)" 
                  name="Receitas"
                />
                <Area 
                  type="monotone" 
                  dataKey="expense" 
                  stroke="#F43F5E" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorExpense)" 
                  name="Despesas"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 5: Donut Chart */}
        <div className="col-span-1 bg-white dark:bg-slate-850 rounded-3xl p-5 md:p-6 shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Gastos do Mês</h3>
          <p className="text-xs text-slate-500 mb-4">{displayMonth}</p>
          <div className="flex-1 min-h-[250px] relative">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <PieTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [formatCurrency(value), 'Valor']}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(value) => <span className="text-xs text-slate-500 dark:text-slate-400">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full flex-col text-slate-400 gap-2">
                <Wallet className="w-8 h-8 opacity-20" />
                <span className="text-xs text-center">Sem despesas<br/>neste mês</span>
              </div>
            )}
            {/* Center Text */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
              <span className="text-xs font-semibold text-slate-400">Por Categoria</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;