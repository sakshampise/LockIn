import { supabase } from '@/lib/supabase/client';
import { WorkflowRun } from '@/types';

function mapRun(row: any): WorkflowRun {
  return {
    id: row.id,
    workflowName: row.workflow_name,
    status: row.status,
    metadata: row.metadata,
    attemptCount: row.attempt_count,
    workerId: row.worker_id,
    lastError: row.last_error,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    idempotencyKey: row.idempotency_key,
    logs: row.logs || []
  };
}

export async function listWorkflowRuns(): Promise<WorkflowRun[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return [];

  const { data, error } = await supabase
    .from('workflow_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data.map(mapRun);
}
