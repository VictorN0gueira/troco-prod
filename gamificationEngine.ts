import { Transaction, Goal, Budget, GamificationProfile, AchievementDefinition, UnlockedAchievement, Challenge } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

export const LEVEL_THRESHOLDS = [
  0,     // Nível 1
  250,   // Nível 2
  750,   // Nível 3
  1500,  // Nível 4
  2750,  // Nível 5 (cap free)
  4500,  // Nível 6
  7000,  // Nível 7
  10500, // Nível 8
  15000, // Nível 9
  21000, // Nível 10
];

export const LEVEL_NAMES: Record<number, string> = {
  1: 'Aprendiz',
  2: 'Controlado',
  3: 'Poupador',
  4: 'Estrategista',
  5: 'Investidor',
  6: 'Especialista',
  7: 'Mestre',
  8: 'Veterano',
  9: 'Elite',
  10: 'Magnata',
};

export const LEVEL_COLORS: Record<number, { gradient: string; text: string; bg: string }> = {
  1:  { gradient: 'from-slate-400 to-slate-500',    text: 'text-slate-500',    bg: 'bg-slate-100 dark:bg-slate-800' },
  2:  { gradient: 'from-emerald-400 to-emerald-600', text: 'text-emerald-500',  bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  3:  { gradient: 'from-blue-400 to-blue-600',       text: 'text-blue-500',     bg: 'bg-blue-50 dark:bg-blue-500/10' },
  4:  { gradient: 'from-violet-400 to-violet-600',   text: 'text-violet-500',   bg: 'bg-violet-50 dark:bg-violet-500/10' },
  5:  { gradient: 'from-amber-400 to-amber-600',     text: 'text-amber-500',    bg: 'bg-amber-50 dark:bg-amber-500/10' },
  6:  { gradient: 'from-rose-400 to-rose-600',       text: 'text-rose-500',     bg: 'bg-rose-50 dark:bg-rose-500/10' },
  7:  { gradient: 'from-cyan-400 to-cyan-600',       text: 'text-cyan-500',     bg: 'bg-cyan-50 dark:bg-cyan-500/10' },
  8:  { gradient: 'from-fuchsia-400 to-fuchsia-600', text: 'text-fuchsia-500',  bg: 'bg-fuchsia-50 dark:bg-fuchsia-500/10' },
  9:  { gradient: 'from-indigo-400 to-indigo-600',   text: 'text-indigo-500',   bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
  10: { gradient: 'from-yellow-400 to-orange-500',   text: 'text-yellow-500',   bg: 'bg-yellow-50 dark:bg-yellow-500/10' },
};

export function calculateLevel(xp: number): { level: number; currentXP: number; nextLevelXP: number; progress: number } {
  // Garantir que xp seja um número válido
  const safeXP = typeof xp === 'number' && !isNaN(xp) ? Math.max(0, xp) : 0;
  
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (safeXP >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }

  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] || (currentThreshold + 1000);
  const xpInLevel = safeXP - currentThreshold;
  const xpNeeded = Math.max(1, nextThreshold - currentThreshold);
  const progress = Math.min(Math.max(0, (xpInLevel / xpNeeded) * 100), 100);

  return { 
    level, 
    currentXP: safeXP, 
    nextLevelXP: nextThreshold, 
    progress: isNaN(progress) ? 0 : progress 
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// XP REWARDS MAP
// ─────────────────────────────────────────────────────────────────────────────

export const XP_REWARDS: Record<string, { amount: number; label: string }> = {
  add_transaction:    { amount: 2,   label: 'Transação registrada' },
  pay_bill:           { amount: 20,  label: 'Conta paga no prazo' },
  pay_bill_early:     { amount: 30,  label: 'Conta paga antecipada' },
  complete_budget:    { amount: 50,  label: 'Orçamento cumprido' },
  reach_goal:         { amount: 250, label: 'Meta atingida!' },
  add_money_to_goal:  { amount: 15,  label: 'Depósito na meta' },
  pay_card_invoice:   { amount: 25,  label: 'Fatura paga' },
  daily_login:        { amount: 5,   label: 'Uso diário' },
  streak_7:           { amount: 100, label: 'Streak de 7 dias!' },
  streak_30:          { amount: 500, label: 'Streak de 30 dias!' },
  first_investment:   { amount: 100, label: 'Primeiro investimento' },
};

// ─────────────────────────────────────────────────────────────────────────────
// ACHIEVEMENTS CATALOG
// ─────────────────────────────────────────────────────────────────────────────

export const ACHIEVEMENTS_CATALOG: AchievementDefinition[] = [
  // ── FREE TIER ──
  {
    id: 'first_transaction',
    name: 'Primeiro Passo',
    description: 'Cadastre sua primeira transação',
    icon: '🥇',
    xp_reward: 20,
    tier: 'free',
    category: 'exploration',
  },
  {
    id: 'streak_7',
    name: 'Consistente',
    description: 'Use o app por 7 dias seguidos',
    icon: '📅',
    xp_reward: 50,
    tier: 'free',
    category: 'consistency',
  },
  {
    id: 'first_goal',
    name: 'Sonhador',
    description: 'Crie sua primeira meta financeira',
    icon: '🎯',
    xp_reward: 20,
    tier: 'free',
    category: 'goals',
  },
  {
    id: 'first_budget',
    name: 'Planejador',
    description: 'Configure seu primeiro orçamento',
    icon: '📊',
    xp_reward: 20,
    tier: 'free',
    category: 'savings',
  },
  {
    id: 'bills_on_time',
    name: 'Pontual',
    description: 'Pague 5 contas sem atraso',
    icon: '⏰',
    xp_reward: 40,
    tier: 'free',
    category: 'consistency',
  },

  // ── SUPER TROCÔ TIER ──
  {
    id: 'streak_30',
    name: 'Inabalável',
    description: '30 dias consecutivos usando o app',
    icon: '🔥',
    xp_reward: 500,
    tier: 'super',
    category: 'consistency',
  },
  {
    id: 'goal_reached',
    name: 'Meta Cumprida',
    description: 'Atinja 100% de uma meta',
    icon: '🏆',
    xp_reward: 250,
    tier: 'super',
    category: 'goals',
  },
  {
    id: 'under_budget',
    name: 'Abaixo do Orçamento',
    description: 'Feche o mês abaixo do orçamento em todas as categorias',
    icon: '💪',
    xp_reward: 80,
    tier: 'super',
    category: 'savings',
  },
  {
    id: 'saver_100',
    name: 'Poupador Iniciante',
    description: 'Economize R$100 em um mês',
    icon: '💰',
    xp_reward: 50,
    tier: 'super',
    category: 'savings',
  },
  {
    id: 'saver_1000',
    name: 'Cofre Cheio',
    description: 'Economize R$1.000 em um mês',
    icon: '🏦',
    xp_reward: 150,
    tier: 'super',
    category: 'savings',
  },
  {
    id: 'invoice_zero',
    name: 'Fatura Zerada',
    description: 'Pague todas as faturas de cartão no mês',
    icon: '💳',
    xp_reward: 60,
    tier: 'super',
    category: 'consistency',
  },
  {
    id: 'diversifier',
    name: 'Diversificador',
    description: 'Tenha 3+ tipos de investimentos diferentes',
    icon: '📈',
    xp_reward: 70,
    tier: 'super',
    category: 'exploration',
  },
  {
    id: 'transaction_50',
    name: 'Registrador',
    description: 'Registre 50 transações no total',
    icon: '📝',
    xp_reward: 40,
    tier: 'super',
    category: 'consistency',
  },
  {
    id: 'transaction_200',
    name: 'Historiador Financeiro',
    description: 'Registre 200 transações no total',
    icon: '📚',
    xp_reward: 100,
    tier: 'super',
    category: 'consistency',
  },
  {
    id: 'streak_90',
    name: 'Lenda',
    description: '90 dias consecutivos usando o app',
    icon: '👑',
    xp_reward: 500,
    tier: 'super',
    category: 'consistency',
  },
  {
    id: 'challenge_master',
    name: 'Mestre dos Desafios',
    description: 'Complete 20 desafios semanais ou mensais',
    icon: '💎',
    xp_reward: 1000,
    tier: 'super',
    category: 'exploration',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ACHIEVEMENT ELIGIBILITY CHECK (Pure Functions — roda no frontend para UI)
// ─────────────────────────────────────────────────────────────────────────────

export interface UserStats {
  totalTransactions: number;
  totalGoals: number;
  totalBudgets: number;
  billsPaidOnTime: number;
  currentStreak: number;
  longestStreak: number;
  goalsReached: number;
  monthSavings: number; // receita - despesa do mês
  allBudgetsUnder: boolean;
  allInvoicesPaid: boolean;
  investmentTypes: number;
  totalAchievements: number; // Nova: Para meta-conquistas
  totalChallenges: number;   // Nova: Para meta-conquistas
}

export function computeUserStats(
  transactions: Transaction[],
  goals: Goal[],
  budgets: Budget[],
  investmentTypesCount: number,
  achievementsCount: number,
  challengesCount: number
): UserStats {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  let income = 0;
  let expense = 0;
  let billsPaidOnTime = 0;
  let allInvoicesPaid = true;
  let hasCreditCardTransactions = false;

  // Mapa para acelerar o check de budgets (categoria -> total gasto no mês)
  const categorySpent: Record<string, number> = {};

  // Processo em única passagem O(N)
  for (const t of transactions) {
    const d = new Date(t.date + 'T12:00:00Z');
    const isThisMonth = d.getMonth() === currentMonth && d.getFullYear() === currentYear;

    if (isThisMonth) {
      if (t.type === 'income') income += t.amount;
      if (t.type === 'expense') {
        expense += t.amount;
        // Acumular gastos por categoria para o check de budgets posterior
        categorySpent[t.category] = (categorySpent[t.category] || 0) + t.amount;
      }
    }

    // Check de contas pagas (global)
    if (t.type === 'expense' && (t.category === 'Contas' || t.category === 'Fixo')) {
      if (t.status === 'completed') billsPaidOnTime++;
    }

    // Check de faturas de cartão
    if (t.category === 'Cartão de Crédito') {
      hasCreditCardTransactions = true;
      if (t.status !== 'completed') allInvoicesPaid = false;
    }
  }

  const goalsReached = goals.filter(g => g.current_amount >= g.target_amount).length;

  // Check de budgets O(M) onde M é o número de categorias com orçamento
  const viewMonth = currentMonth + 1;
  const currentBudgets = budgets.filter(b => b.mes === viewMonth && b.ano === currentYear);
  const allBudgetsUnder = currentBudgets.length > 0 && currentBudgets.every(b => {
    const spent = categorySpent[b.categoria] || 0;
    return spent <= b.valor_limite;
  });

  return {
    totalTransactions: transactions.length,
    totalGoals: goals.length,
    totalBudgets: budgets.length,
    billsPaidOnTime,
    currentStreak: 0, // será preenchido pelo perfil do supabase
    longestStreak: 0,
    goalsReached,
    monthSavings: income - expense,
    allBudgetsUnder,
    allInvoicesPaid: hasCreditCardTransactions ? allInvoicesPaid : true, 
    investmentTypes: investmentTypesCount,
    totalAchievements: achievementsCount,
    totalChallenges: challengesCount
  };
}

export function getEligibleAchievements(
  stats: UserStats,
  unlockedIds: string[],
  isSuperPlan: boolean
): AchievementDefinition[] {
  const eligible: AchievementDefinition[] = [];

  for (const ach of ACHIEVEMENTS_CATALOG) {
    if (unlockedIds.includes(ach.id)) continue;
    if (ach.tier === 'super' && !isSuperPlan) continue;

    let qualifies = false;

    switch (ach.id) {
      case 'first_transaction':
        qualifies = stats.totalTransactions >= 1;
        break;
      case 'streak_7':
        qualifies = stats.currentStreak >= 7;
        break;
      case 'streak_30':
        qualifies = stats.currentStreak >= 30;
        break;
      case 'streak_90':
        qualifies = stats.currentStreak >= 90;
        break;
      case 'first_goal':
        qualifies = stats.totalGoals >= 1;
        break;
      case 'first_budget':
        qualifies = stats.totalBudgets >= 1;
        break;
      case 'bills_on_time':
        qualifies = stats.billsPaidOnTime >= 5;
        break;
      case 'goal_reached':
        qualifies = stats.goalsReached >= 1;
        break;
      case 'under_budget':
        qualifies = stats.allBudgetsUnder;
        break;
      case 'saver_100':
        qualifies = stats.monthSavings >= 100;
        break;
      case 'saver_1000':
        qualifies = stats.monthSavings >= 1000;
        break;
      case 'invoice_zero':
        qualifies = stats.allInvoicesPaid;
        break;
      case 'diversifier':
        qualifies = stats.investmentTypes >= 3;
        break;
      case 'transaction_50':
        qualifies = stats.totalTransactions >= 50;
        break;
      case 'transaction_200':
        qualifies = stats.totalTransactions >= 200;
        break;
      case 'challenge_master':
        qualifies = stats.totalChallenges >= 20;
        break;
    }

    if (qualifies) eligible.push(ach);
  }

  return eligible;
}

// ─────────────────────────────────────────────────────────────────────────────
// STREAK CALCULATION (Pure — para UI preview)
// ─────────────────────────────────────────────────────────────────────────────

export function calculateStreak(lastActivityDate: string | null, today: string): {
  streakBroken: boolean;
  isActiveToday: boolean;
} {
  if (!lastActivityDate) return { streakBroken: false, isActiveToday: false };

  const last = new Date(lastActivityDate + 'T12:00:00Z');
  const now = new Date(today + 'T12:00:00Z');
  const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

  return {
    streakBroken: diffDays > 1,
    isActiveToday: diffDays === 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CHALLENGE TEMPLATES (para gerar desafios semanais/mensais)
// ─────────────────────────────────────────────────────────────────────────────

export interface ChallengeTemplate {
  type: 'weekly' | 'monthly';
  title: string;
  description: string;
  target_value: number;
  reward_xp: number;
  checkProgress: (transactions: Transaction[], goals: Goal[]) => number;
}

export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  {
    type: 'weekly',
    title: 'Registrador Semanal',
    description: 'Registre 5 transações esta semana',
    target_value: 5,
    reward_xp: 50,
    checkProgress: (txs) => {
      const now = new Date();
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return txs.filter(t => new Date(t.date + 'T12:00:00Z') >= weekAgo).length;
    },
  },
  {
    type: 'weekly',
    title: 'Sem Gastos Imprevistos',
    description: 'Não tenha despesas na categoria "Outros" esta semana',
    target_value: 1,
    reward_xp: 60,
    checkProgress: (txs) => {
      const now = new Date();
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const outrosTxs = txs.filter(
        t => t.category === 'Outros' && t.type === 'expense' && new Date(t.date + 'T12:00:00Z') >= weekAgo
      );
      return outrosTxs.length === 0 ? 1 : 0;
    },
  },
  {
    type: 'monthly',
    title: 'Poupador do Mês',
    description: 'Deposite nas suas metas 3 vezes este mês',
    target_value: 3,
    reward_xp: 100,
    checkProgress: (_txs, goals) => {
      // Simplificado: conta goals com algum progresso
      return goals.filter(g => g.current_amount > 0).length;
    },
  },
  {
    type: 'monthly',
    title: 'Dedos de Ferro',
    description: 'Fique abaixo de 80% do orçamento em todas as categorias',
    target_value: 1,
    reward_xp: 150,
    checkProgress: () => 0, // calculado externamente com budgets
  },
  {
    type: 'weekly',
    title: 'Uso Diário',
    description: 'Use o app por 5 dias seguidos',
    target_value: 5,
    reward_xp: 40,
    checkProgress: () => 0, // calculado via streak
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// FREE vs SUPER LIMITS
// ─────────────────────────────────────────────────────────────────────────────

export const GAMIFICATION_LIMITS = {
  free: {
    maxLevel: 5,
    maxXP: 2500,
    maxAchievements: 10,
    challengesEnabled: true,
    themesEnabled: true,
    titlesEnabled: true,
  },
  super: {
    maxLevel: 10,
    maxXP: Infinity,
    maxAchievements: Infinity,
    challengesEnabled: true,
    themesEnabled: true,
    titlesEnabled: true,
  },
};

export function getGamificationLimits(isSuperPlan: boolean) {
  return isSuperPlan ? GAMIFICATION_LIMITS.super : GAMIFICATION_LIMITS.free;
}
