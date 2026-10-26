'use client';

// next/image for a picture that lives on the media server, which may not be there.
//
// `Banner` and `Avatar` already fall back when a load fails. The other 44 files
// that drew a stored picture used next/image directly, and a stored path whose
// file is missing answered the image optimiser with 400, which Chrome draws as
// a broken-image glyph with the alt text printed over the card. The 557 audit
// (25 October 2026) found it on the events list, the organisations list and a
// team page in one pass.
//
// A drop-in: same props as next/image. When the load fails it draws the same
// empty surface as Banner, the size the picture would have had, so the card
// keeps its shape and nothing on it looks broken. Static imports pass through.

import NextImage from 'next/image';
import { useState } from 'react';
import styles from '../banner/banner.module.css';

export default function MediaImage({ src, alt = '', className = '', fill, width, height, style, onError, ...rest }) {
  // The src that failed, not a flag: replaced artwork gets a fresh attempt.
  const key = typeof src === 'string' ? src : src?.src;
  const [failedSrc, setFailedSrc] = useState(null);

  if (!src || failedSrc === key) {
    const box = fill
      ? { position: 'absolute', inset: 0 }
      : { width: typeof width === 'number' ? `${width}px` : width, height: typeof height === 'number' ? `${height}px` : height };
    return (
      <span
        className={`${styles.empty} ${className}`}
        style={{ display: 'block', ...box, borderRadius: style?.borderRadius }}
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
      />
    );
  }

  return (
    <NextImage
      src={src}
      alt={alt}
      className={className}
      fill={fill}
      width={width}
      height={height}
      style={style}
      onError={(e) => { setFailedSrc(key); onError?.(e); }}
      {...rest}
    />
  );
}
