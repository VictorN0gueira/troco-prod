import React, { useState } from 'react';
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
  TrendingUp // Importado para Investimentos
} from 'lucide-react';
// ... other imports
import { NavItem, UserProfile } from '../types';
import { LOGO_URL } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  darkMode: boolean;
  toggleDarkMode: () => void;
  onLogout: () => void;
  user: UserProfile;
  privacyMode?: boolean;
  togglePrivacyMode?: () => void;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Transações', path: '/transactions', icon: ArrowRightLeft },
  { label: 'Lembretes', path: '/reminders', icon: BellRing },
  { label: 'Calendário', path: '/calendar', icon: CalendarDays },
  { label: 'Cartões', path: '/cards', icon: CreditCard },
  { label: 'Investimentos', path: '/investments', icon: TrendingUp },
  { label: 'Relatórios', path: '/reports', icon: PieChart },
  { label: 'Configurações', path: '/settings', icon: Settings },
];

const Layout: React.FC<LayoutProps> = ({
  children,
  darkMode,
  toggleDarkMode,
  onLogout,
  user,
  privacyMode = false,
  togglePrivacyMode
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = () => {
    const current = NAV_ITEMS.find(item => item.path === location.pathname);
    return current ? current.label : 'Trocô';
  };

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
        <div className="h-20 flex items-center px-6 border-b border-slate-100 dark:border-slate-800 justify-between lg:justify-start">
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

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;

            if (item.disabled) {
              return (
                <div
                  key={item.path}
                  className="flex items-center px-4 py-3.5 rounded-xl text-slate-400 dark:text-slate-600 cursor-not-allowed group relative"
                >
                  <Icon className="w-5 h-5 mr-3 opacity-50" />
                  <span className="font-medium text-base opacity-50">{item.label}</span>
                  <span className="absolute right-4 text-[10px] uppercase font-bold tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded-full">
                    Em Breve
                  </span>
                </div>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={({ isActive }) => `
                  flex items-center px-4 py-3.5 rounded-xl transition-all duration-300 group
                  ${isActive
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30 translate-x-1'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary-500 hover:translate-x-1'}
                `}
              >
                <Icon className="w-5 h-5 mr-3" />
                <span className="font-medium text-base">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onLogout}
            className="flex items-center w-full px-4 py-3.5 text-slate-500 hover:text-danger-500 transition-colors rounded-xl hover:bg-danger-50 dark:hover:bg-danger-500/10"
          >
            <LogOut className="w-5 h-5 mr-3" />
            <span className="font-medium">Sair</span>
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
            {/* Privacy Toggle with Eye Animation */}
            {togglePrivacyMode && (
              <button
                onClick={togglePrivacyMode}
                className="p-2 sm:p-2.5 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative w-10 h-10 flex items-center justify-center overflow-hidden"
                title={privacyMode ? "Mostrar valores" : "Ocultar valores"}
              >
                <div className="relative w-5 h-5">
                  {/* Olho Aberto: Escala Y vai a 0 quando ativa privacy (fecha pálpebra) */}
                  <Eye
                    className={`absolute inset-0 w-5 h-5 transition-all duration-300 ease-in-out origin-center ${privacyMode ? 'scale-y-0 opacity-0' : 'scale-y-100 opacity-100'
                      }`}
                  />
                  {/* Olho Fechado: Escala Y sobe de 0 a 1 quando ativa privacy */}
                  <EyeOff
                    className={`absolute inset-0 w-5 h-5 transition-all duration-300 ease-in-out origin-center ${privacyMode ? 'scale-y-100 opacity-100 delay-75' : 'scale-y-0 opacity-0'
                      }`}
                  />
                </div>
              </button>
            )}

            <button
              onClick={toggleDarkMode}
              className="p-2 sm:p-2.5 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-3 pl-2 sm:pl-4 border-l border-slate-200 dark:border-slate-700">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-800 dark:text-white">{user.nome}</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-primary-500 to-emerald-300 p-0.5 shadow-lg shadow-emerald-500/20 cursor-pointer hover:scale-105 transition-transform">
                <img
                  src={user.avatarUrl}
                  alt="Avatar"
                  className="w-full h-full rounded-full border-2 border-white dark:border-slate-900 object-cover"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content - Adjusted Padding for Mobile */}
        <div className="flex-1 p-4 md:p-6 lg:p-10 overflow-y-auto overflow-x-hidden">
          <div className="max-w-7xl mx-auto animate-fade-in pb-20 lg:pb-0">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;