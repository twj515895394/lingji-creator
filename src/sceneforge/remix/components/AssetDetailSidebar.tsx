import { useEffect, useState } from 'react';
import { Badge, Button, Input } from '../../../ui';
import {
  formatAssetLibraryDate,
  formatAssetLibraryDuration,
  getLatestFailedJob,
  getProcessingStepLabel,
  getSourceAssetFilename,
  getSourceAssetKeyframeIssueCount,
  getSourceAssetKeyframeCount,
  getSourceAssetNextStep,
  getVariantGateReason,
  getVariantStageLabel,
  REMIX_SOURCE_STATUS_BADGE_VARIANTS,
  REMIX_SOURCE_STATUS_LABELS,
} from '../lib/asset-library-view-model';
import { buildAssetProcessingTaskSummary } from '../lib/remix-workspace-view-model';
import type { RemixAssetProcessingSnapshot, RemixVariantSummary, SourceAsset } from '../types';
import { SourceAssetThumbnail } from './SourceAssetThumbnail';
import styles from './AssetLibrary.module.css';

interface AssetDetailSidebarProps {
  asset: SourceAsset | null;
  snapshot?: RemixAssetProcessingSnapshot | null;
  variants?: RemixVariantSummary[];
  isLoadingVariants?: boolean;
  onOpenProcessing?: (sourceAssetId: string) => void;
  onCreateVariant?: (sourceAssetId: string) => void;
  onRetrySourceAsset?: (sourceAssetId: string) => void;
  onDeleteSourceAsset?: (sourceAssetId: string) => void;
  onOpenVariant?: (variantId: string, sourceAssetId: string) => void;
  onRenameVariant?: (variantId: string, name: string) => void;
  onDuplicateVariant?: (variantId: string) => void;
  onDeleteVariant?: (variantId: string) => void;
}

