'use client';

// Every stall this person runs.
//
// CEO, 7 September 2026: "run the vendor UI properly. build all screens."
//
// Until now there was no address on the platform that listed a stall you owned.
// Somebody bought a pitch, got a confirmation, and that was the end of it: the
// products endpoint existed and nothing on the site called it, which
// `tools/endpoint-callers.py` said out loud the day after it shipped.
//
// This is the way in. The stall itself is at `/my-stalls/<slug>`.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/sidebar/Sidebar';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import Avatar from '@/components/avatar/Avatar';
import { apiMessage } from '@/lib/apiMessage';
import { useAutoRefresh } from '@/lib/useLiveData';
import { formatDate, formatNumber } from '@/lib/datetime';
import { mediaUrl } from '@/lib/mediaUrl';
import { useT } from '@/i18n/LanguageProvider';
import styles from './my-stalls.module.css';

const STATUS_KEY = {
  pending: ['stall.statusPending', 'Waiting for the organiser'],
  approved: ['stall.statusApproved', 'Approved'],
  live: ['stall.statusLive', 'Open'],
  closed: ['stall.statusClosed', 'Closed'],
};

const MyStallsPage = () => {
  const tt = useT();
  const { data: session, status } = useSession();
  const token = session?.user?.sessionToken;
  const [stalls, setStalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/my-stalls/`,
                              { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json().catch(() => null);
      if (body?.status === 'success') setStalls(body.data.stalls || []);
      else setError(apiMessage(tt, body, 'api.somethingWentWrong', 'Something went wrong.'));
    } catch (err) {
      setError(apiMessage(tt, err, 'api.somethingWentWrong', 'Something went wrong.'));
    } finally {
      setLoading(false);
    }
    // `tt` is deliberately not a dependency: it changes identity on every
    // render and would re-fetch the list for ever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    // Decide nothing while the session is still resolving, or a signed-in
    // person sees the signed-out message for a moment.
    if (status === 'loading') return;
    if (!token) { setLoading(false); return; }
    load();
  }, [status, token, load]);

  // The counts move on their own: an organiser approving a stall, an order
  // arriving. Nothing here is being typed into, so a refresh costs nothing.
  useAutoRefresh(() => { if (token) load(); });

  return (
    <div className={styles.page}>
      <Header />
      <MobileHeader />
      <main className={styles.main}>
        <Sidebar />
        <div className={styles.content}>
          <h1 className={styles.title}>{tt('stall.myStalls', 'My stalls')}</h1>
          <p className={styles.blurb}>
            {tt('stall.myStallsBlurb', 'The stalls you run. Open one to add what you '
              + 'sell, change a price, and see what people have ordered.')}
          </p>

          {status !== 'loading' && !token && (
            <p className={styles.empty}>
              {tt('stall.signIn', 'Sign in to see the stalls you run.')}
            </p>
          )}

          {loading && token && (
            <p className={styles.empty}>{tt('stall.loading', 'Loading your stalls...')}</p>
          )}

          {error && <p className={styles.error}>{error}</p>}

          {!loading && token && !error && stalls.length === 0 && (
            <div className={styles.emptyBox}>
              <p className={styles.empty}>
                {tt('stall.none', 'You do not run a stall yet. Buy a pitch on an event '
                  + 'you want to trade at, or wait for an organiser to invite you.')}
              </p>
              <Link href="/events" className={styles.primary}>
                {tt('stall.findEvents', 'Find an event')}
              </Link>
            </div>
          )}

          <ul className={styles.list}>
            {stalls.map((s) => {
              const [key, fallback] = STATUS_KEY[s.status] || STATUS_KEY.pending;
              return (
                <li key={s.id} className={styles.card}>
                  <Avatar src={mediaUrl(s.logo)} name={s.name} size={48} rounded={false} />
                  <div className={styles.cardBody}>
                    <Link href={`/my-stalls/${encodeURIComponent(s.slug)}`}
                          className={styles.name}>
                      {s.name}
                    </Link>
                    <p className={styles.meta}>
                      {s.event?.name}
                      {s.event?.start_date ? ` · ${formatDate(s.event.start_date)}` : ''}
                    </p>
                    <p className={styles.meta}>
                      <span className={s.status === 'closed' ? styles.pillOff : styles.pillOn}>
                        {tt(key, fallback)}
                      </span>
                      {' '}
                      {tt('stall.productCount', '{n} on sale')
                        .replace('{n}', formatNumber(s.product_count))}
                      {s.open_orders > 0 && ` · ${tt('stall.openOrders', '{n} to fulfil')
                        .replace('{n}', formatNumber(s.open_orders))}`}
                    </p>
                  </div>
                  <Link href={`/my-stalls/${encodeURIComponent(s.slug)}`}
                        className={styles.open}>
                    {tt('stall.open', 'Open')}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </main>
      <BottomMenu />
    </div>
  );
};

export default MyStallsPage;
