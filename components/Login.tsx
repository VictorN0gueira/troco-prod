import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowRight, Lock, Mail, ArrowLeft, CheckCircle2, AlertTriangle,
  UserPlus, ShieldCheck, KeyRound, Sparkles, HelpCircle, ExternalLink,
  Eye, EyeOff, TrendingUp, CreditCard, PieChart, Bell
} from 'lucide-react';
import { UserProfile } from '../types';
import { supabase } from '../supabaseClient';
import { LOGO_URL } from '../constants';

interface LoginProps {
  onLogin: (user: UserProfile) => void;
}

type ViewMode = 'login' | 'first_access_check' | 'first_access_create' | 'forgot_password';

// ─── Password strength helper ─────────────────────────────────────────────────

const getPasswordStrength = (pwd: string): { score: number; label: string; color: string } => {
  let score = 0;
  if (pwd.length >= 6) score++;
  if (pwd.length >= 10) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^a-zA-Z0-9]/.test(pwd)) score++;
  const levels = [
    { label: '', color: '' },
    { label: 'Fraca', color: 'bg-rose-500' },
    { label: 'Razoável', color: 'bg-amber-500' },
    { label: 'Boa', color: 'bg-yellow-400' },
    { label: 'Forte', color: 'bg-emerald-500' },
  ];
  return { score, ...levels[score] };
};

// ─── Floating Label Input ─────────────────────────────────────────────────────

interface FloatingInputProps {
  id: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  rightSlot?: React.ReactNode;
}

const FloatingInput: React.FC<FloatingInputProps> = ({
  id, type = 'text', value, onChange, label, required, minLength, autoComplete, rightSlot
}) => {
  const [focused, setFocused] = useState(false);
  const isFloated = focused || value.length > 0;

  return (
    <div className="relative">
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        placeholder=""
        className={`
          peer w-full px-4 pt-6 pb-2 pr-${rightSlot ? '12' : '4'}
          bg-white dark:bg-slate-800/80
          border-2 rounded-2xl
          text-slate-900 dark:text-white text-sm
          outline-none transition-all duration-200
          ${focused
            ? 'border-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]'
            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
          }
        `}
      />
      <label
        htmlFor={id}
        className={`
          absolute left-4 pointer-events-none font-medium transition-all duration-200
          ${isFloated
            ? 'top-2 text-[10px] tracking-wide uppercase text-emerald-500'
            : 'top-1/2 -translate-y-1/2 text-sm text-slate-400'
          }
        `}
      >
        {label}
      </label>
      {rightSlot && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">{rightSlot}</div>
      )}
    </div>
  );
};

// ─── Password Input with toggle ───────────────────────────────────────────────

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
  required?: boolean;
  minLength?: number;
}

const PasswordInput: React.FC<PasswordInputProps> = ({
  id, value, onChange, label = 'Senha', required, minLength
}) => {
  const [show, setShow] = useState(false);
  return (
    <FloatingInput
      id={id}
      type={show ? 'text' : 'password'}
      value={value}
      onChange={onChange}
      label={label}
      required={required}
      minLength={minLength}
      autoComplete={id.includes('confirm') ? 'new-password' : 'current-password'}
      rightSlot={
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="text-slate-400 hover:text-slateald-600 dark:hover:text-slate-300 transition-colors p-1"
          tabIndex={-1}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      }
    />
  );
};

// ─── Feature Card (left panel) ────────────────────────────────────────────────

