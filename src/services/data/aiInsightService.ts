/**
 * AI Insight Service
 *
 * This module is the single authority for provider routing and caching.
 * Routing decisions are made here, in the frontend — never inside the Edge Function.
 *
 * Routing table:
 *  LOCAL-ONLY (no network request):
 *    - smart_planner
 *    - prioritization
 *    - productive_hours
 *    - distraction_patterns
 *
 *  SARVAM (cloud via Edge Function):
 *    - task_summary
 *    - daily_review
 *    - burnout_detection
 *    - session_reflection
 *    - task_breakdown
 *
 *  HYBRID (local analytics → Sarvam summarization):
 *    - weekly_report
 *
 *  FALLBACK: if Sarvam fails for any reason, the backend handles retries.
 */
import { supabase } from '@/lib/supabase/client';
import { AIInsight, AIInsightKind } from '@/types';
import type { Database, Json } from '@/lib/supabase/database.types';
import { GenerateAIInsightInput } from '../ai/aiProvider';
import { LocalInsightsProvider } from '../ai/providers/localProvider';

const localProvider = new LocalInsightsProvider();

/** Kinds that always use LocalProvider — no network request is ever made. */
const LOCAL_ONLY_KINDS = new Set<AIInsightKind>([
  'smart_planner',
  'prioritization',
  'productive_hours',
  'distraction_patterns',
]);


// ---------------------------------------------------------------------------
// In-memory response cache
// ---------------------------------------------------------------------------
interface CacheEntry {
  insights: AIInsight[];
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

const CACHE_TTL: Partial<Record<AIInsightKind, number>> = {
  dashboard: 10 * 60 * 1000,        // 10 min
  daily_review: 10 * 60 * 1000,     // 10 min (stale-until-changed, approximated)
  weekly_report: 60 * 60 * 1000,    // 1 hour
  session_reflection: Infinity,      // permanent after generation
};

const DEFAULT_TTL = 5 * 60 * 1000; // 5 min for anything else

function cacheKey(input: GenerateAIInsightInput): string {
  return `${input.kind}:${input.sessionId ?? ''}:${input.taskId ?? ''}`;
}

function getCached(input: GenerateAIInsightInput): AIInsight[] | null {
  const entry = cache.get(cacheKey(input));
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(cacheKey(input));
    return null;
  }
  return entry.insights;
}

function setCached(input: GenerateAIInsightInput, insights: AIInsight[]): void {
  const ttl = CACHE_TTL[input.kind] ?? DEFAULT_TTL;
  cache.set(cacheKey(input), {
    insights,
    expiresAt: ttl === Infinity ? Number.MAX_SAFE_INTEGER : Date.now() + ttl,
  });
}

/** Invalidate cache entries for a specific kind (e.g., after data changes). */
export function invalidateInsightCache(kind?: AIInsightKind): void {
  if (!kind) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(`${kind}:`)) cache.delete(key);
  }
}

// ---------------------------------------------------------------------------
// In-flight deduplication: prevent duplicate concurrent requests
// ---------------------------------------------------------------------------
const inFlight = new Map<string, Promise<AIInsight[]>>();

// ---------------------------------------------------------------------------
// Database helpers
// ---------------------------------------------------------------------------
type AIInsightRow = Database['public']['Tables']['ai_insights']['Row'];

function isMissingOptionalTable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: string; message?: string; details?: string; status?: number };
  const text = `${candidate.message ?? ''} ${candidate.details ?? ''}`.toLowerCase();
  return (
    candidate.code === '42P01' ||
    candidate.code === 'PGRST205' ||
    candidate.code === '404' ||
    candidate.status === 404 ||
    text.includes('could not find the table') ||
    text.includes('relation "public.ai_insights" does not exist') ||
    text.includes("relation 'public.ai_insights' does not exist") ||
    text.includes('the resource was not found') ||
    text.includes('not found')
  );
}

function stringArray(value: Json): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function objectValue(value: Json): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function mapAIInsight(row: AIInsightRow): AIInsight {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    summary: row.summary,
    recommendations: stringArray(row.recommendations),
    evidence: objectValue(row.evidence),
    relatedSessionId: row.related_session_id,
    relatedTaskId: row.related_task_id,
    sourceStart: row.source_start,
    sourceEnd: row.source_end,
    provider: row.provider,
    model: row.model,
    confidence: row.confidence,
    generatedAt: row.generated_at,
    createdAt: row.created_at,
  };
}

export async function listAIInsights(): Promise<AIInsight[]> {
  const { data, error } = await supabase
    .from('ai_insights')
    .select('*')
    .order('generated_at', { ascending: false })
    .limit(50);

  if (error) {
    if (isMissingOptionalTable(error)) return [];
    throw error;
  }
  return data.map(mapAIInsight);
}

// ---------------------------------------------------------------------------
// Core generation function — the single entry point for all AI insight requests.
// ---------------------------------------------------------------------------
export async function generateAIInsight(
  input: GenerateAIInsightInput
): Promise<AIInsight[]> {
  const key = cacheKey(input);

  // 1. Return from cache if valid
  const cached = getCached(input);
  if (cached) return cached;

  // 2. Deduplicate concurrent requests for the same input
  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = _generate(input).finally(() => {
    inFlight.delete(key);
  });

  inFlight.set(key, promise);
  return promise;
}

async function _generate(
  input: GenerateAIInsightInput
): Promise<AIInsight[]> {
  const { kind } = input;

  if (!LOCAL_ONLY_KINDS.has(kind)) {
    throw new Error(`[AIService] generateAIInsight called for remote insight type: ${kind}. Remote insights must be enqueued via enqueueService.`);
  }

  const insights = await localProvider.generateInsight(input);
  setCached(input, insights);
  return insights;
}
