import type { SceneStageId } from './types';
import type { SceneStageContextOptions } from './pipeline/scene-context-builder';

/** IPC / MCP 与 Renderer 共用的 getStageContext 可选参数 */
export type SceneGetStageContextOptions = SceneStageContextOptions;

export interface SceneGetStageContextIpcArgs {
  projectDir: string;
  stage: SceneStageId;
  options?: SceneGetStageContextOptions;
}