import { WorkflowRun } from '../types';
import { supabase } from '../services/supabase';
import { appendTimeline } from '../services/workflow';

export const cleanupHandler = async (job: WorkflowRun) => {
  const { logs } = job;
  await appendTimeline(job.id, logs, 'Starting queue cleanup');
  
  // Requeue stuck 'processing' jobs older than 10 minutes
  const tenMinsAgo = new Date(Date.now() - 10 * 60000).toISOString();
  await supabase
    .from('workflow_runs')
    .update({ status: 'queued', worker_id: null, last_error: 'Timeout stuck in processing' })
    .eq('status', 'processing')
    .lt('updated_at', tenMinsAgo);

  // Delete completed jobs older than 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  await supabase
    .from('workflow_runs')
    .delete()
    .eq('status', 'completed')
    .lt('created_at', sevenDaysAgo);

  await appendTimeline(job.id, logs, 'Cleanup finished');
};
