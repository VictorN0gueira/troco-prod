import React, { useState, useEffect } from 'react';
import { ArrowRight, Lock, Mail, ArrowLeft, CheckCircle2, AlertTriangle, UserPlus, ShieldCheck, KeyRound, Sparkles, HelpCircle, ExternalLink } from 'lucide-react';
import { UserProfile } from '../types';
import { supabase } from '../supabaseClient';
import { LOGO_URL } from '../constants';

interface LoginProps {
  onLogin: (user: UserProfile) => void;
}

type ViewMode = 'login' | 'first_access_check' | 'first_access_create' | 'forgot_password';

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('login');
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Feedback States
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showForgotSuccess, setShowForgotSuccess] = useState(false);
  
  // Temp User Data
  const [dbUser, setDbUser] = useState<any>(null);

  // Check for persisted errors (e.g. from forced logout due to subscription)
  useEffect(() => {
    const persistedError = sessionStorage.getItem('troco_subscription_error');
    if (persistedError) {
      setError('SUBSCRIPTION_ERROR');
      sessionStorage.removeItem('troco_subscription_error');
    }
  }, []);

  // Reset states when switching modes
  const switchMode = (mode: ViewMode) => {
    setViewMode(mode);
    setError(null);
    setSuccessMsg(null);
    setShowForgotSuccess(false);
    setPassword('');
    setConfirmPassword('');
    // We keep email if moving between check, create or forgot password for better UX
    if (mode === 'login') {
      setEmail('');
    }
  };

  // --- LOGIC: Regular Login ---
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Authenticate with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // 2. Check Subscription in public.usuarios
      if (data.user && data.user.email) {
         const { data: profile } = await supabase
            .from('usuarios')
            .select('tem_plano')
            .eq('email', data.user.email)
            .single();
         
         if (profile && profile.tem_plano === false) {
             // Marca flag no storage para persistir erro após reload/remount do componente
             sessionStorage.setItem('troco_subscription_error', 'true');
             
             // Encerra a sessão imediatamente para impedir acesso
             await supabase.auth.signOut();
             throw new Error('SUBSCRIPTION_ERROR');
         }
      }

    } catch (err: any) {
      if (err.message === 'SUBSCRIPTION_ERROR') {
          // O erro visual será tratado pelo useEffect no remount, 
          // mas definimos aqui também caso o componente não desmonte imediatamente
          setError('SUBSCRIPTION_ERROR');
      } else {
          setError(err.message === 'Invalid login credentials' 
            ? 'Email ou senha incorretos. Se criou a conta agora, verifique se confirmou o email.' 
            : err.message);
      }
      setLoading(false);
    }
  };

  // --- LOGIC: Forgot Password ---
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin, // Redireciona de volta para a aplicação
        });

        if (error) throw error;

        // Ao invés de apenas msg, mudamos o estado visual
        setShowForgotSuccess(true);
    } catch (err: any) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  // --- LOGIC: First Access (Step 1: Check Email in DB) ---
  const handleFirstAccessCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
        // Check if user exists in public.usuarios (The table populated by Kirvano/N8N)
        const { data, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('email', email)
            .single();
        
        if (error || !data) {
            setError("Email não encontrado na base de clientes. Verifique se digitou o email da compra corretamente.");
            setLoading(false);
            return;
        }

        // If user exists, we allow them to proceed to create password
        setDbUser(data);
        setViewMode('first_access_create');
        setLoading(false);

    } catch (err) {
        setError("Erro ao verificar email. Tente novamente.");
        setLoading(false);
    }
  };

  // --- LOGIC: First Access (Step 2: Create Auth & Sync) ---
  const handleCreatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      // 1. Create User in Supabase Auth (This handles the login session)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: window.location.origin, // Garante retorno ao site correto
            data: {
                full_name: dbUser?.nome || email.split('@')[0]
            }
        }
      });

      if (error) {
          if (error.message.includes("registered") || error.status === 400) {
              setError("Este email já possui cadastro. Por favor, faça login.");
          } else {
              throw error;
          }
          setLoading(false);
          return;
      }

      // Mensagem atualizada para instruir verificação de email
      setSuccessMsg('Cadastro realizado! Enviamos um email de confirmação. Por favor, verifique sua caixa de entrada e clique no link para ativar sua conta.');
      setViewMode('login');
      setPassword('');

    } catch (err: any) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-white dark:bg-slate-900">
      {/* Left Side - Inspirational/Brand */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-slate-900 to-slate-800 dark:from-emerald-900 dark:to-slate-950 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1611974765270-ca12586343bb?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
        <div className="relative z-10 p-16 max-w-xl text-white text-center">
          <img 
            src={LOGO_URL} 
            alt="Trocô Logo" 
            className="h-48 w-auto mb-10 drop-shadow-2xl mx-auto animate-float" 
          />
          <h1 className="text-5xl font-extrabold tracking-tight mb-6 leading-tight">
            Transforme suas <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">finanças</span> em liberdade.
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed mb-8">
            O Trocô oferece o controle total sobre seu patrimônio com uma interface intuitiva, segura e poderosa.
          </p>
          
          <div className="flex items-center gap-2 text-emerald-300/80 text-sm bg-slate-900/50 p-3 rounded-lg backdrop-blur-md inline-block">
             <ShieldCheck className="w-5 h-5" />
             <span>Ambiente criptografado e seguro</span>
          </div>
        </div>
      </div>

      {/* Right Side - Form Container */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
        <div className="w-full max-w-md animate-fade-in-up">
          
          {/* Logo on Mobile/Top of form for brand consistency */}
          <div className="flex justify-center mb-8">
             <img 
                src={LOGO_URL} 
                alt="Trocô" 
                className="h-20 w-auto object-contain animate-float"
             />
          </div>

          {/* Subscription Error Alert (Overlay) */}
          {error === 'SUBSCRIPTION_ERROR' && (
             <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center animate-shake">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-800 rounded-full flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-300" />
                </div>
                <h3 className="text-lg font-bold text-red-800 dark:text-red-200 mb-2">Assinatura Pendente</h3>
                <p className="text-sm text-red-600 dark:text-red-300 mb-4">
                  Identificamos uma pendência no seu plano. Para continuar acessando o sistema, por favor regularize sua assinatura.
                </p>
                <button 
                  onClick={() => window.open('https://pay.kirvano.com/5e032963-787d-49de-b407-c3d1c4724c9d', '_blank')}
                  className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-500/20"
                >
                  Regularizar Agora
                </button>
                <button 
                  onClick={() => setError(null)}
                  className="mt-3 text-sm text-red-500 hover:text-red-300 underline"
                >
                  Tentar outro login
                </button>
             </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div className="mb-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">Sucesso!</p>
                <p className="text-sm text-emerald-600 dark:text-emerald-300">{successMsg}</p>
              </div>
            </div>
          )}

          {/* Standard Error Message */}
          {error && error !== 'SUBSCRIPTION_ERROR' && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-600 dark:text-red-300 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* --- VIEW: LOGIN --- */}
          {viewMode === 'login' && error !== 'SUBSCRIPTION_ERROR' && (
            <>
              <div className="text-center lg:text-left mb-8">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Bem-vindo de volta</h2>
                <p className="mt-2 text-slate-500">Entre na sua conta para acessar o dashboard.</p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="seu@email.com"
                      className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600 dark:text-slate-400">
                      Lembrar de mim
                    </label>
                  </div>

                  <div className="text-sm">
                    <button 
                      type="button" 
                      onClick={() => switchMode('forgot_password')}
                      className="font-medium text-emerald-600 hover:text-emerald-500 hover:underline transition-all"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`
                    group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all shadow-lg shadow-emerald-500/30
                    ${loading ? 'opacity-80 cursor-not-allowed' : ''}
                  `}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span className="flex items-center">
                      Entrar
                      <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </button>
              </form>
              
              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                 {/* Primeiro Acesso */}
                 <div className="text-center">
                    <p className="text-slate-600 dark:text-slate-400 mb-2 text-sm">Comprou agora e ainda não tem senha?</p>
                    <button 
                      onClick={() => switchMode('first_access_check')}
                      className="w-full inline-flex items-center justify-center px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Acessar pela primeira vez
                    </button>
                 </div>

                 {/* Assinar Agora (CTA) */}
                 <div className="pt-2">
                    <a 
                      href="https://pay.kirvano.com/5e032963-787d-49de-b407-c3d1c4724c9d" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="group w-full inline-flex items-center justify-center px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 font-bold hover:shadow-md transition-all active:scale-95"
                    >
                      <Sparkles className="w-4 h-4 mr-2 text-emerald-500" />
                      Assinar Trocô por apenas R$ 9,90
                      <ExternalLink className="w-3 h-3 ml-2 opacity-50" />
                    </a>
                 </div>
              </div>

              {/* Mobile Only Security Badge */}
              <div className="lg:hidden mt-8 flex justify-center">
                 <div className="flex items-center gap-2 text-slate-400 text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded-lg">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Dados protegidos e criptografados</span>
                 </div>
              </div>
            </>
          )}

          {/* --- VIEW: FORGOT PASSWORD --- */}
          {viewMode === 'forgot_password' && (
            <>
               <button 
                onClick={() => switchMode('login')}
                className="mb-6 flex items-center text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar para Login
              </button>

              <div className="text-center lg:text-left mb-8">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Recuperar Senha</h2>
                <p className="mt-2 text-slate-500">Informe o email associado à sua conta para receber o link de redefinição.</p>
              </div>

              {showForgotSuccess ? (
                <div className="animate-fade-in bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-6 text-center shadow-sm">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Email Enviado!</h3>
                  <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                    Se <strong>{email}</strong> estiver cadastrado, você receberá o link em instantes. Verifique também sua caixa de <strong>Spam</strong> ou <strong>Lixo Eletrônico</strong>.
                  </p>
                  
                  <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 rounded-xl p-4 text-left mb-6">
                    <div className="flex items-start gap-3">
                        <HelpCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-amber-800 dark:text-amber-200 text-sm mb-1">Não recebeu o email?</p>
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                                Se você comprou o acesso mas nunca criou uma senha, sua conta de login ainda não existe. Use a opção "Primeiro Acesso" para criar sua conta.
                            </p>
                        </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button 
                        onClick={() => switchMode('first_access_check')}
                        className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                        Tentar "Primeiro Acesso"
                    </button>
                    <button 
                        onClick={() => { setShowForgotSuccess(false); setEmail(''); }}
                        className="w-full py-3 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-sm font-medium"
                    >
                        Tentar outro email
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-6">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="seu@email.com"
                        className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        />
                    </div>

                    <button
                    type="submit"
                    disabled={loading}
                    className={`
                        group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all
                        ${loading ? 'opacity-80 cursor-not-allowed' : ''}
                    `}
                    >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <span className="flex items-center">
                        Enviar Email de Recuperação
                        <KeyRound className="ml-2 w-4 h-4 group-hover:rotate-45 transition-transform" />
                        </span>
                    )}
                    </button>
                </form>
              )}
            </>
          )}

          {/* --- VIEW: FIRST ACCESS (CHECK EMAIL) --- */}
          {viewMode === 'first_access_check' && (
            <>
              <button 
                onClick={() => switchMode('login')}
                className="mb-6 flex items-center text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar para Login
              </button>

              <div className="text-center lg:text-left mb-8">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Primeiro Acesso</h2>
                <p className="mt-2 text-slate-500">Insira o email utilizado na compra para localizarmos seu cadastro.</p>
              </div>

              <form onSubmit={handleFirstAccessCheck} className="space-y-6">
                 <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="Email da compra (ex: nome@email.com)"
                      className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <button
                  type="submit"
                  disabled={loading}
                  className={`
                    group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all
                    ${loading ? 'opacity-80 cursor-not-allowed' : ''}
                  `}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span className="flex items-center">
                      Continuar
                      <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </button>
              </form>
            </>
          )}

          {/* --- VIEW: FIRST ACCESS (CREATE PASSWORD) --- */}
          {viewMode === 'first_access_create' && (
            <>
               <button 
                onClick={() => switchMode('first_access_check')}
                className="mb-6 flex items-center text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
              </button>

              <div className="text-center lg:text-left mb-8">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Criar Senha</h2>
                <p className="mt-2 text-slate-500">Olá, <span className="text-emerald-500 font-semibold">{dbUser?.nome || 'Usuário'}</span>! Defina uma senha segura para acessar sua conta.</p>
              </div>

              <form onSubmit={handleCreatePassword} className="space-y-6">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="Nova Senha"
                      className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="Confirmar Senha"
                      className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <button
                  type="submit"
                  disabled={loading}
                  className={`
                    group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all shadow-lg shadow-emerald-500/30
                    ${loading ? 'opacity-80 cursor-not-allowed' : ''}
                  `}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span className="flex items-center">
                      Definir Senha e Entrar
                      <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </button>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default Login;