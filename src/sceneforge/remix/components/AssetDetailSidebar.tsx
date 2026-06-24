import { useEffect, useState } from 'react';
import { Badge, Button, Input } from '../../../ui';
import {
  formatAssetLibraryDate,
  formatAssetLibraryDuration,
  getSourceAssetFilename,
  getSourceAssetKeyframeCount,
  getSourceAssetNextStep,
  getVariantStageLabel,
  REMIX_SOURCE_STATUS_BADGE_VARIANTS,
  REMIX_SOURCE_STATUS_LABELS,
} from '../lib/asset-library-view-model';
import type { RemixVariantSummary, SourceAsset } from '../types';
import { SourceAssetThumbnail } from './SourceAssetThumbnail';
import styles from './AssetLibrary.module.css';

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
        <div className={styles.emptyTitle}>选择一份源素材</div>
        <div className={styles.emptyText}>
          右侧会展示原片状态、素材规模和下一步动作。资产库只负责资产治理，不在这里直接展开二创配置。
        </div>
      </div>
    );
  }

  const keyframeCount = getSourceAssetKeyframeCount(asset);

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
          <span>源文件</span>
          <strong>{getSourceAssetFilename(asset)}</strong>
        </div>
        <div className={styles.detailRow}>
          <span>素材编号</span>
          <strong className={styles.compactValue}>{asset.id}</strong>
        </div>
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
          <strong>{keyframeCount}</strong>
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
