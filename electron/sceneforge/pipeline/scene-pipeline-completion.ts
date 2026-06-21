import type { SceneEntryPath, SceneStageId, SceneStageStatus } from '../../../src/types/sceneforge';
import { SCENE_STAGE_IDS } from '../../../src/types/sceneforge';
import { validateSceneStage, type SceneValidationError } from '../validators/scene-validator';
import type { SceneState } from './scene-state-machine';

const SCENE_CORE_STAGES = new Set<SceneStageId>(['design', 'storyboard', 'video_prompts']);

const SUPPORT_STAGE_DONE = new Set<SceneStageStatus>([
  'validated',
  'waiting_approval',
  'approved',
  'completed',
  'skipped',
]);

export interface ScenePipelineStageAuditItem {
  stage: SceneStageId;
  status: SceneStageStatus;
  ok: boolean;
  message?: string;
}

export interface ScenePipelineCompletionAudit {
  entryPath: SceneEntryPath;
  requiredStages: SceneStageId[];
  stageAudits: ScenePipelineStageAuditItem[];
  validationErrors: SceneValidationError[];
  ok: boolean;
}

export function listStagesRequiredForProjectCompletion(entryPath: SceneEntryPath): SceneStageId[] {
  return SCENE_STAGE_IDS.filter((stageId) => !(entryPath === 'topic_gate' && stageId === 'source_intake'));
}

function isStageDoneForCompletion(stage: SceneStageId, status: SceneStageStatus): boolean {
  if (SCENE_CORE_STAGES.has(stage)) {
    return status === 'approved' || status === 'completed';
  }
  return SUPPORT_STAGE_DONE.has(status);
}

export function auditPipelineStageCompletion(
  state: SceneState,
  entryPath: SceneEntryPath,
): ScenePipelineCompletionAudit {
  const requiredStages = listStagesRequiredForProjectCompletion(entryPath);
  const stageAudits: ScenePipelineStageAuditItem[] = [];

  for (const stage of requiredStages) {
    const status = state.stages[stage]?.status ?? 'ready';
    const ok = isStageDoneForCompletion(stage, status);
    stageAudits.push({
      stage,
      status,
      ok,
      message: ok
        ? undefined
        : SCENE_CORE_STAGES.has(stage)
          ? `核心阶段须为已审批（approved），当前为 ${status}。`
          : `阶段须至少通过校验或已跳过，当前为 ${status}。`,
    });
  }

  const ok = stageAudits.every((item) => item.ok);
  return {
    entryPath,
    requiredStages,
    stageAudits,
    validationErrors: [],
    ok,
  };
}

export async function runFullPipelineValidation(
  projectDir: string,
  entryPath: SceneEntryPath,
): Promise<SceneValidationError[]> {
  const requiredStages = listStagesRequiredForProjectCompletion(entryPath);
  const errors: SceneValidationError[] = [];

  for (const stage of requiredStages) {
    const result = await validateSceneStage(projectDir, stage);
    if (result.status === 'failed') {
      errors.push(
        ...result.errors
          .filter((e) => e.level === 'error')
          .map((e) => ({
            ...e,
            message: `【${stage}】${e.message}`,
          })),
      );
    }
  }

  return errors;
}

export async function auditPipelineCompletionForProject(
  projectDir: string,
  state: SceneState,
  entryPath: SceneEntryPath,
  options?: { runValidators?: boolean },
): Promise<ScenePipelineCompletionAudit> {
  const audit = auditPipelineStageCompletion(state, entryPath);
  if (!audit.ok) {
    return audit;
  }

  if (options?.runValidators !== false) {
    const validationErrors = await runFullPipelineValidation(projectDir, entryPath);
    return {
      ...audit,
      validationErrors,
      ok: validationErrors.length === 0,
    };
  }

  return audit;
}