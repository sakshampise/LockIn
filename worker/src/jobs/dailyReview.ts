import { WorkflowRun } from '../types';
import { appendTimeline, callEdgeFunction } from '../services/workflow';

export const dailyReviewHandler = async (job: WorkflowRun) => {
  const { user_id, logs } = job;
  await appendTimeline(job.id, logs, 'Edge Function called (Daily Review)');
  
  await callEdgeFunction('ai-coach', {
    kind: 'daily_review',
    userId: user_id,
    provider: 'sarvam'
  });
  
  await appendTimeline(job.id, logs, 'Insight stored');
};
