import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play, X, Flame, Target } from 'lucide-react';
import { useApp } from '@/store/AppProvider';
import { formatTime, formatDuration } from '@/lib/format';
import { getFocusStreak, getTodayFocusMinutes } from '@/lib/analytics';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GlassPanel } from '@/components/ui/GlassPanel';
import type { FocusPreset } from '@/types';

const END_REASONS = ['Distraction', 'Urgent task', 'Meeting or call', 'Lost focus', 'Other'];

type FocusConfigDraft = {
  focusDurationMinutes: string;
  breakCount: string;
  breakDurationMinutes: string;
  longBreakDurationMinutes: string;
  sessionsBeforeLongBreak: string;
};

function TimerRing({ progress, size = 280 }: { progress: number; size?: number }) {
  const stroke = 3;
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - progress);
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={stroke} opacity={0.3} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="hsl(var(--foreground))" strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        opacity={0.7}
      />
    </svg>
  );
}

function numberValue(value: string, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function draftFromPreset(preset: FocusPreset | undefined, fallbackMinutes: number): FocusConfigDraft {
  return {
    focusDurationMinutes: String(preset?.focusDurationMinutes ?? fallbackMinutes),
    breakCount: String(preset?.breakCount ?? 3),
    breakDurationMinutes: String(preset?.breakDurationMinutes ?? 5),
    longBreakDurationMinutes: String(preset?.longBreakDurationMinutes ?? 15),
    sessionsBeforeLongBreak: String(preset?.sessionsBeforeLongBreak ?? 4),
  };
}

function normalizeDraft(draft: FocusConfigDraft, preset: FocusPreset | undefined, fallbackMinutes: number) {
  return {
    focusDurationMinutes: numberValue(draft.focusDurationMinutes, preset?.focusDurationMinutes ?? fallbackMinutes, 1, 240),
    breakCount: numberValue(draft.breakCount, preset?.breakCount ?? 3, 0, 20),
    breakDurationMinutes: numberValue(draft.breakDurationMinutes, preset?.breakDurationMinutes ?? 5, 1, 120),
    longBreakDurationMinutes: numberValue(draft.longBreakDurationMinutes, preset?.longBreakDurationMinutes ?? 15, 1, 240),
    sessionsBeforeLongBreak: numberValue(draft.sessionsBeforeLongBreak, preset?.sessionsBeforeLongBreak ?? 4, 1, 20),
  };
}

function FocusConfiguration({
  draft,
  onChange,
  onCommit,
}: {
  draft: FocusConfigDraft;
  onChange: (draft: FocusConfigDraft) => void;
  onCommit: () => void;
}) {
  const setField = (key: keyof FocusConfigDraft, value: string) => onChange({ ...draft, [key]: value });
  const commitOnEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') onCommit();
  };

  return (
    <div className="rounded-xl border border-border bg-card/40 p-3 mb-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">Focus minutes</label>
          <Input type="number" min={1} max={240} value={draft.focusDurationMinutes} onChange={e => setField('focusDurationMinutes', e.target.value)} onBlur={onCommit} onKeyDown={commitOnEnter} />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">Breaks</label>
          <Input type="number" min={0} max={20} value={draft.breakCount} onChange={e => setField('breakCount', e.target.value)} onBlur={onCommit} onKeyDown={commitOnEnter} />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">Short break</label>
          <Input type="number" min={1} max={120} value={draft.breakDurationMinutes} onChange={e => setField('breakDurationMinutes', e.target.value)} onBlur={onCommit} onKeyDown={commitOnEnter} />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">Long break</label>
          <Input type="number" min={1} max={240} value={draft.longBreakDurationMinutes} onChange={e => setField('longBreakDurationMinutes', e.target.value)} onBlur={onCommit} onKeyDown={commitOnEnter} />
        </div>
        <div className="col-span-2">
          <label className="text-[10px] text-muted-foreground mb-1 block">Sessions before long break</label>
          <Input type="number" min={1} max={20} value={draft.sessionsBeforeLongBreak} onChange={e => setField('sessionsBeforeLongBreak', e.target.value)} onBlur={onCommit} onKeyDown={commitOnEnter} />
        </div>
      </div>
    </div>
  );
}

