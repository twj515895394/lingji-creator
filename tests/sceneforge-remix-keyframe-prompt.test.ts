import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RemixService } from '../electron/sceneforge/remix/remix-service';

let projectDir: string;

async function prepareVariant(service: RemixService) {
  const imported = await service.createSourceAssetFromImport({
    projectDir,
    sourceVideoPath: path.join(projectDir, 'source.mp4'),
  });
  await service.runSourceSegmentation({ projectDir, sourceAssetId: imported.sourceAsset.id });
  await service.runSourceKeyframes({ projectDir, sourceAssetId: imported.sourceAsset.id });
  await service.runSourceUnderstanding({ projectDir, sourceAssetId: imported.sourceAsset.id });
  await service.updateSourceAssetMetadata({
    projectDir,
    sourceAssetId: imported.sourceAsset.id,
    tags: ['rooftop', 'keyframe'],
    annotationNote: '保留关键停顿和压迫走位。',
  });
  await service.publishSourceAssetToLibrary({ projectDir, sourceAssetId: imported.sourceAsset.id });
  const workspace = await service.createVariantFromSourceAsset({
    projectDir,
    sourceAssetId: imported.sourceAsset.id,
    name: '狸猫黑帮版',
    concept: '高处谈判',
  });
  await service.runRemixStrategy({ projectDir, variantId: workspace.variant.id });
  await service.runRemixDesign({ projectDir, variantId: workspace.variant.id });
  return workspace.variant.id;
}

beforeEach(async () => {
  projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-remix-kprompt-'));
  await fs.writeFile(path.join(projectDir, 'source.mp4'), 'demo-video', 'utf8');
});

afterEach(async () => {
  await fs.rm(projectDir, { recursive: true, force: true });
});

describe('SceneForge Remix keyframe prompt service', () => {
  it('generates prompt files for source keyframes and binds them to the workspace snapshot', async () => {
    const service = new RemixService({ readDurationMs: async () => 16000 });
    const variantId = await prepareVariant(service);

    const prompts = await service.runKeyframeEditPrompts({ projectDir, variantId });

    expect(prompts.keyframeEditPrompts.length).toBeGreaterThan(0);
    expect(prompts.creationStageStates.remix_keyframe_edit_prompts).toBe('approved');
    await expect(
      fs.readFile(path.join(projectDir, prompts.keyframeEditPrompts[0].promptPath), 'utf8'),
    ).resolves.toContain('# Keyframe Prompt');
  });
});
