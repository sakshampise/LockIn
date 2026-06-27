import React, { useState } from 'react';
import { Timer, Activity, Tag, Play } from 'lucide-react';
import { useApp } from '@/store/AppProvider';
import { formatDuration, formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { getTodayFocusMinutes } from '@/lib/analytics';

type Tab = 'properties' | 'timer' | 'activity';

export const ContextPanel: React.FC = () => {
  const { state, startFocus, setView } = useApp();
  const [tab, setTab] = useState<Tab>('timer');
  const page = state.pages.find(p => p.id === state.activePageId);
  const activeSession = state.sessions.find(s => s.id === state.activeFocusSessionId);
  const upcomingTasks = state.tasks.filter(t => !t.done).slice(0, 4);
  const todayMin = getTodayFocusMinutes(state.sessions);

  const tabs: { id: Tab; icon: typeof Timer; label: string }[] = [
    { id: 'properties', icon: Tag, label: 'Properties' },
    { id: 'timer', icon: Timer, label: 'Timer' },
    { id: 'activity', icon: Activity, label: 'Activity' },
  ];

  return (
    <aside className="w-72 border-l border-border bg-card/10 backdrop-blur-xl p-4 flex flex-col h-full overflow-y-auto shrink-0">
      <div className="flex gap-1 p-1 rounded-lg bg-accent/50 mb-6">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn('flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-medium transition-colors', tab === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')}>
            <t.icon className="w-3 h-3" />{t.label}
          </button>
        ))}
      </div>

      {tab === 'properties' && (
        <div className="space-y-4 flex-1">
          {page ? (
            <>
              <div><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Title</span><p className="text-sm font-medium mt-1">{page.title}</p></div>
              {page.tag && <div><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Tag</span><p className="text-sm mt-1">{page.tag}</p></div>}
              <div><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Updated</span><p className="text-sm mt-1">{new Date(page.updatedAt).toLocaleDateString()}</p></div>
              <div><span className="text-[10px] uppercase tracking-wider text-muted-foreground">Words</span><p className="text-sm mt-1">{page.content.split(/\s+/).filter(Boolean).length}</p></div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Select a page to view properties</p>
          )}
        </div>
      )}

      {tab === 'timer' && (
        <div className="flex-1 flex flex-col">
          {activeSession ? (
            <div className="rounded-2xl border border-border bg-card/50 p-5 text-center mb-4">
              <p className="text-xs text-muted-foreground mb-2">Active Session</p>
              <p className="text-sm font-medium mb-1 truncate">{activeSession.targetTitle}</p>
              <button onClick={() => setView('focus')} className="text-xs text-foreground/70 hover:text-foreground mt-2">View timer →</button>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-border bg-card/50 p-5 text-center mb-4">
                <Timer className="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-2xl font-light tabular-nums mb-1">{formatTime(state.settings.defaultSessionMinutes * 60)}</p>
                <p className="text-xs text-muted-foreground">Default session</p>
              </div>
              <button
                onClick={() => page ? startFocus(page.id, 'page', page.title) : setView('focus')}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity mb-4"
              >
                <Play className="w-4 h-4" />Start Focus
              </button>
            </>
          )}
          <div className="mt-auto pt-4 border-t border-border/50">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Today</p>
            <p className="text-lg font-semibold">{formatDuration(todayMin)}</p>
            <div className="w-full h-1 bg-accent rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-foreground/50 rounded-full" style={{ width: `${Math.min(100, (todayMin / state.settings.dailyFocusGoalMinutes) * 100)}%` }} />
            </div>
          </div>
        </div>
      )}

      {tab === 'activity' && (
        <div className="flex-1 space-y-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Upcoming Tasks</p>
          {upcomingTasks.map(t => (
            <div key={t.id} className="rounded-xl border border-border p-3 bg-card/30 hover:bg-card/50 transition-colors cursor-pointer group" onClick={() => startFocus(t.id, 'task', t.title)}>
              <p className="text-sm font-medium truncate">{t.title}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-muted-foreground capitalize">{t.priority}</span>
                <Play className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}
          {upcomingTasks.length === 0 && <p className="text-sm text-muted-foreground">No upcoming tasks</p>}
        </div>
      )}
    </aside>
  );
};
