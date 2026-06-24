import type { SourceAsset } from '../types';
import {
  flattenAssetKeyframes,
  formatRemixTimestamp,
  getKeyframeRoleLabel,
} from '../lib/remix-workspace-view-model';
import styles from './RemixWorkspacePanels.module.css';

interface KeyframeGalleryProps {
  asset: SourceAsset;
}

export function KeyframeGallery({ asset }: KeyframeGalleryProps) {
  const keyframes = flattenAssetKeyframes(asset);

  return (
    <div className={styles.galleryGrid} data-testid="remix-keyframe-gallery">
      {keyframes.map((frame) => (
        <article key={frame.id} className={styles.galleryCard}>
          <div className={styles.galleryImage} />
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
