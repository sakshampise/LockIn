import { WorkflowRun } from '../types';
import { appendTimeline, callEdgeFunction } from '../services/workflow';

export const burnoutHandler = async (job: WorkflowRun) => {
  const { user_id, logs } = job;
  await appendTimeline(job.id, logs, 'Edge Function called (Burnout Analysis)');
  
  await callEdgeFunction('ai-coach', {
    kind: 'burnout_detection',
    userId: user_id,
    provider: 'sarvam'
  });
  
  await appendTimeline(job.id, logs, 'Insight stored');
};
