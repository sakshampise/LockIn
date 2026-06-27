import { supabase } from '@/lib/supabase/client';
import type { FocusSession, Interruption } from '@/types';
import type { Database } from '@/lib/supabase/database.types';

type SessionRow = Database['public']['Tables']['focus_sessions']['Row'];
type InterruptionRow = Database['public']['Tables']['interruptions']['Row'];

function mapSession(row: SessionRow): FocusSession {
  return {
    id: row.id,
    targetId: row.target_type === 'page' ? row.target_page_id ?? '' : row.target_task_id ?? '',
    targetType: row.target_type,
    targetTitle: row.target_title,
    presetId: row.preset_id,
    durationMinutes: row.duration_minutes,
    plannedDurationMinutes: row.planned_duration_minutes,
    actualDurationSeconds: row.actual_duration_seconds,
    interruptionCount: row.interruption_count,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    completed: row.completed,
    interrupted: row.interrupted,
  };
}

function mapInterruption(row: InterruptionRow): Interruption {
  return {
    id: row.id,
    sessionId: row.session_id,
    reason: row.reason ?? '',
    timestamp: row.occurred_at,
  };
}

export async function listFocusSessions(): Promise<FocusSession[]> {
  const { data, error } = await supabase
    .from('focus_sessions')
    .select('*')
    .order('started_at', { ascending: false });

  if (error) throw error;
  return data.map(mapSession);
}

export async function listInterruptions(): Promise<Interruption[]> {
  const { data, error } = await supabase
    .from('interruptions')
    .select('*')
    .order('occurred_at', { ascending: false });

  if (error) throw error;
  return data.map(mapInterruption);
}

export async function startFocusSession(input: {
  targetId: string;
  targetType: 'page' | 'task';
  targetTitle: string;
  presetId: string | null;
  durationMinutes: number;
}): Promise<FocusSession> {
  const { data, error } = await supabase
    .from('focus_sessions')
    .insert({
      target_type: input.targetType,
      target_page_id: input.targetType === 'page' ? input.targetId : null,
      target_task_id: input.targetType === 'task' ? input.targetId : null,
      target_title: input.targetTitle,
      preset_id: input.presetId,
      duration_minutes: input.durationMinutes,
      planned_duration_minutes: input.durationMinutes,
      status: 'active',
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapSession(data);
}

export async function endFocusSession(input: {
  session: FocusSession;
  completed: boolean;
  interrupted: boolean;
  reason?: string;
}): Promise<{ session: FocusSession; interruption: Interruption | null }> {
  const endedAt = new Date().toISOString();
  const actualDurationSeconds = Math.max(0, Math.round((new Date(endedAt).getTime() - new Date(input.session.startedAt).getTime()) / 1000));
  const interruptionCount = input.interrupted ? input.session.interruptionCount + 1 : input.session.interruptionCount;
  const status: Database['public']['Enums']['lockin_focus_session_status'] = input.interrupted
    ? 'interrupted'
    : input.completed
      ? 'completed'
      : 'cancelled';

  const { data, error } = await supabase
    .from('focus_sessions')
    .update({
      ended_at: endedAt,
      completed: input.completed,
      interrupted: input.interrupted,
      actual_duration_seconds: actualDurationSeconds,
      interruption_count: interruptionCount,
      status,
    })
    .eq('id', input.session.id)
    .select('*')
    .single();

  if (error) throw error;

  let interruption: Interruption | null = null;
  if (input.interrupted) {
    const { data: intData, error: intError } = await supabase
      .from('interruptions')
      .insert({
        session_id: input.session.id,
        reason: input.reason?.trim() || null,
        occurred_at: endedAt,
      })
      .select('*')
      .single();

    if (intError) throw intError;
    interruption = mapInterruption(intData);
  }

  return { session: mapSession(data), interruption };
}
