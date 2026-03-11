import React, { useState, useRef, useEffect } from 'react';
import { Transaction, CreditCard, Budget, BankAccount, TransactionType } from '../types';
import { CATEGORIES, CATEGORY_ICONS } from '../constants';
import {
  getTodayLocalDate,
  formatDateDisplay,
  parseDateFromDB,
  getInvoiceReferenceDate,
  isInvoiceClosed,
  maskCurrency,
  parseCurrency
} from '../utils';
import { UsageMeter, OverLimitBanner } from './FreePlanBadge';
import { CustomSelect } from './CustomSelect';
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
  UploadCloud,
  CheckSquare,
  Square,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useNotification } from '../contexts/NotificationContext';
import ConfirmationModal from './ConfirmationModal';
import { SpotlightCard } from './ui/spotlight-card';
import NumberTicker from './ui/number-ticker';
import { ShimmerButton } from './ui/shimmer-button';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import LimitPaywallModal from './LimitPaywallModal';
import ImportModal from './ImportModal';
import { CustomCalendar } from './ui/CustomCalendar';
import { useTransactionsFilter } from '../hooks/useTransactionsFilter';

interface TransactionsProps {
  transactions: Transaction[];
  onAdd: (t: Transaction) => void;
  onAddMultiple?: (txs: Transaction[]) => void;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  cards?: CreditCard[];
  user?: any;
  budgets?: Budget[];
  accounts?: BankAccount[];
  isLoadingData?: boolean;
}

const ITEMS_PER_PAGE = 10;

