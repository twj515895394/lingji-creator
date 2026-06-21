import fs from 'node:fs/promises';
import path from 'node:path';
import type { SceneApprovalPolicy, SceneStageId, SceneStageStatus } from '../types';
import { isSceneStageId } from './scene-stage-definitions';

import { SCENE_STAGE_IDS } from '../types';

const STATE_PATH = path.join('sceneforge', 'state.json');

/** 已移除的流水线阶段；旧 state.json 中残留时迁移丢弃。 */
const RETIRED_SCENE_STAGE_IDS = new Set(['export']);

function mapLegacyStageId(stage: string): SceneStageId | null {
  if (isSceneStageId(stage)) {
    return stage;
  }
  if (stage === 'export') {
    return 'publish';
  }
  return null;
}

function isRetiredSceneStageId(stage: string): boolean {
  return RETIRED_SCENE_STAGE_IDS.has(stage);
}

export interface SceneStageValidationSnapshot {
  status: 'passed' | 'failed';
  errorCodes: string[];
}

export interface SceneStageRuntimeState {
  status: SceneStageStatus;
  artifactIds: string[];
  validation: SceneStageValidationSnapshot | null;
  validatedAt: string | null;
  approvedAt: string | null;
  revisionNote: string | null;
}

export interface SceneState {
  version: 1;
  pipelineId: string;
  currentStage: SceneStageId | null;
  status: 'ready' | 'in_progress' | 'completed';
  stages: Partial<Record<SceneStageId, SceneStageRuntimeState>>;
  coreArtifacts: {
    design: string | null;
    storyboard: string | null;
    videoPrompts: string | null;
  };
  updatedAt: string;
}

export type SceneStateMachineErrorCode =
  | 'INVALID_STAGE'
  | 'INVALID_STATE_FILE'
  | 'SCENE_STAGE_NOT_VALIDATED';

export class SceneStateMachineError extends Error {
  code: SceneStateMachineErrorCode;

  constructor(code: SceneStateMachineErrorCode, message: string) {
    super(message);
    this.name = 'SceneStateMachineError';
    this.code = code;
  }
}

function getStatePath(projectDir: string): string {
  return path.join(projectDir, STATE_PATH);
}

function assertStage(stage: SceneStageId): void {
  if (!isSceneStageId(stage)) {
    throw new SceneStateMachineError('INVALID_STAGE', `Unknown SceneForge stage: ${stage}`);
  }
}

function createDefaultStageState(status: SceneStageStatus = 'ready'): SceneStageRuntimeState {
  return {
    status,
    artifactIds: [],
    validation: null,
    validatedAt: null,
    approvedAt: null,
    revisionNote: null,
  };
}

function normalizeStageState(value: unknown): SceneStageRuntimeState {
  const raw = value as Partial<SceneStageRuntimeState> | null;
  return {
    status: raw?.status ?? 'ready',
    artifactIds: Array.isArray(raw?.artifactIds) ? raw.artifactIds.filter((id) => typeof id === 'string') : [],
    validation: raw?.validation ?? null,
    validatedAt: raw?.validatedAt ?? null,
    approvedAt: raw?.approvedAt ?? null,
    revisionNote: raw?.revisionNote ?? null,
  };
}

function normalizeSceneState(value: unknown): SceneState {
  const raw = value as Partial<SceneState> | null;
  const rawStages = raw?.stages ?? {};
  const stages: Partial<Record<SceneStageId, SceneStageRuntimeState>> = {};

  for (const [stage, state] of Object.entries(rawStages)) {
    const mapped = mapLegacyStageId(stage);
    if (!mapped) {
      throw new SceneStateMachineError(
        'INVALID_STATE_FILE',
        `state.json contains unknown stage: ${stage}`,
      );
    }
    const normalized = normalizeStageState(state);
    const existing = stages[mapped];
    if (!existing) {
      stages[mapped] = normalized;
      continue;
    }
    stages[mapped] = mergeStageRuntimeState(existing, normalized);
  }

  for (const stageId of SCENE_STAGE_IDS) {
    if (!stages[stageId]) {
      stages[stageId] = createDefaultStageState();
    }
  }

  let currentStage: SceneStageId | null = raw?.currentStage ?? null;
  if (typeof currentStage === 'string') {
    if (isRetiredSceneStageId(currentStage)) {
      currentStage = 'publish';
    } else if (!isSceneStageId(currentStage)) {
      const mapped = mapLegacyStageId(currentStage);
      currentStage = mapped ?? 'design';
    }
  } else {
    currentStage = 'design';
  }

  return {
    version: 1,
    pipelineId: raw?.pipelineId ?? 'reference_remake',
    currentStage,
    status: raw?.status ?? 'ready',
    stages,
    coreArtifacts: raw?.coreArtifacts ?? {
      design: null,
      storyboard: null,
      videoPrompts: null,
    },
    updatedAt: raw?.updatedAt ?? new Date().toISOString(),
  };
}

