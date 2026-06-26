import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  resolveTransNetV2Assets,
  type TransNetV2AssetResolutionOptions,
} from '../electron/sceneforge/remix/shot-detection/model-path-resolver';

function addParentDirs(paths: string[]): Set<string> {
  const normalized = new Set(paths.map((entry) => path.resolve(entry)));
  for (const entry of paths) {
    let current = path.dirname(path.resolve(entry));
    while (current && current !== path.dirname(current)) {
      normalized.add(current);
      current = path.dirname(current);
    }
    if (current) normalized.add(current);
  }
  return normalized;
}

function buildFs(paths: string[]) {
  const normalized = addParentDirs(paths);
  return {
    existsSync: (candidate: string) => normalized.has(path.resolve(candidate)),
    readdirSync: (candidate: string) => {
      const dir = path.resolve(candidate);
      const names = new Set<string>();
      for (const entry of normalized) {
        if (path.dirname(entry) === dir) {
          names.add(path.basename(entry));
        }
      }
      return Array.from(names).sort();
    },
  };
}

function baseOptions(
  paths: string[],
  overrides: Partial<TransNetV2AssetResolutionOptions> = {},
): TransNetV2AssetResolutionOptions {
  return {
    appPath: '/app/app.asar',
    resourcesPath: '/app',
    cwd: '/repo',
    moduleDir: '/repo/electron/sceneforge/remix/shot-detection',
    env: {},
    userDataDir: '/user-data',
    ...buildFs(paths),
    ...overrides,
  };
}

describe('resolveTransNetV2Assets', () => {
  it('resolves explicit model and vendor paths from environment variables', () => {
    const resolution = resolveTransNetV2Assets(
      baseOptions(['/custom/model.pth', '/custom/vendor/transnetv2_pytorch.py'], {
        env: {
          LINGJI_TRANSNETV2_MODEL_PATH: '/custom/model.pth',
          LINGJI_TRANSNETV2_VENDOR_DIR: '/custom/vendor',
        },
      }),
    );

    expect(resolution.ready).toBe(true);
    expect(resolution.modelPath).toBe(path.resolve('/custom/model.pth'));
    expect(resolution.modelSource).toBe('env');
    expect(resolution.vendorDir).toBe(path.resolve('/custom/vendor'));
    expect(resolution.vendorSource).toBe('env');
    expect(resolution.missing).toEqual([]);
  });

  it('resolves default resources model path and vendor code', () => {
    const modelPath = '/repo/resources/models/transnetv2/transnetv2-pytorch-weights.pth';
    const vendorFile = '/repo/resources/shot-detectors/vendor/transnetv2/transnetv2_pytorch.py';
    const resolution = resolveTransNetV2Assets(baseOptions([modelPath, vendorFile]));

    expect(resolution.ready).toBe(true);
    expect(resolution.modelPath).toBe(path.resolve(modelPath));
    expect(resolution.modelSource).toBe('resources_default');
    expect(resolution.vendorDir).toBe(path.resolve('/repo/resources/shot-detectors/vendor/transnetv2'));
    expect(resolution.vendorSource).toBe('resources_vendor');
  });

  it('scans a unique resources .pth file but still reports missing vendor code', () => {
    const resolution = resolveTransNetV2Assets(
      baseOptions([
        '/repo/resources/models/transnetv2/custom-transnetv2.pth',
        '/repo/resources/shot-detectors/vendor/transnetv2/.gitkeep',
        '/repo/resources/shot-detectors/vendor/transnetv2/README.md',
      ]),
    );

    expect(resolution.ready).toBe(false);
    expect(resolution.modelPath).toBe(path.resolve('/repo/resources/models/transnetv2/custom-transnetv2.pth'));
    expect(resolution.modelSource).toBe('resources_scan');
    expect(resolution.vendorDir).toBeNull();
    expect(resolution.missing).toEqual(['vendor']);
  });

  it('uses user data model files after resources candidates', () => {
    const resolution = resolveTransNetV2Assets(
      baseOptions([
        '/user-data/models/transnetv2/local.pth',
        '/repo/resources/shot-detectors/vendor/transnetv2/model.py',
      ]),
    );

    expect(resolution.ready).toBe(true);
    expect(resolution.modelPath).toBe(path.resolve('/user-data/models/transnetv2/local.pth'));
    expect(resolution.modelSource).toBe('user_data_scan');
    expect(resolution.vendorSource).toBe('resources_vendor');
  });

  it('reports both missing assets when no model and no usable vendor code are present', () => {
    const resolution = resolveTransNetV2Assets(baseOptions([]));

    expect(resolution.ready).toBe(false);
    expect(resolution.modelPath).toBeNull();
    expect(resolution.vendorDir).toBeNull();
    expect(resolution.missing).toEqual(['weights', 'vendor']);
  });
});
