'use client';

// Sharing a page: the link, a QR code for it, and the phone's own share sheet.
//
// The QR is the point. Most of how a Nigerian tournament or event actually
// spreads is somebody holding a phone up at a venue, or a flyer in a WhatsApp
// group. A link somebody has to type from a photograph is a link nobody opens,
// and a QR is the only form of an address that survives being printed on a
// poster or screenshotted off a stream overlay.
//
// Everything here is client-side. `qrcode` is already a dependency, used for
// the tickets themselves, so this adds nothing to the bundle that was not
// already being shipped.

import { useCallback, useEffect, useRef, useState } from 'react';
import { IoClose, IoShareSocialOutline } from 'react-icons/io5';
import { useT } from '@/i18n/LanguageProvider';
import styles from './share-card.module.css';

/** The canvas the code is drawn onto, and the PNG the download button saves. */
const QrCanvas = ({ value }) => {
  const canvasRef = useRef(null);
  // `qrcode` writes the size as an inline style, which beats any stylesheet, so
  // a CSS media query for narrow screens could never take effect. The size is
  // decided here instead, once, from the viewport it is about to be drawn into.
  const [size, setSize] = useState(220);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setSize(window.innerWidth <= 480 ? 190 : 220);
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !value) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const QRCode = (await import('qrcode')).default;
        if (cancelled || !canvasRef.current) return;
        await QRCode.toCanvas(canvasRef.current, value, {
          width: size,
          margin: 1,
          // A QR is read by a camera, not by a designer. Black on white is the
          // only pair that scans reliably off a phone screen in a dark venue,
          // so this one place ignores the dark theme deliberately.
          color: { dark: '#000000', light: '#ffffff' },
          errorCorrectionLevel: 'M',
        });
      } catch {
        // The link is always shown as text underneath, so a failed draw
        // costs the reader nothing.
      }
    })();
    return () => { cancelled = true; };
  }, [value, size]);

  return <canvas ref={canvasRef} className={styles.qr} aria-hidden="true" />;
};

/**
 * `url` may be relative; it is resolved against the current origin so the QR
 * carries something a stranger's phone can actually open.
 */
export default function ShareCard({ url, title, text, label, compact = false }) {
  const tt = useT();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [absolute, setAbsolute] = useState('');
  const canvasWrapRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      setAbsolute(new URL(url || window.location.pathname, window.location.origin).href);
    } catch {
      setAbsolute(window.location.href);
    }
  }, [url]);

  // Copied resets itself, so the button does not sit reading "Copied" for ever
  // over a clipboard that was replaced ten minutes ago.
  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = event => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
    } catch {
      // Clipboard is blocked outside a secure context and in some in-app
      // browsers. The address is on screen and selectable either way.
    }
  }, [absolute]);

  // The phone's own share sheet, where there is one. It reaches WhatsApp,
  // which is where this is actually going, without this page having to guess
  // at a list of apps somebody has installed.
  const nativeShare = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.share) return;
    try {
      await navigator.share({ title, text, url: absolute });
    } catch {
      // Dismissing the sheet throws. That is a person changing their mind.
    }
  }, [absolute, title, text]);

  const saveQr = useCallback(() => {
    const canvas = canvasWrapRef.current?.querySelector('canvas');
    if (!canvas) return;
    try {
      const link = document.createElement('a');
      link.download = `${(title || 'v-ent').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-qr.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      // Some browsers refuse toDataURL. The code is still on screen to
      // photograph, which is how most people would use it anyway.
    }
  }, [title]);

  const canNativeShare = typeof navigator !== 'undefined' && Boolean(navigator.share);

  return (
    <>
      <button
        type="button"
        className={compact ? styles.triggerCompact : styles.trigger}
        onClick={() => setOpen(true)}
      >
        <IoShareSocialOutline aria-hidden="true" />
        {!compact && <span>{label || tt('share.button', 'Share')}</span>}
      </button>

      {open && (
        <div
          className={styles.overlay}
          onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}
        >
          <div className={styles.panel} role="dialog" aria-modal="true">
            <div className={styles.head}>
              <p className={styles.title}>{tt('share.title', 'Share this')}</p>
              <button type="button" className={styles.close} onClick={() => setOpen(false)}
                      aria-label={tt('ui.close.4c1a', 'Close')}>
                <IoClose />
              </button>
            </div>

            {title && <p className={styles.what}>{title}</p>}

            <div className={styles.qrWrap} ref={canvasWrapRef}>
              <QrCanvas value={absolute} />
            </div>
            <p className={styles.hint}>
              {tt('share.scanHint', 'Point a phone camera at this to open the page.')}
            </p>

            <p className={styles.url}>{absolute}</p>

            <div className={styles.actions}>
              <button type="button" className={styles.primary} onClick={copy}>
                {copied ? tt('share.copied', 'Link copied') : tt('share.copy', 'Copy link')}
              </button>
              {canNativeShare && (
                <button type="button" className={styles.secondary} onClick={nativeShare}>
                  {tt('share.more', 'Share to an app')}
                </button>
              )}
              <button type="button" className={styles.secondary} onClick={saveQr}>
                {tt('share.saveQr', 'Save the QR')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
