import React, { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Input, SectionHeader, Select } from '@/components/ui';
import type { Framework } from '@/types';
import {
  DEFAULT_SYSTEM_BRAIN_CONFIG,
  SYSTEM_CONTROL_STORAGE_KEY,
  decryptSystemControlConfig,
  encryptSystemControlConfig,
  verifySystemControlPassword,
  type SystemBrainConfig,
} from '@/services/systemBrain';

interface SystemControlCenterProps {
  config: SystemBrainConfig;
  onConfigChange: (next: SystemBrainConfig) => void;
  availableDomains: Array<{ value: string; label: string }>;
}

export default function SystemControlCenter({
  config,
  onConfigChange,
  availableDomains,
}: SystemControlCenterProps) {
  const [password, setPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSecret, setActiveSecret] = useState<string | null>(null);

  useEffect(() => {
    if (!unlocked || !activeSecret) return;
    encryptSystemControlConfig(config, activeSecret)
      .then((encrypted) => {
        localStorage.setItem(SYSTEM_CONTROL_STORAGE_KEY, encrypted);
      })
      .catch(() => {
        // Non-blocking persistence error.
      });
  }, [config, unlocked, activeSecret]);

  const domainOptions = useMemo(() => {
    const hasAuto = availableDomains.some((item) => item.value === 'auto');
    if (hasAuto) return availableDomains;
    return [{ value: 'auto', label: 'Auto detect' }, ...availableDomains];
  }, [availableDomains]);

  const handleUnlock = async () => {
    setLoading(true);
    setError(null);
    try {
      const valid = await verifySystemControlPassword(password);
      if (!valid) {
        setError('Sifre hatali.');
        return;
      }
      setUnlocked(true);
      setActiveSecret(password);

      const encrypted = localStorage.getItem(SYSTEM_CONTROL_STORAGE_KEY);
      if (encrypted) {
        const loaded = await decryptSystemControlConfig(encrypted, password).catch(() => null);
        if (loaded) {
          onConfigChange({ ...DEFAULT_SYSTEM_BRAIN_CONFIG, ...loaded });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (!unlocked) {
    return (
      <Card className="p-5">
        <SectionHeader
          eyebrow="System Control"
          title="Global brain controller (locked)"
          description="Bu bolum sifreli. Kilidi acmadan tum sistem kontrolleri gizli kalir."
          actions={<Badge tone="warning">Encrypted</Badge>}
        />
        <div className="mt-5 space-y-4">
          <Input
            type="password"
            label="Control password"
            value={password}
            placeholder="Enter password"
            onChange={(event) => setPassword(event.target.value)}
          />
          {error && (
            <p className="text-[12px] text-rose-300">{error}</p>
          )}
          <div className="flex gap-3">
            <Button variant="primary" onClick={handleUnlock} disabled={loading || !password.trim()}>
              {loading ? 'Unlocking...' : 'Unlock system control'}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <SectionHeader
        eyebrow="System Control"
        title="Project brain algorithm"
        description="Bu paneldeki algoritma tum ana prompt akisini merkezi olarak yonetir."
        actions={<Badge tone={config.enabled ? 'success' : 'neutral'}>{config.enabled ? 'Active' : 'Standby'}</Badge>}
      />

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="ui-preview-surface flex items-center justify-between">
          <span className="text-[13px] text-slate-200">Brain enabled</span>
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(event) => onConfigChange({ ...config, enabled: event.target.checked })}
          />
        </label>

        <label className="ui-preview-surface flex items-center justify-between">
          <span className="text-[13px] text-slate-200">Global lock</span>
          <input
            type="checkbox"
            checked={config.globalLock}
            onChange={(event) => onConfigChange({ ...config, globalLock: event.target.checked })}
          />
        </label>

        <label className="ui-preview-surface flex items-center justify-between">
          <span className="text-[13px] text-slate-200">Force Agent Blueprint</span>
          <input
            type="checkbox"
            checked={config.forceAgentBlueprint}
            onChange={(event) => onConfigChange({ ...config, forceAgentBlueprint: event.target.checked })}
          />
        </label>

        <label className="ui-preview-surface flex items-center justify-between">
          <span className="text-[13px] text-slate-200">Enforce auto route</span>
          <input
            type="checkbox"
            checked={config.enforceAutoRoute}
            onChange={(event) => onConfigChange({ ...config, enforceAutoRoute: event.target.checked })}
          />
        </label>

        <label className="ui-preview-surface flex items-center justify-between">
          <span className="text-[13px] text-slate-200">Enforce auto framework</span>
          <input
            type="checkbox"
            checked={config.enforceAutoFramework}
            onChange={(event) => onConfigChange({ ...config, enforceAutoFramework: event.target.checked })}
          />
        </label>

        <label className="ui-preview-surface flex items-center justify-between">
          <span className="text-[13px] text-slate-200">Force search + thinking</span>
          <input
            type="checkbox"
            checked={config.forceSearchAndThinking}
            onChange={(event) => onConfigChange({ ...config, forceSearchAndThinking: event.target.checked })}
          />
        </label>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <Select
          label="Forced domain"
          value={config.forcedDomainId}
          onChange={(event) => onConfigChange({ ...config, forcedDomainId: event.target.value })}
          options={domainOptions}
        />
        <Select
          label="Forced output language"
          value={config.forcedOutputLanguage}
          onChange={(event) =>
            onConfigChange({
              ...config,
              forcedOutputLanguage: event.target.value as SystemBrainConfig['forcedOutputLanguage'],
            })
          }
          options={[
            { value: 'auto', label: 'Auto' },
            { value: 'tr', label: 'Turkish' },
            { value: 'en', label: 'English' },
          ]}
        />
        <Select
          label="Forced output format"
          value={config.forcedOutputFormat}
          onChange={(event) =>
            onConfigChange({
              ...config,
              forcedOutputFormat: event.target.value as SystemBrainConfig['forcedOutputFormat'],
            })
          }
          options={[
            { value: 'auto', label: 'Auto' },
            { value: 'markdown', label: 'Markdown' },
            { value: 'json', label: 'JSON' },
            { value: 'numbered', label: 'List' },
            { value: 'table', label: 'Table' },
            { value: 'code', label: 'Code' },
            { value: 'xml', label: 'XML' },
          ]}
        />
      </div>
    </Card>
  );
}
