import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, Clock, Target, TrendingUp } from 'lucide-react';
import { useApp } from '@/store/AppProvider';
import { formatDuration } from '@/lib/format';
import { getPeriodFocusMinutes, getCompletionRate, getDeepWorkScore, getHeatmapData } from '@/lib/analytics';
import { Card } from '@/components/ui/GlassPanel';
import { cn } from '@/lib/utils';

type Period = 'daily' | 'weekly' | 'monthly';

const PERIOD_DAYS: Record<Period, number> = { daily: 1, weekly: 7, monthly: 30 };

function Heatmap({ data }: { data: { date: string; minutes: number }[] }) {
  const max = Math.max(...data.map(d => d.minutes), 1);
  return (
    <div className="grid grid-flow-col grid-rows-7 gap-1">
      {data.map(d => (
        <div
          key={d.date}
          title={`${d.date}: ${d.minutes}m`}
          className={cn('w-3 h-3 rounded-sm transition-colors', d.minutes === 0 ? 'bg-accent' : '')}
          style={d.minutes > 0 ? { backgroundColor: `hsl(var(--foreground) / ${0.15 + (d.minutes / max) * 0.6})` } : undefined}
        />
      ))}
    </div>
  );
}

export const Analytics: React.FC = () => {
  const { state } = useApp();
  const [period, setPeriod] = useState<Period>('weekly');
  const days = PERIOD_DAYS[period];
  const focusMin = getPeriodFocusMinutes(state.sessions, days);
  const completionRate = getCompletionRate(state.tasks);
  const deepWorkScore = getDeepWorkScore(state.sessions, state.settings.dailyFocusGoalMinutes);
  const heatmap = getHeatmapData(state.sessions);
  const recentSessions = [...state.sessions].filter(s => s.endedAt).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()).slice(0, 10);

  const stats = [
    { icon: Clock, label: 'Focus Hours', value: formatDuration(focusMin), sub: `Last ${days} day${days > 1 ? 's' : ''}` },
    { icon: Target, label: 'Completion Rate', value: `${completionRate}%`, sub: `${state.tasks.filter(t => t.done).length}/${state.tasks.length} tasks` },
    { icon: TrendingUp, label: 'Deep Work Score', value: `${deepWorkScore}`, sub: 'Weekly composite' },
  ];

  return (
    <div className="flex-1 p-8 max-w-5xl mx-auto w-full">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Analytics</h1>
          <p className="text-muted-foreground text-sm">Track your deep work patterns</p>
        </div>
        <div className="flex gap-1 p-1 rounded-lg bg-accent">
          {(['daily', 'weekly', 'monthly'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={cn('px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors', period === p ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')}>
              {p}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="p-5" hover>
              <div className="flex items-center gap-2 mb-3">
                <s.icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <div className="text-3xl font-bold tracking-tight">{s.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="p-5 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Focus Heatmap</h3>
        </div>
        <Heatmap data={heatmap} />
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-medium mb-4">Session History</h3>
        <div className="space-y-2">
          {recentSessions.map(s => (
            <div key={s.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
              <div>
                <p className="text-sm">{s.targetTitle}</p>
                <p className="text-xs text-muted-foreground">{new Date(s.startedAt).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium">{s.durationMinutes}m</span>
                <span className={cn('ml-2 text-[10px] uppercase font-medium', s.interrupted ? 'text-red-400' : s.completed ? 'text-emerald-400/80' : 'text-muted-foreground')}>
                  {s.interrupted ? 'Interrupted' : s.completed ? 'Completed' : 'In progress'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
