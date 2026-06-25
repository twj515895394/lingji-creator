import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RemixService } from '../electron/sceneforge/remix/remix-service';

let projectDir: string;

async function createPublishedSource(service: RemixService): Promise<string> {
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
    tags: ['rooftop', 'negotiation'],
    annotationNote: '保留风声留白和压迫停顿。',
  });
  await service.publishSourceAssetToLibrary({ projectDir, sourceAssetId: imported.sourceAsset.id });
  return imported.sourceAsset.id;
}

beforeEach(async () => {
  projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-remix-variant-'));
  await fs.writeFile(path.join(projectDir, 'source.mp4'), 'demo-video', 'utf8');
});

afterEach(async () => {
  await fs.rm(projectDir, { recursive: true, force: true });
});

describe('SceneForge Remix variant service', () => {
  it('creates variants only from published source assets and persists config', async () => {
    const service = new RemixService({ readDurationMs: async () => 12000 });

    const imported = await service.createSourceAssetFromImport({
      projectDir,
      sourceVideoPath: path.join(projectDir, 'source.mp4'),
    });
    await expect(
      service.createVariantFromSourceAsset({
        projectDir,
        sourceAssetId: imported.sourceAsset.id,
        name: '未入库版本',
        concept: '不应通过',
      }),
    ).rejects.toThrow('这份素材尚未保存入库，不能创建二创版本');

    const sourceAssetId = await createPublishedSource(service);
    const workspace = await service.createVariantFromSourceAsset({
      projectDir,
      sourceAssetId,
      name: '狸猫黑帮版',
      concept: '保留压迫感，换成狸猫黑帮谈判',
      referenceStrength: 'medium',
    });

    expect(workspace.variant.name).toBe('狸猫黑帮版');
    expect(workspace.variant.referenceStrength).toBe('medium');
    await expect(
      fs.readFile(
        path.join(projectDir, 'sceneforge/remix/variants', workspace.variant.id, 'variant_manifest.json'),
        'utf8',
      ),
    ).resolves.toContain('"name": "狸猫黑帮版"');
  });

  it('supports list, rename, duplicate and delete without touching the source asset body', async () => {
    const service = new RemixService({
      readDurationMs: async () => 12000,
      now: () => new Date('2026-06-23T12:00:00.000Z'),
    });
    const sourceAssetId = await createPublishedSource(service);
    const workspace = await service.createVariantFromSourceAsset({
      projectDir,
      sourceAssetId,
      name: '狸猫黑帮版',
      concept: '保留压迫感，换成狸猫黑帮谈判',
    });

    const listed = await service.listVariantsForSourceAsset({ projectDir, sourceAssetId });
    expect(listed).toHaveLength(1);

    const renamed = await service.renameVariant({
      projectDir,
      variantId: workspace.variant.id,
      name: '狸猫夜谈版',
    });
    expect(renamed[0]?.name).toBe('狸猫夜谈版');

    const duplicated = await service.duplicateVariant({
      projectDir,
      variantId: workspace.variant.id,
      name: '狸猫夜谈版 Copy',
    });
    expect(duplicated).toHaveLength(2);
    expect(duplicated.some((item) => item.name === '狸猫夜谈版 Copy')).toBe(true);

    const duplicatedVariant = duplicated.find((item) => item.name === '狸猫夜谈版 Copy');
    await expect(
      fs.access(path.join(projectDir, 'sceneforge/remix/variants', duplicatedVariant!.id, 'variant_manifest.json')),
    ).resolves.toBeUndefined();

    const duplicatedWorkspace = await service.getCreationWorkspace({
      projectDir,
      variantId: duplicatedVariant!.id,
    });
    expect(duplicatedWorkspace.keyframeEditPrompts).toHaveLength(0);

    const promptedWorkspace = await service.runKeyframeEditPrompts({
      projectDir,
      variantId: workspace.variant.id,
    });
    const uploadedPath = path.join(projectDir, 'edited-first.png');
    await fs.writeFile(uploadedPath, 'frame', 'utf8');
    const registeredWorkspace = await service.registerEditedKeyframe({
      projectDir,
      variantId: workspace.variant.id,
      segmentId: promptedWorkspace.keyframeEditPrompts[0]!.segmentId,
      frameRole: promptedWorkspace.keyframeEditPrompts[0]!.frameRole,
      sourceFramePath: promptedWorkspace.keyframeEditPrompts[0]!.sourceFramePath,
      promptPath: promptedWorkspace.keyframeEditPrompts[0]!.promptPath,
      editedFramePath: uploadedPath,
    });
    expect(registeredWorkspace.editedKeyframes).toHaveLength(1);

    const duplicatedWithEditedFrame = await service.duplicateVariant({
      projectDir,
      variantId: workspace.variant.id,
      name: '狸猫夜谈版 Prompt Copy',
    });
    const promptBoundVariant = duplicatedWithEditedFrame.find((item) => item.name === '狸猫夜谈版 Prompt Copy');
    const promptBoundWorkspace = await service.getCreationWorkspace({
      projectDir,
      variantId: promptBoundVariant!.id,
    });
    expect(promptBoundWorkspace.editedKeyframes).toHaveLength(1);
    expect(promptBoundWorkspace.editedKeyframes[0]?.variantId).toBe(promptBoundVariant!.id);
    expect(promptBoundWorkspace.editedKeyframes[0]?.editedFramePath).toContain(
      `sceneforge/remix/variants/${promptBoundVariant!.id}/edited_keyframes/`,
    );
    expect(promptBoundWorkspace.editedKeyframes[0]?.promptPath).toContain(
      `sceneforge/remix/variants/${promptBoundVariant!.id}/keyframe_prompts/`,
    );
    expect(promptBoundWorkspace.editedKeyframes[0]?.promptPath).not.toContain(workspace.variant.id);

    const remaining = await service.deleteVariant({
      projectDir,
      variantId: duplicatedVariant!.id,
    });
    expect(remaining).toHaveLength(2);
    expect(remaining.some((item) => item.id === duplicatedVariant!.id)).toBe(false);

    const sourceManifest = await fs.readFile(
      path.join(projectDir, 'sceneforge/remix/source-assets', sourceAssetId, 'source_manifest.json'),
      'utf8',
    );
    expect(sourceManifest).toContain('"variantCount": 2');
  });
});
