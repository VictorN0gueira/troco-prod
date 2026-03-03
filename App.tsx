import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Reminders from './components/Reminders';
import CalendarView from './components/CalendarView'; // Import Calendar
import CreditCards from './components/CreditCards';
import Reports from './components/Reports';
import Settings from './components/Settings';
import Login from './components/Login';
import LandingPage from './components/LandingPage';
import Investments from './components/Investments';
import Legal from './components/Legal';
import NewsFeed from './components/NewsFeed';
import Goals from './components/Goals';
import { Transaction, UserProfile, CreditCard, Investment, Goal } from './types';
import { supabase } from './supabaseClient';
import { Lock, Eye, EyeOff, CheckCircle2, AlertTriangle, Wallet } from 'lucide-react';
import { LOGO_URL } from './constants';
import { getTodayLocalDate, formatTransaction, generateTransactionId } from './utils';
import { OfflineProvider, useOffline } from './components/OfflineContext';
import { RefreshCw, WifiOff } from 'lucide-react';
import { useNotification } from './contexts/NotificationContext';
import { AnimatePresence, motion } from 'framer-motion';
import OnboardingTour from './components/OnboardingTour';
import TermsModal from './components/TermsModal';

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
  togglePrivacyMode
}: {
  isAuthenticated: boolean;
  darkMode: boolean;
  toggleDarkMode: () => void;
  onLogout: () => void;
  user: UserProfile;
  isExiting: boolean;
  privacyMode: boolean;
  togglePrivacyMode: () => void;
}) => {
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    // O container aplica a animação de entrada por padrão, ou a de saída se isExiting for true
    <div className={isExiting ? "animate-fade-out-scale origin-center" : "animate-fade-in-up"}>
      <Layout
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        onLogout={onLogout}
        user={user}
        privacyMode={privacyMode}
        togglePrivacyMode={togglePrivacyMode}
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
}

