'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import Sidebar from '@/components/sidebar/Sidebar';
import { myDisputes } from '@/components/disputes/disputeApi';
import styles from './disputes.module.css';

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS = {
  open: 'Open',
  under_review: 'Under review',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
};

const statusClass = (status, styles) => {
  switch (status) {
    case 'under_review': return styles.badgeReview;
    case 'resolved':     return styles.badgeResolved;
    case 'dismissed':    return styles.badgeDismissed;
    case 'open':
    default:             return styles.badgeOpen;
  }
};

const matchLabel = (d) => {
  if (d?.round_number != null && d?.match_number != null) {
    return `Round ${d.round_number} · Match ${d.match_number}`;
  }
  return '-';
};

const fmtDate = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

// ── Page ─────────────────────────────────────────────────────────────────────

const Disputes = () => {
  const { data: session } = useSession();

  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Wait for the session token before hitting the protected endpoint -
    // firing without a Bearer header returns 400s (tokenless race).
    const token = session?.user?.sessionToken;
    if (!token) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await myDisputes(token);
        if (!cancelled) setDisputes(data?.disputes || []);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Could not load your disputes.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [session?.user?.sessionToken]);

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <div className={styles.pageHeader}>
            <div className={styles.pageHeaderLeft}>
              <h1 className={styles.pageTitle}>My Disputes</h1>
              <p className={styles.pageSubtitle}>
                Track match disputes you&rsquo;ve filed and their resolutions.
              </p>
            </div>
          </div>

          {loading ? (
            <div className={styles.stateCard}>
              <div className={styles.spinner} />
              <p className={styles.stateText}>Loading your disputes…</p>
            </div>
          ) : error ? (
            <div className={styles.stateCard}>
              <p className={styles.errorText}>{error}</p>
            </div>
          ) : disputes.length === 0 ? (
            <div className={styles.stateCard}>
              <div className={styles.emptyIcon}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M12 2 3 7v6c0 5 3.5 8 9 9 5.5-1 9-4 9-9V7l-9-5z" />
                  <line x1="12" y1="8" x2="12" y2="13" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <p className={styles.emptyTitle}>You haven&rsquo;t filed any disputes</p>
              <p className={styles.emptySub}>
                Disputes you raise on a match will appear here so you can follow their status.
              </p>
            </div>
          ) : (
            <div className={styles.list}>
              {disputes.map((d) => {
                const resolved = d.status === 'resolved' || d.status === 'dismissed';
                return (
                  <div key={d.dispute_id} className={styles.card}>
                    <div className={styles.cardTop}>
                      {d.tournament_id ? (
                        <Link
                          href={`/tournaments/${d.slug || d.tournament_id}`}
                          className={styles.dTitle}
                        >
                          {d.tournament_title || 'Tournament'}
                        </Link>
                      ) : (
                        <span className={styles.dTitle}>{d.tournament_title || 'Tournament'}</span>
                      )}
                      <span className={`${styles.badge} ${statusClass(d.status, styles)}`}>
                        {STATUS_LABELS[d.status] || d.status}
                      </span>
                    </div>

                    <p className={styles.matchLabel}>{matchLabel(d)}</p>

                    {d.description && <p className={styles.desc}>{d.description}</p>}

                    {resolved && d.resolution_note && (
                      <div className={styles.resolutionBox}>
                        <p className={styles.resolutionLabel}>Resolution note</p>
                        <p className={styles.resolutionText}>{d.resolution_note}</p>
                      </div>
                    )}

                    <div className={styles.metaRow}>
                      <span className={styles.metaItem}>Filed {fmtDate(d.created_at)}</span>
                      {d.resolved_at && (
                        <span className={styles.metaItem}>Resolved {fmtDate(d.resolved_at)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <BottomMenu />
    </div>
  );
};

export default Disputes;
