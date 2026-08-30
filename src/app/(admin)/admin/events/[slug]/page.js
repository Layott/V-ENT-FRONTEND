'use client';

/**
 * One event, from the console.
 *
 * CEO, 30 August 2026: "For admin section we should be able to fully manage
 * events also and tickets and sese the full details about what was sent out by
 * tournament organizers and event managers also."
 *
 * The list page could show that an event existed and let an admin correct its
 * fields. It could not show what the event had actually done - how many people
 * hold tickets, how many arrived, how much was taken - and it could not touch a
 * single ticket or show a word of what the organiser had sent to the people
 * holding them.
 *
 * Three tabs, in the order somebody actually needs them: the numbers, the
 * tickets, and the post.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import AdminNav from '@/components/admin/AdminNav';
import AdminHeader from '@/components/admin/AdminHeader';
import { useAdminAuth } from '@/components/admin/useAdminAuth';
import { AdminToastProvider, useAdminToast } from '@/components/admin/AdminToast';
import shared from '@/components/admin/admin.module.css';
import styles from './event-detail.module.css';
import { apiMessage } from '@/lib/apiMessage';
import { appLocale } from '@/lib/appLocale';
import { useT } from '@/i18n/LanguageProvider';

const TABS = ['overview', 'tickets', 'sent'];
const PAGE_SIZE = 25;

const when = iso => (iso
  ? new Date(iso).toLocaleString(appLocale(), {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  : '-');

function AdminEventDetailInner() {
  const tt = useT();
  const { slug } = useParams();
  const { admin, loading: authLoading, logout } = useAdminAuth();
  const toast = useAdminToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // The same permission the server checks, so a control is never offered to an
  // admin the API would refuse. Reading is open to every admin role; cancelling
  // an event and voiding a ticket are not.
  const mayAct = !!admin?.permissions?.manage_events;
  const api = process.env.NEXT_PUBLIC_API_URL;

  const [tab, setTab] = useState('overview');
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const [tickets, setTickets] = useState({ results: [], count: 0 });
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketStatus, setTicketStatus] = useState('');
  const [ticketPage, setTicketPage] = useState(1);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  const [sent, setSent] = useState(null);
  const [sentLoading, setSentLoading] = useState(false);

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
  }), []);

  const loadDetail = useCallback(async () => {
    try {
      const res = await fetch(`${api}/auth/admin/events/${slug}/`, { headers: headers() });
      const body = await res.json();
      if (!res.ok) {
        setError(apiMessage(tt, body, 'admin.couldNotLoadEvent', 'Could not load that event.'));
        return;
      }
      setDetail(body.data);
      setError('');
    } catch {
      setError(tt('msg.couldNotReachServer', 'Could not reach the server. Try again.'));
    } finally {
      setLoading(false);
    }
  }, [api, slug, headers, tt]);

  useEffect(() => { if (!authLoading) loadDetail(); }, [authLoading, loadDetail]);

  const loadTickets = useCallback(async () => {
    if (authLoading) return;
    setTicketsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(ticketPage), page_size: String(PAGE_SIZE) });
      if (ticketSearch.trim()) params.set('search', ticketSearch.trim());
      if (ticketStatus) params.set('status', ticketStatus);
      const res = await fetch(`${api}/auth/admin/events/${slug}/tickets/?${params}`, { headers: headers() });
      const body = await res.json();
      if (res.ok) setTickets(body.data);
    } catch {
      toast.push(tt('msg.couldNotReachServer', 'Could not reach the server. Try again.'), 'error');
    } finally {
      setTicketsLoading(false);
    }
  }, [authLoading, api, slug, headers, ticketPage, ticketSearch, ticketStatus, toast, tt]);

  useEffect(() => { if (tab === 'tickets') loadTickets(); }, [tab, loadTickets]);

  const loadSent = useCallback(async () => {
    if (authLoading) return;
    setSentLoading(true);
    try {
      const res = await fetch(`${api}/auth/admin/events/${slug}/sent/`, { headers: headers() });
      const body = await res.json();
      if (res.ok) setSent(body.data);
    } catch {
      toast.push(tt('msg.couldNotReachServer', 'Could not reach the server. Try again.'), 'error');
    } finally {
      setSentLoading(false);
    }
  }, [authLoading, api, slug, headers, toast, tt]);

  useEffect(() => { if (tab === 'sent' && sent === null) loadSent(); }, [tab, sent, loadSent]);

  // A cancel and a void both take something away from somebody, so both ask for
  // a reason rather than a confirmation. Typing why is a better pause than
  // pressing OK, and it is the thing the audit log needs anyway.
  //
  // Asked in the page rather than with `window.prompt`: a native prompt blocks
  // the whole tab until it is answered, cannot be styled, and reads as a
  // browser warning rather than as part of the console.
  const [asking, setAsking] = useState(null);   // {kind, code, question}
  const [reasonText, setReasonText] = useState('');

  const ask = (kind, code, question) => {
    setReasonText('');
    setAsking({ kind, code, question });
  };

  const confirmAsked = async () => {
    const reason = reasonText.trim();
    if (!reason) {
      toast.push(tt('admin.reasonRequired', 'A reason is required.'), 'error');
      return;
    }
    const { kind, code } = asking;
    setAsking(null);
    if (kind === 'cancelEvent') await setEventState('cancel', reason);
    else await ticketAction(code, 'void', reason);
  };

  const setEventState = async (action, reason = '') => {
    setBusy('state');
    try {
      const res = await fetch(`${api}/auth/admin/events/${slug}/state/`, {
        method: 'POST', headers: headers(), body: JSON.stringify({ action, reason }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.push(apiMessage(tt, body, 'admin.thatDidNotWork', 'That did not work.'), 'error');
        return;
      }
      toast.push(action === 'cancel'
        ? tt('admin.eventCancelled', 'Event cancelled.')
        : tt('admin.eventRestored', 'Event restored.'));
      await loadDetail();
    } catch {
      toast.push(tt('msg.couldNotReachServer', 'Could not reach the server. Try again.'), 'error');
    } finally {
      setBusy('');
    }
  };

  const ticketAction = async (code, action, reason = '') => {
    setBusy(code);
    try {
      const res = await fetch(`${api}/auth/admin/tickets/${encodeURIComponent(code)}/action/`, {
        method: 'POST', headers: headers(), body: JSON.stringify({ action, reason }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.push(apiMessage(tt, body, 'admin.thatDidNotWork', 'That did not work.'), 'error');
        return;
      }
      toast.push(action === 'void'
        ? tt('admin.ticketVoided', 'Ticket voided and the seat returned.')
        : tt('admin.ticketReinstated', 'Ticket reinstated.'));
      // Both lists move: the ticket's status, and the event's counts.
      await Promise.all([loadTickets(), loadDetail()]);
    } catch {
      toast.push(tt('msg.couldNotReachServer', 'Could not reach the server. Try again.'), 'error');
    } finally {
      setBusy('');
    }
  };

  if (authLoading) return null;

  const event = detail?.event;
  const numbers = detail?.numbers;
  const pages = Math.max(1, Math.ceil((tickets.count || 0) / PAGE_SIZE));

  return (
    <div className={shared.pageContainer}>
      <div className={`${shared.sidebarOverlay} ${sidebarOpen ? shared.open : ''}`}
        onClick={() => setSidebarOpen(false)} />
      <AdminNav admin={admin} onLogout={logout} sidebarOpen={sidebarOpen} badges={{}} />
      <div className={shared.mainContainer}>
        <AdminHeader admin={admin} onLogout={logout} onMenuOpen={() => setSidebarOpen(true)} />
        <main className={shared.contentArea}>
          <Link href="/admin/events" className={styles.back}>
            {tt('admin.backToEvents', 'Back to events')}
          </Link>

          {loading && <p className={shared.stateText}>{tt('ui.loading.33ce', 'Loading...')}</p>}
          {!loading && error && <p className={shared.errorText}>{error}</p>}

          {!loading && !error && event && <>
            <div className={styles.headerRow}>
              <div>
                <h1 className={styles.title}>{event.name}</h1>
                <p className={styles.sub}>
                  {event.organizer?.username || '-'}
                  {event.location ? ` · ${event.location}` : ''}
                  {` · ${when(event.start_date)}`}
                </p>
              </div>
              <div className={styles.headerActions}>
                {mayAct && (event.is_active
                  ? <button className={`${shared.actBtn} ${shared.actBan}`} onClick={() => ask('cancelEvent', null, tt('admin.whyCancelEvent', 'Why is this event being cancelled?'))} disabled={busy === 'state'}>
                      {tt('admin.cancelEvent', 'Cancel event')}
                    </button>
                  : <button className={`${shared.actBtn} ${shared.actView}`} onClick={() => setEventState('restore')} disabled={busy === 'state'}>
                      {tt('admin.restoreEvent', 'Restore event')}
                    </button>)}
              </div>
            </div>

            {!event.is_active && <p className={styles.cancelledNote}>
              {tt('admin.eventIsCancelled', 'This event is cancelled. It stops selling and stops being listed, and its page keeps answering so ticket holders find out what happened.')}
            </p>}

            {asking && <div className={styles.askPanel}>
              <label className={styles.askLabel} htmlFor="admin-reason">{asking.question}</label>
              <input id="admin-reason" className={styles.askInput} value={reasonText}
                autoFocus maxLength={300}
                onChange={e => setReasonText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') confirmAsked(); if (e.key === 'Escape') setAsking(null); }} />
              <div className={styles.askActions}>
                <button className={`${shared.actBtn} ${shared.actBan}`} onClick={confirmAsked} disabled={!reasonText.trim()}>
                  {tt('admin.confirm', 'Confirm')}
                </button>
                <button className={`${shared.actBtn} ${shared.actView}`} onClick={() => setAsking(null)}>
                  {tt('ui.cancel.77df', 'Cancel')}
                </button>
              </div>
            </div>}

            <div className={styles.tabs}>
              {TABS.map(id => <button key={id} type="button"
                className={`${styles.tab} ${tab === id ? styles.tabOn : ''}`}
                onClick={() => setTab(id)}>
                {id === 'overview' ? tt('admin.tabOverview', 'Overview')
                  : id === 'tickets' ? tt('admin.tabTickets', 'Tickets')
                  : tt('admin.tabSent', 'What was sent')}
              </button>)}
            </div>

            {tab === 'overview' && <Overview tt={tt} numbers={numbers} detail={detail} />}

            {tab === 'tickets' && <div className={shared.card}>
              <div className={shared.filtersRow}>
                <input className={shared.filterSelect} value={ticketSearch}
                  placeholder={tt('admin.searchTicket', 'Code, name or email')}
                  onChange={e => { setTicketPage(1); setTicketSearch(e.target.value); }} />
                <select className={shared.filterSelect} value={ticketStatus}
                  onChange={e => { setTicketPage(1); setTicketStatus(e.target.value); }}>
                  <option value="">{tt('ui.all.statuses.9cb2', 'All Statuses')}</option>
                  <option value="valid">{tt('admin.ticketValid', 'Valid')}</option>
                  <option value="checked_in">{tt('admin.ticketCheckedIn', 'Checked in')}</option>
                  <option value="refunded">{tt('admin.ticketRefunded', 'Refunded')}</option>
                  <option value="cancelled">{tt('admin.ticketVoid', 'Void')}</option>
                  <option value="comped">{tt('admin.ticketComped', 'Given free')}</option>
                </select>
                <span className={shared.resultsCount}>
                  {(tickets.count === 1
                    ? tt('admin.countTicketsOne', '{n} ticket')
                    : tt('admin.countTicketsMany', '{n} tickets')).replace('{n}', String(tickets.count || 0))}
                </span>
              </div>

              {ticketsLoading ? <p className={shared.stateText}>{tt('ui.loading.33ce', 'Loading...')}</p>
                : tickets.results.length === 0 ? <p className={shared.stateText}>{tt('admin.noTicketsFound', 'No tickets match that.')}</p>
                : <div className={shared.tableWrap}>
                  <table className={shared.table}>
                    <thead>
                      <tr>
                        <th>{tt('admin.ticketCode', 'Code')}</th>
                        <th>{tt('admin.attendee', 'Attendee')}</th>
                        <th className={shared.hideMobile}>{tt('admin.tier', 'Tier')}</th>
                        <th>{tt('ui.status.bae7', 'Status')}</th>
                        <th className={shared.hideMobile}>{tt('admin.bought', 'Bought')}</th>
                        <th>{tt('ui.actions.5b5d', 'Actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.results.map(t => <tr key={t.code}>
                        <td className={styles.mono}>{t.code}</td>
                        <td>
                          <div className={styles.attName}>{t.attendee_name || '-'}</div>
                          <div className={styles.attMeta}>
                            {t.attendee_email || '-'}
                            {t.is_guest ? ` · ${tt('admin.guest', 'Guest')}` : ''}
                            {t.comped_by ? ` · ${tt('admin.givenBy', 'given by {who}').replace('{who}', t.comped_by)}` : ''}
                          </div>
                        </td>
                        <td className={shared.hideMobile}>{t.tier || '-'}</td>
                        <td><span className={styles[`s_${t.status}`] || styles.s_valid}>{ticketStatusWord(tt, t.status)}</span></td>
                        <td className={shared.hideMobile}>{when(t.purchased_at)}</td>
                        <td>
                          <div className={shared.actGroup}>
                            {!mayAct ? <span className={styles.attMeta}>-</span>
                              : t.status === 'cancelled'
                              ? <button className={`${shared.actBtn} ${shared.actView}`} disabled={busy === t.code}
                                  onClick={() => ticketAction(t.code, 'reinstate')}>
                                  {tt('admin.reinstate', 'Reinstate')}
                                </button>
                              : <button className={`${shared.actBtn} ${shared.actBan}`} disabled={busy === t.code}
                                  onClick={() => ask('voidTicket', t.code, tt('admin.whyVoidTicket', 'Why is this ticket being voided?'))}>
                                  {tt('admin.void', 'Void')}
                                </button>}
                          </div>
                        </td>
                      </tr>)}
                    </tbody>
                  </table>
                </div>}

              {pages > 1 && <div className={shared.pagination}>
                <button className={shared.pageBtn} onClick={() => setTicketPage(p => Math.max(1, p - 1))} disabled={ticketPage === 1}>&lsaquo;</button>
                <span className={shared.resultsCount}>{ticketPage} / {pages}</span>
                <button className={shared.pageBtn} onClick={() => setTicketPage(p => Math.min(pages, p + 1))} disabled={ticketPage === pages}>&rsaquo;</button>
              </div>}
            </div>}

            {tab === 'sent' && <WhatWasSent tt={tt} sent={sent} loading={sentLoading} />}
          </>}
        </main>
      </div>
    </div>
  );
}

const Overview = ({ tt, numbers, detail }) => (
  <>
    <div className={styles.stats}>
      <Stat label={tt('admin.ticketsIssued', 'Tickets issued')} value={numbers.tickets} />
      <Stat label={tt('admin.ticketValid', 'Valid')} value={numbers.valid} />
      <Stat label={tt('admin.ticketCheckedIn', 'Checked in')} value={numbers.checked_in} />
      <Stat label={tt('admin.ticketComped', 'Given free')} value={numbers.comped} />
      <Stat label={tt('admin.ticketRefunded', 'Refunded')} value={numbers.refunded} />
      <Stat label={tt('admin.ticketVoid', 'Void')} value={numbers.cancelled} />
      <Stat label={tt('admin.revenueVc', 'Revenue (VC)')} value={numbers.revenue_vc} />
      <Stat label={tt('admin.capacity', 'Capacity')} value={numbers.capacity ?? '-'} />
    </div>

    <div className={shared.card}>
      <h2 className={styles.cardTitle}>{tt('admin.tiers', 'Tiers')}</h2>
      {detail.tiers.length === 0
        ? <p className={shared.stateText}>{tt('admin.noTiers', 'This event has no ticket tiers.')}</p>
        : <div className={shared.tableWrap}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>{tt('admin.tier', 'Tier')}</th>
                <th>{tt('admin.price', 'Price')}</th>
                <th>{tt('admin.sold', 'Sold')}</th>
                <th>{tt('admin.left', 'Left')}</th>
              </tr>
            </thead>
            <tbody>
              {detail.tiers.map(t => <tr key={t.id}>
                <td>{t.name}</td>
                <td>{t.price_ngn}</td>
                <td>{t.sold}</td>
                <td>{t.remaining === null ? tt('admin.unlimited', 'No limit') : t.remaining}</td>
              </tr>)}
            </tbody>
          </table>
        </div>}
    </div>

    <div className={shared.card}>
      <h2 className={styles.cardTitle}>{tt('admin.whoRunsIt', 'Who runs it')}</h2>
      {detail.managers.length === 0
        ? <p className={shared.stateText}>{tt('admin.organiserAlone', 'The organiser runs this one alone.')}</p>
        : <ul className={styles.plainList}>
          {detail.managers.map(m => <li key={m.user?.user_id} className={styles.plainRow}>
            <span className={styles.attName}>{m.user?.full_name || m.user?.username}</span>
            <span className={styles.attMeta}>
              {m.role === 'door' ? tt('admin.roleDoor', 'Door staff') : tt('admin.roleManager', 'Manager')}
              {m.added_by ? ` · ${tt('admin.addedBy', 'added by {who}').replace('{who}', m.added_by.username)}` : ''}
            </span>
          </li>)}
        </ul>}
    </div>
  </>
);

const WhatWasSent = ({ tt, sent, loading }) => {
  if (loading || !sent) return <p className={shared.stateText}>{tt('ui.loading.33ce', 'Loading...')}</p>;
  return <>
    <div className={shared.card}>
      <h2 className={styles.cardTitle}>{tt('admin.announcements', 'Announcements')}</h2>
      <p className={styles.cardSub}>
        {tt('admin.announcementsSub', 'Messages the organiser sent to everybody holding a ticket. These cannot be edited, here or anywhere: the recipients already have the text in their inbox.')}
      </p>
      {sent.announcements.length === 0
        ? <p className={shared.stateText}>{tt('admin.noAnnouncements', 'Nothing has been sent about this event.')}</p>
        : <ul className={styles.plainList}>
          {sent.announcements.map(a => <li key={a.id} className={styles.announcement}>
            <div className={styles.annTop}>
              <span className={styles.attName}>{a.subject}</span>
              <span className={styles.attMeta}>
                {tt('admin.toNPeople', 'to {n}').replace('{n}', String(a.recipients))} · {when(a.sent_at)}
              </span>
            </div>
            <div className={styles.attMeta}>
              {a.sent_by?.username || '-'} · {audienceWord(tt, a.audience)}
            </div>
            <p className={styles.annBody}>{a.body}</p>
            {a.email_error && <p className={styles.annError}>
              {tt('admin.sendProblem', 'Sending had a problem: {err}').replace('{err}', a.email_error)}
            </p>}
          </li>)}
        </ul>}
    </div>

    <div className={shared.card}>
      <h2 className={styles.cardTitle}>{tt('admin.freeTickets', 'Tickets given away')}</h2>
      {sent.comped_tickets.length === 0
        ? <p className={shared.stateText}>{tt('admin.noFreeTickets', 'No free tickets have been handed out.')}</p>
        : <div className={shared.tableWrap}>
          <table className={shared.table}>
            <thead>
              <tr>
                <th>{tt('admin.ticketCode', 'Code')}</th>
                <th>{tt('admin.wentTo', 'Went to')}</th>
                <th className={shared.hideMobile}>{tt('admin.givenByColumn', 'Given by')}</th>
                <th className={shared.hideMobile}>{tt('admin.note', 'Note')}</th>
                <th>{tt('ui.status.bae7', 'Status')}</th>
              </tr>
            </thead>
            <tbody>
              {sent.comped_tickets.map(c => <tr key={c.code}>
                <td className={styles.mono}>{c.code}</td>
                <td>
                  <div className={styles.attName}>{c.to_name || '-'}</div>
                  <div className={styles.attMeta}>{c.to_email || '-'}</div>
                </td>
                <td className={shared.hideMobile}>{c.given_by || '-'}</td>
                <td className={shared.hideMobile}>{c.note || '-'}</td>
                <td><span className={styles[`s_${c.status}`] || styles.s_valid}>{ticketStatusWord(tt, c.status)}</span></td>
              </tr>)}
            </tbody>
          </table>
        </div>}
    </div>

    <div className={shared.card}>
      <h2 className={styles.cardTitle}>{tt('admin.vendorInvites', 'Vendors invited')}</h2>
      {sent.vendor_invites.length === 0
        ? <p className={shared.stateText}>{tt('admin.noVendorInvites', 'No vendors have been invited.')}</p>
        : <ul className={styles.plainList}>
          {sent.vendor_invites.map(v => <li key={v.id} className={styles.plainRow}>
            <span className={styles.attName}>{v.name}</span>
            <span className={styles.attMeta}>
              {v.email || '-'}{v.booth ? ` · ${tt('admin.booth', 'booth {b}').replace('{b}', v.booth)}` : ''}
            </span>
          </li>)}
        </ul>}
    </div>
  </>;
};

const Stat = ({ label, value }) => (
  <div className={styles.stat}>
    <span className={styles.statValue}>{value}</span>
    <span className={styles.statLabel}>{label}</span>
  </div>
);

// The API's status values are its own vocabulary, not something to print.
const ticketStatusWord = (tt, s) => ({
  valid: tt('admin.ticketValid', 'Valid'),
  checked_in: tt('admin.ticketCheckedIn', 'Checked in'),
  refunded: tt('admin.ticketRefunded', 'Refunded'),
  cancelled: tt('admin.ticketVoid', 'Void'),
}[s] || s);

const audienceWord = (tt, a) => ({
  all: tt('admin.audienceAll', 'everybody holding a ticket'),
  checked_in: tt('admin.audienceArrived', 'people who had arrived'),
  not_checked_in: tt('admin.audienceNotArrived', 'people who had not arrived'),
}[a] || a);

export default function AdminEventDetail() {
  return <AdminToastProvider><AdminEventDetailInner /></AdminToastProvider>;
}
