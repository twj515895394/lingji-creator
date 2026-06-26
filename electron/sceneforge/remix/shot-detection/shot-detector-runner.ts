import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveShotPythonRuntime } from './python-runtime-resolver';
import type { ShotDetectionRequest, ShotDetectionResult } from './shot-detector-types';

export interface ShotDetectorRunnerOptions {
  appPath?: string;
  resourcesPath?: string;
  cwd?: string;
  moduleDir?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}

interface WorkerSuccessPayload extends ShotDetectionResult {
  ok: true;
}

interface WorkerFailurePayload {
  ok: false;
  error: string;
  notes?: string[];
}

type WorkerPayload = WorkerSuccessPayload | WorkerFailurePayload;

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const DETECTOR_SCRIPT_RELATIVE_PATH = path.join('resources', 'shot-detectors', 'detect_shots.py');

function currentModuleDir(): string {
  return path.dirname(fileURLToPath(import.meta.url));
}

function processResourcesPath(): string {
  return (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath ?? process.cwd();
}

function candidateRoots(options: Required<Pick<ShotDetectorRunnerOptions, 'appPath' | 'resourcesPath' | 'cwd' | 'moduleDir'>>): string[] {
  const roots: string[] = [];
  if (options.appPath.includes('app.asar')) {
    roots.push(options.appPath.slice(0, options.appPath.indexOf('app.asar')) + 'app.asar.unpacked');
  }
  roots.push(path.join(options.resourcesPath, 'app.asar.unpacked'));
  roots.push(options.appPath);
  roots.push(options.resourcesPath);
  roots.push(options.cwd);
  roots.push(options.moduleDir);
  roots.push(path.resolve(options.moduleDir, '..'));
  roots.push(path.resolve(options.moduleDir, '..', '..'));
  roots.push(path.resolve(options.moduleDir, '..', '..', '..'));
  roots.push(path.resolve(options.moduleDir, '..', '..', '..', '..'));
  return Array.from(new Set(roots.filter(Boolean).map((root) => path.resolve(root))));
}

function resolveDetectorScriptPath(options: Required<Pick<ShotDetectorRunnerOptions, 'appPath' | 'resourcesPath' | 'cwd' | 'moduleDir'>>): string | null {
  return (
    candidateRoots(options)
      .map((root) => path.join(root, DETECTOR_SCRIPT_RELATIVE_PATH))
      .find((candidate) => existsSync(candidate)) ?? null
  );
}

function parseWorkerPayload(stdout: string): WorkerPayload {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return { ok: false, error: 'Shot detector worker returned empty stdout.' };
  }

  try {
    return JSON.parse(trimmed) as WorkerPayload;
  } catch (error) {
    const preview = trimmed.slice(0, 800);
    return {
      ok: false,
      error: `Shot detector worker returned invalid JSON: ${error instanceof Error ? error.message : String(error)}. Output: ${preview}`,
    };
  }
}

export async function runShotDetector(
  request: ShotDetectionRequest,
  options: ShotDetectorRunnerOptions = {},
): Promise<ShotDetectionResult> {
  const runtimeOptions = {
    appPath: options.appPath ?? process.cwd(),
    resourcesPath: options.resourcesPath ?? processResourcesPath(),
    cwd: options.cwd ?? process.cwd(),
    moduleDir: options.moduleDir ?? currentModuleDir(),
  };
  const scriptPath = resolveDetectorScriptPath(runtimeOptions);

  if (!scriptPath) {
    throw new Error('Shot detector worker script not found: resources/shot-detectors/detect_shots.py');
  }

  const python = resolveShotPythonRuntime({
    ...runtimeOptions,
    env: options.env ?? process.env,
  });
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return new Promise<ShotDetectionResult>((resolve, reject) => {
    const child = spawn(python.pythonPath, [scriptPath], {
      cwd: runtimeOptions.cwd,
      env: {
        ...process.env,
        ...(options.env ?? {}),
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGKILL');
      reject(new Error(`Shot detector worker timed out after ${timeoutMs}ms.`));
    }, timeoutMs);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const payload = parseWorkerPayload(stdout);
      if (!payload.ok) {
        const suffix = stderr.trim() ? ` stderr: ${stderr.trim().slice(0, 1200)}` : '';
        reject(new Error(`${payload.error}${suffix}`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`Shot detector worker exited with code ${code}. stderr: ${stderr.trim().slice(0, 1200)}`));
        return;
      }
      resolve({
        ...payload,
        notes: [...python.warnings, ...(payload.notes ?? [])],
      });
    });

    child.stdin.end(`${JSON.stringify(request)}\n`);
  });
}
