import { Plus, Trash2 } from 'lucide-react';
import type { SourceAsset } from '../types';
import {
  formatRemixTimestamp,
  formatRemixDuration,
  formatRemixTimeRange,
  getKeyframeRoleLabel,
} from '../lib/remix-workspace-view-model';
import { RemixFrameImage } from './RemixFrameImage';
import styles from './RemixWorkspacePanels.module.css';

interface KeyframeGalleryProps {
  asset: SourceAsset;
  projectDir?: string | null;
  activeSegmentId?: string | null;
  onAddMiddleFrame?: (segmentId: string) => Promise<void>;
  onDeleteMiddleFrame?: (segmentId: string) => Promise<void>;
  onSelectSegment?: (segmentId: string) => void;
  disabled?: boolean;
}

export function KeyframeGallery({
  asset,
  projectDir,
  activeSegmentId = null,
  onAddMiddleFrame,
  onDeleteMiddleFrame,
  onSelectSegment,
  disabled,
}: KeyframeGalleryProps) {
  if (asset.segments.length === 0) {
    return (
      <div className={styles.emptyHint} data-testid="remix-keyframe-gallery">
        <div className={styles.emptyHintTitle}>暂无可用关键帧</div>
        <div className={styles.emptyHintBody}>请先完成真实镜头切片，再进行关键帧提取。</div>
      </div>
    );
  }

  return (
    <div className={styles.keyframeSegmentsList} data-testid="remix-keyframe-gallery">
      {asset.segments.map((segment) => {
        const first = segment.keyframes.find((f) => f.frameRole === 'first');
        const middle = segment.keyframes.find((f) => f.frameRole === 'middle');
        const last = segment.keyframes.find((f) => f.frameRole === 'last');

        return (
          <section
            key={segment.id}
            className={styles.keyframeSegmentSection}
            style={activeSegmentId === segment.id ? { borderColor: 'rgba(96, 165, 250, 0.45)', boxShadow: '0 0 0 1px rgba(96, 165, 250, 0.16) inset' } : undefined}
            onClick={() => onSelectSegment?.(segment.id)}
          >
            <div className={styles.keyframeSegmentHeader}>
              <span className={styles.keyframeSegmentBadge}>#{segment.index}</span>
              <span className={styles.keyframeSegmentTitle}>{segment.title || `镜头段 ${segment.index}`}</span>
              <span className={styles.keyframeSegmentDuration}>
                {formatRemixDuration(segment.timeRange.durationMs)} · {formatRemixTimeRange(segment)}
              </span>
            </div>

            {segment.keyframes.length === 0 ? (
              <div className={styles.keyframeSegmentEmpty}>
                本段暂无关键帧，请点击上方「提取关键帧」进行一键提取。
              </div>
            ) : (
              <div className={styles.galleryGrid}>
                {/* First Keyframe */}
                {first && (
                  <article key={first.id} className={styles.galleryCard}>
                    <div className={styles.imageContainer}>
                      <RemixFrameImage imagePath={first.imagePath} alt={first.id} projectDir={projectDir} />
                    </div>
                    <div className={styles.galleryTitle}>{getKeyframeRoleLabel('first')}</div>
                    <div className={styles.galleryMeta}>{formatRemixTimestamp(first.timestampMs)}</div>
                  </article>
                )}

                {/* Middle Keyframe / Add Placeholder */}
                {middle ? (
                  <article key={middle.id} className={styles.galleryCard}>
                    <div className={styles.imageContainer}>
                      <RemixFrameImage imagePath={middle.imagePath} alt={middle.id} projectDir={projectDir} />
                      {!disabled && onDeleteMiddleFrame && (
                        <button
                          type="button"
                          className={styles.deleteButton}
                          onClick={(event) => {
                            event.stopPropagation();
                            void onDeleteMiddleFrame(segment.id);
                          }}
                          title="删除中间帧"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div className={styles.galleryTitle}>{getKeyframeRoleLabel('middle')}</div>
                    <div className={styles.galleryMeta}>{formatRemixTimestamp(middle.timestampMs)}</div>
                  </article>
                ) : (
                  <article
                    key={`${segment.id}-middle-placeholder`}
                    className={[styles.galleryCard, styles.galleryCardPlaceholder].join(' ')}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!disabled) {
                        void onAddMiddleFrame?.(segment.id);
                      }
                    }}
                    style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
                    title="手动提取中间帧"
                  >
                    <div className={styles.placeholderIconContainer}>
                      <Plus size={20} className={styles.placeholderPlusIcon} />
                      <span className={styles.placeholderText}>添加中间帧</span>
                    </div>
                    <div className={styles.galleryTitle}>{getKeyframeRoleLabel('middle')}</div>
                    <div className={styles.galleryMeta}>--:--</div>
                  </article>
                )}

                {/* Last Keyframe */}
                {last && (
                  <article key={last.id} className={styles.galleryCard}>
                    <div className={styles.imageContainer}>
                      <RemixFrameImage imagePath={last.imagePath} alt={last.id} projectDir={projectDir} />
                    </div>
                    <div className={styles.galleryTitle}>{getKeyframeRoleLabel('last')}</div>
                    <div className={styles.galleryMeta}>{formatRemixTimestamp(last.timestampMs)}</div>
                  </article>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
