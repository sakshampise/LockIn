import type { FocusSession } from '@/types';
import { isSameDay, isToday } from '@/lib/format';

export function getTodayFocusMinutes(sessions: FocusSession[]): number {
  return sessions
    .filter(s => s.completed && isToday(s.startedAt))
    .reduce((sum, s) => sum + s.durationMinutes, 0);
}

export function getFocusStreak(sessions: FocusSession[]): number {
  const days = new Set(
    sessions.filter(s => s.completed).map(s => new Date(s.startedAt).toDateString())
  );
  let streak = 0;
  const d = new Date();
  while (days.has(d.toDateString())) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function getWeeklyActivity(sessions: FocusSession[]): number[] {
  const result = [0, 0, 0, 0, 0, 0, 0];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    result[6 - i] = sessions
      .filter(s => s.completed && isSameDay(s.startedAt, d))
      .reduce((sum, s) => sum + s.durationMinutes, 0);
  }
  return result;
}

export function getHeatmapData(sessions: FocusSession[], weeks = 12): { date: string; minutes: number }[] {
  const map = new Map<string, number>();
  sessions.filter(s => s.completed).forEach(s => {
    const key = new Date(s.startedAt).toISOString().slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + s.durationMinutes);
  });
  const result: { date: string; minutes: number }[] = [];
  const d = new Date();
  d.setDate(d.getDate() - weeks * 7);
  for (let i = 0; i < weeks * 7; i++) {
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, minutes: map.get(key) ?? 0 });
    d.setDate(d.getDate() + 1);
  }
  return result;
}

export function getCompletionRate(tasks: { done: boolean }[]): number {
  if (tasks.length === 0) return 0;
  return Math.round((tasks.filter(t => t.done).length / tasks.length) * 100);
}

export function getDeepWorkScore(sessions: FocusSession[], goalMinutes: number): number {
  const weekSessions = sessions.filter(s => {
    const diff = Date.now() - new Date(s.startedAt).getTime();
    return diff < 7 * 86400000 && s.completed;
  });
  const totalMin = weekSessions.reduce((s, x) => s + x.durationMinutes, 0);
  const completionRate = weekSessions.length ? weekSessions.filter(s => !s.interrupted).length / weekSessions.length : 0;
  const goalProgress = Math.min(totalMin / (goalMinutes * 7), 1);
  return Math.round((goalProgress * 0.6 + completionRate * 0.4) * 100);
}

export function getPeriodFocusMinutes(sessions: FocusSession[], days: number): number {
  const cutoff = Date.now() - days * 86400000;
  return sessions
    .filter(s => s.completed && new Date(s.startedAt).getTime() >= cutoff)
    .reduce((sum, s) => sum + s.durationMinutes, 0);
}
