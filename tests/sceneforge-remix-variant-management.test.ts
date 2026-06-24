import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RemixService } from '../electron/sceneforge/remix/remix-service';

let projectDir: string;

async function publishSource(service: RemixService): Promise<string> {
  const imported = await service.createSourceAssetFromImport({
    projectDir,
    sourceVideoPath: path.join(projectDir, 'source.mp4'),
    title: '入库素材',
  });
  const id = imported.sourceAsset.id;
  await service.runSourceSegmentation({ projectDir, sourceAssetId: id });
  await service.runSourceKeyframes({ projectDir, sourceAssetId: id });
  await service.runSourceUnderstanding({ projectDir, sourceAssetId: id });
  await service.updateSourceAssetMetadata({
    projectDir,
    sourceAssetId: id,
    tags: ['tag-a'],
    annotationNote: '备注',
  });
  await service.publishSourceAssetToLibrary({ projectDir, sourceAssetId: id });
  return id;
}

beforeEach(async () => {
  projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-remix-variant-mgmt-'));
  await fs.writeFile(path.join(projectDir, 'source.mp4'), 'demo-video', 'utf8');
});

afterEach(async () => {
  await fs.rm(projectDir, { recursive: true, force: true });
});

describe('SceneForge Remix variant management (#13)', () => {
  it('lists variants per source asset and supports rename, duplicate, delete', async () => {
    const service = new RemixService({ readDurationMs: async () => 8000 });
    const sourceAssetId = await publishSource(service);
    const workspace = await service.createVariantFromSourceAsset({
      projectDir,
      sourceAssetId,
      name: '版本 A',
      concept: '概念 A',
    });

    expect(await service.listVariantsForSourceAsset({ projectDir, sourceAssetId })).toHaveLength(1);

    const afterRename = await service.renameVariant({
      projectDir,
      variantId: workspace.variant.id,
      name: '版本 A 重命名',
    });
    expect(afterRename[0]?.name).toBe('版本 A 重命名');

    const afterDuplicate = await service.duplicateVariant({
      projectDir,
      variantId: workspace.variant.id,
      name: '版本 A 副本',
    });
    expect(afterDuplicate).toHaveLength(2);

    const copy = afterDuplicate.find((item) => item.name === '版本 A 副本');
    expect(copy?.id).not.toBe(workspace.variant.id);

    const afterDelete = await service.deleteVariant({
      projectDir,
      variantId: copy!.id,
    });
    expect(afterDelete).toHaveLength(1);
    expect(afterDelete[0]?.id).toBe(workspace.variant.id);

    const sourceStill = await service.getSourceAsset({ projectDir, sourceAssetId });
    expect(sourceStill.sourceAsset.id).toBe(sourceAssetId);
    expect(sourceStill.sourceAsset.status).toBe('published_to_library');
  });
});
