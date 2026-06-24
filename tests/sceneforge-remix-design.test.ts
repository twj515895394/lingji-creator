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
    tags: ['rooftop', 'design'],
    annotationNote: '保留风声、镜头推进和反打关系。',
  });
  await service.publishSourceAssetToLibrary({ projectDir, sourceAssetId: imported.sourceAsset.id });
  const workspace = await service.createVariantFromSourceAsset({
    projectDir,
    sourceAssetId: imported.sourceAsset.id,
    name: '狸猫黑帮版',
    concept: '高处谈判',
  });
  await service.runRemixStrategy({ projectDir, variantId: workspace.variant.id });
  return workspace.variant.id;
}

beforeEach(async () => {
  projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-remix-design-'));
  await fs.writeFile(path.join(projectDir, 'source.mp4'), 'demo-video', 'utf8');
});

afterEach(async () => {
  await fs.rm(projectDir, { recursive: true, force: true });
});

describe('SceneForge Remix design service', () => {
  it('writes global design and segment override artifacts', async () => {
    const service = new RemixService({ readDurationMs: async () => 16000 });
    const variantId = await prepareVariant(service);

    const design = await service.runRemixDesign({ projectDir, variantId });

    expect(design.creationStageStates.remix_design).toBe('approved');
    await expect(
      fs.readFile(path.join(projectDir, design.variant.designMarkdownPath ?? ''), 'utf8'),
    ).resolves.toContain('# Remix Design');
    await expect(
      fs.readFile(path.join(projectDir, design.variant.designJsonPath ?? ''), 'utf8'),
    ).resolves.toContain('"global-cast"');
  });
});
