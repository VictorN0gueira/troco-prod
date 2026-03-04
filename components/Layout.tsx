import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  MessageCircle
} from 'lucide-react';
import { NavItem, UserProfile } from '../types';
import { LOGO_URL } from '../constants';
import { FreePlanBadge } from './FreePlanBadge';
import { cn } from '../utils';
import { Sidebar, SidebarBody, SidebarLink } from './ui/sidebar';

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
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Transações', path: '/transactions', icon: ArrowRightLeft },
  { label: 'Lembretes', path: '/reminders', icon: BellRing },
  { label: 'Calendário', path: '/calendar', icon: CalendarDays },
  { label: 'Metas', path: '/goals', icon: Target },
  { label: 'Cartões', path: '/cards', icon: CreditCard },
  { label: 'Investimentos', path: '/investments', icon: TrendingUp },
  { label: 'Insights', path: '/insights', icon: Newspaper },
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
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = () => {
    const current = NAV_ITEMS.find(item => item.path === location.pathname);
    return current ? current.label : 'Trocô';
  };

  return (
    <div className={cn("min-h-screen flex flex-col lg:flex-row w-full flex-1 overflow-hidden", darkMode ? "dark bg-slate-900" : "bg-slate-50")}>
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">

            {/* Logo Section */}
            <div className="flex items-center gap-3 px-2 mb-8 mt-2 lg:mt-0">
              <img
                src={LOGO_URL}
                alt="Trocô Logo"
                className="h-8 w-8 object-contain flex-shrink-0 transition-transform hover:scale-110"
              />
              <motion.span
                animate={{ opacity: open ? 1 : 0, display: open ? "inline-block" : "none" }}
                className="text-xl font-bold tracking-tight text-slate-800 dark:text-white whitespace-pre"
              >
                Trocô
              </motion.span>
            </div>

            {/* Navigation Links */}
            <div className="flex flex-col gap-1">
              {NAV_ITEMS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <SidebarLink
                    key={idx}
                    link={{
                      label: item.label,
                      href: item.path,
                      icon: <Icon className="text-slate-500 dark:text-slate-400 h-5 w-5 flex-shrink-0 group-hover/sidebar:text-primary-500" />
                    }}
                  />
                )
              })}
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1">
              {/* WhatsApp AI Agent */}
              <SidebarLink
                onClick={() => window.open('https://wa.me/558184451243?text=Ol%C3%A1%20Troc%C3%B4%2C%20gostaria%20de%20saber%20mais%20sobre...', '_blank')}
                link={{
                  label: "Agente de WhatsApp",
                  href: "#",
                  icon: <MessageCircle className="text-emerald-500 h-5 w-5 flex-shrink-0" />
                }}
              />

              {/* Logout Button */}
              <SidebarLink
                onClick={onLogout}
                link={{
                  label: "Sair",
                  href: "#",
                  icon: <LogOut className="text-danger-500 h-5 w-5 flex-shrink-0 group-hover/sidebar:text-danger-600" />
                }}
              />
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-4">
            {/* Free Plan Badge */}
            {user.status_assinatura !== 'active' && (
              <div className="px-2">
                <FreePlanBadge
                  variant={open ? "full" : "compact"}
                  hideText={!open}
                  onClick={() => window.open('https://pay.kirvano.com/5e032963-787d-49de-b407-c3d1c4724c9d', '_blank')}
                />
              </div>
            )}

            <SidebarLink
              link={{
                label: user.nome,
                href: "/settings",
                icon: (
                  <img
                    src={user.avatarUrl}
                    className="h-7 w-7 ml-0.5 flex-shrink-0 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                    alt="Avatar"
                  />
                ),
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>

      {/* Main Content Dashboard */}
      <main className="flex-1 flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 relative overflow-y-auto w-full">
        {/* Header Content */}
        <header className="sticky top-0 z-30 h-16 lg:h-20 px-4 lg:px-10 flex items-center justify-between
          backdrop-blur-md bg-white/80 dark:bg-slate-950/80 border-b border-slate-200/50 dark:border-slate-800/50 transition-all">

          <div className="flex items-center gap-3">
            <h1 className="text-lg lg:text-2xl font-bold text-slate-800 dark:text-white truncate">
              {getPageTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {togglePrivacyMode && (
              <button
                onClick={togglePrivacyMode}
                className="p-2 sm:p-2.5 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative w-10 h-10 flex items-center justify-center overflow-hidden"
                title={privacyMode ? "Mostrar valores" : "Ocultar valores"}
              >
                <div className="relative w-5 h-5">
                  <Eye className={cn("absolute inset-0 w-5 h-5 transition-all duration-300 ease-in-out origin-center", privacyMode ? 'scale-y-0 opacity-0' : 'scale-y-100 opacity-100')} />
                  <EyeOff className={cn("absolute inset-0 w-5 h-5 transition-all duration-300 ease-in-out origin-center", privacyMode ? 'scale-y-100 opacity-100 delay-75' : 'scale-y-0 opacity-0')} />
                </div>
              </button>
            )}

            <button
              onClick={toggleDarkMode}
              className="p-2 sm:p-2.5 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Page Children Content */}
        <div className="flex-1 p-4 md:p-6 lg:p-10 overflow-x-hidden">
          <div className="max-w-7xl mx-auto animate-fade-in pb-20 lg:pb-0">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;