function mergeStageRuntimeState(
  a: SceneStageRuntimeState,
  b: SceneStageRuntimeState,
): SceneStageRuntimeState {
  const statusRank: Record<SceneStageStatus, number> = {
    ready: 0,
    in_progress: 1,
    draft_submitted: 2,
    validation_failed: 3,
    validated: 4,
    waiting_approval: 5,
    revision_requested: 4,
    approved: 6,
    completed: 6,
    skipped: 6,
  };
  const pick =
    (statusRank[b.status] ?? 0) >= (statusRank[a.status] ?? 0) ? b : a;
  const artifactIds = Array.from(new Set([...a.artifactIds, ...b.artifactIds]));
  const validatedAt = [a.validatedAt, b.validatedAt].filter(Boolean).sort().pop() ?? null;
  const approvedAt = [a.approvedAt, b.approvedAt].filter(Boolean).sort().pop() ?? null;
  return {
    ...pick,
    artifactIds,
    validatedAt,
    approvedAt,
    validation: pick.validation ?? a.validation ?? b.validation,
    revisionNote: pick.revisionNote ?? a.revisionNote ?? b.revisionNote,
  };
}

async function writeSceneState(projectDir: string, state: SceneState): Promise<void> {
  await fs.mkdir(path.dirname(getStatePath(projectDir)), { recursive: true });
  await fs.writeFile(getStatePath(projectDir), JSON.stringify(state, null, 2), 'utf-8');
}

function updateStage(
  state: SceneState,
  stage: SceneStageId,
  updater: (current: SceneStageRuntimeState) => SceneStageRuntimeState,
): SceneState {
  const now = new Date().toISOString();
  return {
    ...state,
    status: 'in_progress',
    currentStage: stage,
    stages: {
      ...state.stages,
      [stage]: updater(state.stages[stage] ?? createDefaultStageState()),
    },
    updatedAt: now,
  };
}

export async function readSceneState(projectDir: string): Promise<SceneState> {
  const statePath = getStatePath(projectDir);
  try {
    const rawText = await fs.readFile(statePath, 'utf-8');
    const parsed = JSON.parse(rawText) as unknown;
    const normalized = normalizeSceneState(parsed);
    const shouldPersist =
      rawText.includes('"export"') ||
      (typeof (parsed as { currentStage?: unknown })?.currentStage === 'string' &&
        (parsed as { currentStage: string }).currentStage === 'export');
    if (shouldPersist) {
      await writeSceneState(projectDir, normalized);
    }
    return normalized;
  } catch (error) {
    if (error instanceof SceneStateMachineError) {
      throw error;
    }
    throw new SceneStateMachineError(
      'INVALID_STATE_FILE',
      error instanceof Error ? error.message : 'state.json is invalid',
    );
  }
}

export async function markSceneStageDraftSubmitted(
  projectDir: string,
  stage: SceneStageId,
  artifactIds: string[] = [],
): Promise<SceneState> {
  assertStage(stage);
  const next = updateStage(await readSceneState(projectDir), stage, (current) => ({
    ...current,
    status: 'draft_submitted',
    artifactIds,
    validation: null,
    validatedAt: null,
    approvedAt: null,
    revisionNote: null,
  }));
  await writeSceneState(projectDir, next);
  return next;
}

export async function markSceneStageValidationFailed(
  projectDir: string,
  stage: SceneStageId,
  errorCodes: string[],
): Promise<SceneState> {
  assertStage(stage);
  const next = updateStage(await readSceneState(projectDir), stage, (current) => ({
    ...current,
    status: 'validation_failed',
    validation: { status: 'failed', errorCodes },
    validatedAt: null,
    approvedAt: null,
  }));
  await writeSceneState(projectDir, next);
  return next;
}

