import type { SourceAsset } from '../types';
import {
  formatRemixDuration,
  formatRemixTimeRange,
  getSegmentBoundaryLabel,
} from '../lib/remix-workspace-view-model';
import styles from './RemixSegmentReview.module.css';

interface SegmentTableProps {
  asset: SourceAsset;
  activeSegmentId?: string | null;
  onSelectSegment?: (segmentId: string) => void;
}

export function SegmentTable({
  asset,
  activeSegmentId = null,
  onSelectSegment,
}: SegmentTableProps) {
  return (
    <table className={styles.dataTable} data-testid="remix-segment-table">
      <thead>
        <tr>
          <th>Segment</th>
          <th>范围</th>
          <th>时长</th>
          <th>边界</th>
          <th>关键帧</th>
        </tr>
      </thead>
      <tbody>
        {asset.segments.map((segment) => (
          <tr
            key={segment.id}
            className={activeSegmentId === segment.id ? styles.dataTableRowActive : undefined}
            onClick={() => onSelectSegment?.(segment.id)}
          >
            <td>
              <div className={styles.tableStrong}>{segment.title}</div>
              <div className={styles.tableSubtle}>#{String(segment.index).padStart(2, '0')}</div>
            </td>
            <td>{formatRemixTimeRange(segment)}</td>
            <td>{formatRemixDuration(segment.timeRange.durationMs)}</td>
            <td>{getSegmentBoundaryLabel(segment.boundaryType)}</td>
            <td>{segment.keyframes.length} 张</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
