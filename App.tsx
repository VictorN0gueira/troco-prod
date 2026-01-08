import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Reports from './components/Reports';
import Settings from './components/Settings';
import Login from './components/Login';
import { Transaction, UserProfile } from './types';
import { supabase } from './supabaseClient';
import { Lock, Eye, EyeOff, CheckCircle2, AlertTriangle, Wallet } from 'lucide-react';
import { LOGO_URL } from './constants';

// Tempo limite de inatividade: 15 minutos
const INACTIVITY_LIMIT = 15 * 60 * 1000; 

// Protected Layout Wrapper com suporte a animação de saída
const ProtectedLayout = ({ 
  isAuthenticated, 
  darkMode, 
  toggleDarkMode, 
  onLogout,
  user,
  isExiting
}: { 
  isAuthenticated: boolean;
  darkMode: boolean;
  toggleDarkMode: () => void;
  onLogout: () => void;
  user: UserProfile;
  isExiting: boolean;
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
    isExiting
}: any) => {
    return (
      <Routes>
        <Route 
          path="/login" 
          element={
            isAuthenticated ? <Navigate to="/" replace /> : (
                // Wrapper animado para a tela de login
                <div className="animate-fade-in">
                    <Login onLogin={handleLoginSuccess} />
                </div>
            )
          } 
        />
        
        <Route element={
          <ProtectedLayout 
            isAuthenticated={isAuthenticated} 
            darkMode={darkMode} 
            toggleDarkMode={() => setDarkMode(!darkMode)}
            onLogout={handleLogout}
            user={user}
            isExiting={isExiting}
          />
        }>
          <Route path="/" element={
            <Dashboard 
              transactions={transactions} 
              user={user}
            />
          } />
          
          <Route path="/transactions" element={
            <Transactions 
              transactions={transactions} 
              onAdd={addTransaction}
              onEdit={updateTransaction}
              onDelete={deleteTransaction}
            />
          } />
          
          <Route path="/reports" element={
            <Reports transactions={transactions} />
          } />
          
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


const App: React.FC = () => {
  // Global State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
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
    status_assinatura: 'active'
  });

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

  // --- AUTO-LOGOUT LOGIC ---
  const resetInactivityTimer = useCallback(() => {
    if (!isAuthenticated) return;

    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }

    inactivityTimer.current = setTimeout(() => {
      console.log("Tempo de inatividade excedido. Deslogando...");
      handleLogout();
      alert("Sua sessão expirou por inatividade. Por favor, faça login novamente.");
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
        setLoading(false);
      }
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
        // Only force logout if not triggered by our manual handleLogout (which handles anims)
        // If session expires naturally or storage clears:
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
      // HEURÍSTICA DE CORREÇÃO DE TIPO
      // Se a descrição contém palavras chaves de receita, forçamos o tipo 'income'
      // mesmo que o banco diga 'expense' (correção de erro da IA)
      let finalType = t.tipo;
      const descLower = (t.descricao || '').toLowerCase();
      
      const incomeKeywords = [
        'salário', 'salario', 'recebimento', 'venda', 'pix recebido', 
        'depósito', 'cashback', 'lucro', 'rendimento', 'reembolso'
      ];
      
      if (incomeKeywords.some(k => descLower.includes(k))) {
        finalType = 'income';
      }

      return {
        // Prefer the alphanumeric code (identificador) if available for display, 
        // otherwise fallback to the numeric ID.
        id: t.identificador || t.id.toString(),
        description: t.descricao,
        amount: Number(t.valor),
        type: finalType,
        category: t.categoria || 'Outros',
        date: t.data,
        status: t.esta_pago ? 'completed' : 'pending'
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
          notificacoes_marketing: data.notificacoes_marketing ?? false
        };
        
        setUser(mappedUser);
        fetchTransactions(data.id);
        
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
          // APLICAÇÃO DA MESMA HEURÍSTICA NO FETCH INICIAL
          let finalType = t.tipo;
          const descLower = (t.descricao || '').toLowerCase();
          const incomeKeywords = [
            'salário', 'salario', 'recebimento', 'venda', 'pix recebido', 
            'depósito', 'cashback', 'lucro', 'rendimento', 'reembolso'
          ];
          
          if (incomeKeywords.some(k => descLower.includes(k))) {
            finalType = 'income';
          }

          return {
            id: t.identificador || t.id.toString(),
            description: t.descricao,
            amount: Number(t.valor),
            type: finalType,
            category: t.categoria || 'Outros',
            date: t.data,
            status: t.esta_pago ? 'completed' : 'pending'
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
    const { error } = await supabase.from('usuarios').update({
        nome: updatedUser.nome,
        telefone: updatedUser.telefone,
        avatar_url: updatedUser.avatarUrl,
        notificacoes_email: updatedUser.notificacoes_email,
        notificacoes_push: updatedUser.notificacoes_push,
        notificacoes_marketing: updatedUser.notificacoes_marketing
    }).eq('id', user.id); // SEGURANÇA: Usa ID da sessão (user.id) e não o do objeto recebido

    if (error) {
        console.error("Erro no update do usuário:", error);
        throw error; // Lança erro para ser tratado no Settings.tsx
    }
  };

  const addTransaction = async (newTransaction: Transaction) => {
    setTransactions(prev => [newTransaction, ...prev]);
    if (user.id !== 0) {
        // CORREÇÃO PARA STATUS "Pago" vindo do N8N/AI
        // Verifica se é 'completed', ou se a string é 'pago'/'Pago'
        const isPaid = newTransaction.status === 'completed' || String(newTransaction.status).toLowerCase() === 'pago';

        const { error } = await supabase.from('transacoes').insert({
            user_id: user.id,
            descricao: newTransaction.description,
            valor: newTransaction.amount,
            tipo: newTransaction.type,
            categoria: newTransaction.category,
            data: newTransaction.date,
            esta_pago: isPaid, // Envia BOOLEANO garantido
            identificador: newTransaction.id
        });
        
        if (error) {
            console.error("Erro ao salvar:", error);
            // Extração segura da mensagem de erro
            const msg = error.message || error.details || JSON.stringify(error);
            alert(`Erro ao salvar no banco de dados: ${msg}`);
        }
    }
  };

  const updateTransaction = async (updatedTransaction: Transaction) => {
    setTransactions(prev => prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t));
    
    const isNumericId = !isNaN(Number(updatedTransaction.id));
    
    // CORREÇÃO PARA STATUS "Pago"
    const isPaid = updatedTransaction.status === 'completed' || String(updatedTransaction.status).toLowerCase() === 'pago';

    // SEGURANÇA: Adiciona filtro pelo ID do usuário
    const updateQuery = supabase
      .from('transacoes')
      .update({
        descricao: updatedTransaction.description,
        valor: updatedTransaction.amount,
        tipo: updatedTransaction.type,
        categoria: updatedTransaction.category,
        data: updatedTransaction.date,
        esta_pago: isPaid // Envia BOOLEANO garantido
      })
      .eq('user_id', user.id); // <--- GARANTE QUE O USUÁRIO SÓ ATUALIZE O SEU DADO
      
    if (isNumericId) {
        await updateQuery.eq('id', Number(updatedTransaction.id));
    } else {
        await updateQuery.eq('identificador', updatedTransaction.id);
    }
  };

  const deleteTransaction = async (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    
    const isNumericId = !isNaN(Number(id));
    
    // SEGURANÇA: Adiciona filtro pelo ID do usuário
    const deleteQuery = supabase
        .from('transacoes')
        .delete()
        .eq('user_id', user.id); // <--- GARANTE QUE O USUÁRIO SÓ DELETE O SEU DADO
    
    if (isNumericId) {
        await deleteQuery.eq('id', Number(id));
    } else {
        await deleteQuery.eq('identificador', id);
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
            handleLoginSuccess={() => {}}
            isExiting={isExiting}
        />
    </HashRouter>
  );
};

export default App;