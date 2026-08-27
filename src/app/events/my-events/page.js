'use client';

// The events you run.
//
// There was no such page. Tournaments have /tournaments/my-tournaments; events
// had nothing, so once an organiser left the page they had just created, the
// only way back was to search the public listing for the name - and a retired
// event is not in that listing at all, which made it unreachable.
//
// Every row carries the three things an organiser actually wants: open it, edit
// it, and run the commercial side of it.

import { apiMessage } from '@/lib/apiMessage';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { LuCalendar, LuTicket, LuMapPin } from 'react-icons/lu';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './my-events.module.css';
import { useT, useLanguage } from '@/i18n/LanguageProvider';
const MyEventsPage = () => {
  const tt = useT();
  const {
    language
  } = useLanguage();
  const {
    data: session,
    status
  } = useSession();
  const token = session?.user?.sessionToken;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/my-events/`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const body = await res.json();
      if (body.status === 'success') setRows(body.data?.results || []);else setError(apiMessage(tt, body, 'api.couldNotLoadYourEvents', 'Could not load your events.'));
    } catch {
      setError(tt('msg.connectionError', 'Connection error.'));
    } finally {
      setLoading(false);
    }
  }, [token]);
  useEffect(() => {
    if (status !== 'loading') load();
  }, [status, load]);
  const when = row => {
    if (!row.start_date) return null;
    const from = new Date(row.start_date);
    return from.toLocaleDateString(language || undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };
  return <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      <main className={styles.mainContainer}>
        <Sidebar />
        <div className={styles.rightPane}>
          <div className={styles.headRow}>
            <div>
              <h1 className={styles.pageTitle}>{tt('myEvents.title', 'My events')}</h1>
              <p className={styles.pageSub}>
                {tt('myEvents.sub', 'Everything you run, including the ones that are not listed publicly.')}
              </p>
            </div>
            <Link href="/events/create-event" className={styles.createBtn}>
              {tt('myEvents.create', 'Create an event')}
            </Link>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          {loading ? <p className={styles.muted}>{tt('ui.loading', 'Loading…')}</p> : rows.length === 0 ? <div className={styles.emptyState}>
                <p className={styles.emptyTitle}>{tt('myEvents.emptyTitle', 'You have not created an event yet.')}</p>
                <p className={styles.muted}>
                  {tt('myEvents.emptyBody', 'When you do, it will be here with its tickets, its door list and its promo codes.')}
                </p>
                <Link href="/events/create-event" className={styles.createBtn}>
                  {tt('myEvents.create', 'Create an event')}
                </Link>
              </div> : <div className={styles.list}>
                {rows.map(row => {
            const ref = row.slug || row.id;
            return <div key={row.id} className={`${styles.card} ${row.is_active ? '' : styles.retired}`}>
                      <div className={styles.cardMain}>
                        <div className={styles.cardHead}>
                          <Link href={`/events/${ref}`} className={styles.name}>{row.name}</Link>
                          {!row.is_active && <span className={styles.badge}>{tt('myEvents.notListed', 'Not listed')}</span>}
                          {row.role === 'manager' && <span className={styles.badge}>{tt('myEvents.youHelpRun', 'You help run this')}</span>}
                          {row.organization && <span className={styles.org}>{row.organization}</span>}
                        </div>

                        <div className={styles.meta}>
                          {when(row) && <span><LuCalendar /> {when(row)}</span>}
                          {row.location && <span><LuMapPin /> {row.location}</span>}
                          <span>
                            <LuTicket />{' '}
                            {row.capacity ? `${row.tickets_sold} / ${row.capacity}` : row.tickets_sold}{' '}
                            {tt('myEvents.tickets', 'tickets')}
                          </span>
                          {row.game && <span>{row.game}{row.series ? ` · ${row.series}` : ''}</span>}
                        </div>
                      </div>

                      <div className={styles.actions}>
                        <Link href={`/events/${ref}`} className={styles.ghostBtn}>
                          {tt('myEvents.view', 'View')}
                        </Link>
                        <Link href={`/events/${ref}/attendees`} className={styles.ghostBtn}>
                          {tt('myEvents.doorList', 'Door list')}
                        </Link>
                        <Link href={`/events/${ref}/manage`} className={styles.primaryBtn}>
                          {tt('myEvents.manage', 'Influencers & promos')}
                        </Link>
                      </div>
                    </div>;
          })}
              </div>}
        </div>
      </main>
      <BottomMenu />
    </div>;
};
export default MyEventsPage;
