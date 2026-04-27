import React, { useState, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
// ... imports
import {
  LayoutDashboard,
  ArrowRightLeft,
  PieChart,
  Settings,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  BellRing,
  Eye,
  EyeOff,
  CalendarDays,
  CreditCard,
  TrendingUp,
  Newspaper,
  Target,
  Repeat,
  Wallet,
  Building2,
  Trophy
} from 'lucide-react';
// ... other imports
import { UserProfile, GamificationProfile, NavItem } from '../types';
import LevelBadge from './gamification/LevelBadge';
import StreakIndicator from './gamification/StreakIndicator';
import CosmeticAvatar from './gamification/CosmeticAvatar';
import ErrorBoundary from './ErrorBoundary';
import { LOGO_URL } from '../constants';
import { FreePlanBadge } from './FreePlanBadge';

interface LayoutProps {
  children: React.ReactNode;
  darkMode: boolean;
  toggleDarkMode: () => void;
  onLogout: () => void;
  user: UserProfile;
  privacyMode?: boolean;
  togglePrivacyMode?: () => void;
  privacyPlusMode?: boolean;
  togglePrivacyPlusMode?: () => void;
  gamificationProfile?: GamificationProfile;
}

const NAV_ITEMS: NavItem[] = [
  // Visão Geral
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, category: 'Visão Geral' },
  { label: 'Conquistas', path: '/gamification', icon: Trophy, category: 'Visão Geral' },
  { label: 'Insights', path: '/insights', icon: Newspaper, category: 'Visão Geral' },
  { label: 'Relatórios', path: '/reports', icon: PieChart, category: 'Visão Geral' },

  // Gestão
  { label: 'Contas', path: '/accounts', icon: Building2, category: 'Gestão' },
  { label: 'Transações', path: '/transactions', icon: ArrowRightLeft, category: 'Gestão' },
  { label: 'Cartões', path: '/cards', icon: CreditCard, category: 'Gestão' },
  { label: 'Investimentos', path: '/investments', icon: TrendingUp, category: 'Gestão' },

  // Planejamento
  { label: 'Metas', path: '/goals', icon: Target, category: 'Planejamento' },
  { label: 'Orçamentos', path: '/budgets', icon: Wallet, category: 'Planejamento' },
  { label: 'Assinaturas', path: '/subscriptions', icon: Repeat, category: 'Planejamento' },
  { label: 'Lembretes', path: '/reminders', icon: BellRing, category: 'Planejamento' },
  { label: 'Calendário', path: '/calendar', icon: CalendarDays, category: 'Planejamento' },

  // Sistema
  { label: 'Configurações', path: '/settings', icon: Settings, category: 'Sistema' },
];

