import { existsSync } from 'node:fs';
import path from 'node:path';

export type ShotPythonRuntimeSource =
  | 'env'
  | 'resources_runtime'
  | 'project_venv'
  | 'system';

export interface ShotPythonRuntimeResolutionOptions {
  appPath: string;
  resourcesPath: string;
  cwd: string;
  moduleDir: string;
  platform?: NodeJS.Platform;
  arch?: string;
  env?: NodeJS.ProcessEnv;
  existsSync?: (candidate: string) => boolean;
}

export interface ShotPythonRuntimeResolution {
  pythonPath: string;
  source: ShotPythonRuntimeSource;
  warnings: string[];
}

function appAsarUnpackedPath(appPath: string): string | null {
  const index = appPath.indexOf('app.asar');
  if (index < 0) return null;
  return `${appPath.slice(0, index)}app.asar.unpacked`;
}

function candidateRoots(options: ShotPythonRuntimeResolutionOptions): string[] {
  const roots: string[] = [];
  const unpacked = appAsarUnpackedPath(options.appPath);
  if (unpacked) roots.push(unpacked);
  if (options.resourcesPath) roots.push(path.join(options.resourcesPath, 'app.asar.unpacked'));
  if (options.appPath) roots.push(options.appPath);
  if (options.resourcesPath) roots.push(options.resourcesPath);
  if (options.cwd) roots.push(options.cwd);
  if (options.moduleDir) {
    roots.push(options.moduleDir);
    roots.push(path.resolve(options.moduleDir, '..'));
    roots.push(path.resolve(options.moduleDir, '..', '..'));
    roots.push(path.resolve(options.moduleDir, '..', '..', '..'));
    roots.push(path.resolve(options.moduleDir, '..', '..', '..', '..'));
  }
  return Array.from(new Set(roots.filter(Boolean).map((root) => path.resolve(root))));
}

function trimEnvPath(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function pythonExecutableNames(platform: NodeJS.Platform): string[] {
  return platform === 'win32' ? ['python.exe'] : ['python', 'python3'];
}

function runtimeRelativeCandidates(platform: NodeJS.Platform, arch: string): string[] {
  const runtimeRoot = path.join('resources', 'python-runtime', `${platform}-${arch}`);
  return pythonExecutableNames(platform).map((name) =>
    platform === 'win32' ? path.join(runtimeRoot, name) : path.join(runtimeRoot, 'bin', name),
  );
}

function projectVenvCandidates(platform: NodeJS.Platform): string[] {
  return pythonExecutableNames(platform).map((name) =>
    platform === 'win32'
      ? path.join('.venv-shot', 'Scripts', name)
      : path.join('.venv-shot', 'bin', name),
  );
}

function findFirstExisting(
  relativePaths: string[],
  options: ShotPythonRuntimeResolutionOptions,
): string | null {
  const hasPath = options.existsSync ?? existsSync;
  for (const root of candidateRoots(options)) {
    for (const relativePath of relativePaths) {
      const candidate = path.join(root, relativePath);
      if (hasPath(candidate)) return candidate;
    }
  }
  return null;
}

export function resolveShotPythonRuntime(
  options: ShotPythonRuntimeResolutionOptions,
): ShotPythonRuntimeResolution {
  const warnings: string[] = [];
  const hasPath = options.existsSync ?? existsSync;
  const env = options.env ?? process.env;
  const platform = options.platform ?? process.platform;
  const arch = options.arch ?? process.arch;
  const configuredPython = trimEnvPath(env.LINGJI_SHOT_PYTHON);

  if (configuredPython) {
    if (hasPath(configuredPython)) {
      return { pythonPath: configuredPython, source: 'env', warnings };
    }
    warnings.push(`Configured LINGJI_SHOT_PYTHON was not found: ${configuredPython}`);
  }

  const runtimeHit = findFirstExisting(runtimeRelativeCandidates(platform, arch), options);
  if (runtimeHit) return { pythonPath: runtimeHit, source: 'resources_runtime', warnings };

  const venvHit = findFirstExisting(projectVenvCandidates(platform), options);
  if (venvHit) return { pythonPath: venvHit, source: 'project_venv', warnings };

  return {
    pythonPath: platform === 'win32' ? 'python' : 'python3',
    source: 'system',
    warnings,
  };
}
