import React, { useState, useRef, useEffect } from 'react';
import { Transaction, CreditCard } from '../types';
import { CATEGORIES, CATEGORY_ICONS } from '../constants';
import { getTodayLocalDate, formatDateDisplay, parseDateFromDB } from '../utils';
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
  RefreshCw
} from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

interface TransactionsProps {
  transactions: Transaction[];
  onAdd: (t: Transaction) => void;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  cards?: CreditCard[];
}

const ITEMS_PER_PAGE = 10;

const Transactions: React.FC<TransactionsProps> = ({ transactions, onAdd, onEdit, onDelete, cards = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState(''); // Formato YYYY-MM
  const [isModalOpen, setIsModalOpen] = useState(false);
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
    cardId: '' as string | number // Store as string for select, convert to number on submit
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

      return matchesSearch && matchesDate;
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
      cardId: t.cardId || ''
    });
    setEditingId(t.id);
    setIsModalOpen(true);
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
      const newTransaction: Transaction = {
        id: generateTransactionId(5), // Usa o gerador de 5 caracteres
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

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center bg-white dark:bg-slate-850 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">

        {/* Search and Date Filter Group */}
        <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto flex-1">
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

        <div className="flex gap-3 w-full xl:w-auto">
          <button className="flex-1 xl:flex-none flex items-center justify-center px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium">
            <Filter className="w-5 h-5 mr-2" />
            <span className="hidden sm:inline">Filtrar</span>
            <span className="sm:hidden">Filtrar</span>
          </button>
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
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {currentTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
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
                    {t.status === 'completed' ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> {t.type === 'income' ? 'Recebido' : 'Pago'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                        <Clock className="w-3 h-3 mr-1" /> Pendente
                      </span>
                    )}
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
                        onClick={() => onDelete(t.id)}
                        className="p-2 rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Cards */}
        <div className="md:hidden">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {currentTransactions.map((t) => (
              <div key={t.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
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
                    onClick={() => handleOpenEdit(t)}
                    className="p-2 -mt-2 -mr-2 text-slate-400 hover:text-primary-500"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex justify-between items-center mt-3">
                  <div className="flex items-center gap-2">
                    {t.status === 'completed' ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                        {t.type === 'income' ? 'Recebido' : 'Pago'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                        Pendente
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`text-base font-bold ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                    </span>
                    <button
                      onClick={() => {
                        setTransactionToDelete(t.id);
                        setIsDeleteModalOpen(true);
                      }}
                      className="p-2 rounded-full text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Data</label>
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
    </div>
  );
};

export default Transactions;
