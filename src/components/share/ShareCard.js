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
 *
 * `shorten`, when given, is an async function returning a short address for
 * this page. It is only passed by a screen whose viewer may actually shorten
 * this event's links, so the button is absent rather than present-and-refused
 * for everybody else. A control that renders live and fails on press is the
 * thing the community feed shipped once and had to take back.
 */
export default function ShareCard({ url, title, text, label, compact = false,
                                    shorten = null }) {
  const tt = useT();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [absolute, setAbsolute] = useState('');
  // The short address, once somebody has asked for one. Held beside the full
  // one rather than replacing it, so the toggle can put the long link back:
  // the long one carries the event's name and is the better thing to paste
  // into a message, while the short one is for reading aloud and printing.
  const [short, setShort] = useState('');
  const [shortening, setShortening] = useState(false);
  const [shortError, setShortError] = useState('');
  const [useShort, setUseShort] = useState(false);
  const canvasWrapRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      setAbsolute(new URL(url || window.location.pathname, window.location.origin).href);
    } catch {
      setAbsolute(window.location.href);
    }
  }, [url]);

  // A different page, a different link. Without this, opening the card on one
  // event and then another would offer the first event's short code for the
  // second, which is the worst possible way for this to be wrong.
  useEffect(() => {
    setShort('');
    setUseShort(false);
    setShortError('');
  }, [url]);

  const showing = useShort && short ? short : absolute;

  const makeShort = useCallback(async () => {
    if (!shorten) return;
    if (short) { setUseShort(true); return; }
    setShortening(true);
    setShortError('');
    try {
      const made = await shorten();
      const value = typeof made === 'string' ? made : made?.url;
      if (!value) throw new Error('no url');
      // Resolved the same way the full link is, because the API returns it
      // against FRONTEND_URL and a relative answer would otherwise reach the
      // QR as a path no camera can open.
      const resolved = new URL(value, window.location.origin).href;
      setShort(resolved);
      setUseShort(true);
    } catch {
      setShortError(tt('share.shortenFailed',
        'The short link could not be made. The full link below still works.'));
    } finally {
      setShortening(false);
    }
  }, [shorten, short, tt]);

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
      await navigator.clipboard.writeText(showing);
      setCopied(true);
    } catch {
      // Clipboard is blocked outside a secure context and in some in-app
      // browsers. The address is on screen and selectable either way.
    }
  }, [showing]);

  // The phone's own share sheet, where there is one. It reaches WhatsApp,
  // which is where this is actually going, without this page having to guess
  // at a list of apps somebody has installed.
  const nativeShare = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.share) return;
    try {
      await navigator.share({ title, text, url: showing });
    } catch {
      // Dismissing the sheet throws. That is a person changing their mind.
    }
  }, [showing, title, text]);

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
              <QrCanvas value={showing} />
            </div>
            <p className={styles.hint}>
              {tt('share.scanHint', 'Point a phone camera at this to open the page.')}
            </p>

            <p className={styles.url}>{showing}</p>

            {shorten && (
              <div className={styles.shortRow}>
                {useShort && short ? (
                  <>
                    <span className={styles.shortNote}>
                      {tt('share.shortOn', 'Short link. Points at the same page.')}
                    </span>
                    <button type="button" className={styles.linkBtn}
                            onClick={() => setUseShort(false)}>
                      {tt('share.showFull', 'Show the full link')}
                    </button>
                  </>
                ) : (
                  <button type="button" className={styles.linkBtn}
                          onClick={makeShort} disabled={shortening}>
                    {shortening
                      ? tt('share.shortening', 'Shortening...')
                      : tt('share.shorten', 'Shorten this link')}
                  </button>
                )}
              </div>
            )}

            {shortError && <p className={styles.shortError}>{shortError}</p>}

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
