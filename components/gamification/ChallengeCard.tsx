import React from 'react';
import { Challenge } from '../../types';
import { Clock, CheckCircle2, Zap, Lock, Gift } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChallengeCardProps {
  challenge: Challenge;
  isSuper: boolean;
}

const ChallengeCard: React.FC<ChallengeCardProps> = React.memo(({ challenge, isSuper }) => {
  const progress = Math.min((challenge.current_value / challenge.target_value) * 100, 100);
  const isCompleted = challenge.completed;
  
  // Ajusta o fim do dia para calcular corretamente
  const endsAtTime = new Date(challenge.ends_at + 'T23:59:59').getTime();
  const daysLeft = Math.max(0, Math.ceil((endsAtTime - Date.now()) / (1000 * 60 * 60 * 24)));
  
  const isExpired = endsAtTime < Date.now() && !isCompleted;

  if (!isSuper) {
    return (
      <div className="relative flex items-center gap-4 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-500/5 opacity-70">
        <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-500/15">
          <Lock className="w-5 h-5 text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{challenge.title}</p>
          <p className="text-xs text-indigo-400/80 mt-0.5">Disponível no Super Trocô</p>
        </div>
        <button
          onClick={() => window.open('https://pay.kirvano.com/5e032963-787d-49de-b407-c3d1c4724c9d', '_blank')}
          className="flex-shrink-0 px-3 py-1.5 bg-indigo-500 text-white text-xs font-bold rounded-lg hover:bg-indigo-600 active:scale-95 transition-all"
        >
          Upgrade
        </button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ y: -2, scale: 1.01 }}
      className={`
        relative p-5 rounded-[2rem] border-2 transition-all duration-300 shadow-sm overflow-hidden
        ${isCompleted
          ? 'bg-white dark:bg-slate-800 border-emerald-500/20 shadow-emerald-500/5'
          : isExpired
            ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-60 grayscale'
            : 'bg-white dark:bg-slate-800/80 backdrop-blur-md border-slate-200/60 dark:border-slate-800/60 hover:border-amber-500/30'
        }
      `}
    >
      {/* Background Decorator */}
      {!isExpired && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/5 to-transparent blur-2xl rounded-full pointer-events-none" />
      )}
      <div className="flex items-start gap-3 mb-3">
        {/* Ícone */}
        <div className={`
          p-3 rounded-2xl flex-shrink-0 shadow-inner
          ${isCompleted
            ? 'bg-emerald-500 text-white shadow-emerald-500/20'
            : 'bg-amber-400 text-white shadow-amber-500/20 ring-4 ring-amber-500/10'
          }
        `}>
          {isCompleted
            ? <CheckCircle2 className="w-6 h-6 stroke-[3px]" />
            : <Zap className="w-6 h-6 fill-white/20 stroke-[2.5px]" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white truncate">
              {challenge.title}
            </h4>
            <span className={`
              text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0
              ${challenge.type === 'daily'
                ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-500'
                : challenge.type === 'weekly'
                  ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-500'
                  : 'bg-violet-50 dark:bg-violet-500/10 text-violet-500'
              }
            `}>
              {challenge.type === 'daily' ? 'DIÁRIA' : challenge.type === 'weekly' ? 'SEMANAL' : 'MENSAL'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {challenge.description}
          </p>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="mb-3">
        <div className="flex justify-between items-center text-[10px] mb-1.5 font-black uppercase tracking-widest">
          <span className={isCompleted ? 'text-emerald-500' : 'text-slate-500'}>
            Progresso: {challenge.current_value}/{challenge.target_value}
          </span>
          <span className={`
            flex items-center gap-1
            ${isCompleted ? 'text-emerald-500' : isExpired ? 'text-rose-400' : 'text-slate-400'}
          `}>
            {isCompleted ? (
              <>{progress}%</>
            ) : isExpired ? (
              <>Expirado</>
            ) : (
              <><Clock className="w-3 h-3" /> {daysLeft === 1 ? 'Expira hoje' : `${daysLeft}d restantes`}</>
            )}
          </span>
        </div>
        <div className="h-2.5 bg-slate-100 dark:bg-slate-900 rounded-full p-0.5 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-inner">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.5, ease: "circOut" }}
            className={`
              h-full rounded-full transition-all relative
              ${isCompleted
                ? 'bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                : progress >= 80
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                  : 'bg-gradient-to-r from-blue-400 to-indigo-500'
              }
            `}
          >
            <div className="absolute inset-0 bg-white/20 animate-shimmer" />
          </motion.div>
        </div>
      </div>

      {/* Recompensa */}
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20">
          <Gift className="w-4 h-4" />
          <span className="text-[11px] font-black tracking-tight">+{challenge.reward_xp} XP</span>
        </div>
        {isCompleted && (
          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">
            Resgatado ✓
          </span>
        )}
      </div>
    </motion.div>
  );
});

export default ChallengeCard;
