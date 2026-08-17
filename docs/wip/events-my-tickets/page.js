'use client'

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  FaTicketAlt,
  FaQrcode,
  FaCheckCircle,
  FaTimesCircle,
  FaRegClock,
} from 'react-icons/fa';
import {
  IoCalendarOutline,
  IoLocationOutline,
} from 'react-icons/io5';
import { MdOutlineClose } from 'react-icons/md';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import Sidebar from '@/components/sidebar/Sidebar';
import styles from './my-tickets.module.css';

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'used', label: 'Used' },
  { id: 'refunded', label: 'Refunded' },
];

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatDateTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const tierClass = (tier = '') => {
  const t = tier.toLowerCase();
  if (t.includes('vip')) return 'vip';
  if (t.includes('back')) return 'backstage';
  return 'general';
};

const buildQrCells = (seed = '') => {
  // Deterministic 9x9 visual QR-style placeholder driven by the seed string.
  const cells = [];
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  for (let i = 0; i < 81; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    cells.push(h & 1);
  }
  // Force the three corner anchors solid for a QR feel.
  const anchors = [0, 6, 54];
  anchors.forEach((a) => {
    [-9, -8, -7, 0, 1, 2, 9, 10, 11, 18, 19, 20].forEach((d) => {
      const idx = a + d;
      if (idx >= 0 && idx < 81) cells[idx] = 1;
    });
  });
  return cells;
};

