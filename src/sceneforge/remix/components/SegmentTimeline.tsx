import { useRef, type MouseEvent } from 'react';
import type { SourceAsset } from '../types';
import {
  formatRemixTimestamp,
  formatRemixDuration,
  formatRemixTimeRange,
  getSegmentBoundaryLabel,
  findSourceSegmentAtTime,
} from '../lib/remix-workspace-view-model';
import styles from './RemixSegmentReview.module.css';

interface SegmentTimelineProps {
  asset: SourceAsset;
  activeSegmentId?: string | null;
  currentTimeMs?: number;
  onSelectSegment?: (segmentId: string) => void;
  onSeek?: (timeMs: number) => void;
}

export function SegmentTimeline({
  asset,
  activeSegmentId = null,
  currentTimeMs = 0,
  onSelectSegment,
  onSeek,
}: SegmentTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const totalDuration = Math.max(asset.videoMetadata.durationMs, 1);
  const activeSegment = activeSegmentId
    ? asset.segments.find((segment) => segment.id === activeSegmentId) ?? null
    : findSourceSegmentAtTime(asset, currentTimeMs);
  const playheadPercent = Math.max(0, Math.min(100, (currentTimeMs / totalDuration) * 100));

  function handleTrackClick(event: MouseEvent<HTMLDivElement>) {
    if (!onSeek || !trackRef.current || event.target !== event.currentTarget) {
      return;
    }

    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(rect.width, 1)));
    onSeek(Math.round(totalDuration * ratio));
  }

  return (
    <div className={styles.timelineRail} data-testid="remix-segment-timeline">
      <div ref={trackRef} className={styles.timelineTrack} onClick={handleTrackClick}>
        <div className={styles.timelinePlayhead} style={{ left: `${playheadPercent}%` }} aria-hidden />
        {asset.segments.map((segment) => (
          <button
            key={segment.id}
            type="button"
            className={[
              styles.timelineSegment,
              activeSegment?.id === segment.id ? styles.timelineSegmentActive : '',
            ].filter(Boolean).join(' ')}
            style={{
              flexGrow: Math.max(segment.timeRange.durationMs / totalDuration, 0.16),
            }}
            onClick={() => {
              onSelectSegment?.(segment.id);
              onSeek?.(segment.timeRange.startMs);
            }}
          >
            <div className={styles.timelineSegmentTitle}>{segment.title}</div>
            <div className={styles.timelineSegmentMeta}>
              {formatRemixTimeRange(segment)}
            </div>
            <div className={styles.timelineSegmentMeta}>
              {getSegmentBoundaryLabel(segment.boundaryType)}
            </div>
          </button>
        ))}
      </div>
      <div className={styles.timelineLegend}>
        <span>总时长 {formatRemixDuration(asset.videoMetadata.durationMs)}</span>
        <span>当前播放点 {formatRemixTimestamp(currentTimeMs)}</span>
        <span>{asset.segments.length} 个 Segment</span>
      </div>
    </div>
  );
}
