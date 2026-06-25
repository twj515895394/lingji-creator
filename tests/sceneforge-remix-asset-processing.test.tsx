// @vitest-environment jsdom
import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { RemixIpcContract } from '../electron/sceneforge/remix/remix-ipc-types';
import { MOCK_ASSET_PROCESSING_SNAPSHOTS } from '../src/sceneforge/remix/mock/mock-data';
import { RemixAssetProcessing } from '../src/sceneforge/remix/pages/RemixAssetProcessing';
import { getAssetProcessingStepStatuses } from '../src/sceneforge/remix/lib/remix-workspace-view-model';

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

function buildApiClient(mode: 'success' | 'failure'): RemixIpcContract {
  return {
    listSourceAssets: async () => ({ sourceAssets: [] }),
    getSourceAsset: async (input) => {
      if (input.sourceAssetId === 'source-failed-001') {
        return {
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
          variants: [],
        };
      }
      return { ...clone(MOCK_ASSET_PROCESSING_SNAPSHOTS['source-library-001']), variants: [] };
    },
    deleteSourceAsset: async (input) => ({ deletedSourceAssetId: input.sourceAssetId }),
    updateSourceAssetMetadata: async (input) => ({
      ...MOCK_ASSET_PROCESSING_SNAPSHOTS['source-library-001'],
      sourceAsset: {
        ...MOCK_ASSET_PROCESSING_SNAPSHOTS['source-library-001'].sourceAsset,
        tags: input.tags ?? [],
        annotationNote: input.annotationNote ?? null,
        lastAnnotatedAt: '2026-06-23T12:00:00.000Z',
      },
      variants: [],
    }),
    createSourceAssetFromImport: async () => { throw new Error('not implemented'); },
    runSourceSegmentation:
      mode === 'success'
        ? async () => ({
            ...clone(MOCK_ASSET_PROCESSING_SNAPSHOTS['source-library-001']),
            sourceAsset: {
              ...clone(MOCK_ASSET_PROCESSING_SNAPSHOTS['source-library-001'].sourceAsset),
              status: 'processing',
            },
            processingStageStates: {
              ...MOCK_ASSET_PROCESSING_SNAPSHOTS['source-library-001'].processingStageStates,
              remix_segmentation: 'approved',
            },
            processingJobs: [
              {
                id: 'job-success-001',
                sourceAssetId: 'source-library-001',
                stepId: 'remix_segmentation',
                status: 'succeeded',
                message: '切片任务完成',
                startedAt: '2026-06-23T12:00:00.000Z',
                finishedAt: '2026-06-23T12:01:00.000Z',
              },
            ],
          })
        : async () => {
            throw new Error('切片失败');
          },
    runSourceKeyframes: async () => MOCK_ASSET_PROCESSING_SNAPSHOTS['source-library-001'],
    runSourceUnderstanding: async () => MOCK_ASSET_PROCESSING_SNAPSHOTS['source-library-001'],
    publishSourceAssetToLibrary: async () => MOCK_ASSET_PROCESSING_SNAPSHOTS['source-library-001'],
    createVariantFromSourceAsset: async () => { throw new Error('not implemented'); },
    listVariantsForSourceAsset: async () => [],
    renameVariant: async () => { throw new Error('not implemented'); },
    duplicateVariant: async () => { throw new Error('not implemented'); },
    deleteVariant: async () => { throw new Error('not implemented'); },
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

async function renderProcessing(node: JSX.Element) {
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

describe('SceneForge Remix asset processing workspace', () => {
  it('渲染 segmentation 内容并保持资产处理语义', async () => {
    const container = await renderProcessing(
      <RemixAssetProcessing
        projectDir="/tmp/remix-project"
        apiClient={buildApiClient('success')}
        sourceAssetId="source-library-001"
        initialStepId="segmentation"
      />,
    );

    expect(container.textContent).toContain('真实镜头切片');
    expect(container.textContent).not.toContain('Seedance 2.0 视频提示词');
  });

  it('在后端动作失败时展示错误提示', async () => {
    const container = await renderProcessing(
      <RemixAssetProcessing
        projectDir="/tmp/remix-project"
        apiClient={buildApiClient('failure')}
        sourceAssetId="source-library-001"
        initialStepId="segmentation"
      />,
    );

    const button = Array.from(container.querySelectorAll('button')).find((element) =>
      element.textContent?.includes('运行切片'),
    );
    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain('切片失败');
  });

  it('保存人工标注后回显真实持久化状态', async () => {
    const container = await renderProcessing(
      <RemixAssetProcessing
        projectDir="/tmp/remix-project"
        apiClient={buildApiClient('success')}
        sourceAssetId="source-library-001"
        initialStepId="annotate"
      />,
    );

    await act(async () => {
      const removeButton = Array.from(container.querySelectorAll('button')).find((element) =>
        element.getAttribute('aria-label') === '移除标签 hero-asset',
      );
      removeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const saveButton = Array.from(container.querySelectorAll('button')).find((element) =>
      element.textContent?.includes('保存人工标注'),
    );
    await act(async () => {
      saveButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain('最近保存：2026-06-23 12:00');
  });

  it('未保存人工标注时返回会触发退出守卫', async () => {
    const container = await renderProcessing(
      <RemixAssetProcessing
        projectDir="/tmp/remix-project"
        apiClient={buildApiClient('success')}
        sourceAssetId="source-library-001"
        initialStepId="annotate"
      />,
    );

    await act(async () => {
      const removeButton = Array.from(container.querySelectorAll('button')).find((element) =>
        element.getAttribute('aria-label') === '移除标签 hero-asset',
      );
      removeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const backButton = container.querySelector('[data-testid="remix-processing-back"]');
    await act(async () => {
      backButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(document.body.textContent).toContain('当前人工标注尚未保存');
    expect(document.body.textContent).toContain('保存并返回');
    expect(document.body.textContent).toContain('不保存返回');
  });

  it('失败素材返回时提供异常队列与重跑入口', async () => {
    const container = await renderProcessing(
      <RemixAssetProcessing
        projectDir="/tmp/remix-project"
        apiClient={buildApiClient('success')}
        sourceAssetId="source-failed-001"
        initialStepId="segmentation"
      />,
    );

    const backButton = container.querySelector('[data-testid="remix-processing-back"]');
    await act(async () => {
      backButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(document.body.textContent).toContain('当前步骤执行失败');
    expect(document.body.textContent).toContain('重跑失败步骤');
    expect(document.body.textContent).toContain('返回异常队列');
  });

  it('人工标注有未保存修改时，不把步骤显示成已完成', () => {
    const snapshot = MOCK_ASSET_PROCESSING_SNAPSHOTS['source-library-001'];

    const statusesWithSavedMetadata = getAssetProcessingStepStatuses(
      {
        ...snapshot,
        processingStageStates: {
          ...snapshot.processingStageStates,
          remix_understanding: 'approved',
        },
      },
      false,
    );
    expect(statusesWithSavedMetadata.annotate).toBe('approved');

    const statusesWithUnsavedChanges = getAssetProcessingStepStatuses(
      {
        ...snapshot,
        processingStageStates: {
          ...snapshot.processingStageStates,
          remix_understanding: 'approved',
        },
      },
      true,
    );
    expect(statusesWithUnsavedChanges.annotate).toBe('needs_input');
  });
});
