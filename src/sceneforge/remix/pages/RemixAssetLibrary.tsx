import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../ui';
import { PanelHeader } from '../../../ui/patterns/PanelHeader';
import type { RemixIpcContract } from '../../../../electron/sceneforge/remix/remix-ipc-types';
import { AssetDetailSidebar } from '../components/AssetDetailSidebar';
import { AssetFilterBar, type AssetLibraryStatusFilter } from '../components/AssetFilterBar';
import { AssetGrid } from '../components/AssetGrid';
import { filterAssetLibraryAssets, getAssetLibraryAvailableTags } from '../lib/asset-library-state';
import { DEFAULT_REMIX_PROJECT_DIR, MOCK_SOURCE_ASSETS } from '../mock/mock-data';
import { remixApiClient, resolveRemixApiClientMode } from '../services/remix-api-client';
import { REMIX_ROUTE_PATTERNS } from '../types';
import type { RemixVariantSummary, SourceAsset } from '../types';
import styles from './RemixWorkspaceShell.module.css';

interface RemixAssetLibraryProps {
  projectDir?: string | null;
  apiClient?: RemixIpcContract;
  selectedSourceAssetId?: string | null;
  onOpenProcessing?: (sourceAssetId: string) => void;
  onOpenDetails?: (sourceAssetId: string) => void;
  onOpenCreation?: (variantId: string, sourceAssetId: string) => void;
}

