import { WorkflowRun } from '../types';
import { appendTimeline, callEdgeFunction } from '../services/workflow';

export const taskSummaryHandler = async (job: WorkflowRun) => {
  const { user_id, logs } = job;
  
  await appendTimeline(job.id, logs, 'Edge Function called (Task Summary)');
  
  await callEdgeFunction('ai-coach', {
    kind: 'task_summary',
    userId: user_id,
    provider: 'sarvam'
  });
  
  await appendTimeline(job.id, logs, 'Insight stored');
};
