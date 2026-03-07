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
import { useNotification } from '../contexts/NotificationContext';
import { CustomSelect } from './CustomSelect';

interface ReportsProps {
  transactions: Transaction[];
}

type DateRangeType = '6_months' | 'ytd' | '1_year' | 'all';

const Reports: React.FC<ReportsProps> = ({ transactions }) => {
  const [dateRange, setDateRange] = useState<DateRangeType>('6_months');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const { showNotification } = useNotification();

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

  const handleExportExcel = () => {
    if (filteredTransactions.length === 0) {
      showNotification({
        title: 'Sem Dados',
        message: 'Não há dados para exportar neste período.',
        type: 'warning'
      });
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
      showNotification({
        title: 'Sem Dados',
        message: 'Não há dados para exportar neste período.',
        type: 'warning'
      });
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Core Colors
    const primaryBlue = [30, 41, 59]; // slate-800
    const primaryEmerald = [16, 185, 129]; // emerald-500
    const textDark = [15, 23, 42]; // slate-900
    const textGray = [100, 116, 139]; // slate-500

    // --- Header Background ---
    doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.rect(0, 0, pageWidth, 45, 'F');

    // Emerald Accent Line
    doc.setFillColor(primaryEmerald[0], primaryEmerald[1], primaryEmerald[2]);
    doc.rect(0, 45, pageWidth, 2, 'F');

    // --- Header Text ---
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("Trocô", 14, 25);

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Inteligência Financeira", 14, 33);

    // Header Right Info
    doc.setFontSize(10);
    doc.text(`Emissão: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth - 14, 25, { align: 'right' });

    let periodoLabel = '';
    if (dateRange === '6_months') periodoLabel = "Últimos 6 Meses";
    else if (dateRange === 'ytd') periodoLabel = "Este Ano (YTD)";
    else if (dateRange === '1_year') periodoLabel = "Últimos 12 Meses";
    else periodoLabel = "Todo o Período";

    doc.text(`Período: ${periodoLabel}`, pageWidth - 14, 33, { align: 'right' });

    // --- Title ---
    doc.setFontSize(18);
    doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.setFont("helvetica", "bold");
    doc.text("Relatório Analítico Consolidado", 14, 65);

    // --- Metric Cards ---
    const startY = 75;
    const cardWidth = (pageWidth - 38) / 3; // 3 cards with 10px padding 14px margins (14*2 + 10*2 = 48)
    const cardHeight = 28;
    const gap = 5;

    // Helper for Cards
    const drawCard = (x: number, y: number, label: string, value: string, iconColor: number[], bgColor: number[]) => {
      // Border / Bg
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
      doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD');

      // Top color bar inside card
      doc.setFillColor(iconColor[0], iconColor[1], iconColor[2]);
      doc.roundedRect(x, y, cardWidth, 2, 2, 2, 'F');
      doc.rect(x, y + 2, cardWidth, 1, 'F'); // square off the bottom rounding of the top bar

      // Label
      doc.setFontSize(9);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      doc.setFont("helvetica", "normal");
      doc.text(label, x + 5, y + 12);

      // Value
      doc.setFontSize(14);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.setFont("helvetica", "bold");
      doc.text(value, x + 5, y + 22);
    };

    // Card 1: Receitas
    drawCard(14, startY, "Receitas Totais", formatCurrency(kpis.totalIncome), [16, 185, 129], [255, 255, 255]);

    // Card 2: Despesas
    drawCard(14 + cardWidth + gap, startY, "Despesas Totais", formatCurrency(kpis.totalExpense), [244, 63, 94], [255, 255, 255]);

    // Card 3: Saldo
    drawCard(14 + (cardWidth * 2) + (gap * 2), startY, "Resultado Líquido", formatCurrency(kpis.netResult), [59, 130, 246], [248, 250, 252]);

    // --- Data Table ---
    const tableData = filteredTransactions.map(t => [
      formatDateDisplay(t.date),
      t.description,
      t.category,
      t.type === 'income' ? 'Receita' : 'Despesa',
      formatCurrency(t.amount),
      t.status === 'completed' ? 'Pago' : 'Pen.'
    ]);

    autoTable(doc, {
      startY: startY + cardHeight + 15,
      head: [['Data', 'Descrição', 'Categoria', 'T.', 'Valor', 'St.']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [241, 245, 249], // slate-100
        textColor: [15, 23, 42], // slate-900
        fontStyle: 'bold',
        lineColor: [226, 232, 240], // slate-200
        lineWidth: 0.1,
      },
      bodyStyles: {
        textColor: [51, 65, 85], // slate-700
        lineColor: [226, 232, 240], // slate-200
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: { top: 4, right: 3, bottom: 4, left: 3 }
      },
      columnStyles: {
        0: { cellWidth: 22, halign: 'center' }, // Data
        1: { cellWidth: 'auto' },               // Descrição
        2: { cellWidth: 32 },                   // Categoria
        3: { cellWidth: 15, halign: 'center' }, // Tipo (T.)
        4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' }, // Valor
        5: { cellWidth: 16, halign: 'center' }  // Status (St.)
      },
      didParseCell: function (data) {
        if (data.section === 'body') {
          // Color text based on Type
          if (data.column.index === 4) {
            const rowRaw = data.row.raw as any;
            const type = rowRaw[3];
            if (type === 'Receita') {
              data.cell.styles.textColor = [5, 150, 105]; // emerald-600
            } else {
              data.cell.styles.textColor = [225, 29, 72]; // rose-600
            }
          }
          // Smaller font for pending status indicator
          if (data.column.index === 5) {
            const rowRaw = data.row.raw as any;
            if (rowRaw[5] === 'Pen.') {
              data.cell.styles.textColor = [217, 119, 6]; // amber-600
            }
          }
        }
      },
      willDrawPage: function (data) {
        // Footer injection on every new page of the table if it breaks
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.setFont("helvetica", "normal");

        // Horizontal line
        doc.setDrawColor(226, 232, 240);
        doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);

        // Text
        doc.text("Gerado com Trocô App • troco.app.br", 14, pageHeight - 10);
        doc.text(`Página ${data.pageNumber}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
      }
    });

    // Final Save
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
          <div className="flex-1 md:flex-none z-10 w-full md:w-56">
            <CustomSelect
              value={dateRange}
              onChange={(val: string) => setDateRange(val as DateRangeType)}
              options={[
                { value: '6_months', label: 'Últimos 6 Meses', icon: <Calendar className="w-4 h-4" /> },
                { value: 'ytd', label: 'Este Ano (YTD)', icon: <Calendar className="w-4 h-4" /> },
                { value: '1_year', label: 'Últimos 12 Meses', icon: <Calendar className="w-4 h-4" /> },
                { value: 'all', label: 'Todo o Período', icon: <Calendar className="w-4 h-4" /> }
              ]}
            />
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
                  onClick={handleExportExcel}
                  className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200 transition-colors border-b border-slate-50 dark:border-slate-700/50"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  CSV (Excel)
                </button>
                <button
                  onClick={handleExportPDF}
                  className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200 transition-colors"
                >
                  <FileIcon className="w-4 h-4 text-emerald-500" />
                  PDF Profissional
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
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
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