export const FocusMode: React.FC = () => {
  const { state, startFocus, endFocus, updateFocusPreset } = useApp();
  const session = state.sessions.find(s => s.id === state.activeFocusSessionId);
  const focusConfig = state.focusPresets.find(p => p.id === state.activeFocusPresetId) ?? state.focusPresets[0];
  const [configDraft, setConfigDraft] = useState(() => draftFromPreset(focusConfig, state.settings.defaultSessionMinutes));
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [selectedEndReason, setSelectedEndReason] = useState('');
  const [customEndReason, setCustomEndReason] = useState('');

  const normalizedConfig = normalizeDraft(configDraft, focusConfig, state.settings.defaultSessionMinutes);
  const hasTargets = state.pages.length > 0 || state.tasks.some(t => !t.done);
  const streak = getFocusStreak(state.sessions);
  const todayMin = getTodayFocusMinutes(state.sessions);

  useEffect(() => {
    if (!session) setConfigDraft(draftFromPreset(focusConfig, state.settings.defaultSessionMinutes));
  }, [focusConfig?.id, focusConfig?.focusDurationMinutes, focusConfig?.breakCount, focusConfig?.breakDurationMinutes, focusConfig?.longBreakDurationMinutes, focusConfig?.sessionsBeforeLongBreak, session, state.settings.defaultSessionMinutes]);

  useEffect(() => {
    if (session && !session.endedAt) {
      const total = session.durationMinutes * 60;
      setTotalSeconds(total);
      const elapsed = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000);
      setSecondsLeft(Math.max(0, total - elapsed));
    }
  }, [session?.id]);

  useEffect(() => {
    if (!session || paused || secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [session, paused, secondsLeft]);

  useEffect(() => {
    if (secondsLeft === 0 && session && !session.endedAt && totalSeconds > 0) {
      void endFocus(true, false);
    }
  }, [secondsLeft, session, totalSeconds, endFocus]);

  const persistConfig = useCallback(async () => {
    if (!focusConfig) return null;
    const nextValues = normalizeDraft(configDraft, focusConfig, state.settings.defaultSessionMinutes);
    const nextConfig: FocusPreset = {
      ...focusConfig,
      name: 'Focus Configuration',
      isDefault: true,
      ...nextValues,
    };
    setConfigDraft(draftFromPreset(nextConfig, state.settings.defaultSessionMinutes));
    await updateFocusPreset(nextConfig);
    return nextConfig;
  }, [configDraft, focusConfig, state.settings.defaultSessionMinutes, updateFocusPreset]);

  const handleStart = useCallback(async (targetId: string, targetType: 'page' | 'task', targetTitle: string) => {
    const savedConfig = await persistConfig();
    const config = savedConfig ?? focusConfig;
    await startFocus(targetId, targetType, targetTitle, config?.id, config ?? undefined);
  }, [focusConfig, persistConfig, startFocus]);

  const resolvedEndReason = selectedEndReason === 'Other' ? customEndReason.trim() : selectedEndReason;
  const canEndEarly = resolvedEndReason.trim().length > 0;

  const handleEnd = useCallback(() => {
    if (!canEndEarly) return;
    void endFocus(false, true, resolvedEndReason);
    setConfirmEnd(false);
    setSelectedEndReason('');
    setCustomEndReason('');
  }, [canEndEarly, endFocus, resolvedEndReason]);

  const progress = totalSeconds > 0 ? 1 - secondsLeft / totalSeconds : 0;

  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <GlassPanel className="p-8 max-w-lg w-full my-auto">
          <h2 className="text-xl font-semibold mb-2">Start Focus Session</h2>
          <p className="text-sm text-muted-foreground mb-6">Set your focus rhythm, then choose a note or task.</p>

          <div className="flex items-center justify-between rounded-xl border border-border bg-card/40 p-4 mb-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Ready timer</p>
              <p className="text-4xl font-light tracking-tighter tabular-nums">{formatTime(normalizedConfig.focusDurationMinutes * 60)}</p>
            </div>
            <div className="text-right text-xs text-muted-foreground space-y-1">
              <p>{normalizedConfig.breakCount} breaks</p>
              <p>{normalizedConfig.breakDurationMinutes}m short / {normalizedConfig.longBreakDurationMinutes}m long</p>
              <p>Long break every {normalizedConfig.sessionsBeforeLongBreak}</p>
            </div>
          </div>

          {focusConfig ? (
            <FocusConfiguration draft={configDraft} onChange={setConfigDraft} onCommit={() => void persistConfig()} />
          ) : (
            <p className="text-sm text-muted-foreground mb-4">Preparing your focus configuration...</p>
          )}

          <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
            {state.pages.map(p => (
              <button key={p.id} onClick={() => void handleStart(p.id, 'page', p.title)}
                className="w-full text-left px-4 py-3 rounded-xl border border-border hover:bg-accent/50 transition-colors text-sm">
                Page - {p.title}
              </button>
            ))}
            {state.tasks.filter(t => !t.done).map(t => (
              <button key={t.id} onClick={() => void handleStart(t.id, 'task', t.title)}
                className="w-full text-left px-4 py-3 rounded-xl border border-border hover:bg-accent/50 transition-colors text-sm">
                Task - {t.title}
              </button>
            ))}
            {!hasTargets && (
              <p className="text-sm text-muted-foreground text-center py-4">Create a page or task to start focusing.</p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Configuration saves automatically and syncs across devices.</p>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="flex-1 relative overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-accent/20" />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full opacity-20 blur-3xl"
        animate={{ x: [0, 30, -20, 0], y: [0, -20, 30, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        style={{ background: 'radial-gradient(circle, hsl(var(--muted-foreground)/0.15), transparent 70%)' }}
      />

      <div className="relative z-10 flex flex-col items-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm mb-2">
            <Target className="w-4 h-4" />
            <span>Focusing on</span>
          </div>
          <h2 className="text-lg font-medium">{session.targetTitle}</h2>
        </motion.div>

        <div className="relative mb-8">
          <TimerRing progress={progress} />
          <GlassPanel className="absolute inset-4 flex flex-col items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.span
                key={secondsLeft}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl font-light tracking-tighter tabular-nums"
              >
                {formatTime(secondsLeft)}
              </motion.span>
            </AnimatePresence>
            <span className="text-xs text-muted-foreground mt-1">{Math.round(progress * 100)}% complete</span>
          </GlassPanel>
        </div>

        <div className="flex items-center gap-4 mb-10">
          <button onClick={() => setPaused(p => !p)} className="p-4 rounded-full border border-border bg-card/50 hover:bg-accent backdrop-blur transition-all active:scale-95">
            {paused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </button>
          <button onClick={() => setConfirmEnd(true)} className="p-4 rounded-full border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 transition-all active:scale-95">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-8 text-center">
          <div>
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1"><Flame className="w-3 h-3" />Streak</div>
            <span className="text-lg font-semibold">{streak}d</span>
          </div>
          <div>
            <div className="text-muted-foreground text-xs mb-1">Today</div>
            <span className="text-lg font-semibold">{formatDuration(todayMin)}</span>
          </div>
          <div>
            <div className="text-muted-foreground text-xs mb-1">Session</div>
            <span className="text-lg font-semibold">{session.durationMinutes}m</span>
          </div>
        </div>
      </div>

      <Modal open={confirmEnd} onClose={() => setConfirmEnd(false)} title="End focus session?">
        <p className="text-sm text-muted-foreground mb-4">Choose a reason before ending early. This helps future analytics identify interruption patterns.</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {END_REASONS.map(reason => (
            <button
              key={reason}
              onClick={() => setSelectedEndReason(reason)}
              className={`px-3 py-2 rounded-lg border text-sm transition-colors ${selectedEndReason === reason ? 'border-foreground bg-accent text-foreground' : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent/50'}`}
            >
              {reason}
            </button>
          ))}
        </div>
        {selectedEndReason === 'Other' && (
          <Input value={customEndReason} onChange={e => setCustomEndReason(e.target.value)} placeholder="Enter reason" className="mb-4" autoFocus />
        )}
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setConfirmEnd(false)}>Continue</Button>
          <Button variant="danger" onClick={handleEnd} disabled={!canEndEarly}>End Session</Button>
        </div>
      </Modal>
    </div>
  );
};