'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { IoNotificationsOutline, IoTrophyOutline, IoCalendarOutline, IoWalletOutline, IoWarningOutline, IoPeopleOutline, IoShieldCheckmarkOutline, IoCashOutline, IoInformationCircleOutline, IoAtCircleOutline, IoPersonAddOutline, IoCheckmarkDoneOutline } from 'react-icons/io5';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import Sidebar from '@/components/sidebar/Sidebar';
import { listNotifications, markRead, markAllRead } from '@/components/notifications/notificationsApi';
import { categoryIcon, relativeTime } from '@/components/notifications/notificationMeta';
import styles from './notifications.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
import { appLocale } from '@/lib/appLocale';

// ── Category → icon map ──────────────────────────────────────────────────────
const CATEGORY_CLASS = {
  tournament: styles.catTournament,
  event: styles.catEvent,
  wallet: styles.catWallet,
  dispute: styles.catDispute,
  team: styles.catTeam,
  kyc: styles.catKyc,
  payout: styles.catPayout,
  system: styles.catSystem,
  mention: styles.catMention,
  follower: styles.catFollower
};

// ── Relative time ────────────────────────────────────────────────────────────

// ── Page ─────────────────────────────────────────────────────────────────────
const Notifications = () => {
  const tx = useTx();
  const tt = useT();
  const {
    data: session
  } = useSession();
  const router = useRouter();
  const token = session?.user?.sessionToken;
  const [tab, setTab] = useState('all'); // 'all' | 'unread'
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0); // bump to re-run the fetch (retry)

  // Initial + tab-change load. Gated on the session token so we never fire a
  // tokenless request (the backend 400s without a Bearer header → console error
  // → mobile audit fails). Token + tab in deps.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const data = await listNotifications(token, {
          page: 1,
          filter: tab
        });
        if (cancelled) return;
        setRows(Array.isArray(data?.notifications) ? data.notifications : []);
        setTotal(Number(data?.total || 0));
        setUnread(Number(data?.unread_count || 0));
        setPage(1);
      } catch {
        // Surface an inline error state rather than a console error so the
        // mobile audit stays clean while the BE endpoint stabilises.
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, tab, reloadKey]);
  const loadMore = async () => {
    if (!token || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const data = await listNotifications(token, {
        page: next,
        filter: tab
      });
      setRows(prev => [...prev, ...(Array.isArray(data?.notifications) ? data.notifications : [])]);
      setTotal(Number(data?.total || 0));
      setUnread(Number(data?.unread_count || 0));
      setPage(next);
    } catch {
      /* keep what we have; the load-more button remains for a retry */
    } finally {
      setLoadingMore(false);
    }
  };
  const handleRowClick = async row => {
    if (!token) return;
    if (!row.is_read) {
      // Optimistic: flip the row + decrement the counter, then persist.
      setRows(prev => prev.map(r => r.id === row.id ? {
        ...r,
        is_read: true
      } : r));
      setUnread(u => Math.max(0, u - 1));
      try {
        await markRead(token, row.id);
      } catch {/* best-effort */}
    }
    router.push(row.link || '/notifications');
  };
  const handleMarkAll = async () => {
    if (!token || marking || unread === 0) return;
    setMarking(true);
    try {
      await markAllRead(token);
      setUnread(0);
      if (tab === 'unread') {
        // The unread list is now empty.
        setRows([]);
        setTotal(0);
      } else {
        setRows(prev => prev.map(r => ({
          ...r,
          is_read: true
        })));
      }
    } catch {
      /* best-effort */
    } finally {
      setMarking(false);
    }
  };
  const hasMore = !loading && !error && rows.length > 0 && total > rows.length;
  return <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          {/* Header row */}
          <div className={styles.pageHeader}>
            <div className={styles.pageHeaderLeft}>
              <h1 className={styles.pageTitle}>{tt("ui.notifications.753a", "Notifications")}</h1>
              <p className={styles.pageSubtitle}>
                {unread > 0 ? `${unread} unread` : tx("All caught up")}
              </p>
            </div>
            <button type="button" className={styles.markAllBtn} onClick={handleMarkAll} disabled={marking || unread === 0}>
              <IoCheckmarkDoneOutline />
              {marking ? tx("Marking…") : tx("Mark all read")}
            </button>
          </div>

          {/* Tabs */}
          <div className={styles.tabs}>
            <button type="button" className={`${styles.tab} ${tab === 'all' ? styles.tabActive : ''}`} onClick={() => setTab('all')}>
              {tt("ui.all.6a72", "All")}
            </button>
            <button type="button" className={`${styles.tab} ${tab === 'unread' ? styles.tabActive : ''}`} onClick={() => setTab('unread')}>
              {tt("ui.unread.07b0", "Unread")}{unread > 0 ? ` (${unread})` : ''}
            </button>
          </div>

          {/* List card */}
          <div className={styles.listCard}>
            {loading ? <div className={styles.skeletonList}>
                {Array.from({
              length: 6
            }).map((_, i) => <div key={i} className={styles.skeletonRow}>
                    <div className={styles.skeletonIcon} />
                    <div className={styles.skeletonBody}>
                      <div className={styles.skeletonLineWide} />
                      <div className={styles.skeletonLineNarrow} />
                    </div>
                  </div>)}
              </div> : error ? <div className={styles.stateBox}>
                <IoWarningOutline className={styles.stateIcon} />
                <p className={styles.stateTitle}>{tt("ui.couldn.t.load.notifications.c9e9", "Couldn’t load notifications")}</p>
                <p className={styles.stateSub}>{tt("ui.check.connection.try.again.5638", "Check your connection and try again.")}</p>
                <button type="button" className={styles.retryBtn} onClick={() => setReloadKey(k => k + 1)}>
                  {tt("ui.retry.9f5c", "Retry")}
                </button>
              </div> : rows.length === 0 ? <div className={styles.stateBox}>
                <IoNotificationsOutline className={styles.stateIcon} />
                <p className={styles.stateTitle}>{tt("ui.re.all.caught.up.2266", "You’re all caught up")}</p>
                <p className={styles.stateSub}>
                  {tab === 'unread' ? tx("No unread notifications.") : tx("You have no notifications yet.")}
                </p>
              </div> : <>
                <div className={styles.rowList}>
                  {rows.map(row => {
                const Icon = categoryIcon(row.category);
                const catClass = CATEGORY_CLASS[row.category] || styles.catSystem;
                return <div key={row.id} className={`${styles.row} ${!row.is_read ? styles.rowUnread : ''}`} role="button" tabIndex={0} onClick={() => handleRowClick(row)} onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleRowClick(row);
                  }
                }}>
                        <span className={`${styles.rowIcon} ${catClass}`}>
                          <Icon />
                        </span>
                        <div className={styles.rowBody}>
                          <p className={styles.rowTitle}>{tx(row.title)}</p>
                          {row.body ? <p className={styles.rowText}>{row.body}</p> : null}
                        </div>
                        <div className={styles.rowMeta}>
                          <span className={styles.rowTime}>{relativeTime(row.created_at)}</span>
                          {!row.is_read && <span className={styles.rowDot} aria-label={tt("ui.unread.07b0", "Unread")} />}
                        </div>
                      </div>;
              })}
                </div>

                {hasMore && <div className={styles.loadMoreWrap}>
                    <button type="button" className={styles.loadMoreBtn} onClick={loadMore} disabled={loadingMore}>
                      {loadingMore ? tx("Loading…") : tx("Load more")}
                    </button>
                  </div>}
              </>}
          </div>
        </div>
      </main>

      <BottomMenu />
    </div>;
};
export default Notifications;