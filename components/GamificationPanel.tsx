import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Target, Gift, Flame, Zap, Lock, ChevronRight, Sparkles } from 'lucide-react';
import { GamificationProfile, AchievementDefinition, UnlockedAchievement, Challenge, Transaction, Goal, Budget, Investment, UserProfile } from '../types';
import {
  calculateLevel,
  LEVEL_NAMES,
  LEVEL_COLORS,
  ACHIEVEMENTS_CATALOG,
  GAMIFICATION_LIMITS,
  getGamificationLimits,
  computeUserStats,
  getEligibleAchievements,
} from '../gamificationEngine';
import AchievementCard from './gamification/AchievementCard';
import ChallengeCard from './gamification/ChallengeCard';
import StreakIndicator from './gamification/StreakIndicator';
import CosmeticAvatar from './gamification/CosmeticAvatar';

interface GamificationPanelProps {
  profile: GamificationProfile;
  unlockedAchievements: UnlockedAchievement[];
  challenges: Challenge[];
  user: UserProfile;
  transactions: Transaction[];
  goals: Goal[];
  budgets: Budget[];
  investments: Investment[];
  onEquip: (type: 'theme' | 'title' | 'avatar_frame', value: string) => Promise<void>;
}

type TabKey = 'achievements' | 'challenges' | 'rewards';

