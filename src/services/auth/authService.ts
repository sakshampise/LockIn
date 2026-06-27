import { supabase } from '@/lib/supabase/client';

export interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

function getRedirectUrl(): string {
  return `${window.location.origin}/`;
}

export async function signUpWithEmail({ email, password, displayName }: SignUpInput) {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getRedirectUrl(),
      data: {
        display_name: displayName,
      },
    },
  });
}

export async function signInWithEmail({ email, password }: SignInInput) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function sendPasswordReset(email: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getRedirectUrl(),
  });
}

export async function updatePassword(password: string) {
  return supabase.auth.updateUser({ password });
}

export async function ensureUserProfile(userId: string, email: string | undefined, displayName?: string) {
  const fallbackName = email?.split('@')[0] || 'User';

  return supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        display_name: displayName?.trim() || fallbackName,
      },
      { onConflict: 'id', ignoreDuplicates: true },
    );
}
