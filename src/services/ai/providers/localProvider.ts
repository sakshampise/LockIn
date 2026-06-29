import { AIInsight } from '@/types';
import { AIProvider, GenerateAIInsightInput } from '../aiProvider';
import * as taskService from '@/services/data/taskService';
import * as focusSessionService from '@/services/data/focusSessionService';

function generateId(): string {
  return crypto.randomUUID();
}

export class LocalInsightsProvider implements AIProvider {
  name = 'Local Intelligence (Offline)';

  isAvailable(): boolean {
    return true; // Local fallback is always available
  }

  async generateInsight(input: GenerateAIInsightInput): Promise<AIInsight[]> {
    const { kind } = input;
    const tasks = await taskService.listTasks();
    const sessions = await focusSessionService.listFocusSessions();
    const now = new Date();

    if (kind === 'session_reflection') {
      const recentSessions = sessions.slice(0, 5);
      const interrupted = recentSessions.filter(s => s.interrupted);
      
      if (interrupted.length >= 3) {
        return [{
          id: generateId(),
          kind: 'session_reflection',
          title: 'High Interruption Rate Detected',
          summary: 'You have been interrupted frequently in your recent sessions.',
          recommendations: [
            'Consider turning on Do Not Disturb on your devices.',
            'Try shorter focus sessions until you can build up endurance.',
          ],
          evidence: { interruptedCount: interrupted.length },
          relatedSessionId: null,
          relatedTaskId: null,
          sourceStart: null,
          sourceEnd: null,
          provider: 'local',
          model: 'rule-based',
          confidence: 0.9,
          generatedAt: now.toISOString(),
          createdAt: now.toISOString(),
        }];
      }
      
      return [{
        id: generateId(),
        kind: 'session_reflection',
        title: 'Solid Focus Momentum',
        summary: 'Your recent sessions show strong uninterrupted focus.',
        recommendations: [
          'Maintain your current environment setup.',
          'Remember to take adequate breaks between deep work blocks.',
        ],
        evidence: { completedCount: recentSessions.length - interrupted.length },
        relatedSessionId: null,
        relatedTaskId: null,
        sourceStart: null,
        sourceEnd: null,
        provider: 'local',
        model: 'rule-based',
        confidence: 0.85,
        generatedAt: now.toISOString(),
        createdAt: now.toISOString(),
      }];
    }

    if (kind === 'task_summary') {
      const overdue = tasks.filter(t => !t.done && t.dueDate && new Date(t.dueDate) < now);
      const highPriority = tasks.filter(t => !t.done && t.priority === 'high');
      
      return [{
        id: generateId(),
        kind: 'task_summary',
        title: overdue.length > 0 ? 'Overdue Tasks Require Attention' : 'Task Queue Optimal',
        summary: overdue.length > 0 
          ? `You have ${overdue.length} overdue tasks. Prioritize clearing the backlog.` 
          : `Your task list is healthy with ${highPriority.length} high priority items pending.`,
        recommendations: overdue.length > 0 ? [
          'Reschedule overdue tasks to realistic dates.',
          'Tackle the oldest overdue task in your next focus session.'
        ] : [
          'Focus on high priority items first.',
          'Break down large tasks into smaller steps.'
        ],
        evidence: { overdueCount: overdue.length, highPriorityCount: highPriority.length },
        relatedSessionId: null,
        relatedTaskId: null,
        sourceStart: null,
        sourceEnd: null,
        provider: 'local',
        model: 'rule-based',
        confidence: 0.95,
        generatedAt: now.toISOString(),
        createdAt: now.toISOString(),
      }];
    }

    if (kind === 'weekly_report') {
      const activeDays = new Set(sessions.filter(s => s.completed).map(s => s.startedAt.slice(0, 10)));
      const streak = activeDays.size; 
      return [{
        id: generateId(),
        kind: 'weekly_report',
        title: streak > 2 ? 'Excellent Consistency' : 'Building Momentum',
        summary: streak > 2 
          ? `You are on a ${streak}-day streak! Consistency is the key to deep work.`
          : 'You are laying the foundation for a productive routine.',
        recommendations: [
          'Plan your focus sessions at the same time each day.',
          'Protect your peak energy hours for deep work.'
        ],
        evidence: { currentStreak: streak },
        relatedSessionId: null,
        relatedTaskId: null,
        sourceStart: null,
        sourceEnd: null,
        provider: 'local',
        model: 'rule-based',
        confidence: 0.9,
        generatedAt: now.toISOString(),
        createdAt: now.toISOString(),
      }];
    }

    if (kind === 'smart_planner') {
      const pendingTasks = tasks.filter(t => !t.done);
      return [{
        id: generateId(),
        kind: 'smart_planner',
        title: 'Smart Day Plan',
        summary: `You have ${pendingTasks.length} pending tasks. Prioritize the high urgency ones first.`,
        recommendations: [
          'Tackle the most complex task first.',
          'Schedule a 25-minute focus session.',
          'Take a 5-minute break after your first session.'
        ],
        evidence: { pendingCount: pendingTasks.length },
        relatedSessionId: null,
        relatedTaskId: null,
        sourceStart: null,
        sourceEnd: null,
        provider: 'local',
        model: 'rule-based',
        confidence: 0.8,
        generatedAt: now.toISOString(),
        createdAt: now.toISOString(),
      }];
    }

    if (kind === 'daily_review') {
      const today = new Date().toISOString().slice(0, 10);
      const todaySessions = sessions.filter(s => s.startedAt.startsWith(today));
      return [{
        id: generateId(),
        kind: 'daily_review',
        title: 'Daily Review',
        summary: `You completed ${todaySessions.length} focus sessions today. Great work staying consistent.`,
        recommendations: [
          'Review pending tasks for tomorrow.',
          'Log off and disconnect to prevent burnout.'
        ],
        evidence: { sessionsToday: todaySessions.length },
        relatedSessionId: null,
        relatedTaskId: null,
        sourceStart: null,
        sourceEnd: null,
        provider: 'local',
        model: 'rule-based',
        confidence: 0.85,
        generatedAt: now.toISOString(),
        createdAt: now.toISOString(),
      }];
    }

    if (kind === 'task_breakdown') {
      const targetTask = input.taskId ? tasks.find(t => t.id === input.taskId) : null;
      return [{
        id: generateId(),
        kind: 'task_breakdown',
        title: targetTask ? `Breakdown: ${targetTask.title}` : 'Task Breakdown',
        summary: targetTask
          ? `Here is a suggested breakdown for "${targetTask.title}".`
          : 'Break down complex tasks into smaller, actionable steps.',
        recommendations: [
          targetTask ? `Define the acceptance criteria for "${targetTask.title}"` : 'Define the first actionable step.',
          'Estimate time needed: split into ≤30 min sub-tasks.',
          'Complete each sub-task in a dedicated focus session.',
        ],
        evidence: targetTask ? { taskTitle: targetTask.title } : {},
        relatedSessionId: null,
        relatedTaskId: input.taskId ?? null,
        sourceStart: null,
        sourceEnd: null,
        provider: 'local',
        model: 'rule-based',
        confidence: 0.9,
        generatedAt: now.toISOString(),
        createdAt: now.toISOString(),
      }];
    }

    if (kind === 'prioritization') {
      const highPriority = tasks.filter(t => !t.done && t.priority === 'high');
      const urgent = tasks.filter(t => !t.done && t.priority === 'urgent');
      return [{
        id: generateId(),
        kind: 'prioritization',
        title: urgent.length > 0 ? 'Urgent Items Need Attention' : highPriority.length > 0 ? 'Smart Prioritization' : 'Task List Balanced',
        summary: urgent.length > 0
          ? `You have ${urgent.length} urgent task${urgent.length > 1 ? 's' : ''}: "${urgent[0].title}". Address these first.`
          : highPriority.length > 0
            ? `Focus on your ${highPriority.length} high priority task${highPriority.length > 1 ? 's' : ''}.`
            : 'Task list is balanced. Work through tasks in order.',
        recommendations: [
          urgent.length > 0 ? `Start with urgent: ${urgent.slice(0, 2).map(t => t.title).join(', ')}` : 'Work on tasks nearing their due dates.',
          'Avoid context switching — finish one task before starting the next.',
          'Defer low priority tasks if the backlog grows too large.',
        ],
        evidence: { highPriorityCount: highPriority.length, urgentCount: urgent.length },
        relatedSessionId: null,
        relatedTaskId: null,
        sourceStart: null,
        sourceEnd: null,
        provider: 'local',
        model: 'rule-based',
        confidence: 0.85,
        generatedAt: now.toISOString(),
        createdAt: now.toISOString(),
      }];
    }

    if (kind === 'burnout_detection') {
      const recentSessions = sessions.filter(s => {
        const t = new Date(s.startedAt).getTime();
        return Date.now() - t < 7 * 86400000;
      });
      const interrupted = recentSessions.filter(s => s.interrupted);
      const interruptionRate = recentSessions.length > 0 ? interrupted.length / recentSessions.length : 0;
      const isHighRisk = interruptionRate >= 0.5;
      return [{
        id: generateId(),
        kind: 'burnout_detection',
        title: isHighRisk ? 'Elevated Burnout Risk Detected' : 'Burnout Risk Low',
        summary: isHighRisk
          ? `${interrupted.length} of your last ${recentSessions.length} sessions this week were interrupted. This is a sign of burnout or excessive distraction.`
          : `Good balance detected. You completed ${recentSessions.length - interrupted.length} uninterrupted sessions this week.`,
        recommendations: [
          isHighRisk ? 'Reduce daily session count and increase break duration.' : 'Maintain your current rhythm.',
          'Take regular breaks — aim for 5 minutes per 25 minutes of focus.',
          'Ensure you get at least 7 hours of sleep for cognitive recovery.',
        ],
        evidence: { recentSessions: recentSessions.length, interrupted: interrupted.length, interruptionRate: Math.round(interruptionRate * 100) },
        relatedSessionId: null,
        relatedTaskId: null,
        sourceStart: null,
        sourceEnd: null,
        provider: 'local',
        model: 'rule-based',
        confidence: 0.9,
        generatedAt: now.toISOString(),
        createdAt: now.toISOString(),
      }];
    }

    return [];
  }
}