export function AssetDetailSidebar({
  asset,
  snapshot = null,
  variants = [],
  isLoadingVariants = false,
  onOpenProcessing,
  onCreateVariant,
  onRetrySourceAsset,
  onDeleteSourceAsset,
  onOpenVariant,
  onRenameVariant,
  onDuplicateVariant,
  onDeleteVariant,
}: AssetDetailSidebarProps) {
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  useEffect(() => {
    if (!editingVariantId) {
      setRenameDraft('');
      return;
    }
    const variant = variants.find((item) => item.id === editingVariantId);
    setRenameDraft(variant?.name ?? '');
  }, [editingVariantId, variants]);

  if (!asset) {
    return (
      <div className={styles.emptyState} data-testid="remix-asset-library-inspector">
        <div className={styles.emptyTitle}>选择一份源素材</div>
        <div className={styles.emptyText}>
          右侧会展示原片状态、素材规模和下一步动作。资产库只负责资产治理，不在这里直接展开二创配置。
        </div>
      </div>
    );
  }

  const keyframeCount = getSourceAssetKeyframeCount(asset);
  const keyframeIssueCount = getSourceAssetKeyframeIssueCount(asset);
  const taskSummary = snapshot ? buildAssetProcessingTaskSummary(snapshot) : null;
  const latestFailedJob = snapshot ? getLatestFailedJob(snapshot.processingJobs) : null;
  const variantGateReason = getVariantGateReason(asset);

  return (
    <div className={styles.detailRail} data-testid="remix-asset-library-inspector">
      <div className={styles.detailPreview}>
        <SourceAssetThumbnail asset={asset} />
      </div>

      <div className={styles.detailHero}>
        <Badge variant={REMIX_SOURCE_STATUS_BADGE_VARIANTS[asset.status]}>
          {REMIX_SOURCE_STATUS_LABELS[asset.status]}
        </Badge>
        <div className={styles.inspectorTitle}>{asset.title}</div>
        <div className={styles.detailNote}>{getSourceAssetNextStep(asset)}</div>
      </div>

      <div className={styles.detailMeta}>
        <div className={styles.detailRow}>
          <span>画面规格</span>
          <strong>{asset.videoMetadata.width} × {asset.videoMetadata.height}</strong>
        </div>
        <div className={styles.detailRow}>
          <span>原片时长</span>
          <strong>{formatAssetLibraryDuration(asset.videoMetadata.durationMs)}</strong>
        </div>
        <div className={styles.detailRow}>
          <span>镜头分段</span>
          <strong>{asset.segments.length}</strong>
        </div>
        <div className={styles.detailRow}>
          <span>关键帧</span>
          <strong>{keyframeIssueCount > 0 ? `${keyframeCount} · ${keyframeIssueCount} 张异常` : keyframeCount}</strong>
        </div>
        <div className={styles.detailRow}>
          <span>已派生二创版本</span>
          <strong>{asset.variantCount}</strong>
        </div>
        <div className={styles.detailRow}>
          <span>最近更新</span>
          <strong>{formatAssetLibraryDate(asset.updatedAt)}</strong>
        </div>
      </div>

      <details className={styles.detailDisclosure}>
        <summary className={styles.detailDisclosureSummary}>技术信息</summary>
        <div className={styles.detailMeta}>
          <div className={styles.detailRow} title={asset.sourceVideoPath}>
            <span>源文件</span>
            <strong>{getSourceAssetFilename(asset)}</strong>
          </div>
          <div className={styles.detailRow} title={asset.id}>
            <span>素材编号</span>
            <strong className={styles.compactValue}>{asset.id}</strong>
          </div>
        </div>
      </details>

      <div className={styles.tagRow}>
        {asset.tags.map((tag) => (
          <span key={tag} className={styles.tag}>
            {tag}
          </span>
        ))}
      </div>

      {asset.annotationNote ? (
        <div className={styles.detailHero}>
          <div className={styles.inspectorTitle}>人工备注</div>
          <div className={styles.detailNote}>{asset.annotationNote}</div>
        </div>
      ) : null}

      {taskSummary && asset.status !== 'published_to_library' ? (
        <div className={styles.detailHero}>
          <div className={styles.inspectorTitle}>
            {asset.status === 'failed' ? '失败恢复' : '处理进度'}
          </div>
          <div className={styles.detailNote}>
            已完成 {taskSummary.completedSteps}/{taskSummary.totalSteps} 步
            {taskSummary.blockingReason ? ` · ${taskSummary.blockingReason}` : ''}
          </div>
          {latestFailedJob ? (
            <div className={styles.detailMeta}>
              <div className={styles.detailRow}>
                <span>失败步骤</span>
                <strong>{getProcessingStepLabel(latestFailedJob.stepId)}</strong>
              </div>
              <div className={styles.detailNote}>{latestFailedJob.error ?? '请回到处理页查看详情。'}</div>
            </div>
          ) : null}
        </div>
      ) : null}

      {asset.status === 'published_to_library' ? (
        <div className={styles.detailHero}>
          <div className={styles.inspectorTitle}>已有二创版本</div>
          <div className={styles.detailNote}>继续已有版本，或基于这份源资产新开一个二创版本。</div>
          {isLoadingVariants ? <div className={styles.detailNote}>正在同步二创版本列表…</div> : null}
          {variants.length === 0 && !isLoadingVariants ? (
            <div className={styles.detailNote}>当前还没有已保存的二创版本。</div>
          ) : null}
          {variants.map((variant) => (
            <div key={variant.id} className={styles.detailMeta}>
              <div className={styles.detailRow}>
                <span>{getVariantStageLabel(variant.currentStage)}</span>
                <strong>{variant.updatedAt.slice(0, 10)}</strong>
              </div>
              {editingVariantId === variant.id ? (
                <div className={styles.actionRow}>
                  <Input
                    value={renameDraft}
                    onChange={(event) => setRenameDraft(event.target.value)}
                    size="sm"
                  />
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() => {
                      if (!renameDraft.trim()) {
                        return;
                      }
                      onRenameVariant?.(variant.id, renameDraft.trim());
                      setEditingVariantId(null);
                    }}
                  >
                    保存改名
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditingVariantId(null)}>
                    取消
                  </Button>
                </div>
              ) : (
                <>
                  <div className={styles.detailRow}>
                    <span>二创版本</span>
                    <strong>{variant.name}</strong>
                  </div>
                  <div className={styles.actionRow}>
                    <Button
                      variant="accent"
                      size="sm"
                      onClick={() => onOpenVariant?.(variant.id, asset.id)}
                    >
                      继续创作
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setEditingVariantId(variant.id)}>
                      重命名
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onDuplicateVariant?.(variant.id)}>
                      复制
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDeleteVariant?.(variant.id)}>
                      删除
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      ) : null}

      <div className={styles.actionRow}>
        {asset.status !== 'published_to_library' ? (
          <Button
            variant="primary"
            onClick={() => onOpenProcessing?.(asset.id)}
            data-testid="remix-detail-open-processing"
          >
            {asset.status === 'failed' ? '回到处理页修复' : '继续处理'}
          </Button>
        ) : null}
        {asset.status === 'published_to_library' ? (
          <Button
            variant="accent"
            onClick={() => onCreateVariant?.(asset.id)}
            data-testid="remix-detail-open-creation"
          >
            创建二创
          </Button>
        ) : null}
        {asset.status === 'failed' ? (
          <Button
            variant="outline"
            onClick={() => onRetrySourceAsset?.(asset.id)}
            data-testid="remix-detail-retry-processing"
          >
            重跑失败步骤
          </Button>
        ) : null}
        {asset.status !== 'published_to_library' ? (
          <Button
            variant="ghost"
            onClick={() => onDeleteSourceAsset?.(asset.id)}
            data-testid="remix-detail-delete-source"
          >
            删除草稿
          </Button>
        ) : null}
      </div>

      {variantGateReason ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyTitle}>二创门禁</div>
          <div className={styles.emptyText}>{variantGateReason}</div>
        </div>
      ) : null}
    </div>
  );
}