export async function markSceneStageValidated(
  projectDir: string,
  stage: SceneStageId,
  policy: SceneApprovalPolicy,
): Promise<SceneState> {
  assertStage(stage);
  const now = new Date().toISOString();
  const nextStatus: SceneStageStatus =
    policy === 'required'
      ? 'waiting_approval'
      : policy === 'auto_if_valid'
        ? 'completed'
        : policy === 'skip'
          ? 'skipped'
          : 'validated';

  const next = updateStage(await readSceneState(projectDir), stage, (current) => ({
    ...current,
    status: nextStatus,
    validation: { status: 'passed', errorCodes: [] },
    validatedAt: now,
    approvedAt: null,
  }));
  await writeSceneState(projectDir, next);
  return next;
}

export async function approveSceneStage(
  projectDir: string,
  stage: SceneStageId,
): Promise<SceneState> {
  assertStage(stage);
  const currentState = await readSceneState(projectDir);
  const currentStage = currentState.stages[stage] ?? createDefaultStageState();
  const approvable =
    currentStage.status === 'waiting_approval' || currentStage.status === 'validated';
  if (!approvable) {
    throw new SceneStateMachineError(
      'SCENE_STAGE_NOT_VALIDATED',
      `${stage} 阶段尚未通过校验，不能审批。`,
    );
  }

  const now = new Date().toISOString();
  const next = updateStage(currentState, stage, (current) => ({
    ...current,
    status: 'approved',
    approvedAt: now,
  }));
  await writeSceneState(projectDir, next);
  return next;
}

export async function requestSceneStageRevision(
  projectDir: string,
  stage: SceneStageId,
  note: string,
): Promise<SceneState> {
  assertStage(stage);
  const next = updateStage(await readSceneState(projectDir), stage, (current) => ({
    ...current,
    status: 'revision_requested',
    revisionNote: note,
  }));
  await writeSceneState(projectDir, next);
  return next;
}

export async function setSceneCurrentStage(
  projectDir: string,
  stage: SceneStageId,
): Promise<SceneState> {
  assertStage(stage);
  const current = await readSceneState(projectDir);
  const next: SceneState = {
    ...current,
    currentStage: stage,
    updatedAt: new Date().toISOString(),
  };
  await writeSceneState(projectDir, next);
  return next;
}

export type SceneProjectCompletionErrorCode =
  | 'SCENE_PIPELINE_INCOMPLETE'
  | 'SCENE_PIPELINE_VALIDATION_FAILED';

export class SceneProjectCompletionError extends Error {
  code: SceneProjectCompletionErrorCode;
  audit: import('./scene-pipeline-completion').ScenePipelineCompletionAudit;

  constructor(
    code: SceneProjectCompletionErrorCode,
    message: string,
    audit: import('./scene-pipeline-completion').ScenePipelineCompletionAudit,
  ) {
    super(message);
    this.name = 'SceneProjectCompletionError';
    this.code = code;
    this.audit = audit;
  }
}

export async function completeSceneForgeProject(
  projectDir: string,
  _entryPath: import('../types').SceneEntryPath,
  audit: import('./scene-pipeline-completion').ScenePipelineCompletionAudit,
): Promise<SceneState> {
  if (!audit.ok) {
    const firstStage = audit.stageAudits.find((item) => !item.ok);
    const message = firstStage
      ? `流水线未就绪：${firstStage.stage}（${firstStage.status}）`
      : audit.validationErrors[0]?.message ?? '全项目校验未通过';
    throw new SceneProjectCompletionError(
      audit.validationErrors.length > 0
        ? 'SCENE_PIPELINE_VALIDATION_FAILED'
        : 'SCENE_PIPELINE_INCOMPLETE',
      message,
      audit,
    );
  }

  const current = await readSceneState(projectDir);
  const now = new Date().toISOString();
  const stages = { ...current.stages };
  const publish = stages.publish ?? createDefaultStageState();
  if (publish.status !== 'approved' && publish.status !== 'completed') {
    stages.publish = {
      ...publish,
      status: 'completed',
      approvedAt: publish.approvedAt ?? now,
    };
  }

  const next: SceneState = {
    ...current,
    status: 'completed',
    currentStage: 'publish',
    stages,
    updatedAt: now,
  };
  await writeSceneState(projectDir, next);
  return next;
}
