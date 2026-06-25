// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import type { RemixIpcContract } from '../electron/sceneforge/remix/remix-ipc-types';
import { ProcessingAssetTaskCard } from '../src/sceneforge/remix/components/ProcessingAssetTaskCard';
import { SourceAssetThumbnail } from '../src/sceneforge/remix/components/SourceAssetThumbnail';
import { SourceOverviewPanel } from '../src/sceneforge/remix/components/SourceOverviewPanel';
import { filterAssetLibraryAssets, getAssetLibraryAvailableTags } from '../src/sceneforge/remix/lib/asset-library-state';
import { MOCK_ASSET_PROCESSING_SNAPSHOTS, MOCK_SOURCE_ASSETS } from '../src/sceneforge/remix/mock/mock-data';
import { RemixAssetLibrary } from '../src/sceneforge/remix/pages/RemixAssetLibrary';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
(window as typeof window & { matchMedia?: (query: string) => MediaQueryList }).matchMedia =
  window.matchMedia ??
  (() =>
    ({
      matches: false,
      media: '',
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList);

const containerRecords: Array<{ container: HTMLDivElement; root: Root }> = [];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

afterEach(() => {
  for (const record of containerRecords.splice(0)) {
    act(() => record.root.unmount());
    record.container.remove();
  }
});

function buildApiClient(): RemixIpcContract {
  let snapshots = {
    'source-processing-001': clone(MOCK_ASSET_PROCESSING_SNAPSHOTS['source-processing-001']),
    'source-library-001': clone(MOCK_ASSET_PROCESSING_SNAPSHOTS['source-library-001']),
    'source-failed-001': {
      ...clone(MOCK_ASSET_PROCESSING_SNAPSHOTS['source-failed-001']),
      processingJobs: [
        {
          id: 'job-failed-001',
          sourceAssetId: 'source-failed-001',
          stepId: 'remix_segmentation',
          status: 'failed',
          message: '切片任务失败',
          error: '关键帧索引损坏，请重新切片。',
          startedAt: '2026-06-23T09:00:00.000Z',
          finishedAt: '2026-06-23T09:15:00.000Z',
        },
      ],
    },
  };
  let variants = [
    {
      id: 'variant-hero-001',
      sourceAssetId: 'source-library-001',
      name: '狸猫黑帮版',
      currentStage: 'edited_keyframes_review',
      updatedAt: '2026-06-23T11:30:00.000Z',
    },
  ];
  return {
    listSourceAssets: async (input) => {
      const statuses = Array.isArray(input.statuses) ? input.statuses : input.statuses ? [input.statuses] : [];
      const sourceAssets = Object.values(snapshots)
        .map((snapshot) => snapshot.sourceAsset)
        .filter((asset) => (statuses.length ? statuses.includes(asset.status) : true))
        .map((asset) => ({
          id: asset.id,
          title: asset.title,
          status: asset.status,
          durationMs: asset.videoMetadata.durationMs,
          segmentCount: asset.segments.length,
          keyframeCount: asset.segments.reduce((sum, segment) => sum + segment.keyframes.length, 0),
          variantCount: asset.variantCount,
          updatedAt: asset.updatedAt,
        }));
      return { sourceAssets };
    },
    getSourceAsset: async (input) => clone(snapshots[input.sourceAssetId as keyof typeof snapshots]),
    deleteSourceAsset: async (input) => {
      delete snapshots[input.sourceAssetId as keyof typeof snapshots];
      return { deletedSourceAssetId: input.sourceAssetId };
    },
    updateSourceAssetMetadata: async () => { throw new Error('not implemented'); },
    createSourceAssetFromImport: async () => { throw new Error('not implemented'); },
    runSourceSegmentation: async (input) => {
      const next = clone(snapshots[input.sourceAssetId as keyof typeof snapshots]);
      next.sourceAsset.status = 'processing';
      next.processingJobs = [
        {
          id: 'job-retry-001',
          sourceAssetId: input.sourceAssetId,
          stepId: 'remix_segmentation',
          status: 'succeeded',
          message: '切片任务完成',
          startedAt: '2026-06-23T10:00:00.000Z',
          finishedAt: '2026-06-23T10:02:00.000Z',
        },
      ];
      snapshots[input.sourceAssetId as keyof typeof snapshots] = next;
      return next;
    },
    runSourceKeyframes: async () => { throw new Error('not implemented'); },
    runSourceUnderstanding: async () => { throw new Error('not implemented'); },
    publishSourceAssetToLibrary: async () => { throw new Error('not implemented'); },
    createVariantFromSourceAsset: async (input) => {
      const sourceAsset = snapshots[input.sourceAssetId as keyof typeof snapshots]?.sourceAsset;
      if (sourceAsset?.status !== 'published_to_library') {
        throw new Error('这份素材尚未保存入库，不能创建二创版本。请先完成处理并保存入库。');
      }
      throw new Error('not implemented');
    },
    listVariantsForSourceAsset: async () => variants,
    renameVariant: async (input) => {
      variants = variants.map((item) =>
        item.id === input.variantId ? { ...item, name: input.name, updatedAt: '2026-06-24T12:00:00.000Z' } : item,
      );
      return variants;
    },
    duplicateVariant: async (input) => {
      const source = variants.find((item) => item.id === input.variantId);
      if (!source) {
        return variants;
      }
      variants = [
        ...variants,
        {
          id: 'variant-copy-002',
          sourceAssetId: source.sourceAssetId,
          name: input.name ?? `${source.name} 副本`,
          currentStage: source.currentStage,
          updatedAt: '2026-06-24T12:00:00.000Z',
        },
      ];
      return variants;
    },
    deleteVariant: async (input) => {
      variants = variants.filter((item) => item.id !== input.variantId);
      return variants;
    },
    getCreationWorkspace: async () => { throw new Error('not implemented'); },
    updateVariantConfig: async () => { throw new Error('not implemented'); },
    runRemixStrategy: async () => { throw new Error('not implemented'); },
    runRemixDesign: async () => { throw new Error('not implemented'); },
    runKeyframeEditPrompts: async () => { throw new Error('not implemented'); },
    registerEditedKeyframe: async () => { throw new Error('not implemented'); },
    updateEditedKeyframeStatus: async () => { throw new Error('not implemented'); },
    runSeedancePrompts: async () => { throw new Error('not implemented'); },
    exportPromptBundle: async () => { throw new Error('not implemented'); },
  };
}

async function renderLibrary(node: JSX.Element) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  containerRecords.push({ container, root });
  await act(async () => {
    root.render(node);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  return container;
}

describe('SceneForge Remix asset library', () => {
  it('按状态与标签筛选资产', () => {
    expect(filterAssetLibraryAssets(MOCK_SOURCE_ASSETS, 'processing', null)).toHaveLength(1);
    expect(filterAssetLibraryAssets(MOCK_SOURCE_ASSETS, 'published', null)[0]?.id).toBe(
      'source-library-001',
    );
    expect(filterAssetLibraryAssets(MOCK_SOURCE_ASSETS, 'published', 'hero-asset')[0]?.id).toBe(
      'source-library-001',
    );
    expect(getAssetLibraryAvailableTags(MOCK_SOURCE_ASSETS)).toContain('hero-asset');
  });

  it('根据资产状态控制卡片按钮可见性', () => {
    const processingHtml = renderToStaticMarkup(
      <ProcessingAssetTaskCard
        snapshot={clone(MOCK_ASSET_PROCESSING_SNAPSHOTS['source-processing-001'])}
        selected={false}
        onSelect={() => undefined}
      />,
    );
    expect(String(processingHtml)).toContain('继续处理');
    expect(String(processingHtml)).toContain('删除草稿');
  });

  it('通过真实 API client 异步拉取资产详情', async () => {
    const container = await renderLibrary(
      <RemixAssetLibrary
        projectDir="/tmp/remix-project"
        apiClient={buildApiClient()}
        selectedSourceAssetId="source-library-001"
      />,
    );

    expect(container.textContent).toContain('天台谈判名场面');
    expect(container.querySelector('[data-testid="remix-asset-library-inspector"]')).not.toBeNull();
    expect(container.textContent).toContain('狸猫黑帮版');
  });

  it('在二创入口模式下优先展示已入库资产和二创动作', async () => {
    const container = await renderLibrary(
      <RemixAssetLibrary
        projectDir="/tmp/remix-project"
        apiClient={buildApiClient()}
        entryIntent="creation"
      />,
    );

    expect(container.textContent).toContain('先选已入库资产，再发起二创');
    expect(container.textContent).toContain('基于当前素材创建二创版本');
    expect(container.textContent).toContain('补充导入新原片');
  });

  it('处理中分区展示任务卡而不是正式资产 CTA', async () => {
    const container = await renderLibrary(
      <RemixAssetLibrary
        projectDir="/tmp/remix-project"
        apiClient={buildApiClient()}
        initialSection="processing"
        selectedSourceAssetId="source-processing-001"
      />,
    );

    expect(container.textContent).toContain('处理中任务');
    expect(container.textContent).toContain('继续处理');
    expect(container.textContent).toContain('删除草稿');
    expect(
      Array.from(container.querySelectorAll('button')).some((element) => element.textContent?.trim() === '创建二创'),
    ).toBe(false);
    expect(container.textContent).toContain('查看已入库资产');
  });

  it('异常分区支持直接重跑失败步骤', async () => {
    const container = await renderLibrary(
      <RemixAssetLibrary
        projectDir="/tmp/remix-project"
        apiClient={buildApiClient()}
        initialSection="failed"
        selectedSourceAssetId="source-failed-001"
      />,
    );

    expect(container.textContent).toContain('关键帧索引损坏，请重新切片。');

    const retryButton = container.querySelector('[data-testid="remix-retry-failed-task-source-failed-001"]');
    await act(async () => {
      retryButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('选择一份源素材');
    expect(container.textContent).not.toContain('关键帧索引损坏，请重新切片。');
  });

  it('在缺少关键帧时回退到真实视频缩略图', () => {
    const assetWithoutKeyframes = {
      ...MOCK_SOURCE_ASSETS[0],
      segments: MOCK_SOURCE_ASSETS[0].segments.map((segment) => ({
        ...segment,
        keyframes: [],
      })),
    };

    const html = renderToStaticMarkup(<SourceAssetThumbnail asset={assetWithoutKeyframes} />);
    expect(html).toContain('<video');
    expect(html).toContain('source-processing-001/source.mp4');
  });


  it('支持复制二创版本并刷新侧栏列表', async () => {
    const container = await renderLibrary(
      <RemixAssetLibrary
        projectDir="/tmp/remix-project"
        apiClient={buildApiClient()}
        selectedSourceAssetId="source-library-001"
      />,
    );

    expect(container.textContent).toContain('狸猫黑帮版');

    const duplicateButton = Array.from(container.querySelectorAll('button')).find((el) =>
      el.textContent?.trim() === '复制',
    );
    await act(async () => {
      duplicateButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('狸猫黑帮版 副本');
    expect(container.textContent).toContain('继续创作');
  });

  it('继续创作入口可触发 onOpenCreation', async () => {
    let opened: { variantId: string; sourceAssetId: string } | null = null;
    const container = await renderLibrary(
      <RemixAssetLibrary
        projectDir="/tmp/remix-project"
        apiClient={buildApiClient()}
        selectedSourceAssetId="source-library-001"
        onOpenCreation={(variantId, sourceAssetId) => {
          opened = { variantId, sourceAssetId };
        }}
      />,
    );

    const continueButton = Array.from(container.querySelectorAll('button')).find((el) =>
      el.textContent?.includes('继续创作'),
    );
    await act(async () => {
      continueButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(opened).toEqual({ variantId: 'variant-hero-001', sourceAssetId: 'source-library-001' });
  });

  it('把原片理解区渲染成结构化摘要与分段分析卡片', () => {
    const html = renderToStaticMarkup(<SourceOverviewPanel asset={MOCK_SOURCE_ASSETS[1]} />);
    expect(html).toContain('原片判断');
    expect(html).toContain('镜头分段');
    expect(html).toContain('01 ·');
    expect(html).toContain('边界：');
  });
});
