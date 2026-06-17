import type { SceneStageId } from '../types';

export type SceneStageRunnerType = 'manual_submit' | 'direct_llm' | 'acp_agent';

export interface SceneStageRunnerInput {
  projectDir: string;
  stage: SceneStageId;
  stageContext: unknown;
  manualArtifacts?: Record<string, string>;
  submitStageDraft: (input: unknown) => Promise<unknown>;
}

export interface SceneStageRunnerResult {
  runnerType: SceneStageRunnerType;
  stage: SceneStageId;
  artifacts: Record<string, string>;
}

export class SceneStageRunnerNotImplementedError extends Error {
  code = 'SCENE_STAGE_RUNNER_NOT_IMPLEMENTED' as const;

  constructor(runnerType: SceneStageRunnerType) {
    super(`${runnerType} runner is not implemented yet.`);
    this.name = 'SceneStageRunnerNotImplementedError';
  }
}

export interface SceneStageRunner {
  type: SceneStageRunnerType;
  run(input: SceneStageRunnerInput): Promise<SceneStageRunnerResult>;
}

export function createManualStageRunner(): SceneStageRunner {
  return {
    type: 'manual_submit',
    async run(input: SceneStageRunnerInput): Promise<SceneStageRunnerResult> {
      return {
        runnerType: 'manual_submit',
        stage: input.stage,
        artifacts: { ...(input.manualArtifacts ?? {}) },
      };
    },
  };
}

function createNotImplementedRunner(type: Exclude<SceneStageRunnerType, 'manual_submit'>): SceneStageRunner {
  return {
    type,
    async run(): Promise<SceneStageRunnerResult> {
      throw new SceneStageRunnerNotImplementedError(type);
    },
  };
}

export function createSceneStageRunner(type: SceneStageRunnerType): SceneStageRunner {
  if (type === 'manual_submit') {
    return createManualStageRunner();
  }
  return createNotImplementedRunner(type);
}
