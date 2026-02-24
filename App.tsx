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
import { Transaction, UserProfile, CreditCard, Investment } from './types';
import { supabase } from './supabaseClient';
import { Lock, Eye, EyeOff, CheckCircle2, AlertTriangle, Wallet } from 'lucide-react';
import { LOGO_URL } from './constants';
import { getTodayLocalDate } from './utils';
import { OfflineProvider, useOffline } from './components/OfflineContext';
import { RefreshCw, WifiOff } from 'lucide-react';
import { useNotification } from './contexts/NotificationContext';

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
  payCardInvoice
}: any) => {
  return (
    <Routes>
      <Route
        path="/"
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />
        }
      />

      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : (
            // Wrapper animado para a tela de login
            <div className="animate-fade-in">
              <Login onLogin={handleLoginSuccess} />
            </div>
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
          <Dashboard
            transactions={transactions}
            user={user}
            privacyMode={privacyMode}
            cards={cards} // Pass cards to Dashboard
          />
        } />

        <Route path="/transactions" element={
          <Transactions
            transactions={transactions}
            onAdd={addTransaction}
            onEdit={updateTransaction}
            onDelete={deleteTransaction}
            cards={cards}
            onAddMultiple={addMultipleTransactions}
          />
        } />

        <Route path="/reminders" element={
          <Reminders
            transactions={transactions}
            onAdd={addTransaction}
            onEdit={updateTransaction}
            onDelete={deleteTransaction}
          />
        } />

        <Route path="/calendar" element={
          <CalendarView
            transactions={transactions}
            onAddTransaction={addTransaction}
            onUpdateTransaction={updateTransaction}
          />
        } />

        <Route path="/cards" element={
          <CreditCards
            user={user}
            cards={cards}
            transactions={transactions}
            fetchCards={fetchCards}
            payCardInvoice={payCardInvoice}
          />
        } />

        <Route path="/reports" element={
          <Reports transactions={transactions} />
        } />

        <Route path="/investments" element={
          <Investments
            investments={investments}
            onAdd={addInvestment}
            onEdit={updateInvestment}
            onDelete={deleteInvestment}
            onUpdatePrices={updateInvestmentPrices}
            user={user}
            privacyMode={privacyMode}
          />
        } />

        <Route path="/insights" element={<NewsFeed />} />

        <Route path="/settings" element={
          <Settings
            user={user}
            onUpdateUser={updateUser}
          />
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
  const [darkMode, setDarkMode] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false); // Novo estado de privacidade

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
    status_assinatura: 'active',
  });

  // Offline Hook
  const { addToQueue, isOnline } = useOffline();

  const { showNotification } = useNotification();

  // Initialize Theme
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // --- HANDLERS ---

  const handleLogout = useCallback(async () => {
    // Start exit animation
    setIsExiting(true);

    // Wait for animation to finish before destroying the session
    setTimeout(async () => {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setTransactions([]);
      setUser({ id: 0, nome: '', email: '', telefone: '', avatarUrl: '', status_assinatura: 'active' });
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
  const resetInactivityTimer = useCallback(() => {
    if (!isAuthenticated) return;

    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }

    inactivityTimer.current = setTimeout(() => {
      console.log("Tempo de inatividade excedido. Deslogando...");
      handleLogout();
      showNotification({
        title: 'Sessão Expirada',
        message: 'Sua sessão expirou por inatividade. Por favor, faça login novamente.',
        type: 'warning',
        duration: 8000
      });
    }, INACTIVITY_LIMIT);
  }, [isAuthenticated, handleLogout]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];

    const setupActivityListeners = () => {
      events.forEach(event => {
        window.addEventListener(event, resetInactivityTimer);
      });
      resetInactivityTimer();
    };

    setupActivityListeners();

    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      events.forEach(event => {
        window.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, [isAuthenticated, resetInactivityTimer]);


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
          setUser({ id: 0, nome: '', email: '', telefone: '', avatarUrl: '', status_assinatura: 'active' });
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [isExiting]); // eslint-disable-line react-hooks/exhaustive-deps


  // --- REALTIME LISTENER FOR TRANSACTIONS ---
  useEffect(() => {
    if (user.id === 0) return;

    const formatTransaction = (t: any): Transaction => {
      // 1. Normalização de Tipo (Banco -> Frontend)
      // O banco pode ter: 'Receita', 'Despesa', 'income', 'expense' (legado/bug)
      // O frontend DEVE receber: 'income' ou 'expense'
      let finalType: 'income' | 'expense' = 'expense'; // Default
      const typeLower = (t.tipo || '').toLowerCase();

      if (typeLower === 'receita' || typeLower === 'income') {
        finalType = 'income';
      } else if (typeLower === 'despesa' || typeLower === 'expense') {
        finalType = 'expense';
      } else {
        // Heurística de Fallback (apenas se tipo estiver vazio/inválido)
        const descLower = (t.descricao || '').toLowerCase();
        const incomeKeywords = [
          'salário', 'salario', 'recebimento', 'venda', 'pix recebido',
          'depósito', 'cashback', 'lucro', 'rendimento', 'reembolso'
        ];
        if (incomeKeywords.some(k => descLower.includes(k))) {
          finalType = 'income';
        }
      }

      return {
        id: t.identificador || t.id.toString(),
        description: t.descricao,
        amount: Number(t.valor),
        type: finalType,
        category: t.categoria || 'Outros',
        date: t.data,
        status: t.esta_pago ? 'completed' : 'pending',
        isRecurring: t.is_recurring, // Map DB snake_case to Frontend camelCase
        installment_group: t.installment_group
      };
    };

    console.log(`Iniciando canal Realtime para user_id: ${user.id}`);

    const channel = supabase
      .channel('realtime:transactions')
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
            setTransactions((prev) => [newTx, ...prev]);
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);


  // --- DATA FETCHING FUNCTIONS (With Retry) ---

  // State for Cards
  const [cards, setCards] = useState<CreditCard[]>([]);

  // State for Investments
  const [investments, setInvestments] = useState<Investment[]>([]);

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
          notificacoes_whatsapp: data.notificacoes_whatsapp ?? false
        };

        setUser(mappedUser);
        fetchTransactions(data.id);
        fetchCards(data.id); // Fetch Cards too!
        fetchInvestments(data.id); // Fetch Investments too!

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
        const formatted: Transaction[] = data.map((t: any) => {
          // 1. Normalização de Tipo (Duplicada para o fetch inicial)
          let finalType: 'income' | 'expense' = 'expense';
          const typeLower = (t.tipo || '').toLowerCase();

          if (typeLower === 'receita' || typeLower === 'income') {
            finalType = 'income';
          } else if (typeLower === 'despesa' || typeLower === 'expense') {
            finalType = 'expense';
          } else {
            // Heurística fallback
            const descLower = (t.descricao || '').toLowerCase();
            const incomeKeywords = [
              'salário', 'salario', 'recebimento', 'venda', 'pix recebido',
              'depósito', 'cashback', 'lucro', 'rendimento', 'reembolso'
            ];
            if (incomeKeywords.some(k => descLower.includes(k))) {
              finalType = 'income';
            }
          }

          return {
            id: t.identificador || t.id.toString(),
            description: t.descricao,
            amount: Number(t.valor),
            type: finalType,
            category: t.categoria || 'Outros',
            date: t.data,
            status: t.esta_pago ? 'completed' : 'pending',
            isRecurring: t.is_recurring, // Map DB snake_case to Frontend camelCase
            cardId: t.card_id, // Map card_id
            installment_group: t.installment_group
          };
        });
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
        alert(`Erro ao sincronizar parcelas: ${error.message}`);
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
        alert("Erro ao marcar transações como pagas.");
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

      if (isNumericId) {
        await deleteQuery.eq('id', Number(id));
      } else {
        await deleteQuery.eq('identificador', id);
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
        fetchCards={() => fetchCards(user.id)}
        investments={investments}
        addInvestment={addInvestment}
        updateInvestment={updateInvestment}
        deleteInvestment={deleteInvestment}
        updateInvestmentPrices={updateInvestmentPrices}
        addMultipleTransactions={addMultipleTransactions}
        payCardInvoice={payCardInvoice}
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