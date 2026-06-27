export type ViewId = 'dashboard' | 'workspace' | 'tasks' | 'focus' | 'analytics' | 'settings' | 'notion-import';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Page {
  id: string;
  title: string;
  content: string;
  parentId: string | null;
  icon?: string;
  tag?: string;
  updatedAt: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  done: boolean;
  priority: Priority;
  dueDate: string | null;
  recurrence: Recurrence;
  pageId: string | null;
  sortOrder: number;
  createdAt: string;
  completedAt: string | null;
}

export interface FocusPreset {
  id: string;
  name: string;
  focusDurationMinutes: number;
  breakCount: number;
  breakDurationMinutes: number;
  longBreakDurationMinutes: number;
  sessionsBeforeLongBreak: number;
  sortOrder: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FocusSession {
  id: string;
  targetId: string;
  targetType: 'page' | 'task';
  targetTitle: string;
  presetId: string | null;
  durationMinutes: number;
  plannedDurationMinutes: number | null;
  actualDurationSeconds: number | null;
  interruptionCount: number;
  status: 'active' | 'completed' | 'interrupted' | 'cancelled';
  startedAt: string;
  endedAt: string | null;
  completed: boolean;
  interrupted: boolean;
}

export interface Interruption {
  id: string;
  sessionId: string;
  reason: string;
  timestamp: string;
}

export interface UserSettings {
  name: string;
  dailyFocusGoalMinutes: number;
  defaultSessionMinutes: number;
  theme: 'dark' | 'light';
}

export interface AppState {
  pages: Page[];
  tasks: Task[];
  focusPresets: FocusPreset[];
  sessions: FocusSession[];
  interruptions: Interruption[];
  settings: UserSettings;
  activeView: ViewId;
  activePageId: string | null;
  activeFocusSessionId: string | null;
  activeFocusPresetId: string | null;
  loading: boolean;
  error: string | null;
}
