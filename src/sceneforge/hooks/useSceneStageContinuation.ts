import { useCallback, useState } from 'react';
import type { SceneStageId, SceneStageStatus } from '../../types/sceneforge';
import type {
  SceneStageRunnerResult,
  SceneStageRunnerType,
} from '../../../electron/sceneforge/pipeline/scene-stage-runner';
import { getNextPipelineStage, isPipelineTerminalStage } from '../lib/scene-stage-nav';

export type SceneContinuationMode = 'navigate' | 'navigate_and_run';
export type SceneContinuationBusyState = 'approving' | 'navigating' | 'running_next' | null;

export interface ContinueSceneStageInput {
  currentStage: SceneStageId;
  currentStatus: SceneStageStatus;
  mode: SceneContinuationMode;
  runnerType: SceneStageRunnerType;
}

export interface ContinueSceneStageDeps {
  approve: (stage: SceneStageId) => Promise<unknown>;
  navigate: (stage: SceneStageId) => Promise<void> | void;
  run: (
    stage: SceneStageId,
    runnerType: SceneStageRunnerType,
  ) => Promise<SceneStageRunnerResult>;
  /** 流水线末阶段（publish）：全项目校验并标记创作完成 */
  finalizeProject?: () => Promise<void>;
  onBusyChange?: (state: SceneContinuationBusyState) => void;
}

export interface ContinueSceneStageResult {
  nextStage: SceneStageId | null;
  runResult?: SceneStageRunnerResult;
  runError?: string;
}

const TERMINAL_STATUSES = new Set<SceneStageStatus>(['approved', 'completed', 'skipped']);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '下一阶段运行失败';
}

export async function continueSceneStage(
  input: ContinueSceneStageInput,
  deps: ContinueSceneStageDeps,
): Promise<ContinueSceneStageResult> {
  const nextStage = getNextPipelineStage(input.currentStage);
  if (!nextStage) {
    if (!isPipelineTerminalStage(input.currentStage) || !deps.finalizeProject) {
      return { nextStage: null };
    }
    try {
      if (!TERMINAL_STATUSES.has(input.currentStatus)) {
        deps.onBusyChange?.('approving');
        await deps.approve(input.currentStage);
      }
      deps.onBusyChange?.('navigating');
      await deps.finalizeProject();
      return { nextStage: null };
    } finally {
      deps.onBusyChange?.(null);
    }
  }

  try {
    if (!TERMINAL_STATUSES.has(input.currentStatus)) {
      deps.onBusyChange?.('approving');
      await deps.approve(input.currentStage);
    }

    deps.onBusyChange?.('navigating');
    await deps.navigate(nextStage);

    if (input.mode === 'navigate') {
      return { nextStage };
    }

    deps.onBusyChange?.('running_next');
    try {
      const runResult = await deps.run(nextStage, input.runnerType);
      return { nextStage, runResult };
    } catch (error) {
      return { nextStage, runError: errorMessage(error) };
    }
  } finally {
    deps.onBusyChange?.(null);
  }
}

export function useSceneStageContinuation(deps: Omit<ContinueSceneStageDeps, 'onBusyChange'>) {
  const [busy, setBusy] = useState<SceneContinuationBusyState>(null);

  const continueStage = useCallback(
    (input: ContinueSceneStageInput) =>
      continueSceneStage(input, {
        ...deps,
        onBusyChange: setBusy,
      }),
    [deps],
  );

  return { busy, continueStage };
}
