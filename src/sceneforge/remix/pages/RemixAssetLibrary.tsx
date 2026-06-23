import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../ui';
import { PanelHeader } from '../../../ui/patterns/PanelHeader';
import { AssetDetailSidebar } from '../components/AssetDetailSidebar';
import { AssetFilterBar, type AssetLibraryStatusFilter } from '../components/AssetFilterBar';
import { AssetGrid } from '../components/AssetGrid';
import { filterAssetLibraryAssets, getAssetLibraryAvailableTags } from '../lib/asset-library-state';
import { DEFAULT_REMIX_PROJECT_DIR, MOCK_SOURCE_ASSETS } from '../mock/mock-data';
import { remixApiClient } from '../services/remix-api-client';
import { REMIX_ROUTE_PATTERNS } from '../types';
import type { SourceAsset } from '../types';
import styles from './RemixWorkspaceShell.module.css';

interface RemixAssetLibraryProps {
  selectedSourceAssetId?: string | null;
  onOpenProcessing?: (sourceAssetId: string) => void;
  onOpenDetails?: (sourceAssetId: string) => void;
  onOpenCreation?: (variantId: string, sourceAssetId: string) => void;
}

export function RemixAssetLibrary({
  selectedSourceAssetId = null,
  onOpenProcessing,
  onOpenDetails,
  onOpenCreation,
}: RemixAssetLibraryProps) {
  const [assets] = useState<SourceAsset[]>(MOCK_SOURCE_ASSETS);
  const [activeStatus, setActiveStatus] = useState<AssetLibraryStatusFilter>('all');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeAssetId, setActiveAssetId] = useState<string | null>(selectedSourceAssetId);

  const availableTags = useMemo(
    () => getAssetLibraryAvailableTags(assets),
    [assets],
  );

  const filteredAssets = useMemo(() => {
    return filterAssetLibraryAssets(assets, activeStatus, activeTag);
  }, [activeStatus, activeTag, assets]);

  const activeAsset = filteredAssets.find((asset) => asset.id === activeAssetId) ?? null;

  useEffect(() => {
    if (selectedSourceAssetId) {
      setActiveAssetId(selectedSourceAssetId);
      return;
    }

    if (!activeAssetId && filteredAssets[0]) {
      setActiveAssetId(filteredAssets[0].id);
      return;
    }

    if (activeAssetId && !filteredAssets.some((asset) => asset.id === activeAssetId)) {
      setActiveAssetId(filteredAssets[0]?.id ?? null);
    }
  }, [activeAssetId, filteredAssets, selectedSourceAssetId]);

  async function handleCreateVariant(sourceAssetId: string) {
    const sourceAsset = assets.find((asset) => asset.id === sourceAssetId);
    if (!sourceAsset) {
      return;
    }

    const workspace = await remixApiClient.createVariantFromSourceAsset({
      projectDir: DEFAULT_REMIX_PROJECT_DIR,
      sourceAssetId,
      name: `${sourceAsset.title} Remix`,
      concept: `基于「${sourceAsset.title}」延展一条新的拟人化二创版本。`,
    });
    onOpenCreation?.(workspace.variant.id, sourceAssetId);
  }

  function handleSelect(assetId: string) {
    setActiveAssetId(assetId);
    onOpenDetails?.(assetId);
  }

  return (
    <div
      className={[styles.shell, styles.libraryShell].join(' ')}
      data-testid="remix-asset-library-page"
      data-remix-route={selectedSourceAssetId ? REMIX_ROUTE_PATTERNS.assetDetails : REMIX_ROUTE_PATTERNS.assetLibrary}
    >
      <section className={[styles.panel, styles.rail].join(' ')}>
        <div className={styles.panelContent}>
          <PanelHeader
            eyebrow="Remix Asset Library"
            title="原片资产库"
            description="先把可复用原片做成稳定 Source Asset，再从这里发起 Variant 创作。"
          />
          <AssetFilterBar
            activeStatus={activeStatus}
            activeTag={activeTag}
            availableTags={availableTags}
            onStatusChange={setActiveStatus}
            onTagChange={setActiveTag}
          />
        </div>
      </section>

      <main className={styles.panel}>
        <div className={styles.panelContent}>
          <div className={styles.heroBlock}>
            <div className={styles.eyebrow}>Asset First, Remix Later</div>
            <div className={styles.title}>资产先入库，创作再引用</div>
            <div className={styles.description}>
              这里先管理原片的切片、关键帧和分析状态。只有完成入库确认的 Source Asset，
              才允许进入 Remix Creation Workspace。
            </div>
            <div className={styles.actionRow}>
              <Button variant="primary" data-testid="remix-import-source-button">
                导入新原片
              </Button>
            </div>
          </div>

          <AssetGrid
            assets={filteredAssets}
            selectedAssetId={activeAssetId}
            onSelect={handleSelect}
            onOpenProcessing={onOpenProcessing}
            onCreateVariant={handleCreateVariant}
          />
        </div>
      </main>

      <aside className={styles.panel}>
        <div className={styles.panelContent}>
          <AssetDetailSidebar
            asset={activeAsset}
            onOpenProcessing={onOpenProcessing}
            onCreateVariant={handleCreateVariant}
          />
        </div>
      </aside>
    </div>
  );
}
