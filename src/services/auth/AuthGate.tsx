import React, { useState } from 'react';
import { BrainCircuit, Loader2, Lock, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/GlassPanel';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { useAuth } from './AuthProvider';

type AuthMode = 'login' | 'signup' | 'reset';

interface AuthGateProps {
  children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const { loading, passwordRecovery, session } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-full bg-background text-foreground flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Restoring session
        </div>
      </div>
    );
  }

  if (passwordRecovery) return <PasswordRecoveryScreen />;

  if (!session) return <AuthScreen />;

  return <>{children}</>;
}

function PasswordRecoveryScreen() {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setPending(true);

    try {
      await updatePassword(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="h-screen w-full bg-background text-foreground flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Card className="p-6">
          <div className="mb-6">
            <h1 className="text-xl font-semibold tracking-tight mb-1">Set new password</h1>
            <p className="text-sm text-muted-foreground">Choose a new password for your LockIn account.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">New Password</label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                disabled={pending}
                required
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Confirm Password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                disabled={pending}
                required
              />
            </div>
            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending && <Loader2 className="w-4 h-4 animate-spin" />}
              Update Password
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

function AuthScreen() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSignup = mode === 'signup';
  const isReset = mode === 'reset';

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setError(null);

    try {
      if (isReset) {
        await resetPassword(email.trim());
        setMessage('Password reset instructions have been sent.');
        return;
      }

      if (isSignup) {
        const result = await signUp({
          email: email.trim(),
          password,
          displayName: displayName.trim() || email.split('@')[0] || 'User',
        });
        if (result.needsEmailConfirmation) {
          setMessage('Check your email to confirm your account.');
        }
        return;
      }

      await signIn({ email: email.trim(), password });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setPending(false);
    }
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
    setMessage(null);
  };

  return (
    <div className="h-screen w-full bg-background text-foreground flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-foreground/10 flex items-center justify-center">
            <BrainCircuit className="w-5 h-5 text-foreground/80" />
          </div>
          <span className="font-semibold text-lg tracking-tight">LockIn</span>
        </div>

        <Card className="p-6">
          <div className="mb-6">
            <h1 className="text-xl font-semibold tracking-tight mb-1">
              {isReset ? 'Reset password' : isSignup ? 'Create your workspace' : 'Welcome back'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isReset ? 'Enter your account email.' : 'Your focus workspace is protected.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Display Name</label>
                <Input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Saksham"
                  autoComplete="name"
                  disabled={pending}
                />
              </div>
            )}

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={pending}
                  required
                />
              </div>
            </div>

            {!isReset && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    autoComplete={isSignup ? 'new-password' : 'current-password'}
                    disabled={pending}
                    minLength={6}
                    required
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                {message}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={pending}>
              {pending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isReset ? 'Send Reset Link' : isSignup ? 'Create Account' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-5 flex items-center justify-between gap-3 text-xs">
            <button
              type="button"
              onClick={() => switchMode(isSignup ? 'login' : 'signup')}
              className={cn('text-muted-foreground hover:text-foreground transition-colors', isReset && 'invisible')}
            >
              {isSignup ? 'Use existing account' : 'Create account'}
            </button>
            <button
              type="button"
              onClick={() => switchMode(isReset ? 'login' : 'reset')}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {isReset ? 'Back to sign in' : 'Forgot password?'}
            </button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
