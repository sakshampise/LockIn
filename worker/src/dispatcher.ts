import { WorkflowRun } from './types';
import { jobRegistry } from './registry';
import { lockJob, completeJob, failJob, appendTimeline } from './services/workflow';

export async function dispatchJob(jobId: string) {
  // 1. Lock the job to this worker
  const job = await lockJob(jobId);
  if (!job) {
    console.log(`[Dispatcher] Job ${jobId} could not be locked (may be running or already finished).`);
    return;
  }

  const handler = jobRegistry[job.workflow_name];
  if (!handler) {
    const errorMsg = `No handler registered for workflow: ${job.workflow_name}`;
    await appendTimeline(jobId, job.logs, `Error: ${errorMsg}`);
    await failJob(jobId, errorMsg, job.attempt_count + 1);
    return;
  }

  try {
    await appendTimeline(jobId, job.logs, 'Render processing');
    
    // Execute job logic
    await handler.handle(job);
    
    await appendTimeline(jobId, job.logs, 'Workflow completed');
    await completeJob(jobId);
    
    console.log(`[Dispatcher] Job ${jobId} completed successfully.`);
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await appendTimeline(jobId, job.logs, `Failed: ${errorMessage}`);
    await failJob(jobId, errorMessage, job.attempt_count + 1);
    console.error(`[Dispatcher] Job ${jobId} failed:`, errorMessage);
  }
}
