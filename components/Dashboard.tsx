import React, { useMemo, useState, useEffect } from 'react';
import { Transaction, UserProfile, CreditCard, Budget, Goal } from '../types';
import { parseDateFromDB, getProjectedTransactions, getInvoiceReferenceDate } from '../utils'; // Added getInvoiceReferenceDate
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, Calendar, ChevronLeft, ChevronRight, AlertCircle, GripVertical } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip as PieTooltip, Legend
} from 'recharts';
import { SpotlightCard } from './ui/spotlight-card';
import NumberTicker from './ui/number-ticker';
import NoSpendCalendar from './ui/no-spend-calendar';
import { HealthScore } from './HealthScore';
import { CashflowChart } from './CashflowChart';

interface DashboardProps {
  transactions: Transaction[];
  user: UserProfile;
  privacyMode: boolean;
  cards: CreditCard[];
  budgets?: Budget[];
  goals?: Goal[];
}

const Dashboard: React.FC<DashboardProps> = ({ transactions = [], user, privacyMode, cards = [], budgets = [], goals = [] }) => {
  // State for Month Selection
  const [currentDate, setCurrentDate] = useState(new Date());

  // State for View Mode: 'cash' (Vencimento/Caixa) vs 'accrual' (Compra/Competência)
  const [viewMode, setViewMode] = useState<'cash' | 'accrual'>('cash');

  // State for Drag & Drop Order
  // Default Order: ['balance', 'income', 'expense', 'chart', 'categories', 'budgets']
  const [cardsOrder, setCardsOrder] = useState<string[]>([]);

  // Initialize Order from LocalStorage (Simple Persistence)
  useEffect(() => {
    const savedOrder = localStorage.getItem(`dashboard_order_${user.id}`);
    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder);
        // Migrating old users to see the new budgets card automatically if they didn't have it
        if (!parsed.includes('budgets')) parsed.push('budgets');
        if (!parsed.includes('healthScore')) parsed.push('healthScore');
        if (!parsed.includes('cashflow')) parsed.push('cashflow');
        setCardsOrder(parsed);
      } catch (e) {
        setCardsOrder(['healthScore', 'balance', 'income', 'expense', 'cashflow', 'chart', 'categories', 'budgets']);
      }
    } else {
      setCardsOrder(['healthScore', 'balance', 'income', 'expense', 'cashflow', 'chart', 'categories', 'budgets']);
    }
  }, [user.id]);

  // Drag & Drop Handlers
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedItemIndex === null) return;

    const newOrder = [...cardsOrder];
    const [draggedItem] = newOrder.splice(draggedItemIndex, 1);
    newOrder.splice(dropIndex, 0, draggedItem);

    setCardsOrder(newOrder);
    setDraggedItemIndex(null);
    localStorage.setItem(`dashboard_order_${user.id}`, JSON.stringify(newOrder));
  };


  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Helper para Privacy Mode com Blur Melhorado
  const BlurText = ({ children }: { children: React.ReactNode }) => (
    <span
      className={`
            transition-all duration-700 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] 
            inline-block align-middle
            ${privacyMode
          ? 'filter blur-[8px] opacity-60 select-none cursor-default'
          : 'filter blur-0 opacity-100'
        }
        `}
    >
      {children}
    </span>
  );

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

  // 0. Pre-process Transactions for Credit Cards (Invoice Shifting)
  const effectiveTransactions = useMemo(() => {
    // If Accrual mode (Competência), return transactions AS IS (Purchase Date)
    if (viewMode === 'accrual') return transactions;

    if (!cards || cards.length === 0) return transactions;

    return transactions.map(t => {
      // If not expense or not associated with card, return as is
      // Note: We only shift expenses. ID checking handles both number and string types from legacy
      if (t.type !== 'expense' || !t.cardId) return t;

      const card = cards.find(c => c.id === t.cardId);
      if (!card) return t;

      // Calculate Invoice "Reference Month"
      const invoiceRefDate = getInvoiceReferenceDate(t.date, card.closing_day);

      // Calculate Due Date (effective cash flow date)
      const year = invoiceRefDate.getFullYear();
      const month = invoiceRefDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const effectiveDay = Math.min(card.due_day, daysInMonth);

      const effectiveDate = new Date(year, month, effectiveDay);

      // Format back to YYYY-MM-DD
      const y = effectiveDate.getFullYear();
      const m = String(effectiveDate.getMonth() + 1).padStart(2, '0');
      const d = String(effectiveDate.getDate()).padStart(2, '0');

      const newDateStr = `${y}-${m}-${d}`;

      return {
        ...t,
        date: newDateStr
      };
    });
  }, [transactions, cards, viewMode]);

  // 1. Filter Transactions for Selected Month (Includes Projected)
  const monthlyTransactions = useMemo(() => {
    const viewYear = currentDate.getFullYear();
    const viewMonth = currentDate.getMonth();

    // Usa a função centralizada para mesclar Reais + Recorrentes
    return getProjectedTransactions(effectiveTransactions, viewMonth, viewYear);
  }, [effectiveTransactions, currentDate]);

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



      // Usa a projeção também para o gráfico (importante para meses futuros se o gráfico mostrasse futuro, 
      // mas como é histórico (last 6 months), a projeção serve para garantir que se visualizarmos o mês atual ele bata com o card)
      const monthTxs = getProjectedTransactions(effectiveTransactions, month, year);

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
  }, [effectiveTransactions]);

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

  // --- Card Renderers (for DnD) ---

  const renderCard = (type: string) => {
    switch (type) {
      case 'balance':
        return (
          <SpotlightCard id="tour-dashboard-balance" className="bg-slate-900 border-none dark:bg-slate-950 rounded-3xl p-6 md:p-8 text-white shadow-xl group h-full">
            {/* Border Beam */}
            <div className="border-beam" />

            {/* Background Glow */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.15),transparent_70%)] pointer-events-none" />

            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
              <Wallet className="w-24 h-24 md:w-32 md:h-32" />
            </div>
            <div className="relative z-10 flex flex-col justify-between h-full min-h-[140px]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-slate-300 font-medium text-sm md:text-base">Saldo Realizado</p>
                  <span className="text-[10px] bg-slate-700/50 px-2 py-0.5 rounded text-slate-300 border border-slate-600">Mês Atual</span>
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mt-1 md:mt-2 truncate">
                  <BlurText><NumberTicker value={stats.balance.realized} isCurrency decimalPlaces={2} prefix={stats.balance.realized >= 0 ? "+R$ " : "-R$ "} /></BlurText>
                </h2>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-slate-300">
                {stats.balance.projected !== stats.balance.realized && (
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-md">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    <span>
                      Previsto: <strong className="text-white"><BlurText><NumberTicker value={stats.balance.projected} isCurrency decimalPlaces={2} prefix={stats.balance.projected >= 0 ? "R$ " : "-R$ "} /></BlurText></strong>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </SpotlightCard>
        );
      case 'income':
        return (
          <SpotlightCard className="bg-white border-transparent shadow shadow-emerald-500/10 dark:bg-slate-850 rounded-3xl p-5 md:p-6 transition-transform hover:-translate-y-1 duration-300 h-full">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_100%_0%,rgba(16,185,129,0.05),transparent_50%)] pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl">
                  <ArrowUpRight className="w-5 h-5 md:w-6 md:h-6 text-emerald-500" />
                </div>
                {stats.income.pending > 0 && (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20 px-2 py-1 rounded-full">
                    +<BlurText><NumberTicker value={stats.income.pending} isCurrency decimalPlaces={2} prefix="R$ " /></BlurText> pendente
                  </span>
                )}
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Receitas Totais</p>
              <h3 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white mt-1 truncate">
                <BlurText><NumberTicker value={stats.income.total} isCurrency decimalPlaces={2} prefix="R$ " /></BlurText>
              </h3>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                <BlurText><NumberTicker value={stats.income.paid} isCurrency decimalPlaces={2} prefix="R$ " /></BlurText> recebidos
              </p>
            </div>
          </SpotlightCard>
        );
      case 'expense':
        return (
          <SpotlightCard className="bg-white border-transparent shadow shadow-rose-500/10 dark:bg-slate-850 rounded-3xl p-5 md:p-6 transition-transform hover:-translate-y-1 duration-300 h-full">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_100%_0%,rgba(244,63,94,0.05),transparent_50%)] pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-rose-50 dark:bg-rose-500/10 rounded-2xl">
                  <ArrowDownRight className="w-5 h-5 md:w-6 md:h-6 text-rose-500" />
                </div>
                {stats.expense.pending > 0 && (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20 px-2 py-1 rounded-full">
                    +<BlurText><NumberTicker value={stats.expense.pending} isCurrency decimalPlaces={2} prefix="R$ " /></BlurText> pendente
                  </span>
                )}
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Despesas Totais</p>
              <h3 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white mt-1 truncate">
                <BlurText><NumberTicker value={stats.expense.total} isCurrency decimalPlaces={2} prefix="R$ " /></BlurText>
              </h3>
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 font-medium">
                <BlurText><NumberTicker value={stats.expense.paid} isCurrency decimalPlaces={2} prefix="R$ " /></BlurText> pagos
              </p>
            </div>
          </SpotlightCard>
        );
      case 'chart':
        return (
          <div className="bg-white dark:bg-slate-850 rounded-3xl p-5 md:p-6 shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 h-full">
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
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
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
                  {/* The provided @keyframes float rule is CSS and cannot be directly inserted here in JSX.
                      If you intend to add CSS animations, please place them in a CSS file or use a CSS-in-JS solution. */}
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
                    formatter={(value: number) => privacyMode ? ['***', 'Valor'] : [formatCurrency(value), 'Valor']}
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
        );
      case 'categories':
        return (
          <div className="bg-white dark:bg-slate-850 rounded-3xl p-5 md:p-6 shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col h-full">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Gastos do Mês</h3>
            <p className="text-xs text-slate-500 mb-4">{displayMonth}</p>
            <div className="flex-1 flex flex-col relative w-full">
              {categoryData.length > 0 ? (
                <>
                  <div className="h-[180px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                          ))}
                        </Pie>
                        <PieTooltip
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          formatter={(value: number) => privacyMode ? ['***', 'Valor'] : [formatCurrency(value), 'Valor']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center Text */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-xs font-semibold text-slate-400">Por Categoria</span>
                    </div>
                  </div>

                  {/* Custom Scrollable Legend */}
                  <div className="mt-4 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar w-full">
                    <div className="grid grid-cols-2 gap-x-2 gap-y-3">
                      {categoryData.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                          <span className="truncate" title={entry.name}>{entry.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-[180px] flex-col text-slate-400 gap-2">
                  <Wallet className="w-8 h-8 opacity-20" />
                  <span className="text-xs text-center">Sem despesas<br />neste mês</span>
                </div>
              )}
            </div>
          </div>
        );
      case 'cashflow':
        const vYear = currentDate.getFullYear();
        const vMonth = currentDate.getMonth();
        return (
          <CashflowChart
            monthlyTransactions={monthlyTransactions}
            budgets={budgets}
            cards={cards}
            viewMonth={vMonth}
            viewYear={vYear}
            privacyMode={privacyMode}
          />
        );
      case 'budgets':
        // Calculate relevant budgets for the selected month
        const viewYear = currentDate.getFullYear();
        const viewMonth = currentDate.getMonth() + 1; // 1-12
        const currentBudgets = budgets.filter(b => b.mes === viewMonth && b.ano === viewYear);

        return (
          <div className="bg-white dark:bg-slate-850 rounded-3xl p-5 md:p-6 shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col h-full col-span-1 md:col-span-2">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Orçamentos do Mês</h3>
            <p className="text-xs text-slate-500 mb-4">{displayMonth}</p>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {currentBudgets.length > 0 ? currentBudgets.map(b => {
                const spent = monthlyTransactions.filter(t => t.category === b.categoria && t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
                const progress = Math.min((spent / b.valor_limite) * 100, 100);
                const isOver = spent > b.valor_limite;
                return (
                  <div key={b.id} className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{b.categoria}</span>
                      <span className={`text-xs font-medium ${isOver ? 'text-rose-500' : 'text-slate-500'}`}>
                        <BlurText>{formatCurrency(spent)} / {formatCurrency(b.valor_limite)}</BlurText>
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-rose-500' : progress >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              }) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 py-6 gap-2 opacity-50">
                  <TrendingUp className="w-8 h-8" />
                  <span className="text-sm">Nenhum orçamento configurado</span>
                </div>
              )}
            </div>
          </div>
        );
      case 'healthScore':
        return (
          <HealthScore transactions={transactions} goals={goals} user={user} />
        );
      default:
        return null;
    }
  };

  const getCardClasses = (key: string) => {
    // Definir spans baseados no card
    let spanClasses = "col-span-1";
    if (key === 'balance' || key === 'budgets') spanClasses = "col-span-1 md:col-span-2";
    if (key === 'chart') spanClasses = "col-span-1 md:col-span-2 lg:col-span-3";
    if (key === 'healthScore') spanClasses = "col-span-1";

    // Animação de drag
    return `${spanClasses} relative group transition-all duration-300`;
  };

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

        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* View Mode Toggle */}
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex items-center">
            <button
              onClick={() => setViewMode('cash')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === 'cash'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
            >
              Caixa
            </button>
            <button
              onClick={() => setViewMode('accrual')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === 'accrual'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
            >
              Competência
            </button>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center bg-white dark:bg-slate-850 p-1.5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-all active:scale-95">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 px-4 min-w-[160px] justify-center text-slate-700 dark:text-white font-semibold">
              <Calendar className="w-4 h-4 text-primary-500" />
              {displayMonth}
            </div>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-all active:scale-95">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bento Grid Layout with DnD */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {(cardsOrder.length > 0 ? cardsOrder : ['healthScore', 'balance', 'income', 'expense', 'chart', 'categories', 'budgets']).map((key, index) => (
          <div
            key={key}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            className={`${getCardClasses(key)} ${draggedItemIndex === index ? 'opacity-50 scale-95' : 'opacity-100'}`}
          >
            {/* Drag Handle (Visible on Hover) */}
            <div className="absolute top-2 right-2 p-1.5 bg-slate-900/10 dark:bg-white/10 rounded cursor-move opacity-0 group-hover:opacity-100 transition-opacity z-20">
              <GripVertical className="w-4 h-4 text-slate-500 dark:text-slate-300" />
            </div>
            {renderCard(key)}
          </div>
        ))}
      </div>

      {/* No Spend Days Calendar */}
      <NoSpendCalendar transactions={transactions} />
    </div>
  );
};

export default Dashboard;