// Componente interno para gerenciar navegação baseada em eventos
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
  addMoneyToGoal
}: AppRoutesProps) => {
  return (
    <Routes>
      <Route
        path="/"
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
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
              exit={{ opacity: 0, scale: 0.95 }}
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
        />
      }>
        <Route path="/dashboard" element={
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="h-full w-full">
            <Dashboard
              transactions={transactions}
              user={user}
              privacyMode={privacyMode}
              cards={cards} // Pass cards to Dashboard
            />
          </motion.div>
        } />

        <Route path="/transactions" element={
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="h-full w-full">
            <Transactions
              transactions={transactions}
              onAdd={addTransaction}
              onEdit={updateTransaction}
              onDelete={deleteTransaction}
              cards={cards}
              onAddMultiple={addMultipleTransactions}
              user={user}
            />
          </motion.div>
        } />

        <Route path="/reminders" element={
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="h-full w-full">
            <Reminders
              transactions={transactions}
              onAdd={addTransaction}
              onEdit={updateTransaction}
              onDelete={deleteTransaction}
              user={user}
            />
          </motion.div>
        } />

        <Route path="/calendar" element={
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="h-full w-full">
            <CalendarView
              transactions={transactions}
              onAddTransaction={addTransaction}
              onUpdateTransaction={updateTransaction}
            />
          </motion.div>
        } />

        <Route path="/cards" element={
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="h-full w-full">
            <CreditCards
              user={user}
              cards={cards}
              transactions={transactions}
              fetchCards={fetchCards}
              payCardInvoice={payCardInvoice}
            />
          </motion.div>
        } />

        <Route path="/reports" element={
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="h-full w-full">
            <Reports transactions={transactions} />
          </motion.div>
        } />

        <Route path="/investments" element={
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="h-full w-full">
            <Investments
              investments={investments}
              onAdd={addInvestment}
              onEdit={updateInvestment}
              onDelete={deleteInvestment}
              onUpdatePrices={updateInvestmentPrices}
              user={user}
              privacyMode={privacyMode}
            />
          </motion.div>
        } />

        <Route path="/insights" element={
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="h-full w-full">
            <NewsFeed user={user} />
          </motion.div>
        } />

        <Route path="/goals" element={
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="h-full w-full">
            <Goals
              goals={goals}
              onAdd={addGoal}
              onEdit={updateGoal}
              onDelete={deleteGoal}
              onAddMoney={addMoneyToGoal}
              user={user}
              privacyMode={privacyMode}
            />
          </motion.div>
        } />

        <Route path="/settings" element={
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="h-full w-full">
            <Settings
              user={user}
              onUpdateUser={updateUser}
            />
          </motion.div>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
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
  // Persistir preferências no localStorage entre sessões
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
            const dbType = tx.type === 'income' ? 'Receita' : 'Despesa';
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
            const dbType = tx.type === 'income' ? 'Receita' : 'Despesa';
            const isPaid = tx.status === 'completed' || String(tx.status).toLowerCase() === 'pago';

            const { error } = await supabase.from('transacoes').update({
              descricao: tx.description,
              valor: tx.amount,
              tipo: dbType,
              categoria: tx.category,
              data: tx.date,
              esta_pago: isPaid,
              is_recurring: tx.isRecurring,
              card_id: tx.cardId
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
        } catch (error) {
          console.error(`[Offline Sync] Erro ao sincronizar ação ${action.id}:`, error);
          // Se falhou, mantemos na fila para a próxima tentativa
        }
      }
    };

    processQueue();
  }, [isOnline, queue, user.id, removeFromQueue]);

  const { showNotification } = useNotification();

  // Aplicar tema e persistir no localStorage
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('troco_darkMode', String(darkMode));
  }, [darkMode]);

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
      setTransactions([]);
      setUser({ id: 0, nome: '', email: '', telefone: '', avatarUrl: '', status_assinatura: 'canceled' });
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


  // --- SUPABASE AUTH & DATA LISTENER ---
  useEffect(() => {
    // 1. Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true);
        if (session.user.email) {
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
        if (user.id === 0 && session.user.email) {
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
              // Evita duplicatas vindas do Realtime se já estiver no estado (Optimistic UI / Sync Fila)
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
        }
      )
      .subscribe();

    // Canal de Cartões
    const channelCards = supabase
      .channel(`realtime:cards:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'credit_cards', filter: `user_id=eq.${user.id}` },
        () => fetchCards(user.id) // Refetch é mais simples para manter consistência de totais
      )
      .subscribe();

    // Canal de Metas
    const channelGoals = supabase
      .channel(`realtime:goals:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'metas', filter: `user_id=eq.${user.id}` },
        () => fetchGoals(user.id)
      )
      .subscribe();

    // Canal de Investimentos
    const channelInvestments = supabase
      .channel(`realtime:investments:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'investments', filter: `user_id=eq.${user.id}` },
        () => fetchInvestments(user.id)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelTx);
      supabase.removeChannel(channelCards);
      supabase.removeChannel(channelGoals);
      supabase.removeChannel(channelInvestments);
    };
  }, [user.id]);


  // --- DATA FETCHING FUNCTIONS (With Retry) ---

  // State for Cards
  const [cards, setCards] = useState<CreditCard[]>([]);

  // State for Investments
  const [investments, setInvestments] = useState<Investment[]>([]);

  // State for Goals
  const [goals, setGoals] = useState<Goal[]>([]);

  // Fetch Goals Function
  const fetchGoals = async (userId: number) => {
    try {
      const { data, error } = await supabase
        .from('metas')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setGoals(
        (data || []).map((g: any): Goal => ({
          id: g.id.toString(),
          user_id: g.user_id,
          name: g.name,
          target_amount: Number(g.target_amount),
          current_amount: Number(g.current_amount),
          deadline: g.deadline,
          color: g.color,
          icon: g.icon,
          created_at: g.created_at,
        }))
      );
    } catch (error) {
      console.error('Error fetching goals:', error);
    }
  };

  // Fetch Investments Function
  const fetchInvestments = async (userId: number) => {
    try {
      const { data, error } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setInvestments(
        (data || []).map((i: any): Investment => ({
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
        }))
      );
    } catch (error) {
      console.error('Error fetching investments:', error);
    }
  };

  // Fetch Cards Function
  const fetchCards = async (userId: number) => {
    try {
      const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setCards(data || []);
    } catch (error) {
      console.error('Error fetching cards:', error);
    }
  };

  // Update fetchUserProfileByEmail to call fetchCards
  const fetchUserProfileByEmail = async (email: string, retries = 3) => {
    try {
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

        setUser(mappedUser);
        fetchTransactions(data.id);
        fetchCards(data.id); // Fetch Cards too!
        fetchInvestments(data.id); // Fetch Investments too!
        fetchGoals(data.id); // Fetch Goals too!

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
        tipo: t.type === 'income' ? 'Receita' : 'Despesa',
        categoria: t.category,
        data: t.date,
        esta_pago: t.status === 'completed' || String(t.status).toLowerCase() === 'pago',
        identificador: t.id,
        is_recurring: t.isRecurring,
        card_id: t.cardId,
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

  const payCardInvoice = async (cardId: number, totalAmount: number, invoiceTransactionsIds: string[]) => {
    // 1. Encontrar o cartão correspondente e atualizar limite no JS
    const cardToPay = cards.find(c => c.id === cardId);
    if (!cardToPay) return;

    // 2. Atualizar localmente as transações da fatura e limite do cartão
    setTransactions(prev => prev.map(t =>
      invoiceTransactionsIds.includes(t.id) ? { ...t, status: 'completed' } : t
    ));

    setCards(prev => prev.map(c =>
      c.id === cardId ? { ...c, current_usage: Math.max(0, c.current_usage - totalAmount) } : c
    ));

    if (user.id !== 0 && isOnline) {
      // 3. Update BD

      // Update das transações para esta_pago = true
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
      }

      // Atualizar current_usage no Cartão
      const newUsage = Math.max(0, cardToPay.current_usage - totalAmount);
      const { error: cardError } = await supabase
        .from('credit_cards')
        .update({ current_usage: newUsage })
        .eq('id', cardToPay.id);

      if (cardError) {
        console.error("Erro ao atualizar limite do cartão:", cardError);
      }

      // Adicionar Transação de "Pagamento de Fatura"
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const todayString = `${y}-${m}-${d}`;

      const paymentTxId = generateTransactionId(6);

      const payloadPayment = {
        user_id: user.id,
        descricao: `Pagamento de Fatura - ${cardToPay.name}`,
        valor: totalAmount,
        tipo: 'Despesa',
        categoria: 'Financeiro',
        data: todayString,
        esta_pago: true,
        identificador: paymentTxId,
        is_recurring: false,
        card_id: cardId, // Ligando ao cartão para ter histórico
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

  const addTransaction = async (newTransaction: Transaction) => {
    setTransactions(prev => [newTransaction, ...prev]);

    if (user.id !== 0) {
      // --- OFFLINE LOGIC START ---
      if (!isOnline) {
        addToQueue('ADD', newTransaction);
        return; // Interrompe para não tentar Supabase
      }
      // --- OFFLINE LOGIC END ---

      const isPaid = newTransaction.status === 'completed' || String(newTransaction.status).toLowerCase() === 'pago';

      // TRADUÇÃO PARA O BANCO DE DADOS: income -> Receita, expense -> Despesa
      const dbType = newTransaction.type === 'income' ? 'Receita' : 'Despesa';

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

      // TRADUÇÃO PARA O BANCO DE DADOS: income -> Receita, expense -> Despesa
      const dbType = updatedTransaction.type === 'income' ? 'Receita' : 'Despesa';

      // Constroi query segura usando chaining correto do Supabase
      let query = supabase.from('transacoes').update({
        descricao: updatedTransaction.description,
        valor: updatedTransaction.amount,
        tipo: dbType,
        categoria: updatedTransaction.category,
        data: updatedTransaction.date,
        esta_pago: isPaid,
        is_recurring: updatedTransaction.isRecurring,
        card_id: updatedTransaction.cardId
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <HashRouter>
      <OnboardingTour userId={user.id} user={user} />
      <RecoveryModal isOpen={showRecoveryModal} onSubmit={handleRecoveryPasswordSubmit} />
      {isAuthenticated && user.id !== 0 && user.contrato_assinado === false && (
        <TermsModal
          user={user}
          onAccept={() => setUser(prev => ({ ...prev, contrato_assinado: true }))}
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
      />
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