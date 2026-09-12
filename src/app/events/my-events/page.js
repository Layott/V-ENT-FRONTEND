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
import { formatDate, formatNumber } from '@/lib/datetime';
import { useAutoRefresh } from '@/lib/useLiveData';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { LuCalendar, LuTicket, LuMapPin } from 'react-icons/lu';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import DeleteControl from '@/components/delete-control/DeleteControl';
import styles from './my-events.module.css';
import { useT } from '@/i18n/LanguageProvider';
const MyEventsPage = () => {
  const tt = useT();
  const {
    data: session,
    status
  } = useSession();
  const token = session?.user?.sessionToken;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // The links that pay this person. An influencer's own side of an event:
  // until 12 September the organiser saw visits, sales and commission in the
  // console and the person doing the selling saw nothing at all.
  const [links, setLinks] = useState(null);
  const [copied, setCopied] = useState('');
  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!token) return;
    if (!quiet) setLoading(true);
    if (!quiet) setError('');
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
    // Separately, and never in the way of the list above: a failure here
    // leaves the section empty rather than the page.
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/referrals/mine/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const body = await res.json();
      if (body.status === 'success') setLinks(body.data);
    } catch {
      /* the section stays as it was */
    }
  }, [token]);
  const copyLink = async link => {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(link.code);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      /* the address is on the screen to select by hand */
    }
  };

  // Keeps itself current. One line, because load already exists and the
  // loop lives in useAutoRefresh. `quiet` is what stops a refresh flashing
  // the loading state over content somebody is reading.
  useAutoRefresh(() => load({ quiet: true }));
  useEffect(() => {
    if (status !== 'loading') load();
  }, [status, load]);
  // Through the one date helper, so a reader in Portuguese sees a Portuguese
  // date and the venue's day is the day shown.
  const when = row => (row.start_date ? formatDate(row.start_date) : null);
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
                          {(row.role === 'manager' || row.role === 'org') && <span className={styles.badge}>{tt('myEvents.youHelpRun', 'You help run this')}</span>}
                          {row.role === 'door' && <span className={styles.badge}>{tt('myEvents.youWorkTheDoor', 'You work the door')}</span>}
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
                        {/* The one action that was missing entirely. The edit
                            endpoint has existed for weeks with nothing calling
                            it, so an organiser who mistyped a venue had nowhere
                            to go. */}
                        {/* A door steward admits people and does nothing else
                            (permissions.may_work_the_door). Offering them Edit
                            and the console, both of which refuse them, is a
                            control somebody cannot use. */}
                        {row.role !== 'door' && <Link href={`/events/${ref}/edit`} className={styles.primaryBtn}>
                          {tt('myEvents.edit', 'Edit')}
                        </Link>}
                        <Link href={`/events/${ref}/attendees`} className={row.role === 'door' ? styles.primaryBtn : styles.ghostBtn}>
                          {tt('myEvents.doorList', 'Door list')}
                        </Link>
                        {row.role === 'door' && <Link href={`/events/scan?event=${ref}`} className={styles.ghostBtn}>
                          {tt('myEvents.scanner', 'Open the scanner')}
                        </Link>}
                        {row.role !== 'door' && <Link href={`/events/${ref}/manage`} className={styles.ghostBtn}>
                          {tt('myEvents.manage', 'Influencers & promos')}
                        </Link>}
                        {/* Only the person who made it, or the owner of the
                            organisation it belongs to. Somebody added to run
                            the door for one day is not somebody who removes
                            the event, which is what permissions.py has said
                            since it was written. */}
                        {row.role === 'owner' && (
                          <DeleteControl kind="event" reference={ref}
                                         name={row.name} token={token}
                                         className={styles.ghostBtn}
                                         onDeleted={() => {
                                           setRows(all => all.filter(x => x.id !== row.id));
                                         }} />
                        )}
                      </div>
                    </div>;
          })}
              </div>}

          {links && links.count > 0 && <section className={styles.linksSection} aria-labelledby="my-links-title">
              <h2 id="my-links-title" className={styles.sectionTitle}>{tt('myLinks.title', 'Links you sell through')}</h2>
              <p className={styles.pageSub}>
                {tt('myLinks.sub', 'Every link an organiser gave you, what it brought in, and what you are owed. Commission is paid into your wallet when the organiser settles the event.')}
              </p>
              <div className={styles.linkTotals}>
                <span>{tt('myLinks.sold', 'Tickets sold: {n}').replace('{n}', formatNumber(links.tickets_sold))}</span>
                <span>{tt('myLinks.owed', '{n} VC owed to you').replace('{n}', formatNumber(links.owed_vc))}</span>
                <span>{tt('myLinks.paid', '{n} VC paid so far').replace('{n}', formatNumber(links.paid_vc))}</span>
              </div>
              <div className={styles.list}>
                {links.results.map(link => <div key={link.id} className={`${styles.card} ${link.is_active ? '' : styles.retired}`}>
                    <div className={styles.cardMain}>
                      <div className={styles.cardHead}>
                        <Link href={`/events/${link.event.slug || link.event.event_id}`} className={styles.name}>{link.event.name}</Link>
                        <span className={styles.badge}>{link.code}</span>
                        {!link.claimed && <span className={styles.badge}>{tt('myLinks.unclaimed', 'Paid the day you sign up')}</span>}
                        {!link.is_active && <span className={styles.badge}>{tt('myLinks.off', 'Switched off')}</span>}
                      </div>
                      <div className={styles.meta}>
                        {link.event.start_date && <span><LuCalendar /> {formatDate(link.event.start_date)}</span>}
                        <span><LuTicket /> {tt('myLinks.row', 'Visits {visits}, sold {sold}').replace('{visits}', formatNumber(link.visits)).replace('{sold}', formatNumber(link.tickets_sold))}</span>
                        <span>{tt('myLinks.commission', '{pct}% of each ticket').replace('{pct}', String(link.commission_pct))}</span>
                        <span>{tt('myLinks.owedRow', '{owed} VC owed, {paid} VC paid').replace('{owed}', formatNumber(link.owed_vc)).replace('{paid}', formatNumber(link.paid_vc))}</span>
                        {link.allocation > 0 && <span>{tt('myLinks.allocation', '{left} of {all} set aside for you').replace('{left}', formatNumber(link.remaining)).replace('{all}', formatNumber(link.allocation))}</span>}
                      </div>
                      <p className={styles.linkUrl}>{link.url}</p>
                    </div>
                    <div className={styles.actions}>
                      <button type="button" className={styles.primaryBtn} onClick={() => copyLink(link)}>
                        {copied === link.code ? tt('myLinks.copied', 'Copied') : tt('myLinks.copy', 'Copy the link')}
                      </button>
                      <Link href={`/events/${link.event.slug || link.event.event_id}`} className={styles.ghostBtn}>
                        {tt('myEvents.view', 'View')}
                      </Link>
                    </div>
                  </div>)}
              </div>
            </section>}
        </div>
      </main>
      <BottomMenu />
    </div>;
};
export default MyEventsPage;
