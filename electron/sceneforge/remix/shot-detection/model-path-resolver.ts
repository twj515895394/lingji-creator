import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

export type TransNetV2ModelPathSource =
  | 'env'
  | 'resources_default'
  | 'resources_scan'
  | 'user_data_default'
  | 'user_data_scan';

export type TransNetV2VendorDirSource = 'env' | 'resources_vendor';
export type TransNetV2MissingAsset = 'weights' | 'vendor';

export interface TransNetV2AssetResolutionOptions {
  appPath: string;
  resourcesPath: string;
  cwd: string;
  moduleDir: string;
  env?: NodeJS.ProcessEnv;
  userDataDir?: string;
  existsSync?: (candidate: string) => boolean;
  readdirSync?: (candidate: string) => string[];
}

export interface TransNetV2AssetResolution {
  modelPath: string | null;
  modelSource: TransNetV2ModelPathSource | null;
  vendorDir: string | null;
  vendorSource: TransNetV2VendorDirSource | null;
  ready: boolean;
  missing: TransNetV2MissingAsset[];
  warnings: string[];
}

const DEFAULT_WEIGHTS_FILE = 'transnetv2-pytorch-weights.pth';
const MODEL_RELATIVE_DIR = path.join('resources', 'models', 'transnetv2');
const VENDOR_RELATIVE_DIR = path.join('resources', 'shot-detectors', 'vendor', 'transnetv2');

function appAsarUnpackedPath(appPath: string): string | null {
  const index = appPath.indexOf('app.asar');
  if (index < 0) return null;
  return `${appPath.slice(0, index)}app.asar.unpacked`;
}

function uniqueRoots(options: TransNetV2AssetResolutionOptions): string[] {
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

function envPath(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function readDirectory(dirPath: string, readDir: (candidate: string) => string[]): string[] {
  try {
    return readDir(dirPath);
  } catch {
    return [];
  }
}

function findUniquePth(
  dirPath: string,
  options: TransNetV2AssetResolutionOptions,
  warnings: string[],
): string | null {
  const hasPath = options.existsSync ?? existsSync;
  const readDir = options.readdirSync ?? readdirSync;
  if (!hasPath(dirPath)) return null;

  const entries = readDirectory(dirPath, readDir)
    .filter((entry) => entry.toLowerCase().endsWith('.pth'))
    .sort();

  if (entries.length === 1) return path.join(dirPath, entries[0]);
  if (entries.length > 1) warnings.push(`Multiple TransNetV2 .pth files found in ${dirPath}`);
  return null;
}

function hasUsableVendorCode(
  vendorDir: string,
  options: TransNetV2AssetResolutionOptions,
): boolean {
  const hasPath = options.existsSync ?? existsSync;
  const readDir = options.readdirSync ?? readdirSync;
  if (!hasPath(vendorDir)) return false;
  return readDirectory(vendorDir, readDir).some((entry) => {
    const lower = entry.toLowerCase();
    return lower.endsWith('.py') && lower !== '__init__.py';
  });
}

export function resolveTransNetV2ModelPath(
  options: TransNetV2AssetResolutionOptions,
  warnings: string[] = [],
): { modelPath: string; source: TransNetV2ModelPathSource } | null {
  const hasPath = options.existsSync ?? existsSync;
  const env = options.env ?? process.env;
  const configuredModelPath = envPath(env.LINGJI_TRANSNETV2_MODEL_PATH);

  if (configuredModelPath) {
    if (hasPath(configuredModelPath)) return { modelPath: configuredModelPath, source: 'env' };
    warnings.push(`Configured TransNetV2 model path was not found: ${configuredModelPath}`);
  }

  for (const root of uniqueRoots(options)) {
    const defaultPath = path.join(root, MODEL_RELATIVE_DIR, DEFAULT_WEIGHTS_FILE);
    if (hasPath(defaultPath)) return { modelPath: defaultPath, source: 'resources_default' };
  }

  for (const root of uniqueRoots(options)) {
    const scannedPath = findUniquePth(path.join(root, MODEL_RELATIVE_DIR), options, warnings);
    if (scannedPath) return { modelPath: scannedPath, source: 'resources_scan' };
  }

  if (options.userDataDir) {
    const userModelDir = path.join(options.userDataDir, 'models', 'transnetv2');
    const defaultUserPath = path.join(userModelDir, DEFAULT_WEIGHTS_FILE);
    if (hasPath(defaultUserPath)) return { modelPath: defaultUserPath, source: 'user_data_default' };
    const scannedUserPath = findUniquePth(userModelDir, options, warnings);
    if (scannedUserPath) return { modelPath: scannedUserPath, source: 'user_data_scan' };
  }

  return null;
}

export function resolveTransNetV2VendorDir(
  options: TransNetV2AssetResolutionOptions,
  warnings: string[] = [],
): { vendorDir: string; source: TransNetV2VendorDirSource } | null {
  const env = options.env ?? process.env;
  const configuredVendorDir = envPath(env.LINGJI_TRANSNETV2_VENDOR_DIR);

  if (configuredVendorDir) {
    if (hasUsableVendorCode(configuredVendorDir, options)) {
      return { vendorDir: configuredVendorDir, source: 'env' };
    }
    warnings.push(`Configured TransNetV2 vendor directory has no usable model code: ${configuredVendorDir}`);
  }

  for (const root of uniqueRoots(options)) {
    const vendorDir = path.join(root, VENDOR_RELATIVE_DIR);
    if (hasUsableVendorCode(vendorDir, options)) {
      return { vendorDir, source: 'resources_vendor' };
    }
  }

  return null;
}

export function resolveTransNetV2Assets(
  options: TransNetV2AssetResolutionOptions,
): TransNetV2AssetResolution {
  const warnings: string[] = [];
  const model = resolveTransNetV2ModelPath(options, warnings);
  const vendor = resolveTransNetV2VendorDir(options, warnings);
  const missing: TransNetV2MissingAsset[] = [];

  if (!model) missing.push('weights');
  if (!vendor) missing.push('vendor');

  return {
    modelPath: model?.modelPath ?? null,
    modelSource: model?.source ?? null,
    vendorDir: vendor?.vendorDir ?? null,
    vendorSource: vendor?.source ?? null,
    ready: missing.length === 0,
    missing,
    warnings,
  };
}
