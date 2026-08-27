'use client';

import { useId } from 'react';
import styles from './founder-badge.module.css';
import { useT, useTx } from '@/i18n/LanguageProvider';

// The founder mark, shown beside a name.
//
// It is the V-ENT logo itself rather than a chip with a word in it, asked for
// directly by the CEO on 2026-08-27: "it can be the vent logo itself beside our
// names or something similar but red". The geometry is the real mark, the two
// paths lifted from public/images/logo_mark_red.svg, so this cannot drift away
// from the brand the way a hand-drawn chevron did.
//
// It glows and it shines, which is a deliberate exception to the house rule
// against glow and looping motion. The CEO asked for exactly that, and an
// explicit instruction outranks the standing rule. Do not "fix" this back to a
// flat mark in a later pass - see the note in the stylesheet.
//
// The word is gone from the face of it. That means the meaning has to live in
// the accessible name, so the mark carries a real label rather than
// aria-hidden: a screen reader says "Founding member of V-ENT" where a sighted
// reader sees the logo.

const FounderBadge = ({ size = 'md', title }) => {
  const t = useT();
  const tx = useTx();

  // Every gradient, filter and clip in an SVG shares one namespace across the
  // whole document. Two founders in one thread with hard-coded ids would both
  // resolve to the first badge's definitions, so one of them would render
  // unpainted. useId keeps each instance's references its own.
  const uid = useId().replace(/:/g, '');
  const fillId = `vf-fill-${uid}`;
  const clipId = `vf-clip-${uid}`;
  const shineId = `vf-shine-${uid}`;

  const name = title || tx('Founding member of V-ENT');

  // The two paths of the V-ENT mark, verbatim from the brand SVG.
  const upper = 'M0,.15H56C53.56,5.2,51.28,10,48.81,14.68c-.28.53-1.62.68-2.47.69-7,.05-14.06,'
    + '0-21.67,0,1.27,2.82,2.31,5.27,3.46,7.67,2.35,4.9,4.71,9.8,7.18,14.64a5.22,5.22,0,0,1,0,'
    + '5.48c-2.56,4.66-4.81,9.48-7.45,14.75Z';
  const lower = 'M80,.05C66.63,27.77,53.46,55.05,40,83c-2.06-4.26-3.64-8.09-5.71-11.63-2.44-4.19-'
    + '2.6-7.75-.17-12.31,6.27-11.81,11.82-24,17.67-36,3.39-7,6.84-13.95,10.16-21A3.16,3.16,0,0,'
    + '1,65.35,0C70,.14,74.73.05,80,.05Z';

  return (
    <span
      className={`${styles.badge} ${styles[size] || styles.md}`}
      title={name}
      role="img"
      aria-label={t('profile.founderBadgeLabel', name)}
    >
      <svg className={styles.mark} viewBox="0 0 80.02 83.02" focusable="false">
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff2b33" />
            <stop offset="0.5" stopColor="#e30613" />
            <stop offset="1" stopColor="#b3131d" />
          </linearGradient>

          {/* The shine is a band of light dragged across the mark. Clipping it
              to the logo is what keeps it a highlight on the shape rather than
              a streak floating over the name next to it. */}
          <clipPath id={clipId}>
            <path d={upper} />
            <path d={lower} />
          </clipPath>

          <linearGradient id={shineId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.35" stopColor="#ffd9db" stopOpacity="0.7" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="1" />
            <stop offset="0.65" stopColor="#ffd9db" stopOpacity="0.7" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>

        <g className={styles.body}>
          <path d={upper} fill={`url(#${fillId})`} />
          <path d={lower} fill={`url(#${fillId})`} />
        </g>

        <g clipPath={`url(#${clipId})`}>
          <rect
            className={styles.shine}
            x="-46"
            y="-12"
            width="44"
            height="108"
            fill={`url(#${shineId})`}
          />
        </g>
      </svg>
    </span>
  );
};

export default FounderBadge;
