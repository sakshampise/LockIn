import express from 'express';
import cors from 'cors';
import { dispatchJob } from './dispatcher';
import { supabase } from './services/supabase';

const app = express();
app.use(cors());
app.use(express.json());

// Webhook endpoint called by Supabase when a new job is queued
app.post('/webhook/job', async (req, res) => {
  try {
    const payload = req.body;
    // payload usually looks like: { type: 'INSERT', record: { id: '...' } }
    const record = payload.record || payload; // handle both direct trigger or pg_net wrap
    
    if (record?.id) {
      // Don't await dispatchJob here, so the webhook responds quickly
      dispatchJob(record.id).catch(err => {
        console.error('Unhandled background dispatch error:', err);
      });
      res.status(200).json({ ok: true, message: 'Job accepted' });
    } else {
      res.status(400).json({ error: 'No record id provided' });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Render Cron Endpoints
app.post('/cron/daily', async (req, res) => {
  try {
    // 1. Fetch all users
    const { data: users, error } = await supabase.auth.admin.listUsers();
    if (error) throw error;
    
    for (const user of users.users) {
      // Enqueue daily review for each user
      await enqueueJob(user.id, 'daily_review');
      await enqueueJob(user.id, 'burnout_detection');
    }
    res.status(200).json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/cron/weekly', async (req, res) => {
  try {
    const { data: users, error } = await supabase.auth.admin.listUsers();
    if (error) throw error;
    
    for (const user of users.users) {
      await enqueueJob(user.id, 'weekly_report');
    }
    res.status(200).json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/cron/cleanup', async (req, res) => {
  try {
    // Trigger the cleanup job using the admin user (or without user_id)
    await enqueueJob('system', 'cleanup');
    res.status(200).json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

async function enqueueJob(userId: string, workflowName: string) {
  const dateKey = new Date().toISOString().slice(0, 10);
  // Idempotency: user + workflow + date (ensure only 1 daily/weekly per day)
  const key = `${userId}-${workflowName}-${dateKey}`;
  
  await supabase.from('workflow_runs').insert({
    user_id: userId === 'system' ? undefined : userId,
    workflow_name: workflowName,
    status: 'queued',
    idempotency_key: key,
    logs: [{ time: new Date().toISOString(), message: 'Workflow queued via Cron' }]
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Worker service running on port ${PORT}`);
});
