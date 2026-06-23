import { Badge, Button } from '../../../ui';
import type { SourceAsset } from '../types';
import styles from './AssetLibrary.module.css';

const STATUS_BADGE_VARIANTS = {
  draft: 'outline',
  processing: 'warning',
  ready_for_review: 'info',
  published_to_library: 'success',
  failed: 'destructive',
} as const;

const STATUS_LABELS = {
  draft: '未处理',
  processing: '处理中',
  ready_for_review: '待确认',
  published_to_library: '已入库',
  failed: '解析失败',
} as const;

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(1, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

interface AssetCardProps {
  asset: SourceAsset;
  selected: boolean;
  onSelect: (assetId: string) => void;
  onOpenProcessing?: (sourceAssetId: string) => void;
  onCreateVariant?: (sourceAssetId: string) => void;
}

export function AssetCard({
  asset,
  selected,
  onSelect,
  onOpenProcessing,
  onCreateVariant,
}: AssetCardProps) {
  const keyframeCount = asset.segments.reduce((sum, segment) => sum + segment.keyframes.length, 0);

  return (
    <article
      className={[styles.card, selected ? styles.cardSelected : ''].filter(Boolean).join(' ')}
      data-testid={`remix-asset-card-${asset.id}`}
    >
      <button type="button" className={styles.cover} onClick={() => onSelect(asset.id)} data-testid={`remix-asset-select-${asset.id}`}>
        <div className={styles.coverMeta}>
          <div>
            <div className={styles.coverTitle}>{asset.title}</div>
            <div className={styles.coverSubtitle}>{formatDuration(asset.videoMetadata.durationMs)}</div>
          </div>
          <Badge variant={STATUS_BADGE_VARIANTS[asset.status]}>{STATUS_LABELS[asset.status]}</Badge>
        </div>
      </button>

      <div className={styles.cardTopline}>
        <div className={styles.cardText}>
          最近更新于 {asset.updatedAt.slice(0, 10)}，已沉淀原片切片、关键帧与分析结果，可继续加工或直接发起二创。
        </div>
      </div>

      <div className={styles.metricGrid}>
        <div className={styles.metric}>
          <div className={styles.metricValue}>{asset.segments.length}</div>
          <div className={styles.metricLabel}>Segments</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricValue}>{keyframeCount}</div>
          <div className={styles.metricLabel}>Keyframes</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricValue}>{asset.variantCount}</div>
          <div className={styles.metricLabel}>Variants</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricValue}>{asset.videoMetadata.width}p</div>
          <div className={styles.metricLabel}>Format</div>
        </div>
      </div>

      <div className={styles.tagRow}>
        {asset.tags.map((tag) => (
          <span key={tag} className={styles.tag}>
            {tag}
          </span>
        ))}
      </div>

      <div className={styles.actionRow}>
        <Button variant="ghost" onClick={() => onSelect(asset.id)} data-testid={`remix-open-details-${asset.id}`}>
          查看资产详情
        </Button>
        {asset.status === 'processing' ? (
          <Button
            variant="outline"
            onClick={() => onOpenProcessing?.(asset.id)}
            data-testid={`remix-open-processing-${asset.id}`}
          >
            继续处理
          </Button>
        ) : null}
        {asset.status === 'published_to_library' ? (
          <Button
            variant="accent"
            onClick={() => onCreateVariant?.(asset.id)}
            data-testid={`remix-open-creation-${asset.id}`}
          >
            创建二创
          </Button>
        ) : null}
      </div>
    </article>
  );
}
