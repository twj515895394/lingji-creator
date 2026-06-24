import { Badge, Button } from '../../../ui';
import {
  formatAssetLibraryDate,
  formatAssetLibraryDuration,
  getSourceAssetFilename,
  getSourceAssetKeyframeCount,
  getSourceAssetNextStep,
  getSourceAssetPrimaryAction,
  REMIX_SOURCE_STATUS_BADGE_VARIANTS,
  REMIX_SOURCE_STATUS_LABELS,
} from '../lib/asset-library-view-model';
import type { SourceAsset } from '../types';
import { SourceAssetThumbnail } from './SourceAssetThumbnail';
import styles from './AssetLibrary.module.css';

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
  const keyframeCount = getSourceAssetKeyframeCount(asset);
  const primaryAction = getSourceAssetPrimaryAction(asset);
  const visibleTags = asset.tags.slice(0, 3);

  return (
    <article
      className={[styles.card, selected ? styles.cardSelected : ''].filter(Boolean).join(' ')}
      data-testid={`remix-asset-card-${asset.id}`}
    >
      <button type="button" className={styles.cover} onClick={() => onSelect(asset.id)} data-testid={`remix-asset-select-${asset.id}`}>
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

      <div className={styles.cardTopline}>
        <div className={styles.cardSummary}>
          <div className={styles.cardMetaLine}>
            <span>最近更新 {formatAssetLibraryDate(asset.updatedAt)}</span>
            <span>{asset.videoMetadata.width} × {asset.videoMetadata.height}</span>
          </div>
          <div className={styles.cardText}>{getSourceAssetNextStep(asset)}</div>
        </div>
      </div>

      <div className={styles.metricGrid}>
          <div className={styles.metric}>
            <div className={styles.metricValue}>{asset.segments.length}</div>
            <div className={styles.metricLabel}>切片</div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricValue}>{keyframeCount}</div>
            <div className={styles.metricLabel}>关键帧</div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricValue}>{asset.variantCount}</div>
            <div className={styles.metricLabel}>二创版本</div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricValue}>{asset.videoMetadata.fps ?? 25}</div>
            <div className={styles.metricLabel}>帧率</div>
          </div>
        </div>

      <div className={styles.tagRow}>
        {visibleTags.map((tag) => (
          <span key={tag} className={styles.tag}>
            {tag}
          </span>
        ))}
        {asset.tags.length > visibleTags.length ? (
          <span className={styles.tag}>+{asset.tags.length - visibleTags.length}</span>
        ) : null}
      </div>

      <div className={styles.actionRow}>
        <Button variant="ghost" onClick={() => onSelect(asset.id)} data-testid={`remix-open-details-${asset.id}`}>
          查看详情
        </Button>
        {primaryAction?.emphasis === 'outline' ? (
          <Button
            variant="outline"
            onClick={() => onOpenProcessing?.(asset.id)}
            data-testid={`remix-open-processing-${asset.id}`}
          >
            {primaryAction.label}
          </Button>
        ) : null}
        {primaryAction?.emphasis === 'accent' ? (
          <Button
            variant="accent"
            onClick={() => onCreateVariant?.(asset.id)}
            data-testid={`remix-open-creation-${asset.id}`}
          >
            {primaryAction.label}
          </Button>
        ) : null}
      </div>
    </article>
  );
}
