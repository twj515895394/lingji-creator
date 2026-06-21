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

export interface ContinueRunCapability {
  nextStage: SceneStageId | null;
  canRun: boolean;
  reason?: string;
  supportedRunners: SceneStageRunnerType[];
}

const RUNNER_LABELS: Record<SceneStageRunnerType, string> = {
  manual_submit: '手动提交',
  direct_llm: 'Direct LLM',
  acp_agent: 'ACP Agent',
};

export function getStageSupportedRunners(stage: SceneStageId | null): SceneStageRunnerType[] {
  if (!stage) return [];
  return [...getSceneStageRunCapability(stage).runnerTypes];
}

export function getContinueRunCapability(
  input: ContinueRunCapabilityInput,
): ContinueRunCapability {
  const supportedRunners = [...input.supportedRunners];
  if (!input.canContinue) {
    return {
      nextStage: input.nextStage,
      canRun: false,
      reason: '当前阶段尚不能 Continue',
      supportedRunners,
    };
  }
  if (!input.nextStage) {
    return {
      nextStage: null,
      canRun: false,
      reason: '没有下一阶段',
      supportedRunners,
    };
  }
  if (!supportedRunners.includes(input.runnerType)) {
    return {
      nextStage: input.nextStage,
      canRun: false,
      reason: `下一阶段不支持 ${RUNNER_LABELS[input.runnerType]}`,
      supportedRunners,
    };
  }
  return {
    nextStage: input.nextStage,
    canRun: true,
    supportedRunners,
  };
}
