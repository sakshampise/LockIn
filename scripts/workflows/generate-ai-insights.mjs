/**
 * LockIn — Render Scheduled AI Workflow
 *
 * Generates AI insights for a configured user on a schedule.
 * Supports daily and weekly modes, per-kind retry with exponential back-off,
 * structured JSON logs, dry-run mode, and idempotency via workflow_runs table.
 *
 * Usage:
 *   node generate-ai-insights.mjs
 *   node generate-ai-insights.mjs --dry-run
 *   LOCKIN_WORKFLOW_MODE=weekly node generate-ai-insights.mjs
 *
 * Required env vars:
 *   SUPABASE_URL              Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY Service role key (server-only)
 *   LOCKIN_WORKFLOW_USER_ID   User ID to generate insights for
 *   LOCKIN_WORKFLOW_USER_JWT  User JWT for Edge Function auth
 *
 * Optional env vars:
 *   LOCKIN_WORKFLOW_SECRET    Expected secret for caller verification
 *   RENDER_WORKFLOW_SECRET    Secret provided by Render cron caller
 *   LOCKIN_WORKFLOW_MODE      'daily' (default) or 'weekly'
 *   LOCKIN_AI_WORKFLOW_KINDS  Comma-separated insight kinds override
 *   LOCKIN_WORKFLOW_NAME      Custom workflow name for run tracking
 *   LOCKIN_MAX_ATTEMPTS       Max retry attempts per kind (default: 3)
 *   LOCKIN_RETRY_DELAY_MS     Base retry delay in ms (default: 2000)
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WORKFLOW_SECRET = process.env.RENDER_WORKFLOW_SECRET;
const EXPECTED_SECRET = process.env.LOCKIN_WORKFLOW_SECRET;
const MODE = process.env.LOCKIN_WORKFLOW_MODE || 'daily';
const MAX_ATTEMPTS = Math.max(1, parseInt(process.env.LOCKIN_MAX_ATTEMPTS || '3', 10));
const BASE_RETRY_MS = Math.max(500, parseInt(process.env.LOCKIN_RETRY_DELAY_MS || '2000', 10));

const DRY_RUN = process.argv.includes('--dry-run');

const DAILY_KINDS = ['dashboard', 'distraction_patterns', 'productive_hours'];
const WEEKLY_KINDS = ['dashboard', 'weekly_report', 'distraction_patterns', 'productive_hours'];

function log(level, message, data = {}) {
  const entry = { level, at: new Date().toISOString(), message, ...data };
  process.stdout.write(JSON.stringify(entry) + '\n');
  return entry;
}

function required(name, value) {
  if (!value) throw new Error(`Environment variable ${name} is required for this workflow.`);
  return value;
}

async function rest(path, options = {}) {
  const url = `${required('SUPABASE_URL', SUPABASE_URL)}/rest/v1/${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      apikey: required('SUPABASE_SERVICE_ROLE_KEY', SERVICE_ROLE_KEY),
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`REST ${response.status}: ${JSON.stringify(data)}`);
  return data;
}

async function upsertRun(userId, workflowName, idempotencyKey) {
  const existing = await rest(
    `workflow_runs?user_id=eq.${userId}&workflow_name=eq.${encodeURIComponent(workflowName)}&idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&select=*`,
  );
  if (existing[0]?.status === 'succeeded') return existing[0];
  const attempt = (existing[0]?.attempt_count ?? 0) + 1;
  const runLog = [...(existing[0]?.logs ?? []), log('info', 'Workflow started', { attempt, mode: MODE, dryRun: DRY_RUN })];
  const payload = {
    user_id: userId,
    workflow_name: workflowName,
    idempotency_key: idempotencyKey,
    status: 'running',
    started_at: new Date().toISOString(),
    attempt_count: attempt,
    max_attempts: MAX_ATTEMPTS,
    logs: runLog,
  };
  if (existing[0]) {
    return (await rest(`workflow_runs?id=eq.${existing[0].id}`, { method: 'PATCH', body: JSON.stringify(payload) }))[0];
  }
  return (await rest('workflow_runs', { method: 'POST', body: JSON.stringify(payload) }))[0];
}

async function appendRunLog(runId, entry) {
  const current = await rest(`workflow_runs?id=eq.${runId}&select=logs`);
  const logs = [...(current[0]?.logs ?? []), entry];
  await rest(`workflow_runs?id=eq.${runId}`, { method: 'PATCH', body: JSON.stringify({ logs }) });
}

async function finishRun(run, status, message, metadata = {}) {
  const entry = log(status === 'succeeded' ? 'info' : 'error', message, metadata);
  const logs = [...(run.logs ?? []), entry];
  return rest(`workflow_runs?id=eq.${run.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status,
      completed_at: new Date().toISOString(),
      logs,
      metadata,
      last_error: status === 'failed' ? message : null,
    }),
  });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function invokeAICoachWithRetry(userJwt, kind, runId) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      if (DRY_RUN) {
        const entry = log('info', `[DRY-RUN] Would generate ${kind}`, { kind, attempt });
        if (runId) await appendRunLog(runId, entry);
        return { dry: true, kind };
      }
      const response = await fetch(`${required('SUPABASE_URL', SUPABASE_URL)}/functions/v1/ai-coach`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userJwt}`,
          apikey: required('SUPABASE_SERVICE_ROLE_KEY', SERVICE_ROLE_KEY),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ kind }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`ai-coach ${kind} → ${response.status}: ${text.slice(0, 200)}`);
      }
      const result = await response.json();
      const entry = log('info', `Generated ${kind}`, { kind, attempt, insightCount: result.insights?.length ?? 0 });
      if (runId) await appendRunLog(runId, entry);
      return result;
    } catch (error) {
      lastError = error;
      const entry = log('warn', `${kind} attempt ${attempt} failed: ${error.message}`, { kind, attempt });
      if (runId) await appendRunLog(runId, entry);
      if (attempt < MAX_ATTEMPTS) await sleep(BASE_RETRY_MS * 2 ** (attempt - 1));
    }
  }
  throw lastError;
}

async function main() {
  // Verify caller secret when configured
  if (EXPECTED_SECRET && WORKFLOW_SECRET !== EXPECTED_SECRET) {
    throw new Error('Invalid workflow secret — refusing to run.');
  }

  const userId = required('LOCKIN_WORKFLOW_USER_ID', process.env.LOCKIN_WORKFLOW_USER_ID);
  const userJwt = DRY_RUN ? 'dry-run-jwt' : required('LOCKIN_WORKFLOW_USER_JWT', process.env.LOCKIN_WORKFLOW_USER_JWT);
  const date = new Date().toISOString().slice(0, 10);
  const workflowName = process.env.LOCKIN_WORKFLOW_NAME || `lockin-${MODE}-ai-summary`;

  const defaultKinds = MODE === 'weekly' ? WEEKLY_KINDS : DAILY_KINDS;
  const kinds = (process.env.LOCKIN_AI_WORKFLOW_KINDS || '')
    .split(',')
    .map(k => k.trim())
    .filter(Boolean);
  const resolvedKinds = kinds.length > 0 ? kinds : defaultKinds;

  log('info', 'Workflow initializing', { workflowName, mode: MODE, kinds: resolvedKinds, dryRun: DRY_RUN, userId });

  let run = null;

  // Attempt to track workflow runs — degrade gracefully if table absent
  let trackingAvailable = true;
  try {
    run = await upsertRun(userId, workflowName, `${workflowName}:${userId}:${date}`);
    if (run.status === 'succeeded') {
      log('info', 'Run already succeeded — skipping (idempotent)', { idempotencyKey: run.idempotency_key });
      return;
    }
  } catch (err) {
    log('warn', 'workflow_runs table unavailable — tracking disabled', { error: err.message });
    trackingAvailable = false;
  }

  const results = [];
  const errors = [];

  for (const kind of resolvedKinds) {
    try {
      const result = await invokeAICoachWithRetry(userJwt, kind, trackingAvailable ? run?.id : null);
      results.push({ kind, ok: true, result });
    } catch (error) {
      errors.push({ kind, error: error.message });
      log('error', `All retries exhausted for ${kind}`, { kind, error: error.message });
    }
  }

  const summary = { kinds: resolvedKinds, succeeded: results.length, failed: errors.length, errors };
  log('info', 'Workflow complete', summary);

  if (!trackingAvailable) return;

  if (errors.length === 0) {
    await finishRun(run, 'succeeded', 'All AI insights generated successfully.', summary);
  } else if (results.length === 0) {
    await finishRun(run, 'failed', 'All insight generations failed.', summary);
    throw new Error(`Workflow failed: all ${resolvedKinds.length} insight kinds failed.`);
  } else {
    await finishRun(run, 'succeeded', `Partial success: ${results.length}/${resolvedKinds.length} succeeded.`, summary);
  }
}

main().catch(error => {
  process.stderr.write(JSON.stringify({ level: 'fatal', at: new Date().toISOString(), message: error instanceof Error ? error.message : String(error) }) + '\n');
  process.exit(1);
});