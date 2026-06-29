import { WorkflowRun } from '../types';
import { appendTimeline, callEdgeFunction } from '../services/workflow';

export const weeklyReportHandler = async (job: WorkflowRun) => {
  const { user_id, logs } = job;
  await appendTimeline(job.id, logs, 'Edge Function called (Weekly Report)');
  
  await callEdgeFunction('ai-coach', {
    kind: 'weekly_report',
    userId: user_id,
    provider: 'sarvam'
  });
  
  await appendTimeline(job.id, logs, 'Insight stored');
};
