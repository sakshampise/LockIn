import React, { useMemo } from 'react';
import { FocusTimeWidget } from './components/FocusTimeWidget';
import { TasksWidget } from './components/TasksWidget';
import { StreakWidget } from './components/StreakWidget';
import { ActivityWidget } from './components/ActivityWidget';
import { QuickActions } from './components/QuickActions';
import { RecentNotes } from './components/RecentNotes';
import { AICoachWidget } from './components/AICoachWidget';
import { motion } from 'framer-motion';
import { useApp } from '@/store/AppProvider';
import { getGreeting } from '@/lib/format';
import { getHeatmapData } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import { isDemoMode } from '@/lib/demoData';

import { AIBurnoutBadge } from './components/AIBurnoutBadge';

function FocusHeatmap() {
  const { state } = useApp();
  const data = useMemo(() => getHeatmapData(state.sessions, 8), [state.sessions]);
  const max = useMemo(() => Math.max(...data.map(d => d.minutes), 1), [data]);
  return (
    <div className="col-span-12">
      <div className="p-5 rounded-2xl border border-border bg-card">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Focus Heatmap</h3>
        <div className="flex gap-1 flex-wrap">
          {data.map(d => (
            <div key={d.date} title={`${d.date}: ${d.minutes}m`}
              className={cn('w-3 h-3 rounded-sm', d.minutes === 0 && 'bg-accent')}
              style={d.minutes > 0 ? { backgroundColor: `hsl(var(--foreground) / ${0.12 + (d.minutes / max) * 0.5})` } : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export const Dashboard: React.FC = () => {
  const { state } = useApp();
  const demo = isDemoMode();
  return (
    <div className="flex-1 p-8 max-w-5xl mx-auto w-full overflow-y-auto">
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <motion.h1 initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
              className="text-3xl font-bold tracking-tight mb-1">
              {getGreeting()}, {state.settings.name || 'there'}.
            </motion.h1>
            <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
              className="text-muted-foreground text-sm">
              Here is what is happening today.
            </motion.p>
          </div>
          <div className="flex items-center gap-3">
            {demo && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase border border-amber-500/30 bg-amber-500/10 text-amber-400">
                Demo
              </span>
            )}
            <AIBurnoutBadge />
          </div>
        </div>
      </header>
      <div className="grid grid-cols-12 gap-6">
        <AICoachWidget />
        <div className="col-span-12 lg:col-span-8 grid grid-cols-2 gap-6">
          <FocusTimeWidget />
          <StreakWidget />
          <div className="col-span-2"><ActivityWidget /></div>
        </div>
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <QuickActions />
          <TasksWidget />
        </div>
        <FocusHeatmap />
        <div className="col-span-12"><RecentNotes /></div>
      </div>
    </div>
  );
};
