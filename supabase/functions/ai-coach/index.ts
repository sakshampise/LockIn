/**
 * ai-coach Edge Function
 *
 * Responsibilities:
 *  1. Validate the incoming request and authenticate the user.
 *  2. Fetch only the minimal context required for the requested insight kind.
 *  3. Build a lean prompt and call Sarvam AI.
 *  4. Validate the response.
 *  5. Persist insights that are intended as historical records
 *     (session_reflection, weekly_report, task_summary, daily_review, burnout_detection).
 *     Transient insights (task_breakdown) are NOT persisted.
 *  6. Return a structured response:
 *       Success:          { success: true, insights: [...] }
 *       Provider failure: { success: false, provider: "sarvam", error: "<reason>" }
 *     HTTP 500 is reserved ONLY for genuine infrastructure failures.
 *
 * Provider routing is handled entirely by the frontend (aiInsightService.ts).
 * This function does NOT decide which workflow belongs to Sarvam vs Local.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2';

type InsightKind =
  | 'dashboard'
  | 'session_plan'
  | 'session_reflection'
  | 'weekly_report'
  | 'distraction_patterns'
  | 'productive_hours'
  | 'task_summary'
  | 'recommendation'
  | 'smart_planner'
  | 'daily_review'
  | 'task_breakdown'
  | 'burnout_detection'
  | 'prioritization';

/** Insight kinds that should be persisted as historical records. */
const PERSIST_KINDS = new Set<InsightKind>([
  'session_reflection',
  'weekly_report',
  'task_summary',
  'daily_review',
  'burnout_detection',
]);

type RequestBody = {
  kind?: InsightKind;
  sessionId?: string;
  taskId?: string;
  userId?: string; // provided by worker when using service role key
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  Vary: 'Origin',
};

function jsonOk(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Return a structured provider failure as HTTP 200. Never throws. */
function providerFailure(reason: string, reqId: string) {
  console.warn(JSON.stringify({ event: 'provider_failure', reqId, reason }));
  return jsonOk({ success: false, provider: 'sarvam', error: reason });
}

function safeArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string').slice(0, 6);
}

function parseCoachResponse(text: string) {
  try {
    const parsed = JSON.parse(text);
    return {
      ok: true as const,
      title: typeof parsed.title === 'string' ? parsed.title.slice(0, 160) : 'AI Productivity Insight',
      summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 4000) : text.slice(0, 4000),
      recommendations: safeArray(parsed.recommendations),
      confidence: typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.75,
    };
  } catch {
    return { ok: false as const, reason: 'Model returned non-JSON output.' };
  }
}

