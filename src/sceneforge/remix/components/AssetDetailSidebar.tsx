import { Badge, Button } from '../../../ui';
import type { SourceAsset } from '../types';
import styles from './AssetLibrary.module.css';

const STATUS_LABELS = {
  draft: '未处理',
  processing: '处理中',
  ready_for_review: '待确认',
  published_to_library: '已入库',
  failed: '解析失败',
} as const;

const STATUS_BADGE_VARIANTS = {
  draft: 'outline',
  processing: 'warning',
  ready_for_review: 'info',
  published_to_library: 'success',
  failed: 'destructive',
} as const;

interface AssetDetailSidebarProps {
  asset: SourceAsset | null;
  onOpenProcessing?: (sourceAssetId: string) => void;
  onCreateVariant?: (sourceAssetId: string) => void;
}

export function AssetDetailSidebar({
  asset,
  onOpenProcessing,
  onCreateVariant,
}: AssetDetailSidebarProps) {
  if (!asset) {
    return (
      <div className={styles.emptyState} data-testid="remix-asset-library-inspector">
        <div className={styles.emptyTitle}>选择一份 Source Asset</div>
        <div className={styles.emptyText}>
          右侧会展示原片状态、素材规模和下一步动作。Asset Library 只负责资产治理，不在这里直接展开二创配置。
        </div>
      </div>
    );
  }

  const keyframeCount = asset.segments.reduce((sum, segment) => sum + segment.keyframes.length, 0);

  return (
    <div className={styles.detailRail} data-testid="remix-asset-library-inspector">
      <div className={styles.detailHero}>
        <Badge variant={STATUS_BADGE_VARIANTS[asset.status]}>{STATUS_LABELS[asset.status]}</Badge>
        <div className={styles.inspectorTitle}>{asset.title}</div>
        <div className={styles.detailNote}>
          这份原片已经沉淀为可管理资产。下一步要么继续补完处理链路，要么在入库后发起新的 Remix Variant。
        </div>
      </div>

      <div className={styles.detailMeta}>
        <div className={styles.detailRow}>
          <span>Source Asset</span>
          <strong>{asset.id}</strong>
        </div>
        <div className={styles.detailRow}>
          <span>原片时长</span>
          <strong>{Math.round(asset.videoMetadata.durationMs / 1000)}s</strong>
        </div>
        <div className={styles.detailRow}>
          <span>镜头分段</span>
          <strong>{asset.segments.length}</strong>
        </div>
        <div className={styles.detailRow}>
          <span>关键帧</span>
          <strong>{keyframeCount}</strong>
        </div>
        <div className={styles.detailRow}>
          <span>已派生 Variant</span>
          <strong>{asset.variantCount}</strong>
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
        {asset.status === 'processing' ? (
          <Button
            variant="outline"
            onClick={() => onOpenProcessing?.(asset.id)}
            data-testid="remix-detail-open-processing"
          >
            继续处理
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
      </div>
    </div>
  );
}