export function RemixAssetLibrary({
  projectDir = null,
  apiClient,
  selectedSourceAssetId = null,
  onOpenProcessing,
  onOpenDetails,
  onOpenCreation,
}: RemixAssetLibraryProps) {
  const client = apiClient ?? remixApiClient;
  const useMockSnapshot = !apiClient && resolveRemixApiClientMode() === 'mock';
  const effectiveProjectDir = projectDir ?? DEFAULT_REMIX_PROJECT_DIR;
  const [assets, setAssets] = useState<SourceAsset[]>(useMockSnapshot ? MOCK_SOURCE_ASSETS : []);
  const [activeStatus, setActiveStatus] = useState<AssetLibraryStatusFilter>('all');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeAssetId, setActiveAssetId] = useState<string | null>(selectedSourceAssetId);
  const [isLoading, setIsLoading] = useState(!useMockSnapshot);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [creatingVariantFor, setCreatingVariantFor] = useState<string | null>(null);
  const [variantMap, setVariantMap] = useState<Record<string, RemixVariantSummary[]>>({});
  const [loadingVariantAssetId, setLoadingVariantAssetId] = useState<string | null>(null);

  const availableTags = useMemo(
    () => getAssetLibraryAvailableTags(assets),
    [assets],
  );

  const filteredAssets = useMemo(() => {
    return filterAssetLibraryAssets(assets, activeStatus, activeTag);
  }, [activeStatus, activeTag, assets]);

  const activeAsset = filteredAssets.find((asset) => asset.id === activeAssetId) ?? null;

  useEffect(() => {
    async function loadAssets() {
      if (useMockSnapshot) {
        return;
      }

      if (!projectDir) {
        setAssets([]);
        setErrorMessage('请先打开项目后再进入 Remix 资产库。');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);
      try {
        const snapshot = await client.listSourceAssets({ projectDir });
        const details = await Promise.all(
          snapshot.sourceAssets.map(async (sourceAsset) => {
            const response = await client.getSourceAsset({
              projectDir,
              sourceAssetId: sourceAsset.id,
            });
            return response.sourceAsset;
          }),
        );
        setAssets(details);
        setVariantMap(
          Object.fromEntries(
            await Promise.all(
              snapshot.sourceAssets.map(async (sourceAsset) => {
                const variants = await client.listVariantsForSourceAsset({
                  projectDir,
                  sourceAssetId: sourceAsset.id,
                });
                return [sourceAsset.id, variants] as const;
              }),
            ),
          ),
        );
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : '加载资产库失败。');
      } finally {
        setIsLoading(false);
      }
    }

    void loadAssets();
  }, [client, projectDir, useMockSnapshot]);

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

    setCreatingVariantFor(sourceAssetId);
    setErrorMessage(null);
    try {
      const workspace = await client.createVariantFromSourceAsset({
        projectDir: effectiveProjectDir,
        sourceAssetId,
        name: `${sourceAsset.title} Remix`,
        concept: `基于「${sourceAsset.title}」延展一条新的拟人化二创版本。`,
      });
      setAssets((current) =>
        current.map((asset) =>
          asset.id === sourceAssetId
            ? { ...asset, variantCount: asset.variantCount + 1, updatedAt: new Date().toISOString() }
            : asset,
        ),
      );
      const variants = await client.listVariantsForSourceAsset({
        projectDir: effectiveProjectDir,
        sourceAssetId,
      });
      setVariantMap((current) => ({ ...current, [sourceAssetId]: variants }));
      onOpenCreation?.(workspace.variant.id, sourceAssetId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '创建 Variant 失败。');
    } finally {
      setCreatingVariantFor(null);
    }
  }

  async function handleImportSource() {
    if (useMockSnapshot) {
      return;
    }

    if (!projectDir) {
      setErrorMessage('请先打开项目后再导入原片。');
      return;
    }

    const sourceVideoPath = await window.electronAPI?.selectMediaFile?.('video');
    if (!sourceVideoPath) {
      return;
    }

    setIsImporting(true);
    setErrorMessage(null);
    try {
      const snapshot = await client.createSourceAssetFromImport({
        projectDir,
        sourceVideoPath,
      });
      setAssets((current) => [snapshot.sourceAsset, ...current.filter((asset) => asset.id !== snapshot.sourceAsset.id)]);
      setActiveAssetId(snapshot.sourceAsset.id);
      onOpenProcessing?.(snapshot.sourceAsset.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '导入原片失败。');
    } finally {
      setIsImporting(false);
    }
  }

  function handleSelect(assetId: string) {
    setActiveAssetId(assetId);
    onOpenDetails?.(assetId);
  }

  async function refreshVariants(sourceAssetId: string) {
    setLoadingVariantAssetId(sourceAssetId);
    try {
      const variants = await client.listVariantsForSourceAsset({
        projectDir: effectiveProjectDir,
        sourceAssetId,
      });
      setVariantMap((current) => ({ ...current, [sourceAssetId]: variants }));
    } finally {
      setLoadingVariantAssetId(null);
    }
  }

  async function handleRenameVariant(variantId: string, name: string) {
    if (!activeAsset) {
      return;
    }
    const variants = await client.renameVariant({ projectDir: effectiveProjectDir, variantId, name });
    setVariantMap((current) => ({ ...current, [activeAsset.id]: variants }));
  }

  async function handleDuplicateVariant(variantId: string) {
    if (!activeAsset) {
      return;
    }
    const variants = await client.duplicateVariant({ projectDir: effectiveProjectDir, variantId });
    setVariantMap((current) => ({ ...current, [activeAsset.id]: variants }));
    setAssets((current) =>
      current.map((asset) =>
        asset.id === activeAsset.id
          ? { ...asset, variantCount: variants.length, updatedAt: new Date().toISOString() }
          : asset,
      ),
    );
  }

  async function handleDeleteVariant(variantId: string) {
    if (!activeAsset || !window.confirm('删除这个 Variant 只会移除二创产物，不会影响原始 Source Asset。确认继续吗？')) {
      return;
    }
    const variants = await client.deleteVariant({ projectDir: effectiveProjectDir, variantId });
    setVariantMap((current) => ({ ...current, [activeAsset.id]: variants }));
    setAssets((current) =>
      current.map((asset) =>
        asset.id === activeAsset.id
          ? { ...asset, variantCount: variants.length, updatedAt: new Date().toISOString() }
          : asset,
      ),
    );
  }

  useEffect(() => {
    if (!activeAsset || activeAsset.status !== 'published_to_library' || variantMap[activeAsset.id]) {
      return;
    }
    void refreshVariants(activeAsset.id);
  }, [activeAsset, variantMap]);

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
            {errorMessage ? (
              <div className={styles.description} data-testid="remix-asset-library-error">
                {errorMessage}
              </div>
            ) : null}
            <div className={styles.actionRow}>
              <Button
                variant="primary"
                data-testid="remix-import-source-button"
                disabled={isImporting || (!useMockSnapshot && !projectDir)}
                onClick={() => {
                  void handleImportSource();
                }}
              >
                {isImporting ? '导入中…' : '导入新原片'}
              </Button>
              {isLoading ? <span className={styles.description}>正在同步资产库…</span> : null}
              {creatingVariantFor ? <span className={styles.description}>正在创建 Variant…</span> : null}
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
            variants={activeAsset ? variantMap[activeAsset.id] ?? [] : []}
            isLoadingVariants={loadingVariantAssetId === activeAsset?.id}
            onOpenProcessing={onOpenProcessing}
            onCreateVariant={handleCreateVariant}
            onOpenVariant={onOpenCreation}
            onRenameVariant={(variantId, name) => {
              void handleRenameVariant(variantId, name);
            }}
            onDuplicateVariant={(variantId) => {
              void handleDuplicateVariant(variantId);
            }}
            onDeleteVariant={(variantId) => {
              void handleDeleteVariant(variantId);
            }}
          />
        </div>
      </aside>
    </div>
  );
}
