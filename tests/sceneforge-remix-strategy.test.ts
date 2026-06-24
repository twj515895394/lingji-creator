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
    title: '天台原片',
  });
  await service.runSourceSegmentation({ projectDir, sourceAssetId: imported.sourceAsset.id });
  await service.runSourceKeyframes({ projectDir, sourceAssetId: imported.sourceAsset.id });
  await service.runSourceUnderstanding({ projectDir, sourceAssetId: imported.sourceAsset.id });
  await service.updateSourceAssetMetadata({
    projectDir,
    sourceAssetId: imported.sourceAsset.id,
    tags: ['rooftop', 'strategy'],
    annotationNote: '保留压迫节奏与沉默留白。',
  });
  await service.publishSourceAssetToLibrary({ projectDir, sourceAssetId: imported.sourceAsset.id });
  return service.createVariantFromSourceAsset({
    projectDir,
    sourceAssetId: imported.sourceAsset.id,
    name: '狸猫黑帮版',
    concept: '高处谈判',
  });
}

beforeEach(async () => {
  projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-remix-strategy-'));
  await fs.writeFile(path.join(projectDir, 'source.mp4'), 'demo-video', 'utf8');
});

afterEach(async () => {
  await fs.rm(projectDir, { recursive: true, force: true });
});

describe('SceneForge Remix strategy service', () => {
  it('writes strategy markdown/json and advances strategy stage', async () => {
    const service = new RemixService({ readDurationMs: async () => 16000 });
    const workspace = await prepareVariant(service);

    const strategy = await service.runRemixStrategy({
      projectDir,
      variantId: workspace.variant.id,
    });

    expect(strategy.creationStageStates.remix_strategy).toBe('approved');
    await expect(
      fs.readFile(path.join(projectDir, strategy.variant.strategyMarkdownPath ?? ''), 'utf8'),
    ).resolves.toContain('# Remix Strategy');
    await expect(
      fs.readFile(path.join(projectDir, strategy.variant.strategyJsonPath ?? ''), 'utf8'),
    ).resolves.toContain('"segmentId"');
  });
});
