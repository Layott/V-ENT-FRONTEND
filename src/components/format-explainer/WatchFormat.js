'use client';

// "Watch how it works": a button beside a format, and the sheet it opens
// (inbox 476).
//
// Where the design puts it: beside each format in the tournament wizard, and
// under the format name on a tournament's page. The sheet is the party game
// explainer's sheet (inbox 439) with a bracket in it: a filled panel over a
// dimmed page, at the foot of the screen on a phone and in the middle on a
// desktop, closed by its button, by Escape or by pressing outside it. A
// tournament run in stages can have more than one picture to show; a row of
// filled chips above the player switches between them.

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useT } from '@/i18n/LanguageProvider';
import { explainerKey, sceneFor } from '@/lib/explainers';
import FormatExplainer, { explainerWords } from './FormatExplainer';
import styles from './watch-format.module.css';

/**
 * The sheet itself. `keys` are explainer keys; the first is shown first.
 * `allFormatsLink` adds a way to the help page with every format, for a page
 * where leaving loses nothing (never the wizard, which holds a form).
 */
export function ExplainerSheet({ keys, onClose, allFormatsLink = false }) {
  const tt = useT();
  const [current, setCurrent] = useState(keys[0]);
  const closeRef = useRef(null);
  const words = explainerWords(tt, current);

  const onKey = useCallback((e) => { if (e.key === 'Escape') onClose(); }, [onClose]);
  useEffect(() => {
    document.addEventListener('keydown', onKey);
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = before;
    };
  }, [onKey]);

  if (!words || typeof document === 'undefined') return null;
  // On the body, so no transformed parent can trap a fixed sheet. React still
  // bubbles a click through the component tree, so the scrim stops it: a press
  // inside the sheet must not also choose the wizard card it was opened from.
  return createPortal(
    <div
      className={styles.scrim}
      role="dialog"
      aria-modal="true"
      aria-label={words.title}
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.sheet}>
        <div className={styles.head}>
          <div className={styles.headWords}>
            <span className={styles.kicker}>{tt('explainer.howItWorks', 'How it works')}</span>
            <h2 className={styles.title}>{words.title}</h2>
          </div>
          <button ref={closeRef} type="button" className={styles.close} onClick={onClose}>
            {tt('explainer.close', 'Close')}
          </button>
        </div>

        {keys.length > 1 && (
          <div className={styles.chips}>
            {keys.map((k) => (
              <button
                key={k}
                type="button"
                className={styles.chip}
                aria-pressed={k === current}
                onClick={() => setCurrent(k)}
              >
                {explainerWords(tt, k).title}
              </button>
            ))}
          </div>
        )}

        <FormatExplainer key={current} format={current} autoPlay showLines />

        {allFormatsLink && (
          <Link href="/formats" className={styles.all} onClick={onClose}>
            {tt('explainer.allFormats', 'Every format explained')}
          </Link>
        )}
      </div>
    </div>,
    document.body,
  );
}

/**
 * The button, and the sheet when it is pressed. Draws nothing for a format
 * with no explainer, so it can be put beside any format safely.
 *
 * @param formats    one format or several (a tournament's stages), any spelling
 * @param className  extra class for where it sits
 * @param allFormatsLink  offer the page with every format inside the sheet
 */
export default function WatchFormat({ formats, className, label, allFormatsLink = false }) {
  const tt = useT();
  const [open, setOpen] = useState(false);
  const keys = [...new Set((Array.isArray(formats) ? formats : [formats])
    .map((f) => explainerKey(f))
    .filter((k) => k && sceneFor(k)))];
  if (!keys.length) return null;
  return (
    <>
      <button
        type="button"
        className={`${styles.watch} ${className || ''}`}
        onClick={(e) => {
          // It often sits inside something pressable (a wizard's format card),
          // and watching is not choosing.
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <span className={styles.playMark} aria-hidden="true" />
        {label || tt('explainer.watch', 'Watch how it works')}
      </button>
      {open && <ExplainerSheet keys={keys} allFormatsLink={allFormatsLink} onClose={() => setOpen(false)} />}
    </>
  );
}
