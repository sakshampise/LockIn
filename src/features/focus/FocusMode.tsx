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

export const FocusMode: React.FC = () => {
  const { state, startFocus, endFocus, selectFocusPreset } = useApp();
  const session = state.sessions.find(s => s.id === state.activeFocusSessionId);
  const selectedPreset = state.focusPresets.find(p => p.id === state.activeFocusPresetId) ?? state.focusPresets[0];
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [interruptReason, setInterruptReason] = useState('');
  const [pickerOpen, setPickerOpen] = useState(!session);

  const streak = getFocusStreak(state.sessions);
  const todayMin = getTodayFocusMinutes(state.sessions);

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

  const progress = totalSeconds > 0 ? 1 - secondsLeft / totalSeconds : 0;

  const handleEnd = useCallback((interrupted: boolean) => {
    void endFocus(!interrupted, interrupted, interrupted ? interruptReason : undefined);
    setConfirmEnd(false);
    setInterruptReason('');
    setPickerOpen(true);
  }, [endFocus, interruptReason]);

  if (pickerOpen && !session) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <GlassPanel className="p-8 max-w-lg w-full">
          <h2 className="text-xl font-semibold mb-2">Start Focus Session</h2>
          <p className="text-sm text-muted-foreground mb-6">Select a note or task to focus on</p>
          <label className="text-xs text-muted-foreground mb-1 block">Preset</label>
          <select
            value={selectedPreset?.id ?? ''}
            onChange={e => selectFocusPreset(e.target.value || null)}
            className="w-full mb-4 px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none"
          >
            {state.focusPresets.map(preset => (
              <option key={preset.id} value={preset.id}>
                {preset.name} - {preset.focusDurationMinutes}m
              </option>
            ))}
          </select>
          <div className="space-y-2 max-h-64 overflow-y-auto mb-6">
            {state.pages.map(p => (
              <button key={p.id} onClick={() => { void startFocus(p.id, 'page', p.title, selectedPreset?.id); setPickerOpen(false); }}
                className="w-full text-left px-4 py-3 rounded-xl border border-border hover:bg-accent/50 transition-colors text-sm">
                📄 {p.title}
              </button>
            ))}
            {state.tasks.filter(t => !t.done).map(t => (
              <button key={t.id} onClick={() => { void startFocus(t.id, 'task', t.title, selectedPreset?.id); setPickerOpen(false); }}
                className="w-full text-left px-4 py-3 rounded-xl border border-border hover:bg-accent/50 transition-colors text-sm">
                ✓ {t.title}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Default: {selectedPreset?.focusDurationMinutes ?? state.settings.defaultSessionMinutes} min session</p>
        </GlassPanel>
      </div>
    );
  }

  if (!session) return null;

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
        <p className="text-sm text-muted-foreground mb-4">Ending early will log this as an interruption.</p>
        <Input value={interruptReason} onChange={e => setInterruptReason(e.target.value)} placeholder="Reason (optional)" className="mb-4" />
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setConfirmEnd(false)}>Continue</Button>
          <Button variant="danger" onClick={() => handleEnd(true)}>End Session</Button>
        </div>
      </Modal>
    </div>
  );
};
