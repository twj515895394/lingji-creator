import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import type { SceneStageId } from '../types';
import { isSceneStageId } from '../pipeline/scene-stage-definitions';

export type SceneAssetType = 'style_profile' | 'methodology';

export interface SceneAssetRegistryEntry {
  id: string;
  type: SceneAssetType;
  title: string;
  files: Record<string, string>;
  usedBy: SceneStageId[];
}

export interface SceneAssetSnippet {
  id: string;
  title: string;
  type: SceneAssetType;
  text: string;
}

export interface SceneStyleProfileFiles {
  profile: string;
  visual: string;
  camera: string;
  lighting: string;
  performance: string;
  rhythm: string;
  negative: string;
}

export interface SceneStyleProfile {
  id: string;
  title: string;
  files: SceneStyleProfileFiles;
}

export interface SceneLoadedAsset {
  id: string;
  type: SceneAssetType;
  title: string;
  content: Record<string, string>;
}

export interface ResolveSceneAssetsForStageInput {
  stage: SceneStageId;
  selectedAssetIds: string[];
  allowStyleProfile?: boolean;
  allowMethodologyAssets?: boolean;
  allowedAssetIds?: string[];
}

export type SceneAssetLibraryErrorCode =
  | 'REGISTRY_INVALID'
  | 'ASSET_NOT_FOUND'
  | 'FORBIDDEN_SOURCE_MATERIALS'
  | 'INVALID_STAGE';

export class SceneAssetLibraryError extends Error {
  code: SceneAssetLibraryErrorCode;

  constructor(code: SceneAssetLibraryErrorCode, message: string) {
    super(message);
    this.name = 'SceneAssetLibraryError';
    this.code = code;
  }
}

interface RegistryDocument {
  version?: number;
  assets?: unknown;
}

function getAssetsRoot(): string {
  return path.join(process.cwd(), 'prompts', 'sceneforge', 'assets');
}

function getRegistryPath(): string {
  return path.join(getAssetsRoot(), 'registry.yaml');
}

function assertNoSourceMaterials(relativePath: string): void {
  const normalized = relativePath.replace(/\\/g, '/');
  if (normalized.includes('source-materials')) {
    throw new SceneAssetLibraryError(
      'FORBIDDEN_SOURCE_MATERIALS',
      `Asset path must not reference source-materials: ${relativePath}`,
    );
  }
}

async function readAssetFile(relativePath: string): Promise<string> {
  assertNoSourceMaterials(relativePath);
  const fullPath = path.join(getAssetsRoot(), relativePath);
  return fs.readFile(fullPath, 'utf8');
}

function parseRegistryEntry(raw: unknown): SceneAssetRegistryEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const entry = raw as Record<string, unknown>;
  if (typeof entry.id !== 'string' || typeof entry.title !== 'string') return null;
  if (entry.type !== 'style_profile' && entry.type !== 'methodology') return null;
  if (!entry.files || typeof entry.files !== 'object') return null;
  const files: Record<string, string> = {};
  for (const [key, value] of Object.entries(entry.files as Record<string, unknown>)) {
    if (typeof value === 'string') {
      assertNoSourceMaterials(value);
      files[key] = value;
    }
  }
  const usedByRaw = entry.usedBy;
  if (!Array.isArray(usedByRaw)) return null;
  const usedBy = usedByRaw.filter(
    (stage): stage is SceneStageId => typeof stage === 'string' && isSceneStageId(stage),
  );
  return {
    id: entry.id,
    type: entry.type,
    title: entry.title,
    files,
    usedBy,
  };
}

let registryCache: SceneAssetRegistryEntry[] | null = null;

async function loadRegistry(): Promise<SceneAssetRegistryEntry[]> {
  if (registryCache) return registryCache;
  const raw = await fs.readFile(getRegistryPath(), 'utf8');
  const doc = YAML.parse(raw) as RegistryDocument | null;
  if (!Array.isArray(doc?.assets)) {
    throw new SceneAssetLibraryError('REGISTRY_INVALID', 'registry.yaml must contain assets array');
  }
  const assets = doc.assets
    .map(parseRegistryEntry)
    .filter((entry): entry is SceneAssetRegistryEntry => entry !== null);
  registryCache = assets;
  return assets;
}

export function clearSceneAssetRegistryCache(): void {
  registryCache = null;
}

