import type { SceneStageId } from '../../types/sceneforge';
import { listAllPipelineStageIds } from './scene-pipeline-ui';

/** 流水线顺序中的下一阶段（不含自动跳过依赖） */
export function getNextPipelineStage(current: SceneStageId): SceneStageId | null {
  const order = listAllPipelineStageIds();
  const i = order.indexOf(current);
  if (i < 0 || i >= order.length - 1) return null;
  return order[i + 1] ?? null;
}