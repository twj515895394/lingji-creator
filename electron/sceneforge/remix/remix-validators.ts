import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  RemixAssetProcessingStageId,
  RemixEditedKeyframeStatus,
  RemixStageStatus,
} from '../../../src/sceneforge/remix/types';
import { assertRemixUnderstandingReady } from './remix-understanding-gate';
import type { StoredSourceAssetDocument, StoredVariantDocument } from './remix-store';

function isApproved(status: RemixStageStatus | undefined): boolean {
  return status === 'approved' || status === 'ready_for_review';
}

export async function assertFileExists(filePath: string, label: string): Promise<void> {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`${label}不存在：${filePath}`);
  }
}

export function assertSourceAssetStageReady(
  document: StoredSourceAssetDocument,
  stageId: RemixAssetProcessingStageId,
): void {
  const status = document.processingStageStates[stageId];
  if (!isApproved(status)) {
    throw new Error(`Source Asset 阶段未完成：${stageId}`);
  }
}

export async function assertPublishReady(
  projectDir: string,
  document: StoredSourceAssetDocument,
): Promise<void> {
  assertSourceAssetStageReady(document, 'remix_segmentation');
  assertSourceAssetStageReady(document, 'remix_keyframes');
  assertSourceAssetStageReady(document, 'remix_understanding');
  await assertRemixUnderstandingReady(projectDir, document);
  if ((document.sourceAsset.tags ?? []).length === 0) {
    throw new Error('请先保存至少一个资产标签。');
  }
}

export function assertEditedKeyframeStatusTransition(
  currentStatus: RemixEditedKeyframeStatus,
  nextStatus: RemixEditedKeyframeStatus,
): void {
  if (currentStatus === nextStatus) {
    return;
  }

  const allowedTransitions: Record<RemixEditedKeyframeStatus, RemixEditedKeyframeStatus[]> = {
    pending: ['generated'],
    generated: ['approved', 'needs_revision', 'rejected'],
    needs_revision: ['generated', 'rejected'],
    approved: [],
    rejected: ['generated'],
  };

  if (!allowedTransitions[currentStatus].includes(nextStatus)) {
    throw new Error(`不允许的关键帧状态流转：${currentStatus} -> ${nextStatus}`);
  }
}

export function assertSeedancePromptReady(
  variantDocument: StoredVariantDocument,
): void {
  if (variantDocument.keyframeEditPrompts.length === 0) {
    throw new Error('请先生成关键帧改图 Prompt。');
  }

  const requiredTargets = new Set(
    variantDocument.keyframeEditPrompts.map((prompt) => `${prompt.segmentId}:${prompt.frameRole}`),
  );
  const approvedTargets = new Set(
    variantDocument.editedKeyframes
      .filter((frame) => frame.status === 'approved')
      .map((frame) => `${frame.segmentId}:${frame.frameRole}`),
  );

  const missingTargets = Array.from(requiredTargets).filter((target) => !approvedTargets.has(target));
  if (missingTargets.length > 0) {
    throw new Error(`仍有关键帧未通过验收：${missingTargets.join(', ')}`);
  }
}

export function resolveProjectFile(projectDir: string, filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.join(projectDir, filePath);
}
