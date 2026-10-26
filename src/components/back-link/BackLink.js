'use client';

// The way back from a page: an arrow icon joined to its words, one link.
//
// CEO, 12 October 2026 (inbox 447): "The back arrow on the pages on the site
// are created like text they should be icons which are connected, not like
// text." Seventeen links wrote their arrow as the character "←" inside the
// translated words, so it took the font's shape and size, sat apart from its
// label and could be translated away. scripts/check-back-arrows.mjs fails on
// a text arrow anywhere in the site or its dictionaries.

import Link from 'next/link';
import { LuArrowLeft } from 'react-icons/lu';
import styles from './back-link.module.css';

export default function BackLink({ href, children, className = '', ...rest }) {
  return (
    <Link href={href} className={`${styles.back} ${className}`.trim()} data-backlink="" {...rest}>
      <LuArrowLeft className={styles.icon} aria-hidden="true" />
      <span>{children}</span>
    </Link>
  );
}
