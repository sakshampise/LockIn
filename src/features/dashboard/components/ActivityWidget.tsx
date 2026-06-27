import React from 'react';
import { Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApp } from '@/store/AppProvider';
import { getWeeklyActivity } from '@/lib/analytics';

export const ActivityWidget: React.FC = () => {
  const { state } = useApp();
  const data = getWeeklyActivity(state.sessions);
  const max = Math.max(...data, 1);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
      className="p-5 rounded-2xl border border-border bg-card shadow-sm h-full flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 rounded-lg bg-foreground/5 text-muted-foreground"><Activity className="w-4 h-4" /></div>
        <h3 className="font-medium text-sm text-muted-foreground">Weekly Activity</h3>
      </div>
      <div className="flex-1 flex items-end justify-between gap-2 h-32 mt-auto">
        {data.map((mins, i) => (
          <div key={i} className="w-full flex flex-col items-center gap-2 group">
            <div className="w-full bg-accent rounded-t-sm relative flex items-end h-full">
              <motion.div initial={{ height: 0 }} animate={{ height: `${(mins / max) * 100}%` }}
                transition={{ duration: 0.8, delay: 0.2 + i * 0.08, ease: 'easeOut' }}
                className="w-full bg-foreground/30 rounded-t-sm group-hover:bg-foreground/40 transition-colors" />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">{['M','T','W','T','F','S','S'][i]}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
