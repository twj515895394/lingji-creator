import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../ui';
import { PanelHeader } from '../../../ui/patterns/PanelHeader';
import type { RemixIpcContract } from '../../../../electron/sceneforge/remix/remix-ipc-types';
import { AssetDetailSidebar } from '../components/AssetDetailSidebar';
import { AssetFilterBar, type AssetLibraryStatusFilter } from '../components/AssetFilterBar';
import { AssetGrid } from '../components/AssetGrid';
import type { RemixEntryIntent } from '../components/RemixModeEntryDialog';
import {
  filterAssetLibraryAssets,
  getAssetLibraryAvailableTags,
  getStatusesForAssetLibrarySection,
} from '../lib/asset-library-state';
import { getLatestFailedJob, getVariantGateReason } from '../lib/asset-library-view-model';
import { getRemixApiClient } from '../services/remix-api-client';
import { REMIX_ROUTE_PATTERNS } from '../types';
import type {
  RemixAssetLibrarySection,
  RemixAssetProcessingSnapshot,
  RemixVariantSummary,
  SourceAsset,
} from '../types';
import styles from './RemixWorkspaceShell.module.css';

interface RemixAssetLibraryProps {
  projectDir?: string | null;
  apiClient?: RemixIpcContract;
  entryIntent?: RemixEntryIntent;
  initialSection?: RemixAssetLibrarySection;
  selectedSourceAssetId?: string | null;
  onOpenProcessing?: (sourceAssetId: string) => void;
  onOpenDetails?: (sourceAssetId: string, section: RemixAssetLibrarySection) => void;
  onOpenCreation?: (variantId: string, sourceAssetId: string) => void;
  onSectionChange?: (section: RemixAssetLibrarySection) => void;
}

