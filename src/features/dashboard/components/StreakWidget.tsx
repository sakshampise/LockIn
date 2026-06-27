import React from 'react';
import { Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApp } from '@/store/AppProvider';
import { getFocusStreak } from '@/lib/analytics';

export const StreakWidget: React.FC = () => {
  const { state } = useApp();
  const streak = getFocusStreak(state.sessions);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
      className="p-5 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-foreground/5 text-muted-foreground"><Flame className="w-4 h-4" /></div>
        <h3 className="font-medium text-sm text-muted-foreground">Current Streak</h3>
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-4xl font-bold tracking-tighter">{streak}</span>
        <span className="text-muted-foreground text-sm font-medium">Days</span>
      </div>
      <div className="flex items-center gap-1.5 mt-4">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className={`flex-1 h-1.5 rounded-full ${i < Math.min(streak, 7) ? 'bg-foreground/40' : 'bg-accent'}`} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-2">{streak > 0 ? 'Keep the momentum going.' : 'Start a session to begin.'}</p>
    </motion.div>
  );
};
