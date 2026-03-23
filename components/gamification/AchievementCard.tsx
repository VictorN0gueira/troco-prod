import React from 'react';
import { AchievementDefinition } from '../../types';
import { Lock, Sparkles, CheckCircle, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

interface AchievementCardProps {
  achievement: AchievementDefinition;
  unlocked: boolean;
  unlockedAt?: string;
  isLocked?: boolean; // locked = Super only e user é free
}

const AchievementCard: React.FC<AchievementCardProps> = ({
  achievement,
  unlocked,
  unlockedAt,
  isLocked = false,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={unlocked ? { y: -5, scale: 1.02 } : {}}
      className={`
        relative group flex flex-col items-center text-center p-5 rounded-[2rem] border-2 transition-all duration-500
        ${unlocked
          ? 'bg-white dark:bg-slate-800/80 border-emerald-500/20 dark:border-emerald-500/30 shadow-[0_20px_40px_-15px_rgba(16,185,129,0.15)] backdrop-blur-md'
          : isLocked
            ? 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/50 opacity-60 cursor-not-allowed grayscale'
            : 'bg-white/40 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 backdrop-blur-sm'
        }
      `}
    >
      {/* Background Decorator (Unlocked only) */}
      {unlocked && (
        <div className="absolute inset-0 rounded-[2rem] overflow-hidden pointer-events-none">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 blur-[40px] rounded-full" />
          <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-teal-500/10 blur-[30px] rounded-full" />
        </div>
      )}

      {/* Glow Effect on Hover (Unlocked only) */}
      {unlocked && (
        <div className="absolute inset-0 rounded-[2rem] bg-emerald-400/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      )}

      {/* Header Badges */}
      <div className="absolute top-4 right-4 flex gap-1">
        {isLocked && (
          <div className="p-1.5 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full backdrop-blur-sm">
            <Lock className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
          </div>
        )}
        {unlocked && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="p-1.5 bg-emerald-500 text-white rounded-full shadow-lg shadow-emerald-500/30"
          >
            <CheckCircle className="w-3 h-3" />
          </motion.div>
        )}
        {achievement.tier === 'super' && !isLocked && !unlocked && (
          <div className="p-1.5 bg-amber-500/10 rounded-full">
            <Sparkles className="w-3 h-3 text-amber-500" />
          </div>
        )}
      </div>

      {/* Icon Decoration / Medal Plate */}
      <div className="relative mb-4">
        <div className={`
          w-20 h-20 rounded-[1.75rem] flex items-center justify-center text-3xl transition-all duration-500 transform overflow-hidden
          ${unlocked
            ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 rotate-3 shadow-[0_8px_20px_-5px_rgba(16,185,129,0.2)]'
            : 'bg-slate-100 dark:bg-slate-800 grayscale scale-90'
          }
          group-hover:rotate-0
        `}>
          {achievement.icon}

          {/* Shine effect for unlocked achievements */}
          {unlocked && (
            <motion.div
              animate={{ 
                left: ['-100%', '200%'],
                transition: { duration: 3, repeat: Infinity, repeatDelay: 2 }
              }}
              className="absolute top-0 w-1/2 h-full bg-white/40 skew-x-[25deg] blur-sm"
            />
          )}
        </div>
        
        {/* Tier Ring */}
        <div className={`
          absolute -inset-1.5 rounded-[2.1rem] border-2 border-dashed transition-opacity duration-700
          ${unlocked 
            ? 'border-emerald-500/30 opacity-100 animate-[spin_12s_linear_infinite]' 
            : 'border-slate-300 dark:border-slate-700 opacity-0'
          }
        `} />
      </div>

      {/* Content */}
      <div className="z-10 w-full mb-3 flex-1 flex flex-col justify-center">
        <h4 className={`
          text-[15px] font-black leading-tight mb-1 transition-colors tracking-tight
          ${unlocked ? 'text-slate-800 dark:text-white' : 'text-slate-400 dark:text-slate-500'}
        `}>
          {achievement.name}
        </h4>
        <p className={`
          text-[11px] leading-relaxed line-clamp-2 px-2 font-medium tracking-tight
          ${unlocked ? 'text-slate-500 dark:text-slate-400' : 'text-slate-400 dark:text-slate-600'}
        `}>
          {achievement.description}
        </p>
      </div>

      <div className={`
        mt-auto px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all
        ${unlocked
          ? 'bg-emerald-500 text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)] ring-1 ring-white/20'
          : isLocked
            ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-transparent'
        }
      `}>
        {unlocked ? (
          <span className="flex items-center gap-1.5">
            CONQUISTADO <ShieldCheck className="w-3 h-3 stroke-[3px]" />
          </span>
        ) : isLocked ? (
          'BLOQUEADO'
        ) : (
          `+ ${achievement.xp_reward} XP`
        )}
      </div>

      {unlocked && unlockedAt && (
        <div className="mt-2 text-[9px] text-slate-400 font-bold uppercase tracking-tighter opacity-70 group-hover:opacity-100 transition-opacity">
          {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(unlockedAt))}
        </div>
      )}
    </motion.div>
  );
};

export default AchievementCard;

