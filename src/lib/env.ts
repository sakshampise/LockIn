type PublicEnvKey = 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY';

export function requirePublicEnv(key: PublicEnvKey): string {
  const value = import.meta.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}
