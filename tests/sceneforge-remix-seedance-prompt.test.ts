import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RemixService } from '../electron/sceneforge/remix/remix-service';

let projectDir: string;

async function createApprovedVariant(service: RemixService) {
  const imported = await service.createSourceAssetFromImport({
    projectDir,
    sourceVideoPath: path.join(projectDir, 'source.mp4'),
    title: '天台原片',
  });
  await service.runSourceSegmentation({ projectDir, sourceAssetId: imported.sourceAsset.id });
  await service.runSourceKeyframes({ projectDir, sourceAssetId: imported.sourceAsset.id });
  await service.runSourceUnderstanding({ projectDir, sourceAssetId: imported.sourceAsset.id });
  await service.updateSourceAssetMetadata({
    projectDir,
    sourceAssetId: imported.sourceAsset.id,
    tags: ['rooftop', 'seedance'],
    annotationNote: '保留对白攻防轮次和环境底噪。',
  });
  await service.publishSourceAssetToLibrary({ projectDir, sourceAssetId: imported.sourceAsset.id });
  const created = await service.createVariantFromSourceAsset({
    projectDir,
    sourceAssetId: imported.sourceAsset.id,
    name: '狸猫黑帮版',
    concept: '保留压迫感',
  });
  await service.runRemixStrategy({ projectDir, variantId: created.variant.id });
  await service.runRemixDesign({ projectDir, variantId: created.variant.id });
  const prompted = await service.runKeyframeEditPrompts({ projectDir, variantId: created.variant.id });

  for (const prompt of prompted.keyframeEditPrompts) {
    const uploadedPath = path.join(projectDir, `${prompt.segmentId}-${prompt.frameRole}.png`);
    await fs.writeFile(uploadedPath, `${prompt.segmentId}:${prompt.frameRole}`, 'utf8');
    const registered = await service.registerEditedKeyframe({
      projectDir,
      variantId: prompted.variant.id,
      segmentId: prompt.segmentId,
      frameRole: prompt.frameRole,
      sourceFramePath: '',
      promptPath: '',
      editedFramePath: uploadedPath,
    });
    const editedFrame = registered.editedKeyframes.find(
      (frame) => frame.segmentId === prompt.segmentId && frame.frameRole === prompt.frameRole,
    );
    await service.updateEditedKeyframeStatus({
      projectDir,
      variantId: prompted.variant.id,
      editedKeyframeId: editedFrame!.id,
      status: 'approved',
    });
  }

  await service.updateVariantConfig({
    projectDir,
    variantId: prompted.variant.id,
    segmentGenerationModeOverrides: {
      'segment-001': 'keyframes_only',
    },
  });

  return prompted.variant.id;
}

beforeEach(async () => {
  projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-remix-seedance-'));
  await fs.writeFile(path.join(projectDir, 'source.mp4'), 'demo-video', 'utf8');
});

afterEach(async () => {
  await fs.rm(projectDir, { recursive: true, force: true });
});

describe('SceneForge Remix Seedance prompt service', () => {
  it('generates 9-dimension prompts and audio plans for all approved segments', async () => {
    const service = new RemixService({ readDurationMs: async () => 12800 });
    const variantId = await createApprovedVariant(service);
    const workspace = await service.runSeedancePrompts({ projectDir, variantId });

    expect(workspace.seedancePrompts.length).toBe(workspace.sourceAsset.segmentCount);
    for (const prompt of workspace.seedancePrompts) {
      expect(Object.keys(prompt.structuredFields)).toHaveLength(9);
      expect(prompt.audioPlan?.globalAudioRules.length).toBeGreaterThan(0);
      expect(prompt.audioPlan?.segmentAudioPlan[0]?.segmentId).toBe(prompt.segmentId);
    }
    expect(workspace.seedancePrompts[0].generationMode).toBe('keyframes_only');
    expect(workspace.seedancePrompts[0].copyablePrompt).toContain('仅引用已通过验收的改后关键帧');
    expect(workspace.seedancePrompts[1].copyablePrompt).toContain('source_clip');

    await expect(
      fs.readFile(
        path.join(projectDir, 'sceneforge/remix/variants', variantId, 'seedance_prompts', 'audio_plan.json'),
        'utf8',
      ),
    ).resolves.toContain('globalAudioRules');
  });
});