const FeatureCard = ({
  icon: Icon, title, desc, color, delay
}: { icon: any; title: string; desc: string; color: string; delay: string }) => (
  <div
    className="flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 hover:bg-white/10 transition-all"
    style={{ animationDelay: delay }}
  >
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon className="w-4 h-4 text-white" />
    </div>
    <div>
      <p className="text-white text-sm font-semibold leading-tight">{title}</p>
      <p className="text-slate-400 text-xs leading-tight mt-0.5">{desc}</p>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

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

  // Persisted errors (e.g. from forced logout due to subscription)
  useEffect(() => {
    const persistedError = sessionStorage.getItem('troco_subscription_error');
    if (persistedError) {
      setError('SUBSCRIPTION_ERROR');
      sessionStorage.removeItem('troco_subscription_error');
    }
  }, []);

  const switchMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    setError(null);
    setSuccessMsg(null);
    setShowForgotSuccess(false);
    setPassword('');
    setConfirmPassword('');
    if (mode === 'login') setEmail('');
  }, []);

  // --- LOGIC: Regular Login ---
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user?.email) {
        const { data: profile } = await supabase
          .from('usuarios').select('tem_plano').eq('email', data.user.email).single();
        if (profile && profile.tem_plano === false) {
          sessionStorage.setItem('troco_subscription_error', 'true');
          await supabase.auth.signOut();
          throw new Error('SUBSCRIPTION_ERROR');
        }
      }
    } catch (err: any) {
      if (err.message === 'SUBSCRIPTION_ERROR') {
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
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setShowForgotSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIC: First Access (Step 1) ---
  const handleFirstAccessCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('usuarios').select('*').eq('email', email).single();
      if (error || !data) {
        setError('Email não encontrado na base de clientes. Verifique se digitou o email da compra corretamente.');
        setLoading(false);
        return;
      }
      setDbUser(data);
      setViewMode('first_access_create');
      setLoading(false);
    } catch {
      setError('Erro ao verificar email. Tente novamente.');
      setLoading(false);
    }
  };

  // --- LOGIC: First Access (Step 2) ---
  const handleCreatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) { setError('A senha deve ter no mínimo 6 caracteres.'); return; }
    if (password !== confirmPassword) { setError('As senhas não coincidem.'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: dbUser?.nome || email.split('@')[0] }
        }
      });
      if (error) {
        if (error.message.includes('registered') || error.status === 400) {
          setError('Este email já possui cadastro. Por favor, faça login.');
        } else {
          throw error;
        }
        setLoading(false);
        return;
      }
      setSuccessMsg('Cadastro realizado! Enviamos um email de confirmação. Por favor, verifique sua caixa de entrada e clique no link para ativar sua conta.');
      setViewMode('login');
      setPassword('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength(password);

  // ── Primary button shared style
  const primaryBtn = (disabled: boolean) => `
    w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl
    font-bold text-sm text-white
    bg-gradient-to-r from-emerald-500 to-teal-500
    hover:from-emerald-600 hover:to-teal-600
    shadow-lg shadow-emerald-500/30
    active:scale-[.98] transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2
    ${disabled ? 'opacity-70 cursor-not-allowed' : ''}
  `;

  const secondaryBtn = `
    w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl
    font-bold text-sm text-slate-700 dark:text-slate-200
    bg-slate-100 dark:bg-slate-800
    hover:bg-slate-200 dark:hover:bg-slate-700
    active:scale-[.98] transition-all duration-200
    border border-slate-200 dark:border-slate-700
  `;

  const Spinner = () => (
    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
  );

  return (
    <div className="min-h-screen flex w-full">

      {/* ────────────────────────────────────────────────────────────────
          LEFT PANEL — Brand / Visual
      ──────────────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex w-[45%] flex-col items-center justify-center relative overflow-hidden bg-slate-950">

        {/* Animated gradient orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/20 blur-[120px] animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-teal-400/15 blur-[120px] animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
        <div className="absolute top-[40%] right-[5%] w-[250px] h-[250px] rounded-full bg-cyan-500/10 blur-[80px] animate-pulse" style={{ animationDuration: '5s', animationDelay: '2s' }} />

        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center px-12 max-w-md w-full gap-8">

          {/* Logo */}
          <img
            src={LOGO_URL}
            alt="Trocô"
            className="h-28 w-auto drop-shadow-2xl animate-float"
          />

          {/* Headline */}
          <div>
            <h1 className="text-4xl font-extrabold text-white leading-tight tracking-tight">
              Transforme suas{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                finanças
              </span>{' '}
              em liberdade.
            </h1>
            <p className="mt-3 text-slate-400 text-base leading-relaxed">
              Controle total sobre seu patrimônio com uma interface intuitiva, segura e poderosa.
            </p>
          </div>

          {/* Feature cards */}
          <div className="w-full flex flex-col gap-2.5 animate-fade-in-up">
            <FeatureCard icon={TrendingUp} title="Investimentos" desc="Preços atualizados em tempo real" color="bg-emerald-500" delay="0ms" />
            <FeatureCard icon={CreditCard} title="Cartões de Crédito" desc="Faturas e limites sob controle" color="bg-violet-500" delay="60ms" />
            <FeatureCard icon={PieChart} title="Relatórios Visuais" desc="Análise completa dos seus gastos" color="bg-sky-500" delay="120ms" />
            <FeatureCard icon={Bell} title="Lembretes" desc="Nunca mais esqueça um vencimento" color="bg-amber-500" delay="180ms" />
          </div>

          {/* Security badge */}
          <div className="flex items-center gap-2 text-emerald-400/70 text-xs bg-emerald-500/5 border border-emerald-500/20 px-4 py-2.5 rounded-full">
            <ShieldCheck className="w-4 h-4" />
            <span>Ambiente criptografado e seguro</span>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────
          RIGHT PANEL — Form
      ──────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-slate-50 dark:bg-slate-900 relative overflow-hidden">

        {/* Mobile background orb */}
        <div className="lg:hidden absolute top-0 right-0 w-64 h-64 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />

        <div className="w-full max-w-[400px] animate-fade-in-up">

          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <img src={LOGO_URL} alt="Trocô" className="h-16 w-auto object-contain animate-float" />
          </div>

          {/* ── SUBSCRIPTION ERROR ── */}
          {error === 'SUBSCRIPTION_ERROR' && (
            <div className="mb-6 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl p-6 text-center">
              <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/40 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-6 h-6 text-rose-500" />
              </div>
              <h3 className="text-base font-bold text-rose-800 dark:text-rose-200 mb-1">Assinatura Pendente</h3>
              <p className="text-sm text-rose-600 dark:text-rose-300 mb-4 leading-relaxed">
                Identificamos uma pendência no seu plano. Regularize para continuar acessando.
              </p>
              <button
                onClick={() => window.open('https://pay.kirvano.com/5e032963-787d-49de-b407-c3d1c4724c9d', '_blank')}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-colors text-sm"
              >
                Regularizar Agora
              </button>
              <button onClick={() => setError(null)} className="mt-3 text-xs text-rose-400 hover:text-rose-600 underline">
                Tentar outro login
              </button>
            </div>
          )}

          {/* ── SUCCESS MESSAGE ── */}
          {successMsg && (
            <div className="mb-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">Sucesso!</p>
                <p className="text-sm text-emerald-700 dark:text-emerald-300 leading-relaxed mt-0.5">{successMsg}</p>
              </div>
            </div>
          )}

          {/* ── STANDARD ERROR ── */}
          {error && error !== 'SUBSCRIPTION_ERROR' && (
            <div className="mb-5 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 flex items-center gap-3 text-sm text-rose-600 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* ══════════════════════════════ VIEW: LOGIN ══════════════════════════════ */}
          {viewMode === 'login' && error !== 'SUBSCRIPTION_ERROR' && (
            <div className="animate-fade-in-up">
              <div className="mb-8">
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Bem-vindo de volta 👋</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Entre na sua conta para acessar o dashboard.</p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <FloatingInput
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  label="Email"
                  required
                  autoComplete="email"
                />
                <PasswordInput
                  id="login-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 accent-emerald-500"
                    />
                    Lembrar de mim
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot_password')}
                    className="text-sm font-medium text-emerald-600 hover:text-emerald-500 hover:underline transition-colors"
                  >
                    Esqueceu a senha?
                  </button>
                </div>

                <button type="submit" disabled={loading} className={primaryBtn(loading)}>
                  {loading ? <Spinner /> : (<>Entrar <ArrowRight className="w-4 h-4" /></>)}
                </button>
              </form>

              {/* Secondary actions */}
              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <p className="text-xs text-slate-400 text-center">Comprou agora e ainda não tem senha?</p>
                <button onClick={() => switchMode('first_access_check')} className={secondaryBtn}>
                  <UserPlus className="w-4 h-4" /> Acessar pela primeira vez
                </button>
                <a
                  href="https://pay.kirvano.com/5e032963-787d-49de-b407-c3d1c4724c9d"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-emerald-700 dark:text-emerald-400 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-100 dark:border-emerald-800 hover:shadow-md transition-all active:scale-[.98]"
                >
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  Assinar Trocô por apenas R$ 9,90
                  <ExternalLink className="w-3 h-3 opacity-50" />
                </a>
              </div>

              {/* Mobile security badge */}
              <div className="lg:hidden mt-6 flex justify-center">
                <span className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Dados protegidos e criptografados
                </span>
              </div>
            </div>
          )}

          {/* ══════════════════════════════ VIEW: FORGOT PASSWORD ══════════════════════════════ */}
          {viewMode === 'forgot_password' && (
            <div className="animate-fade-in-up">
              <button onClick={() => switchMode('login')} className="mb-6 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" /> Voltar para Login
              </button>

              {showForgotSuccess ? (
                <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl p-8 text-center shadow-sm">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Email Enviado!</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">
                    Se <strong>{email}</strong> estiver cadastrado, você receberá o link de redefinição em instantes.
                    Verifique também sua caixa de <strong>Spam</strong>.
                  </p>
                  <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 rounded-2xl p-4 text-left mb-5">
                    <div className="flex items-start gap-3">
                      <HelpCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-amber-800 dark:text-amber-200 text-sm">Não recebeu?</p>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">
                          Se nunca criou uma senha, use a opção &quot;Primeiro Acesso&quot; para ativar sua conta.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => switchMode('first_access_check')} className={secondaryBtn}>
                      Tentar &quot;Primeiro Acesso&quot;
                    </button>
                    <button
                      onClick={() => { setShowForgotSuccess(false); setEmail(''); }}
                      className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 py-2"
                    >
                      Tentar outro email
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-8">
                    <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Recuperar Senha 🔑</h2>
                    <p className="mt-1 text-sm text-slate-500">Informe o email da sua conta para receber o link.</p>
                  </div>
                  <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                    <FloatingInput
                      id="forgot-email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      label="Email da conta"
                      required
                      autoComplete="email"
                    />
                    <button type="submit" disabled={loading} className={primaryBtn(loading)}>
                      {loading ? <Spinner /> : (<>Enviar Link de Recuperação <KeyRound className="w-4 h-4" /></>)}
                    </button>
                  </form>
                </>
              )}
            </div>
          )}

          {/* ══════════════════════════════ VIEW: FIRST ACCESS — CHECK EMAIL ══════════════════════════════ */}
          {viewMode === 'first_access_check' && (
            <div className="animate-fade-in-up">
              <button onClick={() => switchMode('login')} className="mb-6 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" /> Voltar para Login
              </button>
              <div className="mb-8">
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Primeiro Acesso 🚀</h2>
                <p className="mt-1 text-sm text-slate-500">Insira o email utilizado na compra para localizarmos seu cadastro.</p>
              </div>
              <form onSubmit={handleFirstAccessCheck} className="space-y-4">
                <FloatingInput
                  id="first-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  label="Email da compra"
                  required
                  autoComplete="email"
                />
                <button type="submit" disabled={loading} className={primaryBtn(loading)}>
                  {loading ? <Spinner /> : (<>Continuar <ArrowRight className="w-4 h-4" /></>)}
                </button>
              </form>
            </div>
          )}

          {/* ══════════════════════════════ VIEW: FIRST ACCESS — CREATE PASSWORD ══════════════════════════════ */}
          {viewMode === 'first_access_create' && (
            <div className="animate-fade-in-up">
              <button onClick={() => switchMode('first_access_check')} className="mb-6 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" /> Voltar
              </button>
              <div className="mb-8">
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Criar Senha 🔐</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Olá, <span className="text-emerald-500 font-semibold">{dbUser?.nome || 'Usuário'}</span>! Defina uma senha segura para acessar sua conta.
                </p>
              </div>
              <form onSubmit={handleCreatePassword} className="space-y-4">
                <div className="space-y-1">
                  <PasswordInput
                    id="new-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    label="Nova Senha"
                    required
                    minLength={6}
                  />
                  {/* Strength Bar */}
                  {password.length > 0 && (
                    <div className="pt-1 px-1">
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4].map(i => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength.score ? strength.color : 'bg-slate-200 dark:bg-slate-700'
                              }`}
                          />
                        ))}
                      </div>
                      {strength.label && (
                        <p className="text-xs text-slate-400">
                          Força: <span className="font-semibold">{strength.label}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <PasswordInput
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  label="Confirmar Senha"
                  required
                  minLength={6}
                />
                {/* Match indicator */}
                {confirmPassword.length > 0 && (
                  <p className={`text-xs px-1 flex items-center gap-1 ${password === confirmPassword ? 'text-emerald-500' : 'text-rose-500'
                    }`}>
                    {password === confirmPassword
                      ? <><CheckCircle2 className="w-3.5 h-3.5" /> As senhas coincidem</>
                      : <><AlertTriangle className="w-3.5 h-3.5" /> As senhas não coincidem</>
                    }
                  </p>
                )}
                <button type="submit" disabled={loading} className={primaryBtn(loading)}>
                  {loading ? <Spinner /> : (<>Definir Senha e Entrar <ArrowRight className="w-4 h-4" /></>)}
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Login;