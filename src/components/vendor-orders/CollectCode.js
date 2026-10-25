'use client';

// The code a stall reads back at the counter, drawn as a QR with the code in
// text beside it, plus the one line that says where and when to collect.
//
// One component for both places that show a collect order (the confirmation
// straight after paying and the orders list), so the two cannot disagree about
// the pickup window or the way the code is drawn.

import { useEffect, useRef } from 'react';
import { formatWithZone } from '@/lib/datetime';
import styles from './vendor-orders.module.css';

// A QR is read by a camera, not by a designer, so it is drawn black on white
// whatever the theme, the same choice ShareCard makes for the same reason.
export function OrderQr({ value, size = 132 }) {
  const canvasRef = useRef(null);

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
          color: { dark: '#000000', light: '#ffffff' },
          errorCorrectionLevel: 'M',
        });
      } catch {
        // The code is printed beside the QR, so a failed draw costs nothing.
      }
    })();
    return () => { cancelled = true; };
  }, [value, size]);

  return <canvas ref={canvasRef} className={styles.qr} width={size} height={size} aria-hidden="true" />;
}

// "Stall 4, 4 Sept 2026, 10:00 WAT to 4 Sept 2026, 14:00 WAT". Returns null
// when the stallholder has not said where or when, so the caller can say so
// rather than print an empty line.
export function pickupSummary(pickup, tt) {
  if (!pickup || (!pickup.location && !pickup.opens_at)) return null;
  const where = pickup.location || tt('orders.pickupAtStall', 'At the stall');
  if (pickup.opens_at && pickup.closes_at) {
    return tt('orders.pickupWindow', '{where}, from {from} to {to}')
      .replace('{where}', where)
      .replace('{from}', formatWithZone(pickup.opens_at))
      .replace('{to}', formatWithZone(pickup.closes_at));
  }
  if (pickup.opens_at) {
    return tt('orders.pickupFrom', '{where}, from {from}')
      .replace('{where}', where)
      .replace('{from}', formatWithZone(pickup.opens_at));
  }
  return where;
}

// The refund rule in words, so a buyer knows what cancelling would get them
// before they press anything. Null for a policy this screen does not know.
export function refundSummary(policy, tt) {
  if (policy === 'none') return tt('orders.refundNone', 'Stall orders cannot be refunded once paid.');
  if (policy === 'until_event_start') {
    return tt('orders.refundUntilStart', 'You can cancel for a refund until the event starts.');
  }
  if (policy === 'until_collected') {
    return tt('orders.refundUntilCollected', 'You can cancel for a refund until you collect it.');
  }
  return null;
}

// The QR, the code beside it, and the pickup line under both.
export function CollectCode({ code, pickup, tt }) {
  const summary = pickupSummary(pickup, tt);
  return (
    <div className={styles.collect}>
      <OrderQr value={code} />
      <div className={styles.collectText}>
        <p className={styles.codeLabel}>{tt('orders.code', 'Collection code')}</p>
        <p className={styles.code}>{code}</p>
        <p className={styles.collectWhere}>
          {summary || tt('orders.pickupNotSet', 'The stallholder has not said where to collect yet.')}
        </p>
      </div>
    </div>
  );
}
