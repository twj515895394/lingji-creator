import type { SceneStageId } from './types';
import type { SceneStageContextOptions } from './pipeline/scene-context-builder';
import type { SceneStageRunnerType } from './pipeline/scene-stage-runner';

/** IPC / MCP 与 Renderer 共用的 getStageContext 可选参数 */
export type SceneGetStageContextOptions = SceneStageContextOptions;

export interface SceneGetStageContextIpcArgs {
  projectDir: string;
  stage: SceneStageId;
  options?: SceneGetStageContextOptions;
}

export interface SceneRunStageIpcInput {
  projectDir: string;
  stage: SceneStageId;
  runnerType: SceneStageRunnerType;
  manualArtifacts?: Record<string, string>;
  selectedAssetIds?: string[];
}