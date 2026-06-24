// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { act } from 'react';
import { createRoot } from 'react-dom/client';

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

async function renderRemixPage(node: JSX.Element) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(node);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  const html = container.innerHTML;
  act(() => root.unmount());
  container.remove();
  return html;
}

import { renderToStaticMarkup } from 'react-dom/server';
import {
  buildRemixPath,
  getAppPageForRemixRoute,
  parseRemixPath,
} from '../src/sceneforge/remix/lib/remix-routing';
import { RemixAssetLibrary } from '../src/sceneforge/remix/pages/RemixAssetLibrary';
import { RemixAssetProcessing } from '../src/sceneforge/remix/pages/RemixAssetProcessing';
import { RemixCreationWorkspace } from '../src/sceneforge/remix/pages/RemixCreationWorkspace';
import type { RemixIpcContract } from '../electron/sceneforge/remix/remix-ipc-types';
import { MOCK_ASSET_PROCESSING_SNAPSHOTS, MOCK_CREATION_WORKSPACE_SNAPSHOT } from '../src/sceneforge/remix/mock/mock-data';

const ROUTING_PROJECT_DIR = '/tmp/remix-routing-project';

function buildRoutingApiClient(): RemixIpcContract {
  const processing = MOCK_ASSET_PROCESSING_SNAPSHOTS['source-library-001'];
  const creation = MOCK_CREATION_WORKSPACE_SNAPSHOT;
  return {
    listSourceAssets: async () => ({ sourceAssets: [] }),
    getSourceAsset: async () => processing,
    updateSourceAssetMetadata: async () => processing,
    createSourceAssetFromImport: async () => { throw new Error('not implemented'); },
    runSourceSegmentation: async () => processing,
    runSourceKeyframes: async () => processing,
    runSourceUnderstanding: async () => processing,
    publishSourceAssetToLibrary: async () => processing,
    createVariantFromSourceAsset: async () => { throw new Error('not implemented'); },
    listVariantsForSourceAsset: async () => [],
    renameVariant: async () => [],
    duplicateVariant: async () => [],
    deleteVariant: async () => [],
    getCreationWorkspace: async () => creation,
    updateVariantConfig: async () => creation,
    runRemixStrategy: async () => creation,
    runRemixDesign: async () => creation,
    runKeyframeEditPrompts: async () => creation,
    registerEditedKeyframe: async () => creation,
    updateEditedKeyframeStatus: async () => creation,
    runSeedancePrompts: async () => creation,
    exportPromptBundle: async () => ({ bundlePath: '/tmp/bundle.zip', workspace: creation }),
  };
}


describe('SceneForge Remix routing', () => {
  it('round-trips the four Remix route patterns', () => {
    const routes = [
      { kind: 'asset-library' } as const,
      { kind: 'asset-processing', sourceAssetId: 'source-001' } as const,
      { kind: 'asset-details', sourceAssetId: 'source-001' } as const,
      { kind: 'creation', variantId: 'variant-001' } as const,
    ];

    expect(buildRemixPath(routes[0])).toBe('/remix/assets');
    expect(buildRemixPath(routes[1])).toBe('/remix/assets/source-001/process');
    expect(buildRemixPath(routes[2])).toBe('/remix/assets/source-001');
    expect(buildRemixPath(routes[3])).toBe('/remix/projects/variant-001');

    expect(parseRemixPath('/remix/assets')).toEqual(routes[0]);
    expect(parseRemixPath('/remix/assets/source-001/process')).toEqual(routes[1]);
    expect(parseRemixPath('/remix/assets/source-001')).toEqual(routes[2]);
    expect(parseRemixPath('/remix/projects/variant-001')).toEqual(routes[3]);

    expect(getAppPageForRemixRoute(routes[0])).toBe('sceneforge-remix-assets');
    expect(getAppPageForRemixRoute(routes[1])).toBe('sceneforge-remix-asset-processing');
    expect(getAppPageForRemixRoute(routes[2])).toBe('sceneforge-remix-asset-details');
    expect(getAppPageForRemixRoute(routes[3])).toBe('sceneforge-remix-creation');
  });

  it('renders the Remix page skeletons with distinct workspace boundaries', async () => {
    const libraryHtml = renderToStaticMarkup(
      <RemixAssetLibrary selectedSourceAssetId="source-library-001" />,
    );
    expect(libraryHtml).toContain('data-testid="remix-asset-library-page"');
    expect(libraryHtml).toContain('data-testid="remix-asset-grid"');
    expect(libraryHtml).not.toContain('天台谈判名场面');
    expect(libraryHtml).toContain('正在同步资产库');

    const processingHtml = await renderRemixPage(<RemixAssetProcessing
        projectDir={ROUTING_PROJECT_DIR}
        apiClient={buildRoutingApiClient()}
        sourceAssetId="source-library-001"
      />);
    expect(processingHtml).toContain('data-testid="remix-asset-processing-page"');
    expect(processingHtml).toContain('原片理解');
    expect(processingHtml).not.toContain('创建二创版本（Variant）');
    expect(processingHtml).not.toContain('Seedance 2.0 视频提示词');

    const creationHtml = await renderRemixPage(<RemixCreationWorkspace
        projectDir={ROUTING_PROJECT_DIR}
        apiClient={buildRoutingApiClient()}
        variantId="variant-hero-001"
      />);
    expect(creationHtml).toContain('data-testid="remix-creation-workspace-page"');
    expect(creationHtml).toContain('创建二创版本');
    expect(creationHtml).toContain('Seedance 2.0 视频提示词');
    expect(creationHtml).not.toContain('导入原片');
    expect(creationHtml).not.toContain('真实镜头切片');
  });
});
