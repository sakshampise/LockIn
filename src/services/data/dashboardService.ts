import type { FocusSession, Task } from '@/types';
import {
  getCompletionRate,
  getDeepWorkScore,
  getFocusStreak,
  getPeriodFocusMinutes,
  getTodayFocusMinutes,
  getWeeklyActivity,
} from '@/lib/analytics';

export interface DashboardStats {
  todayFocusMinutes: number;
  completedSessions: number;
  completedTasks: number;
  activeTasks: number;
  currentStreak: number;
  weeklyActivity: number[];
  completionRate: number;
  deepWorkScore: number;
  weeklyFocusMinutes: number;
}

export function getDashboardStats(tasks: Task[], sessions: FocusSession[], dailyGoalMinutes: number): DashboardStats {
  return {
    todayFocusMinutes: getTodayFocusMinutes(sessions),
    completedSessions: sessions.filter(session => session.completed).length,
    completedTasks: tasks.filter(task => task.done).length,
    activeTasks: tasks.filter(task => !task.done).length,
    currentStreak: getFocusStreak(sessions),
    weeklyActivity: getWeeklyActivity(sessions),
    completionRate: getCompletionRate(tasks),
    deepWorkScore: getDeepWorkScore(sessions, dailyGoalMinutes),
    weeklyFocusMinutes: getPeriodFocusMinutes(sessions, 7),
  };
}
