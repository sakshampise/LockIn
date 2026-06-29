export type ViewId = 'dashboard' | 'workspace' | 'tasks' | 'focus' | 'analytics' | 'settings' | 'notion-import' | 'monitor';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';
export type AIInsightKind =
  | 'dashboard'
  | 'session_plan'
  | 'session_reflection'
  | 'weekly_report'
  | 'distraction_patterns'
  | 'productive_hours'
  | 'task_summary'
  | 'recommendation'
  | 'smart_planner'
  | 'daily_review'
  | 'task_breakdown'
  | 'burnout_detection'
  | 'prioritization';

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

export interface AIInsight {
  id: string;
  kind: AIInsightKind;
  title: string;
  summary: string;
  recommendations: string[];
  evidence: Record<string, unknown>;
  relatedSessionId: string | null;
  relatedTaskId: string | null;
  sourceStart: string | null;
  sourceEnd: string | null;
  provider: string;
  model: string;
  confidence: number | null;
  generatedAt: string;
  createdAt: string;
}

export interface UserSettings {
  name: string;
  dailyFocusGoalMinutes: number;
  theme: 'dark' | 'light';
  cloudAiEnabled: boolean;
}

export type WorkflowRunStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'retrying' | 'scheduled' | 'cancelled' | 'dead_letter';

export interface WorkflowRun {
  id: string;
  workflowName: string;
  status: WorkflowRunStatus;
  metadata: Record<string, any>;
  attemptCount: number;
  workerId: string | null;
  lastError: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  idempotencyKey: string;
  logs: any[];
}

/** Serializable break/focus block used to reconstruct a session plan after page refresh. */
export interface StoredSessionPlan {
  focusDurationMinutes: number;
  breakMode: 'auto' | 'off';
}

export interface AppState {
  pages: Page[];
  tasks: Task[];
  focusPresets: FocusPreset[];
  sessions: FocusSession[];
  interruptions: Interruption[];
  aiInsights: AIInsight[];
  workflowRuns: WorkflowRun[];
  settings: UserSettings;
  activeView: ViewId;
  activePageId: string | null;
  activeFocusSessionId: string | null;
  activeFocusPresetId: string | null;
  /** The session plan used to start the active focus session. Null when no session is running. */
  activeFocusSessionPlan: StoredSessionPlan | null;
  loading: boolean;
  error: string | null;
}
