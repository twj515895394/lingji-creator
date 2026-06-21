import type { SceneStageId } from './types';
import type { SceneStageContextOptions } from './pipeline/scene-context-builder';
import type { SceneStageRunProgress, SceneStageRunnerType } from './pipeline/scene-stage-runner';

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
  currentDraftArtifacts?: Record<string, string>;
  refinementPrompt?: string;
}

export interface SceneAnalyzeTopicGateIpcInput {
  projectDir: string;
}

export interface SceneUpdateStyleSelectionIpcInput {
  projectDir: string;
  selectedStyleProfileId: string | null;
  selectedAssetIds: string[];
}

export type SceneStageRunProgressPayload = SceneStageRunProgress;
