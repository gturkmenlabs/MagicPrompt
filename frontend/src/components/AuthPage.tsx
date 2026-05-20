import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '../i18n';
import { APP_NAME, APP_VERSION } from '@/version';
import { Button, Card, Input } from './ui';

export default function AuthPage() {
  const { signIn } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn(email, password);
    if (result.error) setError(result.error);
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#071018] text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.14),transparent_30%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_34%)]" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1240px] items-center justify-center px-5 py-10 sm:px-8 lg:px-10">
        <Card tone="hero" className="w-full max-w-[430px] p-6 sm:p-7">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100/70">
              {APP_NAME} v{APP_VERSION}
            </p>
            <h1 className="text-2xl font-semibold text-white">{t.ui.authLogin}</h1>
            <p className="text-[13px] leading-6 text-slate-300">
              Tek adimda input yapin.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <Input
              type="email"
              label={t.ui.authEmail}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              required
            />

            <Input
              type="password"
              label={t.ui.authPassword}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="--------"
              required
            />

            {error && (
              <div className="rounded-[14px] border border-rose-300/18 bg-rose-400/10 px-4 py-3 text-[13px] text-rose-100">
                {error}
              </div>
            )}

            <Button variant="primary" size="lg" className="w-full" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : t.ui.authLogin}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