export function RemixAssetLibrary({
  projectDir = null,
  apiClient,
  entryIntent = 'asset-ingestion',
  initialSection = 'published',
  selectedSourceAssetId = null,
  onOpenProcessing,
  onOpenDetails,
  onOpenCreation,
  onSectionChange,
}: RemixAssetLibraryProps) {
  const resolveClient = () => apiClient ?? getRemixApiClient();
  const [assets, setAssets] = useState<SourceAsset[]>([]);
  const [assetSnapshots, setAssetSnapshots] = useState<Record<string, RemixAssetProcessingSnapshot>>({});
  const [activeStatus, setActiveStatus] = useState<AssetLibraryStatusFilter>(initialSection);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeAssetId, setActiveAssetId] = useState<string | null>(selectedSourceAssetId);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [creatingVariantFor, setCreatingVariantFor] = useState<string | null>(null);
  const [variantMap, setVariantMap] = useState<Record<string, RemixVariantSummary[]>>({});
  const [loadingVariantAssetId, setLoadingVariantAssetId] = useState<string | null>(null);
  const [isRebuildingMetadata, setIsRebuildingMetadata] = useState(false);

  const availableTags = useMemo(
    () => getAssetLibraryAvailableTags(assets),
    [assets],
  );

  const filteredAssets = useMemo(() => {
    return filterAssetLibraryAssets(assets, activeStatus, activeTag);
  }, [activeStatus, activeTag, assets]);

  const activeAsset = filteredAssets.find((asset) => asset.id === activeAssetId) ?? null;
  const activeSnapshot = activeAsset ? assetSnapshots[activeAsset.id] ?? null : null;
  const isCreationEntry = entryIntent === 'creation';
  const preferredCreationAsset =
    (activeAsset?.status === 'published_to_library' ? activeAsset : null) ??
    assets.find((asset) => asset.status === 'published_to_library') ??
    null;

  useEffect(() => {
    async function loadAssets() {
      if (!projectDir) {
        setAssets([]);
        setErrorMessage('请先打开项目后再进入 Remix 资产库。');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);
      try {
        const snapshot = await resolveClient().listSourceAssets({
          projectDir,
          statuses: getStatusesForAssetLibrarySection(activeStatus),
        });
        const details = await Promise.all(
          snapshot.sourceAssets.map(async (sourceAsset) => {
            const response = await resolveClient().getSourceAsset({
              projectDir,
              sourceAssetId: sourceAsset.id,
            });
            return response;
          }),
        );
        setAssetSnapshots(
          Object.fromEntries(details.map((response) => [response.sourceAsset.id, response])),
        );
        setAssets(details.map((response) => response.sourceAsset));
        setVariantMap(
          Object.fromEntries(
            await Promise.all(
              snapshot.sourceAssets.map(async (sourceAsset) => {
                const variants = await resolveClient().listVariantsForSourceAsset({
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
  }, [activeStatus, apiClient, projectDir]);

  useEffect(() => {
    if (entryIntent === 'creation') {
      setActiveStatus('published');
      setActiveTag(null);
    }
  }, [entryIntent]);

  useEffect(() => {
    setActiveStatus(initialSection);
  }, [initialSection]);

  useEffect(() => {
    if (selectedSourceAssetId) {
      setActiveAssetId(selectedSourceAssetId);
      return;
    }

    if (isCreationEntry && preferredCreationAsset && activeAsset?.status !== 'published_to_library') {
      setActiveAssetId(preferredCreationAsset.id);
      return;
    }

    if (!activeAssetId && filteredAssets[0]) {
      setActiveAssetId(filteredAssets[0].id);
      return;
    }

    if (activeAssetId && !filteredAssets.some((asset) => asset.id === activeAssetId)) {
      setActiveAssetId(filteredAssets[0]?.id ?? null);
    }
  }, [activeAsset, activeAssetId, filteredAssets, isCreationEntry, preferredCreationAsset, selectedSourceAssetId]);

  async function handleCreateVariant(sourceAssetId: string) {
    if (!projectDir) {
      setErrorMessage('请先打开项目后再创建二创版本。');
      return;
    }

    const sourceAsset = assets.find((asset) => asset.id === sourceAssetId);
    if (!sourceAsset) {
      return;
    }
    const gateReason = getVariantGateReason(sourceAsset);
    if (gateReason) {
      setErrorMessage(gateReason);
      return;
    }

    setCreatingVariantFor(sourceAssetId);
    setErrorMessage(null);
    try {
      const workspace = await resolveClient().createVariantFromSourceAsset({
        projectDir,
        sourceAssetId,
        name: `${sourceAsset.title} 二创版`,
        concept: `基于「${sourceAsset.title}」延展一条新的二创版本。`,
      });
      setAssets((current) =>
        current.map((asset) =>
          asset.id === sourceAssetId
            ? { ...asset, variantCount: asset.variantCount + 1, updatedAt: new Date().toISOString() }
            : asset,
        ),
      );
      const variants = await resolveClient().listVariantsForSourceAsset({
        projectDir,
        sourceAssetId,
      });
      setVariantMap((current) => ({ ...current, [sourceAssetId]: variants }));
      onOpenCreation?.(workspace.variant.id, sourceAssetId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '创建二创版本失败。');
    } finally {
      setCreatingVariantFor(null);
    }
  }

  async function handleImportSource() {
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
      const snapshot = await resolveClient().createSourceAssetFromImport({
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
    onOpenDetails?.(assetId, activeStatus);
  }

  async function refreshAssetSnapshot(sourceAssetId: string) {
    if (!projectDir) {
      return null;
    }
    const response = await resolveClient().getSourceAsset({ projectDir, sourceAssetId });
    setAssetSnapshots((current) => ({ ...current, [sourceAssetId]: response }));
    setAssets((current) =>
      current.map((asset) => (asset.id === sourceAssetId ? response.sourceAsset : asset)),
    );
    return response;
  }

  async function reloadCurrentSection() {
    if (!projectDir) {
      return;
    }
    const snapshot = await resolveClient().listSourceAssets({
      projectDir,
      statuses: getStatusesForAssetLibrarySection(activeStatus),
    });
    const details = await Promise.all(
      snapshot.sourceAssets.map(async (sourceAsset) => {
        return resolveClient().getSourceAsset({
          projectDir,
          sourceAssetId: sourceAsset.id,
        });
      }),
    );
    setAssetSnapshots(
      Object.fromEntries(details.map((response) => [response.sourceAsset.id, response])),
    );
    setAssets(details.map((response) => response.sourceAsset));
  }

  function resolveRetryRunner(snapshot: RemixAssetProcessingSnapshot) {
    const failedJob = getLatestFailedJob(snapshot.processingJobs);
    switch (failedJob?.stepId) {
      case 'remix_keyframes':
        return () => resolveClient().runSourceKeyframes({ projectDir: projectDir!, sourceAssetId: snapshot.sourceAsset.id });
      case 'remix_understanding':
        return () => resolveClient().runSourceUnderstanding({ projectDir: projectDir!, sourceAssetId: snapshot.sourceAsset.id });
      case 'remix_segmentation':
      default:
        return () => resolveClient().runSourceSegmentation({ projectDir: projectDir!, sourceAssetId: snapshot.sourceAsset.id });
    }
  }

  async function handleRetrySourceAsset(sourceAssetId: string) {
    if (!projectDir) {
      return;
    }
    const snapshot = assetSnapshots[sourceAssetId];
    if (!snapshot) {
      return;
    }
    setErrorMessage(null);
    try {
      const nextSnapshot = await resolveRetryRunner(snapshot)();
      setAssetSnapshots((current) => ({ ...current, [sourceAssetId]: nextSnapshot }));
      setAssets((current) =>
        current.map((asset) => (asset.id === sourceAssetId ? nextSnapshot.sourceAsset : asset)),
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '重跑失败。');
      await refreshAssetSnapshot(sourceAssetId);
    }
  }

  async function handleDeleteSourceAsset(sourceAssetId: string) {
    if (
      !projectDir ||
      !window.confirm('删除这份处理中或异常素材会同时移除草稿与处理记录，无法恢复。确认继续吗？')
    ) {
      return;
    }

    setErrorMessage(null);
    try {
      await resolveClient().deleteSourceAsset({ projectDir, sourceAssetId });
      setAssetSnapshots((current) => {
        const next = { ...current };
        delete next[sourceAssetId];
        return next;
      });
      setAssets((current) => current.filter((asset) => asset.id !== sourceAssetId));
      setActiveAssetId((current) => (current === sourceAssetId ? null : current));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '删除草稿失败。');
    }
  }

  async function handleRebuildSourceMetadata() {
    if (!projectDir) {
      setErrorMessage('请先打开项目后再重建媒体规格。');
      return;
    }
    setIsRebuildingMetadata(true);
    setErrorMessage(null);
    try {
      const result = await resolveClient().rebuildSourceAssetVideoMetadata({
        projectDir,
      });
      await reloadCurrentSection();
      const summary = [
        `已重建 ${result.rebuiltAssetIds.length} 份素材的媒体规格`,
        result.syncedPublishedAssetIds.length > 0
          ? `并同步 ${result.syncedPublishedAssetIds.length} 份已入库资产到 SQLite`
          : null,
        result.failedAssets.length > 0
          ? `失败 ${result.failedAssets.length} 份：${result.failedAssets.map((item) => item.sourceAssetId).join('、')}`
          : null,
      ]
        .filter(Boolean)
        .join('；');
      setErrorMessage(summary);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '重建媒体规格失败。');
    } finally {
      setIsRebuildingMetadata(false);
    }
  }

  async function refreshVariants(sourceAssetId: string) {
    if (!projectDir) {
      return;
    }
    setLoadingVariantAssetId(sourceAssetId);
    try {
      const variants = await resolveClient().listVariantsForSourceAsset({
        projectDir: projectDir,
        sourceAssetId,
      });
      setVariantMap((current) => ({ ...current, [sourceAssetId]: variants }));
    } finally {
      setLoadingVariantAssetId(null);
    }
  }

  async function handleRenameVariant(variantId: string, name: string) {
    if (!projectDir || !activeAsset) {
      return;
    }
    setErrorMessage(null);
    try {
      const variants = await resolveClient().renameVariant({ projectDir, variantId, name });
      setVariantMap((current) => ({ ...current, [activeAsset.id]: variants }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '重命名二创版本失败。');
    }
  }

  async function handleDuplicateVariant(variantId: string) {
    if (!projectDir || !activeAsset) {
      return;
    }
    setErrorMessage(null);
    try {
      const variants = await resolveClient().duplicateVariant({ projectDir, variantId });
      setVariantMap((current) => ({ ...current, [activeAsset.id]: variants }));
      setAssets((current) =>
        current.map((asset) =>
          asset.id === activeAsset.id
            ? { ...asset, variantCount: variants.length, updatedAt: new Date().toISOString() }
            : asset,
        ),
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '复制二创版本失败。');
    }
  }

  async function handleDeleteVariant(variantId: string) {
    if (!projectDir || !activeAsset || !window.confirm('删除这个二创版本只会移除二创产物，不会影响原始素材。确认继续吗？')) {
      return;
    }
    setErrorMessage(null);
    try {
      const variants = await resolveClient().deleteVariant({ projectDir, variantId });
      setVariantMap((current) => ({ ...current, [activeAsset.id]: variants }));
      setAssets((current) =>
        current.map((asset) =>
          asset.id === activeAsset.id
            ? { ...asset, variantCount: variants.length, updatedAt: new Date().toISOString() }
            : asset,
        ),
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '删除二创版本失败。');
    }
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
            eyebrow="素材资产库"
            title={isCreationEntry ? '已入库资产' : activeStatus === 'published' ? '项目资产库' : activeStatus === 'processing' ? '处理中队列' : '异常队列'}
            description={
              isCreationEntry
                ? '选择已入库的源素材，继续已有二创版本，或创建新的二创版本。'
                : activeStatus === 'published'
                  ? '先把可复用原片沉淀成稳定资产，再从这里发起二创创作。'
                  : activeStatus === 'processing'
                    ? '这里只展示仍在处理中或待确认的原片任务。'
                    : '这里只展示导入或分析失败、需要恢复处理的素材。'
            }
          />
          <AssetFilterBar
            activeStatus={activeStatus}
            activeTag={activeTag}
            availableTags={availableTags}
            onStatusChange={(nextStatus) => {
              setActiveStatus(nextStatus);
              onSectionChange?.(nextStatus);
            }}
            onTagChange={setActiveTag}
          />
        </div>
      </section>

      <main className={styles.panel}>
        <div className={styles.panelContent}>
          <div className={styles.heroBlock}>
            <div className={styles.eyebrow}>素材治理区</div>
            <div className={styles.title}>
              {isCreationEntry
                ? '先选已入库资产，再发起二创'
                : activeStatus === 'published'
                  ? '正式资产只在入库后进入这里'
                  : activeStatus === 'processing'
                    ? '未入库素材继续在这里完成处理'
                    : '失败素材需要先恢复，再回到处理链'}
            </div>
            <div className={styles.description}>
              {isCreationEntry
                ? '这里只展示已经完成入库确认的素材。你可以继续已有二创版本，或基于当前素材新建一个二创版本。'
                : activeStatus === 'published'
                  ? '这里展示已经完成入库确认的素材，只有这些正式资产才允许进入二创工作区。'
                  : activeStatus === 'processing'
                    ? '这里展示 draft / processing / ready_for_review 状态的素材任务。'
                    : '这里集中展示 failed 状态的素材，可回到处理页查看失败原因并重跑。'}
            </div>
            {errorMessage ? (
              <div className={styles.description} data-testid="remix-asset-library-error">
                {errorMessage}
              </div>
            ) : null}
            <div className={styles.actionRow}>
              {isCreationEntry ? (
                <Button
                  variant="primary"
                  data-testid="remix-entry-create-variant-button"
                  disabled={!preferredCreationAsset || creatingVariantFor !== null}
                  onClick={() => {
                    if (preferredCreationAsset) {
                      void handleCreateVariant(preferredCreationAsset.id);
                    }
                  }}
                >
                  {creatingVariantFor ? '创建中…' : '基于当前素材创建二创版本'}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  data-testid="remix-import-source-button"
                  disabled={isImporting || !projectDir}
                  onClick={() => {
                    void handleImportSource();
                  }}
                >
                  {isImporting ? '导入中…' : '导入新原片'}
                </Button>
              )}
              <Button
                variant="outline"
                data-testid="remix-secondary-action-button"
                disabled={
                  isImporting ||
                  isRebuildingMetadata ||
                  creatingVariantFor !== null ||
                  !projectDir ||
                  (activeStatus === 'published' && !isCreationEntry && !preferredCreationAsset)
                }
                onClick={() => {
                  if (isCreationEntry) {
                    void handleImportSource();
                    return;
                  }
                  if (activeStatus !== 'published') {
                    setActiveStatus('published');
                    onSectionChange?.('published');
                    return;
                  }
                  if (preferredCreationAsset) {
                    void handleCreateVariant(preferredCreationAsset.id);
                  }
                }}
              >
                {isCreationEntry
                  ? '补充导入新原片'
                  : activeStatus === 'published'
                    ? '基于已入库素材创建二创版本'
                    : '查看已入库资产'}
              </Button>
              {!isCreationEntry ? (
                <Button
                  variant="ghost"
                  data-testid="remix-rebuild-source-metadata-button"
                  disabled={isImporting || isRebuildingMetadata || creatingVariantFor !== null || !projectDir}
                  onClick={() => {
                    void handleRebuildSourceMetadata();
                  }}
                >
                  {isRebuildingMetadata ? '重建媒体规格中…' : '重建媒体规格'}
                </Button>
              ) : null}
              {isLoading ? <span className={styles.description}>正在同步资产库…</span> : null}
              {creatingVariantFor ? <span className={styles.description}>正在创建二创版本…</span> : null}
              {isRebuildingMetadata ? <span className={styles.description}>正在重探源视频真实规格…</span> : null}
            </div>
          </div>

          <AssetGrid
            assets={filteredAssets}
            snapshotsByAssetId={assetSnapshots}
            selectedAssetId={activeAssetId}
            onSelect={handleSelect}
            onOpenProcessing={onOpenProcessing}
            onCreateVariant={handleCreateVariant}
            onRetrySourceAsset={(sourceAssetId) => {
              void handleRetrySourceAsset(sourceAssetId);
            }}
            onDeleteSourceAsset={(sourceAssetId) => {
              void handleDeleteSourceAsset(sourceAssetId);
            }}
          />
        </div>
      </main>

      <aside className={styles.panel}>
        <div className={styles.panelContent}>
          <AssetDetailSidebar
            asset={activeAsset}
            snapshot={activeSnapshot}
            variants={activeAsset ? variantMap[activeAsset.id] ?? [] : []}
            isLoadingVariants={loadingVariantAssetId === activeAsset?.id}
            onOpenProcessing={onOpenProcessing}
            onCreateVariant={handleCreateVariant}
            onRetrySourceAsset={(sourceAssetId) => {
              void handleRetrySourceAsset(sourceAssetId);
            }}
            onDeleteSourceAsset={(sourceAssetId) => {
              void handleDeleteSourceAsset(sourceAssetId);
            }}
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
