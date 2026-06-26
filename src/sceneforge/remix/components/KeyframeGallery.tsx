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
}

export function KeyframeGallery({ asset, projectDir }: KeyframeGalleryProps) {
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
      {asset.segments.map((segment) => (
        <section key={segment.id} className={styles.keyframeSegmentSection}>
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
              {segment.keyframes.map((frame) => (
                <article key={frame.id} className={styles.galleryCard}>
                  <RemixFrameImage imagePath={frame.imagePath} alt={frame.id} projectDir={projectDir} />
                  <div className={styles.galleryTitle}>
                    {getKeyframeRoleLabel(frame.frameRole)}
                  </div>
                  <div className={styles.galleryMeta}>
                    {formatRemixTimestamp(frame.timestampMs)}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
