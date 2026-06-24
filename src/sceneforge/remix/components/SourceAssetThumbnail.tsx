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
  const posterPath = asset.segments.flatMap((segment) => segment.keyframes)[0]?.imagePath ?? null;
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

  return (
    <div className={styles.coverFallback} aria-hidden>
      <div className={styles.coverFallbackGlow} />
      <div className={styles.coverFallbackLabel}>{asset.videoMetadata.width} × {asset.videoMetadata.height}</div>
    </div>
  );
}
