'use client';

import { appLocale } from '@/lib/appLocale';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { FaTicketAlt, FaQrcode, FaCheckCircle, FaTimesCircle, FaRegClock } from 'react-icons/fa';
import { IoCalendarOutline, IoLocationOutline } from 'react-icons/io5';
import { MdOutlineClose } from 'react-icons/md';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import Sidebar from '@/components/sidebar/Sidebar';
import styles from './my-tickets.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
import UserChip from '@/components/user-chip/UserChip';
const STATUS_FILTERS = [{
  id: 'all'
}, {
  id: 'active'
}, {
  id: 'used'
}, {
  id: 'refunded'
}];
const formatDate = iso => {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString(appLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};
const formatDateTime = iso => {
  if (!iso) return '-';
  return new Date(iso).toLocaleString(appLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
const tierClass = (tier = '') => {
  const t = tier.toLowerCase();
  if (t.includes('vip')) return 'vip';
  if (t.includes('back')) return 'backstage';
  return 'general';
};

// A REAL scannable QR of the ticket code. The previous implementation drew a
// decorative grid from a seed - it looked like a QR but encoded nothing, so it
// could never be scanned at the door.
const TicketQr = ({
  value,
  size = 220,
  className
}) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current || !value) return;
    let cancelled = false;
    (async () => {
      try {
        const QRCode = (await import('qrcode')).default;
        if (cancelled || !canvasRef.current) return;
        await QRCode.toCanvas(canvasRef.current, value, {
          width: size,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#ffffff'
          },
          errorCorrectionLevel: 'M'
        });
      } catch {
        // Leave the canvas blank - the code is always shown as text beneath it.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [value, size]);
  return <canvas ref={canvasRef} className={className} width={size} height={size} aria-label={`Ticket ${value}`} />;
};

// GET /event/my-tickets/ returns nested event/tier objects and the API's own
// status vocabulary. Flatten it into what this page renders.
const STATUS_MAP = {
  valid: 'active',
  checked_in: 'used',
  refunded: 'refunded',
  cancelled: 'refunded'
};
const normaliseTicket = t => ({
  ...t,
  id: t.id,
  code: t.code,
  status: STATUS_MAP[t.status] || t.status,
  tier: t.tier?.name || t.tier || '',
  event_id: t.event?.event_id ?? t.event?.id,
  event_name: t.event?.name || '',
  // start_date carries the time; event_date is the legacy date-only column.
  event_date: t.event?.start_date || t.event?.event_date || null,
  location: t.event?.location || t.event?.event_link || '',
  price_vc: t.price_vc,
  attendee_name: t.attendee_name || ''
});
const MyTickets = () => {
  const tx = useTx();
  const tt = useT();
  const {
    data: session
  } = useSession();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [activeTicket, setActiveTicket] = useState(null);
  // The counts the API computed from the same rows it sent. Kept apart from
  // the list so the two can never disagree about how many there are.
  const [serverCounts, setServerCounts] = useState(null);
  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${session?.user?.sessionToken || ''}`,
    'Content-Type': 'application/json'
  }), [session?.user?.sessionToken]);
  const fetchTickets = useCallback(async ({ quiet = false } = {}) => {
    if (!session?.user?.sessionToken) return;
    if (!quiet) setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/my-tickets/`, {
        headers: authHeaders()
      });
      const data = await res.json();
      if (data.status === 'success') {
        setTickets((data.data.tickets || []).map(normaliseTicket));
        setServerCounts(data.data.counts || null);
      }
    } catch (err) {
      console.error('My tickets fetch error:', err);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [authHeaders, session?.user?.sessionToken]);
  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // A ticket changes state at a door, not in this tab. Coming back to the page
  // is the moment somebody wants the truth, and a slow poll covers the case of
  // watching it while a friend is scanned in. Both are quiet: a refresh that
  // blanks the list to a spinner would be worse than a stale number.
  useEffect(() => {
    if (!session?.user?.sessionToken) return undefined;
    const again = () => {
      if (document.visibilityState === 'visible') fetchTickets({ quiet: true });
    };
    document.addEventListener('visibilitychange', again);
    window.addEventListener('focus', again);
    const timer = setInterval(again, 30000);
    return () => {
      document.removeEventListener('visibilitychange', again);
      window.removeEventListener('focus', again);
      clearInterval(timer);
    };
  }, [fetchTickets, session?.user?.sessionToken]);
  const filtered = useMemo(() => {
    let out = [...tickets];
    if (statusFilter !== 'all') {
      out = out.filter(t => t.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(t => (t.event_name || '').toLowerCase().includes(q) || (t.location || '').toLowerCase().includes(q) || (t.qr_code || '').toLowerCase().includes(q));
    }
    return out;
  }, [tickets, statusFilter, search]);
  const counts = useMemo(() => {
    if (serverCounts) return serverCounts;
    const c = {
      all: tickets.length,
      active: 0,
      used: 0,
      refunded: 0
    };
    tickets.forEach(t => {
      if (c[t.status] !== undefined) c[t.status] += 1;
    });
    return c;
  }, [tickets, serverCounts]);
  // Four literal keys, not tx(label) and not an interpolated key.
  //
  // tx() looks a key up by its English TEXT, and two different keys can share
  // one word: "Used" resolved to the config page's `cfg.used`, whose French is
  // "Occasion" - second-hand, not "already scanned". An interpolated key would
  // have been just as wrong and additionally invisible to check-keys.
  const filterLabel = id => ({
    all: tt("ui.all.6a72", "All"),
    active: tt("ui.active.a733", "Active"),
    used: tt("ui.ticket.used.4c72", "Used"),
    refunded: tt("ui.refunded.d6fb", "Refunded")
  }[id] || id);
  const statusIcon = s => {
    if (s === 'active') return <FaCheckCircle />;
    if (s === 'used') return <FaRegClock />;
    return <FaTimesCircle />;
  };
  return <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <div className={styles.headerRow}>
            <div>
              <h1 className={styles.pageTitle}>
                <FaTicketAlt className={styles.titleIcon} /> {tt("ui.my.tickets.4ff2", "My Tickets")}
              </h1>
              <p className={styles.pageSub}>
                {tt("ui.purchased.event.passes.show.be01", "Your purchased event passes - show the QR at the door.")}
              </p>
            </div>
            <Link href="/events" className={`${styles.browseBtn} goldBTN`}>
              {tt("ui.browse.events.2251", "Browse events")}
            </Link>
          </div>

          <div className={styles.controlsRow}>
            <div className={styles.filterRow}>
              {STATUS_FILTERS.map(f => <button key={f.id} className={`${styles.filterBtn} ${statusFilter === f.id ? styles.filterBtnActive : ''}`} onClick={() => setStatusFilter(f.id)} type="button">
                  {filterLabel(f.id)}
                  <span className={styles.filterCount}>{counts[f.id] || 0}</span>
                </button>)}
            </div>
            <input type="text" placeholder={tt("ui.search.event.code.venue.0a2f", "Search by event, code, venue…")} className={styles.searchInput} value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {loading ? <p className={styles.stateText}>{tt("ui.loading.tickets.7d1b", "Loading your tickets…")}</p> : filtered.length === 0 ? <div className={styles.emptyState}>
              <FaTicketAlt className={styles.emptyIcon} />
              <p className={styles.emptyTitle}>
                {tickets.length === 0 ? tx("No tickets yet.") : tx("No tickets match.")}
              </p>
              <p className={styles.emptySub}>
                {tickets.length === 0 ? tx("Buy a ticket to see it here.") : tx("Try a different filter.")}
              </p>
              <Link href="/events" className={`${styles.emptyBtn} goldBTN`}>
                {tt("ui.browse.events.2251", "Browse events")}
              </Link>
            </div> : <div className={styles.ticketGrid}>
              {filtered.map(t => {
            const tCls = tierClass(t.tier);
            return <button key={t.id} className={styles.ticketCard} onClick={() => setActiveTicket(t)} type="button">
                    <div className={`${styles.ticketLeft} ${styles['leftTier_' + tCls]}`}>
                      <div className={styles.qrThumb}>
                        <TicketQr value={t.code} size={92} className={styles.qrCanvasSmall} />
                        <FaQrcode />
                      </div>
                      <p className={styles.ticketCode}>{t.qr_code}</p>
                    </div>

                    <div className={styles.ticketBody}>
                      <div className={styles.ticketHeader}>
                        <span className={`${styles.tierBadge} ${styles['tier_' + tCls]}`}>
                          {t.tier}
                        </span>
                        <span className={`${styles.statusBadge} ${styles['status_' + t.status]}`}>
                          {statusIcon(t.status)} {t.status}
                        </span>
                      </div>

                      <h2 className={styles.eventName}>{t.event_name}</h2>

                      <div className={styles.metaRow}>
                        <span className={styles.metaItem}>
                          <IoCalendarOutline /> {formatDate(t.event_date)}
                        </span>
                        <span className={styles.metaItem}>
                          <IoLocationOutline /> {t.location}
                        </span>
                      </div>

                      <p className={styles.attendee}>
                        {tt("ui.attendee.7124", "Attendee:")}{' '}
                        {t.holder
                          ? <UserChip user={t.holder} size={0} />
                          : (t.attendee_name || '-')}
                      </p>

                      <span className={styles.viewHint}>{tt("ui.tap.view.full.qr.337d", "Tap to view full QR →")}</span>
                    </div>
                  </button>;
          })}
            </div>}
        </div>
      </main>

      <BottomMenu />

      {/* Full QR modal */}
      {activeTicket && <div className={styles.modalOverlay} onClick={e => {
      if (e.target === e.currentTarget) setActiveTicket(null);
    }}>
          <div className={styles.qrModal}>
            <div className={styles.qrModalHeader}>
              <div>
                <p className={styles.qrModalTitle}>{activeTicket.event_name}</p>
                <p className={styles.qrModalSub}>
                  {formatDateTime(activeTicket.event_date)} • {activeTicket.location}
                </p>
              </div>
              <button className={styles.qrModalClose} onClick={() => setActiveTicket(null)} type="button" aria-label={tt("ui.close.bbfa", "Close")}>
                <MdOutlineClose />
              </button>
            </div>

            <div className={styles.qrModalBody}>
              <div className={styles.qrLargeWrap}>
                <TicketQr value={activeTicket.code} size={220} className={styles.qrCanvas} />
                <p className={styles.qrLargeCode}>{activeTicket.code}</p>
              </div>

              <div className={styles.qrFacts}>
                <div className={styles.qrFact}>
                  <span className={styles.qrFactLabel}>{tt("ui.tier.5bd4", "Tier")}</span>
                  <span className={styles.qrFactValue}>{activeTicket.tier}</span>
                </div>
                <div className={styles.qrFact}>
                  <span className={styles.qrFactLabel}>{tt("ui.status.bae7", "Status")}</span>
                  <span className={`${styles.qrFactValue} ${styles['status_' + activeTicket.status]}`}>
                    {activeTicket.status}
                  </span>
                </div>
                <div className={styles.qrFact}>
                  <span className={styles.qrFactLabel}>{tt("ui.attendee.aabc", "Attendee")}</span>
                  <span className={styles.qrFactValue}>
                    {activeTicket.holder?.full_name || activeTicket.attendee_name || '-'}
                  </span>
                </div>
                <div className={styles.qrFact}>
                  <span className={styles.qrFactLabel}>{tt("ui.purchased.8b70", "Purchased")}</span>
                  <span className={styles.qrFactValue}>
                    {formatDate(activeTicket.purchased_at)}
                  </span>
                </div>
                <div className={styles.qrFact}>
                  <span className={styles.qrFactLabel}>{tt("ui.price.3e82", "Price")}</span>
                  <span className={styles.qrFactValue}>
                    ₦{Number(activeTicket.price_ngn || activeTicket.price || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <Link href={`/events/${activeTicket.slug || activeTicket.event_id}`} className={`${styles.viewEventBtn} redBTN`}>
                {tt("ui.view.event.7c27", "View event")}
              </Link>
            </div>
          </div>
        </div>}
    </div>;
};
export default MyTickets;