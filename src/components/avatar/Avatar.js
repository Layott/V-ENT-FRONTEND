'use client'

import Image from 'next/image';
import styles from './avatar.module.css';
import { mediaUrl } from '@/lib/mediaUrl';

/**
 * Profile picture with an initials fallback.
 *
 * next/image throws ("Cannot read properties of null") when `src` is null, and
 * most V-ENT accounts have no uploaded picture - which white-screened every page
 * that rendered a user avatar. This renders initials instead of crashing, and
 * never invents a stock photo.
 */
const initialsOf = (name = '') =>
  (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';

/**
 * @param fill  size and radius come from `className` instead of inline style.
 *              A crest inside a card is sized by the card, and an inline
 *              width fights the stylesheet. next/image needs a width and a
 *              height it can reason about, so a filled avatar is a plain img.
 */
const Avatar = ({ src: rawSrc, name, size = 40, className = '', rounded = true, fill = false }) => {
  // Turned into a URL HERE, so a caller passing a raw stored path is correct
  // by construction. `mediaUrl` is idempotent - an absolute URL, a data: or
  // blob:, and a static import object all pass through untouched - so this is
  // safe for every caller that was already doing it right.
  //
  // CEO, 7 September 2026, on organisation crests not loading in the rankings:
  // that page drew its own avatar and skipped the one function that turns a
  // stored path into a URL. Asking every caller to remember is how the sixth
  // screen forgets, so the component remembers instead.
  const src = mediaUrl(rawSrc);
  const style = fill
    ? undefined
    : { width: size, height: size, borderRadius: rounded ? '50%' : '10px' };

  if (src) {
    if (fill) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={src} alt={name || ''} className={`${styles.img} ${styles.fill} ${className}`} />;
    }
    return (
      <Image
        src={src}
        alt={name || ''}
        width={size}
        height={size}
        className={`${styles.img} ${className}`}
        style={style}
        unoptimized
      />
    );
  }

  return (
    <span
      className={`${styles.fallback} ${fill ? styles.fill : ''} ${className}`}
      style={fill ? undefined : { ...style, fontSize: Math.max(11, Math.round(size * 0.38)) }}
      aria-label={name || ''}
    >
      {initialsOf(name)}
    </span>
  );
};

export default Avatar;
