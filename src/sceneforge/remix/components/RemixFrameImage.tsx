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
    return <div className={[styles.galleryImage, className].filter(Boolean).join(' ')} aria-hidden />;
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
