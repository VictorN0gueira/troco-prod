import React from 'react';
import { calculateLevel, LEVEL_NAMES, LEVEL_COLORS } from '../../gamificationEngine';
import { Trophy } from 'lucide-react';
import { motion } from 'framer-motion';

interface LevelBadgeProps {
  xp: number;
  compact?: boolean;
  onClick?: () => void;
}

const LevelBadge: React.FC<LevelBadgeProps> = ({ xp, compact = false, onClick }) => {
  const { level, progress } = calculateLevel(xp);
  const name = LEVEL_NAMES[level] || 'Aprendiz';
  const colors = LEVEL_COLORS[level] || LEVEL_COLORS[1];

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={`
          group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider
          transition-all duration-200 hover:scale-105 focus:outline-none cursor-pointer
          ${colors.bg} ${colors.text} border border-current/20
        `}
        title={`Nível ${level} — ${name} (${xp} XP)`}
      >
        <Trophy className="w-3 h-3" />
        <span>Nv.{level}</span>

        {/* Mini progress bar */}
        <div className="absolute -bottom-0.5 left-1 right-1 h-[2px] bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full bg-current transition-all duration-700`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </button>
    );
  }

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        group relative flex items-center gap-3 px-4 py-3 rounded-[1.5rem] transition-all duration-300
        focus:outline-none overflow-hidden cursor-pointer shadow-lg
        ${colors.bg} border-2 border-white/10 dark:border-white/5
      `}
    >
      {/* Glossy overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

      {/* Level number */}
      <div className={`
        relative w-12 h-12 rounded-2xl bg-gradient-to-br ${colors.gradient}
        flex items-center justify-center text-white font-black text-xl shadow-[0_4px_12px_rgba(0,0,0,0.2)]
        group-hover:rotate-6 transition-transform
      `}>
        {level}
      </div>

      <div className="flex flex-col items-start min-w-0 relative">
        <span className={`text-[13px] font-black uppercase tracking-tighter leading-none ${colors.text}`}>
          {name}
        </span>
        <div className="flex items-center gap-1 mt-1">
          <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest whitespace-nowrap">
            {xp} XP
          </span>
          <span className="text-[10px] text-slate-300">•</span>
          <span className="text-[10px] text-emerald-500 font-bold">
            {progress}%
          </span>
        </div>

        {/* XP progress bar */}
        <div className="w-full mt-2 h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden min-w-[100px] p-0.5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "circOut" }}
            className={`h-full rounded-full bg-gradient-to-r ${colors.gradient} relative shadow-[0_0_8px_rgba(255,255,255,0.2)]`}
          >
            <div className="absolute inset-0 bg-white/30 animate-shimmer" />
          </motion.div>
        </div>
      </div>
    </motion.button>
  );
};

export default LevelBadge;
