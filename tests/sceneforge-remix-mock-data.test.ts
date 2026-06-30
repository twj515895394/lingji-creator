import { describe, expect, it, vi } from 'vitest';

import { createMockRemixApi } from '../src/sceneforge/remix/mock/mock-api';
import {
  buildAssetMarkingSummary,
  getAssetProcessingStepStatuses,
} from '../src/sceneforge/remix/lib/remix-workspace-view-model';
import {
  MOCK_ASSET_LIBRARY_SNAPSHOT,
  MOCK_ASSET_PROCESSING_SNAPSHOTS,
  MOCK_CREATION_WORKSPACE_SNAPSHOT,
  MOCK_SOURCE_ASSETS,
} from '../src/sceneforge/remix/mock/mock-data';
import {
  createRemixApiClient,
  resolveRemixApiClientMode,
} from '../src/sceneforge/remix/services/remix-api-client';

describe('sceneforge remix mock data', () => {
  it('覆盖三种 SourceAsset 状态并满足三大页面展示所需数据', () => {
    expect(MOCK_SOURCE_ASSETS).toHaveLength(3);
    expect(MOCK_SOURCE_ASSETS.map((asset) => asset.status)).toEqual([
      'processing',
      'published_to_library',
      'failed',
    ]);
    expect(MOCK_ASSET_LIBRARY_SNAPSHOT.sourceAssets).toHaveLength(3);
    expect(MOCK_ASSET_PROCESSING_SNAPSHOTS['source-processing-001'].sourceAsset.segments.length).toBeGreaterThan(0);
    expect(MOCK_CREATION_WORKSPACE_SNAPSHOT.variant.id).toBe('variant-hero-001');
    expect(MOCK_CREATION_WORKSPACE_SNAPSHOT.keyframeEditPrompts.length).toBeGreaterThan(0);
    expect(MOCK_CREATION_WORKSPACE_SNAPSHOT.editedKeyframes.length).toBeGreaterThan(0);
    expect(MOCK_CREATION_WORKSPACE_SNAPSHOT.seedancePrompts.length).toBeGreaterThan(0);
  });

  it('mock 资产标记支持仅标签满足完成态且备注可为空', async () => {
    const api = createMockRemixApi();
    const updated = await api.updateSourceAssetMetadata({
      projectDir: '/mock/projects/sceneforge-remix',
      sourceAssetId: 'source-library-001',
      tags: ['demo-tag'],
      annotationNote: null,
    });
    expect(updated.sourceAsset.tags).toEqual(['demo-tag']);
    expect(updated.sourceAsset.annotationNote).toBeNull();
    expect(updated.sourceAsset.lastAnnotatedAt).toBeTruthy();

    const snapshot = {
      ...MOCK_ASSET_PROCESSING_SNAPSHOTS['source-library-001'],
      sourceAsset: updated.sourceAsset,
      processingStageStates: {
        ...MOCK_ASSET_PROCESSING_SNAPSHOTS['source-library-001'].processingStageStates,
        remix_understanding: 'approved' as const,
      },
    };
    const statuses = getAssetProcessingStepStatuses(snapshot, false);
    expect(statuses.annotate).toBe('approved');

    const summary = buildAssetMarkingSummary(['demo-tag'], '');
    expect(summary.tagCount).toBe(1);
    expect(summary.hasNote).toBe(false);
  });

  it('mock publish 在无标签时拒绝入库', async () => {
    const api = createMockRemixApi();
    await api.updateSourceAssetMetadata({
      projectDir: '/mock/projects/sceneforge-remix',
      sourceAssetId: 'source-processing-001',
      tags: [],
      annotationNote: null,
    });
    await expect(
      api.publishSourceAssetToLibrary({
        projectDir: '/mock/projects/sceneforge-remix',
        sourceAssetId: 'source-processing-001',
      }),
    ).rejects.toThrow('请先保存至少一个资产标签');
  });

  it('mock API 签名与契约一致，并能返回预期快照', async () => {
    const api = createMockRemixApi();

    const library = await api.listSourceAssets({
      projectDir: '/mock/projects/sceneforge-remix',
    });
    expect(library.sourceAssets).toHaveLength(3);

    const processing = await api.getSourceAsset({
      projectDir: '/mock/projects/sceneforge-remix',
      sourceAssetId: 'source-library-001',
    });
    expect(processing.sourceAsset.id).toBe('source-library-001');
    expect(processing.processingStageStates.remix_understanding).toBe('approved');

    const workspace = await api.createVariantFromSourceAsset({
      projectDir: '/mock/projects/sceneforge-remix',
      sourceAssetId: 'source-library-001',
      name: '测试变体',
      concept: '测试概念',
    });
    expect(workspace.variant.name).toBe('测试变体');
    expect(workspace.variant.concept).toBe('测试概念');
    expect(workspace.seedancePrompts[0]?.targetPlatform).toBe('seedance_2_0');
  });

  it('API client 支持 mock/electron 两种模式切换', () => {
    const electronApi = {
      listSourceAssets: vi.fn(),
      getSourceAsset: vi.fn(),
      createSourceAssetFromImport: vi.fn(),
      runSourceSegmentation: vi.fn(),
      runSourceKeyframes: vi.fn(),
      runSourceUnderstanding: vi.fn(),
      updateSourceSegments: vi.fn(),
      getSegmentationDiagnostics: vi.fn(),
      validateSourceAssetMedia: vi.fn(),
      publishSourceAssetToLibrary: vi.fn(),
      createVariantFromSourceAsset: vi.fn(),
      getCreationWorkspace: vi.fn(),
      updateVariantConfig: vi.fn(),
      runRemixStrategy: vi.fn(),
      runRemixDesign: vi.fn(),
      runKeyframeEditPrompts: vi.fn(),
      registerEditedKeyframe: vi.fn(),
      updateEditedKeyframeStatus: vi.fn(),
      runSeedancePrompts: vi.fn(),
      exportPromptBundle: vi.fn(),
    };

    expect(resolveRemixApiClientMode({})).toBe('electron');
    expect(resolveRemixApiClientMode({ electronAPI: { sceneForgeRemix: electronApi } })).toBe('electron');
    expect(createRemixApiClient({ mode: 'mock' })).not.toBe(electronApi);
    expect(createRemixApiClient({ mode: 'electron', electronApi })).toBe(electronApi);
  });
});
