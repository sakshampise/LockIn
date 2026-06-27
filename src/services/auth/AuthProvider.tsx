import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthError, Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import {
  ensureUserProfile,
  sendPasswordReset,
  signInWithEmail,
  signOut,
  signUpWithEmail,
  updatePassword,
  type SignInInput,
  type SignUpInput,
} from './authService';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  passwordRecovery: boolean;
  signUp: (input: SignUpInput) => Promise<{ needsEmailConfirmation: boolean }>;
  signIn: (input: SignInInput) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getAuthMessage(error: AuthError): string {
  if (error.message.toLowerCase().includes('invalid login credentials')) {
    return 'The email or password does not match.';
  }

  return error.message;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) console.error('Failed to read auth session:', error);
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      const user = nextSession?.user;
      if (user) {
        void ensureUserProfile(user.id, user.email, user.user_metadata.display_name as string | undefined);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    const { data, error } = await signUpWithEmail(input);
    if (error) throw new Error(getAuthMessage(error));

    if (data.user && data.session) {
      const { error: profileError } = await ensureUserProfile(data.user.id, data.user.email, input.displayName);
      if (profileError) throw new Error(profileError.message);
    }

    return { needsEmailConfirmation: Boolean(data.user && !data.session) };
  }, []);

  const signIn = useCallback(async (input: SignInInput) => {
    const { data, error } = await signInWithEmail(input);
    if (error) throw new Error(getAuthMessage(error));

    if (data.user) {
      const { error: profileError } = await ensureUserProfile(data.user.id, data.user.email);
      if (profileError) throw new Error(profileError.message);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    const { error } = await signOut();
    if (error) throw new Error(getAuthMessage(error));
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await sendPasswordReset(email);
    if (error) throw new Error(getAuthMessage(error));
  }, []);

  const handleUpdatePassword = useCallback(async (password: string) => {
    const { error } = await updatePassword(password);
    if (error) throw new Error(getAuthMessage(error));
    setPasswordRecovery(false);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    session,
    loading,
    passwordRecovery,
    signUp,
    signIn,
    signOut: handleSignOut,
    resetPassword,
    updatePassword: handleUpdatePassword,
  }), [handleSignOut, handleUpdatePassword, loading, passwordRecovery, resetPassword, session, signIn, signUp]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
