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

(
  window as typeof window & {
    electronAPI?: {
      loadGlobalSettings: () => Promise<{
        aiSettings: {
          llmProviders: [];
          defaultProviderId: null;
          defaultModel: string;
          llmBaseUrl: string;
          llmApiKey: string;
          llmModel: string;
          jimengApiUrl: string;
          jimengSessionId: string;
          ttsProviders: [];
          defaultTtsProviderId: null;
          defaultTtsVoiceId: null;
          ttsVoices: [];
          imageProviders: [];
          defaultImageProviderId: null;
          defaultImageModel: null;
          videoProviders: [];
          defaultVideoProviderId: null;
          defaultVideoModel: null;
          promptBindings: {};
        };
      }>;
    };
  }
).electronAPI = {
  loadGlobalSettings: async () => ({
    aiSettings: {
      llmProviders: [],
      defaultProviderId: null,
      defaultModel: 'gpt-4o-mini',
      llmBaseUrl: 'http://localhost:1234/v1',
      llmApiKey: 'test-key',
      llmModel: 'gpt-4o-mini',
      jimengApiUrl: '',
      jimengSessionId: '',
      ttsProviders: [],
      defaultTtsProviderId: null,
      defaultTtsVoiceId: null,
      ttsVoices: [],
      imageProviders: [],
      defaultImageProviderId: null,
      defaultImageModel: null,
      videoProviders: [],
      defaultVideoProviderId: null,
      defaultVideoModel: null,
      promptBindings: {},
    },
  }),
};

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
    runSourceAudio: async () => MOCK_ASSET_PROCESSING_SNAPSHOTS['source-library-001'],
    runSourceTranscript: async () => MOCK_ASSET_PROCESSING_SNAPSHOTS['source-library-001'],
    runSourceUnderstanding: async () => MOCK_ASSET_PROCESSING_SNAPSHOTS['source-library-001'],
    rerunSegmentUnderstanding: async () => MOCK_ASSET_PROCESSING_SNAPSHOTS['source-library-001'],
    rerunSegmentTranscript: async () => MOCK_ASSET_PROCESSING_SNAPSHOTS['source-library-001'],
    confirmAllSegmentTranscripts: async () => ({
      ready: true,
      version: 2 as const,
      isPlaceholder: false,
      isStale: false,
      staleSegmentIds: [],
      staleReasons: [],
      rollupFallbackUsed: false,
      errors: [],
      overview: {
        logline: '天台心理战',
        storySummaryShort: '天台博弈',
        storyContent: '全片围绕对峙与情绪升温展开。',
        eventChain: ['天台对峙开场'],
        characterMap: [],
        mainConflict: '心理交锋',
        emotionCurve: '紧张 → 压迫',
        visualStyle: '冷调',
        dialogueStyle: '平稳',
        remixDirections: [
          { title: '身份替换', idea: '将天台对手替换为机器人', suitableStyle: '赛博' }
        ],
        warnings: [],
      },
      segments: [],
      annotationPrefill: {
        suggestedTags: [],
        suggestedNote: '',
      },
    }),
    getSourceUnderstandingWorkbench: async () => ({
      ready: true,
      version: 2 as const,
      isPlaceholder: false,
      isStale: false,
      staleSegmentIds: [],
      staleReasons: [],
      rollupFallbackUsed: false,
      errors: [],
      overview: {
        logline: '天台心理战',
        storySummaryShort: '天台博弈',
        storyContent: '全片围绕对峙与情绪升温展开。',
        eventChain: ['天台对峙开场'],
        characterMap: [],
        mainConflict: '心理交锋',
        emotionCurve: '紧张 → 压迫',
        visualStyle: '冷调',
        dialogueStyle: '平稳',
        remixDirections: [
          { title: '身份替换', idea: '将天台对手替换为机器人', suitableStyle: '赛博' }
        ],
        warnings: [],
      },
      segments: [
        {
          segmentId: 'segment-l-001',
          segmentIndex: 1,
          title: '天台风声压场',
          timeRangeLabel: '00:00 - 00:08',
          thumbnailPath: null,
          transcript: {
            asrText: '对白摘要',
            correctedText: '',
            effectiveText: '对白摘要',
            correctionStatus: 'raw' as const,
            source: 'segment_audio_sensevoice_gguf',
            engine: 'funasr_sensevoice_gguf',
            timestampLevel: 'segment_range',
            warnings: [],
          },
          visual: {
            sceneSummary: '天台',
            mainAction: '缓慢抬头',
            characters: ['对手'],
            environmentDetails: '天台风大',
            props: [],
            lighting: '自然光',
            colorTone: '冷调',
          },
          camera: {
            shotSize: '中近景',
            movement: '固定镜头',
          },
          story: {
            plotFunction: '推进情绪',
          },
          remix: {
            keepElements: ['压迫节奏'],
            replaceableElements: ['角色身份'],
            rewriteIdeas: [],
            riskNotes: [],
          },
          videoPrompt: {
            version: 2 as const,
            fullChinesePrompt: '固定镜头，缓慢抬头。',
            dimensions: [
              { key: 'subject', label: '主体', text: '缓慢抬头' }
            ],
            negativePrompt: '',
          },
          frameVision: {
            available: false,
            segmentVisualSummary: null,
            warnings: [],
          },
          quality: {
            confidence: 0.86,
            needsHumanReview: false,
            warnings: [],
          },
          isStale: true,
          staleReasons: [],
          understandingPath: 'segment-l-001-analysis.json',
          isPlaceholder: false,
        },
      ],
      annotationPrefill: {
        suggestedTags: ['压迫节奏', '角色身份'],
        suggestedNote: '【AI 预填，请按真实观感修正】\n片段 01：保留 压迫节奏；可替换 角色身份。',
      },
    }),
    updateSourceSegments: async (input) => ({
      ...clone(MOCK_ASSET_PROCESSING_SNAPSHOTS['source-library-001']),
      sourceAsset: {
        ...clone(MOCK_ASSET_PROCESSING_SNAPSHOTS['source-library-001'].sourceAsset),
        segments: clone(input.segments),
        manualSegmentationOverride: {
          updatedAt: '2026-06-25T12:00:00.000Z',
          reason: input.reason,
          preserveOnRerun: input.preserveOnRerun ?? true,
          segments: clone(input.segments),
        },
      },
      variants: [],
    }),
    getSegmentationDiagnostics: async (input) =>
      input.sourceAssetId === 'source-failed-001'
        ? clone(MOCK_ASSET_PROCESSING_SNAPSHOTS['source-failed-001'].sourceAsset.segmentationDiagnostics ?? null)
        : clone(MOCK_ASSET_PROCESSING_SNAPSHOTS['source-library-001'].sourceAsset.segmentationDiagnostics ?? null),
    validateSourceAssetMedia: async (input) =>
      input.sourceAssetId === 'source-failed-001'
        ? clone(MOCK_ASSET_PROCESSING_SNAPSHOTS['source-failed-001'].sourceAsset.mediaValidation!)
        : clone(MOCK_ASSET_PROCESSING_SNAPSHOTS['source-library-001'].sourceAsset.mediaValidation!),
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

