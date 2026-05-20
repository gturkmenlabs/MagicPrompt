/**
 * React auth context.
 * Supports Supabase email/password auth with local admin fallback.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session as SupabaseSession, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/services/supabaseClient';
import {
  clearLocalAuthSession,
  readValidLocalAuthSession,
  writeLocalAuthSession,
} from '@/services/authStorage';

export interface UserProfile {
  userId: string;
  email: string;
  orgId: string;
  plan: string;
  role: string;
  name?: string;
}

export type OAuthProvider = 'google' | 'github' | 'apple';
export type AuthStrategy = 'supabase' | 'local-admin' | 'hybrid';

interface AuthState {
  session: { access_token: string; provider: 'supabase' | 'local-admin' | 'open-access' } | null;
  user: { id: string; email: string } | null;
  profile: UserProfile | null;
  loading: boolean;
  authStrategy: AuthStrategy;
  oauthEnabledProviders: OAuthProvider[];
  signUp: (email: string, password: string, name?: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<{ error?: string }>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@neomagic.org';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '';
const ALLOW_OPEN_ACCESS = import.meta.env.VITE_ALLOW_OPEN_ACCESS === 'true';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const AUTH_API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '') || '/api/v1';

const HAS_SUPABASE =
  Boolean(SUPABASE_URL)
  && Boolean(SUPABASE_ANON_KEY)
  && !SUPABASE_URL.includes('your-project.supabase.co')
  && !SUPABASE_ANON_KEY.includes('your_anon_key')
  && !SUPABASE_ANON_KEY.includes('placeholder');
const HAS_LOCAL_ADMIN = Boolean(ADMIN_PASSWORD);
const OAUTH_PROVIDER_ENABLED: Record<OAuthProvider, boolean> = {
  google: import.meta.env.VITE_AUTH_GOOGLE_ENABLED !== 'false',
  github: import.meta.env.VITE_AUTH_GITHUB_ENABLED !== 'false',
  apple: import.meta.env.VITE_AUTH_APPLE_ENABLED !== 'false',
};
const OAUTH_ENABLED_PROVIDERS = (Object.keys(OAUTH_PROVIDER_ENABLED) as OAuthProvider[])
  .filter((provider) => OAUTH_PROVIDER_ENABLED[provider]);

const AUTH_STRATEGY: AuthStrategy = HAS_SUPABASE && HAS_LOCAL_ADMIN
  ? 'hybrid'
  : HAS_SUPABASE
    ? 'supabase'
    : 'local-admin';

function mapSupabaseAuthError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes('invalid login credentials')) {
    return 'Gecersiz giris bilgileri. E-posta/sifreyi kontrol edin veya once kayit olun.';
  }
  if (normalized.includes('email not confirmed')) {
    return 'E-posta adresiniz dogrulanmamis. Lutfen gelen kutunuzu kontrol edin.';
  }
  return message;
}

function getDisplayName(email: string, name?: string): string {
  return name?.trim() || email.split('@')[0] || 'user';
}

function getSupabaseUserName(user: Pick<SupabaseUser, 'email' | 'user_metadata'>): string {
  const userMetadata = user.user_metadata as Record<string, unknown> | undefined;
  const candidate = typeof userMetadata?.full_name === 'string'
    ? userMetadata.full_name
    : typeof userMetadata?.name === 'string'
      ? userMetadata.name
      : undefined;
  return getDisplayName(user.email || '', candidate);
}

function buildAdminProfile(email: string, name?: string, overrides?: Partial<UserProfile>): UserProfile {
  return {
    userId: overrides?.userId || `admin-${email.replace(/[^a-z0-9]/gi, '')}`,
    email,
    orgId: overrides?.orgId || 'default-org',
    plan: overrides?.plan || 'team',
    role: overrides?.role || 'admin',
    name: getDisplayName(email, name),
  };
}

function buildSupabaseFallbackProfile(user: Pick<SupabaseUser, 'id' | 'email' | 'user_metadata'>): UserProfile {
  const email = user.email || 'user@workspace.local';
  return {
    userId: user.id,
    email,
    orgId: 'default-org',
    plan: 'free',
    role: 'member',
    name: getSupabaseUserName(user),
  };
}

function normalizeRemoteProfile(
  payload: Record<string, unknown>,
  fallback: { userId: string; email: string; name?: string }
): UserProfile {
  return {
    userId: typeof payload.userId === 'string' ? payload.userId : fallback.userId,
    email: typeof payload.email === 'string' ? payload.email : fallback.email,
    orgId: typeof payload.orgId === 'string' ? payload.orgId : 'default-org',
    plan: typeof payload.plan === 'string' ? payload.plan : 'free',
    role: typeof payload.role === 'string' ? payload.role : 'member',
    name: typeof payload.name === 'string' ? payload.name : getDisplayName(fallback.email, fallback.name),
  };
}

async function requestProvisionedProfile(
  accessToken: string,
  fallback: { userId: string; email: string; name?: string }
): Promise<UserProfile | null> {
  const authHeader = { Authorization: `Bearer ${accessToken}` };

  try {
    const meRes = await fetch(`${AUTH_API_BASE}/auth/me`, {
      headers: authHeader,
    });
    const mePayload = await meRes.json().catch(() => ({}));
    if (meRes.ok) {
      return normalizeRemoteProfile(mePayload as Record<string, unknown>, fallback);
    }

    if (meRes.status !== 403 || (mePayload as { code?: string }).code !== 'NOT_PROVISIONED') {
      return null;
    }

    const provisionRes = await fetch(`${AUTH_API_BASE}/auth/provision`, {
      method: 'POST',
      headers: {
        ...authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: fallback.name }),
    });
    const provisionPayload = await provisionRes.json().catch(() => ({}));
    if (!provisionRes.ok) {
      return null;
    }

    return normalizeRemoteProfile(provisionPayload as Record<string, unknown>, fallback);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<{ access_token: string; provider: 'supabase' | 'local-admin' | 'open-access' } | null>(null);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const clearAuthState = useCallback(() => {
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

  const applyLocalAdminState = useCallback((email: string, name?: string) => {
    const nextProfile = buildAdminProfile(email, name);
    setUser({ id: nextProfile.userId, email: nextProfile.email });
    setSession({ access_token: 'local-session', provider: 'local-admin' });
    setProfile(nextProfile);
  }, []);

  const restoreLocalAdminState = useCallback(() => {
    const stored = readValidLocalAuthSession();
    if (!stored) return false;
    applyLocalAdminState(stored.email, stored.name);
    return true;
  }, [applyLocalAdminState]);

  const applyOpenAccessState = useCallback(() => {
    if (!ALLOW_OPEN_ACCESS) return false;
    const nextProfile = buildAdminProfile(ADMIN_EMAIL, 'Admin');
    setUser({ id: nextProfile.userId, email: nextProfile.email });
    setSession({ access_token: 'open-access', provider: 'open-access' });
    setProfile(nextProfile);
    return true;
  }, []);

  const hydrateSupabaseSession = useCallback(async (nextSession: SupabaseSession | null) => {
    if (!nextSession?.access_token || !nextSession.user?.email) {
      return false;
    }

    const fallback = {
      userId: nextSession.user.id,
      email: nextSession.user.email,
      name: getSupabaseUserName(nextSession.user),
    };
    const resolvedProfile = await requestProvisionedProfile(nextSession.access_token, fallback);

    clearLocalAuthSession();
    setUser({ id: nextSession.user.id, email: nextSession.user.email });
    setSession({ access_token: nextSession.access_token, provider: 'supabase' });
    setProfile(resolvedProfile || buildSupabaseFallbackProfile(nextSession.user));
    return true;
  }, []);

  useEffect(() => {
    let disposed = false;

    const applyNoSupabaseSession = () => {
      if (disposed) return;
      if (HAS_LOCAL_ADMIN && restoreLocalAdminState()) {
        setLoading(false);
        return;
      }
      if (applyOpenAccessState()) {
        setLoading(false);
        return;
      }
      clearAuthState();
      setLoading(false);
    };

    if (!HAS_SUPABASE) {
      applyNoSupabaseSession();
      return;
    }

    const syncSession = async (nextSession: SupabaseSession | null) => {
      if (disposed) return;

      if (!nextSession) {
        applyNoSupabaseSession();
        return;
      }

      setLoading(true);
      const hydrated = await hydrateSupabaseSession(nextSession);
      if (disposed) return;

      if (!hydrated) {
        applyNoSupabaseSession();
        return;
      }

      setLoading(false);
    };

    void supabase.auth.getSession()
      .then(({ data }) => syncSession(data.session))
      .catch(() => applyNoSupabaseSession());

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void syncSession(nextSession);
    });

    return () => {
      disposed = true;
      data.subscription.unsubscribe();
    };
  }, [applyOpenAccessState, clearAuthState, hydrateSupabaseSession, restoreLocalAdminState]);

  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    if (!HAS_SUPABASE) {
      return { error: 'Registration is only available when Supabase auth is configured.' };
    }
    if (password.length < 6) {
      return { error: 'Password must be at least 6 characters.' };
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: name ? { name, full_name: name } : undefined,
        },
      });

      if (error) {
        return { error: error.message };
      }

      if (data.session) {
        await hydrateSupabaseSession(data.session);
      }

      return {};
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Registration failed.' };
    } finally {
      setLoading(false);
    }
  }, [hydrateSupabaseSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (HAS_LOCAL_ADMIN && email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      setLoading(true);
      try {
        if (HAS_SUPABASE) {
          await supabase.auth.signOut().catch(() => undefined);
        }
        applyLocalAdminState(email);
        writeLocalAuthSession({ email, ts: Date.now() });
        return {};
      } finally {
        setLoading(false);
      }
    }

    if (!HAS_SUPABASE) {
      if (!HAS_LOCAL_ADMIN && !ALLOW_OPEN_ACCESS) {
        return { error: 'Authentication is not configured. Configure Supabase or VITE_ADMIN_PASSWORD.' };
      }
      return { error: `Bu ortamda sadece admin girisi aktif. Admin e-postasi: ${ADMIN_EMAIL}` };
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { error: mapSupabaseAuthError(error.message) };
      }
      if (data.session) {
        await hydrateSupabaseSession(data.session);
      }
      return {};
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Sign in failed.' };
    } finally {
      setLoading(false);
    }
  }, [applyLocalAdminState, hydrateSupabaseSession]);

  const signInWithOAuth = useCallback(async (provider: OAuthProvider) => {
    if (!HAS_SUPABASE) {
      return { error: 'OAuth is not configured. Use email/password login.' };
    }
    if (!OAUTH_PROVIDER_ENABLED[provider]) {
      return { error: `${provider} sign-in is currently disabled by configuration.` };
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      return { error: error.message };
    }

    return {};
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!HAS_SUPABASE) {
      return { error: 'Password reset is not available in local admin mode.' };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });

    if (error) {
      return { error: error.message };
    }

    return {};
  }, []);

  const signOut = useCallback(async () => {
    clearLocalAuthSession();
    clearAuthState();
    if (HAS_SUPABASE) {
      await supabase.auth.signOut().catch(() => undefined);
    }
  }, [clearAuthState]);

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      loading,
      authStrategy: AUTH_STRATEGY,
      oauthEnabledProviders: OAUTH_ENABLED_PROVIDERS,
      signUp,
      signIn,
      signInWithOAuth,
      resetPassword,
      signOut,
    }),
    [session, user, profile, loading, signUp, signIn, signInWithOAuth, resetPassword, signOut]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
