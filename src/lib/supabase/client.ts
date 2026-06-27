import { createClient } from '@supabase/supabase-js';
import { requirePublicEnv } from '@/lib/env';
import type { Database } from './database.types';

const supabaseUrl = requirePublicEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = requirePublicEnv('VITE_SUPABASE_ANON_KEY');

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
  },
});
