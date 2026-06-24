import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  SeedanceAudioPlan,
  SeedancePrompt,
  SourceSegment,
} from '../../../src/sceneforge/remix/types';
import {
  getRemixVariantAudioPlanPath,
  getRemixVariantPromptBundleDir,
  getRemixVariantPromptBundleManifestPath,
  getRemixVariantPromptBundlePath,
  getRemixVariantSeedancePromptJsonPath,
  getRemixVariantSeedancePromptPath,
} from './remix-artifact-paths';
import {
  readStoredSourceAsset,
  readStoredVariant,
  writeStoredVariant,
} from './remix-store';
import {
  assertFileExists,
  assertSeedancePromptReady,
  resolveProjectFile,
} from './remix-validators';
import { writeZipFromDirectory } from './remix-zip';

function now(): string {
  return new Date().toISOString();
}

function buildAudioPlan(segment: SourceSegment): SeedanceAudioPlan {
  return {
    globalAudioRules: [
      '保留原片停顿感，不要铺满背景音乐。',
      '对白、音效、环境音分层明确，避免互相遮挡。',
    ],
    voiceProfiles: [
      {
        id: 'lead-pressure-voice',
        description: '低沉克制、尾句带施压感，节奏偏慢。',
      },
    ],
    segmentAudioPlan: [
      {
        segmentId: segment.id,
        dialogue: `围绕「${segment.title}」重写对白，但保留试探与回击轮次。`,
        voice: '主说话者保持低沉逼近感，反击角色压缩字数。',
        soundEffects: '脚步、衣料摩擦、桌面轻碰撞保留前景层次。',
        ambientAudio: '维持空旷风声与远处环境底噪，不要电子乐。',
      },
    ],
  };
}

function buildPromptMarkdown(prompt: SeedancePrompt): string {
  const audioPlan = prompt.audioPlan;
  return [
    `# Seedance Prompt · ${prompt.segmentId}`,
    '',
    `- 生成模式：${prompt.generationMode}`,
    `- 平台：${prompt.targetPlatform}`,
    `- Audio Plan：${prompt.audioPlanPath ?? '未生成'}`,
    '',
    '## Structured Fields',
    `- Visual：${prompt.structuredFields.visual}`,
    `- Motion：${prompt.structuredFields.motion}`,
    `- Camera：${prompt.structuredFields.camera}`,
    `- Performance：${prompt.structuredFields.performance}`,
    `- Dialogue：${prompt.structuredFields.dialogue}`,
    `- Voice：${prompt.structuredFields.voice}`,
    `- Sound Effects：${prompt.structuredFields.soundEffects}`,
    `- Ambient Audio：${prompt.structuredFields.ambientAudio}`,
    `- Negative：${prompt.structuredFields.negative}`,
    '',
    '## Copy Ready Prompt',
    prompt.copyablePrompt,
    ...(audioPlan
      ? [
          '',
          '## Audio Plan',
          ...audioPlan.globalAudioRules.map((rule) => `- ${rule}`),
        ]
      : []),
  ].join('\n');
}

