import { supabase } from '@/lib/supabase/client';
import type { UserSettings } from '@/types';
import type { Database } from '@/lib/supabase/database.types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export function mapProfile(row: ProfileRow): UserSettings {
  return {
    name: row.display_name,
    dailyFocusGoalMinutes: row.daily_focus_goal_minutes,
    defaultSessionMinutes: row.default_session_minutes,
    theme: row.theme,
  };
}

export async function getProfile(userId: string): Promise<UserSettings> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return mapProfile(data);
}

export async function updateProfile(userId: string, settings: Partial<UserSettings>): Promise<UserSettings> {
  const payload: Database['public']['Tables']['profiles']['Update'] = {};

  if (settings.name !== undefined) payload.display_name = settings.name;
  if (settings.dailyFocusGoalMinutes !== undefined) payload.daily_focus_goal_minutes = settings.dailyFocusGoalMinutes;
  if (settings.defaultSessionMinutes !== undefined) payload.default_session_minutes = settings.defaultSessionMinutes;
  if (settings.theme !== undefined) payload.theme = settings.theme;

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return mapProfile(data);
}
