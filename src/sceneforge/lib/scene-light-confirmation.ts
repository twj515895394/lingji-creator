import type { SceneApprovalPolicy, SceneStageId } from '../../types/sceneforge';

const AUTO_ADVANCE_STAGES = new Set<SceneStageId>([
  'reference',
  'story',
  'assets',
  'script',
  'performance',
  'audio',
]);

export function shouldAutoAdvanceAfterSupportSubmit(
  stage: SceneStageId,
  policy: SceneApprovalPolicy,
): boolean {
  if (!AUTO_ADVANCE_STAGES.has(stage)) {
    return false;
  }
  return policy !== 'required';
}
