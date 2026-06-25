// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { RemixIpcContract } from '../electron/sceneforge/remix/remix-ipc-types';
import { MOCK_CREATION_WORKSPACE_SNAPSHOT } from '../src/sceneforge/remix/mock/mock-data';
import { RemixCreationWorkspace } from '../src/sceneforge/remix/pages/RemixCreationWorkspace';

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

const mounted: Array<{ container: HTMLDivElement; root: Root }> = [];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function buildBlockedApiClient(): RemixIpcContract {
  const snapshot = clone(MOCK_CREATION_WORKSPACE_SNAPSHOT);
  snapshot.keyframeEditPrompts = [snapshot.keyframeEditPrompts[0]];
  snapshot.editedKeyframes = [];
  snapshot.seedancePrompts = [];
  let seedanceCalls = 0;
  const api: RemixIpcContract = {
    listSourceAssets: async () => ({ sourceAssets: [] }),
    getSourceAsset: async () => { throw new Error('not implemented'); },
    deleteSourceAsset: async (input) => ({ deletedSourceAssetId: input.sourceAssetId }),
    updateSourceAssetMetadata: async () => { throw new Error('not implemented'); },
    createSourceAssetFromImport: async () => { throw new Error('not implemented'); },
    runSourceSegmentation: async () => { throw new Error('not implemented'); },
    runSourceKeyframes: async () => { throw new Error('not implemented'); },
    runSourceUnderstanding: async () => { throw new Error('not implemented'); },
    updateSourceSegments: async () => { throw new Error('not implemented'); },
    getSegmentationDiagnostics: async () => null,
    validateSourceAssetMedia: async () => ({
      sourceVideo: { path: null, exists: false, readable: false, error: 'not implemented' },
      keyframes: { totalCount: 0, validCount: 0, invalidCount: 0, items: [] },
      thumbnail: { source: 'fallback', status: 'failed', error: 'not implemented' },
      validatedAt: '2026-06-23T12:00:00.000Z',
    }),
    publishSourceAssetToLibrary: async () => { throw new Error('not implemented'); },
    createVariantFromSourceAsset: async () => { throw new Error('not implemented'); },
    listVariantsForSourceAsset: async () => [],
    renameVariant: async () => [],
    duplicateVariant: async () => [],
    deleteVariant: async () => [],
    getCreationWorkspace: async () => snapshot,
    updateVariantConfig: async () => snapshot,
    runRemixStrategy: async () => snapshot,
    runRemixDesign: async () => snapshot,
    runKeyframeEditPrompts: async () => snapshot,
    registerEditedKeyframe: async () => snapshot,
    updateEditedKeyframeStatus: async () => snapshot,
    runSeedancePrompts: async () => {
      seedanceCalls += 1;
      return snapshot;
    },
    exportPromptBundle: async () => ({ bundlePath: '/tmp/bundle.zip', workspace: snapshot }),
  };
  return api;
}

async function renderLive(node: JSX.Element) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mounted.push({ container, root });
  await act(async () => {
    root.render(node);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  return container;
}

afterEach(() => {
  for (const item of mounted.splice(0)) {
    act(() => item.root.unmount());
    item.container.remove();
  }
});

describe('SceneForge Remix creation seedance gate (#11/#12)', () => {
  it('disables seedance generation until required edited keyframes are approved', async () => {
    const apiClient = buildBlockedApiClient();
    const container = await renderLive(
      <RemixCreationWorkspace
        projectDir="/tmp/remix-project"
        apiClient={apiClient}
        variantId="variant-hero-001"
        initialStepId="seedance-prompts"
      />,
    );

    expect(container.textContent).toContain('先完成全部必需关键帧验收');

    const generateButton = Array.from(container.querySelectorAll('button')).find((el) =>
      el.textContent?.includes('生成视频提示词'),
    );
    expect(generateButton?.hasAttribute('disabled')).toBe(true);

    await act(async () => {
      generateButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Seedance 2.0 视频提示词');
  });
});
