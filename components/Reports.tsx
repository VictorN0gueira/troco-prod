import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Transaction } from '../types';
import { parseDateFromDB, formatDateDisplay, getTodayLocalDate } from '../utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Download, Calendar, TrendingUp, DollarSign, Activity, FileText, FileSpreadsheet, File as FileIcon, ChevronDown } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportsProps {
  transactions: Transaction[];
}

type DateRangeType = '6_months' | 'ytd' | '1_year' | 'all';

const Reports: React.FC<ReportsProps> = ({ transactions }) => {
  const [dateRange, setDateRange] = useState<DateRangeType>('6_months');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatPercentage = (val: number) => 
    `${val.toFixed(1)}%`;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const { filteredTransactions, startDate } = useMemo(() => {
    const now = new Date();
    let start = new Date();
    
    switch (dateRange) {
      case '6_months':
        start.setMonth(now.getMonth() - 5);
        start.setDate(1);
        break;
      case '1_year':
        start.setMonth(now.getMonth() - 11);
        start.setDate(1);
        break;
      case 'ytd':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      case 'all':
        start = new Date(0);
        break;
    }

    start.setHours(0, 0, 0, 0);

    const filtered = transactions.filter(t => {
      const tDate = parseDateFromDB(t.date); 
      return tDate >= start;
    });

    return { filteredTransactions: filtered, startDate: start };
  }, [transactions, dateRange]);

  const monthlyData = useMemo(() => {
    const data: Record<string, { name: string; income: number; expense: number; dateObj: Date }> = {};
    const now = new Date();
    const iterator = new Date(startDate);

    if (dateRange === 'all') {
        if (transactions.length > 0) {
            const oldestStr = transactions.reduce((min, p) => p.date < min ? p.date : min, transactions[0].date);
            const oldest = parseDateFromDB(oldestStr);
            iterator.setTime(oldest.getTime());
            iterator.setDate(1);
        } else {
            iterator.setMonth(now.getMonth() - 11);
        }
    }
    
    while (iterator <= now || iterator.getMonth() === now.getMonth()) {
      const key = `${iterator.getFullYear()}-${iterator.getMonth()}`;
      const monthName = iterator.toLocaleDateString('pt-BR', { month: 'short' });
      const formattedName = monthName.charAt(0).toUpperCase() + monthName.slice(1);
      
      data[key] = { 
        name: dateRange === '1_year' || dateRange === 'all' ? `${formattedName}/${iterator.getFullYear().toString().slice(2)}` : formattedName, 
        income: 0, 
        expense: 0,
        dateObj: new Date(iterator)
      };
      
      iterator.setMonth(iterator.getMonth() + 1);
      if (iterator.getFullYear() > now.getFullYear() + 1) break; 
    }

    filteredTransactions.forEach(t => {
      const d = parseDateFromDB(t.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      
      if (data[key]) {
        if (t.type === 'income') {
          data[key].income += t.amount;
        } else {
          data[key].expense += t.amount;
        }
      }
    });

    return Object.values(data);
  }, [filteredTransactions, startDate, dateRange, transactions]);

  const statusData = useMemo(() => {
    const pending = filteredTransactions.filter(t => t.status === 'pending').reduce((acc, t) => acc + t.amount, 0);
    const completed = filteredTransactions.filter(t => t.status === 'completed').reduce((acc, t) => acc + t.amount, 0);

    if (pending === 0 && completed === 0) return [];

    return [
      { name: 'Pago', value: completed, color: '#10B981' },
      { name: 'Pendente', value: pending, color: '#F59E0B' },
    ];
  }, [filteredTransactions]);

  const kpis = useMemo(() => {
    const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const count = filteredTransactions.length;
    
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
    const averageTicket = count > 0 ? (totalIncome + totalExpense) / count : 0;

    return {
      savingsRate,
      averageTicket,
      totalTransactions: count,
      netResult: totalIncome - totalExpense,
      totalIncome,
      totalExpense
    };
  }, [filteredTransactions]);

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      alert("Não há dados para exportar neste período.");
      return;
    }
    
    const summaryRows = [
        "RESUMO DO PERÍODO",
        `Receitas Totais;${kpis.totalIncome.toFixed(2).replace('.', ',')}`,
        `Despesas Totais;${kpis.totalExpense.toFixed(2).replace('.', ',')}`,
        `Resultado Líquido;${kpis.netResult.toFixed(2).replace('.', ',')}`,
        `Total Transações;${kpis.totalTransactions}`,
        ""
    ];

    const headers = ["ID;Data;Descrição;Categoria;Tipo;Valor;Status"];
    
    const dataRows = filteredTransactions.map(t => {
      const formattedDate = formatDateDisplay(t.date);
      const formattedAmount = t.amount.toFixed(2).replace('.', ',');
      const typeLabel = t.type === 'income' ? 'Receita' : 'Despesa';
      const statusLabel = t.status === 'completed' ? 'Pago' : 'Pendente';
      const safeDesc = `"${t.description.replace(/"/g, '""')}"`;

      return `${t.id};${formattedDate};${safeDesc};${t.category};${typeLabel};${formattedAmount};${statusLabel}`;
    });

    const csvContent = "\uFEFF" + summaryRows.concat(headers).concat(dataRows).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `troco_relatorio_${getTodayLocalDate()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportMenuOpen(false);
  };

  const handleExportPDF = () => {
     if (filteredTransactions.length === 0) {
      alert("Não há dados para exportar neste período.");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const primaryColor = '#10B981';
    const slateColor = '#1e293b';

    doc.setFontSize(22);
    doc.setTextColor(primaryColor);
    doc.text("Trocô Financial", 14, 20);

    doc.setFontSize(14);
    doc.setTextColor(slateColor);
    doc.text("Relatório Analítico de Transações", 14, 30);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 38);
    
    let periodoLabel = '';
    if(dateRange === '6_months') periodoLabel = "Últimos 6 Meses";
    else if(dateRange === 'ytd') periodoLabel = "Este Ano (YTD)";
    else if(dateRange === '1_year') periodoLabel = "Últimos 12 Meses";
    else periodoLabel = "Todo o Período";
    
    doc.text(`Período: ${periodoLabel}`, 14, 43);

    const startY = 55;
    const cardWidth = 55;
    const cardHeight = 25;
    const gap = 10;

    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(16, 185, 129);
    doc.roundedRect(14, startY, cardWidth, cardHeight, 3, 3, 'FD');
    doc.setFontSize(10);
    doc.setTextColor(16, 185, 129);
    doc.text("Receitas Totais", 19, startY + 8);
    doc.setFontSize(14);
    doc.setTextColor(6, 78, 59);
    doc.text(formatCurrency(kpis.totalIncome), 19, startY + 18);

    doc.setFillColor(255, 241, 242);
    doc.setDrawColor(244, 63, 94);
    doc.roundedRect(14 + cardWidth + gap, startY, cardWidth, cardHeight, 3, 3, 'FD');
    doc.setFontSize(10);
    doc.setTextColor(244, 63, 94);
    doc.text("Despesas Totais", 19 + cardWidth + gap, startY + 8);
    doc.setFontSize(14);
    doc.setTextColor(136, 19, 55);
    doc.text(formatCurrency(kpis.totalExpense), 19 + cardWidth + gap, startY + 18);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(100, 116, 139);
    doc.roundedRect(14 + (cardWidth + gap) * 2, startY, cardWidth, cardHeight, 3, 3, 'FD');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text("Resultado Líquido", 19 + (cardWidth + gap) * 2, startY + 8);
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(formatCurrency(kpis.netResult), 19 + (cardWidth + gap) * 2, startY + 18);

    const tableData = filteredTransactions.map(t => [
        formatDateDisplay(t.date),
        t.description,
        t.category,
        t.type === 'income' ? 'Receita' : 'Despesa',
        formatCurrency(t.amount),
        t.status === 'completed' ? 'Pago' : 'Pendente'
    ]);

    autoTable(doc, {
        startY: startY + cardHeight + 15,
        head: [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor', 'Status']],
        body: tableData,
        theme: 'striped',
        headStyles: {
            fillColor: [30, 41, 59],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
        },
        styles: {
            fontSize: 9,
            cellPadding: 3
        },
        columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 30 },
            3: { cellWidth: 20 },
            4: { cellWidth: 30, halign: 'right' },
            5: { cellWidth: 25, halign: 'center' }
        },
        didParseCell: function(data) {
            if (data.section === 'body') {
                if (data.column.index === 4) {
                    // CORREÇÃO APLICADA AQUI:
                    const rowRaw = data.row.raw as any;
                    const type = rowRaw[3];
                    if (type === 'Receita') {
                        data.cell.styles.textColor = [16, 185, 129];
                    } else {
                        data.cell.styles.textColor = [244, 63, 94];
                    }
                }
            }
        }
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - 20, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
        doc.text("Gerado por Trocô Financial", 14, doc.internal.pageSize.getHeight() - 10);
    }

    doc.save(`troco_relatorio_${getTodayLocalDate()}.pdf`);
    setIsExportMenuOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-850 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 transition-all">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Relatórios Financeiros</h2>
          <p className="text-slate-500 dark:text-slate-400">Análise detalhada baseada no histórico de transações.</p>
        </div>
        
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRangeType)}
              className="w-full md:w-48 appearance-none pl-10 pr-8 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-slate-700 dark:text-slate-200 font-medium focus:ring-2 focus:ring-primary-500 outline-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <option value="6_months">Últimos 6 Meses</option>
              <option value="ytd">Este Ano (YTD)</option>
              <option value="1_year">Últimos 12 Meses</option>
              <option value="all">Todo o Período</option>
            </select>
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
          
          <div className="relative" ref={exportMenuRef}>
            <button 
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className="flex items-center justify-center px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-primary-500 hover:text-white dark:hover:bg-primary-500 dark:hover:text-white transition-all font-medium active:scale-95 shadow-sm"
            >
                <Download className="w-4 h-4 mr-2" />
                <span>Exportar</span>
                <ChevronDown className={`w-3 h-3 ml-2 transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isExportMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50 animate-fade-in-up">
                    <button 
                        onClick={handleExportCSV}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200 transition-colors border-b border-slate-50 dark:border-slate-700/50"
                    >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        CSV (Excel)
                    </button>
                    <button 
                        onClick={handleExportPDF}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200 transition-colors"
                    >
                        <FileIcon className="w-4 h-4 text-rose-500" />
                        PDF Analítico
                    </button>
                </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-850 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-none relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <Activity className="w-24 h-24" />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Taxa de Economia</p>
          <h3 className="text-3xl font-bold text-slate-800 dark:text-white mt-2">{formatPercentage(kpis.savingsRate)}</h3>
          <div className="mt-4 flex items-center text-sm">
            <span className={`flex items-center font-medium ${kpis.savingsRate > 20 ? 'text-emerald-500' : kpis.savingsRate > 0 ? 'text-amber-500' : 'text-rose-500'}`}>
              {kpis.savingsRate > 20 ? 'Saudável' : kpis.savingsRate > 0 ? 'Moderado' : 'Crítico'}
            </span>
            <span className="mx-2 text-slate-300">|</span>
            <span className="text-slate-500 text-xs">No período selecionado</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-850 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-none relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <DollarSign className="w-24 h-24" />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Ticket Médio</p>
          <h3 className="text-3xl font-bold text-slate-800 dark:text-white mt-2">{formatCurrency(kpis.averageTicket)}</h3>
          <div className="mt-4 text-sm text-slate-500 flex items-center gap-2">
            <FileText className="w-4 h-4" />
             <span className="font-bold text-slate-700 dark:text-slate-300">{kpis.totalTransactions}</span> transações
          </div>
        </div>

        <div className="bg-white dark:bg-slate-850 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-none relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp className="w-24 h-24" />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Resultado Líquido</p>
          <h3 className={`text-3xl font-bold mt-2 ${kpis.netResult >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {formatCurrency(kpis.netResult)}
          </h3>
          <div className="mt-4 text-sm text-slate-500">
             Receitas - Despesas
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-850 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-none">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Comparativo Financeiro</h3>
          {monthlyData.length > 0 ? (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 11 }} 
                    dy={10}
                    interval={dateRange === '1_year' || dateRange === 'all' ? 1 : 0}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickFormatter={(value) => {
                       if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                       return value;
                    }}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      color: '#1e293b'
                    }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                    labelStyle={{ fontWeight: 'bold', marginBottom: '8px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }}/>
                  <Bar dataKey="income" name="Receitas" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Despesas" fill="#F43F5E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 w-full flex items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-2xl">
              Nenhum dado encontrado para este período.
            </div>
          )}
        </div>

        <div className="lg:col-span-1 bg-white dark:bg-slate-850 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-none flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Status de Pagamentos</h3>
          <p className="text-xs text-slate-500 mb-4">Proporção Pago vs Pendente</p>
          <div className="flex-1 min-h-[250px] relative">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [formatCurrency(value), 'Valor']}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                Sem dados suficientes
              </div>
            )}
            
            {statusData.length > 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                <span className="text-3xl font-bold text-slate-800 dark:text-white">
                    {filteredTransactions.length}
                </span>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Itens</span>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
