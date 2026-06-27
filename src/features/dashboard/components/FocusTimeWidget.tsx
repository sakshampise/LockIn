import React from 'react';
import { Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApp } from '@/store/AppProvider';
import { formatDuration } from '@/lib/format';
import { getTodayFocusMinutes } from '@/lib/analytics';

export const FocusTimeWidget: React.FC = () => {
  const { state } = useApp();
  const minutes = getTodayFocusMinutes(state.sessions);
  const goal = state.settings.dailyFocusGoalMinutes;
  const pct = Math.min(100, Math.round((minutes / goal) * 100));

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
      className="p-5 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-foreground/5 text-muted-foreground"><Clock className="w-4 h-4" /></div>
        <h3 className="font-medium text-sm text-muted-foreground">Focus Time</h3>
      </div>
      <span className="text-4xl font-bold tracking-tighter">{formatDuration(minutes)}</span>
      <div className="w-full h-1 bg-accent rounded-full overflow-hidden mt-4">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className="h-full bg-foreground/50 rounded-full" transition={{ duration: 0.8 }} />
      </div>
      <p className="text-xs text-muted-foreground mt-2">{pct}% of daily goal</p>
    </motion.div>
  );
};
