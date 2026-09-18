'use client';

// The stalls at an event, and the organiser's yes or no on each.
//
// "I want to approve each stall before it opens" sat on the pitch form from
// 7 September 2026 with nothing behind it: a buyer paid, the confirmation said
// "the organiser will approve it shortly", and the organiser had no screen
// listing the stall, let alone a button. This is that screen (walk,
// 18 September 2026).
//
// Every decision is two presses, because a rejection moves money: the coins
// the pitch cost go back to the buyer out of the organiser's wallet, and the
// pitch returns to sale.

import { useCallback, useEffect, useState } from 'react';
import { apiMessage } from '@/lib/apiMessage';
import { formatDate, formatNumber } from '@/lib/datetime';
import { useT } from '@/i18n/LanguageProvider';
import styles from './vendor-slots.module.css';

const StallsReviewPanel = ({ eventRef, token, onNotice }) => {
  const tt = useT();
  const [stalls, setStalls] = useState([]);
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  // Which stall is one press from a decision, and which decision.
  const [confirming, setConfirming] = useState(null);
  // Booth edits by stall id, saved on their own button.
  const [booths, setBooths] = useState({});

  const api = useCallback(async (path, options = {}) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/${eventRef}/${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...options,
    });
    return res.json().catch(() => ({ status: 'error', code: `HTTP_${res.status}` }));
  }, [eventRef, token]);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!eventRef || !token) return;
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const out = await api('stalls/manage/');
      if (out?.status === 'success') {
        setStalls(out.data.stalls || []);
        setPending(out.data.pending || 0);
      } else {
        setError(apiMessage(tt, out, 'api.somethingWentWrong', 'Something went wrong.'));
      }
    } catch (err) {
      setError(apiMessage(tt, err, 'api.somethingWentWrong', 'Something went wrong.'));
    } finally {
      setLoading(false);
    }
  }, [api, eventRef, token, tt]);

  useEffect(() => { load(); }, [load]);

  const decide = async (stall, decision, extra = {}) => {
    if (busy) return;
    setBusy(true);
    setConfirming(null);
    const out = await api(`stall/${stall.slug || stall.id}/decide/`, {
      method: 'POST',
      body: JSON.stringify({ decision, ...extra }),
    });
    setBusy(false);
    if (out?.status !== 'success') {
      return onNotice?.(apiMessage(tt, out, 'api.saveFailed', 'Save failed'));
    }
    const messages = {
      approve: tt('stalls.approved', '{name} is approved and can trade.'),
      reject: out.data?.refunded_vc
        ? tt('stalls.rejectedRefund', '{name} was turned down. {n} VC went back to the buyer.')
          .replace('{n}', formatNumber(out.data.refunded_vc))
        : tt('stalls.rejected', '{name} was turned down.'),
      close: tt('stalls.closed', '{name} is closed.'),
      reopen: tt('stalls.reopened', '{name} is open again.'),
      '': tt('stalls.boothSaved', 'Booth saved.'),
    };
    onNotice?.((messages[decision] || messages['']).replace('{name}', stall.name));
    load({ quiet: true });
  };

  const statusLabel = (s) => ({
    pending: tt('stalls.statusPending', 'Waiting for you'),
    approved: tt('stalls.statusOpen', 'Open'),
    live: tt('stalls.statusOpen', 'Open'),
    closed: tt('stalls.statusClosed', 'Closed'),
  }[s] || s);

  if (loading) {
    return <p className={styles.muted}>{tt('stalls.loading', 'Loading stalls...')}</p>;
  }

  return (
    <div className={styles.wrap}>
      <h4 className={styles.formTitle}>
        {pending > 0
          ? tt('stalls.titlePending', 'Stalls ({n} waiting for you)').replace('{n}', formatNumber(pending))
          : tt('stalls.title', 'Stalls')}
      </h4>
      {error && <p className={styles.error}>{error}</p>}
      {stalls.length === 0
        ? <p className={styles.muted}>
            {tt('stalls.none', 'Nobody has a stall yet. Sell a pitch below, or add a trader yourself.')}
          </p>
        : <ul className={styles.list}>
            {stalls.map((s) => (
              <li key={s.id} className={styles.row}>
                <div className={styles.rowHead}>
                  <span className={styles.rowName}>{s.name}</span>
                  <span className={s.status === 'pending' || s.status === 'closed' ? styles.pillGone : styles.pillLeft}>
                    {statusLabel(s.status)}
                  </span>
                </div>
                <p className={styles.rowMeta}>
                  {s.owner
                    ? tt('stalls.runBy', 'Run by @{owner}').replace('{owner}', s.owner)
                    : tt('stalls.noOwner', 'No owner yet')}
                  {s.purchase
                    ? ` · ${tt('stalls.bought', 'Bought {slot} for {n} VC').replace('{slot}', s.purchase.slot).replace('{n}', formatNumber(s.purchase.price_vc))}`
                    : ` · ${tt('stalls.addedByHand', 'Added by you')}`}
                  {s.purchase?.accepted_at
                    ? ` · ${tt('stalls.acceptedRules', 'Accepted your rules on {date}').replace('{date}', formatDate(s.purchase.accepted_at))}`
                    : ''}
                  {` · ${tt('stalls.orders', '{n} orders').replace('{n}', formatNumber(s.orders || 0))}`}
                </p>
                <div className={styles.rowActions}>
                  <input className={`${styles.input} ${styles.booth}`} aria-label={tt('slots.stallBooth', 'Pitch or booth')}
                         value={booths[s.id] ?? (s.booth || '')}
                         placeholder={tt('slots.stallBoothPlaceholder', 'B4')}
                         onChange={(e) => setBooths((b) => ({ ...b, [s.id]: e.target.value }))} />
                  {booths[s.id] !== undefined && booths[s.id] !== (s.booth || '') && (
                    <button type="button" className={styles.ghost} disabled={busy}
                            onClick={() => decide(s, '', { booth: booths[s.id] })
                              .then(() => setBooths((b) => { const c = { ...b }; delete c[s.id]; return c; }))}>
                      {tt('stalls.saveBooth', 'Save booth')}
                    </button>
                  )}
                  {s.status === 'pending' && confirming?.id !== s.id && <>
                    <button type="button" className={styles.primary} disabled={busy}
                            onClick={() => decide(s, 'approve')}>
                      {tt('stalls.approve', 'Approve')}
                    </button>
                    <button type="button" className={styles.ghost} disabled={busy}
                            onClick={() => setConfirming({ id: s.id, decision: 'reject' })}>
                      {tt('stalls.reject', 'Turn down')}
                    </button>
                  </>}
                  {(s.status === 'approved' || s.status === 'live') && confirming?.id !== s.id && (
                    <button type="button" className={styles.ghost} disabled={busy}
                            onClick={() => setConfirming({ id: s.id, decision: 'close' })}>
                      {tt('stalls.close', 'Close the stall')}
                    </button>
                  )}
                  {s.status === 'closed' && !s.purchase?.refunded_at && (
                    <button type="button" className={styles.ghost} disabled={busy}
                            onClick={() => decide(s, 'reopen')}>
                      {tt('stalls.reopen', 'Open it again')}
                    </button>
                  )}
                  {s.status === 'closed' && s.purchase?.refunded_at && (
                    <span className={styles.help}>
                      {tt('stalls.refunded', 'Turned down; {n} VC went back to them on {date}.')
                        .replace('{n}', formatNumber(s.purchase.price_vc))
                        .replace('{date}', formatDate(s.purchase.refunded_at))}
                    </span>
                  )}
                  {confirming?.id === s.id && <>
                    <button type="button" className={styles.danger} disabled={busy}
                            onClick={() => decide(s, confirming.decision)}>
                      {confirming.decision === 'reject'
                        ? (s.purchase?.price_vc
                          ? tt('stalls.rejectConfirmRefund', 'Turn down {name} and refund {n} VC?')
                            .replace('{n}', formatNumber(s.purchase.price_vc))
                          : tt('stalls.rejectConfirm', 'Turn down {name}?')).replace('{name}', s.name)
                        : tt('stalls.closeConfirm', 'Close {name}?').replace('{name}', s.name)}
                    </button>
                    <button type="button" className={styles.ghost} onClick={() => setConfirming(null)}>
                      {tt('slots.keep', 'Keep it')}
                    </button>
                  </>}
                </div>
              </li>
            ))}
          </ul>}
    </div>
  );
};

export default StallsReviewPanel;
