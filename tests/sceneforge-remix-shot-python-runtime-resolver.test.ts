import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  resolveShotPythonRuntime,
  type ShotPythonRuntimeResolutionOptions,
} from '../electron/sceneforge/remix/shot-detection/python-runtime-resolver';

function buildFs(paths: string[]) {
  const normalized = new Set(paths.map((entry) => path.resolve(entry)));
  return {
    existsSync: (candidate: string) => normalized.has(path.resolve(candidate)),
  };
}

function baseOptions(
  paths: string[],
  overrides: Partial<ShotPythonRuntimeResolutionOptions> = {},
): ShotPythonRuntimeResolutionOptions {
  return {
    appPath: '/app/app.asar',
    resourcesPath: '/app',
    cwd: '/repo',
    moduleDir: '/repo/electron/sceneforge/remix/shot-detection',
    platform: 'darwin',
    arch: 'arm64',
    env: {},
    ...buildFs(paths),
    ...overrides,
  };
}

describe('resolveShotPythonRuntime', () => {
  it('uses LINGJI_SHOT_PYTHON when the configured path exists', () => {
    const resolution = resolveShotPythonRuntime(
      baseOptions(['/custom/python'], {
        env: { LINGJI_SHOT_PYTHON: '/custom/python' },
      }),
    );

    expect(resolution.pythonPath).toBe(path.resolve('/custom/python'));
    expect(resolution.source).toBe('env');
    expect(resolution.warnings).toEqual([]);
  });

  it('warns when LINGJI_SHOT_PYTHON is configured but missing', () => {
    const resolution = resolveShotPythonRuntime(
      baseOptions([], {
        env: { LINGJI_SHOT_PYTHON: '/missing/python' },
      }),
    );

    expect(resolution.source).toBe('system');
    expect(resolution.pythonPath).toBe('python3');
    expect(resolution.warnings).toEqual([
      'Configured LINGJI_SHOT_PYTHON was not found: /missing/python',
    ]);
  });

  it('resolves packaged Python runtime before project venv', () => {
    const runtime = '/repo/resources/python-runtime/darwin-arm64/bin/python';
    const venv = '/repo/.venv-shot/bin/python';
    const resolution = resolveShotPythonRuntime(baseOptions([runtime, venv]));

    expect(resolution.pythonPath).toBe(path.resolve(runtime));
    expect(resolution.source).toBe('resources_runtime');
  });

  it('uses .venv-shot when no packaged runtime exists', () => {
    const venv = '/repo/.venv-shot/bin/python';
    const resolution = resolveShotPythonRuntime(baseOptions([venv]));

    expect(resolution.pythonPath).toBe(path.resolve(venv));
    expect(resolution.source).toBe('project_venv');
  });

  it('falls back to python on Windows', () => {
    const resolution = resolveShotPythonRuntime(
      baseOptions([], {
        platform: 'win32',
        arch: 'x64',
      }),
    );

    expect(resolution.pythonPath).toBe('python');
    expect(resolution.source).toBe('system');
  });
});
