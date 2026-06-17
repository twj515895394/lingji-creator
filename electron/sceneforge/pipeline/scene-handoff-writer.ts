import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import type { SceneStageId } from '../types';
import { isSceneStageId } from './scene-stage-definitions';
import {
  listSceneArtifacts,
  readSceneArtifact,
  type SceneArtifact,
} from '../artifacts/scene-artifact-store';
import { buildSceneArtifactDisplayModel } from '../artifacts/scene-artifact-display-model';

export interface SceneHandoffPointer {
  artifactId: string;
  path: string;
  artifactKey: string;
}

export interface SceneHandoffArtifactSlice {
  artifactKey: string;
  title: string;
  text: string;
  truncated: boolean;
}

export interface SceneHandoffDocument {
  version: 1;
  sourceStage: SceneStageId;
  generatedAt: string;
  downstreamNotes: Record<string, Record<string, unknown>>;
  pointers: SceneHandoffPointer[];
  slices: Record<string, SceneHandoffArtifactSlice>;
}

export type SceneHandoffWriterErrorCode =
  | 'INVALID_STAGE'
  | 'HANDOFF_TEMPLATE_NOT_FOUND'
  | 'INVALID_HANDOFF_TEMPLATE';

export class SceneHandoffWriterError extends Error {
  code: SceneHandoffWriterErrorCode;

  constructor(code: SceneHandoffWriterErrorCode, message: string) {
    super(message);
    this.name = 'SceneHandoffWriterError';
    this.code = code;
  }
}

const HANDOFF_STAGES: SceneStageId[] = ['design', 'storyboard', 'audio', 'performance'];

interface HandoffTemplateArtifact {
  artifactKey: string;
  maxChars?: number;
}

interface HandoffTemplateDocument {
  version: number;
  stage: SceneStageId;
  artifacts: HandoffTemplateArtifact[];
  downstreamNotes?: Record<string, Record<string, unknown>>;
}

function getRepoRoot(): string {
  return process.cwd();
}

export function sceneHandoffRelativePath(stage: SceneStageId): string {
  return path.posix.join('sceneforge', 'handoffs', `${stage}.handoff.json`);
}

function truncateText(text: string, maxChars?: number): { text: string; truncated: boolean } {
  const trimmed = text.trim();
  if (!maxChars || trimmed.length <= maxChars) {
    return { text: trimmed, truncated: false };
  }
  return { text: `${trimmed.slice(0, maxChars)}\n…`, truncated: true };
}

async function loadHandoffTemplate(stage: SceneStageId): Promise<HandoffTemplateDocument> {
  if (!HANDOFF_STAGES.includes(stage)) {
    throw new SceneHandoffWriterError(
      'HANDOFF_TEMPLATE_NOT_FOUND',
      `No handoff template registered for stage: ${stage}`,
    );
  }

  const filePath = path.join(
    getRepoRoot(),
    'prompts',
    'sceneforge',
    'stages',
    stage,
    'handoff-template.yaml',
  );

  let parsed: unknown;
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    parsed = YAML.parse(raw);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      throw new SceneHandoffWriterError('HANDOFF_TEMPLATE_NOT_FOUND', `Missing ${filePath}`);
    }
    throw err;
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new SceneHandoffWriterError('INVALID_HANDOFF_TEMPLATE', 'handoff-template must be an object');
  }

  const doc = parsed as Record<string, unknown>;
  if (doc.version !== 1) {
    throw new SceneHandoffWriterError('INVALID_HANDOFF_TEMPLATE', 'handoff-template version must be 1');
  }
  if (!isSceneStageId(doc.stage) || doc.stage !== stage) {
    throw new SceneHandoffWriterError('INVALID_HANDOFF_TEMPLATE', 'handoff-template stage mismatch');
  }
  if (!Array.isArray(doc.artifacts) || doc.artifacts.length === 0) {
    throw new SceneHandoffWriterError('INVALID_HANDOFF_TEMPLATE', 'handoff-template artifacts required');
  }

  const artifacts: HandoffTemplateArtifact[] = doc.artifacts.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new SceneHandoffWriterError(
        'INVALID_HANDOFF_TEMPLATE',
        `artifacts[${index}] must be an object`,
      );
    }
    const entry = item as Record<string, unknown>;
    if (typeof entry.artifactKey !== 'string' || !entry.artifactKey.trim()) {
      throw new SceneHandoffWriterError(
        'INVALID_HANDOFF_TEMPLATE',
        `artifacts[${index}].artifactKey required`,
      );
    }
    const maxChars = entry.maxChars;
    if (maxChars !== undefined && (typeof maxChars !== 'number' || maxChars < 1)) {
      throw new SceneHandoffWriterError(
        'INVALID_HANDOFF_TEMPLATE',
        `artifacts[${index}].maxChars invalid`,
      );
    }
    return {
      artifactKey: entry.artifactKey.trim(),
      maxChars: typeof maxChars === 'number' ? maxChars : undefined,
    };
  });

  return {
    version: 1,
    stage,
    artifacts,
    downstreamNotes:
      doc.downstreamNotes && typeof doc.downstreamNotes === 'object'
        ? (doc.downstreamNotes as Record<string, Record<string, unknown>>)
        : {},
  };
}

