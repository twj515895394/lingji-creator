import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { AISettings } from '../src/types/ai';
import { RemixService } from '../electron/sceneforge/remix/remix-service';

let projectDir: string;

beforeEach(async () => {
  projectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sceneforge-remix-ipc-'));
  await fs.writeFile(path.join(projectDir, 'demo.mp4'), 'demo-video', 'utf8');
});

afterEach(async () => {
  await fs.rm(projectDir, { recursive: true, force: true });
});

describe('SceneForge Remix IPC contract', () => {
  it('wires main, preload, electron-api and remix ipc together', () => {
    const main = readFileSync(new URL('../electron/main.ts', import.meta.url), 'utf-8');
    const preload = readFileSync(new URL('../electron/preload.ts', import.meta.url), 'utf-8');
    const api = readFileSync(new URL('../src/lib/electron-api.ts', import.meta.url), 'utf-8');
    const ipc = readFileSync(new URL('../electron/sceneforge/remix/remix-ipc.ts', import.meta.url), 'utf-8');

    expect(main).toContain('registerSceneForgeRemixIpc');
    expect(preload).toContain('sceneForgeRemix: {');
    expect(preload).toContain('sceneForgeRemix:listSourceAssets');
    expect(preload).toContain('sceneForgeRemix:deleteSourceAsset');
    expect(preload).toContain('sceneForgeRemix:updateSourceSegments');
    expect(preload).toContain('sceneForgeRemix:getSegmentationDiagnostics');
    expect(preload).toContain('sceneForgeRemix:validateSourceAssetMedia');
    expect(preload).toContain('sceneForgeRemix:updateSourceAssetMetadata');
    expect(preload).toContain('sceneForgeRemix:listVariantsForSourceAsset');
    expect(preload).toContain('sceneForgeRemix:exportPromptBundle');
    expect(api).toContain('sceneForgeRemix: {');
    expect(api).toContain('createVariantFromSourceAsset');
    expect(api).toContain('getSegmentationDiagnostics');
    expect(api).toContain('validateSourceAssetMedia');
    expect(api).toContain('updateEditedKeyframeStatus');
    expect(api).toContain('ExportPromptBundleResult');
    expect(ipc).toContain('sceneForgeRemix:listSourceAssets');
    expect(ipc).toContain('sceneForgeRemix:deleteSourceAsset');
    expect(ipc).toContain('sceneForgeRemix:updateSourceSegments');
    expect(ipc).toContain('sceneForgeRemix:validateSourceAssetMedia');
    expect(ipc).toContain('sceneForgeRemix:renameVariant');
    expect(ipc).toContain('sceneForgeRemix:runRemixStrategy');
    expect(ipc).toContain('sceneForgeRemix:exportPromptBundle');
  });

  it('returns type-safe stub payloads for the full Remix ipc surface', async () => {
    const service = new RemixService({
      readDurationMs: async () => 12800,
      now: () => new Date('2026-06-23T12:00:00.000Z'),
      understandingServiceOptions: {
        loadAISettings: async () => ({ provider: 'openai' } as AISettings),
        generateSegmentUnderstanding: async (_settings, context) => ({
          visual: { mainAction: '人物抬头' },
          camera: { shotSize: '中近景', movement: '固定镜头' },
          story: { plotFunction: '铺垫' },
          videoPrompt: {
            positivePrompt: `固定镜头，${context.segment.id} 缓慢抬头。`,
            negativePrompt: '避免卡通。',
            motionPrompt: '缓慢抬头。',
            cameraPrompt: '平视固定镜头。',
            dialoguePrompt: '语气迟疑。',
          },
        }),
      },
    });

    const imported = await service.createSourceAssetFromImport({
      projectDir,
      sourceVideoPath: path.join(projectDir, 'demo.mp4'),
      title: '买瓜原片',
    });
    const sourceAssetId = imported.sourceAsset.id;

    const assetList = await service.listSourceAssets({ projectDir });
    expect(assetList.sourceAssets[0]?.title).toBe('买瓜原片');

    const sourceAsset = await service.getSourceAsset({
      projectDir,
      sourceAssetId,
    });
    expect(imported.sourceAsset.title).toBe('买瓜原片');
    expect(sourceAsset.sourceAsset.id).toBe(sourceAssetId);
    expect(sourceAsset.variants).toEqual([]);

    const deleted = await service.deleteSourceAsset({
      projectDir,
      sourceAssetId,
    });
    expect(deleted.deletedSourceAssetId).toBe(sourceAssetId);

    const importedAgain = await service.createSourceAssetFromImport({
      projectDir,
      sourceVideoPath: path.join(projectDir, 'demo.mp4'),
      title: '买瓜原片',
    });
    const liveSourceAssetId = importedAgain.sourceAsset.id;

    const segmented = await service.runSourceSegmentation({
      projectDir,
      sourceAssetId: liveSourceAssetId,
      mode: 'accurate',
    });
    expect(segmented.processingStageStates.remix_segmentation).toBe('approved');
    expect(segmented.processingJobs?.[0]?.stepId).toBe('remix_segmentation');
    expect(segmented.processingJobs?.[0]?.status).toBe('succeeded');
    expect(segmented.sourceAsset.segmentationDiagnostics?.mode).toBe('accurate');

    const diagnostics = await service.getSegmentationDiagnostics({
      projectDir,
      sourceAssetId: liveSourceAssetId,
    });
    expect(diagnostics?.mode).toBe('accurate');

    const mediaValidation = await service.validateSourceAssetMedia({
      projectDir,
      sourceAssetId: liveSourceAssetId,
    });
    expect(mediaValidation.sourceVideo.readable).toBe(true);

    const keyframed = await service.runSourceKeyframes({
      projectDir,
      sourceAssetId: liveSourceAssetId,
    });
    expect(keyframed.processingStageStates.remix_keyframes).toBe('approved');
    expect(keyframed.processingJobs?.[0]?.stepId).toBe('remix_keyframes');

    const understood = await service.runSourceUnderstanding({
      projectDir,
      sourceAssetId: liveSourceAssetId,
    });
    expect(understood.processingStageStates.remix_understanding).toBe('ready_for_review');
    expect(understood.processingJobs?.[0]?.stepId).toBe('remix_understanding');

    const overviewPath = understood.sourceAsset.sourceOverviewJsonPath ?? '';
    const segmentPath = understood.sourceAsset.segmentAnalysisJsonPath ?? '';
    const { REMIX_UNDERSTANDING_ROLLUP_KIND } = await import('../electron/sceneforge/remix/remix-understanding-gate');
    const { buildRemixUnderstandingInputFingerprint } = await import('../electron/sceneforge/remix/remix-understanding-gate');
    const stored = await service.getSourceAsset({ projectDir, sourceAssetId: liveSourceAssetId });
    const inputHash = buildRemixUnderstandingInputFingerprint({
      schema: 'sceneforge-remix-source-asset',
      version: 1,
      sourceAsset: stored.sourceAsset,
      processingStageStates: stored.processingStageStates,
    });
    await fs.writeFile(path.join(projectDir, overviewPath), `${JSON.stringify({
      artifactKind: REMIX_UNDERSTANDING_ROLLUP_KIND,
      sourceAssetId: liveSourceAssetId,
      segmentCount: stored.sourceAsset.segments.length,
      understoodSegmentCount: stored.sourceAsset.segments.length,
      segmentRefs: stored.sourceAsset.segments.map((segment) => ({
        segmentId: segment.id,
        understandingPath: `segments/${segment.id}/understanding.json`,
      })),
      inputHash,
    }, null, 2)}\n`);
    await fs.writeFile(path.join(projectDir, segmentPath), `${JSON.stringify(stored.sourceAsset.segments.map((segment) => ({
      segmentId: segment.id,
      visual: { mainAction: '人物抬头' },
      camera: { shotSize: '中近景' },
      videoPrompt: '固定镜头，人物缓慢抬头。',
    })), null, 2)}\n`);
    stored.processingStageStates.remix_understanding = 'approved';
    await fs.writeFile(path.join(projectDir, stored.sourceAsset.sourceManifestPath), `${JSON.stringify(stored, null, 2)}\n`);

    const annotated = await service.updateSourceAssetMetadata({
      projectDir,
      sourceAssetId: liveSourceAssetId,
      tags: ['slow-burn', 'market'],
      annotationNote: '保留试探停顿和压迫感。',
    });
    expect(annotated.sourceAsset.annotationNote).toContain('压迫感');

    const published = await service.publishSourceAssetToLibrary({
      projectDir,
      sourceAssetId: liveSourceAssetId,
    });
    expect(published.sourceAsset.status).toBe('published_to_library');

    const createdVariant = await service.createVariantFromSourceAsset({
      projectDir,
      sourceAssetId: liveSourceAssetId,
      name: '动物拟人版',
      concept: '保留冲突结构',
    });
    expect(createdVariant.variant.name).toBe('动物拟人版');

    const listedVariants = await service.listVariantsForSourceAsset({ projectDir, sourceAssetId: liveSourceAssetId });
    expect(listedVariants).toHaveLength(1);

    const renamedVariants = await service.renameVariant({
      projectDir,
      variantId: createdVariant.variant.id,
      name: '动物谈判版',
    });
    expect(renamedVariants[0]?.name).toBe('动物谈判版');

    const workspace = await service.getCreationWorkspace({
      projectDir,
      variantId: createdVariant.variant.id,
    });
    expect(workspace.variant.id).toBe(createdVariant.variant.id);

    const updatedVariant = await service.updateVariantConfig({
      projectDir,
      variantId: createdVariant.variant.id,
      referenceStrength: 'medium',
    });
    expect(updatedVariant.variant.referenceStrength).toBe('medium');

    const strategy = await service.runRemixStrategy({
      projectDir,
      variantId: createdVariant.variant.id,
    });
    expect(strategy.variant.currentStage).toBe('remix_strategy');

    const design = await service.runRemixDesign({
      projectDir,
      variantId: createdVariant.variant.id,
    });
    expect(design.variant.currentStage).toBe('remix_design');

    const promptWorkspace = await service.runKeyframeEditPrompts({
      projectDir,
      variantId: createdVariant.variant.id,
    });
    expect(promptWorkspace.keyframeEditPrompts.length).toBeGreaterThan(0);

    const prompt = promptWorkspace.keyframeEditPrompts[0];
    const editedUploadPath = path.join(projectDir, 'edited.png');
    await fs.writeFile(editedUploadPath, 'edited-image', 'utf8');

    const registeredEditedKeyframe = await service.registerEditedKeyframe({
      projectDir,
      variantId: createdVariant.variant.id,
      segmentId: prompt.segmentId,
      frameRole: prompt.frameRole,
      sourceFramePath: 'source.png',
      promptPath: 'prompt.md',
      editedFramePath: editedUploadPath,
    });
    expect(registeredEditedKeyframe.editedKeyframes[0].status).toBe('generated');

    const updatedEditedKeyframe = await service.updateEditedKeyframeStatus({
      projectDir,
      variantId: createdVariant.variant.id,
      editedKeyframeId: registeredEditedKeyframe.editedKeyframes[0].id,
      status: 'approved',
      qualityChecks: [{ code: 'continuity', label: '连续性', passed: true }],
    });
    expect(updatedEditedKeyframe.editedKeyframes[0].status).toBe('approved');

    await expect(
      service.runSeedancePrompts({
        projectDir,
        variantId: createdVariant.variant.id,
      }),
    ).rejects.toThrow('仍有关键帧未通过验收');

    for (const extraPrompt of promptWorkspace.keyframeEditPrompts.slice(1)) {
      const nextUploadPath = path.join(projectDir, `${extraPrompt.segmentId}-${extraPrompt.frameRole}.png`);
      await fs.writeFile(nextUploadPath, 'edited-image', 'utf8');
      const nextRegistered = await service.registerEditedKeyframe({
        projectDir,
        variantId: createdVariant.variant.id,
        segmentId: extraPrompt.segmentId,
        frameRole: extraPrompt.frameRole,
        sourceFramePath: 'source.png',
        promptPath: 'prompt.md',
        editedFramePath: nextUploadPath,
      });
      const matchedFrame = nextRegistered.editedKeyframes.find(
        (frame) => frame.segmentId === extraPrompt.segmentId && frame.frameRole === extraPrompt.frameRole,
      );
      await service.updateEditedKeyframeStatus({
        projectDir,
        variantId: createdVariant.variant.id,
        editedKeyframeId: matchedFrame!.id,
        status: 'approved',
      });
    }

    const bundle = await service.exportPromptBundle({
      projectDir,
      variantId: createdVariant.variant.id,
      outputPath: path.join(projectDir, 'bundle-dir'),
    });
    expect(bundle.bundlePath).toContain('bundle-dir');
    expect(bundle.workspace.seedancePrompts.length).toBeGreaterThan(0);
  });
});
