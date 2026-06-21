import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import type { SceneArtifactCopyTarget, SceneArtifactDisplayModel } from '../../../src/types/sceneforge';
import type { SceneStageId } from '../types';
import { isSceneStageId } from '../pipeline/scene-stage-definitions';
import {
  buildSceneArtifactDisplayModel,
  defaultCoreArtifactCopyMetadata,
} from './scene-artifact-display-model';

export type SceneArtifactKind = 'preview' | 'draft' | 'review' | 'final' | 'system' | 'export';

export type SceneArtifactRole =
  | 'core_generation_asset'
  | 'support_direction_asset'
  | 'system_review_asset'
  | 'export_asset';

export type SceneArtifactViewMode = 'preview' | 'structure' | 'trace' | 'raw';

export interface SceneArtifact {
  id: string;
  stage: SceneStageId;
  kind: SceneArtifactKind;
  role: SceneArtifactRole;
  title: string;
  path: string;
  coreAsset: boolean;
  readableByDownstream: boolean;
  usedBy: SceneStageId[];
  viewModes: SceneArtifactViewMode[];
  createdAt: string;
  displayModelVersion?: 1;
  copyTargets?: SceneArtifactCopyTarget[];
  primaryCopyTarget?: SceneArtifactCopyTarget;
}

export interface WriteSceneArtifactInput {
  projectDir: string;
  stage: SceneStageId;
  artifactKey: string;
  kind: SceneArtifactKind;
  title: string;
  content: string;
  role: SceneArtifactRole;
  coreAsset: boolean;
  readableByDownstream: boolean;
}

interface ManifestFile {
  version: 1;
  artifacts: SceneArtifact[];
}

export type SceneArtifactStoreErrorCode =
  | 'INVALID_STAGE'
  | 'INVALID_ARTIFACT_KEY'
  | 'INVALID_ARTIFACT_METADATA'
  | 'INVALID_MANIFEST_FILE'
  | 'ARTIFACT_NOT_FOUND'
  | 'ARTIFACT_PATH_OUTSIDE_PROJECT';

export class SceneArtifactStoreError extends Error {
  code: SceneArtifactStoreErrorCode;

  constructor(code: SceneArtifactStoreErrorCode, message: string) {
    super(message);
    this.name = 'SceneArtifactStoreError';
    this.code = code;
  }
}

const MANIFEST_PATH = path.join('sceneforge', 'artifact_manifest.yaml');
function mapLegacyManifestStageId(stage: string): SceneStageId | null {
  if (isSceneStageId(stage)) {
    return stage;
  }
  if (stage === 'export') {
    return 'publish';
  }
  return null;
}

function normalizeArtifactUsedBy(usedBy: unknown): { usedBy: SceneStageId[]; changed: boolean } {
  if (!Array.isArray(usedBy)) {
    return { usedBy: [], changed: usedBy !== undefined && usedBy !== null };
  }
  const next: SceneStageId[] = [];
  let changed = false;
  for (const entry of usedBy) {
    if (typeof entry !== 'string') {
      changed = true;
      continue;
    }
    const mapped = mapLegacyManifestStageId(entry);
    if (!mapped) {
      changed = true;
      continue;
    }
    if (mapped !== entry) {
      changed = true;
    }
    if (!next.includes(mapped)) {
      next.push(mapped);
    } else if (mapped !== entry) {
      changed = true;
    }
  }
  return { usedBy: next, changed };
}

const SAFE_ARTIFACT_KEY = /^[a-z0-9][a-z0-9_-]*$/;
const SCENE_ARTIFACT_KINDS: SceneArtifactKind[] = ['preview', 'draft', 'review', 'final', 'system', 'export'];
const SCENE_ARTIFACT_ROLES: SceneArtifactRole[] = [
  'core_generation_asset',
  'support_direction_asset',
  'system_review_asset',
  'export_asset',
];
const SCENE_ARTIFACT_VIEW_MODES: SceneArtifactViewMode[] = ['preview', 'structure', 'trace', 'raw'];
const DEFAULT_VIEW_MODES: SceneArtifactViewMode[] = ['preview', 'structure', 'trace', 'raw'];