async function getRegistryEntry(assetId: string): Promise<SceneAssetRegistryEntry> {
  const assets = await loadRegistry();
  const entry = assets.find((item) => item.id === assetId);
  if (!entry) {
    throw new SceneAssetLibraryError('ASSET_NOT_FOUND', `Unknown SceneForge asset: ${assetId}`);
  }
  return entry;
}

export async function listSceneAssets(): Promise<SceneAssetRegistryEntry[]> {
  return loadRegistry();
}

export async function listSceneAssetsForStage(input: {
  stage: SceneStageId;
  allowStyleProfile?: boolean;
  allowMethodologyAssets?: boolean;
  allowedAssetIds?: string[];
}): Promise<SceneAssetRegistryEntry[]> {
  if (!isSceneStageId(input.stage)) {
    throw new SceneAssetLibraryError('INVALID_STAGE', `Unknown SceneForge stage: ${input.stage}`);
  }
  const registry = await loadRegistry();
  const explicitAllowedIds = new Set(input.allowedAssetIds ?? []);

  return registry.filter((entry) => {
    if (!entry.usedBy.includes(input.stage)) {
      return false;
    }
    if (entry.type === 'style_profile') {
      return input.allowStyleProfile === true;
    }
    if (explicitAllowedIds.size > 0) {
      return explicitAllowedIds.has(entry.id);
    }
    return input.allowMethodologyAssets === true;
  });
}

export async function loadSceneAsset(assetId: string): Promise<SceneLoadedAsset> {
  const entry = await getRegistryEntry(assetId);
  const content: Record<string, string> = {};
  for (const [key, relativePath] of Object.entries(entry.files)) {
    content[key] = await readAssetFile(relativePath);
  }
  return {
    id: entry.id,
    type: entry.type,
    title: entry.title,
    content,
  };
}

export async function loadSceneStyleProfile(assetId: string): Promise<SceneStyleProfile> {
  const entry = await getRegistryEntry(assetId);
  if (entry.type !== 'style_profile') {
    throw new SceneAssetLibraryError('ASSET_NOT_FOUND', `Asset is not a style profile: ${assetId}`);
  }
  const requiredKeys = [
    'profile',
    'visual',
    'camera',
    'lighting',
    'performance',
    'rhythm',
    'negative',
  ] as const;
  const files = {} as SceneStyleProfileFiles;
  for (const key of requiredKeys) {
    const relativePath = entry.files[key];
    if (!relativePath) {
      throw new SceneAssetLibraryError(
        'REGISTRY_INVALID',
        `Style profile ${assetId} missing file key: ${key}`,
      );
    }
    files[key] = await readAssetFile(relativePath);
  }
  return { id: entry.id, title: entry.title, files };
}

function buildSnippetText(entry: SceneAssetRegistryEntry, content: Record<string, string>): string {
  if (entry.type === 'style_profile') {
    const parts = ['profile', 'visual', 'negative']
      .map((key) => content[key])
      .filter(Boolean);
    return parts.join('\n\n---\n\n');
  }
  const main = content.main ?? Object.values(content)[0] ?? '';
  return main;
}

export async function resolveSceneAssetsForStage(
  input: ResolveSceneAssetsForStageInput,
): Promise<SceneAssetSnippet[]> {
  const available = await listSceneAssetsForStage({
    stage: input.stage,
    allowedAssetIds: input.allowedAssetIds,
    allowStyleProfile: input.allowStyleProfile ?? true,
    allowMethodologyAssets: input.allowMethodologyAssets ?? true,
  });
  const selected = new Set(input.selectedAssetIds);
  const snippets: SceneAssetSnippet[] = [];

  for (const assetId of input.selectedAssetIds) {
    const entry = available.find((item) => item.id === assetId);
    if (!entry) continue;
    if (!selected.has(assetId)) continue;

    let content: Record<string, string>;
    if (entry.type === 'style_profile') {
      const profile = await loadSceneStyleProfile(assetId);
      content = { ...profile.files };
    } else {
      const loaded = await loadSceneAsset(assetId);
      content = loaded.content;
    }

    snippets.push({
      id: entry.id,
      title: entry.title,
      type: entry.type,
      text: buildSnippetText(entry, content),
    });
  }

  return snippets;
}
