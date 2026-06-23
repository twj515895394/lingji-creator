import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { AssetCard } from '../src/sceneforge/remix/components/AssetCard';
import { filterAssetLibraryAssets, getAssetLibraryAvailableTags } from '../src/sceneforge/remix/lib/asset-library-state';
import { MOCK_SOURCE_ASSETS } from '../src/sceneforge/remix/mock/mock-data';
import { RemixAssetLibrary } from '../src/sceneforge/remix/pages/RemixAssetLibrary';

describe('SceneForge Remix asset library', () => {
  it('按状态与标签筛选资产', () => {
    expect(filterAssetLibraryAssets(MOCK_SOURCE_ASSETS, 'processing', null)).toHaveLength(1);
    expect(filterAssetLibraryAssets(MOCK_SOURCE_ASSETS, 'published_to_library', null)[0]?.id).toBe(
      'source-library-001',
    );
    expect(filterAssetLibraryAssets(MOCK_SOURCE_ASSETS, 'all', 'hero-asset')[0]?.id).toBe(
      'source-library-001',
    );
    expect(getAssetLibraryAvailableTags(MOCK_SOURCE_ASSETS)).toContain('hero-asset');
  });

  it('根据资产状态控制卡片按钮可见性', () => {
    const processingHtml = renderToStaticMarkup(
      <AssetCard asset={MOCK_SOURCE_ASSETS[0]} selected={false} onSelect={() => undefined} />,
    );
    expect(processingHtml).toContain('继续处理');
    expect(processingHtml).not.toContain('创建二创');

    const publishedHtml = renderToStaticMarkup(
      <AssetCard asset={MOCK_SOURCE_ASSETS[1]} selected={false} onSelect={() => undefined} />,
    );
    expect(publishedHtml).toContain('创建二创');

    const failedHtml = renderToStaticMarkup(
      <AssetCard asset={MOCK_SOURCE_ASSETS[2]} selected={false} onSelect={() => undefined} />,
    );
    expect(failedHtml).not.toContain('创建二创');
  });

  it('渲染资产库主页面并展示导入入口与详情侧栏', () => {
    const html = renderToStaticMarkup(
      <RemixAssetLibrary selectedSourceAssetId="source-library-001" />,
    );

    expect(html).toContain('导入新原片');
    expect(html).toContain('data-testid="remix-asset-card-source-library-001"');
    expect(html).toContain('data-testid="remix-asset-library-inspector"');
    expect(html).toContain('天台谈判名场面');
  });
});
