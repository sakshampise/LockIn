import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, Clock, Sparkles, Target, TrendingUp, AlertTriangle, CheckCircle, Flame } from 'lucide-react';
import { useApp } from '@/store/AppProvider';
import { formatDuration, relativeTime } from '@/lib/format';
import {
  getPeriodFocusMinutes,
  getCompletionRate,
  getDeepWorkScore,
  getHeatmapData,
  getInterruptionReasonStats,
  getBurnoutRisk,
  getWeeklyBarData,
  getStreakCalendar,
} from '@/lib/analytics';
import { Card } from '@/components/ui/GlassPanel';
import { cn } from '@/lib/utils';
import { isAICoachEnabled } from '@/lib/features';

type Period = 'daily' | 'weekly' | 'monthly';

const PERIOD_DAYS: Record<Period, number> = { daily: 1, weekly: 7, monthly: 30 };

const BURNOUT_CONFIG = {
  low: { label: 'Low', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle },
  medium: { label: 'Medium', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: AlertTriangle },
  high: { label: 'High', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: AlertTriangle },
};

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

function WeeklyBarChart({ data }: { data: { label: string; minutes: number; date: string }[] }) {
  const max = Math.max(...data.map(d => d.minutes), 1);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="flex items-end gap-2 h-28">
      {data.map(d => {
        const pct = (d.minutes / max) * 100;
        const isToday = d.date === today;
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
            <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {d.minutes > 0 ? `${d.minutes}m` : ''}
            </span>
            <div className="w-full relative flex items-end rounded-sm overflow-hidden" style={{ height: 80 }}>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(pct, d.minutes > 0 ? 4 : 0)}%` }}
                transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
                className={cn(
                  'w-full rounded-sm transition-colors',
                  isToday ? 'bg-foreground/50' : 'bg-foreground/20 group-hover:bg-foreground/30',
                )}
              />
            </div>
            <span className={cn('text-[10px] font-medium', isToday ? 'text-foreground' : 'text-muted-foreground')}>
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function StreakCalendar({ sessions }: { sessions: Parameters<typeof getStreakCalendar>[0] }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const calMap = useMemo(() => getStreakCalendar(sessions, year, month), [sessions, year, month]);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const monthName = now.toLocaleString('default', { month: 'long' });

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2">{monthName} {year}</p>
      <div className="grid grid-cols-7 gap-1">
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <span key={i} className="text-[9px] text-center text-muted-foreground/60 font-medium">{d}</span>
        ))}
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} />;
          const key = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const active = calMap.has(key);
          const isToday = day === now.getDate();
          return (
            <div key={key}
              className={cn(
                'w-full aspect-square rounded-sm flex items-center justify-center text-[9px] font-medium',
                active ? 'bg-foreground/40 text-background' : 'bg-accent text-muted-foreground',
                isToday && !active && 'ring-1 ring-foreground/30',
              )}>
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InterruptionBar({ reason, count, max }: { reason: string; count: number; max: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="truncate text-sm">{reason}</span>
        <span className="text-muted-foreground ml-2 shrink-0">{count}</span>
      </div>
      <div className="w-full h-1.5 bg-accent rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(count / max) * 100}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full bg-foreground/40 rounded-full"
        />
      </div>
    </div>
  );
}

export const Analytics: React.FC = () => {
  const { state } = useApp();
  const [period, setPeriod] = useState<Period>('weekly');
  const aiEnabled = isAICoachEnabled();
  const days = PERIOD_DAYS[period];

  const focusMin = useMemo(() => getPeriodFocusMinutes(state.sessions, days), [state.sessions, days]);
  const completionRate = useMemo(() => getCompletionRate(state.tasks), [state.tasks]);
  const deepWorkScore = useMemo(() => getDeepWorkScore(state.sessions, state.settings.dailyFocusGoalMinutes), [state.sessions, state.settings.dailyFocusGoalMinutes]);
  const heatmap = useMemo(() => getHeatmapData(state.sessions), [state.sessions]);
  const weeklyBars = useMemo(() => getWeeklyBarData(state.sessions), [state.sessions]);
  const reasonStats = useMemo(() => getInterruptionReasonStats(state.interruptions).slice(0, 5), [state.interruptions]);
  const burnoutRisk = useMemo(() => getBurnoutRisk(state.sessions, state.interruptions, state.tasks), [state.sessions, state.interruptions, state.tasks]);
  const interruptionsBySession = useMemo(
    () => new Map(state.interruptions.map(interruption => [interruption.sessionId, interruption.reason || 'Unspecified'])),
    [state.interruptions],
  );
  const recentSessions = useMemo(
    () => [...state.sessions].filter(s => s.endedAt).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()).slice(0, 10),
    [state.sessions],
  );
  const reportInsights = useMemo(
    () => state.aiInsights.filter(insight => ['weekly_report', 'distraction_patterns', 'productive_hours', 'session_reflection'].includes(insight.kind)).slice(0, 6),
    [state.aiInsights],
  );
  const dashboardInsight = useMemo(
    () => state.aiInsights.find(i => i.kind === 'dashboard' || i.kind === 'recommendation'),
    [state.aiInsights],
  );
  const maxInterruptionCount = useMemo(() => Math.max(...reasonStats.map(r => r.count), 1), [reasonStats]);

  const burnoutConfig = BURNOUT_CONFIG[burnoutRisk];
  const BurnoutIcon = burnoutConfig.icon;

  // AI reports are generated automatically in the background
  const isProcessing = useMemo(() => {
    return state.workflowRuns.some(
      run => ['weekly_report', 'distraction_patterns', 'productive_hours'].includes(run.workflowName) && 
             ['queued', 'processing', 'retrying'].includes(run.status)
    );
  }, [state.workflowRuns]);

  const stats = [
    { icon: Clock, label: 'Focus Hours', value: formatDuration(focusMin), sub: `Last ${days} day${days > 1 ? 's' : ''}` },
    { icon: Target, label: 'Completion Rate', value: `${completionRate}%`, sub: `${state.tasks.filter(t => t.done).length}/${state.tasks.length} tasks` },
    { icon: TrendingUp, label: 'Deep Work Score', value: `${deepWorkScore}`, sub: 'Weekly composite' },
  ];

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-8 max-w-5xl mx-auto w-full">
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

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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

      {/* Burnout risk */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className={cn('rounded-2xl border p-4 mb-6 flex items-center gap-4', burnoutConfig.bg)}>
        <BurnoutIcon className={cn('w-5 h-5 shrink-0', burnoutConfig.color)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Burnout Risk: <span className={burnoutConfig.color}>{burnoutConfig.label}</span></p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {burnoutRisk === 'low' && 'Session frequency, interruptions, and task load all look healthy.'}
            {burnoutRisk === 'medium' && 'Some signals of overload — consider lighter sessions or more breaks.'}
            {burnoutRisk === 'high' && 'High risk detected — session drop + interruption spike + overdue tasks. Rest and reset.'}
          </p>
        </div>
      </motion.div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Weekly Focus</h3>
          </div>
          <WeeklyBarChart data={weeklyBars} />
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Streak Calendar</h3>
          </div>
          <StreakCalendar sessions={state.sessions} />
        </Card>
      </div>

      {/* Heatmap + Interruptions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Focus Heatmap</h3>
          </div>
          <Heatmap data={heatmap} />
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-medium mb-4">Interruption Reasons</h3>
          <div className="space-y-3">
            {reasonStats.length > 0 ? reasonStats.map(item => (
              <InterruptionBar key={item.reason} reason={item.reason} count={item.count} max={maxInterruptionCount} />
            )) : (
              <p className="text-sm text-muted-foreground">No interruptions logged yet.</p>
            )}
          </div>
        </Card>
      </div>

      {/* AI top recommendations pinned card */}
      {dashboardInsight && dashboardInsight.recommendations.length > 0 && (
        <Card className="p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Top Recommendations</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {dashboardInsight.recommendations.map(rec => (
              <div key={rec} className="rounded-xl border border-border bg-background/40 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
                → {rec}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* AI Productivity Report */}
      <Card className="p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">AI Productivity Report</h3>
        </div>
        
        {isProcessing && reportInsights.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-xl border border-border bg-background/40 p-3 animate-pulse">
                <div className="h-4 bg-foreground/10 rounded w-1/2 mb-2" />
                <div className="h-3 bg-foreground/5 rounded w-full mb-1.5" />
                <div className="h-3 bg-foreground/5 rounded w-5/6 mb-3" />
                <div className="h-2 bg-foreground/5 rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : reportInsights.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {reportInsights.map(insight => (
              <div key={insight.id} className="rounded-xl border border-border bg-background/40 p-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="text-sm font-medium leading-snug">{insight.title}</h4>
                  {insight.confidence !== null && (
                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-accent text-muted-foreground">
                      {Math.round(insight.confidence * 100)}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-2">{insight.summary}</p>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-[10px] text-muted-foreground/60">{relativeTime(insight.generatedAt)}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    insight.provider === 'sarvam'
                      ? 'bg-violet-500/10 text-violet-400'
                      : 'bg-foreground/5 text-muted-foreground/60'
                  }`}>
                    {insight.provider === 'sarvam' ? '✦ Sarvam AI' : 'Local'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {aiEnabled
              ? 'Complete a few focus sessions to unlock AI productivity insights.'
              : 'Enable Cloud AI in Settings to get personalized coaching reports.'}
          </p>
        )}
      </Card>

      {/* Session History */}
      <Card className="p-5">
        <h3 className="text-sm font-medium mb-4">Session History</h3>
        <div className="space-y-2">
          {recentSessions.map(s => (
            <div key={s.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
              <div>
                <p className="text-sm">{s.targetTitle}</p>
                <p className="text-xs text-muted-foreground">{new Date(s.startedAt).toLocaleDateString()}</p>
                {s.interrupted && interruptionsBySession.get(s.id) && (
                  <p className="text-xs text-muted-foreground mt-0.5">Reason: {interruptionsBySession.get(s.id)}</p>
                )}
              </div>
              <div className="text-right">
                <span className="text-sm font-medium">{s.durationMinutes}m</span>
                <span className={cn('ml-2 text-[10px] uppercase font-medium', s.interrupted ? 'text-red-400' : s.completed ? 'text-emerald-400/80' : 'text-muted-foreground')}>
                  {s.interrupted ? 'Interrupted' : s.completed ? 'Completed' : 'In progress'}
                </span>
              </div>
            </div>
          ))}
          {recentSessions.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No session history yet</p>
              <p className="text-xs mt-1">Completed focus sessions will appear here.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
