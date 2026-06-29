import React, { useState, useEffect } from 'react';
import { Timer, Activity, Tag, Play, CheckCircle2, ChevronRight, Settings2 } from 'lucide-react';
import { useApp } from '@/store/AppProvider';
import { formatDuration, formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { getTodayFocusMinutes } from '@/lib/analytics';
import { buildSessionPlan, getActivePhase, type BreakMode } from '@/lib/breakPlanner';

type Tab = 'properties' | 'timer' | 'activity';

export const ContextPanel: React.FC = () => {
  const { state, startFocus, setView } = useApp();
  const [tab, setTab] = useState<Tab>('timer');
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [breakMode, setBreakMode] = useState<BreakMode>('auto');
  
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const int = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(int);
  }, []);

  const page = state.pages.find(p => p.id === state.activePageId);
  const activeSession = state.sessions.find(s => s.id === state.activeFocusSessionId);
  const activePlan = state.activeFocusSessionPlan;
  
  const upcomingTasks = state.tasks.filter(t => !t.done).slice(0, 4);
  const todayMin = getTodayFocusMinutes(state.sessions);

  const tabs: { id: Tab; icon: typeof Timer; label: string }[] = [
    { id: 'properties', icon: Tag, label: 'Properties' },
    { id: 'timer', icon: Timer, label: 'Timer' },
    { id: 'activity', icon: Activity, label: 'Activity' },
  ];

  const plan = buildSessionPlan(durationMinutes, breakMode);
  
  const elapsedSeconds = activeSession ? Math.max(0, Math.floor((now - new Date(activeSession.startedAt).getTime()) / 1000)) : 0;
  const activeFullPlan = activePlan ? buildSessionPlan(activePlan.focusDurationMinutes, activePlan.breakMode) : null;
  const activePhase = activeFullPlan ? getActivePhase(activeFullPlan, elapsedSeconds) : null;

  return (
    <aside className="w-72 border-l border-border bg-card/10 backdrop-blur-xl p-4 flex flex-col h-full overflow-y-auto shrink-0">
      <div className="flex gap-1 p-1 rounded-lg bg-accent/50 mb-6">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn('flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-medium transition-colors', tab === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
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
          {activeSession && activePhase ? (
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold animate-pulse">Session Active</span>
                <button onClick={() => setView('focus')} className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"><Settings2 className="w-4 h-4" /></button>
              </div>
              <div className="rounded-2xl border border-border bg-card/50 p-5 text-center mb-4">
                <p className="text-xs text-muted-foreground mb-1 truncate">{activeSession.targetTitle}</p>
                <p className="text-3xl font-light tabular-nums tracking-tight my-2">
                  {formatTime(activePhase.secondsLeft)}
                </p>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-accent/50 text-[10px] font-medium text-muted-foreground">
                  {activePhase.type === 'focus' ? 'Deep Work' : 'Break Time'}
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Up next</span>
                  <span className="font-medium text-foreground">
                    {activePhase.type === 'focus' && activePhase.nextBreak ? activePhase.nextBreak.label : 
                     activePhase.type === 'break' && activePhase.nextBlock ? activePhase.nextBlock.label : 'Session Complete'}
                  </span>
                </div>
              </div>
              
              <button
                onClick={() => setView('focus')}
                className="w-full mt-6 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Expand View <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Plan Session</span>
              </div>
              
              <div className="rounded-2xl border border-border bg-card/30 p-4 mb-4 space-y-4">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-2">Focus Duration (minutes)</label>
                  <div className="flex gap-1 items-center">
                    <input
                      type="number"
                      min={1}
                      max={720}
                      value={durationMinutes}
                      onChange={e => setDurationMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 bg-accent/50 border-0 rounded text-xs px-2 py-1.5 focus:ring-1 focus:ring-emerald-500 tabular-nums text-foreground font-medium"
                    />
                    <div className="flex-1 flex gap-1 bg-accent/50 p-1 rounded-lg">
                      {[25, 45, 60, 90, 120].map(m => (
                        <button 
                          key={m} 
                          onClick={() => setDurationMinutes(m)}
                          className={cn('flex-1 py-1 rounded text-[10px] font-medium transition-colors', durationMinutes === m ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Breaks</span>
                  <div className="flex items-center gap-1 bg-accent/50 p-0.5 rounded-md">
                    <button onClick={() => setBreakMode('auto')} className={cn('px-2 py-1 rounded text-[10px] font-medium transition-colors', breakMode === 'auto' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}>Auto</button>
                    <button onClick={() => setBreakMode('off')} className={cn('px-2 py-1 rounded text-[10px] font-medium transition-colors', breakMode === 'off' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}>Off</button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Timer className="w-3.5 h-3.5" /> Total Time</span>
                  <span className="font-medium">{formatDuration(plan.totalMinutes)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> Breaks</span>
                  <span className="font-medium">{plan.breaks.length} scheduled</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Est. Finish</span>
                  <span className="font-medium">{plan.estimatedFinish()}</span>
                </div>
              </div>

              <button
                onClick={() => startFocus(page?.id || 'none', page ? 'page' : 'task', page?.title || 'Untargeted Focus', durationMinutes, breakMode)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Play className="w-4 h-4 fill-background" /> Start Focus
              </button>
            </div>
          )}
          <div className="mt-auto pt-4 border-t border-border/50">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Today</p>
            <div className="flex items-end justify-between">
              <p className="text-lg font-semibold tabular-nums">{formatDuration(todayMin)}</p>
              <p className="text-[10px] text-muted-foreground">Goal: {formatDuration(state.settings.dailyFocusGoalMinutes)}</p>
            </div>
            <div className="w-full h-1 bg-accent rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-emerald-400/80 rounded-full transition-all duration-500 ease-out" style={{ width: `${Math.min(100, (todayMin / state.settings.dailyFocusGoalMinutes) * 100)}%` }} />
            </div>
          </div>
        </div>
      )}

      {tab === 'activity' && (
        <div className="flex-1 space-y-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Upcoming Tasks</p>
          {upcomingTasks.map(t => (
            <div key={t.id} className="rounded-xl border border-border p-3 bg-card/30 hover:bg-card/50 transition-colors cursor-pointer group" onClick={() => startFocus(t.id, 'task', t.title, 25, 'auto')}>
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
