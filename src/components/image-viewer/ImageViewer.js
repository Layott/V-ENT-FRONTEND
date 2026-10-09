'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiChevronLeft, FiChevronRight, FiX } from 'react-icons/fi';
import { useT } from '@/i18n/LanguageProvider';
import styles from './image-viewer.module.css';

// One picture, large, with the others a press away. Used for what a pitch or
// stall will look like and for the venue layout (inbox 419: "users should be
// able to view it").
//
// Closes on Escape, on the close button and on a press outside the picture;
// arrow keys move between pictures; the page behind does not scroll while it
// is open. Opening and closing is instant: motion here would only be a delay.

const ImageViewer = ({ images = [], start = 0, onClose }) => {
  const tt = useT();
  const [index, setIndex] = useState(start);
  const dialogRef = useRef(null);
  const total = images.length;
  const current = images[index] || images[0];

  useEffect(() => {
    // The dialog takes focus, not the close button: focus moves into the
    // viewer for Tab and Escape, and a viewer opened by a tap shows no
    // keyboard ring (on the phone the close button read as ringed in red).
    dialogRef.current?.focus({ preventScroll: true });
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      else if (e.key === 'ArrowRight' && total > 1) setIndex((i) => (i + 1) % total);
      else if (e.key === 'ArrowLeft' && total > 1) setIndex((i) => (i - 1 + total) % total);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, total]);

  if (!current || typeof document === 'undefined') return null;

  // Drawn at the end of <body>, so nothing on the page (the bottom menu sits
  // at the same level) can draw over it or hide its buttons.
  return createPortal(
    <div ref={dialogRef} tabIndex={-1} className={styles.backdrop} role="dialog" aria-modal="true" aria-label={current.alt}
         onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <button type="button" className={`${styles.round} ${styles.close}`}
              onClick={onClose} aria-label={tt('viewer.close', 'Close')}>
        <FiX aria-hidden="true" />
      </button>

      {total > 1 && (
        <button type="button" className={`${styles.round} ${styles.prev}`}
                onClick={() => setIndex((i) => (i - 1 + total) % total)}
                aria-label={tt('viewer.prev', 'Previous picture')}>
          <FiChevronLeft aria-hidden="true" />
        </button>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.image} src={current.url} alt={current.alt} />

      {total > 1 && (
        <button type="button" className={`${styles.round} ${styles.next}`}
                onClick={() => setIndex((i) => (i + 1) % total)}
                aria-label={tt('viewer.next', 'Next picture')}>
          <FiChevronRight aria-hidden="true" />
        </button>
      )}

      {total > 1 && (
        <p className={styles.count}>
          {tt('viewer.count', '{n} of {total}').replace('{n}', index + 1).replace('{total}', total)}
        </p>
      )}
    </div>,
    document.body,
  );
};

export default ImageViewer;
