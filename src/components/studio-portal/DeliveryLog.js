'use client';

import { useCallback, useEffect, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { formatDateTime } from '@/lib/datetime';
import { useViewer } from '@/lib/gating';
import { useAutoRefresh } from '@/lib/useLiveData';
import { deliveryErrorLabel, deliveryKindLabel, deliveryStatusLabel, studioEventLabel } from './studioLabels';
import styles from './delivery-log.module.css';

// What V-ENT sent a studio's servers, and what they answered (design section
// 14, item 5: "a delivery log the studio can read").
//
// Each row is one request: the event or session call, how many tries, the
// status code or the reason it failed, and the start of their server's answer,
// which is usually the thing a developer needs to see. "Send a test event"
// signs and sends a ping while the page waits, so a studio can prove its
// signature check before a real event ever arrives.

const API = process.env.NEXT_PUBLIC_API_URL;
const FILTERS = ['', 'delivered', 'pending', 'failed'];

export default function DeliveryLog({ slug, token }) {
  const tt = useT();
  const viewer = useViewer();
  const [filter, setFilter] = useState('');
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async ({ quiet = false, upTo = 1 } = {}) => {
    if (!token || !slug) return;
    if (!quiet) setLoading(true);
    try {
      const collected = [];
      let more = false;
      for (let n = 1; n <= upTo; n += 1) {
        const params = new URLSearchParams({ page: String(n) });
        if (filter) params.set('status', filter);
        const res = await fetch(`${API}/partners/studios/${encodeURIComponent(slug)}/deliveries/?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(apiMessage(tt, body, 'partners.studios.log.loadFailed', 'The delivery log did not load.'));
          return;
        }
        collected.push(...(body.data?.deliveries || []));
        more = Boolean(body.data?.has_more);
        if (!more) break;
      }
      setRows(collected);
      setHasMore(more);
      setError('');
    } catch (err) {
      setError(apiMessage(tt, err, 'partners.studios.log.loadFailed', 'The delivery log did not load.'));
    } finally {
      setLoading(false);
    }
  }, [token, slug, filter, tt]);

  useAutoRefresh(() => load({ quiet: true, upTo: page }));
  useEffect(() => {
    setPage(1);
    load();
  }, [load]);

  const act = async (path, key) => {
    setBusy(key);
    setNotice('');
    try {
      const res = await fetch(`${API}/partners/studios/${encodeURIComponent(slug)}/${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice(apiMessage(tt, body, 'partners.studios.log.sendFailed', 'That was not sent.'));
        return;
      }
      const row = body.data?.delivery;
      setNotice(row?.status === 'delivered'
        ? tt('partners.studios.log.arrived', 'Delivered: your server answered {code}.').replace('{code}', String(row.last_status_code))
        : tt('partners.studios.log.notArrived', 'Not delivered yet: {reason}. We will try again.').replace('{reason}', deliveryErrorLabel(tt, row?.last_error, row?.last_status_code)));
      await load({ quiet: true, upTo: page });
    } catch (err) {
      setNotice(apiMessage(tt, err, 'partners.studios.log.sendFailed', 'That was not sent.'));
    } finally {
      setBusy('');
    }
  };

  const more = async () => {
    const next = page + 1;
    setPage(next);
    await load({ quiet: true, upTo: next });
  };

  // Only ever mounted on a signed-in studio's own game page; said here too, so
  // the log never renders a control somebody signed out could press.
  if (!viewer.signedIn) return null;

  return (
    <div>
      <div className={styles.toolbar}>
        <div className={styles.filters} role="group" aria-label={tt('partners.studios.log.filter', 'Show')}>
          {FILTERS.map(value => (
            <button key={value || 'all'} type="button" aria-pressed={filter === value}
                    className={`${styles.filter} ${filter === value ? styles.filterOn : ''}`}
                    onClick={() => setFilter(value)}>
              {value ? deliveryStatusLabel(tt, value) : tt('partners.studios.log.all', 'All')}
            </button>
          ))}
        </div>
        <button type="button" className={styles.ping} onClick={() => act('ping/', 'ping')} disabled={busy !== ''}>
          {busy === 'ping' ? tt('partners.studios.log.sending', 'Sending...') : tt('partners.studios.log.ping', 'Send a test event')}
        </button>
      </div>

      {notice && <p className={styles.notice} role="status">{notice}</p>}
      {loading && <p className={styles.muted}>{tt('ui.loading.b04b', 'Loading...')}</p>}
      {!loading && error && (
        <div className={styles.errorRow} role="alert">
          <p className={styles.error}>{error}</p>
          <button type="button" className={styles.resend} onClick={() => load()}>{tt('common.tryAgain', 'Try again')}</button>
        </div>
      )}
      {!loading && !error && rows.length === 0 && (
        <p className={styles.muted}>{tt('partners.studios.log.empty', 'Nothing sent yet. Send a test event to see one here.')}</p>
      )}

      {!loading && !error && rows.length > 0 && (
        <ul className={styles.list}>
          {rows.map(row => (
            <li key={row.ref} className={styles.row}>
              <div className={styles.rowHead}>
                <span className={styles.what}>
                  {row.kind === 'event' ? studioEventLabel(tt, row.event) : deliveryKindLabel(tt, row.kind)}
                </span>
                <span className={`${styles.chip} ${styles[`chip_${row.status}`] || ''}`}>
                  {deliveryStatusLabel(tt, row.status)}
                </span>
              </div>
              <p className={styles.meta}>
                {formatDateTime(row.created_at)}
                {' · '}
                {tt('partners.studios.log.tries', 'Tries: {count}').replace('{count}', String(row.attempts))}
                {row.last_status_code ? ` · ${tt('partners.studios.log.code', 'Answered {code}').replace('{code}', String(row.last_status_code))}` : ''}
              </p>
              {row.last_error && row.status !== 'delivered' && (
                <p className={styles.reason}>{deliveryErrorLabel(tt, row.last_error, row.last_status_code)}</p>
              )}
              {row.status === 'pending' && row.next_attempt_at && (
                <p className={styles.meta}>
                  {tt('partners.studios.log.next', 'Next try {time}').replace('{time}', formatDateTime(row.next_attempt_at))}
                </p>
              )}
              {row.response_excerpt && <pre className={styles.excerpt}>{row.response_excerpt}</pre>}
              <code className={styles.ref}>{row.ref}</code>
              {row.status !== 'pending' && (
                <div className={styles.rowActions}>
                  <button type="button" className={styles.resend} disabled={busy !== ''}
                          onClick={() => act(`deliveries/${encodeURIComponent(row.ref)}/resend/`, row.ref)}>
                    {busy === row.ref ? tt('partners.studios.log.sending', 'Sending...') : tt('partners.studios.log.resend', 'Send again')}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && hasMore && (
        <button type="button" className={styles.resend} onClick={more}>
          {tt('partners.studios.log.more', 'Show older')}
        </button>
      )}
    </div>
  );
}
