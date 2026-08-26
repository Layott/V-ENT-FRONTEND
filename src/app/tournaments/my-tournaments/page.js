'use client'

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { LuPlus, LuSettings, LuRadio, LuTrophy, LuCalendar, LuUsers, LuPencil, LuTriangleAlert } from 'react-icons/lu';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import { ventFetch, API, tokenFrom, toTournamentArray, tournamentStatus, ApiError } from '@/components/tournament-lib/tournamentApi';
import styles from './my-tournaments.module.css';

const TABS = [
  { id: 'active', label: 'Active' },
  { id: 'drafts', label: 'Drafts' },
  { id: 'completed', label: 'Completed' },
];

// Status values are tolerant of both the mock shape (`upcoming` / `in_progress`
// / `completed`) and the real M1 contract (`registration_open` / `published` /
// `ongoing` / `live` / `completed`).
const ACTIVE_STATUSES = ['upcoming', 'registration_open', 'published', 'ongoing', 'live', 'in_progress'];
const COMPLETED_STATUSES = ['completed'];

const STATUS_LABELS = {
  upcoming: 'UPCOMING', registration_open: 'REGISTRATION OPEN', published: 'UPCOMING',
  ongoing: 'LIVE', live: 'LIVE', in_progress: 'LIVE', completed: 'COMPLETED',
};
const STATUS_BADGE_CLASS = {
  upcoming: 'status_upcoming', registration_open: 'status_upcoming', published: 'status_upcoming',
  ongoing: 'status_in_progress', live: 'status_in_progress', in_progress: 'status_in_progress',
  completed: 'status_completed',
};

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
const draftTitle = (d) => d?.title || d?.name || d?.tournament_title || 'Untitled draft';
const draftUpdated = (d) => d?.updated_at || d?.last_edited || d?.modified_at || d?.created_at || null;
const draftProgress = (d) => {
  const n = Number(d?.progress ?? d?.completion_percent ?? 0);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
};

