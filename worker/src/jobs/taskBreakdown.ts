import { WorkflowRun } from '../types';
import { appendTimeline, callEdgeFunction } from '../services/workflow';

export const taskBreakdownHandler = async (job: WorkflowRun) => {
  const { user_id, metadata, logs } = job;
  
  await appendTimeline(job.id, logs, 'Edge Function called (Task Breakdown)');
  
  await callEdgeFunction('ai-coach', {
    kind: 'task_breakdown',
    userId: user_id,
    taskId: metadata?.taskId,
    provider: 'sarvam'
  });
  
  await appendTimeline(job.id, logs, 'Insight generated');
};
