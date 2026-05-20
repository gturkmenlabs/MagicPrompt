/**
 * Testing sayfasi for prompt + version secimi.
 * API'den prompt listesi ve selected prompt'un versiyonlarini ceker;
 * varsayilan: ilk prompt, en guncel version (latest).
 */
import { useState, useCallback, useEffect } from 'react';
import { getAuthHeaders } from '@/services/apiClient';

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '') || '/api/v1';

export interface PromptOption {
  id: string;
  version: string;
  name?: string;
}

export interface VersionOption {
  version: string;
  createdAt?: string;
}

export interface UseTestingPromptSelectionResult {
  promptId: string;
  version: string;
  prompts: PromptOption[];
  versions: VersionOption[];
  setPromptId: (id: string) => void;
  setVersion: (v: string) => void;
  loading: boolean;
  error: string;
  refetch: () => Promise<void>;
}

export function useTestingPromptSelection(enabled: boolean): UseTestingPromptSelectionResult {
  const [prompts, setPrompts] = useState<PromptOption[]>([]);
  const [versions, setVersions] = useState<VersionOption[]>([]);
  const [promptId, setPromptIdState] = useState('');
  const [version, setVersionState] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchPrompts = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError('');
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/prompts?limit=100`, { headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Failed to load prompts');
      const list = (data.prompts || []) as { id: string; version: string; name?: string }[];
      setPrompts(list);
      const uniqueIds = [...new Set(list.map((p) => p.id))];
      setPromptIdState((prev) => (uniqueIds.length > 0 && !prev ? (uniqueIds[0] ?? '') : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
      setPrompts([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  const fetchVersions = useCallback(async (id: string) => {
    if (!id) {
      setVersions([]);
      setVersionState('');
      return;
    }
    setError('');
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/prompts/${encodeURIComponent(id)}/versions`, { headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Failed to load versions');
      const list = (data.versions || []) as { version: string; createdAt?: string }[];
      setVersions(list);
      if (list.length > 0) {
        setVersionState(list[0]?.version ?? '');
      } else {
        setVersionState('');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
      setVersions([]);
      setVersionState('');
    }
  }, []);

  useEffect(() => {
    if (enabled) fetchPrompts();
  }, [enabled, fetchPrompts]);

  useEffect(() => {
    if (enabled && promptId) {
      fetchVersions(promptId);
    } else {
      setVersions([]);
      setVersionState('');
    }
  }, [enabled, promptId, fetchVersions]);

  const setPromptId = useCallback((id: string) => {
    setPromptIdState(id);
  }, []);

  const setVersion = useCallback((v: string) => {
    setVersionState(v);
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchPrompts();
    if (promptId) await fetchVersions(promptId);
    setLoading(false);
  }, [fetchPrompts, fetchVersions, promptId]);

  const effectivePromptId = promptId || (prompts.length > 0 ? ([...new Set(prompts.map((p) => p.id))][0] ?? '') : '');
  const effectiveVersion = version || (versions.length > 0 ? (versions[0]?.version ?? '') : '');

  return {
    promptId: effectivePromptId,
    version: effectiveVersion as string,
    prompts,
    versions,
    setPromptId,
    setVersion,
    loading,
    error,
    refetch,
  };
}
