'use client'

import Image from 'next/image';
import styles from './avatar.module.css';

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

const Avatar = ({ src, name, size = 40, className = '', rounded = true }) => {
  const style = { width: size, height: size, borderRadius: rounded ? '50%' : '10px' };

  if (src) {
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
      className={`${styles.fallback} ${className}`}
      style={{ ...style, fontSize: Math.max(11, Math.round(size * 0.38)) }}
      aria-label={name || ''}
    >
      {initialsOf(name)}
    </span>
  );
};

export default Avatar;
