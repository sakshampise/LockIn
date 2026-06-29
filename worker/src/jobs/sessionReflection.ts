import { WorkflowRun } from '../types';
import { appendTimeline, callEdgeFunction } from '../services/workflow';

export const sessionReflectionHandler = async (job: WorkflowRun) => {
  const { user_id, metadata, logs } = job;
  
  await appendTimeline(job.id, logs, 'Edge Function called (Session Reflection)');
  
  // Call the existing ai-coach Edge Function for session_reflection
  await callEdgeFunction('ai-coach', {
    kind: 'session_reflection',
    userId: user_id, // ensure Edge Function knows which user if bypassing auth, or we pass metadata
    sessionId: metadata?.sessionId,
    provider: 'sarvam'
  });
  
  await appendTimeline(job.id, logs, 'Insight stored');
};