const MyTickets = () => {
  const { data: session } = useSession();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [activeTicket, setActiveTicket] = useState(null);

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${session?.user?.sessionToken || ''}`,
    'Content-Type': 'application/json',
  }), [session?.user?.sessionToken]);

  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/my-tickets/`, {
          headers: authHeaders(),
        });
        const data = await res.json();
        if (data.status === 'success') {
          setTickets(data.data.tickets || []);
        }
      } catch (err) {
        console.error('My tickets fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, [authHeaders]);

  const filtered = useMemo(() => {
    let out = [...tickets];
    if (statusFilter !== 'all') {
      out = out.filter((t) => t.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(
        (t) =>
          (t.event_name || '').toLowerCase().includes(q) ||
          (t.location || '').toLowerCase().includes(q) ||
          (t.qr_code || '').toLowerCase().includes(q)
      );
    }
    return out;
  }, [tickets, statusFilter, search]);

  const counts = useMemo(() => {
    const c = { all: tickets.length, active: 0, used: 0, refunded: 0 };
    tickets.forEach((t) => { if (c[t.status] !== undefined) c[t.status] += 1; });
    return c;
  }, [tickets]);

  const statusIcon = (s) => {
    if (s === 'active') return <FaCheckCircle />;
    if (s === 'used') return <FaRegClock />;
    return <FaTimesCircle />;
  };

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <div className={styles.headerRow}>
            <div>
              <h2 className={styles.pageTitle}>
                <FaTicketAlt className={styles.titleIcon} /> My Tickets
              </h2>
              <p className={styles.pageSub}>
                Your purchased event passes — show the QR at the door.
              </p>
            </div>
            <Link href="/events" className={`${styles.browseBtn} goldBTN`}>
              Browse events
            </Link>
          </div>

          <div className={styles.controlsRow}>
            <div className={styles.filterRow}>
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.id}
                  className={`${styles.filterBtn} ${statusFilter === f.id ? styles.filterBtnActive : ''}`}
                  onClick={() => setStatusFilter(f.id)}
                  type="button"
                >
                  {f.label}
                  <span className={styles.filterCount}>{counts[f.id] || 0}</span>
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Search by event, code, venue…"
              className={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <p className={styles.stateText}>Loading your tickets…</p>
          ) : filtered.length === 0 ? (
            <div className={styles.emptyState}>
              <FaTicketAlt className={styles.emptyIcon} />
              <p className={styles.emptyTitle}>
                {tickets.length === 0 ? 'No tickets yet.' : 'No tickets match.'}
              </p>
              <p className={styles.emptySub}>
                {tickets.length === 0 ? 'Buy a ticket to see it here.' : 'Try a different filter.'}
              </p>
              <Link href="/events" className={`${styles.emptyBtn} goldBTN`}>
                Browse events
              </Link>
            </div>
          ) : (
            <div className={styles.ticketGrid}>
              {filtered.map((t) => {
                const tCls = tierClass(t.tier);
                return (
                  <button
                    key={t.id}
                    className={styles.ticketCard}
                    onClick={() => setActiveTicket(t)}
                    type="button"
                  >
                    <div className={`${styles.ticketLeft} ${styles['leftTier_' + tCls]}`}>
                      <div className={styles.qrThumb}>
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

                      <h3 className={styles.eventName}>{t.event_name}</h3>

                      <div className={styles.metaRow}>
                        <span className={styles.metaItem}>
                          <IoCalendarOutline /> {formatDate(t.event_date)}
                        </span>
                        <span className={styles.metaItem}>
                          <IoLocationOutline /> {t.location}
                        </span>
                      </div>

                      <p className={styles.attendee}>
                        Attendee: {t.holder?.full_name || t.attendee_name || '—'}
                      </p>

                      <span className={styles.viewHint}>Tap to view full QR →</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <BottomMenu />

      {/* Full QR modal */}
      {activeTicket && (
        <div
          className={styles.modalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveTicket(null);
          }}
        >
          <div className={styles.qrModal}>
            <div className={styles.qrModalHeader}>
              <div>
                <p className={styles.qrModalTitle}>{activeTicket.event_name}</p>
                <p className={styles.qrModalSub}>
                  {formatDateTime(activeTicket.event_date)} • {activeTicket.location}
                </p>
              </div>
              <button
                className={styles.qrModalClose}
                onClick={() => setActiveTicket(null)}
                type="button"
                aria-label="Close"
              >
                <MdOutlineClose />
              </button>
            </div>

            <div className={styles.qrModalBody}>
              <div className={styles.qrLargeWrap}>
                <div className={styles.qrLarge}>
                  {buildQrCells(activeTicket.qr_code || activeTicket.id).map((on, idx) => (
                    <span
                      key={idx}
                      className={`${styles.qrDot} ${on ? styles.qrDotOn : ''}`}
                    />
                  ))}
                </div>
                <p className={styles.qrLargeCode}>{activeTicket.qr_code}</p>
              </div>

              <div className={styles.qrFacts}>
                <div className={styles.qrFact}>
                  <span className={styles.qrFactLabel}>Tier</span>
                  <span className={styles.qrFactValue}>{activeTicket.tier}</span>
                </div>
                <div className={styles.qrFact}>
                  <span className={styles.qrFactLabel}>Status</span>
                  <span className={`${styles.qrFactValue} ${styles['status_' + activeTicket.status]}`}>
                    {activeTicket.status}
                  </span>
                </div>
                <div className={styles.qrFact}>
                  <span className={styles.qrFactLabel}>Attendee</span>
                  <span className={styles.qrFactValue}>
                    {activeTicket.holder?.full_name || activeTicket.attendee_name || '—'}
                  </span>
                </div>
                <div className={styles.qrFact}>
                  <span className={styles.qrFactLabel}>Purchased</span>
                  <span className={styles.qrFactValue}>
                    {formatDate(activeTicket.purchased_at)}
                  </span>
                </div>
                <div className={styles.qrFact}>
                  <span className={styles.qrFactLabel}>Price</span>
                  <span className={styles.qrFactValue}>
                    ₦{Number(activeTicket.price_ngn || activeTicket.price || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <Link
                href={`/events/view-event?id=${activeTicket.event_id}`}
                className={`${styles.viewEventBtn} redBTN`}
              >
                View event
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTickets;
