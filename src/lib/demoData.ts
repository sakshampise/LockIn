/**
 * Demo data for hackathon judging.
 * Only active when VITE_DEMO_MODE=true.
 * Never bypasses authentication — data is merged with real Supabase data
 * only when real data is sparse (< 3 completed sessions).
 */
import type { AIInsight, FocusSession, Interruption, Page, Task } from '@/types';

const NOW = Date.now();
const DAY = 86400000;

function daysAgo(n: number, hourOffset = 9): string {
  return new Date(NOW - n * DAY + hourOffset * 3600000).toISOString();
}

function seededId(prefix: string, n: number): string {
  return `demo-${prefix}-${n}`;
}

export const DEMO_PAGES: Page[] = [
  {
    id: seededId('page', 1),
    title: 'LockIn Hackathon Strategy',
    content: `# Hackathon Strategy\n\n## Goal\nMaximize judging score across all bonus tracks.\n\n## Tracks\n- Human Experience & Productivity (primary)\n- Sarvam AI (AI coaching)\n- Render (scheduled workflows)\n- Neo4j AuraDB (graph intelligence)\n\n## Timeline\n- Day 1: Core product polish\n- Day 2: AI integration\n- Day 3: Demo prep\n`,
    parentId: null,
    icon: '🎯',
    updatedAt: daysAgo(1),
    createdAt: daysAgo(14),
  },
  {
    id: seededId('page', 2),
    title: 'AI Coach Architecture',
    content: `# AI Coach Architecture\n\n## Sarvam AI Integration\nThe AI coach uses Sarvam-30b to analyze workspace context and generate personalized productivity coaching.\n\n## Insight Types\n- Dashboard coaching\n- Session planning\n- Session reflections\n- Weekly reports\n- Distraction pattern analysis\n- Productive hours detection\n`,
    parentId: seededId('page', 1),
    icon: '🧠',
    updatedAt: daysAgo(2),
    createdAt: daysAgo(12),
  },
  {
    id: seededId('page', 3),
    title: 'Deep Work Principles',
    content: `# Deep Work Principles\n\n## Core Rules\n1. Work deeply — eliminate distractions\n2. Embrace boredom — don't switch on impulse\n3. Quit social media — simplify your digital life\n4. Drain the shallows — protect deep work hours\n\n## Personal Deep Work Schedule\n- Morning: 9am - 12pm (peak cognition)\n- Afternoon: 3pm - 5pm (secondary peak)\n- Evening: Review and planning only\n`,
    parentId: null,
    icon: '📚',
    updatedAt: daysAgo(3),
    createdAt: daysAgo(20),
  },
  {
    id: seededId('page', 4),
    title: 'Weekly Review Template',
    content: `# Weekly Review\n\n## What went well this week?\n\n## What could be improved?\n\n## Focus session quality\n\n## Key wins\n\n## Next week's priorities\n`,
    parentId: null,
    icon: '📊',
    updatedAt: daysAgo(7),
    createdAt: daysAgo(30),
  },
];

