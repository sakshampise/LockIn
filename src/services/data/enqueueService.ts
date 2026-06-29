import { supabase } from '@/lib/supabase/client';


type WorkflowType = 'daily_review' | 'weekly_report' | 'session_reflection' | 'burnout_detection' | 'cleanup' | 'task_breakdown' | 'task_summary';

export async function enqueueWorkflow(
  workflowName: WorkflowType, 
  idempotencyKey: string,
  metadata: Record<string, any> = {}
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;

  const { error } = await supabase.from('workflow_runs').insert({
    user_id: session.user.id,
    workflow_name: workflowName,
    idempotency_key: idempotencyKey,
    status: 'queued',
    metadata,
    logs: [{ time: new Date().toISOString(), message: 'Job queued by client' }]
  });

  if (error && error.code !== '23505') { // Ignore unique constraint violation (idempotency key hit)
    console.error(`Failed to enqueue ${workflowName}:`, error);
  }
}

export async function enqueueSessionReflection(sessionId: string): Promise<void> {
  const key = `reflection-${sessionId}`;
  await enqueueWorkflow('session_reflection', key, { sessionId });
}

export async function enqueueDailyReview(): Promise<void> {
  const dateKey = new Date().toISOString().slice(0, 10);
  const key = `daily_review-${dateKey}`;
  await enqueueWorkflow('daily_review', key);
}

export async function enqueueWeeklyReport(): Promise<void> {
  // ISO week string approx
  const weekStart = new Date();
  weekStart.setHours(0,0,0,0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const key = `weekly_report-${weekStart.toISOString().slice(0, 10)}`;
  await enqueueWorkflow('weekly_report', key);
}

export async function enqueueBurnoutAnalysis(): Promise<void> {
  const dateKey = new Date().toISOString().slice(0, 10);
  const key = `burnout-${dateKey}`;
  await enqueueWorkflow('burnout_detection', key);
}

export async function enqueueTaskBreakdown(taskId: string): Promise<void> {
  const key = `task_breakdown-${taskId}-${Date.now()}`;
  await enqueueWorkflow('task_breakdown', key, { taskId });
}

export async function enqueueTaskSummary(): Promise<void> {
  const key = `task_summary-${Date.now()}`;
  await enqueueWorkflow('task_summary', key);
}
