import fs from 'node:fs/promises';
import path from 'node:path';
import type { KeyframeEditPrompt } from '../../../src/sceneforge/remix/types';
import { getRemixVariantKeyframePromptPath } from './remix-artifact-paths';
import { readStoredSourceAsset, readStoredVariant, writeStoredVariant } from './remix-store';
import { resolveProjectFile } from './remix-validators';

export class RemixKeyframePromptService {
  async run(projectDir: string, variantId: string) {
    const variantDocument = await readStoredVariant(projectDir, variantId);
    const sourceDocument = await readStoredSourceAsset(projectDir, variantDocument.variant.sourceAssetId);
    const prompts: KeyframeEditPrompt[] = sourceDocument.sourceAsset.segments.flatMap((segment) =>
      segment.keyframes.map((keyframe, index) => ({
        id: `${variantId}-${segment.id}-${keyframe.frameRole}`,
        variantId,
        sourceAssetId: sourceDocument.sourceAsset.id,
        segmentId: segment.id,
        sourceKeyframeId: keyframe.id,
        frameRole: keyframe.frameRole,
        promptPath: getRemixVariantKeyframePromptPath(variantId, segment.id, keyframe.frameRole),
        promptVersion: index + 1,
        createdAt: new Date().toISOString(),
      })),
    );

    for (const prompt of prompts) {
      const filePath = resolveProjectFile(projectDir, prompt.promptPath);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(
        filePath,
        [
          `# Keyframe Prompt`,
          ``,
          `- Segment：${prompt.segmentId}`,
          `- Frame Role：${prompt.frameRole}`,
          `- Source Keyframe：${prompt.sourceKeyframeId}`,
          ``,
          `保留原始构图和动作重心，围绕「${variantDocument.variant.concept}」重绘，不改变镜头边界。`,
        ].join('\n'),
        'utf8',
      );
    }

    variantDocument.keyframeEditPrompts = prompts;
    variantDocument.variant.currentStage = 'remix_keyframe_edit_prompts';
    variantDocument.variant.updatedAt = new Date().toISOString();
    variantDocument.variant.stageStatuses = {
      ...variantDocument.variant.stageStatuses,
      remix_strategy: 'approved',
      remix_design: 'approved',
      remix_keyframe_edit_prompts: 'approved',
      edited_keyframes_review: 'ready_for_review',
    };
    variantDocument.creationStageStates = {
      ...variantDocument.creationStageStates,
      remix_strategy: 'approved',
      remix_design: 'approved',
      remix_keyframe_edit_prompts: 'approved',
      edited_keyframes_review: 'ready_for_review',
    };
    await writeStoredVariant(projectDir, variantDocument);
    return variantDocument;
  }
}