export const DEMO_TASKS: Task[] = [
  {
    id: seededId('task', 1),
    title: 'Deploy AI coach Edge Function to Supabase',
    description: 'Configure SARVAM_API_KEY and SUPABASE_SERVICE_ROLE_KEY, then deploy via dashboard',
    done: false,
    priority: 'urgent',
    dueDate: new Date(NOW + DAY).toISOString().slice(0, 10),
    recurrence: 'none',
    pageId: seededId('page', 1),
    sortOrder: 0,
    createdAt: daysAgo(7),
    completedAt: null,
  },
  {
    id: seededId('task', 2),
    title: 'Run pending Supabase migrations',
    description: 'Apply ai_insights and workflow_runs migrations via SQL Editor',
    done: false,
    priority: 'high',
    dueDate: new Date(NOW + DAY).toISOString().slice(0, 10),
    recurrence: 'none',
    pageId: seededId('page', 1),
    sortOrder: 1,
    createdAt: daysAgo(5),
    completedAt: null,
  },
  {
    id: seededId('task', 3),
    title: 'Record demo video walkthrough',
    description: 'Show dashboard, focus session, analytics, AI coaching',
    done: false,
    priority: 'high',
    dueDate: new Date(NOW + 2 * DAY).toISOString().slice(0, 10),
    recurrence: 'none',
    pageId: null,
    sortOrder: 2,
    createdAt: daysAgo(3),
    completedAt: null,
  },
  {
    id: seededId('task', 4),
    title: 'Set up Render cron workflow',
    description: 'Connect render.yaml to Render account and configure env vars',
    done: true,
    priority: 'medium',
    dueDate: daysAgo(1).slice(0, 10),
    recurrence: 'none',
    pageId: seededId('page', 1),
    sortOrder: 3,
    createdAt: daysAgo(8),
    completedAt: daysAgo(1),
  },
  {
    id: seededId('task', 5),
    title: 'Implement burnout risk indicator',
    description: 'Compute from session frequency, interruption spike, overdue tasks',
    done: true,
    priority: 'medium',
    dueDate: daysAgo(2).slice(0, 10),
    recurrence: 'none',
    pageId: null,
    sortOrder: 4,
    createdAt: daysAgo(5),
    completedAt: daysAgo(2),
  },
  {
    id: seededId('task', 6),
    title: 'Add demo mode for judging',
    description: 'Seed realistic data when VITE_DEMO_MODE is enabled',
    done: true,
    priority: 'high',
    dueDate: daysAgo(1).slice(0, 10),
    recurrence: 'none',
    pageId: null,
    sortOrder: 5,
    createdAt: daysAgo(4),
    completedAt: daysAgo(1),
  },
  {
    id: seededId('task', 7),
    title: 'Daily standup notes',
    description: null,
    done: false,
    priority: 'low',
    dueDate: null,
    recurrence: 'daily',
    pageId: null,
    sortOrder: 6,
    createdAt: daysAgo(14),
    completedAt: null,
  },
  {
    id: seededId('task', 8),
    title: 'Write submission README',
    description: 'Document all implemented features, tracks targeted, deployment instructions',
    done: false,
    priority: 'urgent',
    dueDate: new Date(NOW + DAY).toISOString().slice(0, 10),
    recurrence: 'none',
    pageId: null,
    sortOrder: 7,
    createdAt: daysAgo(2),
    completedAt: null,
  },
];

function makeSessions(): FocusSession[] {
  const sessions: FocusSession[] = [];
  // 3 weeks of realistic session history
  const sessionPlan: Array<{ daysAgoN: number; hour: number; minutes: number; completed: boolean; interrupted: boolean; title: string; targetType: 'page' | 'task' }> = [
    // Week 3 ago (lighter week)
    { daysAgoN: 20, hour: 9, minutes: 25, completed: true, interrupted: false, title: 'Deep Work Principles', targetType: 'page' },
    { daysAgoN: 19, hour: 10, minutes: 50, completed: true, interrupted: false, title: 'Weekly Review Template', targetType: 'page' },
    { daysAgoN: 17, hour: 9, minutes: 25, completed: false, interrupted: true, title: 'Deep Work Principles', targetType: 'page' },
    { daysAgoN: 16, hour: 14, minutes: 45, completed: true, interrupted: false, title: 'Deep Work Principles', targetType: 'page' },
    { daysAgoN: 15, hour: 9, minutes: 25, completed: true, interrupted: false, title: 'Weekly Review Template', targetType: 'page' },
    // Week 2 ago (productive week)
    { daysAgoN: 13, hour: 9, minutes: 90, completed: true, interrupted: false, title: 'LockIn Hackathon Strategy', targetType: 'page' },
    { daysAgoN: 13, hour: 15, minutes: 45, completed: true, interrupted: false, title: 'Implement burnout risk indicator', targetType: 'task' },
    { daysAgoN: 12, hour: 9, minutes: 60, completed: true, interrupted: false, title: 'AI Coach Architecture', targetType: 'page' },
    { daysAgoN: 12, hour: 14, minutes: 45, completed: false, interrupted: true, title: 'Add demo mode for judging', targetType: 'task' },
    { daysAgoN: 11, hour: 9, minutes: 90, completed: true, interrupted: false, title: 'LockIn Hackathon Strategy', targetType: 'page' },
    { daysAgoN: 11, hour: 15, minutes: 30, completed: true, interrupted: false, title: 'Add demo mode for judging', targetType: 'task' },
    { daysAgoN: 10, hour: 10, minutes: 60, completed: true, interrupted: false, title: 'AI Coach Architecture', targetType: 'page' },
    { daysAgoN: 9, hour: 9, minutes: 45, completed: true, interrupted: false, title: 'Set up Render cron workflow', targetType: 'task' },
    { daysAgoN: 8, hour: 10, minutes: 60, completed: true, interrupted: false, title: 'LockIn Hackathon Strategy', targetType: 'page' },
    // This week
    { daysAgoN: 6, hour: 9, minutes: 90, completed: true, interrupted: false, title: 'LockIn Hackathon Strategy', targetType: 'page' },
    { daysAgoN: 6, hour: 15, minutes: 45, completed: false, interrupted: true, title: 'Deploy AI coach Edge Function to Supabase', targetType: 'task' },
    { daysAgoN: 5, hour: 9, minutes: 60, completed: true, interrupted: false, title: 'AI Coach Architecture', targetType: 'page' },
    { daysAgoN: 5, hour: 14, minutes: 50, completed: true, interrupted: false, title: 'Run pending Supabase migrations', targetType: 'task' },
    { daysAgoN: 4, hour: 9, minutes: 90, completed: true, interrupted: false, title: 'LockIn Hackathon Strategy', targetType: 'page' },
    { daysAgoN: 3, hour: 10, minutes: 60, completed: true, interrupted: false, title: 'Record demo video walkthrough', targetType: 'task' },
    { daysAgoN: 3, hour: 15, minutes: 45, completed: true, interrupted: false, title: 'Write submission README', targetType: 'task' },
    { daysAgoN: 2, hour: 9, minutes: 90, completed: true, interrupted: false, title: 'LockIn Hackathon Strategy', targetType: 'page' },
    { daysAgoN: 1, hour: 9, minutes: 60, completed: true, interrupted: false, title: 'AI Coach Architecture', targetType: 'page' },
    { daysAgoN: 0, hour: 9, minutes: 45, completed: true, interrupted: false, title: 'Write submission README', targetType: 'task' },
  ];

  sessionPlan.forEach((plan, idx) => {
    const startedAt = new Date(NOW - plan.daysAgoN * DAY + plan.hour * 3600000).toISOString();
    const endedAt = new Date(NOW - plan.daysAgoN * DAY + plan.hour * 3600000 + plan.minutes * 60000).toISOString();
    sessions.push({
      id: seededId('session', idx),
      targetId: seededId('page', 1),
      targetType: plan.targetType,
      targetTitle: plan.title,
      presetId: null,
      durationMinutes: plan.minutes,
      plannedDurationMinutes: plan.minutes,
      actualDurationSeconds: plan.completed ? plan.minutes * 60 : Math.floor(plan.minutes * 60 * 0.6),
      interruptionCount: plan.interrupted ? 1 : 0,
      status: plan.interrupted ? 'interrupted' : plan.completed ? 'completed' : 'cancelled',
      startedAt,
      endedAt,
      completed: plan.completed,
      interrupted: plan.interrupted,
    });
  });
  return sessions;
}

