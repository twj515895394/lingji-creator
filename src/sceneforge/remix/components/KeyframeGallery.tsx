import type { SourceAsset } from '../types';
import {
  flattenAssetKeyframes,
  formatRemixTimestamp,
  getKeyframeRoleLabel,
} from '../lib/remix-workspace-view-model';
import { RemixFrameImage } from './RemixFrameImage';
import styles from './RemixWorkspacePanels.module.css';

interface KeyframeGalleryProps {
  asset: SourceAsset;
}

export function KeyframeGallery({ asset }: KeyframeGalleryProps) {
  const keyframes = flattenAssetKeyframes(asset);

  if (keyframes.length === 0) {
    return (
      <div className={styles.emptyHint} data-testid="remix-keyframe-gallery">
        <div className={styles.emptyHintTitle}>暂无可用关键帧</div>
        <div className={styles.emptyHintBody}>请先完成关键帧提取，或检查当前素材的关键帧文件是否生成成功。</div>
      </div>
    );
  }

  return (
    <div className={styles.galleryGrid} data-testid="remix-keyframe-gallery">
      {keyframes.map((frame) => (
        <article key={frame.id} className={styles.galleryCard}>
          <RemixFrameImage imagePath={frame.imagePath} alt={frame.id} />
          <div className={styles.galleryTitle}>
            {getKeyframeRoleLabel(frame.frameRole)}
          </div>
          <div className={styles.galleryMeta}>
            {frame.segmentId} · {formatRemixTimestamp(frame.timestampMs)}
          </div>
        </article>
      ))}
    </div>
  );
}
