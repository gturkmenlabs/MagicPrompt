import fs from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

type BridgeAction = 'run' | 'status';
type BridgeLanguage = 'en' | 'zh';

interface BaseBridgeRequest {
  action: BridgeAction;
}

interface RunBridgeRequest extends BaseBridgeRequest {
  action: 'run';
  query: string;
  language: BridgeLanguage;
  systemPrompt: string;
  knowledge?: string;
}

interface StatusBridgeRequest extends BaseBridgeRequest {
  action: 'status';
}

type BridgeRequest = RunBridgeRequest | StatusBridgeRequest;

interface BridgeResponseBase {
  sdk: 'qwen-agent';
  code?: string;
  error?: string;
}

export interface QwenBridgeRunResponse extends BridgeResponseBase {
  ok: boolean;
  answer?: string;
  model: string;
  provider: string;
  repoPath?: string;
}

export interface QwenBridgeStatusResponse extends BridgeResponseBase {
  ok: true;
  ready: boolean;
  model: string;
  provider: string;
  repoPath?: string;
}

const RUNNER_PATH = path.resolve(process.cwd(), 'server', 'lib', 'qwenAgent', 'runner.py');
const WORKSPACE_ROOT = path.resolve(process.cwd());
const RUNNER_TIMEOUT_MS = 90_000;

function resolvePythonBin(): string {
  if (process.env.QWEN_AGENT_PYTHON_BIN?.trim()) {
    return process.env.QWEN_AGENT_PYTHON_BIN.trim();
  }

  const bundledVenv = path.resolve(process.cwd(), '.venv-qwen-agent', 'bin', 'python');
  return fs.existsSync(bundledVenv) ? bundledVenv : 'python3';
}

function isStatusResponse(value: unknown): value is QwenBridgeStatusResponse {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'ready' in value &&
    'model' in value &&
    'provider' in value,
  );
}

async function callRunner(request: BridgeRequest): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const py = spawn(resolvePythonBin(), [RUNNER_PATH], {
      cwd: WORKSPACE_ROOT,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    });

    let stdout = '';
    let stderr = '';

    const timeout = setTimeout(() => {
      py.kill('SIGTERM');
      reject(new Error('QWEN_AGENT_TIMEOUT: Qwen-Agent runner timed out.'));
    }, RUNNER_TIMEOUT_MS);

    py.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });

    py.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    py.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    py.on('close', () => {
      clearTimeout(timeout);
      try {
        resolve(JSON.parse(stdout || '{}'));
      } catch {
        reject(new Error(stderr || 'QWEN_AGENT_INVALID_RESPONSE: Failed to parse Qwen-Agent output.'));
      }
    });

    py.stdin.write(JSON.stringify(request));
    py.stdin.end();
  });
}

export async function invokeQwenAgent(request: Omit<RunBridgeRequest, 'action'>): Promise<QwenBridgeRunResponse> {
  const parsed = await callRunner({ action: 'run', ...request });
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('QWEN_AGENT_INVALID_RESPONSE: Empty response from Qwen-Agent runner.');
  }

  const response = parsed as QwenBridgeRunResponse;
  if (!response.ok) {
    const code = response.code ?? 'QWEN_AGENT_RUN_FAILED';
    const error = response.error ?? 'Unknown Qwen-Agent error';
    throw new Error(`${code}: ${error}`);
  }

  return response;
}

export async function getQwenBridgeStatus(): Promise<QwenBridgeStatusResponse> {
  const parsed = await callRunner({ action: 'status' });
  if (!isStatusResponse(parsed)) {
    return {
      ok: true,
      ready: false,
      sdk: 'qwen-agent',
      model: process.env.QWEN_AGENT_MODEL || 'qwen3-32b',
      provider: process.env.QWEN_AGENT_MODEL_SERVER ? 'openai-compatible' : 'dashscope',
      error: 'QWEN_AGENT_INVALID_RESPONSE: Failed to read Qwen-Agent status.',
    };
  }

  return parsed;
}