function buildApiClientWithUnderstandingRecorder(record: {
  preferredAsrEngine?: string | null;
  transcriptPreferredAsrEngine?: string | null;
  transcriptSegmentId?: string | null;
}): RemixIpcContract {
  const base = buildApiClient('success');
  return {
    ...base,
    runSourceUnderstanding: async (input) => {
      record.preferredAsrEngine = input.preferredAsrEngine ?? null;
      return MOCK_ASSET_PROCESSING_SNAPSHOTS['source-library-001'];
    },
    runSourceTranscript: async (input) => {
      record.transcriptPreferredAsrEngine = input.preferredAsrEngine ?? null;
      return MOCK_ASSET_PROCESSING_SNAPSHOTS['source-library-001'];
    },
    rerunSegmentTranscript: async (input) => {
      record.transcriptPreferredAsrEngine = input.preferredAsrEngine ?? null;
      record.transcriptSegmentId = input.segmentId;
      return MOCK_ASSET_PROCESSING_SNAPSHOTS['source-library-001'];
    },
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
    expect(container.textContent).toContain('快速模式');
    expect(container.textContent).toContain('快速模式 · 0 个低置信度镜头段');
    expect(container.textContent).toContain('source.mp4');
    expect(container.textContent).toContain('技术信息');
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


  it('原片理解页展示真实片段卡片与复制入口', async () => {
    const container = await renderProcessing(
      <RemixAssetProcessing
        projectDir="/tmp/remix-project"
        apiClient={buildApiClient('success')}
        sourceAssetId="source-library-001"
        initialStepId="understanding"
      />,
    );

    expect(container.textContent).toContain('故事内容');
    expect(container.textContent).toContain('固定镜头，缓慢抬头。');
    expect(container.textContent).toContain('复制 video prompt');
    expect(container.querySelector('[data-testid="remix-understanding-workbench"]')).not.toBeNull();
  });

  it('原片理解页支持选择 ASR 引擎并透传到后端调用', async () => {
    const record: { preferredAsrEngine?: string | null } = {};
    const container = await renderProcessing(
      <RemixAssetProcessing
        projectDir="/tmp/remix-project"
        apiClient={buildApiClientWithUnderstandingRecorder(record)}
        sourceAssetId="source-library-001"
        initialStepId="understanding"
      />,
    );

    const select = container.querySelector('[data-testid="remix-understanding-asr-select"] button');
    await act(async () => {
      if (select) {
        select.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
    });
    await act(async () => {
      const option = Array.from(document.querySelectorAll('[role="option"]')).find((element) =>
        element.textContent?.includes('Whisper'),
      );
      option?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const button = Array.from(container.querySelectorAll('button')).find((element) =>
      element.textContent?.includes('生成原片理解'),
    );
    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(record.preferredAsrEngine).toBe('local_whisper_cpp');
  });

  it('切片后阶段点击片段卡片会切换当前预览片段', async () => {
    const container = await renderProcessing(
      <RemixAssetProcessing
        projectDir="/tmp/remix-project"
        apiClient={buildApiClient('success')}
        sourceAssetId="source-library-001"
        initialStepId="keyframes"
      />,
    );

    expect(container.textContent).toContain('当前播放片段');
    expect(container.textContent).toContain('天台风声压场');

    const target = container.textContent?.includes('反打与沉默')
      ? Array.from(container.querySelectorAll('section')).find((element) => element.textContent?.includes('反打与沉默'))
      : null;
    await act(async () => {
      target?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('反打与沉默');
  });

  it('原片理解页的台词重跑入口会复用当前 ASR 选择', async () => {
    const record: {
      transcriptPreferredAsrEngine?: string | null;
      transcriptSegmentId?: string | null;
    } = {};
    const container = await renderProcessing(
      <RemixAssetProcessing
        projectDir="/tmp/remix-project"
        apiClient={buildApiClientWithUnderstandingRecorder(record)}
        sourceAssetId="source-library-001"
        initialStepId="understanding"
      />,
    );

    const select = container.querySelector('[data-testid="remix-understanding-asr-select"] button');
    await act(async () => {
      select?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => {
      const option = Array.from(document.querySelectorAll('[role="option"]')).find((element) =>
        element.textContent?.includes('Whisper'),
      );
      option?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const rerunAllButton = Array.from(container.querySelectorAll('button')).find((element) =>
      element.textContent?.includes('重跑全部台词'),
    );
    await act(async () => {
      rerunAllButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(record.transcriptPreferredAsrEngine).toBe('local_whisper_cpp');

    const rerunSegmentButton = Array.from(container.querySelectorAll('button')).find((element) =>
      element.textContent?.includes('重跑 ASR'),
    );
    await act(async () => {
      rerunSegmentButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(record.transcriptPreferredAsrEngine).toBe('local_whisper_cpp');
    expect(record.transcriptSegmentId).toBe('segment-l-001');
  });

  it('进入人工标注时会应用理解预填且不覆盖已保存标注', async () => {
    const savedSnapshot = {
      ...clone(MOCK_ASSET_PROCESSING_SNAPSHOTS['source-library-001']),
      sourceAsset: {
        ...clone(MOCK_ASSET_PROCESSING_SNAPSHOTS['source-library-001'].sourceAsset),
        tags: ['hero-asset'],
        annotationNote: '保留人物逼近时的压迫节奏，不要在长停顿处提前切镜。',
        lastAnnotatedAt: '2026-06-23T12:00:00.000Z',
      },
      variants: [],
    };
    const apiClient = {
      ...buildApiClient('success'),
      getSourceAsset: async () => savedSnapshot,
    };

    const container = await renderProcessing(
      <RemixAssetProcessing
        projectDir="/tmp/remix-project"
        apiClient={apiClient}
        sourceAssetId="source-library-001"
        initialStepId="annotate"
      />,
    );

    expect(container.textContent).toContain('保留人物逼近时的压迫节奏');
    expect(container.textContent).not.toContain('【AI 预填，请按真实观感修正】');
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
