import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, TrendingUp, Sparkles } from 'lucide-react';

interface XPToastProps {
  xpGained: number;
  label: string;
  leveledUp?: boolean;
  newLevel?: number;
  onDone: () => void;
}

const XPToast: React.FC<XPToastProps> = ({ xpGained, label, leveledUp, newLevel, onDone }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 500);
    }, leveledUp ? 5000 : 3000);
    return () => clearTimeout(timer);
  }, [onDone, leveledUp]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.9, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -20, scale: 0.95, filter: 'blur(5px)' }}
          transition={{ 
            type: 'spring', 
            stiffness: 300, 
            damping: 25,
            opacity: { duration: 0.4 }
          }}
          className="fixed top-8 left-0 right-0 z-[9999] flex justify-center pointer-events-none px-4"
        >
          <div className={`
            relative flex items-center gap-4 px-6 py-4 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] 
            border backdrop-blur-2xl transition-all duration-500 max-w-sm w-full sm:w-auto overflow-hidden
            ${leveledUp
              ? 'bg-gradient-to-br from-amber-400/90 via-orange-500/90 to-amber-600/90 border-white/30 text-white ring-8 ring-amber-500/10'
              : 'bg-white/90 dark:bg-slate-900/90 border-slate-200/50 dark:border-slate-800/50 text-slate-800 dark:text-white'
            }
          `}>
            {/* Glossy Reflection */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent pointer-events-none" />
            {/* Background Glow Effect for Level Up */}
            {leveledUp && (
              <motion.div 
                animate={{ 
                  opacity: [0.3, 0.6, 0.3],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-3xl bg-amber-400 blur-2xl -z-10"
              />
            )}

            {/* Icon Container */}
            <motion.div
              initial={{ rotate: -20, scale: 0.5 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', bounce: 0.6 }}
              className={`
                relative w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner
                ${leveledUp
                  ? 'bg-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]'
                  : 'bg-emerald-500/10 dark:bg-emerald-400/10'}
              `}
            >
              {leveledUp ? (
                <>
                  <TrendingUp className="w-6 h-6 text-amber-600 z-10" />
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 border-2 border-dashed border-amber-500/30 rounded-2xl"
                  />
                </>
              ) : (
                <Zap className="w-6 h-6 text-emerald-500 fill-emerald-500/20" />
              )}
            </motion.div>

            {/* Info Container */}
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <motion.span
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className={`text-lg font-black tracking-tight leading-none ${leveledUp ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`}
                >
                  +{xpGained} XP
                </motion.span>
                {leveledUp && (
                   <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                   >
                    Level Up
                   </motion.div>
                )}
              </div>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className={`text-sm font-medium mt-1 truncate ${leveledUp ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'}`}
              >
                {leveledUp ? `Parabéns! Você agora é Nível ${newLevel}` : label}
              </motion.span>
            </div>

            {/* Sparkle Decoration for Premium feel */}
            {leveledUp && (
              <motion.div
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute -top-2 -right-2 bg-white rounded-full p-1 border border-amber-200"
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
              </motion.div>
            )}
          </div>

          {/* Luxury Particles */}
          {leveledUp && (
            <div className="absolute inset-0 pointer-events-none overflow-visible">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1.5, 0],
                    x: (Math.random() - 0.5) * 200,
                    y: (Math.random() - 0.5) * 150 - 40,
                  }}
                  transition={{ duration: 1.5, delay: 0.1 + i * 0.05, ease: 'easeOut' }}
                  className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor: ['#FCD34D', '#F59E0B', '#FBBF24', '#FFFFFF'][i % 4],
                    boxShadow: '0 0 10px rgba(251, 191, 36, 0.5)'
                  }}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default XPToast;

