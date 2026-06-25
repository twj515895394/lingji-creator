import { Badge, Button } from '../../../ui';
import {
  formatAssetLibraryDate,
  formatAssetLibraryDuration,
  getLatestFailedJob,
  getProcessingStepLabel,
  getSourceAssetFilename,
  REMIX_SOURCE_STATUS_BADGE_VARIANTS,
  REMIX_SOURCE_STATUS_LABELS,
} from '../lib/asset-library-view-model';
import type { RemixAssetProcessingSnapshot } from '../types';
import { SourceAssetThumbnail } from './SourceAssetThumbnail';
import styles from './AssetLibrary.module.css';

interface FailedAssetCardProps {
  snapshot: RemixAssetProcessingSnapshot;
  selected: boolean;
  onSelect: (assetId: string) => void;
  onOpenProcessing?: (sourceAssetId: string) => void;
  onRetrySourceAsset?: (sourceAssetId: string) => void;
  onDeleteSourceAsset?: (sourceAssetId: string) => void;
}

export function FailedAssetCard({
  snapshot,
  selected,
  onSelect,
  onOpenProcessing,
  onRetrySourceAsset,
  onDeleteSourceAsset,
}: FailedAssetCardProps) {
  const asset = snapshot.sourceAsset;
  const failedJob = getLatestFailedJob(snapshot.processingJobs);

  return (
    <article
      className={[styles.card, styles.failedCard, selected ? styles.cardSelected : ''].filter(Boolean).join(' ')}
      data-testid={`remix-failed-task-card-${asset.id}`}
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
        <div className={styles.taskSummaryEyebrow}>异常队列</div>
        <div className={styles.taskSummaryTitle}>
          {failedJob ? `${getProcessingStepLabel(failedJob.stepId)}失败` : '当前素材处理失败'}
        </div>
        <div className={styles.cardMetaLine}>
          <span>最近更新 {formatAssetLibraryDate(asset.updatedAt)}</span>
          <span>需要恢复后才能重新入库</span>
        </div>
        <div className={styles.cardText}>
          {failedJob?.error ?? '请先查看失败原因，再决定重跑或删除草稿。'}
        </div>
      </div>

      <div className={styles.actionRow}>
        <Button variant="ghost" onClick={() => onSelect(asset.id)}>
          查看失败原因
        </Button>
        <Button
          variant="outline"
          onClick={() => onDeleteSourceAsset?.(asset.id)}
          data-testid={`remix-delete-failed-task-${asset.id}`}
        >
          删除草稿
        </Button>
        <Button
          variant="outline"
          onClick={() => onRetrySourceAsset?.(asset.id)}
          data-testid={`remix-retry-failed-task-${asset.id}`}
        >
          重跑失败步骤
        </Button>
        <Button
          variant="primary"
          onClick={() => onOpenProcessing?.(asset.id)}
          data-testid={`remix-open-failed-processing-${asset.id}`}
        >
          回到处理页
        </Button>
      </div>
    </article>
  );
}
