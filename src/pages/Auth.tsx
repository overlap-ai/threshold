import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signIn, signUp } from '@/hooks/useAuth';

export function AuthPage() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const { error } = mode === 'signin' ? await signIn(email, password) : await signUp(email, password);
    setLoading(false);
    if (error) {
      setError(error.message ?? t('auth.errors.generic'));
      return;
    }
    if (mode === 'signup') setInfo(t('auth.checkEmail'));
  };

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 17 L12 7 L19 17" />
            <line x1="3" y1="20" x2="21" y2="20" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('app.name')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('app.tagline')}</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t('auth.email')}</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">{t('auth.password')}</Label>
          <Input
            id="password"
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mode === 'signup' ? (
            <p className="text-xs text-muted-foreground">{t('auth.passwordHint')}</p>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
        ) : null}
        {info ? (
          <div className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">{info}</div>
        ) : null}

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? t('common.loading') : mode === 'signin' ? t('auth.enter') : t('auth.create')}
        </Button>

        <button
          type="button"
          onClick={() => {
            setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
            setError(null);
            setInfo(null);
          }}
          className="block w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === 'signin' ? t('auth.noAccount') + ' ' + t('auth.signUp') : t('auth.haveAccount') + ' ' + t('auth.signIn')}
        </button>
      </form>
    </div>
  );
}
