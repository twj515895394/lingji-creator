import { useMemo, useState } from 'react';
import { toFileSrc } from '../../../lib/utils';
import styles from './RemixWorkspacePanels.module.css';

interface RemixFrameImageProps {
  imagePath: string;
  alt: string;
  className?: string;
}

export function RemixFrameImage({ imagePath, alt, className }: RemixFrameImageProps) {
  const [hasError, setHasError] = useState(false);
  const src = useMemo(() => toFileSrc(imagePath), [imagePath]);

  if (!src || hasError) {
    const errorTitle = src ? '加载失败' : '关键帧缺失';
    const tooltip = src ? `关键帧加载失败\n文件路径: ${imagePath}\n文件可能损坏或已被删除，请重新提取。` : '暂无可用图片路径。';
    return (
      <div
        className={[styles.galleryImage, styles.galleryImageFallback, className].filter(Boolean).join(' ')}
        title={tooltip}
      >
        <div className={styles.galleryImageFallbackTitle}>{errorTitle}</div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      className={[styles.galleryImage, styles.galleryImageFilled, className].filter(Boolean).join(' ')}
      onError={() => setHasError(true)}
    />
  );
}
