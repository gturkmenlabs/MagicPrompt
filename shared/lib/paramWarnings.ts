/**
 * Cift modlu parametre yonetimi: system uyarilari (otomatik) + user uyarilari (yapilandirilabilir).
 * CLI ve UI tarafindan kullanilir.
 */

export type Severity = 'error' | 'warn' | 'info';

export interface ParamWarning {
  code: string;
  severity: Severity;
  message: string;
  source: 'system' | 'user';
  param?: string;
}

export interface ParamWarningOptions {
  /** User tanimli: minimum intent karakter sayisi (varsayilan 10) */
  minIntentLength?: number;
  /** User tanimli: maksimum intent karakter (0 = sinirsiz) */
  maxIntentLength?: number;
  /** API key zorunlu mu (system) */
  requireApiKey?: boolean;
  /** Desteklenen framework listesi (system) */
  allowedFrameworks?: string[];
  /** Desteklenen provider listesi (system) */
  allowedProviders?: string[];
}

const DEFAULT_OPTIONS: Required<Omit<ParamWarningOptions, 'allowedFrameworks' | 'allowedProviders'>> = {
  minIntentLength: 10,
  maxIntentLength: 0,
  requireApiKey: true,
};

/**
 * System uyarilari: API key, framework, provider vb. otomatik kontroller.
 */
export function collectSystemWarnings(params: {
  intent?: string;
  framework?: string;
  provider?: string;
  apiKey?: string;
  apiBaseUrl?: string;
}, opts: ParamWarningOptions = {}): ParamWarning[] {
  const warnings: ParamWarning[] = [];
  const requireKey = opts.requireApiKey ?? DEFAULT_OPTIONS.requireApiKey;
  const allowedFrameworks = opts.allowedFrameworks ?? ['AUTO', 'KERNEL', 'CO_STAR', 'RISEN', 'RTF', 'BAB', 'TAG', 'CARE'];
  const allowedProviders = opts.allowedProviders ?? ['groq', 'gemini', 'huggingface', 'claude', 'claude-opus', 'openrouter', 'deepseek'];

  if (requireKey && !params.apiKey?.trim()) {
    warnings.push({
      code: 'MISSING_API_KEY',
      severity: 'warn',
      message: 'SR_API_KEY veya API_KEY ortam degiskeni yok; sunucu auth bypass kullaniyorsa calisabilir.',
      source: 'system',
      param: 'apiKey',
    });
  }

  if (params.apiBaseUrl && !/^https?:\/\//.test(params.apiBaseUrl)) {
    warnings.push({
      code: 'INVALID_API_URL',
      severity: 'warn',
      message: 'SR_API_URL gecerli bir HTTP(S) adresi degil.',
      source: 'system',
      param: 'apiBaseUrl',
    });
  }

  if (params.framework && !allowedFrameworks.includes(params.framework)) {
    warnings.push({
      code: 'UNKNOWN_FRAMEWORK',
      severity: 'info',
      message: `Framework "${params.framework}" taninmadi; sunucu AUTO kullanacak.`,
      source: 'system',
      param: 'framework',
    });
  }

  if (params.provider && !allowedProviders.includes(params.provider)) {
    warnings.push({
      code: 'UNKNOWN_PROVIDER',
      severity: 'info',
      message: `Provider "${params.provider}" taninmadi; sunucu groq kullanacak.`,
      source: 'system',
      param: 'provider',
    });
  }

  return warnings;
}

/**
 * User uyarilari: min/max intent uzunlugu vb. yapilandirilabilir kurallar.
 */
export function collectUserWarnings(params: {
  intent?: string;
}, opts: ParamWarningOptions = {}): ParamWarning[] {
  const warnings: ParamWarning[] = [];
  const minLen = opts.minIntentLength ?? DEFAULT_OPTIONS.minIntentLength;
  const maxLen = opts.maxIntentLength ?? DEFAULT_OPTIONS.maxIntentLength;
  const intent = params.intent ?? '';
  const len = intent.length;

  if (len > 0 && len < minLen) {
    warnings.push({
      code: 'INTENT_TOO_SHORT',
      severity: 'warn',
      message: `Intent ${len} karakter; onerilen minimum ${minLen}.`,
      source: 'user',
      param: 'intent',
    });
  }

  if (maxLen > 0 && len > maxLen) {
    warnings.push({
      code: 'INTENT_TOO_LONG',
      severity: 'warn',
      message: `Intent ${len} karakter; maksimum ${maxLen} onerilir.`,
      source: 'user',
      param: 'intent',
    });
  }

  return warnings;
}

/**
 * Tum uyarilari toplar (system + user).
 */
export function collectParamWarnings(
  params: { intent?: string; framework?: string; provider?: string; apiKey?: string; apiBaseUrl?: string },
  opts: ParamWarningOptions = {}
): ParamWarning[] {
  return [
    ...collectSystemWarnings(params, opts),
    ...collectUserWarnings(params, opts),
  ];
}

/**
 * Error seviyesinde warning var mi (islemi durdurmak for).
 */
export function hasErrors(warnings: ParamWarning[]): boolean {
  return warnings.some(w => w.severity === 'error');
}
