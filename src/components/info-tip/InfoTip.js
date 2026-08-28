'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useT, useTx } from '@/i18n/LanguageProvider';
import { TIPS } from './tips';
import styles from './info-tip.module.css';

// A small mark beside a control that explains what it does.
//
// The site already had 25 stray `title=""` attributes. A native tooltip is
// useless here for three reasons: it never appears on a touch device, which is
// most of this audience; it cannot be reached by keyboard; and it is capped at
// a length that cannot explain anything worth explaining. So this is a real
// popover.
//
// Rules it follows, all of which the native one breaks:
//
// - **Tap opens it.** It is a button, not a hover target.
// - **Keyboard reaches it.** Tab to it, Enter or Space to open, Escape to close.
// - **A screen reader announces it**, through aria-describedby rather than by
//   the reader guessing what the mark means.
// - **It never covers the control it explains** - it flips above when there is
//   no room below.
//
// The text lives in tips.js keyed by id, so it goes through the translator like
// every other string and so the same control explained in two places cannot
// drift into two different explanations.

const InfoTip = ({ id, text, label, className = '' }) => {
  const t = useT();
  const tx = useTx();
  const [open, setOpen] = useState(false);
  const [above, setAbove] = useState(false);
  const wrapRef = useRef(null);
  const bubbleId = useId();

  // A key wins over inline text, so a caller can pass either and the registry
  // stays the single source for anything reused.
  // `tip.<id>` first, for anything given a hand-written key; otherwise the
  // English text is itself the lookup, which is how the 130 entries in tips.js
  // reach French and Portuguese without being rewritten.
  const body = id ? t(`tip.${id}`, tx(TIPS[id] || '')) : tx(text);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return undefined;

    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) close();
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open, close]);

  // Flip above when the bubble would run off the bottom of the window, and
  // slide sideways when it would run off either edge.
  //
  // The bubble is centred on the mark, so a mark near the right edge pushed
  // half a bubble off screen. The CSS handled that below 30rem by giving up on
  // centring altogether, which left the desktop case - a tip at the end of a
  // row, inside a panel that ends well before the window does - still
  // overflowing. Measured rather than guessed: the shift is however far it
  // actually sticks out.
  const bubbleRef = useRef(null);
  const [shift, setShift] = useState(0);

  useEffect(() => {
    if (!open || !wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    setAbove(window.innerHeight - r.bottom < 190);
  }, [open]);

  useEffect(() => {
    if (!open || !bubbleRef.current) {
      setShift(0);
      return;
    }
    // Measure with no shift applied, so a second open does not compound the
    // first one's correction.
    bubbleRef.current.style.setProperty('--tip-shift', '0px');
    const box = bubbleRef.current.getBoundingClientRect();
    const margin = 12;
    let next = 0;
    if (box.right > window.innerWidth - margin) {
      next = -(box.right - (window.innerWidth - margin));
    } else if (box.left < margin) {
      next = margin - box.left;
    }
    setShift(next);
  }, [open, body]);

  if (!body) return null;

  return (
    <span className={`${styles.wrap} ${className}`} ref={wrapRef}>
      <button
        type="button"
        className={styles.mark}
        aria-label={label || t('tip.whatIsThis', 'What is this?')}
        aria-expanded={open}
        aria-describedby={open ? bubbleId : undefined}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v); }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          // Keep it open while focus is still somewhere inside, so the text can
          // be selected and copied.
          if (!wrapRef.current?.contains(e.relatedTarget)) close();
        }}
      >
        {/* Drawn rather than imported: one glyph is not worth an icon set, and
            the default sets are banned here anyway. */}
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <circle cx="8" cy="8" r="7.25" className={styles.markRing} />
          <path d="M8 6.9v4.2" className={styles.markGlyph} />
          <circle cx="8" cy="4.75" r="0.85" className={styles.markDot} />
        </svg>
      </button>

      {open && (
        <span
          id={bubbleId}
          role="tooltip"
          ref={bubbleRef}
          className={`${styles.bubble} ${above ? styles.bubbleAbove : ''}`}
          style={{ '--tip-shift': `${shift}px` }}
        >
          {body}
        </span>
      )}
    </span>
  );
};

export default InfoTip;
