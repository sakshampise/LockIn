import { supabase } from './supabase';
import { WorkflowRun, WorkflowRunStatus } from '../types';

export const WORKER_ID = `worker-${Math.random().toString(36).substring(2, 10)}`;

export async function lockJob(jobId: string): Promise<WorkflowRun | null> {
  const { data, error } = await supabase
    .from('workflow_runs')
    .update({ 
      status: 'processing', 
      worker_id: WORKER_ID, 
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId)
    .in('status', ['queued', 'retrying'])
    .select()
    .single();

  if (error || !data) return null;
  return data as WorkflowRun;
}

export async function completeJob(jobId: string, resultMetadata?: any): Promise<void> {
  const payload: any = {
    status: 'completed',
    finished_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  if (resultMetadata) {
    // Merge or set metadata - for simplicity, we just set in this example
    payload.metadata = resultMetadata; 
  }
  await supabase.from('workflow_runs').update(payload).eq('id', jobId);
}

export async function failJob(jobId: string, errMessage: string, currentAttempt: number, maxAttempts: number = 3): Promise<void> {
  const isFinal = currentAttempt >= maxAttempts;
  await supabase.from('workflow_runs').update({
    status: isFinal ? 'failed' : 'retrying',
    last_error: errMessage,
    finished_at: isFinal ? new Date().toISOString() : null,
    updated_at: new Date().toISOString()
  }).eq('id', jobId);
}

export async function appendTimeline(jobId: string, currentLogs: any[], message: string): Promise<void> {
  const newLog = { time: new Date().toISOString(), message };
  await supabase.from('workflow_runs').update({
    logs: [...currentLogs, newLog]
  }).eq('id', jobId);
}

export async function callEdgeFunction(functionName: string, payload: any): Promise<any> {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: payload,
    headers: {
      'x-worker-secret': process.env.WORKER_SECRET || ''
    }
  });
  if (error) throw error;
  if (data && data.success === false) throw new Error(data.error);
  return data;
}
