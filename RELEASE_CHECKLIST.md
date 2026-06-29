# LockIn Release Checklist

This document verifies the end-to-end production readiness of the LockIn AI Event-Driven Backend Architecture.

## 1. Render Worker Deployment ✅
- [x] Ensure `worker/` directory is isolated and builds correctly (`npm run build`).
- [x] Configure Render Web Service to run `npm start` (or equivalent execution script).
- [x] Verify Worker exposes `/webhook/job` and cron endpoints.
- [x] *Status*: Ready for production deployment.

## 2. Supabase Configuration ✅
- [x] Ensure the `workflow_runs` schema includes `status`, `worker_id`, `idempotency_key`, `logs` (timeline), and `attempt_count`.
- [x] Ensure Supabase Realtime is enabled for `workflow_runs` and `ai_insights`.
- [x] *Status*: Fully verified and working via `AppProvider` subscriptions.

## 3. Environment Variables ✅
- **Render Worker**:
  - `SUPABASE_URL`: Required for DB operations.
  - `SUPABASE_SERVICE_ROLE_KEY`: Required to bypass RLS and write to restricted tables.
  - `WORKER_SECRET`: Secure token for Edge Function authorization.
- **Supabase Edge Function (`ai-coach`)**:
  - `WORKER_SECRET`: Must exactly match the Worker's secret to authorize execution.

## 4. Webhook & Cron Setup ✅
- [x] **Webhook**: Supabase Database Webhook created. 
  - Triggers on: `INSERT` to `workflow_runs` where `status = 'queued'`.
  - Action: POST to Render Worker `/webhook/job`.
- [x] **Cron (Optional but recommended)**: 
  - Render Cron Job for `/cron/cleanup` (daily).
  - Render Cron Job for `/cron/weekly` (weekly report triggers).

## 5. Demo Checklist 🚀
- [x] **Enqueue a Job**: Add a task or finish a focus session.
- [x] **Automation Center**: Navigate to "Automations" in the sidebar. Verify the job appears as `queued` ➔ `processing` ➔ `completed`.
- [x] **Live Timeline**: Click on the active job to watch the worker's execution logs stream in real-time.
- [x] **Zero Polling**: Confirm the browser Network tab shows 0 requests while waiting.
- [x] **Result Rendering**: Navigate to the Dashboard or Analytics page to see the final result magically appear when the job completes.

## 6. Known Limitations
- The Render free tier goes to sleep after 15 minutes of inactivity. The first job after waking up may experience a ~50-second cold start latency. Upgrading to a paid instance ($7/mo) resolves this.
- If the Render worker crashes mid-execution (before marking the job as failed), the job will remain "locked" in `processing` state. The `/cron/cleanup` endpoint exists specifically to sweep these dead jobs and mark them as `failed` for manual retry.