const Layout: React.FC<LayoutProps> = ({
  children,
  darkMode,
  toggleDarkMode,
  onLogout,
  user,
  privacyMode = false,
  togglePrivacyMode,
  privacyPlusMode = false,
  togglePrivacyPlusMode,
  gamificationProfile
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = () => {
    const current = NAV_ITEMS.find(item => item.path === location.pathname);
    return current ? current.label : 'Trocô';
  };

  // Group NAV_ITEMS by category
  const groupedNavItems = NAV_ITEMS.reduce((acc, item) => {
    const category = item.category || 'Outros';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  const categories = ['Visão Geral', 'Gestão', 'Planejamento', 'Sistema'];

  return (
    <div className={`min-h-screen flex ${darkMode ? 'dark' : ''}`}>
      {/* Mobile Sidebar Overlay (Backdrop) */}
      <div
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar - Mobile: Slide-in Drawer / Desktop: Static */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1)
        bg-white dark:bg-slate-850 border-r border-slate-200 dark:border-slate-800
        flex flex-col shadow-2xl lg:shadow-none
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-20 flex items-center px-6 border-b border-slate-100 dark:border-slate-800 justify-between lg:justify-start shrink-0">
          <div className="flex items-center gap-3">
            <img
              src={LOGO_URL}
              alt="Trocô Logo"
              className="h-10 w-auto object-contain transition-transform hover:scale-110 drop-shadow-md"
            />
            <span className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white relative top-1">
              Trocô
            </span>
          </div>
          {/* Close button inside sidebar for mobile convenience */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto custom-scrollbar">
          {categories.map((category) => (
            <div key={category} className="space-y-1">
              <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-2">
                {category}
              </h3>
              <div className="space-y-1">
                {groupedNavItems[category]?.map((item) => {
                  const Icon = item.icon;

                  if (item.disabled) {
                    return (
                      <div
                        key={item.path}
                        className="flex items-center px-4 py-2.5 rounded-xl text-slate-400 dark:text-slate-600 cursor-not-allowed group relative"
                      >
                        <Icon className="w-5 h-5 mr-3 opacity-50" />
                        <span className="font-medium text-sm opacity-50">{item.label}</span>
                        <span className="absolute right-4 text-[8px] uppercase font-black tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">
                          Em Breve
                        </span>
                      </div>
                    );
                  }

                  return (
                    <NavLink
                      to={item.path}
                      onClick={() => setIsSidebarOpen(false)}
                      className={({ isActive }) => `
                        flex items-center px-4 py-2.5 rounded-xl transition-all duration-300 group
                        ${isActive
                          ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30 translate-x-1'
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-primary-500 hover:translate-x-1'}
                      `}
                    >
                      <Icon className="w-5 h-5 mr-3 transition-transform group-hover:scale-110" />
                      <span className="font-semibold text-[15px]">{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-4 shrink-0 bg-white/50 dark:bg-slate-850/50 backdrop-blur-sm">
          {/* Selo de Plano Gratuito */}
          {user.id !== 0 && user.plano === 'FREE' && (
            <FreePlanBadge
              variant="full"
              onClick={() => window.open('https://pay.kirvano.com/5e032963-787d-49de-b407-c3d1c4724c9d', '_blank')}
            />
          )}

          {/* WhatsApp AI Agent Card - Premium Style */}
          <a
            href="https://wa.me/558184451243?text=Ol%C3%A1%20Troc%C3%B4%2C%20gostaria%20de%20saber%20mais%20sobre..."
            target="_blank"
            rel="noopener noreferrer"
            className="block group relative p-4 rounded-2xl transition-all duration-300
              bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/5
              hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-0.5
              border border-emerald-100 dark:border-emerald-500/20 overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <svg className="w-12 h-12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <div className="relative z-10 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Suporte IA</span>
                <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-black">24H</span>
              </div>
              <p className="text-xs text-emerald-600/80 dark:text-emerald-400/60 font-medium">Fale com nosso agente no WhatsApp</p>
            </div>
          </a>

          <button
            onClick={onLogout}
            className="flex items-center w-full px-4 py-3 text-slate-500 hover:text-danger-500 transition-all rounded-xl hover:bg-danger-50 dark:hover:bg-danger-500/10 font-semibold text-sm group"
          >
            <LogOut className="w-5 h-5 mr-3 transition-transform group-hover:-translate-x-1" />
            <span>Sair da conta</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 relative overflow-hidden w-full">

        {/* Glassmorphic Header */}
        <header className="sticky top-0 z-30 h-16 lg:h-20 px-4 lg:px-10 flex items-center justify-between
          backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/50 dark:border-slate-800/50 transition-all">

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full active:scale-95 transition-transform"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg lg:text-2xl font-bold text-slate-800 dark:text-white truncate max-w-[150px] sm:max-w-none">
              {getPageTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Privacy Toggle: Normal → Blur → Privacy+ */}
            {togglePrivacyMode && (
              <div className="relative group">
                <button
                  onClick={togglePrivacyMode}
                  onContextMenu={(e) => { e.preventDefault(); togglePrivacyPlusMode?.(); }}
                  className={`p-2 sm:p-2.5 rounded-full transition-colors relative w-10 h-10 flex items-center justify-center overflow-hidden
                    ${privacyPlusMode
                      ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400'
                      : privacyMode
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  title={privacyPlusMode ? 'Privacy+ (apenas %): clique direito para sair' : privacyMode ? 'Blur ativo – clique para normalizar; clique direito para Privacy+' : 'Modo privacidade – oculta valores'}
                >
                  <div className="relative w-5 h-5">
                    <Eye className={`absolute inset-0 w-5 h-5 transition-all duration-300 ease-in-out origin-center ${!privacyMode && !privacyPlusMode ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0'}`} />
                    <EyeOff className={`absolute inset-0 w-5 h-5 transition-all duration-300 ease-in-out origin-center ${privacyMode && !privacyPlusMode ? 'scale-y-100 opacity-100 delay-75' : 'scale-y-0 opacity-0'}`} />
                    {privacyPlusMode && <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black">%</span>}
                  </div>
                </button>
                {/* Tooltip */}
                <div className="absolute top-full right-0 mt-1.5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50">
                  <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
                    {privacyPlusMode ? 'Privacy+ (%)' : privacyMode ? 'Blur ativo' : 'Ocultar valores'}
                    <br />
                    <span className="opacity-60 font-normal">Clique direito → Privacy+</span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={toggleDarkMode}
              className="p-2 sm:p-2.5 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-3 sm:gap-6 pl-2 sm:pl-6 border-l border-slate-200 dark:border-slate-700">
              {/* Gamification */}
              {gamificationProfile && gamificationProfile.user_id !== 0 && (
                <div className="flex items-center gap-1 sm:gap-2 mr-1 sm:mr-2">
                  <StreakIndicator streak={gamificationProfile.current_streak || 0} compact />
                  <div className="hidden sm:block">
                    <LevelBadge xp={gamificationProfile.xp || 0} compact />
                  </div>
                </div>
              )}

              {/* Selo Free compacto no header */}
              {user.id !== 0 && user.plano === 'FREE' && (
                <FreePlanBadge
                  variant="compact"
                  onClick={() => window.open('https://pay.kirvano.com/5e032963-787d-49de-b407-c3d1c4724c9d', '_blank')}
                />
              )}
              <div className="text-right hidden sm:block pr-2">
                <p className="text-sm font-semibold text-slate-800 dark:text-white max-w-[120px] lg:max-w-[200px] truncate">
                  {user.nome}
                </p>
              </div>

              <div className="cursor-pointer hover:scale-105 transition-transform">
                <ErrorBoundary silent>
                  <CosmeticAvatar 
                    src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nome || 'Visitante')}&background=10B981&color=fff&size=128&font-size=0.4`}
                    alt={user.nome || "Avatar"}
                    frame={gamificationProfile?.avatar_frame || 'none'}
                    size="sm"
                  />
                </ErrorBoundary>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content - Adjusted Padding for Mobile */}
        <div className="flex-1 p-4 md:p-6 lg:p-10 overflow-y-auto overflow-x-hidden">
          <div className="max-w-7xl mx-auto animate-fade-in pb-20 lg:pb-0">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;