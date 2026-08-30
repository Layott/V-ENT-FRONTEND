'use client';

// What the bell opens.
//
// CEO, 30 August 2026: "when you click or tap on the notification bell, it
// should be a draw over that comes up. then they can decide to open up the full
// notification page."
//
// Before this the bell was a link straight to /notifications, so glancing at
// what had just happened meant leaving whatever you were doing - a bracket, a
// half-filled form - and then finding your way back. The drawer shows the most
// recent handful over the page you are on, and the full page is one press away
// for anybody who wants the rest.
//
// One component for both headers. The desktop header and the mobile header both
// mount on every page with CSS hiding one, so two copies of this would have
// meant two of every fix.

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IoCheckmarkDoneOutline, IoClose } from 'react-icons/io5';

import { useT, useTx } from '@/i18n/LanguageProvider';
import { listNotifications, markRead, markAllRead } from './notificationsApi';
import { categoryIcon, relativeTime } from './notificationMeta';
import styles from './notification-drawer.module.css';

// Enough to answer "what happened while I was away" without becoming the inbox.
const HOW_MANY = 6;

const NotificationDrawer = ({ open, onClose, token, unread = 0, onUnreadChange }) => {
  const tt = useT();
  const tx = useTx();
  const router = useRouter();
  const panelRef = useRef(null);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    setFailed(false);
    try {
      const data = await listNotifications(token, { page: 1, filter: 'all' });
      setRows((data?.notifications || []).slice(0, HOW_MANY));
      if (typeof data?.unread_count === 'number') onUnreadChange?.(data.unread_count);
    } catch {
      // A drawer that cannot load is not a broken page, but it must say so
      // rather than sit on a spinner for ever.
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [token, onUnreadChange]);

  // Fetched when it opens, not on every page load. The bell's badge already
  // polls a cheap count endpoint; this is the expensive call and nobody needs
  // it until they ask.
  useEffect(() => { if (open) load(); }, [open, load]);

  // Escape closes it, and so does a press anywhere outside. Both are what a
  // person expects from something that opened over the page.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = e => { if (e.key === 'Escape') onClose?.(); };
    const onDown = e => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose?.();
    };
    document.addEventListener('keydown', onKey);
    // `mousedown`, not `click`: a click that starts inside and ends outside
    // should not close it, and the bell's own toggle fires on click.
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const openRow = async row => {
    onClose?.();
    if (!row.is_read && token) {
      setRows(prev => prev.map(r => (r.id === row.id ? { ...r, is_read: true } : r)));
      onUnreadChange?.(Math.max(0, unread - 1));
      try { await markRead(token, row.id); } catch { /* best effort */ }
    }
    router.push(row.link || '/notifications');
  };

  const readAll = async () => {
    if (!token || marking || unread === 0) return;
    setMarking(true);
    try {
      await markAllRead(token);
      setRows(prev => prev.map(r => ({ ...r, is_read: true })));
      onUnreadChange?.(0);
    } catch {
      /* best effort */
    } finally {
      setMarking(false);
    }
  };

  return (
    <div className={styles.layer} role="dialog" aria-modal="true"
         aria-label={tt('ui.notifications.753a', 'Notifications')}>
      <div className={styles.panel} ref={panelRef}>
        <div className={styles.head}>
          <p className={styles.title}>
            {tt('ui.notifications.753a', 'Notifications')}
            {unread > 0 && <span className={styles.count}>{unread}</span>}
          </p>
          <div className={styles.headActions}>
            {unread > 0 && (
              <button type="button" className={styles.headBtn} onClick={readAll} disabled={marking}>
                <IoCheckmarkDoneOutline />
                {marking
                  ? tt('ui.marking.4c2e', 'Marking...')
                  : tt('ui.mark.all.read.9a1d', 'Mark all read')}
              </button>
            )}
            <button type="button" className={styles.closeBtn} onClick={onClose}
                    aria-label={tt('ui.close.7b3f', 'Close')}>
              <IoClose />
            </button>
          </div>
        </div>

        <div className={styles.body}>
          {loading && (
            <div className={styles.skeletonWrap} aria-hidden="true">
              {[0, 1, 2].map(i => <div key={i} className={styles.skeletonRow} />)}
            </div>
          )}

          {!loading && failed && (
            <p className={styles.state}>
              {tt('ui.notif.drawerFailed.5d81', 'Could not load your notifications. Try again in a moment.')}
            </p>
          )}

          {!loading && !failed && rows.length === 0 && (
            <p className={styles.state}>
              {tt('ui.notif.drawerEmpty.2f77', 'Nothing yet. Entries, results and payouts show up here.')}
            </p>
          )}

          {!loading && !failed && rows.map(row => {
            const Icon = categoryIcon(row.category);
            return (
              <div
                key={row.id}
                className={`${styles.row} ${!row.is_read ? styles.rowUnread : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => openRow(row)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openRow(row); }
                }}
              >
                <span className={styles.rowIcon}><Icon /></span>
                <span className={styles.rowBody}>
                  <span className={styles.rowTitle}>{tx(row.title)}</span>
                  {row.body ? <span className={styles.rowText}>{row.body}</span> : null}
                </span>
                <span className={styles.rowMeta}>
                  <span className={styles.rowTime}>{relativeTime(row.created_at)}</span>
                  {!row.is_read && (
                    <span className={styles.rowDot}
                          aria-label={tt('ui.unread.07b0', 'Unread')} />
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {/* The way out. The CEO asked for the drawer to be a glance, with the
            full page a decision rather than the only option. */}
        <Link href="/notifications" className={styles.seeAll} onClick={onClose}>
          {tt('ui.notif.seeAll.8c40', 'See all notifications')}
        </Link>
      </div>
    </div>
  );
};

export default NotificationDrawer;