const GamificationPanel: React.FC<GamificationPanelProps> = ({
  profile,
  unlockedAchievements,
  challenges,
  user,
  transactions,
  goals,
  budgets,
  investments,
  onEquip,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('achievements');
  const isSuperPlan = user.status_assinatura === 'active';
  const limits = getGamificationLimits(isSuperPlan);

  const levelData = useMemo(() => calculateLevel(profile.xp), [profile.xp]);
  const levelName = LEVEL_NAMES[levelData.level] || 'Aprendiz';
  const levelColors = LEVEL_COLORS[levelData.level] || LEVEL_COLORS[1];
  const isAtFreeLimit = !isSuperPlan && levelData.level >= 5;

  // Clampar XP visualmente para usuários free que excederam o limite por dados legados
  const displayXP = isAtFreeLimit ? Math.min(profile.xp, levelData.nextLevelXP) : profile.xp;
  const displayNextXP = levelData.nextLevelXP;
  const unlockedIds = useMemo(() => unlockedAchievements.map(a => a.achievement_id), [unlockedAchievements]);

  const freeAchievements = ACHIEVEMENTS_CATALOG.filter(a => a.tier === 'free');
  const superAchievements = ACHIEVEMENTS_CATALOG.filter(a => a.tier === 'super');

  const tabs: { key: TabKey; label: string; icon: React.ElementType; superOnly?: boolean }[] = [
    { key: 'achievements', label: 'Conquistas', icon: Trophy },
    { key: 'challenges', label: 'Desafios', icon: Target, superOnly: true },
    { key: 'rewards', label: 'Recompensas', icon: Gift, superOnly: true },
  ];

  // Temas cosméticos
  const cosmetics = [
    { id: 'default', name: 'Tema Padrão', unlockLevel: 1, gradient: 'from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900' },
    { id: 'neon', name: 'Neon Nights', unlockLevel: 3, gradient: 'from-cyan-400 to-purple-500' },
    { id: 'sunrise', name: 'Sunrise', unlockLevel: 5, gradient: 'from-orange-400 to-pink-500' },
    { id: 'ocean', name: 'Ocean Deep', unlockLevel: 7, gradient: 'from-blue-400 to-teal-500' },
    { id: 'aurora', name: 'Aurora', unlockLevel: 9, gradient: 'from-green-400 to-purple-500' },
    { id: 'golden', name: 'Golden Age', unlockLevel: 10, gradient: 'from-yellow-400 to-amber-600' },
    { id: 'ruby', name: 'Ruby Flare', unlockLevel: 10, gradient: 'from-red-500 to-rose-700' },
  ];

  // Títulos desbloqueáveis
  const titles = [
    { name: 'Aprendiz 💎', unlockLevel: 1 },
    { name: 'Mão de Vaca 💎', unlockLevel: 3 },
    { name: 'Investidor Nato 📈', unlockLevel: 5 },
    { name: 'Cofre de Ouro 🏦', unlockLevel: 7 },
    { name: 'TrocoMaster 🧠', unlockLevel: 9 },
    { name: 'Magnata Supremo 👑', unlockLevel: 10 },
  ];

  // Molduras de Avatar
  const avatarFrames = [
    { id: 'none', name: 'Nenhuma', unlockLevel: 1, previewClass: 'bg-slate-200 dark:bg-slate-700' },
    { id: 'star_1', name: 'Estrela Iniciante (1 ⭐)', unlockLevel: 4, previewClass: 'ring-4 ring-amber-500/50' },
    { id: 'star_2', name: 'Aprendiz (2 ⭐)', unlockLevel: 6, previewClass: 'ring-4 ring-slate-300' },
    { id: 'star_3', name: 'Mestre (3 ⭐)', unlockLevel: 8, previewClass: 'ring-2 ring-yellow-400' },
    { id: 'star_4', name: 'Supremo (4 ⭐)', unlockLevel: 9, previewClass: 'ring-4 ring-orange-500/30 shadow-[0_0_10px_rgba(249,115,22,0.3)]' },
    { id: 'star_5', name: 'Lendário (👑)', unlockLevel: 10, previewClass: 'ring-4 ring-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.5)]' },
  ];

  return (
    <div className="space-y-6">
      {/* ─── HEADER COM NÍVEL E XP ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 md:p-8 text-white shadow-2xl">
        {/* Glow decorativo */}
        <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${levelColors.gradient} opacity-10 blur-3xl rounded-full pointer-events-none -translate-y-1/2 translate-x-1/4`} />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 blur-2xl rounded-full pointer-events-none translate-y-1/2 -translate-x-1/4" />

        <div className="relative z-10">
          {/* Top row: título e streak */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2">
                <Trophy className={`w-7 h-7 ${levelColors.text}`} />
                Sua Jornada
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Continue evoluindo suas finanças!
              </p>
            </div>
            <StreakIndicator streak={profile.current_streak} />
          </div>

          {/* Nível e XP bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-6">
            {/* Level circle */}
            <div className={`
              w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br ${levelColors.gradient}
              flex items-center justify-center text-white shadow-2xl flex-shrink-0
            `}>
              <div className="text-center">
                <span className="text-3xl md:text-4xl font-black">{levelData.level}</span>
              </div>
            </div>

            <div className="flex-1 w-full min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-black uppercase tracking-widest ${levelColors.text}`}>
                  {levelName}
                </span>
                <div className="flex flex-col items-end">
                  <span className="text-sm text-slate-400 font-mono">
                    {displayXP} / {displayNextXP} XP
                  </span>
                  {isAtFreeLimit && (
                    <motion.span 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-1 px-2 py-0.5 text-[8px] font-black bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded ml-auto uppercase tracking-tighter"
                    >
                      Limite Free Atingido
                    </motion.span>
                  )}
                </div>
              </div>

              {/* XP Progress Bar */}
              <div className="h-3 md:h-4 bg-white/5 rounded-full p-0.5 overflow-hidden backdrop-blur-md border border-white/10 ring-1 ring-black/20">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${levelData.progress}%` }}
                  transition={{ duration: 1.5, ease: [0.34, 1.56, 0.64, 1] }}
                  className={`h-full rounded-full bg-gradient-to-r ${levelColors.gradient} shadow-[0_0_15px_rgba(255,255,255,0.2)] relative`}
                >
                  {/* Shimmer effect refined */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer skew-x-[-20deg]" />
                  
                  {/* Glowing tip */}
                  <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/40 blur-sm rounded-full" />
                </motion.div>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Trophy className="w-3 h-3" />
                  {unlockedAchievements.length} conquistas
                </span>
                <span className="flex items-center gap-1">
                  <Flame className="w-3 h-3" />
                  Recorde: {profile.longest_streak} dias
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Título: {profile.title}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── TABS NAV ─── */}
      <div className="-mx-4 md:mx-0 overflow-x-auto hide-scrollbar border-b border-slate-200/60 dark:border-slate-800/60 transition-colors">
        <div className="flex px-4 md:px-0 min-w-max">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  relative flex items-center gap-2.5 px-6 py-4 text-sm font-black transition-all group overflow-hidden
                  ${isActive
                    ? 'text-emerald-500'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }
                `}
              >
                <Icon className={`w-4.5 h-4.5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110 opacity-70 group-hover:opacity-100'}`} />
                <span className="relative z-10">{tab.label}</span>
                
                {tab.superOnly && !isSuperPlan && (
                  <Lock className="w-3 h-3 text-indigo-400/70" />
                )}

                {/* Active Indicator Line */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 rounded-t-full shadow-[0_-2px_8px_rgba(16,185,129,0.3)]"
                  />
                )}
                
                {/* Hover Background */}
                <div className={`absolute inset-0 bg-slate-100 dark:bg-slate-800/50 opacity-0 group-hover:opacity-100 transition-opacity -z-10 rounded-xl m-1 ${isActive ? 'invisible' : ''}`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── TAB CONTENT ─── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
        >
          {/* ── CONQUISTAS ── */}
          {activeTab === 'achievements' && (
            <div className="space-y-6">
              {/* Free achievements */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-emerald-500" />
                  Conquistas Básicas
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {freeAchievements.map(ach => (
                    <AchievementCard
                      key={ach.id}
                      achievement={ach}
                      unlocked={unlockedIds.includes(ach.id)}
                      unlockedAt={unlockedAchievements.find(u => u.achievement_id === ach.id)?.unlocked_at}
                    />
                  ))}
                </div>
              </div>

              {/* Super Trocô achievements */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  Conquistas Exclusivas
                  {!isSuperPlan && (
                    <span className="text-xs font-bold bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full ml-2">
                      SUPER TROCÔ
                    </span>
                  )}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {superAchievements.map(ach => (
                    <AchievementCard
                      key={ach.id}
                      achievement={ach}
                      unlocked={unlockedIds.includes(ach.id)}
                      unlockedAt={unlockedAchievements.find(u => u.achievement_id === ach.id)?.unlocked_at}
                      isLocked={!isSuperPlan}
                    />
                  ))}
                </div>
              </div>

              {/* CTA para Free users */}
              {!isSuperPlan && (
                <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-gradient-to-r from-indigo-500/5 to-violet-500/5 border border-indigo-200 dark:border-indigo-500/20">
                  <Sparkles className="w-8 h-8 text-indigo-500 mb-3" />
                  <h4 className="text-base font-bold text-slate-800 dark:text-white mb-1">
                    Desbloqueie todas as conquistas!
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 max-w-md">
                    Com o Super Trocô, acesse 10 conquistas exclusivas, desafios semanais, temas cosméticos e mais.
                  </p>
                  <a
                    href={`https://pay.kirvano.com/5e032963-787d-49de-b407-c3d1c4724c9d${user.email ? `?email=${encodeURIComponent(user.email)}` : ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-3 bg-indigo-500 text-white font-bold text-sm rounded-xl hover:bg-indigo-600 active:scale-95 transition-all shadow-lg shadow-indigo-500/20"
                  >
                    <Zap className="w-4 h-4 fill-white" />
                    Fazer Upgrade
                    <ChevronRight className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* ── DESAFIOS ── */}
          {activeTab === 'challenges' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-amber-500" />
                  Desafios Ativos
                </h3>
              </div>

              {challenges.length > 0 ? (
                <div className="space-y-3">
                  {challenges.map(ch => (
                    <ChallengeCard key={ch.id} challenge={ch} isSuper={isSuperPlan} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  {isSuperPlan ? (
                    <>
                      <Target className="w-12 h-12 mb-4 opacity-30" />
                      <p className="text-sm font-medium">Nenhum desafio ativo no momento.</p>
                      <p className="text-xs mt-1">Novos desafios são gerados semanalmente!</p>
                    </>
                  ) : (
                    <>
                      <Lock className="w-12 h-12 mb-4 opacity-30" />
                      <p className="text-sm font-medium">Desafios são exclusivos do Super Trocô</p>
                      <a
                        href={`https://pay.kirvano.com/5e032963-787d-49de-b407-c3d1c4724c9d${user.email ? `?email=${encodeURIComponent(user.email)}` : ''}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white font-bold text-xs rounded-xl hover:bg-indigo-600 active:scale-95 transition-all"
                      >
                        <Zap className="w-3.5 h-3.5 fill-white" />
                        Desbloquear
                      </a>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── RECOMPENSAS ── */}
          {activeTab === 'rewards' && (
            <div className="space-y-6">
              {/* Temas */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <Gift className="w-5 h-5 text-violet-500" />
                  Temas Cosméticos
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {cosmetics.map(theme => {
                    const unlocked = isSuperPlan && levelData.level >= theme.unlockLevel;
                    const isActive = profile.theme === theme.id;
                    return (
                      <div
                        key={theme.id}
                        onClick={() => unlocked && onEquip('theme', isActive ? 'default' : theme.id)}
                        className={`
                          relative p-4 rounded-2xl border transition-all
                          ${isActive
                            ? 'border-emerald-500 dark:border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                            : unlocked
                              ? 'border-slate-200 dark:border-slate-700 hover:shadow-md cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700'
                              : 'border-slate-200 dark:border-slate-800 opacity-50'
                          }
                          bg-white dark:bg-slate-800/50
                        `}
                      >
                        <div className={`h-16 rounded-xl bg-gradient-to-r ${theme.gradient} mb-3 ${!unlocked ? 'grayscale' : ''}`} />
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-slate-800 dark:text-white">{theme.name}</p>
                            <p className="text-[10px] text-slate-400 mt-1">
                              {unlocked ? (isActive ? '✓ Equipado' : 'Clique para Equipar') : `Nível ${theme.unlockLevel}`}
                            </p>
                          </div>
                          {!unlocked && <Lock className="w-4 h-4 text-slate-300" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Títulos */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  ✨ Títulos
                </h3>
                <div className="space-y-2">
                  {titles.map(title => {
                    const unlocked = isSuperPlan && levelData.level >= title.unlockLevel;
                    const isActive = profile.title === title.name;
                    return (
                      <div
                        key={title.name}
                        onClick={() => unlocked && onEquip('title', isActive ? 'Aprendiz 💎' : title.name)}
                        className={`
                          flex items-center justify-between p-3 rounded-xl border transition-all
                          ${isActive
                            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/5 dark:border-emerald-500/30'
                            : 'border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/30'
                          }
                          ${!unlocked ? 'opacity-50' : !isActive ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer' : ''}
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{title.name.split(' ').pop()}</span>
                          <div>
                            <p className={`text-sm font-bold ${unlocked ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>
                              {title.name}
                            </p>
                            <p className="text-[10px] text-slate-400">Nível {title.unlockLevel}</p>
                          </div>
                        </div>
                        {unlocked ? (
                          isActive ? (
                            <span className="text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                              Equipado
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 hover:text-emerald-500 transition-colors">Equipar</span>
                          )
                        ) : (
                          <Lock className="w-4 h-4 text-slate-300" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Avatar Frames */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  Molduras de Avatar
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {avatarFrames.map(frame => {
                    const unlocked = isSuperPlan && levelData.level >= frame.unlockLevel;
                    const isActive = profile.avatar_frame === frame.id;
                    return (
                      <div
                        key={frame.id}
                        onClick={() => unlocked && !isActive && onEquip('avatar_frame', frame.id)}
                        className={`
                          relative p-4 rounded-2xl border transition-all flex flex-col items-center justify-center text-center
                          ${isActive
                            ? 'border-emerald-500 dark:border-emerald-500/50 shadow-lg shadow-emerald-500/10 bg-emerald-50/30 dark:bg-emerald-500/5'
                            : unlocked
                              ? 'border-slate-200 dark:border-slate-700 hover:shadow-md cursor-pointer hover:border-emerald-300'
                              : 'border-slate-200 dark:border-slate-800 opacity-50 bg-slate-50/50 dark:bg-slate-900/50'
                          }
                        `}
                      >
                        <div className={`mb-3 flex items-center justify-center ${!unlocked ? 'grayscale' : ''} pointer-events-none`}>
                          <CosmeticAvatar 
                            src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nome || 'Visitante')}&background=10B981&color=fff&size=128&font-size=0.4`}
                            frame={frame.id}
                            size="md"
                          />
                        </div>
                        <p className="text-xs font-bold text-slate-800 dark:text-white">{frame.name}</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {unlocked ? (isActive ? '✓ Equipado' : 'Equipar') : `Nível ${frame.unlockLevel}`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CTA free */}
              {!isSuperPlan && (
                <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-gradient-to-r from-violet-500/5 to-purple-500/5 border border-violet-200 dark:border-violet-500/20">
                  <Gift className="w-8 h-8 text-violet-500 mb-3" />
                  <h4 className="text-base font-bold text-slate-800 dark:text-white mb-1">
                    Desbloqueie temas e títulos!
                  </h4>
                  <p className="text-sm text-slate-500 mb-4 max-w-md">
                    Personalize seu app com temas exclusivos e títulos únicos.
                  </p>
                  <a
                    href={`https://pay.kirvano.com/5e032963-787d-49de-b407-c3d1c4724c9d${user.email ? `?email=${encodeURIComponent(user.email)}` : ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-3 bg-violet-500 text-white font-bold text-sm rounded-xl hover:bg-violet-600 active:scale-95 transition-all shadow-lg shadow-violet-500/20"
                  >
                    <Sparkles className="w-4 h-4" />
                    Fazer Upgrade
                  </a>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default GamificationPanel;
