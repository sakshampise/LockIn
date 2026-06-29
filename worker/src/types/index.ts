export type WorkflowRunStatus = 
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'retrying'
  | 'scheduled'
  | 'cancelled'
  | 'dead_letter';

export interface WorkflowRun {
  id: string;
  user_id: string;
  workflow_name: string;
  status: WorkflowRunStatus;
  metadata: Record<string, any>;
  attempt_count: number;
  worker_id?: string;
  last_error?: string;
  started_at?: string;
  finished_at?: string;
  created_at: string;
  updated_at: string;
  idempotency_key: string;
  logs: any[];
}

export interface JobHandler {
  name: string;
  handle: (job: WorkflowRun) => Promise<any>;
}
