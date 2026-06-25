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
    return (
      <div className={[styles.galleryImage, styles.galleryImageFallback, className].filter(Boolean).join(' ')}>
        <div className={styles.galleryImageFallbackTitle}>{src ? '关键帧加载失败' : '关键帧缺失'}</div>
        <div className={styles.galleryImageFallbackBody}>
          {src ? '文件不可读或路径失效，请重新提取关键帧。' : '当前没有可用图片路径。'}
        </div>
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
