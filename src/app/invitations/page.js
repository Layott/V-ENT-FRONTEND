'use client';

// /invitations: every invitation waiting for the signed-in person, of every
// kind (inbox 455): to help run an event or a tournament, or to join an
// organisation. Each opens its own page, where it is accepted or declined.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useViewer } from '@/lib/gating';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { formatDate } from '@/lib/datetime';
import { useAutoRefresh } from '@/lib/useLiveData';
import { roleWord, whatLine } from '@/components/invitations/inviteWords';
import styles from './invitations.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function InvitationsPage() {
  const tt = useT();
  const router = useRouter();
  const viewer = useViewer();
  const token = viewer.signedIn ? viewer.token : null;
  const [rows, setRows] = useState(null);
  const [problem, setProblem] = useState('');

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/auth/invitations/mine/`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json().catch(() => ({}));
      if (body?.status === 'success') {
        setRows(body.data.invitations || []);
        setProblem('');
      } else if (!quiet) {
        setProblem(apiMessage(tt, body, 'invite.listFailed', 'Your invitations could not be loaded.'));
      }
    } catch {
      if (!quiet) setProblem(tt('invite.listFailed', 'Your invitations could not be loaded.'));
    }
  }, [token, tt]);

  useEffect(() => {
    if (viewer.loading) return;
    if (!viewer.signedIn) { router.replace('/login?next=/invitations'); return; }
    load();
  }, [viewer.loading, viewer.signedIn, load, router]);
  useAutoRefresh(() => load({ quiet: true }));

  return (
    <div className={styles.pageContainer}>
      <Header /><MobileHeader />
      <main className={styles.mainContainer}>
        <Sidebar />
        <div className={styles.rightPaneContainer}>
          <h1 className={styles.pageTitle}>{tt('invite.listTitle', 'Your invitations')}</h1>
          <p className={styles.pageSubtitle}>
            {tt('invite.listSub', 'People who asked you to help run an event or a tournament, or to join their organisation.')}
          </p>
          {viewer.signedIn && problem && (
            <p className={styles.problem} role="alert">
              {problem}{' '}
              <button type="button" className={styles.secondary} onClick={() => load()}>{tt('ui.tryAgain', 'Try again')}</button>
            </p>
          )}
          {rows === null && !problem && <div className={styles.skeletonCard} aria-busy="true" />}
          {rows && rows.length === 0 && (
            <div className={styles.emptyState}>
              <h2 className={styles.emptyTitle}>{tt('invitation.none', 'Nothing waiting for you.')}</h2>
              <p className={styles.emptySub}>{tt('invitation.noneSub', 'When somebody asks you to help run an event or a tournament, or to join their organisation, it lands here.')}</p>
              <Link href="/tournaments/my-tournaments" className={styles.emptyLink}>{tt('invitation.noneLink', 'Go to your tournaments')}</Link>
            </div>
          )}
          {rows && rows.length > 0 && (
            <ul className={styles.list}>
              {rows.map((row) => (
                <li key={row.token}>
                  <Link href={`/invitations/${encodeURIComponent(row.token)}`} className={styles.row}>
                    <span className={styles.rowText}>
                      <span className={styles.rowName}>
                        {tt('invite.rowTitle', '@{who} invited you to {what}')
                          .replace('{who}', row.invited_by || 'V-ENT').replace('{what}', whatLine(tt, row))}
                      </span>
                      <span className={styles.rowMeta}>
                        {roleWord(tt, row.role)} · {formatDate(row.created_at)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <BottomMenu />
    </div>
  );
}
