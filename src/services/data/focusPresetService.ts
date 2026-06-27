import { supabase } from '@/lib/supabase/client';
import type { FocusPreset } from '@/types';
import type { Database } from '@/lib/supabase/database.types';

type FocusPresetRow = Database['public']['Tables']['focus_presets']['Row'];

function mapPreset(row: FocusPresetRow): FocusPreset {
  return {
    id: row.id,
    name: row.name,
    focusDurationMinutes: row.focus_duration_minutes,
    breakCount: row.break_count,
    breakDurationMinutes: row.break_duration_minutes,
    longBreakDurationMinutes: row.long_break_duration_minutes,
    sessionsBeforeLongBreak: row.sessions_before_long_break,
    sortOrder: row.sort_order,
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listFocusPresets(): Promise<FocusPreset[]> {
  const { data, error } = await supabase
    .from('focus_presets')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data.map(mapPreset);
}

export async function createFocusPreset(input: Omit<FocusPreset, 'id' | 'createdAt' | 'updatedAt'>): Promise<FocusPreset> {
  const { data, error } = await supabase
    .from('focus_presets')
    .insert({
      name: input.name,
      focus_duration_minutes: input.focusDurationMinutes,
      break_count: input.breakCount,
      break_duration_minutes: input.breakDurationMinutes,
      long_break_duration_minutes: input.longBreakDurationMinutes,
      sessions_before_long_break: input.sessionsBeforeLongBreak,
      sort_order: input.sortOrder,
      is_default: input.isDefault,
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapPreset(data);
}

export async function updateFocusPreset(input: FocusPreset): Promise<FocusPreset> {
  const { data, error } = await supabase
    .from('focus_presets')
    .update({
      name: input.name,
      focus_duration_minutes: input.focusDurationMinutes,
      break_count: input.breakCount,
      break_duration_minutes: input.breakDurationMinutes,
      long_break_duration_minutes: input.longBreakDurationMinutes,
      sessions_before_long_break: input.sessionsBeforeLongBreak,
      sort_order: input.sortOrder,
      is_default: input.isDefault,
    })
    .eq('id', input.id)
    .select('*')
    .single();

  if (error) throw error;
  return mapPreset(data);
}

export async function deleteFocusPreset(presetId: string): Promise<void> {
  const { error } = await supabase.from('focus_presets').delete().eq('id', presetId);
  if (error) throw error;
}
