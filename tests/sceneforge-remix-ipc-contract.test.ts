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
    expect(preload).toContain('sceneForgeRemix:searchPublishedSourceAssets');
    expect(preload).toContain('sceneForgeRemix:rebuildPublishedSourceAssetLibrary');
    expect(preload).toContain('sceneForgeRemix:rebuildSourceAssetVideoMetadata');
    expect(preload).toContain('sceneForgeRemix:deleteSourceAsset');
    expect(preload).toContain('sceneForgeRemix:updateSourceSegments');
    expect(preload).toContain('sceneForgeRemix:getSegmentationDiagnostics');
    expect(preload).toContain('sceneForgeRemix:validateSourceAssetMedia');
    expect(preload).toContain('sceneForgeRemix:updateSourceAssetMetadata');
    expect(preload).toContain('sceneForgeRemix:listVariantsForSourceAsset');
    expect(preload).toContain('sceneForgeRemix:exportPromptBundle');
    expect(preload).toContain('sceneForgeRemix:rerunOriginalStoryRollup');
    expect(api).toContain('sceneForgeRemix: {');
    expect(api).toContain('SearchAssetLibraryResult');
    expect(api).toContain('createVariantFromSourceAsset');
    expect(api).toContain('rebuildSourceAssetVideoMetadata');
    expect(api).toContain('getSegmentationDiagnostics');
    expect(api).toContain('validateSourceAssetMedia');
    expect(api).toContain('updateEditedKeyframeStatus');
    expect(api).toContain('ExportPromptBundleResult');
    expect(api).toContain('rerunOriginalStoryRollup');
    expect(ipc).toContain('sceneForgeRemix:listSourceAssets');
    expect(ipc).toContain('sceneForgeRemix:searchPublishedSourceAssets');
    expect(ipc).toContain('sceneForgeRemix:rebuildPublishedSourceAssetLibrary');
    expect(ipc).toContain('sceneForgeRemix:rebuildSourceAssetVideoMetadata');
    expect(ipc).toContain('sceneForgeRemix:deleteSourceAsset');
    expect(ipc).toContain('sceneForgeRemix:updateSourceSegments');
    expect(ipc).toContain('sceneForgeRemix:validateSourceAssetMedia');
    expect(ipc).toContain('sceneForgeRemix:renameVariant');
    expect(ipc).toContain('sceneForgeRemix:runRemixStrategy');
    expect(ipc).toContain('sceneForgeRemix:exportPromptBundle');
    expect(ipc).toContain('sceneForgeRemix:rerunOriginalStoryRollup');
  });

  it('returns type-safe stub payloads for the full Remix ipc surface', async () => {
    const mockTranscriptService = {
      run: async (projDir: string, assetId: string) => {
        const { readStoredSourceAsset, writeStoredSourceAsset } = await import('../electron/sceneforge/remix/remix-store');
        const doc = await readStoredSourceAsset(projDir, assetId);
        doc.sourceAsset.srtPath = 'transcripts/whisper_out.srt';
        doc.sourceAsset.transcriptPath = 'transcripts/whisper_out.json';
        await writeStoredSourceAsset(projDir, doc);

        const srtText = '1\n00:00:00,000 --> 00:00:03,000\n对白\n\n2\n00:00:03,000 --> 00:00:06,000\n对白2';
        await fs.mkdir(path.join(projDir, 'transcripts'), { recursive: true });
        await fs.writeFile(path.join(projDir, 'transcripts/whisper_out.srt'), srtText, 'utf8');
        await fs.writeFile(path.join(projDir, 'transcripts/whisper_out.json'), JSON.stringify({
          schema: 'sceneforge-remix-source-transcript',
          version: 1,
          sourceAssetId: assetId,
          generatedAt: new Date().toISOString(),
          inputHash: { audioSha256: 'mock' },
          utterances: [
            { text: '对白', startMs: 0, endMs: 3000 },
            { text: '对白2', startMs: 3000, endMs: 6000 }
          ]
        }), 'utf8');
        return doc;
      }
    };

    const service = new RemixService({
      readDurationMs: async () => 12800,
      now: () => new Date('2026-06-23T12:00:00.000Z'),
      transcriptService: mockTranscriptService as any,
      understandingServiceOptions: {
        loadAISettings: async () => ({ provider: 'openai' } as AISettings),
        generateStructuredData: async (settings, systemPrompt, userPrompt, schema, options) => {
          if (options?.label?.includes('rollup')) {
            return {
              logline: '核心梗概',
              storySummaryShort: '短故事',
              storyContent: '全片故事内容',
              eventChain: ['事件1'],
              characterMap: [{ nameOrRole: '主角', description: '好人', relation: '无' }],
              mainConflict: '冲突',
              emotionCurve: '平缓',
              visualStyle: '写实',
              dialogueStyle: '日常',
              remixPotential: ['二创建议'],
            };
          }
          return {
            visual: { mainAction: '人物抬头', colorTone: '暖色' },
            camera: { shotSize: '中近景', movement: '固定镜头' },
            audio: { speechSummary: '台词', dialogue: [], ambient: '环境', music: '无', silenceOrPause: '无' },
            story: { plotFunction: '铺垫', emotion: '紧张', conflict: '对峙' },
            remix: { rewriteIdeas: ['职场谈判'], keepElements: [], replaceableElements: [], reuseScenarios: [], riskNotes: [] },
            videoPrompt: {
              positivePrompt: '固定镜头，人物缓慢抬头。',
              negativePrompt: '避免卡通。',
              motionPrompt: '缓慢抬头',
              cameraPrompt: '平视',
              dialoguePrompt: '迟疑',
            },
            quality: { confidence: 0.9, missingInputs: [], needsHumanReview: true, warnings: [] },
          };
        },
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
    const emptySearch = await service.searchPublishedSourceAssets({ projectDir, query: '买瓜' });
    expect(emptySearch.sourceAssets).toEqual([]);

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

    const rollupRerun = await service.rerunOriginalStoryRollup({
      projectDir,
      sourceAssetId: liveSourceAssetId,
    });
    expect(rollupRerun.processingStageStates.remix_understanding).toBe('ready_for_review');

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
      failedSegmentCount: 0,
      originalUnderstandingPath: 'sceneforge/remix/source-assets/' + liveSourceAssetId + '/analysis/original_understanding.json',
      overall: { summary: '全片摘要', storyArc: '剧情线', highValueSegmentIds: stored.sourceAsset.segments.map((s) => s.id) },
      quality: { segmentCount: stored.sourceAsset.segments.length, understoodSegmentCount: stored.sourceAsset.segments.length, failedSegmentCount: 0, needsHumanReview: true },
      segmentRefs: stored.sourceAsset.segments.map((segment) => ({
        segmentId: segment.id,
        understandingPath: `segments/${segment.id}/understanding.json`,
      })),
      inputHash,
    }, null, 2)}\n`);
    await fs.writeFile(path.join(projectDir, 'sceneforge/remix/source-assets/' + liveSourceAssetId + '/analysis/original_understanding.json'), '{}\n');
    await fs.writeFile(path.join(projectDir, segmentPath), `${JSON.stringify(stored.sourceAsset.segments.map((segment) => ({
      segmentId: segment.id,
      visual: { mainAction: '人物抬头' },
      camera: { shotSize: '中近景' },
      audio: { speechSummary: '台词' },
      story: { plotFunction: '铺垫' },
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
    const publishedSearch = await service.searchPublishedSourceAssets({ projectDir, query: '买瓜' });
    expect(publishedSearch.sourceAssets[0]?.id).toBe(liveSourceAssetId);
    const rebuild = await service.rebuildPublishedSourceAssetLibrary({ projectDir });
    expect(rebuild.rebuiltAssetIds).toContain(liveSourceAssetId);
    const rebuiltMetadata = await service.rebuildSourceAssetVideoMetadata({ projectDir });
    expect(rebuiltMetadata.rebuiltAssetIds).toContain(liveSourceAssetId);

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