export const DEMO_SESSIONS: FocusSession[] = makeSessions();

export const DEMO_INTERRUPTIONS: Interruption[] = [
  {
    id: seededId('interruption', 1),
    sessionId: seededId('session', 2),
    reason: 'Distraction',
    timestamp: daysAgo(17, 10),
  },
  {
    id: seededId('interruption', 2),
    sessionId: seededId('session', 9),
    reason: 'Meeting or call',
    timestamp: daysAgo(12, 15),
  },
  {
    id: seededId('interruption', 3),
    sessionId: seededId('session', 15),
    reason: 'Urgent task',
    timestamp: daysAgo(6, 16),
  },
];

export const DEMO_AI_INSIGHTS: AIInsight[] = [
  {
    id: seededId('insight', 1),
    kind: 'dashboard',
    title: 'Strong Focus Momentum — Sustain It',
    summary: 'You have maintained a solid deep work streak over the past week. Your morning sessions are your most productive — 9am to 11am consistently delivers your longest uninterrupted blocks. The hackathon deadline approaching is reflected in your task prioritization. Recommended: protect the 9am slot tomorrow and tackle the highest-priority submission items first.',
    recommendations: [
      'Start tomorrow with a 90-minute session on the submission README while cognition is peak',
      'Move the Supabase deployment task to morning — it requires focused problem-solving',
      'Schedule a final review session at 3pm to QA the demo before submission',
    ],
    evidence: { sessionCount: 24, pageCount: 4, taskCount: 8, interruptionCount: 3 },
    relatedSessionId: null,
    relatedTaskId: null,
    sourceStart: daysAgo(7),
    sourceEnd: new Date().toISOString(),
    provider: 'sarvam',
    model: 'sarvam-30b',
    confidence: 0.87,
    generatedAt: daysAgo(0, 8),
    createdAt: daysAgo(0, 8),
  },
  {
    id: seededId('insight', 2),
    kind: 'weekly_report',
    title: 'Weekly Productivity Report — Excellent Week',
    summary: 'This was your most productive week in 3 weeks. You logged 9.5 hours of focused work, completed 3 major tasks, and maintained a 7-day streak. Interruptions dropped to just 1 this week compared to 2 last week. Deep work quality (uninterrupted sessions > 45 min) was 78% — well above the 60% baseline.',
    recommendations: [
      'Maintain the current morning deep work block — it is your highest-ROI time slot',
      'Consider adding a 15-minute planning buffer before starting sessions',
      'Your focus-to-break ratio is healthy — keep the current rhythm for the final push',
    ],
    evidence: { totalMinutes: 570, completedSessions: 8, interruptedSessions: 1 },
    relatedSessionId: null,
    relatedTaskId: null,
    sourceStart: daysAgo(7),
    sourceEnd: new Date().toISOString(),
    provider: 'sarvam',
    model: 'sarvam-30b',
    confidence: 0.91,
    generatedAt: daysAgo(1, 7),
    createdAt: daysAgo(1, 7),
  },
  {
    id: seededId('insight', 3),
    kind: 'session_reflection',
    title: 'Session Reflection — Morning Streak Continues',
    summary: 'Excellent 90-minute session this morning on the hackathon strategy. You stayed uninterrupted for the full duration, which puts you in the top quartile of your own session history. The task switching at the end was deliberate and productive. One observation: your typing cadence in the workspace suggests you enter a flow state around minute 12 — try to protect that window by disabling notifications before starting.',
    recommendations: [
      'Schedule the next session to tackle the Supabase deployment — it has the highest deadline risk',
      'The 90-minute block is your sweet spot — match it for tomorrow morning',
    ],
    evidence: { sessionMinutes: 90, flowScore: 0.82 },
    relatedSessionId: seededId('session', 21),
    relatedTaskId: null,
    sourceStart: daysAgo(2, 8),
    sourceEnd: daysAgo(2, 10),
    provider: 'sarvam',
    model: 'sarvam-30b',
    confidence: 0.84,
    generatedAt: daysAgo(2, 10),
    createdAt: daysAgo(2, 10),
  },
  {
    id: seededId('insight', 4),
    kind: 'distraction_patterns',
    title: 'Distraction Pattern Analysis',
    summary: 'Your interruptions cluster in two patterns: afternoon slumps (2pm–4pm) and context switches when shifting between creative and analytical tasks. The "Urgent task" interruptions tend to occur when you have more than 5 active tasks — a sign that backlog pressure forces reactive behavior. Reducing WIP (work in progress) below 4 active tasks could eliminate 60% of urgency-driven interruptions.',
    recommendations: [
      'Cap active tasks at 4 items — archive or defer anything beyond that',
      'Schedule all creative work before 2pm and routine tasks after 3pm',
      'Add a 5-minute transition ritual between task types to reset context',
    ],
    evidence: { interruptionCount: 3, afternoonInterruptions: 2, urgencyInterruptions: 1 },
    relatedSessionId: null,
    relatedTaskId: null,
    sourceStart: daysAgo(21),
    sourceEnd: new Date().toISOString(),
    provider: 'sarvam',
    model: 'sarvam-30b',
    confidence: 0.79,
    generatedAt: daysAgo(1, 9),
    createdAt: daysAgo(1, 9),
  },
  {
    id: seededId('insight', 5),
    kind: 'productive_hours',
    title: 'Productive Hours Analysis',
    summary: 'Your data clearly shows a bimodal productivity pattern: a primary peak from 9am–11am and a secondary peak from 3pm–5pm. The trough between noon and 2pm correlates with lower session quality and higher interruption risk. Your longest uninterrupted sessions (>60 min) occur exclusively in the morning window. This morning-dominant pattern is common in deep technical workers.',
    recommendations: [
      'Guard 9am–11am as sacred deep work time — no meetings, no Slack',
      'Use the noon trough for administrative tasks, email, and review',
      'Re-energize at 3pm with a short walk before the afternoon session',
    ],
    evidence: { peakHour: 9, secondaryPeakHour: 15, troughHour: 12 },
    relatedSessionId: null,
    relatedTaskId: null,
    sourceStart: daysAgo(21),
    sourceEnd: new Date().toISOString(),
    provider: 'sarvam',
    model: 'sarvam-30b',
    confidence: 0.88,
    generatedAt: daysAgo(0, 10),
    createdAt: daysAgo(0, 10),
  },
];

export function isDemoMode(): boolean {
  return import.meta.env.VITE_DEMO_MODE === 'true';
}
