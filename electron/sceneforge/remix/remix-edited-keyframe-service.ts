import fs from 'node:fs/promises';
import path from 'node:path';
import type { EditedKeyframe, RemixEditedKeyframeStatus } from '../../../src/sceneforge/remix/types';
import { getRemixVariantEditedKeyframePath } from './remix-artifact-paths';
import type {
  RegisterEditedKeyframeInput,
  UpdateEditedKeyframeStatusInput,
} from './remix-ipc-types';
import {
  readStoredSourceAsset,
  readStoredVariant,
  writeStoredVariant,
} from './remix-store';
import {
  assertEditedKeyframeStatusTransition,
  assertFileExists,
  resolveProjectFile,
} from './remix-validators';

function now(): string {
  return new Date().toISOString();
}

function toTargetKey(segmentId: string, frameRole: string): string {
  return `${segmentId}:${frameRole}`;
}

export class RemixEditedKeyframeService {
  async register(projectDir: string, input: RegisterEditedKeyframeInput) {
    await assertFileExists(input.editedFramePath, '改后关键帧文件');
    const variantDocument = await readStoredVariant(projectDir, input.variantId);
    const sourceDocument = await readStoredSourceAsset(projectDir, variantDocument.variant.sourceAssetId);

    const matchingSegment = sourceDocument.sourceAsset.segments.find((segment) => segment.id === input.segmentId);
    if (!matchingSegment) {
      throw new Error(`未找到 Segment：${input.segmentId}`);
    }

    const matchingKeyframe = matchingSegment.keyframes.find((frame) => frame.frameRole === input.frameRole);
    if (!matchingKeyframe) {
      throw new Error(`未找到关键帧：${input.segmentId} / ${input.frameRole}`);
    }

    const prompt = variantDocument.keyframeEditPrompts.find(
      (item) => item.segmentId === input.segmentId && item.frameRole === input.frameRole,
    );
    if (!prompt) {
      throw new Error('请先生成关键帧改图 Prompt，再上传改后关键帧。');
    }

    const storedEditedFramePath = getRemixVariantEditedKeyframePath(
      input.variantId,
      input.segmentId,
      input.frameRole,
    );
    const resolvedTargetPath = resolveProjectFile(projectDir, storedEditedFramePath);
    await fs.mkdir(path.dirname(resolvedTargetPath), { recursive: true });
    await fs.copyFile(input.editedFramePath, resolvedTargetPath);

    const existing = variantDocument.editedKeyframes.find(
      (frame) => toTargetKey(frame.segmentId, frame.frameRole) === toTargetKey(input.segmentId, input.frameRole),
    );

    const createdAt = existing?.createdAt ?? now();
    const qualityChecks = existing?.status === 'needs_revision' ? existing.qualityChecks : [];
    const nextFrame: EditedKeyframe = {
      id: existing?.id ?? `${input.variantId}-${input.segmentId}-${input.frameRole}-edited`,
      variantId: input.variantId,
      segmentId: input.segmentId,
      frameRole: input.frameRole,
      sourceFramePath: matchingKeyframe.imagePath,
      promptPath: prompt.promptPath,
      editedFramePath: storedEditedFramePath,
      status: 'generated',
      qualityChecks,
      createdAt,
      updatedAt: now(),
    };

    variantDocument.editedKeyframes = [
      ...variantDocument.editedKeyframes.filter(
        (frame) => toTargetKey(frame.segmentId, frame.frameRole) !== toTargetKey(input.segmentId, input.frameRole),
      ),
      nextFrame,
    ].sort((left, right) => left.id.localeCompare(right.id));

    variantDocument.variant.currentStage = 'edited_keyframes_review';
    variantDocument.variant.updatedAt = now();
    variantDocument.variant.stageStatuses = {
      ...variantDocument.variant.stageStatuses,
      edited_keyframes_review: 'running',
      remix_video_prompts: 'not_started',
      remix_publish: 'not_started',
    };
    variantDocument.creationStageStates = {
      ...variantDocument.creationStageStates,
      edited_keyframes_review: 'running',
      remix_video_prompts: 'not_started',
      remix_publish: 'not_started',
    };
    variantDocument.seedancePrompts = [];

    await writeStoredVariant(projectDir, variantDocument);
    return variantDocument;
  }

  async updateStatus(projectDir: string, input: UpdateEditedKeyframeStatusInput) {
    const variantDocument = await readStoredVariant(projectDir, input.variantId);
    const currentFrame = variantDocument.editedKeyframes.find((frame) => frame.id === input.editedKeyframeId);
    if (!currentFrame) {
      throw new Error(`未找到改后关键帧：${input.editedKeyframeId}`);
    }

    assertEditedKeyframeStatusTransition(currentFrame.status, input.status);

    const nextFrames = variantDocument.editedKeyframes.map((frame) =>
      frame.id === input.editedKeyframeId
        ? {
            ...frame,
            status: input.status,
            qualityChecks: input.qualityChecks ?? frame.qualityChecks,
            updatedAt: now(),
          }
        : frame,
    );

    const approvedCount = nextFrames.filter((frame) => frame.status === 'approved').length;
    const requiredCount = variantDocument.keyframeEditPrompts.length;
    const reviewStatus: RemixEditedKeyframeStatus = input.status;

    variantDocument.editedKeyframes = nextFrames;
    variantDocument.variant.currentStage = 'edited_keyframes_review';
    variantDocument.variant.updatedAt = now();
    variantDocument.variant.stageStatuses = {
      ...variantDocument.variant.stageStatuses,
      edited_keyframes_review:
        requiredCount > 0 && approvedCount === requiredCount ? 'approved' : 'running',
      remix_video_prompts:
        reviewStatus === 'approved' && requiredCount > 0 && approvedCount === requiredCount
          ? 'ready_for_review'
          : 'not_started',
      remix_publish: 'not_started',
    };
    variantDocument.creationStageStates = {
      ...variantDocument.creationStageStates,
      edited_keyframes_review:
        requiredCount > 0 && approvedCount === requiredCount ? 'approved' : 'running',
      remix_video_prompts:
        reviewStatus === 'approved' && requiredCount > 0 && approvedCount === requiredCount
          ? 'ready_for_review'
          : 'not_started',
      remix_publish: 'not_started',
    };
    variantDocument.seedancePrompts = [];

    await writeStoredVariant(projectDir, variantDocument);
    return variantDocument;
  }
}