function getManifestPath(projectDir: string): string {
  return path.join(projectDir, MANIFEST_PATH);
}

function assertStage(stage: SceneStageId): void {
  if (!isSceneStageId(stage)) {
    throw new SceneArtifactStoreError('INVALID_STAGE', `Unknown SceneForge stage: ${stage}`);
  }
}

function assertArtifactKey(artifactKey: string): void {
  if (!SAFE_ARTIFACT_KEY.test(artifactKey)) {
    throw new SceneArtifactStoreError(
      'INVALID_ARTIFACT_KEY',
      `Invalid SceneForge artifact key: ${artifactKey}`,
    );
  }
}

function assertWritableArtifactMetadata(input: WriteSceneArtifactInput): void {
  if (!isSceneArtifactKind(input.kind) || !isSceneArtifactRole(input.role)) {
    throw new SceneArtifactStoreError(
      'INVALID_ARTIFACT_METADATA',
      'SceneForge artifact kind or role is invalid',
    );
  }
}

function toProjectRelativePath(stage: SceneStageId, artifactKey: string): string {
  return path.posix.join(
    'sceneforge',
    'stages',
    stage,
    'outputs',
    `${artifactKey}.md`,
  );
}

function resolveProjectPath(projectDir: string, relativePath: string): string {
  const absoluteProjectDir = path.resolve(projectDir);
  const absolute = path.resolve(projectDir, ...relativePath.split('/'));
  const relative = path.relative(absoluteProjectDir, absolute);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new SceneArtifactStoreError(
      'ARTIFACT_PATH_OUTSIDE_PROJECT',
      `SceneForge artifact path escapes project: ${relativePath}`,
    );
  }
  return absolute;
}

function resolveUsedBy(stage: SceneStageId): SceneStageId[] {
  if (stage === 'design') return ['storyboard', 'video_prompts'];
  if (stage === 'storyboard') return ['video_prompts'];
  if (stage === 'video_prompts') return ['publish'];
  if (stage === 'assets') return ['design'];
  if (stage === 'script') return ['performance', 'storyboard'];
  if (stage === 'performance') return ['storyboard', 'video_prompts'];
  if (stage === 'audio') return ['video_prompts'];
  return [];
}

function isSceneArtifactKind(value: unknown): value is SceneArtifactKind {
  return typeof value === 'string' && SCENE_ARTIFACT_KINDS.includes(value as SceneArtifactKind);
}

function isSceneArtifactRole(value: unknown): value is SceneArtifactRole {
  return typeof value === 'string' && SCENE_ARTIFACT_ROLES.includes(value as SceneArtifactRole);
}

function isSceneArtifactViewMode(value: unknown): value is SceneArtifactViewMode {
  return (
    typeof value === 'string' &&
    SCENE_ARTIFACT_VIEW_MODES.includes(value as SceneArtifactViewMode)
  );
}

function normalizeManifest(value: unknown): { manifest: ManifestFile; migrated: boolean } {
  const raw = value as { artifacts?: unknown[] } | null;
  const artifacts: SceneArtifact[] = [];
  let migrated = false;

  for (const item of raw?.artifacts ?? []) {
    const artifact = item as Partial<SceneArtifact>;
    const mappedStage =
      typeof artifact.stage === 'string' ? mapLegacyManifestStageId(artifact.stage) : null;
    if (typeof artifact.stage === 'string' && artifact.stage !== mappedStage) {
      migrated = true;
    }
    const usedByResult = normalizeArtifactUsedBy(artifact.usedBy);
    if (usedByResult.changed) {
      migrated = true;
    }
    if (
      typeof artifact.id !== 'string' ||
      !mappedStage ||
      !isSceneArtifactKind(artifact.kind) ||
      !isSceneArtifactRole(artifact.role) ||
      typeof artifact.title !== 'string' ||
      typeof artifact.path !== 'string' ||
      typeof artifact.coreAsset !== 'boolean' ||
      typeof artifact.readableByDownstream !== 'boolean' ||
      !Array.isArray(artifact.viewModes) ||
      !artifact.viewModes.every(isSceneArtifactViewMode) ||
      typeof artifact.createdAt !== 'string'
    ) {
      throw new SceneArtifactStoreError(
        'INVALID_MANIFEST_FILE',
        'artifact_manifest.yaml contains an invalid artifact entry',
      );
    }
    artifacts.push({
      ...(artifact as SceneArtifact),
      stage: mappedStage,
      usedBy: usedByResult.usedBy,
    });
  }

  return { manifest: { version: 1, artifacts }, migrated };
}

