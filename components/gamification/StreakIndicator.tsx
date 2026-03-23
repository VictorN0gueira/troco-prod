import React from 'react';
import { Flame } from 'lucide-react';
import { motion } from 'framer-motion';

interface StreakIndicatorProps {
  streak: number;
  compact?: boolean;
}

const StreakIndicator: React.FC<StreakIndicatorProps> = ({ streak, compact = false }) => {
  if (streak <= 0) return null;

  const isHot = streak >= 7;
  const isOnFire = streak >= 30;

  if (compact) {
    return (
      <motion.div
        whileHover={{ scale: 1.05 }}
        className={`
          flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black transition-all shadow-sm
          ${isOnFire
            ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-orange-500/20'
            : isHot
              ? 'bg-amber-400 text-white shadow-amber-500/20'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }
        `}
        title={`${streak} dias de streak`}
      >
        <Flame className={`w-3.5 h-3.5 ${isOnFire ? 'animate-pulse fill-white/20' : isHot ? 'fill-white/20' : ''}`} />
        <span>{streak}</span>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`
        flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all shadow-lg
        ${isOnFire
          ? 'bg-gradient-to-br from-orange-500 via-red-500 to-rose-600 text-white shadow-orange-500/30 ring-1 ring-white/20'
          : isHot
            ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-amber-500/20 ring-1 ring-white/10'
            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-slate-200/50 dark:shadow-none'
        }
      `}>
      <div className={`
        p-2 rounded-xl backdrop-blur-md
        ${isOnFire
          ? 'bg-white/20'
          : isHot
            ? 'bg-white/20'
            : 'bg-slate-100 dark:bg-slate-700'
        }
      `}>
        <Flame className={`
          w-5 h-5
          ${isOnFire ? 'text-white animate-pulse fill-white/30' : isHot ? 'text-white fill-white/20' : 'text-slate-400'}
        `} />
      </div>
      <div className="flex flex-col">
        <span className={`
          text-[15px] font-black tracking-tight leading-none
          ${isOnFire || isHot ? 'text-white' : 'text-slate-800 dark:text-white'}
        `}>
          {streak} {streak === 1 ? 'dia' : 'dias'}
        </span>
        <span className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${isOnFire || isHot ? 'text-white/80' : 'text-slate-400'}`}>
          {isOnFire ? 'Imparável!' : isHot ? 'Em Chamas!' : 'Ativo'}
        </span>
      </div>
    </motion.div>
  );
};

export default StreakIndicator;
