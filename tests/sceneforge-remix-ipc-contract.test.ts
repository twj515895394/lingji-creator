import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { RemixService } from '../electron/sceneforge/remix/remix-service';

describe('SceneForge Remix IPC contract', () => {
  it('wires main, preload, electron-api and remix ipc together', () => {
    const main = readFileSync(new URL('../electron/main.ts', import.meta.url), 'utf-8');
    const preload = readFileSync(new URL('../electron/preload.ts', import.meta.url), 'utf-8');
    const api = readFileSync(new URL('../src/lib/electron-api.ts', import.meta.url), 'utf-8');
    const ipc = readFileSync(new URL('../electron/sceneforge/remix/remix-ipc.ts', import.meta.url), 'utf-8');

    expect(main).toContain('registerSceneForgeRemixIpc');
    expect(preload).toContain('sceneForgeRemix: {');
    expect(preload).toContain('sceneForgeRemix:listSourceAssets');
    expect(preload).toContain('sceneForgeRemix:exportPromptBundle');
    expect(api).toContain('sceneForgeRemix: {');
    expect(api).toContain('createVariantFromSourceAsset');
    expect(api).toContain('updateEditedKeyframeStatus');
    expect(api).toContain('ExportPromptBundleResult');
    expect(ipc).toContain('sceneForgeRemix:listSourceAssets');
    expect(ipc).toContain('sceneForgeRemix:runRemixStrategy');
    expect(ipc).toContain('sceneForgeRemix:exportPromptBundle');
  });

  it('returns type-safe stub payloads for the full Remix ipc surface', async () => {
    const service = new RemixService();

    const assetList = await service.listSourceAssets();
    expect(assetList.sourceAssets.length).toBeGreaterThan(0);

    const sourceAsset = await service.getSourceAsset({
      projectDir: '/tmp/remix-project',
      sourceAssetId: 'source-001',
    });
    expect(sourceAsset.sourceAsset.id).toBe('source-001');

    const imported = await service.createSourceAssetFromImport({
      projectDir: '/tmp/remix-project',
      importId: 'import-001',
      title: '买瓜原片',
    });
    expect(imported.sourceAsset.title).toBe('买瓜原片');

    const segmented = await service.runSourceSegmentation({
      projectDir: '/tmp/remix-project',
      sourceAssetId: 'source-001',
    });
    expect(segmented.processingStageStates.remix_segmentation).toBe('approved');

    const keyframed = await service.runSourceKeyframes({
      projectDir: '/tmp/remix-project',
      sourceAssetId: 'source-001',
    });
    expect(keyframed.processingStageStates.remix_keyframes).toBe('approved');

    const understood = await service.runSourceUnderstanding({
      projectDir: '/tmp/remix-project',
      sourceAssetId: 'source-001',
    });
    expect(understood.processingStageStates.remix_understanding).toBe('ready_for_review');

    const published = await service.publishSourceAssetToLibrary({
      projectDir: '/tmp/remix-project',
      sourceAssetId: 'source-001',
    });
    expect(published.sourceAsset.status).toBe('published_to_library');

    const createdVariant = await service.createVariantFromSourceAsset({
      projectDir: '/tmp/remix-project',
      sourceAssetId: 'source-001',
      name: '动物拟人版',
      concept: '保留冲突结构',
    });
    expect(createdVariant.variant.name).toBe('动物拟人版');

    const workspace = await service.getCreationWorkspace({
      projectDir: '/tmp/remix-project',
      variantId: 'variant-001',
    });
    expect(workspace.variant.id).toBe('variant-001');

    const updatedVariant = await service.updateVariantConfig({
      projectDir: '/tmp/remix-project',
      variantId: 'variant-001',
      referenceStrength: 'medium',
    });
    expect(updatedVariant.variant.referenceStrength).toBe('medium');

    const strategy = await service.runRemixStrategy({
      projectDir: '/tmp/remix-project',
      variantId: 'variant-001',
    });
    expect(strategy.variant.currentStage).toBe('remix_strategy');

    const design = await service.runRemixDesign({
      projectDir: '/tmp/remix-project',
      variantId: 'variant-001',
    });
    expect(design.variant.currentStage).toBe('remix_design');

    const promptWorkspace = await service.runKeyframeEditPrompts({
      projectDir: '/tmp/remix-project',
      variantId: 'variant-001',
    });
    expect(promptWorkspace.keyframeEditPrompts.length).toBeGreaterThan(0);

    const registeredEditedKeyframe = await service.registerEditedKeyframe({
      projectDir: '/tmp/remix-project',
      variantId: 'variant-001',
      segmentId: 'segment-001',
      frameRole: 'first',
      sourceFramePath: 'source.png',
      promptPath: 'prompt.md',
      editedFramePath: 'edited.png',
    });
    expect(registeredEditedKeyframe.editedKeyframes[0].status).toBe('generated');

    const updatedEditedKeyframe = await service.updateEditedKeyframeStatus({
      projectDir: '/tmp/remix-project',
      variantId: 'variant-001',
      editedKeyframeId: 'edited-001',
      status: 'approved',
      qualityChecks: [{ code: 'continuity', label: '连续性', passed: true }],
    });
    expect(updatedEditedKeyframe.editedKeyframes[0].status).toBe('approved');

    const seedance = await service.runSeedancePrompts({
      projectDir: '/tmp/remix-project',
      variantId: 'variant-001',
    });
    expect(seedance.seedancePrompts[0].targetPlatform).toBe('seedance_2_0');

    const bundle = await service.exportPromptBundle({
      projectDir: '/tmp/remix-project',
      variantId: 'variant-001',
    });
    expect(bundle.bundlePath).toContain('prompt_bundle.md');
    expect(bundle.workspace.seedancePrompts.length).toBeGreaterThan(0);
  });
});
