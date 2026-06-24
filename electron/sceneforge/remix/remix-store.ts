import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  EditedKeyframe,
  KeyframeEditPrompt,
  RemixVariantSummary,
  RemixAssetLibrarySnapshot,
  RemixAssetProcessingSnapshot,
  RemixAssetProcessingStageId,
  RemixCreationStageId,
  SeedancePrompt,
  RemixStageStatus,
  RemixVariant,
  SourceAsset,
} from '../../../src/sceneforge/remix/types';
import {
  getRemixSourceManifestPath,
  getRemixSourceAssetsDir,
  getRemixVariantManifestPath,
  getRemixVariantsDir,
} from './remix-artifact-paths';

export interface StoredSourceAssetDocument {
  schema: 'sceneforge-remix-source-asset';
  version: 1;
  sourceAsset: SourceAsset;
  processingStageStates: Partial<Record<RemixAssetProcessingStageId, RemixStageStatus>>;
}

export interface StoredVariantDocument {
  schema: 'sceneforge-remix-variant';
  version: 1;
  variant: RemixVariant;
  creationStageStates: Partial<Record<RemixCreationStageId, RemixStageStatus>>;
  keyframeEditPrompts: KeyframeEditPrompt[];
  editedKeyframes: EditedKeyframe[];
  seedancePrompts: SeedancePrompt[];
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeSourceAsset(sourceAsset: SourceAsset): SourceAsset {
  return {
    ...sourceAsset,
    tags: Array.isArray(sourceAsset.tags) ? sourceAsset.tags : [],
    annotationNote: sourceAsset.annotationNote ?? null,
    lastAnnotatedAt: sourceAsset.lastAnnotatedAt ?? null,
    annotatedBy: sourceAsset.annotatedBy ?? null,
    annotationSource: sourceAsset.annotationSource ?? null,
  };
}

function normalizeSourceAssetDocument(document: StoredSourceAssetDocument): StoredSourceAssetDocument {
  return {
    ...document,
    sourceAsset: normalizeSourceAsset(document.sourceAsset),
  };
}

function resolveProjectPath(projectDir: string, filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.join(projectDir, filePath);
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, 'utf8')) as T;
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function buildSourceAssetSnapshot(
  document: StoredSourceAssetDocument,
): RemixAssetProcessingSnapshot {
  const normalized = normalizeSourceAssetDocument(document);
  return {
    sourceAsset: clone(normalized.sourceAsset),
    processingStageStates: clone(normalized.processingStageStates),
  };
}

export function buildSourceAssetSummary(
  sourceAsset: SourceAsset,
): RemixAssetLibrarySnapshot['sourceAssets'][number] {
  const normalized = normalizeSourceAsset(sourceAsset);
  return {
    id: normalized.id,
    title: normalized.title,
    status: normalized.status,
    durationMs: normalized.videoMetadata.durationMs,
    segmentCount: normalized.segments.length,
    keyframeCount: normalized.segments.reduce((sum, segment) => sum + segment.keyframes.length, 0),
    variantCount: normalized.variantCount,
    updatedAt: normalized.updatedAt,
  };
}

export function buildVariantSummary(variant: RemixVariant): RemixVariantSummary {
  return {
    id: variant.id,
    sourceAssetId: variant.sourceAssetId,
    name: variant.name,
    currentStage: variant.currentStage,
    updatedAt: variant.updatedAt,
  };
}

export async function listStoredSourceAssetIds(projectDir: string): Promise<string[]> {
  const dirPath = path.join(projectDir, getRemixSourceAssetsDir());
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export async function readStoredSourceAsset(
  projectDir: string,
  sourceAssetId: string,
): Promise<StoredSourceAssetDocument> {
  return normalizeSourceAssetDocument(await readJsonFile<StoredSourceAssetDocument>(
    resolveProjectPath(projectDir, getRemixSourceManifestPath(sourceAssetId)),
  ));
}

export async function writeStoredSourceAsset(
  projectDir: string,
  document: StoredSourceAssetDocument,
): Promise<void> {
  await writeJsonFile(
    resolveProjectPath(projectDir, document.sourceAsset.sourceManifestPath),
    normalizeSourceAssetDocument(document),
  );
}

export async function readStoredVariant(
  projectDir: string,
  variantId: string,
): Promise<StoredVariantDocument> {
  return readJsonFile<StoredVariantDocument>(
    resolveProjectPath(projectDir, getRemixVariantManifestPath(variantId)),
  );
}

export async function writeStoredVariant(
  projectDir: string,
  document: StoredVariantDocument,
): Promise<void> {
  await writeJsonFile(
    resolveProjectPath(projectDir, getRemixVariantManifestPath(document.variant.id)),
    document,
  );
}

export async function listStoredVariants(projectDir: string): Promise<StoredVariantDocument[]> {
  const dirPath = path.join(projectDir, getRemixVariantsDir());
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const variantIds = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
    return Promise.all(variantIds.map((variantId) => readStoredVariant(projectDir, variantId)));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export function slugifyRemixId(value: string, fallback: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug || fallback;
}
