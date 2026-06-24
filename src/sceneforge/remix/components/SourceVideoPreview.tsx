import { useEffect, useMemo, useRef, useState } from 'react';
import { toFileSrc } from '../../../lib/utils';
import { formatRemixDuration } from '../lib/remix-workspace-view-model';
import type { SourceAsset, SourceSegment } from '../types';
import { REMIX_SOURCE_STATUS_LABELS } from '../lib/asset-library-view-model';
import panelStyles from './RemixWorkspacePanels.module.css';
import reviewStyles from './RemixSegmentReview.module.css';

interface SourceVideoPreviewProps {
  asset: SourceAsset;
  activeSegment: SourceSegment | null;
  currentTimeMs: number;
  seekToMs: number | null;
  onTimeUpdate: (timeMs: number) => void;
}

export function SourceVideoPreview({
  asset,
  activeSegment,
  currentTimeMs,
  seekToMs,
  onTimeUpdate,
}: SourceVideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasPreviewError, setHasPreviewError] = useState(false);
  const sourceVideoSrc = useMemo(() => toFileSrc(asset.sourceVideoPath), [asset.sourceVideoPath]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || seekToMs === null) {
      return;
    }

    const targetSeconds = Math.max(0, seekToMs / 1000);
    if (Math.abs(video.currentTime - targetSeconds) < 0.12) {
      return;
    }

    try {
      video.currentTime = targetSeconds;
    } catch {
      // 某些状态下浏览器会拒绝立即 seek；保持当前帧即可。
    }
  }, [seekToMs]);

  return (
    <article className={panelStyles.previewSurface} data-testid="remix-source-video-preview">
      <div className={panelStyles.previewTopline}>
        <div>
          <div className={panelStyles.previewTitle}>原片预览</div>
          <div className={panelStyles.previewSubtitle}>
            {asset.videoMetadata.width} × {asset.videoMetadata.height} · {asset.videoMetadata.fps ?? 25}fps
          </div>
        </div>
        <div className={panelStyles.chip}>{REMIX_SOURCE_STATUS_LABELS[asset.status]}</div>
      </div>

      {hasPreviewError || !sourceVideoSrc ? (
        <div className={reviewStyles.previewFallback}>
          <div className={reviewStyles.previewFallbackTitle}>当前无法加载原片预览</div>
          <div className={reviewStyles.previewFallbackBody}>
            {sourceVideoSrc
              ? '请确认源视频仍然存在，并检查项目目录中的素材路径是否可读。'
              : '当前素材没有可用的视频路径。'}
          </div>
        </div>
      ) : (
        <video
          ref={videoRef}
          className={reviewStyles.previewVideo}
          src={sourceVideoSrc}
          controls
          playsInline
          preload="metadata"
          onError={() => setHasPreviewError(true)}
          onTimeUpdate={(event) => onTimeUpdate(Math.round(event.currentTarget.currentTime * 1000))}
        />
      )}

      <div className={reviewStyles.previewStatusBar}>
        <span>当前播放位置 {formatRemixDuration(currentTimeMs)}</span>
        <span>总时长 {formatRemixDuration(asset.videoMetadata.durationMs)}</span>
      </div>

      {activeSegment ? (
        <div className={reviewStyles.activeSegmentCard}>
          <div className={reviewStyles.activeSegmentLabel}>当前验证片段</div>
          <div className={reviewStyles.activeSegmentTitle}>{activeSegment.title}</div>
          <div className={reviewStyles.activeSegmentMeta}>
            <span>{formatRemixDuration(activeSegment.timeRange.startMs)}</span>
            <span>{formatRemixDuration(activeSegment.timeRange.endMs)}</span>
            <span>{formatRemixDuration(activeSegment.timeRange.durationMs)}</span>
          </div>
        </div>
      ) : null}
    </article>
  );
}
