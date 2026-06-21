import type { SceneStageId } from '../../types/sceneforge';
import type { SceneStageRunnerType } from '../../../electron/sceneforge/pipeline/scene-stage-runner';
import { getSceneStageRunCapability } from './scene-stage-run-capabilities';

export interface ContinueRunCapabilityInput {
  currentStage: SceneStageId;
  canContinue: boolean;
  nextStage: SceneStageId | null;
  supportedRunners: readonly SceneStageRunnerType[];
  runnerType: SceneStageRunnerType;
}

export interface ContinueRunCapabilityResult {
  nextStage: SceneStageId | null;
  supportedRunners: SceneStageRunnerType[];
  canRun: boolean;
  reason?: string;
}

/** 与能力表一致，不再硬编码排除 script 等 support 阶段的 direct_llm */
export function getStageSupportedRunners(
  stage: SceneStageId | null,
): SceneStageRunnerType[] {
  if (!stage) {
    return [];
  }
  return [...getSceneStageRunCapability(stage).runnerTypes];
}

export function getContinueRunCapability(
  input: ContinueRunCapabilityInput,
): ContinueRunCapabilityResult {
  const {
    canContinue,
    nextStage,
    supportedRunners,
    runnerType,
  } = input;

  const runners = [...supportedRunners];

  if (!canContinue) {
    return {
      nextStage,
      supportedRunners: runners,
      canRun: false,
      reason: '当前阶段尚不能 Continue',
    };
  }

  if (!nextStage) {
    return {
      nextStage: null,
      supportedRunners: runners,
      canRun: false,
      reason: '没有下一阶段',
    };
  }

  if (!runners.includes(runnerType)) {
    return {
      nextStage,
      supportedRunners: runners,
      canRun: false,
      reason: '下一阶段不支持 Direct LLM',
    };
  }

  return {
    nextStage,
    supportedRunners: runners,
    canRun: true,
  };
}