// ---------------------------------------------------------------------------
// Prompt builders — each uses only the minimal fields needed
// ---------------------------------------------------------------------------
function buildPrompt(kind: InsightKind, data: Record<string, unknown>): string {
  const schema = '{"title":"","summary":"","recommendations":["","",""],"confidence":0.8}';
  const header = 'Output exactly one JSON object matching this schema:\n' + schema;

  if (kind === 'session_reflection') {
    return [
      'Reflect on this focus session. Provide: productivity insight, key strength, distraction noticed, one improvement tip.',
      header,
      `Data:${JSON.stringify(data)}`,
    ].join('\n');
  }

  if (kind === 'daily_review') {
    return [
      'Summarize today: focus time, completed tasks, interruptions, streak, biggest win, tomorrow recommendation.',
      header,
      `Data:${JSON.stringify(data)}`,
    ].join('\n');
  }

  if (kind === 'task_summary') {
    return [
      'Summarize the task queue: overdue count, high priority count, completion rate, top recommendation.',
      header,
      `Data:${JSON.stringify(data)}`,
    ].join('\n');
  }

  if (kind === 'burnout_detection') {
    return [
      'Analyze burnout risk from interruption frequency, session completion, and streak. Return risk level and actionable advice.',
      header,
      `Data:${JSON.stringify(data)}`,
    ].join('\n');
  }

  if (kind === 'task_breakdown') {
    return [
      'Break this task into 3 actionable subtasks with time estimates.',
      header,
      `Data:${JSON.stringify(data)}`,
    ].join('\n');
  }

  if (kind === 'weekly_report') {
    return [
      'Summarize this week: total focus time, tasks completed, streak, top distraction, and one recommendation for next week.',
      header,
      `Data:${JSON.stringify(data)}`,
    ].join('\n');
  }

  // Generic fallback (dashboard, recommendation, etc.)
  return [
    'Create a concise productivity insight.',
    header,
    `Data:${JSON.stringify(data)}`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Minimal context builders — never send raw page content or large arrays
// ---------------------------------------------------------------------------
function buildContext(
  kind: InsightKind,
  body: RequestBody,
  data: {
    profile: Record<string, unknown> | null;
    tasks: Record<string, unknown>[];
    sessions: Record<string, unknown>[];
    interruptions: Record<string, unknown>[];
  },
): Record<string, unknown> {
  const { profile, tasks, sessions, interruptions } = data;
  const today = new Date().toISOString().slice(0, 10);

  if (kind === 'session_reflection') {
    const session = body.sessionId ? sessions.find((s: any) => s.id === body.sessionId) : sessions[0];
    const sessionInterruptions = session
      ? interruptions.filter((i: any) => i.occurred_at >= (session as any).started_at)
      : [];
    return {
      duration: (session as any)?.duration_minutes ?? 0,
      completed: (session as any)?.completed ?? false,
      interrupted: (session as any)?.interrupted ?? false,
      interruptionCount: sessionInterruptions.length,
      interruptionReasons: sessionInterruptions.slice(0, 5).map((i: any) => i.reason),
    };
  }

  if (kind === 'daily_review') {
    const todaySessions = sessions.filter((s: any) => s.started_at?.startsWith(today));
    return {
      focusMinutes: todaySessions.reduce((sum: number, s: any) => sum + (s.duration_minutes ?? 0), 0),
      sessionsCompleted: todaySessions.filter((s: any) => s.completed).length,
      sessionsInterrupted: todaySessions.filter((s: any) => s.interrupted).length,
      tasksCompleted: tasks.filter((t: any) => t.status === 'completed' && t.updated_at?.startsWith(today)).length,
      interruptionsToday: interruptions.filter((i: any) => i.occurred_at?.startsWith(today)).length,
      streak: (profile as any)?.current_streak ?? 0,
    };
  }

  if (kind === 'task_summary') {
    const pending = tasks.filter((t: any) => t.status !== 'completed');
    const overdue = pending.filter((t: any) => t.due_date && t.due_date < today);
    return {
      total: tasks.length,
      pending: pending.length,
      overdueCount: overdue.length,
      urgentCount: pending.filter((t: any) => t.priority === 'urgent').length,
      highCount: pending.filter((t: any) => t.priority === 'high').length,
    };
  }

  if (kind === 'burnout_detection') {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const recentSessions = sessions.filter((s: any) => s.started_at >= weekAgo);
    return {
      sessionsThisWeek: recentSessions.length,
      interruptedThisWeek: recentSessions.filter((s: any) => s.interrupted).length,
      interruptionsThisWeek: interruptions.filter((i: any) => i.occurred_at >= weekAgo).length,
      streak: (profile as any)?.current_streak ?? 0,
      completionRate: tasks.length > 0
        ? Math.round(tasks.filter((t: any) => t.status === 'completed').length / tasks.length * 100)
        : 0,
    };
  }

  if (kind === 'task_breakdown') {
    const task = body.taskId ? tasks.find((t: any) => t.id === body.taskId) : null;
    return {
      title: (task as any)?.title ?? 'Unknown task',
      description: (task as any)?.description ?? '',
      priority: (task as any)?.priority ?? 'medium',
    };
  }

  if (kind === 'weekly_report') {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const weekSessions = sessions.filter((s: any) => s.started_at >= weekAgo);
    return {
      totalFocusMinutes: weekSessions.reduce((sum: number, s: any) => sum + (s.duration_minutes ?? 0), 0),
      sessionsCompleted: weekSessions.filter((s: any) => s.completed).length,
      tasksCompleted: tasks.filter((t: any) => t.status === 'completed').length,
      streak: (profile as any)?.current_streak ?? 0,
      dailyGoal: (profile as any)?.daily_focus_goal_minutes ?? 120,
    };
  }

  // Generic
  return {
    pendingTasks: tasks.filter((t: any) => t.status !== 'completed').length,
    completedTasks: tasks.filter((t: any) => t.status === 'completed').length,
    streak: (profile as any)?.current_streak ?? 0,
    dailyGoalMinutes: (profile as any)?.daily_focus_goal_minutes ?? 120,
  };
}

// ---------------------------------------------------------------------------
// Sarvam API call
// ---------------------------------------------------------------------------
async function callSarvam(
  prompt: string,
  reqId: string,
): Promise<{ ok: true; content: string; model: string } | { ok: false; reason: string }> {
  const apiKey = Deno.env.get('SARVAM_API_KEY');
  if (!apiKey) {
    return { ok: false, reason: 'SARVAM_API_KEY is not configured.' };
  }

  const model = Deno.env.get('SARVAM_MODEL') ?? 'sarvam-105b';
  const start = performance.now();

  let response: Response;
  try {
    response = await fetch('https://api.sarvam.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'api-subscription-key': apiKey,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a productivity coach. Output only valid JSON. No markdown, no explanation, no reasoning.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
    });
  } catch (fetchErr) {
    return { ok: false, reason: `Network error reaching Sarvam: ${String(fetchErr)}` };
  }

  const rawText = await response.text();
  const latency = Math.round(performance.now() - start);

  if (!response.ok) {
    console.warn(JSON.stringify({ event: 'sarvam_http_error', reqId, status: response.status, body: rawText.slice(0, 400), latency }));
    return { ok: false, reason: `Sarvam returned HTTP ${response.status}: ${rawText.slice(0, 200)}` };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    console.warn(JSON.stringify({ event: 'sarvam_invalid_json', reqId, rawText: rawText.slice(0, 400) }));
    return { ok: false, reason: 'Sarvam returned non-JSON response.' };
  }

  const choice = parsed.choices?.[0];
  const usage = parsed.usage ?? {};

  if (choice?.finish_reason === 'length') {
    console.warn(JSON.stringify({ event: 'sarvam_length_exceeded', reqId, usage, latency }));
    return { ok: false, reason: 'Model exhausted completion budget (finish_reason=length). Routing to local fallback.' };
  }

  const content = choice?.message?.content;
  if (!content) {
    const detail = parsed.error ? JSON.stringify(parsed.error) : Object.keys(parsed).join(',');
    console.warn(JSON.stringify({ event: 'sarvam_empty_content', reqId, detail, latency }));
    return { ok: false, reason: `Sarvam returned empty content. Detail: ${detail}` };
  }

  console.log(JSON.stringify({ event: 'sarvam_success', reqId, model, finish_reason: choice.finish_reason, usage, latency }));
  return { ok: true, content, model };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonError(405, 'Method not allowed.');

  const reqId = crypto.randomUUID();
  console.log(JSON.stringify({ event: 'request_started', reqId }));

  // ── Infrastructure setup ─────────────────────────────────────────────────
  // These are genuine infrastructure failures → HTTP 500 is appropriate.
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error(JSON.stringify({ event: 'missing_env', reqId }));
    return jsonError(500, 'Server configuration error.');
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return jsonError(400, 'Invalid JSON body.');
  }

  const workerSecret = Deno.env.get('WORKER_SECRET');
  const reqSecret = request.headers.get('x-worker-secret') ?? '';
  
  if (!workerSecret || reqSecret !== workerSecret) {
    console.error(JSON.stringify({ event: 'unauthorized_worker', reqId }));
    return jsonError(401, 'Unauthorized worker.');
  }

  if (!body.userId) {
    return jsonError(400, 'Missing userId in worker payload.');
  }
  
  let userId = body.userId;

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const kind: InsightKind = body.kind ?? 'dashboard';
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();

  console.log(JSON.stringify({ event: 'request_parsed', reqId, kind, userId }));

  // ── Fetch minimal context (parallel) ────────────────────────────────────
  const [profileResult, tasksResult, sessionsResult, interruptionsResult] = await Promise.all([
    adminClient.from('profiles').select('current_streak,daily_focus_goal_minutes').eq('id', userId).single(),
    adminClient.from('tasks').select('id,title,description,priority,status,due_date,updated_at').eq('user_id', userId).limit(40),
    adminClient.from('focus_sessions').select('id,started_at,duration_minutes,completed,interrupted').eq('user_id', userId).gte('started_at', cutoff).order('started_at', { ascending: false }).limit(60),
    adminClient.from('interruptions').select('occurred_at,reason,session_id').eq('user_id', userId).gte('occurred_at', cutoff).limit(60),
  ]);

  // DB errors are infrastructure failures → 500
  if (profileResult.error) {
    console.error(JSON.stringify({ event: 'db_error', reqId, table: 'profiles', error: profileResult.error.message }));
    return jsonError(500, 'Database error fetching profile.');
  }
  if (tasksResult.error) {
    console.error(JSON.stringify({ event: 'db_error', reqId, table: 'tasks', error: tasksResult.error.message }));
    return jsonError(500, 'Database error fetching tasks.');
  }
  if (sessionsResult.error) {
    console.error(JSON.stringify({ event: 'db_error', reqId, table: 'sessions', error: sessionsResult.error.message }));
    return jsonError(500, 'Database error fetching sessions.');
  }
  if (interruptionsResult.error) {
    console.error(JSON.stringify({ event: 'db_error', reqId, table: 'interruptions', error: interruptionsResult.error.message }));
    return jsonError(500, 'Database error fetching interruptions.');
  }

  const context = buildContext(kind, body, {
    profile: profileResult.data as Record<string, unknown> | null,
    tasks: (tasksResult.data ?? []) as Record<string, unknown>[],
    sessions: (sessionsResult.data ?? []) as Record<string, unknown>[],
    interruptions: (interruptionsResult.data ?? []) as Record<string, unknown>[],
  });

  const prompt = buildPrompt(kind, context);
  console.log(JSON.stringify({ event: 'prompt_built', reqId, kind, contextKeys: Object.keys(context) }));

  // ── Call Sarvam ──────────────────────────────────────────────────────────
  const sarvamResult = await callSarvam(prompt, reqId);
  if (!sarvamResult.ok) {
    return providerFailure(sarvamResult.reason, reqId);
  }

  // ── Parse model response ─────────────────────────────────────────────────
  const parsed = parseCoachResponse(sarvamResult.content);
  if (!parsed.ok) {
    return providerFailure(parsed.reason, reqId);
  }

  // ── Build insight object ─────────────────────────────────────────────────
  const insight = {
    user_id: userId,
    kind,
    title: parsed.title,
    summary: parsed.summary,
    recommendations: parsed.recommendations,
    evidence: context,
    related_session_id: body.sessionId ?? null,
    related_task_id: body.taskId ?? null,
    source_start: cutoff,
    source_end: new Date().toISOString(),
    provider: 'sarvam',
    model: sarvamResult.model,
    confidence: parsed.confidence,
  };

  // ── Persist only historical records ─────────────────────────────────────
  if (PERSIST_KINDS.has(kind)) {
    let persistResult;

    // session_reflection is unique per (user, session) — upsert
    if (kind === 'session_reflection' && body.sessionId) {
      const existing = await adminClient
        .from('ai_insights')
        .select('id')
        .eq('user_id', userId)
        .eq('kind', kind)
        .eq('related_session_id', body.sessionId)
        .maybeSingle();

      if (existing.error) {
        console.error(JSON.stringify({ event: 'db_error', reqId, op: 'upsert_check', error: existing.error.message }));
        // Non-fatal: return the insight without persistence
        return jsonOk({ success: true, insights: [insight] });
      }

      persistResult = existing.data
        ? await adminClient.from('ai_insights').update(insight).eq('id', existing.data.id).select('*')
        : await adminClient.from('ai_insights').insert(insight).select('*');
    } else {
      persistResult = await adminClient.from('ai_insights').insert(insight).select('*');
    }

    if (persistResult.error) {
      // Non-fatal: log and return insight without DB record
      console.error(JSON.stringify({ event: 'db_persist_error', reqId, kind, error: persistResult.error.message }));
      console.log(JSON.stringify({ event: 'request_completed_without_persist', reqId }));
      return jsonOk({ success: true, insights: [insight] });
    }

    console.log(JSON.stringify({ event: 'request_completed', reqId, persisted: true }));
    return jsonOk({ success: true, insights: persistResult.data });
  }

  // Not persisted (e.g. task_breakdown) — return ephemeral insight
  console.log(JSON.stringify({ event: 'request_completed', reqId, persisted: false }));
  return jsonOk({ success: true, insights: [insight] });
});