const MyTournaments = () => {
  const { data: session } = useSession();
  const token = tokenFrom(session);

  const [tab, setTab] = useState('active');
  const [tournaments, setTournaments] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  // Primary data for this page - organizer's own tournaments. Drives the
  // loading/error state; the drafts fetch below is best-effort/secondary.
  useEffect(() => {
    let cancelled = false;
    // Organizer list is per-user - a tokenless call 400s on first paint.
    if (!token) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await ventFetch(API.TOURNAMENT.ORGANIZER_LIST, { token });
        if (!cancelled) setTournaments(toTournamentArray(data));
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err : new ApiError(err?.message || 'Failed to load your tournaments.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [token, retryKey]);

  useEffect(() => {
    let cancelled = false;
    if (!token) return;
    (async () => {
      try {
        const data = await ventFetch(API.TOURNAMENT.DRAFTS, { token });
        if (cancelled) return;
        const list = Array.isArray(data) ? data : (data?.drafts || data?.tournaments || []);
        setDrafts(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setDrafts([]);
      }
    })();
    return () => { cancelled = true; };
  }, [token, retryKey]);

  const handleRetry = () => setRetryKey((k) => k + 1);

  const filtered = useMemo(() => {
    if (tab === 'active') return tournaments.filter((t) => ACTIVE_STATUSES.includes(tournamentStatus(t)));
    if (tab === 'completed') return tournaments.filter((t) => COMPLETED_STATUSES.includes(tournamentStatus(t)));
    return [];
  }, [tab, tournaments]);

  const activeCount = useMemo(() => tournaments.filter((t) => ACTIVE_STATUSES.includes(tournamentStatus(t))).length, [tournaments]);
  const completedCount = useMemo(() => tournaments.filter((t) => COMPLETED_STATUSES.includes(tournamentStatus(t))).length, [tournaments]);

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <div className={styles.pageHeader}>
            <div>
              <Link href="/tournaments" className={styles.backLink}>← All Tournaments</Link>
              <h1 className={styles.pageTitle}>My Tournaments</h1>
              <p className={styles.pageSub}>Tournaments you organize.</p>
            </div>
            <Link href="/tournaments/create-tournament">
              <button className={`${styles.btn} goldBTN`}><LuPlus /> Create Tournament</button>
            </Link>
          </div>

          {/* Tab nav */}
          <div className={styles.tabBar}>
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`${styles.tabBtn} ${tab === t.id ? styles.tabBtnActive : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
                <span className={styles.tabCount}>
                  {t.id === 'active' && activeCount}
                  {t.id === 'drafts' && drafts.length}
                  {t.id === 'completed' && completedCount}
                </span>
              </button>
            ))}
          </div>

          {/* Loading */}
          {loading ? (
            <div className={styles.tournamentList} aria-hidden="true">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={styles.skeletonRow} />
              ))}
            </div>
          ) : error ? (
            <div className={styles.inlineErrorCard}>
              <LuTriangleAlert className={styles.inlineErrorIcon} />
              <p className={styles.inlineErrorTitle}>Couldn&apos;t load your tournaments</p>
              <p className={styles.inlineErrorSub}>{error.message || 'Something went wrong. Please try again.'}</p>
              <button className={`${styles.btn} goldBTN`} onClick={handleRetry}>Retry</button>
            </div>
          ) : tab === 'drafts' ? (
            drafts.length === 0 ? (
              <div className={styles.emptyState}>
                <LuTrophy className={styles.emptyIcon} />
                <p className={styles.emptyTitle}>No drafts</p>
                <Link href="/tournaments/create-tournament">
                  <button className={`${styles.btn} goldBTN`}>Create Tournament</button>
                </Link>
              </div>
            ) : (
              <div className={styles.tournamentList}>
                {drafts.map((d) => (
                  <div key={d.id} className={styles.tournamentRow}>
                    <div className={styles.tournamentInfo}>
                      <div className={styles.titleLine}>
                        <p className={styles.tournamentName}>{draftTitle(d)}</p>
                        <span className={`${styles.statusBadge} ${styles.status_draft}`}>DRAFT</span>
                      </div>
                      <p className={styles.tournamentMeta}>
                        <span>{d.game || '-'}</span>
                        <span>·</span>
                        <span>Last edit {formatDate(draftUpdated(d))}</span>
                        <span>·</span>
                        <span>{draftProgress(d)}% complete</span>
                      </p>
                    </div>
                    <div className={styles.rowActions}>
                      <Link href={`/tournaments/create-tournament?draft_id=${d.id}`}>
                        <button className={styles.actionBtn}><LuPencil /> Resume</button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : filtered.length === 0 ? (
            <div className={styles.emptyState}>
              <LuTrophy className={styles.emptyIcon} />
              <p className={styles.emptyTitle}>{tab === 'active' && tournaments.length === 0 ? "You haven't created any tournaments yet" : 'Nothing here yet'}</p>
              <p className={styles.emptySub}>{tab === 'active' ? 'Create your first tournament to get started.' : 'No completed tournaments.'}</p>
              <Link href="/tournaments/create-tournament">
                <button className={`${styles.btn} goldBTN`}>Create Tournament</button>
              </Link>
            </div>
          ) : (
            <div className={styles.tournamentList}>
              {filtered.map((t, i) => {
                const status = tournamentStatus(t);
                const statusLabel = STATUS_LABELS[status] || 'UPCOMING';
                const badgeClass = styles[STATUS_BADGE_CLASS[status]] || styles.status_upcoming;
                const name = t?.name || t?.title || 'Untitled Tournament';
                const banner = t?.banner_image || t?.banner || '';
                const current = t?.current_participants ?? t?.reg_count ?? 0;
                const max = t?.max_participants ?? '-';
                const prize = Number(t?.prize_pool || 0);
                const disputeCount = Number(t?.dispute_count || 0);

                return (
                  <div key={t?.id ?? i} className={styles.tournamentRow}>
                    <div className={styles.bannerThumb} style={banner ? { backgroundImage: `url(${banner})` } : undefined} />
                    <div className={styles.tournamentInfo}>
                      <div className={styles.titleLine}>
                        <p className={styles.tournamentName}>{name}</p>
                        <span className={`${styles.statusBadge} ${badgeClass}`}>
                          {status === 'in_progress' || status === 'live' || status === 'ongoing' ? <LuRadio className={styles.liveDot} /> : null} {statusLabel}
                        </span>
                        {t?.reg_count != null && (
                          <span className={styles.regBadge}><LuUsers /> {t.reg_count} registered</span>
                        )}
                        {disputeCount > 0 && (
                          <span className={styles.disputeBadge}><LuTriangleAlert /> {disputeCount} dispute{disputeCount === 1 ? '' : 's'}</span>
                        )}
                      </div>
                      <p className={styles.tournamentMeta}>
                        <span>{t?.game || '-'}</span>
                        <span>·</span>
                        <span><LuCalendar /> {formatDate(t?.start_date)}</span>
                        <span>·</span>
                        <span><LuUsers /> {current}/{max}</span>
                        <span>·</span>
                        <span><LuTrophy /> {prize.toLocaleString()} VC</span>
                      </p>
                    </div>
                    <div className={styles.rowActions}>
                      <Link href={`/tournaments/${t?.slug || t?.id || ''}`}>
                        <button className={styles.actionBtn}>View</button>
                      </Link>
                      {status !== 'completed' && (
                        <Link href={`/tournaments/${t?.id ?? ''}/manage`}>
                          <button className={`${styles.actionBtn} ${styles.manageBtn}`}><LuSettings /> Manage</button>
                        </Link>
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

export default MyTournaments;
