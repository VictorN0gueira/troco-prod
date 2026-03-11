import React, { useState, useRef, useEffect } from 'react';
import { Transaction, UserProfile } from '../types';
import { CATEGORIES, CATEGORY_ICONS } from '../constants';
import { getTodayLocalDate, formatDateDisplay, parseDateFromDB } from '../utils';
import { UsageMeter, OverLimitBanner } from './FreePlanBadge';
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
  HelpCircle,
  XCircle,
  BellRing,
  AlertTriangle,
  CalendarClock,
  Wallet,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import LimitPaywallModal from './LimitPaywallModal';
import ConfirmationModal from './ConfirmationModal';
import { CustomCalendar } from './ui/CustomCalendar';

interface RemindersProps {
  transactions: Transaction[];
  onAdd: (t: Transaction) => void;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  user?: UserProfile;
}

const ITEMS_PER_PAGE = 10;

const Reminders: React.FC<RemindersProps> = ({ transactions, onAdd, onEdit, onDelete, user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Transaction; direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'asc' });

  const [confirmPaymentTx, setConfirmPaymentTx] = useState<Transaction | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [reminderToDelete, setReminderToDelete] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const today = getTodayLocalDate();

  const initialFormState = {
    description: '',
    amount: '',
    category: CATEGORIES[0],
    date: today,
    type: 'expense' as 'income' | 'expense',
    status: 'pending' as 'completed' | 'pending',
    isRecurring: false
  };

  const [formData, setFormData] = useState(initialFormState);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortConfig]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const generateTransactionId = (length: number = 5) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const filteredTransactions = transactions
    .filter(t => {
      if (t.status !== 'pending') return false;
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    })
    .sort((a, b) => {
      if (!sortConfig) return 0;
      const { key, direction } = sortConfig;
      const aVal = a[key] ?? '';
      const bVal = b[key] ?? '';
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });

  const totalPending = filteredTransactions.reduce((acc, t) => acc + t.amount, 0);
  const overdueCount = filteredTransactions.filter(t => t.date < today).length;

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
    // Limit check for free tier: max 5 active reminders
    if (user && user.status_assinatura !== 'active') {
      const activeReminders = transactions.filter(t => t.status === 'pending').length;
      if (activeReminders >= 5) {
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
      type: t.type === 'income' ? 'income' : 'expense',
      status: t.status,
      isRecurring: t.isRecurring || false
    });
    setEditingId(t.id);
    setIsModalOpen(true);
  };

  const handleMarkAsPaid = (t: Transaction) => {
    setConfirmPaymentTx(t);
  };

  const confirmPayment = async () => {
    if (confirmPaymentTx) {
      onEdit({ ...confirmPaymentTx, status: 'completed' });
      setConfirmPaymentTx(null);
    }
  };

  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rawAmount = formData.amount.toString().replace(/\D/g, "");
    const numericAmount = rawAmount ? Number(rawAmount) / 100 : 0;

    if (!formData.description.trim()) {
      setFormError('Informe uma descrição para o lembrete.');
      return;
    }
    if (numericAmount <= 0) {
      setFormError('Informe um valor válido maior que zero.');
      return;
    }

    setFormError(null);

    const payload: Transaction = {
      id: editingId || generateTransactionId(5),
      description: formData.description,
      amount: numericAmount,
      category: formData.category,
      date: formData.date,
      type: formData.type,
      status: formData.status,
      isRecurring: formData.isRecurring
    };

    if (editingId) {
      onEdit(payload);
    } else {
      onAdd(payload);
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

  const getDueStatus = (date: string) => {
    if (date < today) return { label: 'Atrasado', color: 'text-rose-500 bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800' };
    if (date === today) return { label: 'Vence Hoje', color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' };
    return { label: 'Em Breve', color: 'text-slate-500 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700' };
  };

  const openDeleteModal = (id: string) => {
    setReminderToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (reminderToDelete) {
      onDelete(reminderToDelete);
      setIsDeleteModalOpen(false);
      setReminderToDelete(null);
    }
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
      {/* Over-limit banner — grandfathering */}
      {user && user.status_assinatura !== 'active' && (() => {
        const pending = transactions.filter(t => t.status === 'pending').length;
        return pending > 5 ? <OverLimitBanner label="lembretes pendentes" current={pending} limit={5} /> : null;
      })()}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-850 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Pendente</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{formatCurrency(totalPending)}</h3>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
            <Clock className="w-6 h-6 text-amber-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-850 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Itens Atrasados</p>
            <h3 className={`text-2xl font-bold mt-1 ${overdueCount > 0 ? 'text-rose-500' : 'text-slate-800 dark:text-white'}`}>{overdueCount}</h3>
          </div>
          <div className={`p-3 rounded-xl ${overdueCount > 0 ? 'bg-rose-50 dark:bg-rose-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}>
            <AlertTriangle className={`w-6 h-6 ${overdueCount > 0 ? 'text-rose-500' : 'text-emerald-500'}`} />
          </div>
        </div>

        <div className="bg-gradient-to-r from-primary-600 to-emerald-500 p-5 rounded-2xl shadow-lg shadow-emerald-500/20 text-white flex flex-col justify-center items-start cursor-pointer hover:scale-[1.02] transition-transform" onClick={handleOpenCreate}>
          <div className="flex items-center gap-2 mb-1">
            <Plus className="w-5 h-5" />
            <span className="font-bold">Novo Lembrete</span>
          </div>
          <p className="text-emerald-100 text-xs">Agendar pagamento ou recebimento</p>
          {/* Indicador de uso para plano free */}
          {user && user.status_assinatura !== 'active' && (() => {
            const activeCount = transactions.filter(t => t.status === 'pending').length;
            return (
              <div className="mt-2 w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white transition-all duration-500"
                  style={{ width: `${Math.min((activeCount / 5) * 100, 100)}%` }}
                />
                <p className="text-[10px] text-white/80 mt-1">
                  {activeCount}/5 lembretes ativos
                </p>
              </div>
            );
          })()}
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center bg-white dark:bg-slate-850 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="relative flex-1 w-full xl:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar lembretes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-primary-500 text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none transition-all"
          />
        </div>
        <div className="hidden md:flex items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500"></div>Atrasado</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div>Vence Hoje</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-400"></div>Futuro</div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-850 rounded-3xl shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-primary-500" onClick={() => handleSort('date')}>
                  Vencimento
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-primary-500" onClick={() => handleSort('description')}>
                  Descrição
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Categoria
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
                {currentTransactions.map((t) => {
                  const status = getDueStatus(t.date);
                  return (
                    <motion.tr
                      key={t.id}
                      variants={itemVariants}
                      layout
                      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-bold ${status.color}`}>
                          <CalendarClock className="w-3.5 h-3.5 mr-1.5" />
                          {status.label === 'Vence Hoje' ? 'Hoje' : formatDateDisplay(t.date)}
                        </div>
                      </td>
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
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`text-sm font-bold ${t.type === 'income' ? 'text-emerald-500' : 'text-slate-700 dark:text-slate-200'}`}>
                          {formatCurrency(t.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsPaid(t);
                            }}
                            title="Marcar como Pago"
                            className="p-2 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(t)}
                            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-500 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteModal(t.id)}
                            className="p-2 rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-400 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </motion.tbody>
          </table>
        </div>

        <div className="md:hidden">
          <motion.div
            className="divide-y divide-slate-100 dark:divide-slate-800"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            <AnimatePresence>
              {currentTransactions.map((t) => {
                const status = getDueStatus(t.date);
                return (
                  <motion.div
                    key={t.id}
                    variants={itemVariants}
                    layout
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                    className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className={`inline-flex items-center px-2 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wide ${status.color}`}>
                        <CalendarClock className="w-3 h-3 mr-1" />
                        {status.label === 'Vence Hoje' ? 'Vence Hoje' : `Vence em ${formatDateDisplay(t.date)}`}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsPaid(t);
                        }}
                        className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-800 active:scale-95"
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1.5" /> Pagar
                      </button>
                    </div>

                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{t.description}</h4>
                        {t.isRecurring && <RefreshCw className="w-3 h-3 text-primary-500" />}
                      </div>
                      <span className={`text-base font-bold ${t.type === 'income' ? 'text-emerald-500' : 'text-slate-700 dark:text-slate-200'}`}>
                        {formatCurrency(t.amount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center">
                        <CategoryIcon category={t.category} className="w-3 h-3 mr-1" />
                        <span>{t.category}</span>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => handleOpenEdit(t)} className="text-primary-500 font-medium">Editar</button>
                        <button onClick={() => openDeleteModal(t.id)} className="text-rose-500 font-medium">Excluir</button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        </div>

        {filteredTransactions.length === 0 && (
          <div className="p-16 text-center flex flex-col items-center">
            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-4">
              <BellRing className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-slate-800 dark:text-white font-bold text-lg">Tudo em dia!</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
              Você não tem lembretes pendentes para os filtros selecionados.
            </p>
            <button
              onClick={handleOpenCreate}
              className="mt-6 px-6 py-2.5 bg-primary-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-primary-500/20 hover:bg-primary-600 transition-colors"
            >
              Agendar Novo
            </button>
          </div>
        )}

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

      {confirmPaymentTx && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
              onClick={() => setConfirmPaymentTx(null)}
            />
            <div className="relative transform overflow-hidden rounded-3xl bg-white dark:bg-slate-800 text-left shadow-2xl transition-all sm:w-full sm:max-w-sm animate-scale-in border border-slate-100 dark:border-slate-700">
              <div className="p-6">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
                  <Wallet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                  Confirmar Pagamento?
                </h3>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 mb-6">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Você está marcando como pago:</p>
                  <p className="font-bold text-slate-800 dark:text-white text-lg">{confirmPaymentTx.description}</p>
                  <p className={`font-bold mt-1 ${confirmPaymentTx.type === 'income' ? 'text-emerald-500' : 'text-slate-700 dark:text-slate-300'}`}>
                    {formatCurrency(confirmPaymentTx.amount)}
                  </p>
                </div>
                <p className="text-xs text-slate-400 mb-6">
                  Esta ação moverá o item para o histórico de transações concluídas.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setConfirmPaymentTx(null)}
                    className="w-full py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmPayment}
                    className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
              onClick={() => { setIsModalOpen(false); setFormError(null); }}
            />
            <div className="relative transform overflow-visible bg-white dark:bg-slate-800 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg rounded-3xl animate-scale-in w-full">
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center rounded-t-3xl">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <CalendarClock className="w-6 h-6 text-primary-500" />
                  {editingId ? 'Editar Lembrete' : 'Agendar Lembrete'}
                </h3>
                <button
                  onClick={() => { setIsModalOpen(false); setFormError(null); }}
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
                    A Receber
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'expense' })}
                    className={`py-2 rounded-lg text-sm font-semibold transition-all ${formData.type === 'expense'
                      ? 'bg-white dark:bg-slate-800 text-rose-500 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    A Pagar
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Valor Previsto</label>
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
                    placeholder="Ex: Fatura do Cartão"
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
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Data de Vencimento</label>
                    <CustomCalendar
                      mode="date"
                      value={formData.date}
                      onChange={(val) => setFormData({ ...formData, date: val })}
                    />
                  </div>
                </div>
                {editingId && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Status Atual</label>
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
                        Pago
                      </button>
                    </div>
                    {formData.status === 'completed' && (
                      <p className="text-xs text-emerald-600 mt-2 bg-emerald-50 p-2 rounded-lg">
                        Nota: Ao salvar como "Pago", este item sairá da lista de lembretes e irá para o histórico de transações.
                      </p>
                    )}
                  </div>
                )}
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
                {formError && (
                  <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700 rounded-xl text-rose-600 dark:text-rose-400 text-sm font-medium">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />{formError}
                  </div>
                )}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-primary-500 text-white font-bold hover:bg-primary-600 active:transform active:scale-95 transition-all shadow-lg shadow-primary-500/30"
                  >
                    {editingId ? 'Salvar Alterações' : 'Agendar Lembrete'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Limit Reached Modal */}
      <LimitPaywallModal
        isOpen={isLimitModalOpen}
        onClose={() => setIsLimitModalOpen(false)}
        title="Limite de Lembretes Atingido"
        description="No plano gratuito você pode ter até 5 lembretes ativos simultaneamente. Assine o Super Trocô para criar lembretes ilimitados e nunca mais esquecer uma conta."
        userEmail={user?.email}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Excluir Lembrete"
        message="Tem certeza que deseja excluir este lembrete? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
};

export default Reminders;
