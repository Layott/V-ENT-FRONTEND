'use client';

import { useCallback, useEffect, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { formatDate, formatNumber } from '@/lib/datetime';
import { useViewer } from '@/lib/gating';
import styles from './delivery-log.module.css';

// How much a game has been used, by month (design section 14, item 8): linked
// players who played and game sessions played. Counted from the first session
// so either pricing model can be chosen later; nothing is charged for it.

const API = process.env.NEXT_PUBLIC_API_URL;

export default function UsagePanel({ slug }) {
  const tt = useT();
  const viewer = useViewer();
  const [months, setMonths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!viewer.token || !slug) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/partners/studios/${encodeURIComponent(slug)}/usage/`, {
        headers: { Authorization: `Bearer ${viewer.token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(apiMessage(tt, body, 'partners.studios.usage.loadFailed', 'Usage did not load.'));
        return;
      }
      setMonths(body.data?.months || []);
      setError('');
    } catch (err) {
      setError(apiMessage(tt, err, 'partners.studios.usage.loadFailed', 'Usage did not load.'));
    } finally {
      setLoading(false);
    }
  }, [viewer.token, slug, tt]);

  useEffect(() => {
    if (viewer.loading) return;
    if (!viewer.signedIn) {
      setLoading(false);
      return;
    }
    load();
  }, [viewer.loading, viewer.signedIn, load]);

  if (!viewer.signedIn) return null;

  return (
    <div>
      {loading && <p className={styles.muted}>{tt('ui.loading.b04b', 'Loading...')}</p>}
      {!loading && error && (
        <div className={styles.errorRow} role="alert">
          <p className={styles.error}>{error}</p>
          <button type="button" className={styles.resend} onClick={load}>{tt('common.tryAgain', 'Try again')}</button>
        </div>
      )}
      {!loading && !error && months.length === 0 && (
        <p className={styles.muted}>{tt('partners.studios.usage.empty', 'Nothing yet. The first game session starts the count.')}</p>
      )}
      {!loading && !error && months.length > 0 && (
        <ul className={styles.list}>
          {months.map(row => (
            <li key={row.month} className={styles.row}>
              <div className={styles.rowHead}>
                <span className={styles.what}>
                  {tt('partners.studios.usage.month', 'Month from {date}').replace('{date}', formatDate(row.month))}
                </span>
              </div>
              <p className={styles.meta}>
                {tt('partners.studios.usage.players', 'Players: {count}').replace('{count}', formatNumber(row.active_players))}
                {' · '}
                {tt('partners.studios.usage.sessions', 'Game sessions: {count}').replace('{count}', formatNumber(row.sessions))}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
