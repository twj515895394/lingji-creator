import type { SceneEntryPath, SceneStageId } from '../../types/sceneforge';

/** 侧栏次要文案：与 entryPath 联动（DESIGN §1.3），不替代依赖阻塞原因。 */
export function getEntryPathStageAside(
  stageId: SceneStageId,
  entryPath: SceneEntryPath,
): string | null {
  if (entryPath === 'topic_gate' && stageId === 'source_intake') {
    return '可跳过';
  }
  if (entryPath === 'source_intake' && stageId === 'source_intake') {
    return '推荐起点';
  }
  return null;
}