import { useEffect, useState } from 'react';
import { Badge, Button, Input } from '../../../ui';
import type { RemixVariantSummary, SourceAsset } from '../types';
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
  variants?: RemixVariantSummary[];
  isLoadingVariants?: boolean;
  onOpenProcessing?: (sourceAssetId: string) => void;
  onCreateVariant?: (sourceAssetId: string) => void;
  onOpenVariant?: (variantId: string, sourceAssetId: string) => void;
  onRenameVariant?: (variantId: string, name: string) => void;
  onDuplicateVariant?: (variantId: string) => void;
  onDeleteVariant?: (variantId: string) => void;
}

export function AssetDetailSidebar({
  asset,
  variants = [],
  isLoadingVariants = false,
  onOpenProcessing,
  onCreateVariant,
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
        <div className={styles.emptyTitle}>选择一份源资产（Source Asset）</div>
        <div className={styles.emptyText}>
          右侧会展示原片状态、素材规模和下一步动作。资产库只负责资产治理，不在这里直接展开二创配置。
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
          这份原片已经沉淀为可管理资产。下一步要么继续补完处理链路，要么在入库后发起新的二创版本（Variant）。
        </div>
      </div>

      <div className={styles.detailMeta}>
        <div className={styles.detailRow}>
          <span>源资产（Source Asset）</span>
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
          <span>已派生二创版本（Variant）</span>
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

      {asset.annotationNote ? (
        <div className={styles.detailHero}>
          <div className={styles.inspectorTitle}>人工备注</div>
          <div className={styles.detailNote}>{asset.annotationNote}</div>
        </div>
      ) : null}

      {asset.status === 'published_to_library' ? (
        <div className={styles.detailHero}>
          <div className={styles.inspectorTitle}>已有二创版本（Variant）</div>
          <div className={styles.detailNote}>
            同一份源资产（Source Asset）可以沉淀多个二创版本；继续已有二创版本（Variant）和创建新二创版本的入口在这里分开。
          </div>
          {isLoadingVariants ? <div className={styles.detailNote}>正在同步二创版本（Variant）列表…</div> : null}
          {variants.length === 0 && !isLoadingVariants ? (
            <div className={styles.detailNote}>当前还没有已保存的二创版本（Variant）。</div>
          ) : null}
          {variants.map((variant) => (
            <div key={variant.id} className={styles.detailMeta}>
              <div className={styles.detailRow}>
                <span>{variant.currentStage ?? 'draft'}</span>
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
                    <span>二创版本（Variant）</span>
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