const Transactions: React.FC<TransactionsProps> = ({ transactions, onAdd, onAddMultiple, onEdit, onDelete, cards = [], user, budgets = [], accounts = [], isLoadingData = false }) => {
  const { showNotification } = useNotification();
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [limitModalMessage, setLimitModalMessage] = useState<{ title: string; description: string }>({ title: '', description: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // Filters Hook
  const {
    searchTerm,
    setSearchTerm,
    filterDate,
    setFilterDate,
    quickFilter,
    setQuickFilter,
    sortConfig,
    setSortConfig,
    advancedFilters,
    setAdvancedFilters,
    filteredTransactions,
    summary
  } = useTransactionsFilter({ transactions });

  // Confirmation Modal State
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Bulk Edit State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkCategoryModalOpen, setIsBulkCategoryModalOpen] = useState(false);
  const [bulkCategoryChoice, setBulkCategoryChoice] = useState(CATEGORIES[0]);

  // Form State
  const initialFormState = {
    description: '',
    amount: '',
    category: CATEGORIES[0],
    date: getTodayLocalDate(), // Usa data local correta
    type: 'expense' as TransactionType,
    status: 'pending' as 'completed' | 'pending',
    isRecurring: false,
    cardId: '' as string | number, // Store as string for select, convert to number on submit
    accountId: '' as string,
    destinationAccountId: '' as string,
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

  // --- Category Auto-Suggest Rules ---
  const CATEGORY_KEYWORD_RULES: { keywords: string[]; category: string }[] = [
    { keywords: ['mercado', 'supermercado', 'hortifruti', 'feira', 'pao', 'padaria', 'açougue'], category: 'Alimentação' },
    { keywords: ['netflix', 'spotify', 'prime', 'disney', 'hbo', 'youtube', 'crunchyroll', 'globoplay', 'deezer', 'apple music'], category: 'Assinaturas' },
    { keywords: ['uber', '99', 'cabify', 'taxi', 'ônibus', 'metro', 'metrô', 'gasolina', 'combustivel', 'posto', 'transporte'], category: 'Transporte' },
    { keywords: ['luz', 'energia', 'agua', 'água', 'gas', 'gás', 'internet', 'tv', 'telefone', 'celular', 'aluguel'], category: 'Moradia' },
    { keywords: ['farmácia', 'remedio', 'remédio', 'médico', 'medico', 'dentista', 'hospital', 'plano de saude', 'plano saude'], category: 'Saúde' },
    { keywords: ['academia', 'gym', 'esporte', 'futebol', 'tennis', 'tênis', 'corrida', 'pilates', 'yoga', 'cinema', 'teatro'], category: 'Lazer' },
    { keywords: ['salario', 'salário', 'freela', 'freelance', 'pagamento', 'renda', 'bonus', 'bônus', 'comissao', 'comissão'], category: 'Salário' },
    { keywords: ['escola', 'faculdade', 'curso', 'livro', 'mensalidade', 'aula', 'unixi', 'usp', 'unifor'], category: 'Educação' },
    { keywords: ['restaurante', 'lanchonete', 'pizza', 'hambúrguer', 'hamburguer', 'ifood', 'rappi', 'delivery'], category: 'Restaurantes' },
    { keywords: ['roupa', 'sapato', 'tenis', 'tênis', 'camisa', 'calça', 'calcinha', 'cueca', 'americanas', 'shopee', 'amazon', 'shein', 'zara', 'renner'], category: 'Compras' },
    { keywords: ['investimento', 'ação', 'acao', 'fundo', 'renda fixa', 'tesouro', 'corretora', 'b3', 'nubank', 'xp'], category: 'Investimentos' },
  ];

  const getSuggestedCategory = (desc: string): string | null => {
    const normalized = desc.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (const rule of CATEGORY_KEYWORD_RULES) {
      if (rule.keywords.some(kw => normalized.includes(kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')))) {
        return rule.category;
      }
    }
    return null;
  };

  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);

  const handleImportTransactions = (newTxs: Transaction[]) => {
    if (onAddMultiple) {
      onAddMultiple(newTxs);
    } else {
      newTxs.forEach(t => onAdd(t));
    }
  };
  const descriptionHistory = React.useMemo(() => {
    const seen = new Set<string>();
    return transactions
      .map(t => t.description)
      .filter(d => { if (seen.has(d)) return false; seen.add(d); return true; })
      .slice(0, 50);
  }, [transactions]);

  // Reset pagination when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortConfig, filterDate, advancedFilters]);

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

  // 1. Pagination Logic
  const totalItems = filteredTransactions.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentTransactions = filteredTransactions.slice(startIndex, endIndex);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      // Optional: Clear selection when changing page, or keep it. Let's keep it but uncheck "Select All" conceptually.
    }
  };

  // --- BULK EDIT HANDLERS ---
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedIds(new Set());
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === currentTransactions.length) {
      setSelectedIds(new Set());
    } else {
      const allIds = new Set(currentTransactions.map(t => t.id));
      setSelectedIds(allIds);
    }
  };

  const toggleSelectRow = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = () => {
    selectedIds.forEach(id => onDelete(id));
    setIsSelectionMode(false);
    setSelectedIds(new Set());
    setIsBulkDeleteModalOpen(false);
    showNotification({
      title: 'Excluídas',
      message: `${selectedIds.size} transação(ões) excluída(s).`,
      type: 'success'
    });
  };

  const handleBulkCategory = () => {
    transactions.forEach(t => {
      if (selectedIds.has(t.id)) {
        onEdit({ ...t, category: bulkCategoryChoice });
      }
    });
    setIsSelectionMode(false);
    setSelectedIds(new Set());
    setIsBulkCategoryModalOpen(false);
    showNotification({
      title: 'Sucesso',
      message: `Categoria atualizada em ${selectedIds.size} transação(ões).`,
      type: 'success'
    });
  };

  const handleBulkStatus = (newStatus: 'completed' | 'pending') => {
    transactions.forEach(t => {
      if (selectedIds.has(t.id) && t.status !== newStatus) {
        onEdit({ ...t, status: newStatus });
      }
    });
    setIsSelectionMode(false);
    setSelectedIds(new Set());
    showNotification({
      title: 'Status Atualizado',
      message: `${selectedIds.size} transação(ões) marcadas como ${newStatus === 'completed' ? 'Pagas' : 'Pendentes'}.`,
      type: 'success'
    });
  };
  // --------------------------

  const handleSort = (key: keyof Transaction) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, amount: maskCurrency(e.target.value) });
  };

  const handleOpenCreate = () => {
    // Limit check for free tier: max 30 transactions in TOTAL
    if (user && user.status_assinatura !== 'active') {
      if (transactions.length >= 30) {
        setLimitModalMessage({
          title: 'Limite de Transações Atingido',
          description: 'No plano gratuito você pode ter até 30 lançamentos. Assine o Super Trocô para lançamentos ilimitados e controle total.'
        });
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
      amount: maskCurrency((t.amount * 100).toFixed(0)),
      category: t.category,
      date: t.date,
      type: t.type,
      status: t.status,
      isRecurring: t.isRecurring || false,
      cardId: t.cardId || '',
      accountId: t.accountId || '',
      destinationAccountId: '',
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
    const numericAmount = parseCurrency(formData.amount.toString());

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
        cardId: formData.cardId ? Number(formData.cardId) : undefined,
        accountId: formData.accountId || undefined,
        destinationAccountId: formData.destinationAccountId || undefined
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
            accountId: undefined,
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
          cardId: formData.cardId ? Number(formData.cardId) : undefined,
          accountId: formData.accountId || undefined,
          destinationAccountId: formData.destinationAccountId || undefined
        };

        // Free plan limit checks before saving
        if (user && user.status_assinatura !== 'active') {
          if (newTransaction.isRecurring && newTransaction.type === 'expense') {
            // Group into unique subscriptions
            const uniqueSubscriptions = new Set(transactions.filter(t => t.type === 'expense' && t.isRecurring).map(t => t.description.trim().toLowerCase()));
            if (uniqueSubscriptions.size >= 5) {
              setLimitModalMessage({
                title: 'Limite de Assinaturas Atingido',
                description: 'No plano gratuito você pode ter até 5 assinaturas recorrentes. Assine o Super Trocô para assinaturas ilimitadas.'
              });
              setIsLimitModalOpen(true);
              return;
            }
          }
          if (newTransaction.status === 'pending') {
            const currentPending = transactions.filter(t => t.status === 'pending').length;
            if (currentPending >= 10) {
              setLimitModalMessage({
                title: 'Limite de Lembretes Atingido',
                description: 'No plano gratuito você pode ter até 10 lembretes (transações pendentes) ativos. Assine o Super Trocô para lembretes ilimitados.'
              });
              setIsLimitModalOpen(true);
              return;
            }
          }
        }

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

      {/* Over-limit banner — grandfathering: dados herdados do Pro são preservados */}
      {user && user.status_assinatura !== 'active' && transactions.length > 30 && (
        <OverLimitBanner label="transações" current={transactions.length} limit={30} />
      )}

      {/* Summary Miny Cards (Now Spotlight Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SpotlightCard className="flex items-center gap-4 p-4 dark:bg-slate-850">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-xl z-10 w-12 h-12 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="z-10 bg-transparent flex flex-col justify-center">
            <p className="text-xs font-semibold text-slate-500 uppercase">Entradas</p>
            <p className="text-lg font-bold text-slate-800 dark:text-white bg-transparent">
              {isLoadingData ? (
                <SkeletonTheme baseColor={document.documentElement.classList.contains('dark') ? '#1e293b' : '#f1f5f9'} highlightColor={document.documentElement.classList.contains('dark') ? '#334155' : '#e2e8f0'}>
                  <Skeleton width={100} />
                </SkeletonTheme>
              ) : (
                <NumberTicker value={summary.income} isCurrency decimalPlaces={2} prefix="R$ " />
              )}
            </p>
          </div>
        </SpotlightCard>

        <SpotlightCard className="flex items-center gap-4 p-4 dark:bg-slate-850">
          <div className="p-3 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-xl z-10 w-12 h-12 flex items-center justify-center shrink-0">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div className="z-10 bg-transparent flex flex-col justify-center">
            <p className="text-xs font-semibold text-slate-500 uppercase">Saídas</p>
            <p className="text-lg font-bold text-slate-800 dark:text-white bg-transparent">
              {isLoadingData ? (
                <SkeletonTheme baseColor={document.documentElement.classList.contains('dark') ? '#1e293b' : '#f1f5f9'} highlightColor={document.documentElement.classList.contains('dark') ? '#334155' : '#e2e8f0'}>
                  <Skeleton width={100} />
                </SkeletonTheme>
              ) : (
                <NumberTicker value={summary.expense} isCurrency decimalPlaces={2} prefix="R$ " />
              )}
            </p>
          </div>
        </SpotlightCard>

        <SpotlightCard className="flex items-center gap-4 p-4 dark:bg-slate-850">
          <div className={`p-3 rounded-xl z-10 w-12 h-12 flex items-center justify-center shrink-0 ${summary.balance >= 0 ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-500' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-500'}`}>
            <Activity className="w-6 h-6" />
          </div>
          <div className="z-10 bg-transparent flex flex-col justify-center">
            <p className="text-xs font-semibold text-slate-500 uppercase">Balanço Mensal</p>
            <div className={`text-lg font-bold bg-transparent overflow-hidden ${summary.balance >= 0 ? 'text-primary-600 dark:text-primary-400' : 'text-rose-500'}`}>
              {isLoadingData ? (
                <SkeletonTheme baseColor={document.documentElement.classList.contains('dark') ? '#1e293b' : '#f1f5f9'} highlightColor={document.documentElement.classList.contains('dark') ? '#334155' : '#e2e8f0'}>
                  <Skeleton width={100} />
                </SkeletonTheme>
              ) : (
                <NumberTicker value={summary.balance} isCurrency decimalPlaces={2} prefix={summary.balance >= 0 ? "+R$ " : "-R$ "} />
              )}
            </div>
          </div>
        </SpotlightCard>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center bg-white dark:bg-slate-850 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 w-full">

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

            <div className="flex-shrink-0">
              <CustomCalendar
                mode="month"
                value={filterDate}
                onChange={(e) => setFilterDate(e)}
                placeholder="Filtrar por mês"
                className="w-full md:w-60"
              />
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2 w-full text-sm font-medium mt-1 mb-1">
            <button onClick={() => setQuickFilter('all')} className={`px-4 py-1.5 rounded-full whitespace-nowrap transition-colors flex-grow sm:flex-grow-0 text-center ${quickFilter === 'all' ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}>Tudo</button>
            <button onClick={() => setQuickFilter('pending')} className={`px-4 py-1.5 rounded-full whitespace-nowrap transition-colors flex-grow sm:flex-grow-0 text-center ${quickFilter === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}>Pendentes</button>
            <button onClick={() => setQuickFilter('income')} className={`px-4 py-1.5 rounded-full whitespace-nowrap transition-colors flex-grow sm:flex-grow-0 text-center ${quickFilter === 'income' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}>Entradas</button>
            <button onClick={() => setQuickFilter('expense')} className={`px-4 py-1.5 rounded-full whitespace-nowrap transition-colors flex-grow sm:flex-grow-0 text-center ${quickFilter === 'expense' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}>Saídas</button>
            {cards.length > 0 && <button onClick={() => setQuickFilter('credit')} className={`px-4 py-1.5 rounded-full whitespace-nowrap transition-colors flex-grow sm:flex-grow-0 text-center ${quickFilter === 'credit' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}>Cartão</button>}
          </div>

          {/* Budget Widget (Shows if filtering has active matches inside a category with a budget set for this month) */}
          {searchTerm && (() => {
            // A simple heuristic: if search matches a category name that has a budget
            const matchedCat = CATEGORIES.find(c => c.toLowerCase() === searchTerm.toLowerCase().trim());
            if (!matchedCat) return null;

            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();
            const activeBudget = budgets.find(b => b.categoria === matchedCat && b.mes === currentMonth && b.ano === currentYear);

            if (!activeBudget) return null;
            const spent = transactions.filter(t => t.category === matchedCat && t.type === 'expense' && new Date(t.date).getMonth() + 1 === currentMonth).reduce((acc, t) => acc + t.amount, 0);
            const progress = Math.min((spent / activeBudget.valor_limite) * 100, 100);
            const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

            return (
              <div className="w-full mt-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2">
                <div className="flex justify-between items-center text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <span>Orçamento: {matchedCat}</span>
                  <span>{formatCurrency(spent)} / {formatCurrency(activeBudget.valor_limite)}</span>
                </div>
                <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${progress >= 100 ? 'bg-red-500' : progress >= 85 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${progress}%` }} />
                </div>
              </div>
            );
          })()}
        </div>

        {/* Botoes de acao (agora com flex-wrap para telas pequenas) */}
        <div className="flex flex-wrap gap-3 w-full xl:w-auto mt-2 xl:mt-0">
          <button
            onClick={toggleSelectionMode}
            className={`flex-1 xl:flex-none flex items-center justify-center px-4 py-3 rounded-xl font-medium transition-colors border shadow-sm ${isSelectionMode
              ? 'bg-primary-50 text-primary-600 border-primary-200 dark:bg-primary-900/20 dark:border-primary-800'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700'
              }`}
          >
            {isSelectionMode ? <CheckSquare className="w-5 h-5 mr-2" /> : <Square className="w-5 h-5 mr-2" />}
            <span className="hidden sm:inline">{isSelectionMode ? 'Concluir Seleção' : 'Selecionar'}</span>
            <span className="sm:hidden">{isSelectionMode ? 'Concluir' : 'Selecionar'}</span>
          </button>

          <button
            onClick={() => setIsAdvancedFilterOpen(!isAdvancedFilterOpen)}
            className={`flex-1 xl:flex-none flex items-center justify-center px-4 py-3 rounded-xl transition-colors font-medium border shadow-sm relative ${isAdvancedFilterOpen
              ? 'bg-primary-50 text-primary-600 border-primary-200 dark:bg-primary-900/20 dark:border-primary-800'
              : (advancedFilters.minAmount || advancedFilters.maxAmount || advancedFilters.selectedCategories.length > 0)
                ? 'bg-primary-50 dark:bg-primary-900/10 text-primary-600 border-primary-200 dark:border-primary-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700'
              }`}
          >
            <Filter className={`w-5 h-5 mr-2 ${(advancedFilters.minAmount || advancedFilters.maxAmount || advancedFilters.selectedCategories.length > 0) ? 'text-primary-500' : ''}`} />
            <span className="hidden sm:inline">Filtrar</span>
            <span className="sm:hidden">Filtrar</span>
            {(advancedFilters.minAmount || advancedFilters.maxAmount || advancedFilters.selectedCategories.length > 0 || advancedFilters.selectedDate) && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary-500 rounded-full border-2 border-white dark:border-slate-850" />
            )}
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

          <ShimmerButton
            onClick={handleOpenCreate}
            className="flex-1 xl:flex-none"
            background="#10B981"
            borderRadius="12px"
            shimmerColor="#ffffff"
          >
            <div className="flex items-center justify-center font-semibold z-10 pointer-events-none">
              <Plus className="w-5 h-5 mr-2" />
              <span className="hidden sm:inline">Nova Transação</span>
              <span className="sm:hidden">Nova</span>
            </div>
          </ShimmerButton>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <AnimatePresence>
        {isAdvancedFilterOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-slate-850 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 mb-6">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Amount Range */}
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Faixa de Valor</h4>
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
                        <input
                          type="text"
                          placeholder="Mínimo"
                          value={advancedFilters.minAmount}
                          onChange={(e) => setAdvancedFilters({ ...advancedFilters, minAmount: maskCurrency(e.target.value) })}
                          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-primary-500 text-sm text-slate-700 dark:text-slate-200 outline-none transition-all"
                        />
                      </div>
                      <div className="text-slate-300 dark:text-slate-700">—</div>
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
                        <input
                          type="text"
                          placeholder="Máximo"
                          value={advancedFilters.maxAmount}
                          onChange={(e) => setAdvancedFilters({ ...advancedFilters, maxAmount: maskCurrency(e.target.value) })}
                          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border-none focus:ring-2 focus:ring-primary-500 text-sm text-slate-700 dark:text-slate-200 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Date Filter */}
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Data Específica</h4>
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <CustomCalendar
                          mode="date"
                          value={advancedFilters.selectedDate}
                          onChange={(val) => setAdvancedFilters({ ...advancedFilters, selectedDate: val })}
                          placeholder="Selecionar dia"
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Category Selection */}
                  <div className="flex-[2]">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Categorias</h4>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat}
                          onClick={() => {
                            const selected = advancedFilters.selectedCategories.includes(cat)
                              ? advancedFilters.selectedCategories.filter(c => c !== cat)
                              : [...advancedFilters.selectedCategories, cat];
                            setAdvancedFilters({ ...advancedFilters, selectedCategories: selected });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 ${advancedFilters.selectedCategories.includes(cat)
                            ? 'bg-primary-500 text-white border-primary-500 shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-800'
                            }`}
                        >
                          <CategoryIcon category={cat} className="w-3.5 h-3.5" />
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-50 dark:border-slate-800/50">
                  <button
                    onClick={() => setAdvancedFilters({ minAmount: '', maxAmount: '', selectedCategories: [], selectedDate: '' })}
                    className="text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    Limpar Todos os Filtros
                  </button>

                  <button
                    onClick={() => setIsAdvancedFilterOpen(false)}
                    className="px-6 py-2 bg-slate-800 dark:bg-white text-white dark:text-slate-800 rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-sm"
                  >
                    Aplicar e Fechar
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Area */}
      <div className="bg-white dark:bg-slate-850 rounded-3xl shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col">

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                {isSelectionMode && (
                  <th className="px-4 py-4 w-12 text-center">
                    <button onClick={toggleSelectAll} className="p-1 rounded text-slate-400 hover:text-primary-500 transition-colors">
                      {selectedIds.size === currentTransactions.length && currentTransactions.length > 0 ? <CheckSquare className="w-5 h-5 text-primary-500" /> : <Square className="w-5 h-5" />}
                    </button>
                  </th>
                )}
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
                {isLoadingData ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <motion.tr key={`skeleton-${i}`} variants={itemVariants} className="border-b border-slate-100 dark:border-slate-800 opacity-50">
                      {isSelectionMode && <td className="px-4 py-4 w-12 text-center" />}
                      <td className="px-6 py-4 whitespace-nowrap"><SkeletonTheme baseColor={document.documentElement.classList.contains('dark') ? '#1e293b' : '#f1f5f9'} highlightColor={document.documentElement.classList.contains('dark') ? '#334155' : '#e2e8f0'}><Skeleton width={200} /></SkeletonTheme></td>
                      <td className="px-6 py-4 whitespace-nowrap"><SkeletonTheme baseColor={document.documentElement.classList.contains('dark') ? '#1e293b' : '#f1f5f9'} highlightColor={document.documentElement.classList.contains('dark') ? '#334155' : '#e2e8f0'}><Skeleton width={100} /></SkeletonTheme></td>
                      <td className="px-6 py-4 whitespace-nowrap"><SkeletonTheme baseColor={document.documentElement.classList.contains('dark') ? '#1e293b' : '#f1f5f9'} highlightColor={document.documentElement.classList.contains('dark') ? '#334155' : '#e2e8f0'}><Skeleton width={80} /></SkeletonTheme></td>
                      <td className="px-6 py-4 whitespace-nowrap"><SkeletonTheme baseColor={document.documentElement.classList.contains('dark') ? '#1e293b' : '#f1f5f9'} highlightColor={document.documentElement.classList.contains('dark') ? '#334155' : '#e2e8f0'}><Skeleton width={80} /></SkeletonTheme></td>
                      <td className="px-6 py-4 whitespace-nowrap text-right"><SkeletonTheme baseColor={document.documentElement.classList.contains('dark') ? '#1e293b' : '#f1f5f9'} highlightColor={document.documentElement.classList.contains('dark') ? '#334155' : '#e2e8f0'}><Skeleton width={80} /></SkeletonTheme></td>
                      <td className="px-6 py-4 whitespace-nowrap text-center"><SkeletonTheme baseColor={document.documentElement.classList.contains('dark') ? '#1e293b' : '#f1f5f9'} highlightColor={document.documentElement.classList.contains('dark') ? '#334155' : '#e2e8f0'}><Skeleton width={80} /></SkeletonTheme></td>
                    </motion.tr>
                  ))
                ) : currentTransactions.map((t) => (
                  <motion.tr
                    key={t.id}
                    variants={itemVariants}
                    layout
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer lg:cursor-default ${selectedIds.has(t.id) ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}
                    onClick={() => isSelectionMode && toggleSelectRow(t.id)}
                  >
                    {isSelectionMode && (
                      <td className="px-4 py-4 w-12 text-center" onClick={(e) => e.stopPropagation()}>
                        <button onClick={(e) => toggleSelectRow(t.id, e)} className="p-1 rounded text-slate-400 hover:text-primary-500 transition-colors">
                          {selectedIds.has(t.id) ? <CheckSquare className="w-5 h-5 text-primary-500" /> : <Square className="w-5 h-5" />}
                        </button>
                      </td>
                    )}
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
                      <div className="flex flex-col">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${getCategoryColor(t.category)}`}>
                          <CategoryIcon category={t.category} className="w-3.5 h-3.5 mr-1.5" />
                          {t.category}
                        </span>
                        {t.cardId && (() => {
                          const card = cards.find(c => c.id === t.cardId);
                          if (card) {
                            const refDate = getInvoiceReferenceDate(t.date, card.closing_day);
                            if (isInvoiceClosed(card.closing_day, refDate)) {
                              return (
                                <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                                  <Lock className="w-2.5 h-2.5" /> Fatura Fechada
                                </span>
                              );
                            }
                          }
                          return null;
                        })()}
                      </div>
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
                            <CheckCircle2 className="w-3 h-3 mr-1" /> {(t.type === 'transfer' || t.category === 'Transferência') ? 'Concluído' : t.type === 'income' ? 'Recebido' : 'Pago'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-500/20">
                            <Clock className="w-3 h-3 mr-1" /> Pendente
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`text-sm font-bold ${(t.type === 'income' && t.category !== 'Transferência') ? 'text-emerald-500' : (t.type === 'transfer' || t.category === 'Transferência') ? 'text-blue-500' : 'text-rose-500'}`}>
                        {(t.type === 'income' && t.category !== 'Transferência') ? '+' : (t.type === 'transfer' || t.category === 'Transferência') ? '⇄' : '-'} {formatCurrency(t.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex justify-center items-center space-x-2">
                        {(() => {
                          const card = t.cardId ? cards.find(c => c.id === t.cardId) : null;
                          const isLocked = card && isInvoiceClosed(card.closing_day, getInvoiceReferenceDate(t.date, card.closing_day));

                          if (isLocked) {
                            return (
                              <div title="Transação bloqueada (Fatura Fechada)">
                                <Lock className="w-4 h-4 text-slate-300" />
                              </div>
                            );
                          }

                          return (
                            <>
                              <button
                                onClick={() => handleOpenEdit(t)}
                                className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setTransactionToDelete(t.id);
                                  setIsDeleteModalOpen(true);
                                }}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          );
                        })()}
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
              {isLoadingData ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <motion.div key={`skeleton-mob-${i}`} variants={itemVariants} className="p-4 border-b border-slate-100 dark:border-slate-800 opacity-50">
                    <SkeletonTheme baseColor={document.documentElement.classList.contains('dark') ? '#1e293b' : '#f1f5f9'} highlightColor={document.documentElement.classList.contains('dark') ? '#334155' : '#e2e8f0'}>
                      <div className="flex justify-between items-start mb-2">
                        <Skeleton width={150} height={20} />
                        <Skeleton width={80} height={20} />
                      </div>
                      <div className="flex justify-between items-center mt-3">
                        <Skeleton width={100} height={24} borderRadius={12} />
                        <Skeleton width={80} height={24} borderRadius={12} />
                      </div>
                    </SkeletonTheme>
                  </motion.div>
                ))
              ) : currentTransactions.map((t) => (
                <motion.div
                  key={t.id}
                  variants={itemVariants}
                  layout
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${selectedIds.has(t.id) ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}
                  onClick={() => isSelectionMode && toggleSelectRow(t.id)}
                  {...(!isSelectionMode ? {
                    onContextMenu: (e) => {
                      e.preventDefault();
                      setIsSelectionMode(true);
                      toggleSelectRow(t.id);
                    }
                  } : {})}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 flex gap-3">
                      {isSelectionMode && (
                        <div className="pt-1.5 flex-shrink-0">
                          <button onClick={(e) => toggleSelectRow(t.id, e)} className="text-slate-400 hover:text-primary-500">
                            {selectedIds.has(t.id) ? <CheckSquare className="w-5 h-5 text-primary-500" /> : <Square className="w-5 h-5" />}
                          </button>
                        </div>
                      )}
                      <div>
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
                    </div>
                    {!isSelectionMode && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(t);
                        }}
                        className="p-2 -mt-2 -mr-2 text-slate-400 hover:text-primary-500"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex justify-between items-center mt-3">
                    <button onClick={(e) => handleToggleStatus(t, e)} className="flex items-center gap-2 active:scale-95 transition-transform focus:outline-none">
                      {t.status === 'completed' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 hover:bg-emerald-200">
                          {(t.type === 'transfer' || t.category === 'Transferência') ? 'Concluído' : t.type === 'income' ? 'Recebido' : 'Pago'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 hover:bg-amber-200">
                          Pendente
                        </span>
                      )}
                    </button>

                    <div className="flex items-center gap-3">
                      <span className={`text-base font-bold ${(t.type === 'income' && t.category !== 'Transferência') ? 'text-emerald-500' : (t.type === 'transfer' || t.category === 'Transferência') ? 'text-blue-500' : 'text-rose-500'}`}>
                        {(t.type === 'income' && t.category !== 'Transferência') ? '+' : (t.type === 'transfer' || t.category === 'Transferência') ? '⇄' : '-'} {formatCurrency(t.amount)}
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

        {
          filteredTransactions.length === 0 && (
            <div className="p-10 text-center text-slate-500">
              Nenhuma transação encontrada.
            </div>
          )
        }

        {/* Pagination Footer */}
        {
          filteredTransactions.length > 0 && (
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
          )
        }
      </div >

      {/* Modal */}
      {
        isModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
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
                  <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'income', accountId: formData.accountId, destinationAccountId: '' })}
                      className={`py-2 rounded-lg text-xs font-semibold transition-all ${formData.type === 'income'
                        ? 'bg-white dark:bg-slate-800 text-emerald-500 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                      Receita
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'expense', destinationAccountId: '' })}
                      className={`py-2 rounded-lg text-xs font-semibold transition-all ${formData.type === 'expense'
                        ? 'bg-white dark:bg-slate-800 text-rose-500 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                      Despesa
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'transfer', cardId: '', isRecurring: false })}
                      className={`py-2 rounded-lg text-xs font-semibold transition-all ${formData.type === 'transfer'
                        ? 'bg-white dark:bg-slate-800 text-blue-500 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                      Transferir
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
                      list="desc-history"
                      required
                      value={formData.description}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, description: val });
                        const suggestion = val.length >= 3 ? getSuggestedCategory(val) : null;
                        setSuggestedCategory(suggestion);
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                      placeholder="Ex: Conta de Luz"
                    />
                    <datalist id="desc-history">
                      {descriptionHistory.map((d, i) => <option key={i} value={d} />)}
                    </datalist>
                    {/* Category auto-suggestion chip */}
                    {suggestedCategory && suggestedCategory !== formData.category && (
                      <div className="mt-2 flex items-center gap-2 animate-fade-in-up">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Categoria sugerida:</span>
                        <button
                          type="button"
                          onClick={() => { setFormData({ ...formData, description: formData.description, category: suggestedCategory }); setSuggestedCategory(null); }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700 text-primary-600 dark:text-primary-400 text-xs font-bold hover:bg-primary-100 dark:hover:bg-primary-800/30 transition-all active:scale-95"
                        >
                          ✨ {suggestedCategory} — aplicar
                        </button>
                      </div>
                    )}
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
                      <CustomCalendar
                        mode="date"
                        value={formData.date}
                        onChange={(val) => setFormData({ ...formData, date: val })}
                      />
                    </div>
                  </div>

                  {/* Bank Account Selector */}
                  {accounts.length > 0 && !formData.cardId && (
                    <div className="space-y-4">
                      {formData.type === 'transfer' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div> Origem (Sairá de)
                            </label>
                            <CustomSelect
                              value={formData.accountId}
                              onChange={(val: string) => setFormData({ ...formData, accountId: val })}
                              options={[
                                { value: '', label: 'Selecione...' },
                                ...accounts.map(acc => ({
                                  value: acc.id,
                                  label: acc.name
                                }))
                              ]}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Destino (Irá para)
                            </label>
                            <CustomSelect
                              value={formData.destinationAccountId}
                              onChange={(val: string) => setFormData({ ...formData, destinationAccountId: val })}
                              options={[
                                { value: '', label: 'Selecione...' },
                                ...accounts.filter(a => a.id !== formData.accountId).map(acc => ({
                                  value: acc.id,
                                  label: acc.name
                                }))
                              ]}
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            {formData.type === 'income' ? 'Receber em (Conta / Carteira)' : 'Pagar com (Conta / Carteira)'}
                          </label>
                          <CustomSelect
                            value={formData.accountId}
                            onChange={(val: string) => setFormData({ ...formData, accountId: val })}
                            options={[
                              { value: '', label: 'Nenhuma (Caixa Global)' },
                              ...accounts.map(acc => ({
                                value: acc.id,
                                label: acc.name
                              }))
                            ]}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Credit Card Selector (Only for Expenses) */}
                  {formData.type === 'expense' && cards.length > 0 && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Pagar com Cartão de Crédito (Opcional)
                        </label>
                        <CustomSelect
                          value={formData.cardId ? String(formData.cardId) : ''}
                          onChange={(val: string) => setFormData({ ...formData, cardId: val, status: val ? 'pending' : formData.status })}
                          options={[
                            { value: '', label: 'Nenhum (Débito/Dinheiro)' },
                            ...cards.map(card => ({
                              value: String(card.id),
                              label: `${card.name} (Final ${card.closing_day})`
                            }))
                          ]}
                        />
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
                          <CustomSelect
                            value={formData.installments.toString()}
                            onChange={(val: string) => setFormData({ ...formData, installments: Number(val) })}
                            options={Array.from({ length: 24 }, (_, i) => i + 1).map(num => {
                              const numAmt = parseCurrency(formData.amount.toString());
                              return {
                                value: num.toString(),
                                label: `${num}x ${num > 1 ? `(de ${formatCurrency(numAmt / num)})` : 'à vista'}`
                              };
                            })}
                          />
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
        )
      }
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
        title={limitModalMessage.title || 'Limite Atingido'}
        description={limitModalMessage.description || 'No plano gratuito você pode ter até 30 lançamentos. Assine o Super Trocô para lançamentos ilimitados e controle total.'}
        userEmail={user?.email}
      />

      {/* Import Statement Modal (OFX / CSV) */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportTransactions}
        existingTransactions={transactions}
      />

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {isSelectionMode && selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 150, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 150, opacity: 0 }}
            className="fixed bottom-20 md:bottom-10 left-0 w-full z-50 flex justify-center px-4"
          >
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-3 shadow-2xl flex flex-col sm:flex-row items-center gap-3 text-sm w-full max-w-xl overflow-hidden">
              <span className="text-white font-medium px-2 whitespace-nowrap text-center sm:text-left">
                {selectedIds.size} selecionada(s)
              </span>
              <div className="flex items-center gap-2 overflow-x-auto w-full scrollbar-hide py-1 px-1 snap-x">
                <button
                  onClick={() => setIsBulkCategoryModalOpen(true)}
                  className="whitespace-nowrap flex-1 snap-start px-3 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  Categoria
                </button>
                <button
                  onClick={() => handleBulkStatus('completed')}
                  className="whitespace-nowrap flex-1 snap-start px-3 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                >
                  Pagar
                </button>
                <button
                  onClick={() => handleBulkStatus('pending')}
                  className="whitespace-nowrap flex-1 snap-start px-3 py-2.5 rounded-xl bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors"
                >
                  Pendente
                </button>
                <button
                  onClick={() => setIsBulkDeleteModalOpen(true)}
                  className="whitespace-nowrap flex-none p-2.5 rounded-xl bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleBulkDelete}
        title="Excluir Transações"
        message={`Tem certeza que deseja excluir as ${selectedIds.size} transação(ões) selecionada(s)? Esta ação não pode ser desfeita.`}
        confirmText="Excluir Todas"
        cancelText="Cancelar"
        type="danger"
      />

      {/* Bulk Category Modal */}
      <AnimatePresence>
        {isBulkCategoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBulkCategoryModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-850 rounded-3xl shadow-2xl overflow-hidden p-6 border border-slate-100 dark:border-slate-800"
            >
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Alterar Categoria</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Selecione a nova categoria para as {selectedIds.size} transação(ões) selecionada(s).
              </p>

              <div className="space-y-4">
                <CustomSelect
                  value={bulkCategoryChoice}
                  onChange={(val) => setBulkCategoryChoice(val)}
                  options={CATEGORIES}
                />

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setIsBulkCategoryModalOpen(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition">Cancelar</button>
                  <button onClick={handleBulkCategory} className="flex-1 py-3 bg-primary-500 text-white font-bold rounded-xl hover:bg-primary-600 transition shadow-lg shadow-primary-500/25">Confirmar</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Transactions;
