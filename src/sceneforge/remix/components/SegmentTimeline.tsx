import type { SourceAsset } from '../types';
import {
  formatRemixDuration,
  formatRemixTimeRange,
  getSegmentBoundaryLabel,
} from '../lib/remix-workspace-view-model';
import styles from './RemixWorkspacePanels.module.css';

interface SegmentTimelineProps {
  asset: SourceAsset;
}

export function SegmentTimeline({ asset }: SegmentTimelineProps) {
  const totalDuration = Math.max(asset.videoMetadata.durationMs, 1);

  return (
    <div className={styles.timelineRail} data-testid="remix-segment-timeline">
      <div className={styles.timelineTrack}>
        {asset.segments.map((segment) => (
          <div
            key={segment.id}
            className={styles.timelineSegment}
            style={{
              flexGrow: Math.max(segment.timeRange.durationMs / totalDuration, 0.16),
            }}
          >
            <div className={styles.timelineSegmentTitle}>{segment.title}</div>
            <div className={styles.timelineSegmentMeta}>
              {formatRemixTimeRange(segment)}
            </div>
            <div className={styles.timelineSegmentMeta}>
              {getSegmentBoundaryLabel(segment.boundaryType)}
            </div>
          </div>
        ))}
      </div>
      <div className={styles.timelineLegend}>
        <span>总时长 {formatRemixDuration(asset.videoMetadata.durationMs)}</span>
        <span>{asset.segments.length} 个 Segment</span>
      </div>
    </div>
  );
}
