import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play, X, Flame, Target, Coffee } from 'lucide-react';
import { useApp } from '@/store/AppProvider';
import { formatTime, formatDuration } from '@/lib/format';
import { getFocusStreak, getTodayFocusMinutes } from '@/lib/analytics';
import { buildSessionPlan, getActivePhase } from '@/lib/breakPlanner';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { SmartDayPlannerWidget } from './components/SmartDayPlannerWidget';

const END_REASONS = ['Distraction', 'Urgent task', 'Meeting or call', 'Lost focus', 'Other'];

function TimerRing({ progress, size = 280 }: { progress: number; size?: number }) {
  const stroke = 3;
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(1, progress)));
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

function getMotivationalMessage(progress: number, secondsLeft: number): string {
  const mins = Math.floor(secondsLeft / 60);
  if (progress >= 0.95) return '🏁 Almost there — push through!';
  if (progress >= 0.75) return '💪 Final stretch, stay focused';
  if (progress >= 0.5) return '⚡ Halfway — great momentum';
  if (progress >= 0.25) return '🎯 In the zone, keep going';
  if (mins <= 5 && mins > 0) return `⏱ ${mins} minute${mins > 1 ? 's' : ''} left`;
  return '🔒 Deep work in progress';
}

export const FocusMode: React.FC = () => {
  const { state, endFocus } = useApp();
  const session = useMemo(
    () => state.sessions.find(s => s.id === state.activeFocusSessionId),
    [state.sessions, state.activeFocusSessionId],
  );

  // Reconstruct the exact plan used to start this session
  const plan = useMemo(() => {
    if (!session) return null;
    const stored = state.activeFocusSessionPlan;
    if (stored) return buildSessionPlan(stored.focusDurationMinutes, stored.breakMode);
    // Fallback: reconstruct from session duration with auto breaks
    return buildSessionPlan(session.durationMinutes, 'auto');
  }, [session, state.activeFocusSessionPlan]);

  // Total wall-clock seconds (includes break time)
  const totalWallSeconds = useMemo(() => (plan?.totalMinutes ?? session?.durationMinutes ?? 0) * 60, [plan, session]);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [selectedEndReason, setSelectedEndReason] = useState('');
  const [customEndReason, setCustomEndReason] = useState('');

  // Sync elapsed time from real session start time
  useEffect(() => {
    if (!session) return;
    const compute = () => Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000);
    setElapsedSeconds(compute());
  }, [session?.id]);

  // Tick
  useEffect(() => {
    if (!session || paused) return;
    const id = setInterval(() => {
      setElapsedSeconds(prev => {
        const next = prev + 1;
        if (next >= totalWallSeconds) clearInterval(id);
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [session, paused, totalWallSeconds]);

  // Auto-complete when wall time elapses
  useEffect(() => {
    if (elapsedSeconds >= totalWallSeconds && totalWallSeconds > 0 && session && !session.endedAt) {
      void endFocus(true, false);
    }
  }, [elapsedSeconds, totalWallSeconds, session, endFocus]);

  const streak = useMemo(() => getFocusStreak(state.sessions), [state.sessions]);
  const todayMin = useMemo(() => getTodayFocusMinutes(state.sessions), [state.sessions]);

  // Derive active phase from plan
  const activePhase = useMemo(() => {
    if (!plan) return null;
    return getActivePhase(plan, elapsedSeconds);
  }, [plan, elapsedSeconds]);

  // Overall timer progress (across the full wall-clock)
  const overallProgress = totalWallSeconds > 0 ? Math.min(1, elapsedSeconds / totalWallSeconds) : 0;

  // What to display on the ring: the phase countdown
  const displaySeconds = activePhase?.secondsLeft ?? Math.max(0, totalWallSeconds - elapsedSeconds);

  const resolvedEndReason = selectedEndReason === 'Other' ? customEndReason.trim() : selectedEndReason;
  const canEndEarly = resolvedEndReason.trim().length > 0;

  const handleEnd = useCallback(() => {
    if (!canEndEarly) return;
    void endFocus(false, true, resolvedEndReason);
    setConfirmEnd(false);
    setSelectedEndReason('');
    setCustomEndReason('');
  }, [canEndEarly, endFocus, resolvedEndReason]);

  if (!session || !plan) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <SmartDayPlannerWidget />
      </div>
    );
  }

  const isBreak = activePhase?.type === 'break';

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
        {/* Session title */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm mb-2">
            <Target className="w-4 h-4" />
            <span>{isBreak ? 'Break time' : 'Focusing on'}</span>
          </div>
          <h2 className="text-lg font-medium">{session.targetTitle}</h2>
        </motion.div>

        {/* Ring timer */}
        <div className="relative mb-4">
          <TimerRing progress={isBreak ? 1 - (activePhase.secondsLeft / ((activePhase.slot.durationMinutes) * 60)) : overallProgress} />
          <GlassPanel className="absolute inset-4 flex flex-col items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.span
                key={Math.floor(displaySeconds / 10)}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`text-5xl font-light tracking-tighter tabular-nums ${isBreak ? 'text-emerald-400' : ''}`}
              >
                {formatTime(displaySeconds)}
              </motion.span>
            </AnimatePresence>
            <span className="text-xs text-muted-foreground mt-1">
              {isBreak ? 'Break' : `${Math.round(overallProgress * 100)}% complete`}
            </span>
          </GlassPanel>
        </div>

        {/* Motivational / break message */}
        <AnimatePresence mode="wait">
          {isBreak ? (
            <motion.div
              key="break-msg"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-xs text-emerald-400 mb-3 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5"
            >
              <Coffee className="w-3.5 h-3.5" />
              Rest and recharge
            </motion.div>
          ) : (
            <motion.p
              key={Math.floor(overallProgress * 4)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-muted-foreground mb-3 h-5"
            >
              {getMotivationalMessage(overallProgress, totalWallSeconds - elapsedSeconds)}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Upcoming break / next focus block hint */}
        <AnimatePresence>
          {!isBreak && activePhase?.type === 'focus' && activePhase.nextBreak && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground mb-5 px-3 py-1.5 rounded-full border border-border bg-card/40"
            >
              <Coffee className="w-3 h-3" />
              {activePhase.nextBreak.isLong ? 'Long break' : 'Break'} at {activePhase.nextBreak.atMinute}m
            </motion.div>
          )}
          {isBreak && activePhase?.type === 'break' && activePhase.nextBlock && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground mb-5 px-3 py-1.5 rounded-full border border-border bg-card/40"
            >
              <Target className="w-3 h-3" />
              Focus resumes in {formatTime(activePhase.secondsLeft)}
            </motion.div>
          )}
          {!isBreak && (!activePhase || activePhase.type !== 'focus' || !activePhase.nextBreak) && (
            <div className="mb-5 h-5" />
          )}
        </AnimatePresence>

        {/* Controls */}
        <div className="flex items-center gap-4 mb-10">
          <button
            aria-label={paused ? 'Resume focus session' : 'Pause focus session'}
            onClick={() => setPaused(p => !p)}
            className="p-4 rounded-full border border-border bg-card/50 hover:bg-accent backdrop-blur transition-all active:scale-95"
          >
            {paused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </button>
          <button
            aria-label="End focus session"
            onClick={() => setConfirmEnd(true)}
            className="p-4 rounded-full border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 transition-all active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats */}
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
          {plan.breaks.length > 0 && (
            <div>
              <div className="text-muted-foreground text-xs mb-1">Breaks</div>
              <span className="text-lg font-semibold">{plan.breaks.length}</span>
            </div>
          )}
        </div>
      </div>

      {/* End session modal */}
      <Modal open={confirmEnd} onClose={() => setConfirmEnd(false)} title="End focus session?">
        <p className="text-sm text-muted-foreground mb-4">
          Choose a reason before ending early. This helps future analytics identify interruption patterns.
        </p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {END_REASONS.map(reason => (
            <button
              key={reason}
              onClick={() => setSelectedEndReason(reason)}
              className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                selectedEndReason === reason
                  ? 'border-foreground bg-accent text-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              {reason}
            </button>
          ))}
        </div>
        {selectedEndReason === 'Other' && (
          <Input
            value={customEndReason}
            onChange={e => setCustomEndReason(e.target.value)}
            placeholder="Enter reason"
            className="mb-4"
            autoFocus
          />
        )}
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setConfirmEnd(false)}>Continue</Button>
          <Button variant="danger" onClick={handleEnd} disabled={!canEndEarly}>End Session</Button>
        </div>
      </Modal>
    </div>
  );
};