function findFinalArtifact(
  artifacts: SceneArtifact[],
  stage: SceneStageId,
  artifactKey: string,
): SceneArtifact | undefined {
  const id = `${stage}.${artifactKey}`;
  return artifacts.find(
    (item) =>
      item.id === id &&
      item.kind === 'final' &&
      item.readableByDownstream &&
      (item.role === 'core_generation_asset' || item.role === 'support_direction_asset'),
  );
}

async function buildSliceText(
  projectDir: string,
  artifact: SceneArtifact,
  maxChars?: number,
): Promise<{ text: string; truncated: boolean }> {
  const { content } = await readSceneArtifact(projectDir, artifact.id);
  try {
    const display = buildSceneArtifactDisplayModel(artifact, content);
    const summary = display?.summary?.trim();
    if (summary) {
      return truncateText(summary, maxChars);
    }
  } catch {
    // fall through to full content truncation
  }
  return truncateText(content, maxChars);
}

export async function writeSceneStageHandoff(
  projectDir: string,
  stage: SceneStageId,
): Promise<SceneHandoffDocument> {
  if (!isSceneStageId(stage)) {
    throw new SceneHandoffWriterError('INVALID_STAGE', `Unknown SceneForge stage: ${stage}`);
  }

  const template = await loadHandoffTemplate(stage);
  const manifestArtifacts = await listSceneArtifacts(projectDir);
  const slices: Record<string, SceneHandoffArtifactSlice> = {};
  const pointers: SceneHandoffPointer[] = [];

  for (const spec of template.artifacts) {
    const artifact = findFinalArtifact(manifestArtifacts, stage, spec.artifactKey);
    if (!artifact) {
      continue;
    }
    const { text, truncated } = await buildSliceText(projectDir, artifact, spec.maxChars);
    slices[spec.artifactKey] = {
      artifactKey: spec.artifactKey,
      title: artifact.title,
      text,
      truncated,
    };
    pointers.push({
      artifactId: artifact.id,
      path: artifact.path,
      artifactKey: spec.artifactKey,
    });
  }

  const document: SceneHandoffDocument = {
    version: 1,
    sourceStage: stage,
    generatedAt: new Date().toISOString(),
    downstreamNotes: template.downstreamNotes ?? {},
    pointers,
    slices,
  };

  const relativePath = sceneHandoffRelativePath(stage);
  const absolute = path.join(projectDir, relativePath);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, JSON.stringify(document, null, 2), 'utf8');

  return document;
}

export async function readSceneStageHandoff(
  projectDir: string,
  fromStage: SceneStageId,
): Promise<SceneHandoffDocument | null> {
  const relativePath = sceneHandoffRelativePath(fromStage);
  const absolute = path.join(projectDir, relativePath);
  try {
    const raw = await fs.readFile(absolute, 'utf8');
    const parsed = JSON.parse(raw) as SceneHandoffDocument;
    if (parsed?.version !== 1 || parsed.sourceStage !== fromStage) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function extractHandoffSliceContent(
  handoff: SceneHandoffDocument,
  artifactKey: string,
): string | null {
  const slice = handoff.slices[artifactKey];
  if (!slice?.text?.trim()) {
    return null;
  }
  return slice.text;
}

export function listHandoffCapableStages(): readonly SceneStageId[] {
  return HANDOFF_STAGES;
}