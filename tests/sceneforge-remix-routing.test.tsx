import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  buildRemixPath,
  getAppPageForRemixRoute,
  parseRemixPath,
} from '../src/sceneforge/remix/lib/remix-routing';
import { RemixAssetLibrary } from '../src/sceneforge/remix/pages/RemixAssetLibrary';
import { RemixAssetProcessing } from '../src/sceneforge/remix/pages/RemixAssetProcessing';
import { RemixCreationWorkspace } from '../src/sceneforge/remix/pages/RemixCreationWorkspace';

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

  it('renders the Remix page skeletons with distinct workspace boundaries', () => {
    const libraryHtml = renderToStaticMarkup(
      <RemixAssetLibrary selectedSourceAssetId="source-001" />,
    );
    expect(libraryHtml).toContain('data-testid="remix-asset-library-page"');
    expect(libraryHtml).toContain('data-testid="remix-asset-grid"');
    expect(libraryHtml).toContain('资产详情视图');

    const processingHtml = renderToStaticMarkup(
      <RemixAssetProcessing sourceAssetId="source-001" />,
    );
    expect(processingHtml).toContain('data-testid="remix-asset-processing-page"');
    expect(processingHtml).toContain('原片理解');
    expect(processingHtml).not.toContain('创建 Variant');
    expect(processingHtml).not.toContain('Seedance 2.0 视频提示词');

    const creationHtml = renderToStaticMarkup(
      <RemixCreationWorkspace variantId="variant-001" />,
    );
    expect(creationHtml).toContain('data-testid="remix-creation-workspace-page"');
    expect(creationHtml).toContain('创建 Variant');
    expect(creationHtml).toContain('Seedance 2.0 视频提示词');
    expect(creationHtml).not.toContain('导入原片');
    expect(creationHtml).not.toContain('真实镜头切片');
  });
});
