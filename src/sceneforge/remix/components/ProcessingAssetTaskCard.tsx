import { Badge, Button } from '../../../ui';
import {
  formatAssetLibraryDate,
  formatAssetLibraryDuration,
  getSourceAssetFilename,
  getSourceAssetKeyframeIssueCount,
  getSourceAssetPrimaryAction,
  REMIX_SOURCE_STATUS_BADGE_VARIANTS,
  REMIX_SOURCE_STATUS_LABELS,
} from '../lib/asset-library-view-model';
import { buildAssetProcessingTaskSummary } from '../lib/remix-workspace-view-model';
import type { RemixAssetProcessingSnapshot } from '../types';
import { SourceAssetThumbnail } from './SourceAssetThumbnail';
import styles from './AssetLibrary.module.css';

interface ProcessingAssetTaskCardProps {
  snapshot: RemixAssetProcessingSnapshot;
  selected: boolean;
  onSelect: (assetId: string) => void;
  onOpenProcessing?: (sourceAssetId: string) => void;
  onDeleteSourceAsset?: (sourceAssetId: string) => void;
}

export function ProcessingAssetTaskCard({
  snapshot,
  selected,
  onSelect,
  onOpenProcessing,
  onDeleteSourceAsset,
}: ProcessingAssetTaskCardProps) {
  const asset = snapshot.sourceAsset;
  const summary = buildAssetProcessingTaskSummary(snapshot);
  const primaryAction = getSourceAssetPrimaryAction(asset);
  const keyframeIssueCount = getSourceAssetKeyframeIssueCount(asset);

  return (
    <article
      className={[styles.card, styles.taskCard, selected ? styles.cardSelected : ''].filter(Boolean).join(' ')}
      data-testid={`remix-processing-task-card-${asset.id}`}
    >
      <button type="button" className={styles.cover} onClick={() => onSelect(asset.id)}>
        <SourceAssetThumbnail asset={asset} />
        <div className={styles.coverMeta}>
          <div>
            <div className={styles.coverTitle}>{asset.title}</div>
            <div className={styles.coverSubtitle}>
              {formatAssetLibraryDuration(asset.videoMetadata.durationMs)} · {getSourceAssetFilename(asset)}
            </div>
          </div>
          <Badge variant={REMIX_SOURCE_STATUS_BADGE_VARIANTS[asset.status]}>
            {REMIX_SOURCE_STATUS_LABELS[asset.status]}
          </Badge>
        </div>
      </button>

      <div className={styles.taskSummaryBlock}>
        <div className={styles.taskSummaryEyebrow}>处理中任务</div>
        <div className={styles.taskSummaryTitle}>
          已完成 {summary.completedSteps}/{summary.totalSteps} 步
        </div>
        <div className={styles.cardMetaLine}>
          <span>最近更新 {formatAssetLibraryDate(asset.updatedAt)}</span>
          <span>{asset.videoMetadata.width} × {asset.videoMetadata.height}</span>
        </div>
        <div className={styles.cardText}>
          {summary.blockingReason ?? '继续完成切片、关键帧、理解与人工确认后再入库。'}
        </div>
      </div>

      <div className={styles.taskMetrics}>
        <div className={styles.taskMetric}>
          <span className={styles.taskMetricLabel}>生命周期</span>
          <strong>{REMIX_SOURCE_STATUS_LABELS[asset.status]}</strong>
        </div>
        <div className={styles.taskMetric}>
          <span className={styles.taskMetricLabel}>关键帧状态</span>
          <strong>{keyframeIssueCount > 0 ? `${keyframeIssueCount} 张异常` : '正常'}</strong>
        </div>
        <div className={styles.taskMetric}>
          <span className={styles.taskMetricLabel}>当前阻塞</span>
          <strong>{summary.blockingReason ?? '无'}</strong>
        </div>
      </div>

      <div className={styles.actionRow}>
        <Button variant="ghost" onClick={() => onSelect(asset.id)}>
          查看详情
        </Button>
        <Button
          variant="outline"
          onClick={() => onDeleteSourceAsset?.(asset.id)}
          data-testid={`remix-delete-processing-task-${asset.id}`}
        >
          删除草稿
        </Button>
        <Button
          variant="primary"
          onClick={() => onOpenProcessing?.(asset.id)}
          data-testid={`remix-open-processing-${asset.id}`}
        >
          {primaryAction?.label ?? '继续处理'}
        </Button>
      </div>
    </article>
  );
}
