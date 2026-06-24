import type { EditedKeyframe } from '../types';
import {
  getEditedKeyframeQualitySummary,
  getEditedKeyframeStatusLabel,
  getKeyframeRoleLabel,
} from '../lib/remix-workspace-view-model';
import styles from './RemixWorkspacePanels.module.css';

interface EditedKeyframeGalleryProps {
  items: EditedKeyframe[];
  selectedEditedKeyframeId: string | null;
  onSelectEditedKeyframe: (editedKeyframeId: string) => void;
}

export function EditedKeyframeGallery({
  items,
  selectedEditedKeyframeId,
  onSelectEditedKeyframe,
}: EditedKeyframeGalleryProps) {
  return (
    <div className={styles.galleryGrid} data-testid="remix-edited-keyframe-gallery">
      {items.map((item) => (
        <article
          key={item.id}
          className={[
            styles.galleryCard,
            item.id === selectedEditedKeyframeId ? styles.selectionCardActive : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <button
            type="button"
            className={styles.selectionButtonReset}
            onClick={() => onSelectEditedKeyframe(item.id)}
          >
            <div className={styles.galleryImage} />
            <div className={styles.galleryTitle}>
              {item.segmentId} · {getKeyframeRoleLabel(item.frameRole)}
            </div>
            <div className={styles.galleryMeta}>
              {getEditedKeyframeStatusLabel(item.status)}
            </div>
            <div className={styles.galleryMeta}>
              {getEditedKeyframeQualitySummary(item.qualityChecks)}
            </div>
          </button>
        </article>
      ))}
    </div>
  );
}
