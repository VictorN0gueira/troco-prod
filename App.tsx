import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import LandingPage from './components/LandingPage';
import Legal from './components/Legal';

// Lazy loaded modules (Code Splitting)
const Transactions = lazy(() => import('./components/Transactions'));
const Reminders = lazy(() => import('./components/Reminders'));
const CalendarView = lazy(() => import('./components/CalendarView'));
const CreditCards = lazy(() => import('./components/CreditCards'));
const BankAccounts = lazy(() => import('./components/BankAccounts'));
const Reports = lazy(() => import('./components/Reports'));
const Settings = lazy(() => import('./components/Settings'));
const Investments = lazy(() => import('./components/Investments'));
const NewsFeed = lazy(() => import('./components/NewsFeed'));
const Goals = lazy(() => import('./components/Goals'));
const Subscriptions = lazy(() => import('./components/Subscriptions'));
const Budgets = lazy(() => import('./components/Budgets'));
const GamificationPanel = lazy(() => import('./components/GamificationPanel'));
import XPToast from './components/gamification/XPToast';
import ErrorBoundary from './components/ErrorBoundary';


const SuspenseLoader = () => (
  <div className="flex h-full w-full min-h-[60vh] flex-col items-center justify-center gap-6">
    <div className="relative w-20 h-20">
      {/* Círculo externo pulsante */}
      <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-ping"></div>
      {/* Spinner principal */}
      <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-500 border-r-emerald-500/30 animate-spin"></div>
      {/* Ícone central */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Trophy className="w-8 h-8 text-emerald-500/50" />
      </div>
    </div>
    <div className="flex flex-col items-center gap-2">
      <p className="text-slate-800 dark:text-white text-base font-bold tracking-tight">Carregando...</p>
      <p className="text-slate-400 text-xs font-medium animate-pulse">Sincronizando sua jornada financeira</p>
    </div>
  </div>
);

import { Transaction, UserProfile, CreditCard, Investment, Goal, Budget, BankAccount, GamificationProfile, UnlockedAchievement, Challenge } from './types';
import { supabase } from './supabaseClient';
import { CHALLENGE_TEMPLATES, computeUserStats, getEligibleAchievements, XP_REWARDS } from './gamificationEngine';
import { Lock, Eye, EyeOff, CheckCircle2, AlertTriangle, Wallet, Sun, Moon, Trophy } from 'lucide-react';
import { LOGO_URL } from './constants';
import {
  getTodayLocalDate,
  formatDateDisplay,
  generateTransactionId,
  formatTransaction,
  getProjectedTransactions,
  getInvoiceReferenceDate,
  isInvoiceClosed,
  parseDateFromDB
} from './utils';
import { OfflineProvider, useOffline } from './components/OfflineContext';
import { userDB, transactionsDB, cardsDB, investmentsDB, goalsDB, budgetsDB, accountsDB, gamificationDB } from './localdb';
import { RefreshCw, WifiOff } from 'lucide-react';
import { useNotification } from './contexts/NotificationContext';
import { AnimatePresence, motion } from 'framer-motion';

import TermsModal from './components/TermsModal';
import TrocoBot from './components/TrocoBot';
import LimitPaywallModal from './components/LimitPaywallModal';
import { FreePlanBadge } from './components/FreePlanBadge';

const OfflineIndicator = () => {
  const { isOnline, isSyncing, queueSize } = useOffline();
  if (isOnline && queueSize === 0) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-[100] px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 transition-all ${isOnline ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-white'
      }`}>
      {isOnline ? (
        <>
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Sincronizando...' : 'Online'}
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3" />
          Offline ({queueSize} pendentes)
        </>
      )}
    </div>
  );
};

// Tempo limite de inatividade: 15 minutos
const INACTIVITY_LIMIT = 15 * 60 * 1000;

// Protected Layout Wrapper com suporte a animação de saída e Privacy Mode
const ProtectedLayout = ({
  isAuthenticated,
  darkMode,
  toggleDarkMode,
  onLogout,
  user,
  isExiting,
  privacyMode,
  togglePrivacyMode,
  transactions,
  goals,
  budgets,
  gamificationProfile
}: {
  isAuthenticated: boolean;
  darkMode: boolean;
  toggleDarkMode: () => void;
  onLogout: () => void;
  user: UserProfile;
  isExiting: boolean;
  privacyMode: boolean;
  togglePrivacyMode: () => void;
  transactions: Transaction[];
  goals: Goal[];
  budgets: Budget[];
  gamificationProfile: GamificationProfile;
}) => {
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    // O container aplica a animação de entrada por padrão, ou a de saída se isExiting for true
    <div className={isExiting ? "animate-fade-out-scale origin-center" : "h-full w-full"}>
      <Layout
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        onLogout={onLogout}
        user={user}
        privacyMode={privacyMode}
        togglePrivacyMode={togglePrivacyMode}
        gamificationProfile={gamificationProfile}
      >
        <Outlet />
      </Layout>
    </div>
  );
};

// Tipagem correta das props do AppRoutes
interface AppRoutesProps {
  isAuthenticated: boolean;
  loading: boolean;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  handleLogout: () => void;
  user: UserProfile;
  transactions: Transaction[];
  addTransaction: (t: Transaction) => Promise<void>;
  updateTransaction: (t: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  updateUser: (u: UserProfile) => Promise<void>;
  handleLoginSuccess: () => void;
  isExiting: boolean;
  privacyMode: boolean;
  togglePrivacyMode: () => void;
  cards: CreditCard[];
  fetchCards: (userId: number) => Promise<void>;
  investments: Investment[];
  addInvestment: (inv: Investment) => Promise<void>;
  updateInvestment: (inv: Investment) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;
  updateInvestmentPrices: (updates: { id: string; current_price: number }[]) => Promise<void>;
  addMultipleTransactions: (txs: Transaction[]) => Promise<void>;
  payCardInvoice: (cardId: number, totalAmount: number, ids: string[]) => Promise<void>;
  goals: Goal[];
  addGoal: (g: Goal) => Promise<void>;
  updateGoal: (g: Goal) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addMoneyToGoal: (id: string, amount: number) => Promise<void>;
  budgets: Budget[];
  addBudget: (b: Budget) => Promise<void>;
  updateBudget: (b: Budget) => Promise<void>;
  deleteBudget: (id: number) => Promise<void>;
  accounts: BankAccount[];
  addAccount: (a: BankAccount) => Promise<void>;
  updateAccount: (a: BankAccount) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  isFetchingData?: boolean;
  isLimitModalOpen: boolean;
  setIsLimitModalOpen: (open: boolean) => void;
  gamificationProfile: GamificationProfile;
  unlockedAchievements: UnlockedAchievement[];
  challenges: Challenge[];
  equipCosmetic: (type: 'theme' | 'title' | 'avatar_frame', value: string) => Promise<void>;
}

// Componente interno para gerenciar navegação baseado em eventos
const AppRoutes = ({
  isAuthenticated,
  loading,
  darkMode,
  setDarkMode,
  handleLogout,
  user,
  transactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  updateUser,
  handleLoginSuccess,
  isExiting,
  privacyMode,
  togglePrivacyMode,
  cards,
  fetchCards,
  investments,
  addInvestment,
  updateInvestment,
  deleteInvestment,
  updateInvestmentPrices,
  addMultipleTransactions,
  payCardInvoice,
  goals,
  addGoal,
  updateGoal,
  deleteGoal,
  addMoneyToGoal,
  budgets,
  addBudget,
  updateBudget,
  deleteBudget,
  accounts,
  addAccount,
  updateAccount,
  deleteAccount,
  isFetchingData,
  isLimitModalOpen,
  setIsLimitModalOpen,
  gamificationProfile,
  unlockedAchievements,
  challenges,
  equipCosmetic
}: AppRoutesProps) => {
  const location = useLocation();

  return (
    <>
      <Routes location={location}>
        <Route
          path="/"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="h-full w-full"
              >
                <LandingPage />
              </motion.div>
            )
          }
        />

        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="h-full w-full"
              >
                <Login onLogin={handleLoginSuccess} />
              </motion.div>
            )
          }
        />

        <Route path="/legal/:section?" element={<Legal />} />

        <Route element={
          <ProtectedLayout
            isAuthenticated={isAuthenticated}
            darkMode={darkMode}
            toggleDarkMode={() => setDarkMode(!darkMode)}
            onLogout={handleLogout}
            user={user}
            isExiting={isExiting}
            privacyMode={privacyMode}
            togglePrivacyMode={togglePrivacyMode}
            transactions={transactions}
            goals={goals}
            budgets={budgets}
            gamificationProfile={gamificationProfile}
          />
        }>
          <Route path="/dashboard" element={
            <Dashboard
              transactions={transactions}
              user={user}
              privacyMode={privacyMode}
              cards={cards}
              budgets={budgets}
              goals={goals} // Pass goals for HealthScore
              accounts={accounts}
              isLoadingData={isFetchingData}
            />
          } />

          <Route path="/transactions" element={
            <Suspense fallback={<SuspenseLoader />}>
              <Transactions
                transactions={transactions}
                onAdd={addTransaction}
                onEdit={updateTransaction}
                onDelete={deleteTransaction}
                cards={cards}
                onAddMultiple={addMultipleTransactions}
                user={user}
                budgets={budgets}
                accounts={accounts}
                isLoadingData={isFetchingData}
              />
            </Suspense>
          } />

          <Route path="/budgets" element={
            <Suspense fallback={<SuspenseLoader />}>
              <Budgets
                budgets={budgets}
                transactions={transactions}
                addBudget={addBudget}
                updateBudget={updateBudget}
                deleteBudget={deleteBudget}
              />
            </Suspense>
          } />

          <Route path="/reminders" element={
            <Suspense fallback={<SuspenseLoader />}>
              <Reminders
                transactions={transactions}
                onAdd={addTransaction}
                onEdit={updateTransaction}
                onDelete={deleteTransaction}
                user={user}
              />
            </Suspense>
          } />

          <Route path="/calendar" element={
            <Suspense fallback={<SuspenseLoader />}>
              <CalendarView
                transactions={transactions}
                onAddTransaction={addTransaction}
                onUpdateTransaction={updateTransaction}
              />
            </Suspense>
          } />

          <Route path="/cards" element={
            <Suspense fallback={<SuspenseLoader />}>
              <CreditCards
                user={user}
                cards={cards}
                transactions={transactions}
                accounts={accounts}
                fetchCards={fetchCards}
                payCardInvoice={payCardInvoice}
              />
            </Suspense>
          } />

          <Route path="/accounts" element={
            <Suspense fallback={<SuspenseLoader />}>
              <BankAccounts
                accounts={accounts}
                transactions={transactions}
                onAdd={addAccount}
                onEdit={updateAccount}
                onDelete={deleteAccount}
                onAddTransaction={addTransaction}
                user={user}
                setIsLimitModalOpen={setIsLimitModalOpen}
              />
            </Suspense>
          } />

          <Route path="/reports" element={
            <ErrorBoundary>
              <Suspense fallback={<SuspenseLoader />}>
                <Reports transactions={transactions} accounts={accounts} user={user} />
              </Suspense>
            </ErrorBoundary>
          } />

          <Route path="/investments" element={
            <ErrorBoundary>
              <Suspense fallback={<SuspenseLoader />}>
                <Investments
                  investments={investments}
                  onAdd={addInvestment}
                  onEdit={updateInvestment}
                  onDelete={deleteInvestment}
                  onUpdatePrices={updateInvestmentPrices}
                  user={user}
                  privacyMode={privacyMode}
                />
              </Suspense>
            </ErrorBoundary>
          } />

          <Route path="/insights" element={
            <ErrorBoundary>
              <Suspense fallback={<SuspenseLoader />}>
                <NewsFeed user={user} />
              </Suspense>
            </ErrorBoundary>
          } />

          <Route path="/goals" element={
            <Suspense fallback={<SuspenseLoader />}>
              <Goals
                goals={goals}
                onAdd={addGoal}
                onEdit={updateGoal}
                onDelete={deleteGoal}
                onAddMoney={addMoneyToGoal}
                user={user}
                privacyMode={privacyMode}
              />
            </Suspense>
          } />

          <Route path="/subscriptions" element={
            <Suspense fallback={<SuspenseLoader />}>
              <Subscriptions
                transactions={transactions}
                user={user}
                onDeleteTransaction={deleteTransaction}
                onUpdateTransaction={updateTransaction}
                onAddTransaction={addTransaction}
              />
            </Suspense>
          } />

          <Route path="/gamification" element={
            <ErrorBoundary>
              <Suspense fallback={<SuspenseLoader />}>
                <GamificationPanel
                  profile={gamificationProfile}
                  unlockedAchievements={unlockedAchievements}
                  challenges={challenges}
                  user={user}
                  transactions={transactions}
                  goals={goals}
                  budgets={budgets}
                  investments={investments}
                  onEquip={equipCosmetic}
                  isFetchingData={isFetchingData}
                />
              </Suspense>
            </ErrorBoundary>
          } />

          <Route path="/settings" element={
            <Suspense fallback={<SuspenseLoader />}>
              <Settings
                user={user}
                onUpdateUser={updateUser}
                budgets={budgets}
                transactions={transactions}
                addBudget={addBudget}
                updateBudget={updateBudget}
                deleteBudget={deleteBudget}
              />
            </Suspense>
          } />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <LimitPaywallModal
        isOpen={isLimitModalOpen}
        onClose={() => setIsLimitModalOpen(false)}
        title="Limite Atingido"
        description="Você atingiu o limite do plano gratuito. Faça upgrade para o Super Trocô para continuar."
        userEmail={user.email}
      />
    </>
  );
};

// --- Componente Modal de Recuperação de Senha ---
const RecoveryModal = ({ onSubmit, isOpen }: { onSubmit: (pass: string) => Promise<void>, isOpen: boolean }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      await onSubmit(password);
      setSuccess(true);
      // O modal será fechado pelo componente pai após alguns segundos ou interação
    } catch (err: any) {
      setError(err.message || "Erro ao atualizar senha.");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-[100] overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 text-center">
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity" />

          <div className="relative transform overflow-hidden rounded-3xl bg-white dark:bg-slate-800 text-left shadow-2xl transition-all sm:w-full sm:max-w-md animate-scale-in border border-slate-200 dark:border-slate-700 p-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-6 animate-bounce">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Senha Atualizada!</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Sua conta está segura novamente. Você já está logado e pode acessar o sistema.
            </p>
            <div className="animate-pulse text-sm text-primary-500 font-medium">
              Redirecionando para o Dashboard...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity" />

        <div className="relative transform overflow-hidden rounded-3xl bg-white dark:bg-slate-800 text-left shadow-2xl transition-all sm:w-full sm:max-w-md animate-scale-in border border-slate-200 dark:border-slate-700">
          <div className="p-8">
            {/* Substituído o ícone de Wallet pela Logo real para consistência com o email */}
            <div className="flex justify-center mb-6">
              <img src={LOGO_URL} alt="Trocô" className="h-16 w-auto object-contain" />
            </div>

            <h3 className="text-2xl font-bold text-center text-slate-800 dark:text-white mb-2">
              Redefinir Senha
            </h3>
            <p className="text-center text-slate-500 dark:text-slate-400 mb-8">
              Você acessou através de um link de recuperação. Por segurança, defina sua nova senha agora.
            </p>

            {error && (
              <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-600 dark:text-red-300 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nova Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-10 pr-10 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Confirmar Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    placeholder="Repita a senha"
                    className="w-full pl-10 pr-10 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 active:scale-95 transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-70 mt-4"
              >
                {loading ? 'Salvando...' : 'Definir Nova Senha'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};


const AppContent: React.FC = () => {
  // Global State
  // --- PRODUCTION MODE: Inicia deslogado e com array vazio ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isFetchingData, setIsFetchingData] = useState(false);
  // Persistir preferências no localStorage entre sessões + sync com Supabase
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('troco_darkMode') === 'true');
  const [privacyMode, setPrivacyMode] = useState(() => localStorage.getItem('troco_privacyMode') === 'true');

  // Transactions com array vazio inicial
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [recoveryMode, setRecoveryMode] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);

  // State to control exit animation on logout
  const [isExiting, setIsExiting] = useState(false);

  // Auto-Logout State
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // User State
  const [user, setUser] = useState<UserProfile>({
    id: 0,
    nome: '',
    email: '',
    telefone: '',
    avatarUrl: '',
    status_assinatura: 'canceled', // Changed from 'active' to enforce Paywall by default
  });

  // Ref para evitar closure stale no onAuthStateChange
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  // Offline Hook
  const { addToQueue, isOnline, queue, removeFromQueue } = useOffline();

  // --- PROCESSAR FILA OFFLINE ---
  useEffect(() => {
    const processQueue = async () => {
      if (!isOnline || queue.length === 0 || user.id === 0) return;

      console.log(`[Offline Sync] Processando ${queue.length} item(s) na fila...`);
      for (const action of queue) {
        try {
          if (action.type === 'ADD') {
            const tx = action.payload as Transaction;
              const dbType = tx.type === 'income' ? 'Receita' : tx.type === 'transfer' ? 'Transferência' : 'Despesa';
              const isPaid = tx.status === 'completed' || String(tx.status).toLowerCase() === 'pago';

            const { error } = await supabase.from('transacoes').insert({
              user_id: user.id,
              descricao: tx.description,
              valor: tx.amount,
              tipo: dbType,
              categoria: tx.category,
              data: tx.date,
              esta_pago: isPaid,
              identificador: tx.id,
              is_recurring: tx.isRecurring,
              card_id: tx.cardId,
              installment_group: tx.installment_group
            });
            if (error) throw error;
            removeFromQueue(action.id);
          }
          else if (action.type === 'UPDATE') {
            const tx = action.payload as Transaction;
            const dbType = tx.type === 'income' ? 'Receita' : tx.type === 'transfer' ? 'Transferência' : 'Despesa';
            const isPaid = tx.status === 'completed' || String(tx.status).toLowerCase() === 'pago';

            const { error } = await supabase.from('transacoes').update({
              descricao: tx.description,
              valor: tx.amount,
              tipo: dbType,
              categoria: tx.category,
              data: tx.date,
              esta_pago: isPaid,
              is_recurring: tx.isRecurring,
              card_id: tx.cardId,
              conta_id: tx.accountId,
              conta_destino_id: tx.destinationAccountId
            }).eq('user_id', user.id).eq('identificador', tx.id);
            if (error) throw error;
            removeFromQueue(action.id);
          }
          else if (action.type === 'DELETE') {
            const txId = action.payload as string;
            const isNumericId = !isNaN(Number(txId));

            const deleteQuery = supabase.from('transacoes').delete().eq('user_id', user.id);
            const { error } = isNumericId
              ? await deleteQuery.eq('id', Number(txId))
              : await deleteQuery.eq('identificador', txId);

            if (error) throw error;
            removeFromQueue(action.id);
          }
          else if (action.type === 'ADD_ACCOUNT') {
            const acc = action.payload as BankAccount;
            const { error } = await supabase.from('contas_bancarias').insert({
              user_id: user.id,
              nome: acc.name,
              tipo: acc.type,
              cor: acc.color,
              saldo_inicial: acc.saldo_inicial
            });
            if (error) throw error;
            removeFromQueue(action.id);
          }
          else if (action.type === 'UPDATE_ACCOUNT') {
            const acc = action.payload as BankAccount;
            const { error } = await supabase.from('contas_bancarias').update({
              nome: acc.name,
              tipo: acc.type,
              cor: acc.color,
              saldo_inicial: acc.saldo_inicial
            }).eq('user_id', user.id).eq('id', acc.id);
            if (error) throw error;
            removeFromQueue(action.id);
          }
          else if (action.type === 'DELETE_ACCOUNT') {
            const accId = action.payload as string;
            const { error } = await supabase.from('contas_bancarias').delete().eq('user_id', user.id).eq('id', accId);
            if (error) throw error;
            removeFromQueue(action.id);
          }
        } catch (error) {
          console.error(`[Offline Sync] Erro ao sincronizar ação ${action.id}:`, error);
          // Se falhou, mantemos na fila para a próxima tentativa
        }
      }
    };

    processQueue();
  }, [isOnline, queue, user.id, removeFromQueue]);

  // --- FEATURE 2: SMART PUSH NOTIFICATIONS ON LOAD ---
  const hasCheckedReminders = useRef(false);
  useEffect(() => {
    if (loading || hasCheckedReminders.current || transactions.length === 0 || user.id === 0) return;

    const checkAndNotify = () => {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      const locallyEnabled = localStorage.getItem(`troco_notifications_enabled_${user.id}`);
      if (locallyEnabled !== 'true') return;

      const today = getTodayLocalDate();
      const tomorrowDate = new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrow = tomorrowDate.toLocaleString('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).split(',')[0];

      const due = transactions.filter(t =>
        t.status === 'pending' && t.type === 'expense' && (t.date === today || t.date === tomorrow || t.date < today)
      );

      if (due.length > 0) {
        // Limited to 3 max to prevent spamming the user
        due.slice(0, 3).forEach(t => {
          let timeMsg = '';
          if (t.date < today) timeMsg = 'está ATRASADA';
          else if (t.date === today) timeMsg = 'vence HOJE';
          else timeMsg = 'vence AMANHÃ';

          new Notification('Trocô — Lembrete 🔔', {
            body: `A despesa "${t.description}" ${timeMsg} — R$ ${t.amount.toFixed(2)}`,
            icon: '/icon.svg'
          });
        });
      }
    };

    checkAndNotify();
    hasCheckedReminders.current = true;
  }, [loading, transactions, user]);

  const { showNotification } = useNotification();

  // Aplicar tema e persistir no localStorage + Supabase
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('troco_darkMode', String(darkMode));

    // Sync with Supabase se logado
    if (user && user.id !== 0) {
      supabase
        .from('usuarios')
        .update({ dark_mode: darkMode })
        .eq('id', user.id)
        .then(({ error }) => {
          if (error) console.error("Erro ao salvar dark mode:", error);
        });
    }
  }, [darkMode, user]);

  // Persistir privacy mode
  useEffect(() => {
    localStorage.setItem('troco_privacyMode', String(privacyMode));
  }, [privacyMode]);

  // --- HANDLERS ---

  const handleLogout = useCallback(async () => {
    // Start exit animation
    setIsExiting(true);

    // Wait for animation to finish before destroying the session
    setTimeout(async () => {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      
      // Reset TODOS os estados para evitar dados stale no re-login
      setTransactions([]);
      setUser({ id: 0, nome: '', email: '', telefone: '', avatarUrl: '', status_assinatura: 'canceled' });
      setCards([]);
      setInvestments([]);
      setGoals([]);
      setBudgets([]);
      setAccounts([]);
      setGamificationProfile({
        user_id: 0, xp: 0, level: 1, current_streak: 0, longest_streak: 0,
        last_activity_date: null, title: 'Aprendiz', theme: 'default', avatar_frame: 'none'
      });
      setUnlockedAchievements([]);
      setChallenges([]);
      setIsFetchingData(false);
      
      setIsExiting(false); // Reset exiting state
      console.log("Sessão encerrada com animação.");
    }, 400); // 400ms matches CSS animation duration
  }, []);

  const handleRecoveryPasswordSubmit = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;

    // Sucesso - Aguarda um pouco para mostrar a tela de sucesso antes de fechar
    await new Promise(resolve => setTimeout(resolve, 2500));

    setShowRecoveryModal(false);
    setRecoveryMode(false);
  };

  const togglePrivacyMode = () => setPrivacyMode(!privacyMode);

  // --- AUTO-LOGOUT LOGIC ---
  const lastActivityTime = useRef<number>(Date.now());

  const checkInactivity = useCallback(() => {
    if (!isAuthenticated) return;
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityTime.current;

    // Se o tempo desde a última atividade for maior que o limite, desloga
    if (timeSinceLastActivity > INACTIVITY_LIMIT) {
      console.log("Tempo de inatividade excedido (Background/Foreground). Deslogando...");
      handleLogout();
      showNotification({
        title: 'Sessão Expirada',
        message: 'Sua sessão expirou por inatividade. Por favor, faça login novamente.',
        type: 'warning',
        duration: 8000
      });
    }
  }, [isAuthenticated, handleLogout, showNotification]);

  const updateActivityTime = useCallback(() => {
    lastActivityTime.current = Date.now();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];

    const setupActivityListeners = () => {
      events.forEach(event => {
        window.addEventListener(event, updateActivityTime, { passive: true });
      });
      // Atualiza o tempo inicial
      updateActivityTime();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Quando o app volta para o foreground (tela do celular liga, ou troca de aba), checa a inatividade
        checkInactivity();
      }
    };

    setupActivityListeners();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Checagem periódica normal também (caso o usuário fique com a tela parada mas aberta)
    const interval = setInterval(checkInactivity, 60000); // Checa a cada minuto

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      events.forEach(event => {
        window.removeEventListener(event, updateActivityTime);
      });
    };
  }, [isAuthenticated, updateActivityTime, checkInactivity]);


  // --- PRE-HYDRATE: Carregar dados do cache antes mesmo do Supabase ---
  const preHydrateFromCache = async (userId: number) => {
    try {
      const [cachedTx, cachedCards, cachedInvestments, cachedGoals, cachedBudgets, cachedAccounts, cachedGamification] = await Promise.all([
        transactionsDB.getItem(`tx_${userId}`) as Promise<Transaction[] | null>,
        cardsDB.getItem(`cards_${userId}`) as Promise<CreditCard[] | null>,
        investmentsDB.getItem(`investments_${userId}`) as Promise<Investment[] | null>,
        goalsDB.getItem(`goals_${userId}`) as Promise<Goal[] | null>,
        budgetsDB.getItem(`budgets_${userId}`) as Promise<Budget[] | null>,
        accountsDB.getItem(`accounts_${userId}`) as Promise<BankAccount[] | null>,
        gamificationDB.getItem(`profile_${userId}`) as Promise<GamificationProfile | null>,
      ]);

      if (cachedTx && cachedTx.length > 0) setTransactions(cachedTx);
      if (cachedCards) setCards(cachedCards);
      if (cachedInvestments) setInvestments(cachedInvestments);
      if (cachedGoals) setGoals(cachedGoals);
      if (cachedBudgets) setBudgets(cachedBudgets);
      if (cachedAccounts) setAccounts(cachedAccounts);
      if (cachedGamification) setGamificationProfile(cachedGamification);
    } catch (e) {
      console.warn('[PreHydrate] Falha ao carregar cache local:', e);
    }
  };

  // --- SUPABASE AUTH & DATA LISTENER ---
  useEffect(() => {
    // 1. Check active session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true);
        if (session.user.email) {
          // Carrega o perfil do cache IMEDIATAMENTE para evitar tela branca
          const cachedUser = await userDB.getItem('last_user') as UserProfile | null;
          if (cachedUser && cachedUser.email === session.user.email && cachedUser.id !== 0) {
            setUser(cachedUser);
            // Pré-hidratar todos os dados do cache para render instantâneo
            await preHydrateFromCache(cachedUser.id);
          }
          // Em seguida busca dados frescos do servidor (background update)
          fetchUserProfileByEmail(session.user.email);
        }
      } else {
        setIsAuthenticated(false);
      }
      setLoading(false);
    });

    // 2. Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth Event:", event);

      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true);
        setShowRecoveryModal(true);
      }

      if (session) {
        setIsAuthenticated(true);
        if (userRef.current.id === 0 && session.user.email) {
          fetchUserProfileByEmail(session.user.email);
        }
      } else {
        if (!isExiting) {
          setIsAuthenticated(false);
          setTransactions([]);
          setUser({ id: 0, nome: '', email: '', telefone: '', avatarUrl: '', status_assinatura: 'canceled' });
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [isExiting]); // eslint-disable-line react-hooks/exhaustive-deps


  // --- REALTIME LISTENER FOR TRANSACTIONS ---
  useEffect(() => {
    if (user.id === 0) return;

    // --- Canais Realtime para sincronização multi-aba ---

    // Canal de Transações
    const channelTx = supabase
      .channel(`realtime:transactions:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transacoes',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newTx = formatTransaction(payload.new);
            setTransactions((prev) => {
              if (prev.some(t => t.id === newTx.id)) return prev;
              return [newTx, ...prev];
            });
          }
          else if (payload.eventType === 'UPDATE') {
            const updatedTx = formatTransaction(payload.new);
            setTransactions((prev) =>
              prev.map((t) => t.id === updatedTx.id ? updatedTx : t)
            );
          }
          else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.identificador || payload.old.id.toString();
            setTransactions((prev) =>
              prev.filter((t) => t.id !== deletedId)
            );
          }
          // Recarregar os saldos das contas sempre que houver mudança nas transações
          fetchAccounts(user.id);
        }
      )
      .subscribe();

    const channelCards = supabase
      .channel(`realtime:cards:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'credit_cards', filter: `user_id=eq.${user.id}` },
        () => fetchCards(user.id)
      )
      .subscribe();

    const channelGoals = supabase
      .channel(`realtime:goals:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'metas', filter: `user_id=eq.${user.id}` },
        () => fetchGoals(user.id)
      )
      .subscribe();

    const channelInvestments = supabase
      .channel(`realtime:investments:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'investments', filter: `user_id=eq.${user.id}` },
        () => fetchInvestments(user.id)
      )
      .subscribe();

    const channelAccounts = supabase
      .channel(`realtime:accounts:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contas_bancarias', filter: `user_id=eq.${user.id}` },
        () => fetchAccounts(user.id)
      )
    const channelGamification = supabase
      .channel(`realtime:gamification:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gamification_profiles',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const data = payload.new;
            const profile = {
              user_id: data.user_id,
              xp: data.xp,
              level: data.level,
              current_streak: data.current_streak,
              longest_streak: data.longest_streak,
              last_activity_date: data.last_activity_date,
              title: data.title || 'Aprendiz',
              theme: data.theme || 'default',
              avatar_frame: data.avatar_frame || 'none'
            };
            setGamificationProfile(profile);
            gamificationDB.setItem(`profile_${data.user_id}`, profile);
          }
        }
      )
      .subscribe();

    const channelChallenges = supabase
      .channel(`realtime:challenges:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'challenges',
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchGamification(user.id)
      )
      .subscribe();

    const channelAchievements = supabase
      .channel(`realtime:achievements:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'achievements_log',
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchGamification(user.id)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelTx);
      supabase.removeChannel(channelCards);
      supabase.removeChannel(channelGoals);
      supabase.removeChannel(channelInvestments);
      supabase.removeChannel(channelAccounts);
      supabase.removeChannel(channelGamification);
      supabase.removeChannel(channelChallenges);
      supabase.removeChannel(channelAchievements);
    };
  }, [user.id]);


  // --- DATA FETCHING FUNCTIONS (With Retry) ---

  // State for Cards
  const [cards, setCards] = useState<CreditCard[]>([]);

  // State for Investments
  const [investments, setInvestments] = useState<Investment[]>([]);

  // State for Goals
  const [goals, setGoals] = useState<Goal[]>([]);

  // State for Budgets
  const [budgets, setBudgets] = useState<Budget[]>([]);

  // State for Accounts
  const [accounts, setAccounts] = useState<BankAccount[]>([]);

  // State for Gamification
  const [gamificationProfile, setGamificationProfile] = useState<GamificationProfile>({
    user_id: 0, xp: 0, level: 1, current_streak: 0, longest_streak: 0,
    last_activity_date: null, title: 'Aprendiz', theme: 'default', avatar_frame: 'none'
  });
  const [unlockedAchievements, setUnlockedAchievements] = useState<UnlockedAchievement[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  // Apply Global Theme
  useEffect(() => {
    document.body.classList.remove('theme-neon', 'theme-sunrise', 'theme-ocean', 'theme-aurora', 'theme-golden');
    if (gamificationProfile.theme && gamificationProfile.theme !== 'default') {
      document.body.classList.add(`theme-${gamificationProfile.theme}`);
    }
  }, [gamificationProfile.theme]);

  // State for XP Toast
  const [xpToast, setXpToast] = useState<{ xpGained: number; label: string; leveledUp?: boolean; newLevel?: number } | null>(null);

  // Gamification XP Helper
  const grantXp = async (amount: number, reason: string, actionType?: string) => {
    if (user.id === 0) return;
    try {
      const { data, error } = await supabase.rpc('grant_xp', {
        p_user_id: user.id,
        p_amount: amount,
        p_reason: reason,
        p_action_type: actionType,
        p_client_date: getTodayLocalDate() // Sincronia com fuso local
      });
      if (error) throw error;
      
      if (data && data.length > 0) {
        const result = data[0];
        setXpToast({
          xpGained: actionType ? (XP_REWARDS[actionType]?.amount || amount) : amount,
          label: reason,
          leveledUp: result.leveled_up,
          newLevel: result.new_level
        });
        
        setGamificationProfile(prev => ({
          ...prev,
          xp: result.new_xp,
          level: result.new_level,
          title: result.new_title
        }));

        if (result.leveled_up) {
           setTimeout(() => fetchGamification(user.id), 2000);
        }
      }
    } catch (e) {
      console.error('Error granting XP:', e);
    }
  };

  // Sync Challenges Logic
  const syncMissingChallenges = async (currentReq: Challenge[], userId: number) => {
    if (userId === 0) return;
    
    // Configura "hoje" considerando apenas a data local para evitar problemas de fuso horário
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // Identifica e remove missões expiradas não concluídas
    const expiredUncompleted = currentReq.filter(c => !c.completed && c.ends_at < todayStr);
    
    let validChallenges = [...currentReq];

    if (expiredUncompleted.length > 0) {
      const expiredIds = expiredUncompleted.map(c => c.id);
      try {
        await supabase.from('challenges').delete().in('id', expiredIds);
        validChallenges = currentReq.filter(c => !expiredIds.includes(c.id));
        setChallenges(validChallenges);
      } catch (e) {
        console.error('Error deleting expired challenges:', e);
      }
    }

    // Checa qualquer desafio ativo (mesmo os completos que ainda não expiraram) usando a lista válida
    const activeDaily = validChallenges.find(c => c.type === 'daily' && c.ends_at >= todayStr);
    const activeWeekly = validChallenges.find(c => c.type === 'weekly' && c.ends_at >= todayStr);
    const activeMonthly = validChallenges.find(c => c.type === 'monthly' && c.ends_at >= todayStr);

    const newChallengesToInsert: any[] = [];

    if (!activeDaily) {
      const dailyTpls = CHALLENGE_TEMPLATES.filter(t => t.type === 'daily');
      const tpl = dailyTpls[Math.floor(Math.random() * dailyTpls.length)];
      
      newChallengesToInsert.push({
        user_id: userId,
        title: tpl.title,
        description: tpl.description,
        reward_xp: tpl.reward_xp,
        type: 'daily',
        starts_at: todayStr,
        ends_at: todayStr, // Expira no mesmo dia
        completed: false
      });
    }

    if (!activeWeekly) {
      const weeklyTpls = CHALLENGE_TEMPLATES.filter(t => t.type === 'weekly');
      const tpl = weeklyTpls[Math.floor(Math.random() * weeklyTpls.length)];
      const starts = new Date();
      const ends = new Date();
      ends.setDate(ends.getDate() + 7);
      
      newChallengesToInsert.push({
        user_id: userId,
        title: tpl.title,
        description: tpl.description,
        target_value: tpl.target_value,
        current_value: 0,
        reward_xp: tpl.reward_xp,
        type: 'weekly',
        starts_at: starts.toISOString().split('T')[0],
        ends_at: ends.toISOString().split('T')[0],
        completed: false
      });
    }

    if (!activeMonthly) {
      const monthlyTpls = CHALLENGE_TEMPLATES.filter(t => t.type === 'monthly');
      const tpl = monthlyTpls[Math.floor(Math.random() * monthlyTpls.length)];
      const starts = new Date();
      const ends = new Date();
      ends.setMonth(ends.getMonth() + 1);
      
      newChallengesToInsert.push({
        user_id: userId,
        title: tpl.title,
        description: tpl.description,
        target_value: tpl.target_value,
        current_value: 0,
        reward_xp: tpl.reward_xp,
        type: 'monthly',
        starts_at: starts.toISOString().split('T')[0],
        ends_at: ends.toISOString().split('T')[0],
        completed: false
      });
    }

    if (newChallengesToInsert.length > 0) {
      try {
        const { data, error } = await supabase.from('challenges').insert(newChallengesToInsert).select();
        if (!error && data) {
          setChallenges(prev => [...data, ...prev]);
        }
      } catch (e) {
        console.error('Error generating challenges:', e);
      }
    }
  };

  // Validador contínuo de desafios
  useEffect(() => {
    if (user.id === 0 || challenges.length === 0) return;
    
    const active = challenges.filter(c => !c.completed && new Date(c.ends_at + 'T23:59:59') >= new Date());
    if (active.length === 0) return;

    let hasUpdates = false;
    const updated = [...challenges];
    const toUpdateInDb: any[] = [];
    const completedNow: any[] = [];

    active.forEach(c => {
      const tpl = CHALLENGE_TEMPLATES.find(t => t.title === c.title);
      if (tpl) {
        let progress = tpl.checkProgress(transactions, goals);
        if (progress > c.target_value) progress = c.target_value;
        
        if (progress > c.current_value) {
           const idx = updated.findIndex(ch => ch.id === c.id);
           if (idx > -1) {
             updated[idx] = { ...updated[idx], current_value: progress };
             if (progress >= c.target_value) {
               updated[idx].completed = true;
               toUpdateInDb.push({ id: c.id, current_value: progress, completed: true });
               completedNow.push(updated[idx]);
             } else {
               toUpdateInDb.push({ id: c.id, current_value: progress });
             }
             hasUpdates = true;
           }
        }
      }
    });

    if (hasUpdates) {
       setChallenges(updated);
       toUpdateInDb.forEach(async (update) => {
         await supabase.from('challenges').update(update).eq('id', update.id);
       });
       completedNow.forEach(c => {
         grantXp(c.reward_xp, `Desafio concluído: ${c.title}`);
       });
    }
  }, [transactions, goals, user.id, challenges.length]);

    // 1. Memoizar estatísticas para evitar re-cálculo O(N) em cada render
    const userStats = useMemo(() => {
      if (user.id === 0) return null;
      // Correção Ultra Scan: Passando contadores para meta-conquistas
      const uniqueTypes = new Set(investments.map(i => i.type)).size;
      const achievementsCount = unlockedAchievements.length;
      const challengesCount = challenges.filter(c => c.completed).length;
      
      return computeUserStats(
        transactions, 
        goals, 
        budgets, 
        uniqueTypes,
        achievementsCount,
        challengesCount
      );
    }, [transactions, goals, budgets, investments, unlockedAchievements.length, challenges, user.id]);

    // 2. Validador de conquistas otimizado com DEBOUNCE
    useEffect(() => {
      if (!userStats || user.id === 0 || isFetchingData) return;

      // Debounce de 2 segundos para evitar rodar durante rajadas de updates (ex: login)
      const timer = setTimeout(() => {
        const eligible = getEligibleAchievements(
          userStats, 
          unlockedAchievements.map(a => a.achievement_id), 
          user.status_assinatura === 'active'
        );
      
        if (eligible.length > 0) {
          eligible.forEach(async (ach) => {
            try {
              const { data } = await supabase.rpc('unlock_achievement', {
                p_user_id: user.id,
                p_achievement_id: ach.id
              });
              
              if (data && data.length > 0 && data[0].success) {
                setUnlockedAchievements(prev => [...prev, { achievement_id: ach.id, unlocked_at: new Date().toISOString() }]);
                setXpToast({
                  xpGained: data[0].xp_rewarded,
                  label: `Conquista: ${ach.name}`,
                  leveledUp: false
                });
              }
            } catch(e) { 
               console.error('Error unlocking achievement', e) 
            }
          });
        }
      }, 2000);

      return () => clearTimeout(timer);
    }, [userStats, user.id, unlockedAchievements.length, user.status_assinatura, isFetchingData]);

  // Fetch Gamification Data
  const fetchGamification = async (userId: number) => {
    try {
      // 1. Load from cache first for zero-flicker UI
      const cached = await gamificationDB.getItem(`profile_${userId}`) as GamificationProfile | null;
      if (cached) setGamificationProfile(cached);

      const [profileRes, achievementsRes, challengesRes] = await Promise.all([
        supabase.from('gamification_profiles').select('*').eq('user_id', userId).single(),
        supabase.from('achievements_log').select('achievement_id, unlocked_at').eq('user_id', userId),
        supabase.from('challenges').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      ]);

      if (profileRes.data) {
        const profile = {
          user_id: profileRes.data.user_id,
          xp: profileRes.data.xp,
          level: profileRes.data.level,
          current_streak: profileRes.data.current_streak,
          longest_streak: profileRes.data.longest_streak,
          last_activity_date: profileRes.data.last_activity_date,
          title: profileRes.data.title || 'Aprendiz',
          theme: profileRes.data.theme || 'default',
          avatar_frame: profileRes.data.avatar_frame || 'none'
        };
        setGamificationProfile(profile);
        await gamificationDB.setItem(`profile_${userId}`, profile);
      }

      if (achievementsRes.data) setUnlockedAchievements(achievementsRes.data);
      if (challengesRes.data) {
        setChallenges(challengesRes.data);
        syncMissingChallenges(challengesRes.data, userId);
      }
    } catch (error) {
      console.error('Error fetching gamification:', error);
    }
  };

  const equipCosmetic = async (type: 'theme' | 'title' | 'avatar_frame', value: string) => {
    if (user.id === 0) return;
    try {
      const { error } = await supabase
        .from('gamification_profiles')
        .update({ [type]: value })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      const updatedProfile = {
        ...gamificationProfile,
        [type]: value
      };
      
      setGamificationProfile(updatedProfile);
      await gamificationDB.setItem(`profile_${user.id}`, updatedProfile);
    } catch (e) {
      console.error('Error equipping cosmetic:', e);
    }
  };

  // Fetch Budgets Function (Cache-First)
  const fetchBudgets = async (userId: number) => {
    try {
      // Cache-first: mostra dados locais imediatamente
      const cached = await budgetsDB.getItem(`budgets_${userId}`) as Budget[] | null;
      if (cached) setBudgets(cached);

      if (!navigator.onLine) return;

      const { data, error } = await supabase
        .from('orcamentos')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      const mapped = data || [];
      setBudgets(mapped);
      await budgetsDB.setItem(`budgets_${userId}`, mapped);
    } catch (error) {
      console.error('Error fetching budgets:', error);
    }
  };


  // Fetch Accounts (Cache-First)
  const fetchAccounts = async (userId: number) => {
    try {
      // Cache-first: mostra dados locais imediatamente
      const cached = await accountsDB.getItem(`accounts_${userId}`) as BankAccount[] | null;
      if (cached) setAccounts(cached);

      if (!navigator.onLine) return;

      const { data, error } = await supabase
        .from('contas_bancarias')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const mapped = (data || []).map((a: any) => ({
        id: a.id,
        user_id: a.user_id,
        name: a.nome,
        type: a.tipo,
        color: a.cor,
        saldo_inicial: Number(a.saldo_inicial),
        saldo_atual: Number(a.saldo_atual),
        created_at: a.created_at,
        balance: Number(a.saldo_atual) || 0
      }));
      setAccounts(mapped);
      await accountsDB.setItem(`accounts_${userId}`, mapped);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  // Fetch Goals Function (Cache-First)
  const fetchGoals = async (userId: number) => {
    try {
      // Cache-first: mostra dados locais imediatamente
      const cached = await goalsDB.getItem(`goals_${userId}`) as Goal[] | null;
      if (cached) setGoals(cached);

      if (!navigator.onLine) return;

      const { data, error } = await supabase
        .from('metas')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const mapped = (data || []).map((g: any): Goal => ({
        id: g.id.toString(),
        user_id: g.user_id,
        name: g.name,
        target_amount: Number(g.target_amount),
        current_amount: Number(g.current_amount),
        deadline: g.deadline,
        color: g.color,
        icon: g.icon,
        created_at: g.created_at,
      }));

      setGoals(mapped);
      await goalsDB.setItem(`goals_${userId}`, mapped);
    } catch (error) {
      console.error('Error fetching goals:', error);
    }
  };

  // Fetch Investments Function (Cache-First)
  const fetchInvestments = async (userId: number) => {
    try {
      // Cache-first: mostra dados locais imediatamente
      const cached = await investmentsDB.getItem(`investments_${userId}`) as Investment[] | null;
      if (cached) setInvestments(cached);

      if (!navigator.onLine) return;

      const { data, error } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const mapped = (data || []).map((i: any): Investment => ({
        id: i.id.toString(),
        user_id: i.user_id,
        name: i.name,
        ticker: i.ticker || undefined,
        type: i.type,
        quantity: Number(i.quantity),
        purchase_price: Number(i.purchase_price),
        current_price: Number(i.current_price),
        purchase_date: i.purchase_date,
        broker: i.broker || undefined,
        notes: i.notes || undefined,
        created_at: i.created_at,
      }));

      setInvestments(mapped);
      await investmentsDB.setItem(`investments_${userId}`, mapped);
    } catch (error) {
      console.error('Error fetching investments:', error);
    }
  };

  // Fetch Cards Function (Cache-First)
  const fetchCards = async (userId: number) => {
    try {
      // Cache-first: mostra dados locais imediatamente
      const cached = await cardsDB.getItem(`cards_${userId}`) as CreditCard[] | null;
      if (cached) setCards(cached);

      if (!navigator.onLine) return;

      const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      const mapped = data || [];
      setCards(mapped);
      await cardsDB.setItem(`cards_${userId}`, mapped);
    } catch (error) {
      console.error('Error fetching cards:', error);
    }
  };

  // Update fetchUserProfileByEmail to call fetchCards
  const fetchUserProfileByEmail = async (email: string, retries = 3) => {
    try {
      if (!navigator.onLine) {
        const cachedUser = await userDB.getItem('last_user') as UserProfile | null;
        if (cachedUser && cachedUser.email === email) {
          setUser(cachedUser);
          fetchTransactions(cachedUser.id);
          fetchCards(cachedUser.id);
          fetchInvestments(cachedUser.id);
          fetchGoals(cachedUser.id);
        }
        return;
      }

      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .single();

      if (data) {
        const mappedUser: UserProfile = {
          id: data.id,
          nome: data.nome || 'Usuário',
          email: data.email,
          telefone: data.telefone || '',
          avatarUrl: data.avatar_url || 'https://ui-avatars.com/api/?name=User&background=random',
          status_assinatura: data.tem_plano ? 'active' : 'canceled',
          notificacoes_email: data.notificacoes_email ?? true,
          notificacoes_push: data.notificacoes_push ?? false,
          notificacoes_marketing: data.notificacoes_marketing ?? false,
          notificacoes_whatsapp: data.notificacoes_whatsapp ?? false,
          contrato_assinado: data.contrato_assinado ?? false,
          created_at: data.created_at
        };

        // Server-side Override pro DarkMode se existir no DB
        if (data.dark_mode !== null && data.dark_mode !== undefined) {
          setDarkMode(data.dark_mode);
        }

        setUser(mappedUser);
        await userDB.setItem('last_user', mappedUser);

        // Só mostra skeletons se não houver dados em cache (primeira visita)
        const hasAnyCache = transactions.length > 0;
        if (!hasAnyCache) setIsFetchingData(true);

        await Promise.all([
          fetchTransactions(data.id),
          fetchCards(data.id),
          fetchInvestments(data.id),
          fetchGoals(data.id),
          fetchBudgets(data.id),
          fetchAccounts(data.id),
          fetchGamification(data.id)
        ]);
        setIsFetchingData(false);

      } else {
        // Retry Logic para suportar delay do N8N
        if (retries > 0) {
          console.warn(`Perfil não encontrado para ${email}. Tentando novamente em 2s... (${retries} tentativas restantes)`);
          setTimeout(() => fetchUserProfileByEmail(email, retries - 1), 2000);
        } else {
          console.error('Perfil não encontrado após várias tentativas. Verifique o N8N.');
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchTransactions = async (numericUserId: number) => {
    // Segurança: Não busca se ID for inválido ou 0
    if (!numericUserId || numericUserId === 0) return;

    try {
      // Cache-first: mostra dados locais imediatamente
      const cached = await transactionsDB.getItem(`tx_${numericUserId}`) as Transaction[] | null;
      if (cached && cached.length > 0) setTransactions(cached);

      if (!navigator.onLine) return;

      const { data, error } = await supabase
        .from('transacoes')
        .select('*')
        .eq('user_id', numericUserId)
        .order('data', { ascending: false });

      if (error) throw error;

      if (data) {
        // Usar formatTransaction centralizado em utils.ts
        const formatted: Transaction[] = data.map(formatTransaction);
        setTransactions(formatted);
        await transactionsDB.setItem(`tx_${numericUserId}`, formatted);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const updateUser = async (updatedUser: UserProfile) => {
    setUser(updatedUser);

    // MODO DEMO: Retorna sucesso fake se for o usuário demo
    if (user.id === 99999) {
      await new Promise(r => setTimeout(r, 500));
      return;
    }

    const { error } = await supabase.from('usuarios').update({
      nome: updatedUser.nome,
      telefone: updatedUser.telefone,
      avatar_url: updatedUser.avatarUrl,
      notificacoes_email: updatedUser.notificacoes_email,
      notificacoes_push: updatedUser.notificacoes_push,
      notificacoes_marketing: updatedUser.notificacoes_marketing,
      notificacoes_whatsapp: updatedUser.notificacoes_whatsapp
    }).eq('id', user.id);

    if (error) {
      console.error("Erro no update do usuário:", error);
      throw error;
    }
  };

  const addMultipleTransactions = async (newTransactions: Transaction[]) => {
    if (!checkTransactionLimit(newTransactions.length)) return;
    setTransactions(prev => [...newTransactions, ...prev]);

    if (user.id !== 0) {
      if (!isOnline) {
        newTransactions.forEach(t => addToQueue('ADD', t));
        return;
      }

      const payload = newTransactions.map(t => ({
        user_id: user.id,
        descricao: t.description,
        valor: t.amount,
        tipo: t.type === 'income' ? 'Receita' : t.type === 'transfer' ? 'Transferência' : 'Despesa',
        categoria: t.category,
        data: t.date,
        esta_pago: t.status === 'completed' || String(t.status).toLowerCase() === 'pago',
        identificador: t.id,
        is_recurring: t.isRecurring,
        card_id: t.cardId,
        conta_id: t.accountId,
        conta_destino_id: t.destinationAccountId,
        installment_group: t.installment_group
      }));

      const { error } = await supabase.from('transacoes').insert(payload);

      if (error) {
        console.error("Erro ao salvar múltiplas transações:", error);
        showNotification({
          title: 'Erro ao Sincronizar Parcelas',
          message: `Não foi possível salvar as parcelas: ${error.message}`,
          type: 'error'
        });
        fetchTransactions(user.id);
      }
    }
  };

  const payCardInvoice = async (cardId: number, totalAmount: number, invoiceTransactionsIds: string[], accountId?: string, paymentAmount?: number) => {
    // 1. Encontrar o cartão correspondente e atualizar limite no JS
    const cardToPay = cards.find(c => c.id === cardId);
    if (!cardToPay) return;

    const actualPaid = paymentAmount !== undefined ? paymentAmount : totalAmount;
    const remaining = totalAmount - actualPaid;
    
    // Adicionar Transação de "Pagamento de Fatura" para o Histórico de Débito da Conta
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const todayString = `${y}-${m}-${d}`;

    const rolloverTxId = remaining > 0 ? generateTransactionId(6) : '';

    // 2. Atualizar localmente as transações da fatura e limite do cartão
    setTransactions(prev => {
        const updated = prev.map(t =>
            invoiceTransactionsIds.includes(t.id) ? { ...t, status: 'completed' as const } : t
        );
        
        if (remaining > 0) {
            return [{
                id: rolloverTxId,
                description: `Rotativo / Restante da Fatura`,
                amount: remaining,
                type: 'expense',
                category: 'Financeiro',
                date: todayString, // Data atual para cair na fatura aberta
                status: 'pending',
                isRecurring: false,
                cardId: cardId
            }, ...updated];
        }
        return updated;
    });

    setCards(prev => prev.map(c =>
      c.id === cardId ? { ...c, current_usage: Math.max(0, c.current_usage - actualPaid) } : c
    ));

    if (user.id !== 0 && isOnline) {
      // 3. Update BD

      // Update das transações originais para esta_pago = true
      const { error: txError } = await supabase
        .from('transacoes')
        .update({ esta_pago: true })
        .in('identificador', invoiceTransactionsIds);

      if (txError) {
        console.error("Erro ao pagar transações:", txError);
        showNotification({
          title: 'Erro ao Pagar Fatura',
          message: 'Não foi possível marcar as transações como pagas. Tente novamente.',
          type: 'error'
        });
        // XP via Trigger
      }

      // Inserir Rolagem (caso o valor pago seja menor que a fatura)
      if (remaining > 0) {
         const payloadRollover = {
             user_id: user.id,
             descricao: `Rotativo / Restante da Fatura`,
             valor: remaining,
             tipo: 'Despesa',
             categoria: 'Financeiro',
             data: todayString,
             esta_pago: false,
             identificador: rolloverTxId,
             is_recurring: false,
             card_id: cardId,
         };
         const { error: rollError } = await supabase.from('transacoes').insert(payloadRollover);
         if (rollError) console.error("Erro ao inserir rolagem:", rollError);
      }

      // Atualizar current_usage no Cartão
      const newUsage = Math.max(0, cardToPay.current_usage - actualPaid);
      const { error: cardError } = await supabase
        .from('credit_cards')
        .update({ current_usage: newUsage })
        .eq('id', cardToPay.id);

      if (cardError) console.error("Erro ao atualizar limite do cartão:", cardError);

      const paymentTxId = generateTransactionId(6);

      const payloadPayment = {
        user_id: user.id,
        descricao: `Pagamento de Fatura - ${cardToPay.name}`,
        valor: actualPaid,
        tipo: 'Despesa',
        categoria: 'Financeiro',
        data: todayString,
        esta_pago: true,
        identificador: paymentTxId,
        is_recurring: false,
        card_id: cardId, // Ligando ao cartão para ter histórico
        conta_id: accountId // Débito da conta selecionada
      };

      const { error: insertTxError } = await supabase
        .from('transacoes')
        .insert(payloadPayment);

      if (insertTxError) {
        console.error("Erro ao inserir transação de pagamento de fatura:", insertTxError);
      } else {
        showNotification({
          title: 'Fatura Paga',
          message: 'Transação de pagamento da fatura adicionada com sucesso!',
          type: 'success'
        });
      }
    }
  };

  const checkTransactionLimit = (countToAdd: number = 1): boolean => {
    const isSuper = user?.status_assinatura === 'active';
    if (isSuper || user.id === 0) return true;

    // Count transactions in the current month
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const transactionsInMonth = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    if (transactionsInMonth + countToAdd > 20) {
      setIsLimitModalOpen(true);
      return false;
    }
    return true;
  };

  // State shared via Context or props for Limit Paywall
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);

  const addTransaction = async (newTransaction: Transaction) => {
    if (!checkTransactionLimit()) return;
    setTransactions(prev => [newTransaction, ...prev]);

    if (user.id !== 0) {
      // --- OFFLINE LOGIC START ---
      if (!isOnline) {
        addToQueue('ADD', newTransaction);
        return; // Interrompe para não tentar Supabase
      }
      // --- OFFLINE LOGIC END ---

      const isPaid = newTransaction.status === 'completed' || String(newTransaction.status).toLowerCase() === 'pago';

      // TRADUÇÃO PARA O BANCO DE DADOS: income -> Receita, expense -> Despesa, transfer -> Transferência
      const dbType = newTransaction.type === 'income' ? 'Receita' : newTransaction.type === 'transfer' ? 'Transferência' : 'Despesa';

      const { error } = await supabase.from('transacoes').insert({
        user_id: user.id,
        descricao: newTransaction.description,
        valor: newTransaction.amount,
        tipo: dbType,
        categoria: newTransaction.category,
        data: newTransaction.date,
        esta_pago: isPaid,
        identificador: newTransaction.id,
        is_recurring: newTransaction.isRecurring, // Salva flag no banco
        card_id: newTransaction.cardId, // Adiciona card_id
        conta_id: newTransaction.accountId, // Adiciona conta_id (Wallet)
        conta_destino_id: newTransaction.destinationAccountId, // Adiciona destino para transferências
        installment_group: newTransaction.installment_group
      });

      if (error) {
        console.error("Erro ao salvar:", error);
        const msg = error.message || error.details || JSON.stringify(error);
        showNotification({
          title: 'Erro ao Salvar',
          message: `Erro ao salvar no banco de dados: ${msg}`,
          type: 'error'
        });
      } else {
        // XP concedido via Trigger do Supabase! (trg_grant_xp_transacao)
      }
    }
  };

  const updateTransaction = async (updatedTransaction: Transaction) => {
    // Update Optimista - Força string para garantir match
    setTransactions(prev => prev.map(t => String(t.id) === String(updatedTransaction.id) ? updatedTransaction : t));

    if (user.id !== 0) {
      // --- OFFLINE LOGIC START ---
      if (!isOnline) {
        addToQueue('UPDATE', updatedTransaction);
        return;
      }
      // --- OFFLINE LOGIC END ---

      const isNumericId = !isNaN(Number(updatedTransaction.id));
      const isPaid = updatedTransaction.status === 'completed' || String(updatedTransaction.status).toLowerCase() === 'pago';

      // TRADUÇÃO PARA O BANCO DE DADOS: income -> Receita, expense -> Despesa, transfer -> Transferência
      const dbType = updatedTransaction.type === 'income' ? 'Receita' : updatedTransaction.type === 'transfer' ? 'Transferência' : 'Despesa';

      // Constroi query segura usando chaining correto do Supabase
      let query = supabase.from('transacoes').update({
        descricao: updatedTransaction.description,
        valor: updatedTransaction.amount,
        tipo: dbType,
        categoria: updatedTransaction.category,
        data: updatedTransaction.date,
        esta_pago: isPaid,
        is_recurring: updatedTransaction.isRecurring,
        card_id: updatedTransaction.cardId,
        conta_id: updatedTransaction.accountId,
        conta_destino_id: updatedTransaction.destinationAccountId
      }).eq('user_id', user.id);

      if (isNumericId) {
        query = query.eq('id', Number(updatedTransaction.id));
      } else {
        query = query.eq('identificador', updatedTransaction.id);
      }

      const { error } = await query;

      if (error) {
        console.error("Erro ao atualizar transação:", error);
        showNotification({
          title: 'Erro de Atualização',
          message: 'Não foi possível salvar a alteração. Por favor, recarregue a página.',
          type: 'error'
        });
      }
    }
  };

  const deleteTransaction = async (id: string) => {
    // Snapshot para rollback em caso de erro
    const previousTransactions = transactions;
    setTransactions(prev => prev.filter(t => t.id !== id));

    if (user.id !== 0) {
      // --- OFFLINE LOGIC START ---
      if (!isOnline) {
        addToQueue('DELETE', id);
        return;
      }
      // --- OFFLINE LOGIC END ---

      const isNumericId = !isNaN(Number(id));

      const deleteQuery = supabase
        .from('transacoes')
        .delete()
        .eq('user_id', user.id);

      const { error } = isNumericId
        ? await deleteQuery.eq('id', Number(id))
        : await deleteQuery.eq('identificador', id);

      if (error) {
        console.error("Erro ao excluir transação:", error);
        // Rollback: restaurar a transação na UI
        setTransactions(previousTransactions);
        showNotification({
          title: 'Erro ao Excluir',
          message: 'Não foi possível excluir a transação. Os dados foram restaurados.',
          type: 'error'
        });
      }
    }
  };

  // ── Credit Cards Automation ──────────────────────────────────────────
  useEffect(() => {
    const checkAndGenerateProjectedInvoices = async () => {
      if (user.id === 0 || cards.length === 0 || !isAuthenticated) return;

      console.log("[Invoice Intel] Checking for closed invoices...");
      const now = new Date();
      let hasAddedAny = false;

      for (const card of cards) {
        // Obter mês de referência para a fatura atual (que fecharia agora ou recentemente)
        // Se hoje é dia 15 e fecha dia 10, a fatura de referência é do mês atual.
        const currentRefDate = new Date(now.getFullYear(), now.getMonth(), 1);

        if (isInvoiceClosed(card.closing_day, currentRefDate)) {
          // Fatura fechou! Verificar se já existe transação de "Pagamento de Fatura" para este cartão neste mês
          const description = `Pagamento de Fatura - ${card.name}`;
          const alreadyExists = transactions.some(t =>
            t.cardId === card.id &&
            t.description.includes(description) &&
            parseDateFromDB(t.date).getMonth() === currentRefDate.getMonth() &&
            parseDateFromDB(t.date).getFullYear() === currentRefDate.getFullYear()
          );

          if (!alreadyExists && card.current_usage > 0) {
            console.log(`[Invoice Intel] Generating projected payment for ${card.name}`);

            // Calcular data de vencimento
            const dueYear = currentRefDate.getFullYear();
            const dueMonth = currentRefDate.getMonth();
            const daysInMonth = new Date(dueYear, dueMonth + 1, 0).getDate();
            const dueDay = Math.min(card.due_day, daysInMonth);
            const dueStr = `${dueYear}-${String(dueMonth + 1).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;

            const projectedTx: Transaction = {
              id: `PROJ-INV-${card.id}-${Date.now()}`,
              description: description,
              amount: card.current_usage,
              type: 'expense',
              category: 'Financeiro',
              date: dueStr,
              status: 'pending',
              isRecurring: false,
              cardId: card.id
            };

            // Adiciona localmente para a UI refletir imediatamente
            setTransactions(prev => [projectedTx, ...prev]);
            hasAddedAny = true;
          }
        }
      }

      if (hasAddedAny) {
        showNotification({
          title: 'Inteligência de Faturas',
          message: 'Novas faturas fechadas foram detectadas e projeções de pagamento adicionadas.',
          type: 'success'
        });
      }
    };

    checkAndGenerateProjectedInvoices();
  }, [user.id, cards.length, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Investment CRUD ──────────────────────────────────────────────────────────

  const addInvestment = async (inv: Investment) => {
    setInvestments(prev => [inv, ...prev]);
    if (user.id !== 0) {
      const { error } = await supabase.from('investments').insert({
        user_id: user.id,
        name: inv.name,
        ticker: inv.ticker || null,
        type: inv.type,
        quantity: inv.quantity,
        purchase_price: inv.purchase_price,
        current_price: inv.current_price,
        purchase_date: inv.purchase_date,
        broker: inv.broker || null,
        notes: inv.notes || null,
      });
      if (error) {
        console.error('Erro ao adicionar investimento:', error);
        setInvestments(prev => prev.filter(i => i.id !== inv.id));
        throw error;
      }
      // Refresh to get the real DB id
      await fetchInvestments(user.id);
    }
  };

  const updateInvestment = async (inv: Investment) => {
    setInvestments(prev => prev.map(i => i.id === inv.id ? inv : i));
    if (user.id !== 0) {
      const { error } = await supabase.from('investments').update({
        name: inv.name,
        ticker: inv.ticker || null,
        type: inv.type,
        quantity: inv.quantity,
        purchase_price: inv.purchase_price,
        current_price: inv.current_price,
        purchase_date: inv.purchase_date,
        broker: inv.broker || null,
        notes: inv.notes || null,
      }).eq('user_id', user.id).eq('id', Number(inv.id));
      if (error) {
        console.error('Erro ao atualizar investimento:', error);
        throw error;
      }
    }
  };

  const deleteInvestment = async (id: string) => {
    setInvestments(prev => prev.filter(i => i.id !== id));
    if (user.id !== 0) {
      const { error } = await supabase.from('investments').delete()
        .eq('user_id', user.id).eq('id', Number(id));
      if (error) {
        console.error('Erro ao excluir investimento:', error);
        throw error;
      }
    }
  };

  const updateInvestmentPrices = async (updates: { id: string; current_price: number }[]) => {
    // Optimistic local update
    setInvestments(prev =>
      prev.map(inv => {
        const u = updates.find(x => x.id === inv.id);
        return u ? { ...inv, current_price: u.current_price } : inv;
      })
    );

    if (user.id !== 0) {
      // Supabase does not support batch upsert with different values per row in one call,
      // so we fire individual updates in parallel (fast for typical portfolio sizes)
      const promises = updates.map(({ id, current_price }) =>
        supabase
          .from('investments')
          .update({ current_price })
          .eq('user_id', user.id)
          .eq('id', Number(id))
      );
      const results = await Promise.all(promises);
      const firstError = results.find(r => r.error)?.error;
      if (firstError) {
        console.error('Erro ao salvar preços atualizados:', firstError);
        throw firstError;
      }
    }
  };

  // ── Goals CRUD ──────────────────────────────────────────────────────────────

  const addGoal = async (goal: Goal) => {
    // Generate a temporary ID for optimistic UI
    const tempId = Date.now().toString();
    const newGoalTemp = { ...goal, id: tempId };
    setGoals(prev => [newGoalTemp, ...prev]);

    if (user.id !== 0) {
      const { error, data } = await supabase.from('metas').insert({
        user_id: user.id,
        name: goal.name,
        target_amount: goal.target_amount,
        current_amount: goal.current_amount || 0,
        deadline: goal.deadline,
        color: goal.color,
        icon: goal.icon
      }).select().single();

      if (error) {
        console.error('Erro ao adicionar meta:', error);
        setGoals(prev => prev.filter(g => g.id !== tempId));
        throw error;
      }

      // Update with the real ID from DB
      if (data) {
        setGoals(prev => prev.map(g => g.id === tempId ? { ...g, id: data.id.toString() } : g));
        // XP concedido via Trigger do Supabase!
      }
    }
  };

  const updateGoal = async (goal: Goal) => {
    setGoals(prev => prev.map(g => g.id === goal.id ? goal : g));
    if (user.id !== 0) {
      const { error } = await supabase.from('metas').update({
        name: goal.name,
        target_amount: goal.target_amount,
        current_amount: goal.current_amount,
        deadline: goal.deadline,
        color: goal.color,
        icon: goal.icon
      }).eq('user_id', user.id).eq('id', goal.id);

      if (error) {
        console.error('Erro ao atualizar meta:', error);
        throw error;
      }
    }
  };

  const deleteGoal = async (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
    if (user.id !== 0) {
      const { error } = await supabase.from('metas').delete()
        .eq('user_id', user.id).eq('id', id);
      if (error) {
        console.error('Erro ao excluir meta:', error);
        throw error;
      }
    }
  };

  const addMoneyToGoal = async (id: string, amount: number) => {
    // Snapshot para rollback em caso de erro
    const previousGoals = goals;

    // Optimistic Update via callback para evitar race condition
    setGoals(prev => prev.map(g => g.id === id ? { ...g, current_amount: g.current_amount + amount } : g));

    if (user.id !== 0) {
      // Calcular novo valor a partir do estado atual (não do snapshot stale)
      const currentGoal = goals.find(g => g.id === id);
      if (!currentGoal) return;
      const newAmount = currentGoal.current_amount + amount;

      const { error } = await supabase.from('metas').update({
        current_amount: newAmount
      }).eq('user_id', user.id).eq('id', id);

      if (error) {
        console.error('Erro ao adicionar dinheiro à meta:', error);
        // Rollback on error
        setGoals(previousGoals);
        throw error;
      }
    }
  };

  // ── Budgets CRUD ──────────────────────────────────────────────────────────

  const addBudget = async (b: Budget) => {
    // Temp ID for optimistic update
    const tempId = Date.now();
    const newBudget = { ...b, id: tempId };
    setBudgets(prev => [...prev.filter(x => !(x.categoria === b.categoria && x.mes === b.mes && x.ano === b.ano)), newBudget]);

    if (user.id !== 0) {
      const { data, error } = await supabase
        .from('orcamentos')
        .upsert({
          user_id: user.id,
          categoria: b.categoria,
          valor_limite: b.valor_limite,
          mes: b.mes,
          ano: b.ano
        }, { onConflict: 'user_id, categoria, mes, ano' })
        .select()
        .single();

      if (error) {
        console.error('Error adding budget:', error);
        setBudgets(prev => prev.filter(x => x.id !== tempId));
        throw error;
      }
      if (data) {
        setBudgets(prev => prev.map(x => x.id === tempId ? { ...x, id: data.id } : x));
      }
    }
  };

  const updateBudget = async (b: Budget) => {
    setBudgets(prev => prev.map(x => x.id === b.id ? b : x));
    if (user.id !== 0) {
      const { error } = await supabase.from('orcamentos').update({
        valor_limite: b.valor_limite
      }).eq('id', b.id).eq('user_id', user.id);
      if (error) throw error;
    }
  };

  const deleteBudget = async (id: number) => {
    setBudgets(prev => prev.filter(x => x.id !== id));
    if (user.id !== 0) {
      const { error } = await supabase.from('orcamentos').delete().eq('id', id).eq('user_id', user.id);
      if (error) throw error;
    }
  };

  const addAccount = async (newAcc: BankAccount) => {
    // Optimistic Update
    setAccounts(prev => [...prev, newAcc]);

    if (user.id !== 0) {
      if (!isOnline) {
        addToQueue('ADD_ACCOUNT', newAcc);
        return;
      }
      
      const { data, error } = await supabase.from('contas_bancarias').insert({
        user_id: user.id,
        nome: newAcc.name,
        tipo: newAcc.type,
        cor: newAcc.color,
        saldo_inicial: newAcc.saldo_inicial,
        saldo_atual: newAcc.saldo_inicial
      }).select().single();

      if (error) {
        console.error('Erro ao adicionar conta:', error);
        setAccounts(prev => prev.filter(a => a.id !== newAcc.id));
        showNotification({
          title: 'Erro ao Salvar',
          message: 'Não foi possível salvar a conta no banco de dados.',
          type: 'error'
        });
      } else if (data) {
        // Update with the real ID from database
        setAccounts(prev => prev.map(a => a.id === newAcc.id ? { ...a, id: data.id.toString() } : a));
      }
    }
  };

  const updateAccount = async (updatedAcc: BankAccount) => {
    // Optimistic Update
    setAccounts(prev => prev.map(a => a.id === updatedAcc.id ? updatedAcc : a));

    if (user.id !== 0) {
      if (!isOnline) {
        addToQueue('UPDATE_ACCOUNT', updatedAcc);
        return;
      }

      const { error } = await supabase.from('contas_bancarias').update({
        nome: updatedAcc.name,
        tipo: updatedAcc.type,
        cor: updatedAcc.color,
        saldo_inicial: updatedAcc.saldo_inicial
      }).eq('id', updatedAcc.id).eq('user_id', user.id);

      if (error) {
        console.error('Erro ao atualizar conta:', error);
        showNotification({
          title: 'Erro de Sincronização',
          message: 'Houve um problema ao salvar as alterações da conta.',
          type: 'error'
        });
        fetchAccounts(user.id); // Rollback/Sync
      }
    }
  };

  const deleteAccount = async (id: string) => {
    // Store current state for potential rollback
    const previousAccounts = accounts;

    // Optimistic Update: remove immediately from UI
    setAccounts(prev => prev.filter(a => a.id !== id));

    if (user.id !== 0) {
      if (!isOnline) {
        addToQueue('DELETE_ACCOUNT', id);
        return;
      }

      const { error } = await supabase
        .from('contas_bancarias')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Erro ao excluir conta:', error);
        // Rollback: put back in UI
        setAccounts(previousAccounts);
        showNotification({
          title: 'Erro ao Excluir',
          message: 'Não foi possível excluir a conta no servidor. Revertendo...',
          type: 'error'
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <HashRouter>

      <RecoveryModal isOpen={showRecoveryModal} onSubmit={handleRecoveryPasswordSubmit} />
      {isAuthenticated && user.id !== 0 && user.contrato_assinado === false && (
        <TermsModal
          user={user}
          onAccept={() => setUser(prev => ({ ...prev, contrato_assinado: true }))}
        />
      )}
      {xpToast && (
        <XPToast
          xpGained={xpToast.xpGained}
          label={xpToast.label}
          leveledUp={xpToast.leveledUp}
          newLevel={xpToast.newLevel}
          onDone={() => setXpToast(null)}
        />
      )}
      <AppRoutes
        isAuthenticated={isAuthenticated}
        loading={loading}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        handleLogout={handleLogout}
        user={user}
        transactions={transactions}
        addTransaction={addTransaction}
        updateTransaction={updateTransaction}
        deleteTransaction={deleteTransaction}
        updateUser={updateUser}
        handleLoginSuccess={() => { }}
        isExiting={isExiting}
        privacyMode={privacyMode}
        togglePrivacyMode={togglePrivacyMode}
        cards={cards}
        fetchCards={fetchCards}
        investments={investments}
        addInvestment={addInvestment}
        updateInvestment={updateInvestment}
        deleteInvestment={deleteInvestment}
        updateInvestmentPrices={updateInvestmentPrices}
        addMultipleTransactions={addMultipleTransactions}
        payCardInvoice={payCardInvoice}
        goals={goals}
        addGoal={addGoal}
        updateGoal={updateGoal}
        deleteGoal={deleteGoal}
        addMoneyToGoal={addMoneyToGoal}
        budgets={budgets}
        addBudget={addBudget}
        updateBudget={updateBudget}
        deleteBudget={deleteBudget}
        accounts={accounts}
        addAccount={addAccount}
        updateAccount={updateAccount}
        deleteAccount={deleteAccount}
        isFetchingData={isFetchingData}
        isLimitModalOpen={isLimitModalOpen}
        setIsLimitModalOpen={setIsLimitModalOpen}
        gamificationProfile={gamificationProfile}
        unlockedAchievements={unlockedAchievements}
        challenges={challenges}
        equipCosmetic={equipCosmetic}
      />

      {/* TrocoBot Global V2 - Outside of Layout transform wrappers */}
      {isAuthenticated && user.id !== 0 && (
        <TrocoBot
          transactions={transactions}
          goals={goals}
          cards={cards}
          investments={investments}
          user={user}
          accounts={accounts}
          budgets={budgets}
        />
      )}
    </HashRouter>
  );
};

export default function App() {
  return (
    <OfflineProvider>
      <AppContent />
      <OfflineIndicator />
    </OfflineProvider>
  );
};