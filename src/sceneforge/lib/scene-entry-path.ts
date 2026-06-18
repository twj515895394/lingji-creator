import type { SceneEntryPath, SceneStageId } from '../../types/sceneforge';
import { getSceneStageDefinitionLite } from './scene-pipeline-ui';
import { isTopicGateStyleBlockingDownstream } from './scene-hitl-markdown';

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
  'export',
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
    if (isTopicGateStyleBlockingDownstream(gateCtx.gateConfirmations, gateCtx.topicBrief)) {
      return '请先完成「选题闸门」的风格确认';
    }
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