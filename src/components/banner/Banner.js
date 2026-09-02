'use client';

// A wide picture that may not exist: a banner, a cover, a product shot.
//
// `lib/mediaUrl.js` returns null when there is nothing to load, and says in its
// own comment that the caller should draw its own fallback. Sixty-three render
// sites passed that null straight to `<img>`, and React then omits the
// attribute, which Chrome draws as a broken-image glyph with the alt text
// beside it. On a club with no artwork that was a broken image across the whole
// hero, which is how it was found.
//
// `Avatar` already handles the other half of this: a face or a crest, which
// falls back to initials. This is the half that has no initials to draw. A
// banner with nothing in it is a filled surface, one step off the page, exactly
// as the design rules say to build structure: surface and space, never a
// stroke, and never a dashed placeholder box.
//
// It takes a className and no inline size, because a banner is sized by the
// layout it sits in and every one of these sites already has a class for that.

import styles from './banner.module.css';

/**
 * @param src       a URL, or null when there is nothing to show
 * @param alt       what the picture is, for somebody who cannot see it
 * @param className the page's own sizing and radius
 * @param label     optional short text drawn in the empty state, for a surface
 *                  large enough to carry it. A hero says the thing's name; a
 *                  thumbnail in a row says nothing at all.
 */
export default function Banner({ src, alt = '', className = '', label = '' }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={className} />;
  }

  return (
    <div
      className={`${styles.empty} ${className}`}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
    >
      {label ? <span className={styles.label}>{label}</span> : null}
    </div>
  );
}