function buildPrompt(
  variantId: string,
  segment: SourceSegment,
  generationMode: SeedancePrompt['generationMode'],
  concept: string,
): SeedancePrompt {
  const audioPlan = buildAudioPlan(segment);
  const clipReference =
    generationMode === 'keyframes_plus_source_clip'
      ? `同时引用 source_clip: ${segment.sourceClipPath}，保持镜头节奏与动作边界。`
      : '仅引用已通过验收的改后关键帧，不再依赖 source clip。';
  return {
    id: `${variantId}-${segment.id}-seedance`,
    variantId,
    segmentId: segment.id,
    generationMode,
    targetPlatform: 'seedance_2_0',
    structuredFields: {
      visual: `围绕「${concept}」重绘 ${segment.title}，保持镜头边界与人物相对站位。`,
      motion: clipReference,
      camera: `延续 ${segment.title} 的景别与推进关系，避免新增无动机运镜。`,
      performance: '保持压迫式试探到突然反击的表演弧线。',
      dialogue: `对白重写但保留 ${segment.title} 的攻防轮次与停顿。`,
      voice: '低沉克制，尾句略带威胁感。',
      soundEffects: '脚步、衣料摩擦、桌面碰撞保留近景层。',
      ambientAudio: '保留风声与环境底噪，不铺现代电子乐。',
      negative: '避免赛博霓虹、现代广告屏、卡通夸张表情。',
    },
    copyablePrompt: [
      `【Segment】${segment.title}`,
      `【Mode】${generationMode}`,
      `【Visual】围绕「${concept}」重绘，并保持镜头边界。`,
      `【Reference】${clipReference}`,
      `【Audio】对白、音效、环境音三层分离，保留压迫感。`,
    ].join('\n'),
    audioPlanPath: getRemixVariantAudioPlanPath(variantId),
    audioPlan,
  };
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export class RemixSeedancePromptService {
  async run(projectDir: string, variantId: string) {
    const variantDocument = await readStoredVariant(projectDir, variantId);
    const sourceDocument = await readStoredSourceAsset(projectDir, variantDocument.variant.sourceAssetId);
    assertSeedancePromptReady(variantDocument);

    const prompts = sourceDocument.sourceAsset.segments.map((segment) =>
      buildPrompt(
        variantId,
        segment,
        variantDocument.variant.segmentGenerationModeOverrides[segment.id] ??
          variantDocument.variant.defaultGenerationMode,
        variantDocument.variant.concept,
      ),
    );

    for (const prompt of prompts) {
      const markdownPath = resolveProjectFile(
        projectDir,
        getRemixVariantSeedancePromptPath(variantId, prompt.segmentId),
      );
      const jsonPath = resolveProjectFile(
        projectDir,
        getRemixVariantSeedancePromptJsonPath(variantId, prompt.segmentId),
      );
      await fs.mkdir(path.dirname(markdownPath), { recursive: true });
      await fs.writeFile(markdownPath, buildPromptMarkdown(prompt), 'utf8');
      await writeJson(jsonPath, prompt);

      if (prompt.generationMode === 'keyframes_plus_source_clip') {
        await assertFileExists(
          resolveProjectFile(projectDir, sourceDocument.sourceAsset.segments.find((segment) => segment.id === prompt.segmentId)?.sourceClipPath ?? ''),
          `Segment source clip (${prompt.segmentId})`,
        );
      }
    }

    const audioPlanPath = resolveProjectFile(projectDir, getRemixVariantAudioPlanPath(variantId));
    await writeJson(audioPlanPath, {
      globalAudioRules: prompts[0]?.audioPlan?.globalAudioRules ?? [],
      voiceProfiles: prompts[0]?.audioPlan?.voiceProfiles ?? [],
      segmentAudioPlan: prompts.flatMap((prompt) => prompt.audioPlan?.segmentAudioPlan ?? []),
    });

    variantDocument.seedancePrompts = prompts;
    variantDocument.variant.currentStage = 'remix_video_prompts';
    variantDocument.variant.updatedAt = now();
    variantDocument.variant.stageStatuses = {
      ...variantDocument.variant.stageStatuses,
      remix_strategy: 'approved',
      remix_design: 'approved',
      remix_keyframe_edit_prompts: 'approved',
      edited_keyframes_review: 'approved',
      remix_video_prompts: 'approved',
      remix_publish: 'ready_for_review',
    };
    variantDocument.creationStageStates = {
      ...variantDocument.creationStageStates,
      remix_strategy: 'approved',
      remix_design: 'approved',
      remix_keyframe_edit_prompts: 'approved',
      edited_keyframes_review: 'approved',
      remix_video_prompts: 'approved',
      remix_publish: 'ready_for_review',
    };
    await writeStoredVariant(projectDir, variantDocument);
    return variantDocument;
  }

  async exportBundle(projectDir: string, variantId: string, outputPath?: string | null) {
    const variantDocument = await this.run(projectDir, variantId);
    const sourceDocument = await readStoredSourceAsset(projectDir, variantDocument.variant.sourceAssetId);
    const bundleDir = resolveProjectFile(projectDir, getRemixVariantPromptBundleDir(variantId));
    await fs.rm(bundleDir, { recursive: true, force: true });
    await fs.mkdir(bundleDir, { recursive: true });

    const manifest = {
      variantId,
      sourceAssetId: sourceDocument.sourceAsset.id,
      exportedAt: now(),
      seedancePromptCount: variantDocument.seedancePrompts.length,
      editedKeyframeCount: variantDocument.editedKeyframes.length,
      files: {
        prompts: variantDocument.seedancePrompts.map((prompt) => ({
          segmentId: prompt.segmentId,
          markdown: `seedance_prompts/${prompt.segmentId}.md`,
          json: `seedance_prompts/${prompt.segmentId}.json`,
        })),
        audioPlan: 'audio_plan.json',
      },
    };
    await writeJson(resolveProjectFile(projectDir, getRemixVariantPromptBundleManifestPath(variantId)), manifest);
    await fs.writeFile(
      path.join(bundleDir, 'bundle_summary.md'),
      [
        `# Remix Prompt Bundle`,
        '',
        `- Variant：${variantDocument.variant.name}`,
        `- Concept：${variantDocument.variant.concept}`,
        `- Segments：${variantDocument.seedancePrompts.length}`,
        `- Edited Keyframes：${variantDocument.editedKeyframes.length}`,
      ].join('\n'),
      'utf8',
    );

    const promptDir = path.join(bundleDir, 'seedance_prompts');
    await fs.mkdir(promptDir, { recursive: true });
    for (const prompt of variantDocument.seedancePrompts) {
      await fs.copyFile(
        resolveProjectFile(projectDir, getRemixVariantSeedancePromptPath(variantId, prompt.segmentId)),
        path.join(promptDir, `${prompt.segmentId}.md`),
      );
      await fs.copyFile(
        resolveProjectFile(projectDir, getRemixVariantSeedancePromptJsonPath(variantId, prompt.segmentId)),
        path.join(promptDir, `${prompt.segmentId}.json`),
      );
    }

    await fs.copyFile(
      resolveProjectFile(projectDir, getRemixVariantAudioPlanPath(variantId)),
      path.join(bundleDir, 'audio_plan.json'),
    );

    const editedKeyframesDir = path.join(bundleDir, 'edited_keyframes');
    await fs.mkdir(editedKeyframesDir, { recursive: true });
    for (const frame of variantDocument.editedKeyframes) {
      await fs.copyFile(
        resolveProjectFile(projectDir, frame.editedFramePath),
        path.join(editedKeyframesDir, path.basename(frame.editedFramePath)),
      );
    }

    const sourceClipsDir = path.join(bundleDir, 'source_clips');
    await fs.mkdir(sourceClipsDir, { recursive: true });
    for (const prompt of variantDocument.seedancePrompts.filter(
      (item) => item.generationMode === 'keyframes_plus_source_clip',
    )) {
      const segment = sourceDocument.sourceAsset.segments.find((item) => item.id === prompt.segmentId);
      if (!segment) {
        continue;
      }
      await fs.copyFile(
        resolveProjectFile(projectDir, segment.sourceClipPath),
        path.join(sourceClipsDir, `${segment.id}.mp4`),
      );
    }

    const resolvedOutputPath = outputPath?.trim() || resolveProjectFile(projectDir, getRemixVariantPromptBundlePath(variantId));
    if (resolvedOutputPath.endsWith('.zip')) {
      await fs.rm(resolvedOutputPath, { force: true });
      await writeZipFromDirectory(bundleDir, resolvedOutputPath);
    } else {
      await fs.rm(resolvedOutputPath, { recursive: true, force: true });
      await fs.mkdir(path.dirname(resolvedOutputPath), { recursive: true });
      await fs.cp(bundleDir, resolvedOutputPath, { recursive: true });
    }

    return {
      bundlePath: resolvedOutputPath,
      workspace: {
        sourceAsset: {
          id: sourceDocument.sourceAsset.id,
          title: sourceDocument.sourceAsset.title,
          status: sourceDocument.sourceAsset.status,
          durationMs: sourceDocument.sourceAsset.videoMetadata.durationMs,
          segmentCount: sourceDocument.sourceAsset.segments.length,
          keyframeCount: sourceDocument.sourceAsset.segments.reduce(
            (sum, segment) => sum + segment.keyframes.length,
            0,
          ),
          variantCount: sourceDocument.sourceAsset.variantCount,
          updatedAt: sourceDocument.sourceAsset.updatedAt,
        },
        sourceAssetDetails: sourceDocument.sourceAsset,
        variant: variantDocument.variant,
        keyframeEditPrompts: variantDocument.keyframeEditPrompts,
        editedKeyframes: variantDocument.editedKeyframes,
        seedancePrompts: variantDocument.seedancePrompts,
        creationStageStates: variantDocument.creationStageStates,
      },
    };
  }
}
