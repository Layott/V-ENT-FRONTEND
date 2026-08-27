'use client';

// The exchange rates, and how old each one is.
//
// They were seeded by hand and went stale immediately: the seeded cedi rate was
// 0.0098 when the real one was 0.00827, a 15 per cent error on every price a
// Ghanaian reader saw. Nothing on the platform showed that, because a stale rate
// looks exactly like a good one.
//
// So the age of each rate is the first thing on the row. A refresh pulls the
// published feed; typing one is for when the feed is wrong or unreachable.
//
// These change what somebody READS. Money moves in naira, and the page says so,
// because an admin who thinks they are setting a charge would be setting the
// wrong thing entirely.

import { apiMessage } from '@/lib/apiMessage';
import { useState, useEffect, useCallback } from 'react';
import { appLocale } from '@/lib/appLocale';
import AdminNav from '@/components/admin/AdminNav';
import AdminHeader from '@/components/admin/AdminHeader';
import { useAdminAuth } from '@/components/admin/useAdminAuth';
import { AdminToastProvider, useAdminToast } from '@/components/admin/AdminToast';
import shared from '@/components/admin/admin.module.css';
import styles from './rates.module.css';
import { useT } from '@/i18n/LanguageProvider';
const DAY = 24 * 60 * 60 * 1000;
function RatesInner() {
  const tt = useT();
  const {
    admin,
    loading: authLoading,
    logout
  } = useAdminAuth();
  const toast = useAdminToast();
  const [rows, setRows] = useState([]);
  const [feed, setFeed] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const call = useCallback(async (path, options = {}) => {
    const token = localStorage.getItem('adminToken');
    let res;
    try {
      res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/admin${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? {
          'Content-Type': 'application/json'
        } : {}),
        ...(options.headers || {})
      }
      });
    } catch {
      // A request that never arrives has to end somewhere, or the page sits on
      // "Loading..." for ever and reads as a slow server rather than a broken
      // connection.
      return {
        ok: false,
        body: { status: 'error', code: 'NETWORK_UNREACHABLE', message: 'Could not reach the server.' },
      };
    }
    let body = {};
    try {
      body = await res.json();
    } catch {
      body = {};
    }
    return {
      ok: res.ok && body.status === 'success',
      body
    };
  }, []);
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const {
      ok,
      body
    } = await call('/rates/');
    if (ok) {
      setRows(body.data?.results || []);
      setFeed(body.data?.feed || '');
    } else setError(apiMessage(tt, body, 'api.failedToLoadRates', 'Could not load the rates.'));
    setLoading(false);
  }, [call]);
  useEffect(() => {
    if (!authLoading && admin) load();
  }, [authLoading, admin, load]);
  const refresh = async () => {
    setBusy(true);
    const {
      ok,
      body
    } = await call('/rates/refresh/', {
      method: 'POST'
    });
    setBusy(false);
    if (ok) {
      // The server's own wording is English. It is a count, so it translates
      // here rather than arriving already-worded.
      const n = body.data?.updated ?? 0;
      toast.push(tt('admin.ratesRefreshed', '{n} rates updated.').replace('{n}', n), 'success');
      (body.data?.skipped || []).forEach(s => toast.push(s, 'error'));
      await load();
      return;
    }
    // A failed refresh is not a broken page: the old rates are still there and
    // still shown, so say what happened and leave them be.
    toast.push(apiMessage(tt, body, 'api.ratesFeedUnavailable', 'The rates service could not be reached. The rates already here have been left alone.'), 'error');
  };
  const setRate = async (row, value) => {
    setBusy(true);
    const {
      ok,
      body
    } = await call(`/rates/${row.code}/`, {
      method: 'PATCH',
      body: JSON.stringify({
        rate_from_ngn: value
      })
    });
    setBusy(false);
    if (ok) {
      toast.push(tt('admin.rateSaved', 'Rate saved.'), 'success');
      await load();
    } else toast.push(apiMessage(tt, body, 'api.failed', 'Failed.'), 'error');
  };
  const toggle = async row => {
    setBusy(true);
    const {
      ok,
      body
    } = await call(`/rates/${row.code}/`, {
      method: 'PATCH',
      body: JSON.stringify({
        is_active: !row.is_active
      })
    });
    setBusy(false);
    if (ok) {
      await load();
    } else toast.push(apiMessage(tt, body, 'api.failed', 'Failed.'), 'error');
  };

  /** How old a rate is, said plainly. A number nobody can date is a number
   *  nobody can trust. */
  const age = iso => {
    if (!iso) return tt('admin.rateNever', 'never');
    const then = new Date(iso).getTime();
    const days = Math.floor((Date.now() - then) / DAY);
    if (days <= 0) return tt('admin.rateToday', 'today');
    if (days === 1) return tt('admin.rateYesterday', 'yesterday');
    return tt('admin.rateDaysAgo', '{n} days ago').replace('{n}', days);
  };
  const isStale = iso => !iso || Date.now() - new Date(iso).getTime() > 3 * DAY;
  if (authLoading) return null;
  return <div className={shared.pageContainer}>
      <div className={`${shared.sidebarOverlay} ${sidebarOpen ? shared.open : ''}`} onClick={() => setSidebarOpen(false)} />
      <AdminNav admin={admin} onLogout={logout} sidebarOpen={sidebarOpen} badges={{}} />
      <div className={shared.mainContainer}>
        <AdminHeader admin={admin} onLogout={logout} onMenuOpen={() => setSidebarOpen(true)} />
        <main className={shared.contentArea}>
          <div className={shared.pageHeader}>
            <div>
              <h1 className={shared.pageTitle}>{tt('admin.ratesTitle', 'Exchange rates')}</h1>
              <p className={shared.pageSubtitle}>
                {tt('admin.ratesSubtitle', 'What one naira buys, for showing prices in other currencies.')}
              </p>
            </div>
            <button type="button" className={styles.refreshBtn} disabled={busy || loading} onClick={refresh}>
              {busy ? tt('admin.ratesRefreshing', 'Fetching…') : tt('admin.ratesRefresh', 'Refresh from the feed')}
            </button>
          </div>

          {error && <p className={shared.errorText}>{error}</p>}

          <div className={shared.card}>
            <p className={styles.hint}>
              {tt('admin.ratesHint', 'These change what people READ, never what they are charged: money moves in naira through Paystack, and a VENT COIN is a naira amount. Rates refresh nightly from the feed; type one only when the feed is wrong or unreachable.')}
            </p>
            {feed && <p className={styles.feed}>{tt('admin.ratesFeed', 'Feed')}: <code>{feed}</code></p>}

            {loading ? <p className={shared.stateText}>{tt('ui.loading.33ce', 'Loading…')}</p> : <div className={styles.rows}>
                  {rows.map(row => <div key={row.code} className={`${styles.row} ${row.is_active ? '' : styles.off}`}>
                      <div className={styles.who}>
                        <strong className={styles.code}>{row.code}</strong>
                        <span className={styles.name}>{row.name}</span>
                        <span className={styles.symbol}>{row.symbol}</span>
                      </div>

                      <div className={styles.rateBox}>
                        {row.code === 'NGN' ? <span className={styles.baseNote}>{tt('admin.rateBase', 'the base')}</span> : <input className={styles.rateInput} type="number" step="0.00000001" min="0" defaultValue={row.rate_from_ngn} disabled={busy} onBlur={e => {
                    const next = e.target.value;
                    if (next && Number(next) !== Number(row.rate_from_ngn)) setRate(row, next);
                  }} />}
                      </div>

                      <span className={`${styles.age} ${isStale(row.rate_updated) && row.code !== 'NGN' ? styles.stale : ''}`}>
                        {tt('admin.rateUpdated', 'updated {when}').replace('{when}', age(row.rate_updated))}
                      </span>

                      <span className={styles.example}>
                        {row.code !== 'NGN' && tt('admin.rateExample', '₦10,000 reads as {amount}').replace('{amount}', `${row.symbol}${(10000 * Number(row.rate_from_ngn)).toLocaleString(appLocale(), {
                    maximumFractionDigits: 2
                  })}`)}
                      </span>

                      {row.code !== 'NGN' && <button type="button" className={styles.ghostBtn} disabled={busy} onClick={() => toggle(row)}>
                          {row.is_active ? tt('admin.rateHide', 'Hide') : tt('admin.rateShow', 'Show')}
                        </button>}
                    </div>)}
                </div>}
          </div>
        </main>
      </div>
    </div>;
}
export default function AdminRatesPage() {
  return <AdminToastProvider>
      <RatesInner />
    </AdminToastProvider>;
}
