import fs from 'node:fs/promises';
import path from 'node:path';
import type { SceneApprovalPolicy, SceneStageId, SceneStageStatus } from '../types';
import { isSceneStageId } from './scene-stage-definitions';

const STATE_PATH = path.join('sceneforge', 'state.json');

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
    if (!isSceneStageId(stage)) {
      throw new SceneStateMachineError(
        'INVALID_STATE_FILE',
        `state.json contains unknown stage: ${stage}`,
      );
    }
    stages[stage] = normalizeStageState(state);
  }

  return {
    version: 1,
    pipelineId: raw?.pipelineId ?? 'reference_remake',
    currentStage: raw?.currentStage ?? 'design',
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
  try {
    const raw = await fs.readFile(getStatePath(projectDir), 'utf-8');
    return normalizeSceneState(JSON.parse(raw));
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
  if (currentStage.status !== 'waiting_approval') {
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
