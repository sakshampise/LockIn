import type { FocusSession, Interruption, Task } from '@/types';
import { isSameDay, isToday, toLocalDateString } from '@/lib/format';

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
    const key = toLocalDateString(s.startedAt);
    map.set(key, (map.get(key) ?? 0) + s.durationMinutes);
  });
  const result: { date: string; minutes: number }[] = [];
  const d = new Date();
  d.setDate(d.getDate() - weeks * 7);
  for (let i = 0; i < weeks * 7; i++) {
    const key = toLocalDateString(d);
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

export function getInterruptionReasonStats(interruptions: Interruption[]): { reason: string; count: number }[] {
  const counts = new Map<string, number>();
  interruptions.forEach(interruption => {
    const reason = interruption.reason.trim() || 'Unspecified';
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  });
  return [...counts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));
}

export type BurnoutRisk = 'low' | 'medium' | 'high';

export function getBurnoutRisk(
  sessions: FocusSession[],
  interruptions: Interruption[],
  tasks: Task[],
): BurnoutRisk {
  const now = Date.now();
  const week = 7 * 86400000;
  const prevWeek = sessions.filter(s => {
    const t = new Date(s.startedAt).getTime();
    return t >= now - 2 * week && t < now - week;
  });
  const thisWeek = sessions.filter(s => {
    const t = new Date(s.startedAt).getTime();
    return t >= now - week;
  });

  // Drop in session count
  const sessionDrop = prevWeek.length > 0 ? (prevWeek.length - thisWeek.length) / prevWeek.length : 0;

  // Interruption spike this week vs prev
  const prevInterruptions = interruptions.filter(i => {
    const t = new Date(i.timestamp).getTime();
    return t >= now - 2 * week && t < now - week;
  }).length;
  const thisInterruptions = interruptions.filter(i => {
    const t = new Date(i.timestamp).getTime();
    return t >= now - week;
  }).length;
  const interruptionSpike = prevInterruptions > 0
    ? (thisInterruptions - prevInterruptions) / prevInterruptions
    : thisInterruptions > 3 ? 1 : 0;

  // Overdue task ratio
  const today = new Date().toDateString();
  const overdueCount = tasks.filter(t => !t.done && t.dueDate && new Date(t.dueDate).toDateString() < today).length;
  const overdueFraction = tasks.length > 0 ? overdueCount / tasks.length : 0;

  const score = sessionDrop * 0.4 + interruptionSpike * 0.35 + overdueFraction * 0.25;
  if (score >= 0.45) return 'high';
  if (score >= 0.2) return 'medium';
  return 'low';
}

export function getWeeklyBarData(sessions: FocusSession[]): { label: string; minutes: number; date: string }[] {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const result: { label: string; minutes: number; date: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = toLocalDateString(d);
    const minutes = sessions
      .filter(s => s.completed && toLocalDateString(s.startedAt) === key)
      .reduce((sum, s) => sum + s.durationMinutes, 0);
    result.push({ label: days[d.getDay()], minutes, date: key });
  }
  return result;
}

export function getStreakCalendar(
  sessions: FocusSession[],
  year: number,
  month: number,
): Map<string, boolean> {
  const map = new Map<string, boolean>();
  sessions.filter(s => s.completed).forEach(s => {
    const d = new Date(s.startedAt);
    if (d.getFullYear() === year && d.getMonth() === month) {
      map.set(toLocalDateString(d), true);
    }
  });
  return map;
}

export function getProductiveHours(sessions: FocusSession[]): { hour: number; minutes: number }[] {
  const hourMap = new Map<number, number>();
  sessions.filter(s => s.completed).forEach(s => {
    const hour = new Date(s.startedAt).getHours();
    hourMap.set(hour, (hourMap.get(hour) ?? 0) + s.durationMinutes);
  });
  return Array.from({ length: 24 }, (_, i) => ({ hour: i, minutes: hourMap.get(i) ?? 0 }));
}