async function readManifest(projectDir: string): Promise<ManifestFile> {
  let raw: string;
  try {
    raw = await fs.readFile(getManifestPath(projectDir), 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { version: 1, artifacts: [] };
    }
    throw error;
  }

  try {
    const { manifest, migrated } = normalizeManifest(YAML.parse(raw));
    for (const artifact of manifest.artifacts) {
      resolveProjectPath(projectDir, artifact.path);
    }
    if (migrated) {
      await writeManifest(projectDir, manifest);
    }
    return manifest;
  } catch (error) {
    if (error instanceof SceneArtifactStoreError) {
      throw error;
    }
    throw new SceneArtifactStoreError(
      'INVALID_MANIFEST_FILE',
      error instanceof Error ? error.message : 'artifact_manifest.yaml is invalid',
    );
  }
}

async function writeManifest(projectDir: string, manifest: ManifestFile): Promise<void> {
  await fs.mkdir(path.dirname(getManifestPath(projectDir)), { recursive: true });
  await fs.writeFile(getManifestPath(projectDir), YAML.stringify(manifest), 'utf-8');
}

export async function writeSceneArtifact(input: WriteSceneArtifactInput): Promise<SceneArtifact> {
  assertStage(input.stage);
  assertArtifactKey(input.artifactKey);
  assertWritableArtifactMetadata(input);

  const manifest = await readManifest(input.projectDir);
  const relativePath = toProjectRelativePath(input.stage, input.artifactKey);
  const absolutePath = resolveProjectPath(input.projectDir, relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, input.content, 'utf-8');

  const artifact: SceneArtifact = {
    id: `${input.stage}.${input.artifactKey}`,
    stage: input.stage,
    kind: input.kind,
    role: input.role,
    title: input.title,
    path: relativePath,
    coreAsset: input.coreAsset,
    readableByDownstream: input.readableByDownstream,
    usedBy: resolveUsedBy(input.stage),
    viewModes: [...DEFAULT_VIEW_MODES],
    createdAt: new Date().toISOString(),
    ...(input.kind === 'final' && input.coreAsset ? defaultCoreArtifactCopyMetadata() : {}),
  };

  manifest.artifacts = [
    ...manifest.artifacts.filter((item) => item.id !== artifact.id),
    artifact,
  ];
  await writeManifest(input.projectDir, manifest);
  return artifact;
}

export async function listSceneArtifacts(projectDir: string): Promise<SceneArtifact[]> {
  return (await readManifest(projectDir)).artifacts;
}

export async function readSceneArtifact(
  projectDir: string,
  artifactId: string,
): Promise<{ artifact: SceneArtifact; content: string; displayModel: SceneArtifactDisplayModel | null }> {
  const artifact = (await listSceneArtifacts(projectDir)).find((item) => item.id === artifactId);
  if (!artifact) {
    throw new SceneArtifactStoreError(
      'ARTIFACT_NOT_FOUND',
      `Unknown SceneForge artifact: ${artifactId}`,
    );
  }
  const absolutePath = resolveProjectPath(projectDir, artifact.path);
  const content = await fs.readFile(absolutePath, 'utf-8');
  const displayModel = buildSceneArtifactDisplayModel(artifact, content);
  return {
    artifact,
    content,
    displayModel,
  };
}
