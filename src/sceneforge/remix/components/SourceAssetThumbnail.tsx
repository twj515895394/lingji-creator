import { useEffect, useMemo, useRef, useState } from 'react';
import { toFileSrc } from '../../../lib/utils';
import type { SourceAsset } from '../types';
import styles from './AssetLibrary.module.css';

interface SourceAssetThumbnailProps {
  asset: SourceAsset;
}

export function SourceAssetThumbnail({ asset }: SourceAssetThumbnailProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasImageError, setHasImageError] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);
  const posterPath =
    asset.mediaValidation?.thumbnail.source === 'keyframe'
      ? asset.mediaValidation.keyframes.items.find((item) => item.readable)?.imagePath ??
        asset.segments.flatMap((segment) => segment.keyframes)[0]?.imagePath ??
        null
      : null;
  const posterSrc = useMemo(() => (posterPath ? toFileSrc(posterPath) : null), [posterPath]);
  const sourceVideoSrc = useMemo(() => toFileSrc(asset.sourceVideoPath), [asset.sourceVideoPath]);

  useEffect(() => {
    if (posterSrc || !sourceVideoSrc) {
      return;
    }

    const video = videoRef.current;
    if (!video) {
      return;
    }

    const seekToPreviewFrame = () => {
      try {
        video.currentTime = 0.05;
      } catch {
        video.pause();
      }
    };

    const pauseOnSeeked = () => {
      video.pause();
    };

    video.addEventListener('loadeddata', seekToPreviewFrame);
    video.addEventListener('seeked', pauseOnSeeked);

    if (video.readyState >= 2) {
      seekToPreviewFrame();
    }

    return () => {
      video.removeEventListener('loadeddata', seekToPreviewFrame);
      video.removeEventListener('seeked', pauseOnSeeked);
    };
  }, [posterSrc, sourceVideoSrc]);

  if (posterSrc && !hasImageError) {
    return (
      <img
        src={posterSrc}
        alt={asset.title}
        draggable={false}
        onError={() => setHasImageError(true)}
        className={styles.coverImage}
      />
    );
  }

  if (sourceVideoSrc && !hasVideoError) {
    return (
      <video
        ref={videoRef}
        src={sourceVideoSrc}
        muted
        playsInline
        preload="metadata"
        draggable={false}
        onError={() => setHasVideoError(true)}
        className={styles.coverVideo}
      />
    );
  }

  const fallbackTitle = !asset.sourceVideoPath
    ? '缺少源视频路径'
    : hasImageError && !hasVideoError
      ? '关键帧封面不可用'
      : hasVideoError
        ? '源视频不可读'
        : '暂无可用缩略图';
  const fallbackBody = asset.mediaValidation?.thumbnail.error
    ?? (!asset.sourceVideoPath
    ? '请先补齐源视频路径，再重新生成预览。'
    : hasImageError && !hasVideoError
      ? '已回退到视频首帧预览，如果仍失败请重新提取关键帧。'
      : hasVideoError
        ? '请确认源文件仍存在，并检查当前项目目录中的素材路径。'
        : '当前既没有可加载关键帧，也没有可回退的视频首帧。');

  return (
    <div className={styles.coverFallback}>
      <div className={styles.coverFallbackGlow} />
      <div className={styles.coverFallbackContent}>
        <div className={styles.coverFallbackTitle}>{fallbackTitle}</div>
        <div className={styles.coverFallbackBody}>{fallbackBody}</div>
        <div className={styles.coverFallbackLabel}>{asset.videoMetadata.width} × {asset.videoMetadata.height}</div>
      </div>
    </div>
  );
}
