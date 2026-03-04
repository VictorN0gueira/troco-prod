import React, { useState, useRef, useEffect } from 'react';
import { Transaction, CreditCard } from '../types';
import { CATEGORIES, CATEGORY_ICONS } from '../constants';
import { getTodayLocalDate, formatDateDisplay, parseDateFromDB } from '../utils';
import { UsageMeter } from './FreePlanBadge';
import {
  Search,
  Plus,
  Filter,
  Trash2,
  Edit2,
  Calendar,
  ChevronDown,
  CheckCircle2,
  Clock,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  HelpCircle,
  XCircle,
  RefreshCw,
  ArrowRightLeft,
  Activity,
  UploadCloud
} from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useNotification } from '../contexts/NotificationContext';
import ConfirmationModal from './ConfirmationModal';
import LimitPaywallModal from './LimitPaywallModal';
import ImportModal from './ImportModal';

interface TransactionsProps {
  transactions: Transaction[];
  onAdd: (t: Transaction) => void;
  onAddMultiple?: (txs: Transaction[]) => void;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  cards?: CreditCard[];
  user?: any; // Assuming 'any' or importing UserProfile to avoid circular deps if needed, let's just use the prop
}

const ITEMS_PER_PAGE = 10;

const Transactions: React.FC<TransactionsProps> = ({ transactions, onAdd, onAddMultiple, onEdit, onDelete, cards = [], user }) => {
  const { showNotification } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState(''); // Formato YYYY-MM
  const [quickFilter, setQuickFilter] = useState<'all' | 'pending' | 'income' | 'expense' | 'credit'>('all');
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Transaction; direction: 'asc' | 'desc' } | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // Confirmation Modal State
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Form State
  const initialFormState = {
    description: '',
    amount: '',
    category: CATEGORIES[0],
    date: getTodayLocalDate(), // Usa data local correta
    type: 'expense' as 'income' | 'expense',
    status: 'pending' as 'completed' | 'pending',
    isRecurring: false,
    cardId: '' as string | number, // Store as string for select, convert to number on submit
    installments: 1
  };

  const [formData, setFormData] = useState(initialFormState);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Reset pagination when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortConfig, filterDate]);

  // Formatting Helper
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Helper para gerar ID de transação (Estilo N8N/WhatsApp)
  const generateTransactionId = (length: number = 5) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // 1. Filter & Sort Logic
  const filteredTransactions = transactions
    .filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDate = filterDate ? t.date.startsWith(filterDate) : true;

      let matchesQuick = true;
      if (quickFilter === 'pending') matchesQuick = t.status === 'pending';
      else if (quickFilter === 'income') matchesQuick = t.type === 'income';
      else if (quickFilter === 'expense') matchesQuick = t.type === 'expense';
      else if (quickFilter === 'credit') matchesQuick = !!t.cardId;

      return matchesSearch && matchesDate && matchesQuick;
    })
    .sort((a, b) => {
      // ALTERAÇÃO APLICADA AQUI:
      if (!sortConfig) return 0;

      const { key, direction } = sortConfig;
      const aVal = a[key] ?? '';
      const bVal = b[key] ?? '';

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });

  // 2. Pagination Logic
  const totalItems = filteredTransactions.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentTransactions = filteredTransactions.slice(startIndex, endIndex);

  // 3. Summary Calculations
  const summary = React.useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach(t => {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    });
    return { income, expense, balance: income - expense };
  }, [filteredTransactions]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleSort = (key: keyof Transaction) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    if (!rawValue) {
      setFormData({ ...formData, amount: '' });
      return;
    }
    const numberValue = Number(rawValue) / 100;
    setFormData({ ...formData, amount: formatCurrency(numberValue) });
  };

  const handleOpenCreate = () => {
    // Limit check for free tier: max 30 transactions in TOTAL
    if (user && user.status_assinatura !== 'active') {
      if (transactions.length >= 30) {
        setIsLimitModalOpen(true);
        return; // Block opening the modal
      }
    }

    setFormData(initialFormState);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: Transaction) => {
    setFormData({
      description: t.description,
      amount: formatCurrency(t.amount),
      category: t.category,
      date: t.date,
      type: t.type,
      status: t.status,
      isRecurring: t.isRecurring || false,
      cardId: t.cardId || '',
      installments: 1
    });
    setEditingId(t.id);
    setIsModalOpen(true);
  };

  const handleToggleStatus = (t: Transaction, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedTransaction = { ...t, status: t.status === 'completed' ? 'pending' : 'completed' } as Transaction;
    onEdit(updatedTransaction);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Parse the masked amount string back to a number
    const rawAmount = formData.amount.toString().replace(/\D/g, "");
    const numericAmount = rawAmount ? Number(rawAmount) / 100 : 0;

    if (editingId) {
      // Edit logic
      const updatedTransaction: Transaction = {
        id: editingId,
        description: formData.description,
        amount: numericAmount,
        category: formData.category,
        date: formData.date,
        type: formData.type,
        status: formData.status,
        isRecurring: formData.isRecurring,
        cardId: formData.cardId ? Number(formData.cardId) : undefined
      };
      onEdit(updatedTransaction);
    } else {
      // Create logic
      // Check for installments
      if (formData.type === 'expense' && formData.cardId && formData.installments > 1 && onAddMultiple) {
        const installmentsTxs: Transaction[] = [];
        const baseAmount = numericAmount / formData.installments;
        const groupId = "GRP_" + generateTransactionId(6);

        // Parse da data inicial mantendo o tz local para não subtrair/somar dias
        const [year, month, day] = formData.date.split('-').map(Number);

        for (let i = 0; i < formData.installments; i++) {
          const installmentDate = new Date(year, month - 1 + i, day);

          // Formatar de volta para YYYY-MM-DD localmente
          const y = installmentDate.getFullYear();
          const m = String(installmentDate.getMonth() + 1).padStart(2, '0');
          const d = String(installmentDate.getDate()).padStart(2, '0');
          const targetDateStr = `${y}-${m}-${d}`;

          installmentsTxs.push({
            id: generateTransactionId(5),
            description: `${formData.description} (${i + 1}/${formData.installments})`,
            amount: baseAmount,
            category: formData.category,
            date: targetDateStr,
            type: formData.type,
            status: formData.status,
            isRecurring: false, // parcelas não são recorrentes infinitamente
            cardId: Number(formData.cardId),
            installment_group: groupId
          });
        }
        onAddMultiple(installmentsTxs);
      } else {
        const newTransaction: Transaction = {
          id: generateTransactionId(5),
          description: formData.description,
          amount: numericAmount,
          category: formData.category,
          date: formData.date,
          type: formData.type,
          status: formData.status,
          isRecurring: formData.isRecurring,
          cardId: formData.cardId ? Number(formData.cardId) : undefined
        };
        onAdd(newTransaction);
      }
    }

    setIsModalOpen(false);
    setFormData(initialFormState);
    setEditingId(null);
  };

  const getCategoryColor = (cat: string) => {
    const colors = ['bg-blue-100 text-blue-600', 'bg-green-100 text-green-600', 'bg-purple-100 text-purple-600', 'bg-orange-100 text-orange-600'];
    const index = cat.length % colors.length;
    return colors[index];
  };

  const CategoryIcon = ({ category, className }: { category: string, className?: string }) => {
    const IconComponent = CATEGORY_ICONS[category] || HelpCircle;
    return <IconComponent className={className} />;
  };

  const setSmartDate = (daysOffset: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    setFormData({ ...formData, date: `${y}-${m}-${d}` });
  };

  // Variants para a animação staggered
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho com indicador de uso para plano free */}
      {user && user.status_assinatura !== 'active' && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
              <ArrowRightLeft className="w-7 h-7 text-primary-500" />
              Transações
            </h2>
            <div className="mt-2 max-w-xs">
              <UsageMeter current={transactions.length} max={30} label="transações" />
            </div>
          </div>
        </div>
      )}

      {/* Summary Miny Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Entradas</p>
            <p className="text-lg font-bold text-slate-800 dark:text-white">{formatCurrency(summary.income)}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-xl">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Saídas</p>
            <p className="text-lg font-bold text-slate-800 dark:text-white">{formatCurrency(summary.expense)}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4">
          <div className={`p-3 rounded-xl ${summary.balance >= 0 ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-500' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-500'}`}>
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Balanço Mensal</p>
            <p className={`text-lg font-bold ${summary.balance >= 0 ? 'text-primary-600 dark:text-primary-400' : 'text-rose-500'}`}>
              {summary.balance >= 0 ? '+' : ''}{formatCurrency(summary.balance)}
            </p>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center bg-white dark:bg-slate-850 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">

        {/* Search, Filter and Quick Pills Group */}
        <div className="flex flex-col w-full xl:w-auto flex-1 gap-3">
          <div className="flex flex-col md:flex-row gap-3 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar transações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-primary-500 text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none transition-all"
              />
            </div>

            <div className="relative">
              <input
                type="month"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full md:w-auto px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-primary-500 text-slate-700 dark:text-slate-200 outline-none transition-all cursor-pointer"
              />
              {filterDate && (
                <button
                  onClick={() => setFilterDate('')}
                  className="absolute right-8 md:right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar w-full hide-scroll-indicator text-sm font-medium">
            <button onClick={() => setQuickFilter('all')} className={`px-4 py-1.5 rounded-full whitespace-nowrap transition-colors ${quickFilter === 'all' ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}>Tudo</button>
            <button onClick={() => setQuickFilter('pending')} className={`px-4 py-1.5 rounded-full whitespace-nowrap transition-colors ${quickFilter === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}>Pendentes</button>
            <button onClick={() => setQuickFilter('income')} className={`px-4 py-1.5 rounded-full whitespace-nowrap transition-colors ${quickFilter === 'income' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}>Entradas</button>
            <button onClick={() => setQuickFilter('expense')} className={`px-4 py-1.5 rounded-full whitespace-nowrap transition-colors ${quickFilter === 'expense' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}>Saídas</button>
            {cards.length > 0 && <button onClick={() => setQuickFilter('credit')} className={`px-4 py-1.5 rounded-full whitespace-nowrap transition-colors ${quickFilter === 'credit' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}>Cartão</button>}
          </div>
        </div>

        <div className="flex gap-3 w-full xl:w-auto h-full items-start mt-1 xl:mt-0">
          <button className="flex-1 xl:flex-none flex items-center justify-center px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium">
            <Filter className="w-5 h-5 mr-2" />
            <span className="hidden sm:inline">Filtrar</span>
            <span className="sm:hidden">Filtrar</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex-1 xl:flex-none flex items-center justify-center px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium border border-slate-200 dark:border-slate-700 shadow-sm"
            title="Importar de arquivo OFX ou CSV"
          >
            <UploadCloud className="w-5 h-5 mr-2 text-primary-500" />
            <span className="hidden sm:inline">Importar</span>
            <span className="sm:hidden">Import</span>
          </button>

          {/* Indicador de uso mensal - removido daqui (agora está no cabeçalho) */}

          <button
            onClick={handleOpenCreate}
            className="flex-1 xl:flex-none flex items-center justify-center px-6 py-3 rounded-xl bg-primary-500 text-white hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/30 font-semibold"
          >
            <Plus className="w-5 h-5 mr-2" />
            <span className="hidden sm:inline">Nova Transação</span>
            <span className="sm:hidden">Nova</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white dark:bg-slate-850 rounded-3xl shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col">

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-primary-500" onClick={() => handleSort('description')}>
                  Descrição
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Categoria
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-primary-500" onClick={() => handleSort('date')}>
                  Data
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-primary-500" onClick={() => handleSort('amount')}>
                  Valor
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <motion.tbody
              className="divide-y divide-slate-100 dark:divide-slate-800"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              <AnimatePresence>
                {currentTransactions.map((t) => (
                  <motion.tr
                    key={t.id}
                    variants={itemVariants}
                    layout
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        {t.description}
                        {t.isRecurring && (
                          <RefreshCw className="w-3 h-3 text-primary-500" />
                        )}
                        <span className="block text-[10px] text-slate-400 font-mono mt-0.5">#{t.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${getCategoryColor(t.category)}`}>
                        <CategoryIcon category={t.category} className="w-3.5 h-3.5 mr-1.5" />
                        {t.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1.5 opacity-70" />
                        {formatDateDisplay(t.date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={(e) => handleToggleStatus(t, e)}
                        title="Clique pra alterar o status"
                        className="transition-transform active:scale-95 focus:outline-none"
                      >
                        {t.status === 'completed' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> {t.type === 'income' ? 'Recebido' : 'Pago'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-500/20">
                            <Clock className="w-3 h-3 mr-1" /> Pendente
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`text-sm font-bold ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex justify-center items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEdit(t)}
                          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-500 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setTransactionToDelete(t.id);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-2 rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-400 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </motion.tbody>
          </table>
        </div>

        {/* Mobile View: Cards */}
        <div className="md:hidden">
          <motion.div
            className="divide-y divide-slate-100 dark:divide-slate-800"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            <AnimatePresence>
              {currentTransactions.map((t) => (
                <motion.div
                  key={t.id}
                  variants={itemVariants}
                  layout
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{t.description}</h4>
                        {t.isRecurring && (
                          <RefreshCw className="w-3 h-3 text-primary-500" />
                        )}
                        <span className="text-[10px] text-slate-400 font-mono">#{t.id}</span>
                      </div>
                      <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 gap-2 mt-1">
                        <div className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDateDisplay(t.date)}
                        </div>
                        <span>•</span>
                        <div className="flex items-center">
                          <CategoryIcon category={t.category} className="w-3 h-3 mr-1" />
                          <span>{t.category}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(t);
                      }}
                      className="p-2 -mt-2 -mr-2 text-slate-400 hover:text-primary-500"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex justify-between items-center mt-3">
                    <button onClick={(e) => handleToggleStatus(t, e)} className="flex items-center gap-2 active:scale-95 transition-transform focus:outline-none">
                      {t.status === 'completed' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 hover:bg-emerald-200">
                          {t.type === 'income' ? 'Recebido' : 'Pago'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 hover:bg-amber-200">
                          Pendente
                        </span>
                      )}
                    </button>

                    <div className="flex items-center gap-3">
                      <span className={`text-base font-bold ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTransactionToDelete(t.id);
                          setIsDeleteModalOpen(true);
                        }}
                        className="p-2 rounded-full text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>

        {filteredTransactions.length === 0 && (
          <div className="p-10 text-center text-slate-500">
            Nenhuma transação encontrada.
          </div>
        )}

        {/* Pagination Footer */}
        {filteredTransactions.length > 0 && (
          <div className="px-4 md:px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
              <span className="hidden sm:inline">Mostrando </span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{startIndex + 1}</span>-
              <span className="font-semibold text-slate-700 dark:text-slate-200">{Math.min(endIndex, totalItems)}</span>
              <span className="text-slate-400 mx-1">/</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{totalItems}</span>
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-1.5 md:p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="hidden sm:flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === page
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-1.5 md:p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
              onClick={() => setIsModalOpen(false)}
            />
            <div className="relative transform overflow-visible bg-white dark:bg-slate-800 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg rounded-3xl animate-scale-in w-full">
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center rounded-t-3xl">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                  {editingId ? 'Editar Transação' : 'Nova Transação'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'income' })}
                    className={`py-2 rounded-lg text-sm font-semibold transition-all ${formData.type === 'income'
                      ? 'bg-white dark:bg-slate-800 text-emerald-500 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    Receita
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'expense' })}
                    className={`py-2 rounded-lg text-sm font-semibold transition-all ${formData.type === 'expense'
                      ? 'bg-white dark:bg-slate-800 text-rose-500 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    Despesa
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Valor</label>
                  <input
                    type="text"
                    required
                    value={formData.amount}
                    onChange={handleAmountChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                    placeholder="R$ 0,00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Descrição</label>
                  <input
                    type="text"
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                    placeholder="Ex: Conta de Luz"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative z-10" ref={dropdownRef}>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Categoria</label>
                    <button
                      type="button"
                      onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                      className="w-full px-4 py-3 text-left rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all flex justify-between items-center"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <CategoryIcon category={formData.category} className="w-4 h-4 text-slate-500" />
                        <span className="truncate">{formData.category}</span>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ml-2 ${isCategoryOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isCategoryOpen && (
                      <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar animate-fade-in-up z-50">
                        {CATEGORIES.map(cat => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, category: cat });
                              setIsCategoryOpen(false);
                            }}
                            className={`w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center text-sm border-b last:border-0 border-slate-50 dark:border-slate-700/50 ${formData.category === cat ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium' : 'text-slate-600 dark:text-slate-300'}`}
                          >
                            <CategoryIcon category={cat} className="w-4 h-4 mr-2 opacity-70" />
                            <span className="truncate">{cat}</span>
                            {formData.category === cat && <CheckCircle2 className="w-4 h-4 ml-auto text-primary-500 flex-shrink-0" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative z-0">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Data</label>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => setSmartDate(-1)} className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-md transition-colors">Ontem</button>
                        <button type="button" onClick={() => setSmartDate(0)} className="text-[10px] px-2 py-1 bg-primary-50 hover:bg-primary-100 dark:bg-primary-900/20 dark:hover:bg-primary-900/40 text-primary-600 dark:text-primary-400 rounded-md transition-colors">Hoje</button>
                      </div>
                    </div>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Credit Card Selector (Only for Expenses) */}
                {formData.type === 'expense' && cards.length > 0 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Pagar com Cartão de Crédito (Opcional)
                      </label>
                      <div className="relative">
                        <select
                          value={formData.cardId}
                          onChange={(e) => setFormData({ ...formData, cardId: e.target.value, status: e.target.value ? 'pending' : formData.status })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all appearance-none"
                        >
                          <option value="">Nenhum (Débito/Dinheiro)</option>
                          {cards.map(card => (
                            <option key={card.id} value={card.id}>
                              {card.name} (Final {card.closing_day})
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500">
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                      {formData.cardId && (
                        <p className="text-xs text-slate-500 mt-1">
                          * Transações no crédito ficam como "Pendente" até o pagamento da fatura.
                        </p>
                      )}
                    </div>

                    {/* Installments (Only if Card selected and NOT editing) */}
                    {formData.cardId && !editingId && (
                      <div className="animate-fade-in-up">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Número de Parcelas
                        </label>
                        <div className="relative">
                          <select
                            value={formData.installments}
                            onChange={(e) => setFormData({ ...formData, installments: Number(e.target.value) })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all appearance-none"
                          >
                            {Array.from({ length: 24 }, (_, i) => i + 1).map(num => {
                              const rawVal = formData.amount.toString().replace(/\D/g, "");
                              const numAmt = rawVal ? Number(rawVal) / 100 : 0;
                              return (
                                <option key={num} value={num}>
                                  {num}x {num > 1 ? `(de ${formatCurrency(numAmt / num)})` : 'à vista'}
                                </option>
                              );
                            })}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500">
                            <ChevronDown className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Status da Transação</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, status: 'pending' })}
                      className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-2 ${formData.status === 'pending'
                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800 ring-1 ring-amber-500/50'
                        : 'bg-white text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                    >
                      <Clock className="w-4 h-4" />
                      Pendente
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, status: 'completed' })}
                      className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-2 ${formData.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800 ring-1 ring-emerald-500/50'
                        : 'bg-white text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {formData.type === 'income' ? 'Recebido' : 'Pago'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <input
                    type="checkbox"
                    id="isRecurring"
                    checked={formData.isRecurring}
                    onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                    className="w-5 h-5 text-primary-500 rounded border-slate-300 focus:ring-primary-500"
                  />
                  <label htmlFor="isRecurring" className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer select-none">
                    <RefreshCw className="w-4 h-4 text-slate-500" />
                    Repetir mensalmente
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-primary-500 text-white font-bold hover:bg-primary-600 active:transform active:scale-95 transition-all shadow-lg shadow-primary-500/30"
                  >
                    {editingId ? 'Salvar Alterações' : 'Salvar Transação'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          if (transactionToDelete) {
            onDelete(transactionToDelete);
            setIsDeleteModalOpen(false);
            setTransactionToDelete(null);
          }
        }}
        title="Excluir Transação"
        message="Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
      />

      {/* Limit Reached Modal */}
      <LimitPaywallModal
        isOpen={isLimitModalOpen}
        onClose={() => setIsLimitModalOpen(false)}
        title="Limite Atingido"
        description="No plano gratuito você pode ter até 30 lançamentos por mês. Assine o Super Trocô para ter lançamentos ilimitados e controle total."
        userEmail={user?.email}
      />

      {/* Import Statement Modal (OFX / CSV) */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={(txs) => {
          if (onAddMultiple) {
            onAddMultiple(txs);
            showNotification({ message: `${txs.length} transações importadas com sucesso!`, type: 'success' });
          }
        }}
      />
    </div>
  );
};

export default Transactions;
