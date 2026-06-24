import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RemixService } from '../electron/sceneforge/remix/remix-service';

let projectDir: string;

async function createExportableVariant(service: RemixService) {
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
    tags: ['rooftop', 'bundle'],
    annotationNote: '保留风声、停顿和反打沉默。',
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

  return prompted.variant.id;
}

beforeEach(async () => {
  projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-remix-export-'));
  await fs.writeFile(path.join(projectDir, 'source.mp4'), 'demo-video', 'utf8');
});

afterEach(async () => {
  await fs.rm(projectDir, { recursive: true, force: true });
});

describe('SceneForge Remix prompt bundle export', () => {
  it('exports a self-contained bundle directory with prompts, audio plan and edited keyframes', async () => {
    const service = new RemixService({ readDurationMs: async () => 12800 });
    const variantId = await createExportableVariant(service);
    const outputPath = path.join(projectDir, 'exports', 'bundle-dir');

    const result = await service.exportPromptBundle({
      projectDir,
      variantId,
      outputPath,
    });

    expect(result.bundlePath).toBe(outputPath);
    await expect(fs.readFile(path.join(outputPath, 'bundle_manifest.json'), 'utf8')).resolves.toContain(variantId);
    await expect(fs.readFile(path.join(outputPath, 'audio_plan.json'), 'utf8')).resolves.toContain('segmentAudioPlan');
    await expect(fs.readFile(path.join(outputPath, 'bundle_summary.md'), 'utf8')).resolves.toContain('狸猫黑帮版');

    const promptFiles = await fs.readdir(path.join(outputPath, 'seedance_prompts'));
    const editedKeyframes = await fs.readdir(path.join(outputPath, 'edited_keyframes'));
    const sourceClips = await fs.readdir(path.join(outputPath, 'source_clips'));
    expect(promptFiles.some((item) => item.endsWith('.md'))).toBe(true);
    expect(promptFiles.some((item) => item.endsWith('.json'))).toBe(true);
    expect(editedKeyframes.length).toBeGreaterThan(0);
    expect(sourceClips.length).toBeGreaterThan(0);
  });

  it('supports exporting to a named subdirectory path without forcing a zip suffix', async () => {
    const service = new RemixService({ readDurationMs: async () => 12800 });
    const variantId = await createExportableVariant(service);
    const outputPath = path.join(projectDir, 'exports', '狸猫黑帮版-bundle');

    const result = await service.exportPromptBundle({
      projectDir,
      variantId,
      outputPath,
    });

    expect(result.bundlePath).toBe(outputPath);
    await expect(fs.stat(result.bundlePath)).resolves.toMatchObject({ isDirectory: expect.any(Function) });
    await expect(fs.readFile(path.join(outputPath, 'bundle_summary.md'), 'utf8')).resolves.toContain('狸猫黑帮版');
  });

  it('exports a real zip archive without relying on system zip', async () => {
    const service = new RemixService({ readDurationMs: async () => 12800 });
    const variantId = await createExportableVariant(service);
    const outputPath = path.join(projectDir, 'exports', 'bundle.zip');

    const result = await service.exportPromptBundle({
      projectDir,
      variantId,
      outputPath,
    });

    const archive = await fs.readFile(result.bundlePath);
    expect(archive.subarray(0, 2).toString('utf8')).toBe('PK');
    expect(archive.length).toBeGreaterThan(100);
  });
});
