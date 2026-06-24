import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RemixService } from '../electron/sceneforge/remix/remix-service';

let projectDir: string;

async function createReadyVariant(service: RemixService) {
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
    tags: ['rooftop', 'edited-keyframe'],
    annotationNote: '保留风声留白和压迫镜头。',
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
  return service.runKeyframeEditPrompts({ projectDir, variantId: created.variant.id });
}

beforeEach(async () => {
  projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-remix-edited-'));
  await fs.writeFile(path.join(projectDir, 'source.mp4'), 'demo-video', 'utf8');
});

afterEach(async () => {
  await fs.rm(projectDir, { recursive: true, force: true });
});

describe('SceneForge Remix edited keyframe flow', () => {
  it('copies uploaded frame into variant storage and enforces review transitions', async () => {
    const service = new RemixService({ readDurationMs: async () => 12800 });
    const workspace = await createReadyVariant(service);
    const prompt = workspace.keyframeEditPrompts[0];
    const uploadedPath = path.join(projectDir, 'edited-frame.png');
    await fs.writeFile(uploadedPath, 'fake-image', 'utf8');

    const registered = await service.registerEditedKeyframe({
      projectDir,
      variantId: workspace.variant.id,
      segmentId: prompt.segmentId,
      frameRole: prompt.frameRole,
      sourceFramePath: 'ignored-by-service',
      promptPath: 'ignored-by-service',
      editedFramePath: uploadedPath,
    });

    expect(registered.editedKeyframes).toHaveLength(1);
    expect(registered.editedKeyframes[0].status).toBe('generated');
    expect(registered.editedKeyframes[0].promptPath).toBe(prompt.promptPath);
    await expect(
      fs.readFile(path.join(projectDir, registered.editedKeyframes[0].editedFramePath), 'utf8'),
    ).resolves.toBe('fake-image');

    const revised = await service.updateEditedKeyframeStatus({
      projectDir,
      variantId: workspace.variant.id,
      editedKeyframeId: registered.editedKeyframes[0].id,
      status: 'needs_revision',
    });
    expect(revised.editedKeyframes[0].status).toBe('needs_revision');

    const reuploaded = await service.registerEditedKeyframe({
      projectDir,
      variantId: workspace.variant.id,
      segmentId: prompt.segmentId,
      frameRole: prompt.frameRole,
      sourceFramePath: 'ignored-by-service',
      promptPath: 'ignored-by-service',
      editedFramePath: uploadedPath,
    });
    expect(reuploaded.editedKeyframes[0].status).toBe('generated');

    await expect(
      service.updateEditedKeyframeStatus({
        projectDir,
        variantId: workspace.variant.id,
        editedKeyframeId: reuploaded.editedKeyframes[0].id,
        status: 'pending',
      }),
    ).rejects.toThrow('不允许的关键帧状态流转');

    await expect(
      service.runSeedancePrompts({
        projectDir,
        variantId: workspace.variant.id,
      }),
    ).rejects.toThrow('仍有关键帧未通过验收');
  });
});
