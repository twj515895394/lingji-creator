import type { SceneEntryPath, SceneStageId, SceneStageStatus } from '../../types/sceneforge';
import { SCENE_STAGE_IDS } from '../../types/sceneforge';
import { getSceneStageDefinitionLite } from './scene-pipeline-ui';
import { getTopicGateDownstreamBlockReason } from './scene-hitl-markdown';

export interface SceneGateNavContext {
  topicBrief: string;
  gateConfirmations: string | null;
}

const STAGES_AFTER_GATE_STYLE = new Set<SceneStageId>([
  'reference',
  'story',
  'assets',
  'design',
  'script',
  'performance',
  'storyboard',
  'audio',
  'video_prompts',
  'publish',
]);

export function normalizeSceneEntryPath(value: unknown): SceneEntryPath {
  if (value === 'source_intake' || value === 'topic_gate') {
    return value;
  }
  return 'topic_gate';
}

export function getRecommendedStartStage(entryPath: SceneEntryPath): SceneStageId {
  return entryPath === 'source_intake' ? 'source_intake' : 'topic_gate';
}

const TERMINAL_STAGE_STATUSES = new Set<SceneStageStatus>(['approved', 'completed', 'skipped']);
const ACTIVE_STAGE_STATUSES = new Set<SceneStageStatus>([
  'in_progress',
  'draft_submitted',
  'validation_failed',
  'validated',
  'waiting_approval',
  'revision_requested',
]);

function orderedStagesForEntryPath(entryPath: SceneEntryPath): SceneStageId[] {
  return SCENE_STAGE_IDS.filter((stageId) => !(entryPath === 'topic_gate' && stageId === 'source_intake'));
}

export function getRecommendedResumeStage(input: {
  entryPath: SceneEntryPath;
  currentStage: SceneStageId | null;
  stageStatuses: Partial<Record<SceneStageId, SceneStageStatus>>;
}): SceneStageId {
  const orderedStages = orderedStagesForEntryPath(input.entryPath);
  if (input.currentStage && orderedStages.includes(input.currentStage)) {
    const currentStatus = input.stageStatuses[input.currentStage];
    if (currentStatus && !TERMINAL_STAGE_STATUSES.has(currentStatus)) {
      return input.currentStage;
    }
  }

  for (const stageId of orderedStages) {
    const status = input.stageStatuses[stageId] ?? 'ready';
    if (ACTIVE_STAGE_STATUSES.has(status)) {
      return stageId;
    }
    if (!TERMINAL_STAGE_STATUSES.has(status)) {
      return stageId;
    }
  }

  return input.currentStage && orderedStages.includes(input.currentStage)
    ? input.currentStage
    : getRecommendedStartStage(input.entryPath);
}

export function isStageDependencySatisfied(
  stageId: SceneStageId,
  completedStages: ReadonlySet<SceneStageId>,
  entryPath: SceneEntryPath,
): boolean {
  const def = getSceneStageDefinitionLite(stageId);
  return def.dependencies.every((dep) => {
    if (dep === 'source_intake' && entryPath === 'topic_gate') {
      return true;
    }
    return completedStages.has(dep);
  });
}

export function getStageDependencyBlockReason(
  stageId: SceneStageId,
  completedStages: ReadonlySet<SceneStageId>,
  entryPath: SceneEntryPath,
): string | null {
  const def = getSceneStageDefinitionLite(stageId);
  for (const dep of def.dependencies) {
    if (dep === 'source_intake' && entryPath === 'topic_gate') {
      continue;
    }
    if (!completedStages.has(dep)) {
      const depDef = getSceneStageDefinitionLite(dep);
      return `请先完成「${depDef.titleZh}」`;
    }
  }
  return null;
}

export function getStageNavBlockReason(
  stageId: SceneStageId,
  completedStages: ReadonlySet<SceneStageId>,
  entryPath: SceneEntryPath,
  gateCtx?: SceneGateNavContext,
): string | null {
  const depReason = getStageDependencyBlockReason(stageId, completedStages, entryPath);
  if (depReason) return depReason;
  if (gateCtx && STAGES_AFTER_GATE_STYLE.has(stageId)) {
    return getTopicGateDownstreamBlockReason(gateCtx.gateConfirmations, gateCtx.topicBrief);
  }
  return null;
}

export function stagesCompletedForNav(
  stageStatuses: Partial<Record<SceneStageId, import('../../types/sceneforge').SceneStageStatus>>,
): Set<SceneStageId> {
  const done = new Set<SceneStageId>();
  const terminal = new Set(['approved', 'completed', 'skipped']);
  for (const [id, status] of Object.entries(stageStatuses)) {
    if (status && terminal.has(status)) {
      done.add(id as SceneStageId);
    }
  }
  return done;
}
