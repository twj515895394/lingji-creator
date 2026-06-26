import { useRef, useMemo, type MouseEvent } from 'react';
import type { SourceAsset } from '../types';
import {
  formatSegmentConfidence,
  formatRemixTimestamp,
  formatRemixDuration,
  formatRemixTimeRange,
  getSegmentBoundaryLabel,
  getSegmentReviewStatusLabel,
  getSegmentLowestConfidence,
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

  const playheadPercent = useMemo(() => {
    if (asset.segments.length === 0) {
      return 0;
    }
    const totalFlex = asset.segments.reduce(
      (sum, seg) => sum + Math.max(seg.timeRange.durationMs / totalDuration, 0.12),
      0
    );

    const activeIndex = activeSegment
      ? asset.segments.findIndex((seg) => seg.id === activeSegment.id)
      : -1;

    if (activeIndex === -1) {
      return Math.max(0, Math.min(100, (currentTimeMs / totalDuration) * 100));
    }

    const prevFlex = asset.segments
      .slice(0, activeIndex)
      .reduce((sum, seg) => sum + Math.max(seg.timeRange.durationMs / totalDuration, 0.12), 0);

    const currentSegment = asset.segments[activeIndex]!;
    const currentFlex = Math.max(currentSegment.timeRange.durationMs / totalDuration, 0.12);
    const segmentProgress = Math.max(
      0,
      Math.min(
        1,
        (currentTimeMs - currentSegment.timeRange.startMs) / Math.max(currentSegment.timeRange.durationMs, 1)
      )
    );

    return ((prevFlex + currentFlex * segmentProgress) / totalFlex) * 100;
  }, [asset.segments, currentTimeMs, totalDuration, activeSegment]);

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
        {asset.segments.map((segment) => {
          const durationRatio = segment.timeRange.durationMs / totalDuration;
          const showLabel = durationRatio > 0.05;
          const tooltip = `镜头段 #${segment.index}: ${segment.title || '未命名'}\n时长: ${formatRemixDuration(segment.timeRange.durationMs)} (${formatRemixTimeRange(segment)})\n边界: ${getSegmentBoundaryLabel(segment.boundaryType)}\n置信度: ${formatSegmentConfidence(getSegmentLowestConfidence(segment))} · ${getSegmentReviewStatusLabel(segment.reviewStatus)}`;

          return (
            <button
              key={segment.id}
              type="button"
              className={[
                styles.timelineSegment,
                activeSegment?.id === segment.id ? styles.timelineSegmentActive : '',
              ].filter(Boolean).join(' ')}
              style={{
                flexGrow: Math.max(durationRatio, 0.12),
              }}
              title={tooltip}
              onClick={() => {
                onSelectSegment?.(segment.id);
                onSeek?.(segment.timeRange.startMs);
              }}
            >
              {showLabel && <span className={styles.timelineSegmentLabel}>#{segment.index}</span>}
            </button>
          );
        })}
      </div>
      <div className={styles.timelineLegend}>
        <span>总时长 {formatRemixDuration(asset.videoMetadata.durationMs)}</span>
        <span>当前播放点 {formatRemixTimestamp(currentTimeMs)}</span>
        <span>{asset.segments.length} 个镜头段</span>
      </div>
    </div>
  );
}
