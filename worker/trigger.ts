import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function trigger() {
  const { data: jobs, error } = await supabase
    .from('workflow_runs')
    .select('id')
    .eq('status', 'queued');

  if (error) {
    console.error('Error fetching jobs:', error);
    return;
  }

  if (!jobs || jobs.length === 0) {
    console.log('No queued jobs found.');
    return;
  }

  for (const job of jobs) {
    try {
      console.log(`Triggering webhook for job ${job.id}`);
      const res = await fetch('http://localhost:3000/webhook/job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record: { id: job.id } })
      });
      console.log(`Response: ${res.status} ${res.statusText}`);
    } catch (err: any) {
      console.error(`Failed to trigger webhook for ${job.id}:`, err.message);
    }
  }
}

trigger();
