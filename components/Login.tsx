import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowRight, Lock, Mail, ArrowLeft, CheckCircle2, AlertTriangle,
  UserPlus, ShieldCheck, KeyRound, Sparkles, HelpCircle, ExternalLink,
  Eye, EyeOff, TrendingUp, CreditCard, PieChart, Bell,
  Target, Wallet, BarChart3, Users
} from 'lucide-react';
import { UserProfile } from '../types';
import { supabase } from '../supabaseClient';
import { LOGO_URL } from '../constants';

interface LoginProps {
  onLogin: (user: UserProfile) => void;
}

type ViewMode = 'login' | 'forgot_password' | 'register' | 'verify_email';

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
  icon?: React.ReactNode;
  rightSlot?: React.ReactNode;
}

const FloatingInput: React.FC<FloatingInputProps> = ({
  id, type = 'text', value, onChange, label, required, minLength, autoComplete, icon, rightSlot
}) => {
  const [focused, setFocused] = useState(false);
  const isFloated = focused || value.length > 0;

  return (
    <div className="relative group">
      {/* Left icon */}
      {icon && (
        <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 z-10 ${focused ? 'text-emerald-500' : 'text-slate-400'}`}>
          {icon}
        </div>
      )}
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
          peer w-full ${icon ? 'pl-11' : 'pl-4'} pt-6 pb-2 ${rightSlot ? 'pr-12' : 'pr-4'}
          bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm
          border-2 rounded-2xl
          text-slate-900 dark:text-white text-sm
          outline-none transition-all duration-200
          ${focused
            ? 'border-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.1)]'
            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
          }
        `}
      />
      <label
        htmlFor={id}
        className={`
          absolute pointer-events-none font-medium transition-all duration-200
          ${icon ? 'left-11' : 'left-4'}
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
      icon={<Lock className="w-4 h-4" />}
      rightSlot={
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1"
          tabIndex={-1}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      }
    />
  );
};

// ─── Dashboard Mockup (left panel hero) ───────────────────────────────────────

const DashboardMockup = () => (
  <div
    className="w-full max-w-[340px] rounded-3xl overflow-hidden shadow-2xl border border-white/10"
    style={{ background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(20px)' }}
  >
    {/* Header bar */}
    <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="text-white/60 text-xs font-medium">Dashboard</span>
      </div>
      <div className="flex gap-1.5">
        <div className="w-2 h-2 rounded-full bg-white/10" />
        <div className="w-2 h-2 rounded-full bg-white/10" />
        <div className="w-2 h-2 rounded-full bg-white/10" />
      </div>
    </div>

    {/* Balance */}
    <div className="px-5 py-5">
      <p className="text-white/40 text-[10px] uppercase tracking-widest mb-1">Saldo Total</p>
      <p className="text-white text-2xl font-bold tracking-tight">R$ 28.432<span className="text-white/30">,00</span></p>

      {/* Mini bar chart */}
      <div className="flex items-end gap-1 mt-4 h-12">
        {[35, 55, 45, 70, 60, 80, 65, 90, 75, 85, 70, 95].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm transition-all"
            style={{
              height: `${h}%`,
              background: i === 11
                ? 'linear-gradient(to top, #10b981, #34d399)'
                : `rgba(16, 185, 129, ${0.15 + i * 0.04})`
            }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-white/20 text-[9px]">Mar</span>
        <span className="text-emerald-400 text-[9px] font-medium">Fev ↑ 12%</span>
      </div>
    </div>

    {/* Cards row */}
    <div className="px-5 pb-4 grid grid-cols-2 gap-2">
      <div className="bg-white/5 rounded-xl p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <TrendingUp className="w-3 h-3 text-emerald-400" />
          <span className="text-white/40 text-[9px] uppercase tracking-wider">Entradas</span>
        </div>
        <p className="text-white text-sm font-bold">R$ 8.200</p>
        <p className="text-emerald-400 text-[9px] mt-0.5">↑ 4.2%</p>
      </div>
      <div className="bg-white/5 rounded-xl p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <CreditCard className="w-3 h-3 text-rose-400" />
          <span className="text-white/40 text-[9px] uppercase tracking-wider">Saídas</span>
        </div>
        <p className="text-white text-sm font-bold">R$ 3.450</p>
        <p className="text-rose-400 text-[9px] mt-0.5">↓ 1.8%</p>
      </div>
    </div>

    {/* Recent transactions */}
    <div className="px-5 pb-5 space-y-2">
      {[
        { label: 'Salário', cat: '💼', amt: '+8.200', color: 'text-emerald-400' },
        { label: 'Aluguel', cat: '🏠', amt: '-1.800', color: 'text-rose-400' },
        { label: 'Investimento', cat: '📈', amt: '+420', color: 'text-emerald-400' },
      ].map((t, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-[10px]">{t.cat}</div>
            <span className="text-white/50 text-[10px]">{t.label}</span>
          </div>
          <span className={`text-[10px] font-semibold ${t.color}`}>{t.amt}</span>
        </div>
      ))}
    </div>
  </div>
);

// ─── Stat badge ───────────────────────────────────────────────────────────────

const StatBadge = ({ icon: Icon, value, label }: { icon: any; value: string; label: string }) => (
  <div className="flex flex-col items-center gap-0.5">
    <div className="flex items-center gap-1">
      <Icon className="w-3.5 h-3.5 text-emerald-400" />
      <span className="text-white font-bold text-base">{value}</span>
    </div>
    <span className="text-slate-500 text-[10px] uppercase tracking-wide">{label}</span>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);

  const queryParams = new URLSearchParams(window.location.search);
  const initialMode = queryParams.get('mode') === 'register' ? 'register' : 'login';

  const [viewMode, setViewMode] = useState<ViewMode>(initialMode);
  const [shake, setShake] = useState(false);

  // Form States
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Feedback
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showForgotSuccess, setShowForgotSuccess] = useState(false);

  // Trigger shake + set error
  const triggerError = (msg: string) => {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const switchMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    setError(null);
    setSuccessMsg(null);
    setShowForgotSuccess(false);
    setFullName('');
    setPassword('');
    setConfirmPassword('');
    if (mode === 'login' || mode === 'register') setEmail('');
  }, []);

  // --- LOGIC: Regular Login ---
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: { captchaToken: undefined }
      });

      if (!rememberMe) {
        sessionStorage.setItem('troco_session_only', 'true');
      } else {
        sessionStorage.removeItem('troco_session_only');
      }

      if (error) throw error;

    } catch (err: any) {
      if (err.status === 429) {
        triggerError('Muitas tentativas. Aguarde um momento e tente novamente.');
      } else {
        triggerError(err.message === 'Invalid login credentials'
          ? 'Email ou senha incorretos.'
          : err.message);
      }
      setLoading(false);
    }
  };

  // --- LOGIC: Registration ---
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fullName) { triggerError('Por favor, informe seu nome completo.'); return; }
    if (password.length < 6) { triggerError('A senha deve ter no mínimo 6 caracteres.'); return; }
    if (password !== confirmPassword) { triggerError('As senhas não coincidem.'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName }
        }
      });
      if (error) {
        if (error.status === 429) {
          triggerError('Muitas tentativas de cadastro. Por favor, aguarde alguns minutos.');
        } else if (error.message.includes('registered') || error.message.includes('already exists')) {
          triggerError('Este email já possui cadastro. Por favor, faça login.');
        } else {
          triggerError(`Erro ao cadastrar: ${error.message}`);
        }
        setLoading(false);
        return;
      }

      setSuccessMsg('Conta criada! Confirme seu email (verifique o spam) e faça login.');
      setViewMode('verify_email');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      triggerError(err.message);
    } finally {
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
      // 1. Verificar se o usuário existe primeiro
      const { data: exists, error: rpcError } = await supabase.rpc('check_email_exists', { lookup_email: email });
      if (rpcError) throw rpcError;

      if (!exists) {
        throw new Error('Nenhuma conta encontrada com este e-mail. Verifique se digitou corretamente.');
      }

      // 2. Se existe, disparar o email
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setShowForgotSuccess(true);
    } catch (err: any) {
      if (err.status === 429) {
        triggerError('Limite de envios excedido. Tente novamente em alguns minutos.');
      } else {
        triggerError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength(password);

  const Spinner = () => (
    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
  );

  const primaryBtn = (disabled: boolean) => `
    w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl
    font-bold text-sm text-white
    bg-gradient-to-r from-emerald-500 to-teal-500
    hover:from-emerald-600 hover:to-teal-600
    shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50
    active:scale-[.98] transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2
    ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:-translate-y-0.5'}
  `;

  const secondaryBtn = `
    w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl
    font-bold text-sm text-slate-700 dark:text-slate-200
    bg-slate-100 dark:bg-slate-800
    hover:bg-slate-200 dark:hover:bg-slate-700
    active:scale-[.98] transition-all duration-200
    border border-slate-200 dark:border-slate-700
  `;

  return (
    <>
      {/* Keyframe styles */}
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-12px) rotate(1deg); }
          66% { transform: translateY(-6px) rotate(-1deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes draw-check {
          to { stroke-dashoffset: 0; }
        }
        .float-slow { animation: float-slow 6s ease-in-out infinite; }
        .fade-up { animation: fade-up 0.4s ease-out both; }
        .shake { animation: shake 0.45s ease-in-out; }
        .glow-orb-1 { animation: pulse 4s ease-in-out infinite; }
        .glow-orb-2 { animation: pulse 6s ease-in-out infinite 1s; }
        .glow-orb-3 { animation: pulse 5s ease-in-out infinite 2s; }
      `}</style>

      <div className="min-h-screen flex w-full bg-slate-950">

        {/* ────────────────────────────────────────────────────────────────
            LEFT PANEL — Brand / Visual
        ──────────────────────────────────────────────────────────────── */}
        <div className="hidden lg:flex w-[48%] flex-col items-center justify-center relative overflow-hidden"
          style={{ background: 'linear-gradient(145deg, #050d18 0%, #0a1628 50%, #071220 100%)' }}
        >
          {/* Animated gradient orbs */}
          <div className="glow-orb-1 absolute top-[-5%] left-[-5%] w-[450px] h-[450px] rounded-full bg-emerald-500/15 blur-[100px]" />
          <div className="glow-orb-2 absolute bottom-[-10%] right-[-10%] w-[380px] h-[380px] rounded-full bg-teal-400/10 blur-[100px]" />
          <div className="glow-orb-3 absolute top-[45%] right-[8%] w-[220px] h-[220px] rounded-full bg-cyan-500/8 blur-[80px]" />

          {/* Subtle dot grid */}
          <div className="absolute inset-0 opacity-[0.035]" style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)`,
            backgroundSize: '32px 32px'
          }} />

          {/* Right-edge glow line */}
          <div className="absolute right-0 top-0 bottom-0 w-px"
            style={{ background: 'linear-gradient(to bottom, transparent, rgba(16,185,129,0.25) 40%, rgba(16,185,129,0.25) 60%, transparent)' }}
          />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center text-center px-10 max-w-sm w-full gap-7">

            {/* Logo + brand name */}
            <div className="flex flex-col items-center gap-3">
              <img src={LOGO_URL} alt="Trocô" className="h-20 w-auto drop-shadow-2xl float-slow" />
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">
                  Troc<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">ô</span>
                </h1>
                <p className="text-slate-400 text-sm mt-1 leading-relaxed">
                  Controle total sobre seu<br />dinheiro, em um só lugar.
                </p>
              </div>
            </div>

            {/* Dashboard Mockup — the hero */}
            <div className="float-slow w-full" style={{ animationDelay: '1s' }}>
              <DashboardMockup />
            </div>

            {/* Stats bar */}
            <div className="w-full flex items-center justify-around bg-white/3 border border-white/5 rounded-2xl px-4 py-4">
              <StatBadge icon={Wallet} value="R$2.3M+" label="Gerenciados" />
              <div className="w-px h-8 bg-white/10" />
              <StatBadge icon={Users} value="12.4K+" label="Usuários" />
              <div className="w-px h-8 bg-white/10" />
              <StatBadge icon={BarChart3} value="4.9★" label="Avaliação" />
            </div>

            {/* Security badge */}
            <div className="flex items-center gap-2 text-emerald-400/60 text-xs bg-emerald-500/5 border border-emerald-500/10 px-4 py-2.5 rounded-full">
              <ShieldCheck className="w-4 h-4" />
              <span>Ambiente criptografado e seguro</span>
            </div>
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────────────
            RIGHT PANEL — Form
        ──────────────────────────────────────────────────────────────── */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-slate-50 dark:bg-[#0d1117] relative overflow-hidden">

          {/* Mobile background orbs */}
          <div className="lg:hidden absolute top-[-50px] right-[-50px] w-64 h-64 rounded-full bg-emerald-400/8 blur-3xl pointer-events-none z-0" />
          <div className="lg:hidden absolute bottom-[-50px] left-[-50px] w-48 h-48 rounded-full bg-teal-400/8 blur-3xl pointer-events-none z-0" />

          <div className="w-full max-w-[400px] z-10">

            {/* Mobile logo */}
            <div className="lg:hidden flex flex-col items-center mb-8 fade-up">
              <img src={LOGO_URL} alt="Trocô" className="h-14 w-auto object-contain float-slow mb-2" />
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Trocô</h2>
              <p className="text-sm text-slate-400">Controle financeiro inteligente</p>
            </div>

            {/* Desktop label */}
            <div className="hidden lg:block mb-8 fade-up">
              <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 px-3 py-1.5 rounded-full mb-4">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-700 dark:text-emerald-400 text-xs font-semibold">Plataforma ativa</span>
              </div>
            </div>

            {/* ── ERROR ALERT ── */}
            {error && (
              <div className={`mb-5 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 flex items-center gap-3 text-sm text-rose-600 dark:text-rose-300 fade-up ${shake ? 'shake' : ''}`}>
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* ══════════════════════════════ VIEW: LOGIN ══════════════════════════════ */}
            {viewMode === 'login' && (
              <div className="fade-up">
                <div className="mb-7">
                  <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    Bem-vindo de volta 👋
                  </h2>
                  <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                    Entre na sua conta para ver seu dashboard.
                  </p>
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
                    icon={<Mail className="w-4 h-4" />}
                  />
                  <PasswordInput
                    id="login-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer select-none group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={e => setRememberMe(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 rounded-full transition-colors peer-checked:bg-emerald-500" />
                        <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                      </div>
                      <span className="text-xs">Lembrar de mim</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => switchMode('forgot_password')}
                      className="text-sm font-medium text-emerald-600 hover:text-emerald-500 hover:underline transition-colors"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={primaryBtn(loading)}
                  >
                    {loading ? <Spinner /> : (<>Entrar <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>)}
                  </button>
                </form>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-100 dark:border-slate-800" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-3 text-xs text-slate-400 bg-slate-50 dark:bg-[#0d1117]">ou</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs text-slate-400 text-center">Ainda não tem conta no Trocô?</p>
                  <button onClick={() => switchMode('register')} className={secondaryBtn}>
                    <UserPlus className="w-4 h-4" /> Criar Conta Grátis
                  </button>
                  <a
                    href="https://pay.kirvano.com/5e032963-787d-49de-b407-c3d1c4724c9d"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-emerald-700 dark:text-emerald-400 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-100 dark:border-emerald-800 hover:shadow-md hover:shadow-emerald-500/10 hover:-translate-y-0.5 transition-all active:scale-[.98]"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    Assinar Super Trocô — R$ 34,90/mês
                    <ExternalLink className="w-3 h-3 opacity-50" />
                  </a>
                </div>

                {/* Mobile security */}
                <div className="lg:hidden mt-5 flex justify-center">
                  <span className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-full">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Dados protegidos e criptografados
                  </span>
                </div>
              </div>
            )}

            {/* ══════════════════════════════ VIEW: FORGOT PASSWORD ══════════════════════════════ */}
            {viewMode === 'forgot_password' && (
              <div className="fade-up">
                <button onClick={() => switchMode('login')} className="mb-6 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Voltar para Login
                </button>

                {showForgotSuccess ? (
                  <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl p-8 text-center shadow-sm">
                    {/* Animated success check */}
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8" viewBox="0 0 52 52" fill="none">
                        <circle cx="26" cy="26" r="24" stroke="#10b981" strokeWidth="2" opacity="0.3" />
                        <path d="M14 26l8 8 16-16" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                          strokeDasharray="40" strokeDashoffset="40"
                          style={{ animation: 'draw-check 0.5s 0.2s ease-out forwards' }}
                        />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Email Enviado!</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">
                      Se <strong>{email}</strong> estiver cadastrado, você receberá o link em instantes.
                      Verifique também sua caixa de <strong>Spam</strong>.
                    </p>
                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 rounded-2xl p-4 text-left mb-5">
                      <div className="flex items-start gap-3">
                        <HelpCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-amber-800 dark:text-amber-200 text-sm">Não recebeu?</p>
                          <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">
                            Se ainda não tem cadastro, clique e crie sua conta grátis.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => switchMode('register')} className={secondaryBtn}>
                        Criar Conta
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
                    <div className="mb-7">
                      <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-4">
                        <KeyRound className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Recuperar Senha</h2>
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
                        icon={<Mail className="w-4 h-4" />}
                      />
                      <button type="submit" disabled={loading} className={primaryBtn(loading)}>
                        {loading ? <Spinner /> : (<>Enviar Link de Recuperação <KeyRound className="w-4 h-4" /></>)}
                      </button>
                    </form>
                  </>
                )}
              </div>
            )}

            {/* ══════════════════════════════ VIEW: REGISTER ══════════════════════════════ */}
            {viewMode === 'register' && (
              <div className="fade-up">
                <button onClick={() => switchMode('login')} className="mb-6 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Voltar para Login
                </button>
                <div className="mb-7">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-4">
                    <UserPlus className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Criar Conta 🚀</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Cadastre-se grátis e comece agora mesmo.
                  </p>
                </div>
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <FloatingInput
                    id="reg-name"
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    label="Nome Completo"
                    required
                    autoComplete="name"
                    icon={<UserPlus className="w-4 h-4" />}
                  />
                  <FloatingInput
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    label="Email"
                    required
                    autoComplete="email"
                    icon={<Mail className="w-4 h-4" />}
                  />
                  <div className="space-y-1">
                    <PasswordInput
                      id="reg-password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      label="Senha"
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
                              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= strength.score ? strength.color : 'bg-slate-200 dark:bg-slate-700'}`}
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
                    id="reg-confirm-password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    label="Confirmar Senha"
                    required
                    minLength={6}
                  />
                  {confirmPassword.length > 0 && (
                    <p className={`text-xs px-1 flex items-center gap-1 ${password === confirmPassword ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {password === confirmPassword
                        ? <><CheckCircle2 className="w-3.5 h-3.5" /> As senhas coincidem</>
                        : <><AlertTriangle className="w-3.5 h-3.5" /> As senhas não coincidem</>
                      }
                    </p>
                  )}
                  <button type="submit" disabled={loading} className={primaryBtn(loading)}>
                    {loading ? <Spinner /> : (<>Cadastrar <UserPlus className="w-4 h-4" /></>)}
                  </button>
                </form>

                {/* Security note */}
                <p className="mt-4 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Seus dados são criptografados e protegidos
                </p>
              </div>
            )}

            {/* ══════════════════════════════ VIEW: VERIFY EMAIL ══════════════════════════════ */}
            {viewMode === 'verify_email' && (
              <div className="fade-up">
                <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl p-8 text-center shadow-sm">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" viewBox="0 0 52 52" fill="none">
                      <circle cx="26" cy="26" r="24" stroke="#10b981" strokeWidth="2" opacity="0.3" />
                      <path d="M14 26l8 8 16-16" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        strokeDasharray="40" strokeDashoffset="40"
                        style={{ animation: 'draw-check 0.5s 0.2s ease-out forwards' }}
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Verifique seu Email ✉️</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                    Enviamos um link de confirmação para{' '}
                    <strong className="text-slate-900 dark:text-white">{email}</strong>.
                    Clique no link para ativar sua conta.
                    <br /><br />
                    <span className="text-amber-600 dark:text-amber-400 font-medium">Não esqueça de verificar sua caixa de Spam.</span>
                  </p>
                  <div className="flex flex-col gap-3">
                    <button onClick={() => switchMode('login')} className={primaryBtn(false)}>
                      Ir para o Login <ArrowRight className="w-4 h-4" />
                    </button>
                    <button onClick={() => switchMode('register')} className="mt-2 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
                      Usar outro email
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
};

export default Login;