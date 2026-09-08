'use client';

// One community: who is in it, what is being discussed, and what was said.
//
// CEO, 7 September 2026, from the admin dashboard spec: "moderate discussions,
// enforce community guidelines, highlight community content."
//
// Highlighting was a column nobody could write. `Thread.is_pinned` and
// `Thread.is_locked` are sent to every reader of the community API, the thread
// ordering sorts by the first one, and no endpoint on the platform ever set
// either. They are set from here.
//
// A club is the community model on this platform, so this reports on clubs
// rather than inventing a second thing called a community.

import { useCallback, useEffect, useState } from 'react';
import { useAutoRefresh } from '@/lib/useLiveData';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AdminNav from '@/components/admin/AdminNav';
import AdminHeader from '@/components/admin/AdminHeader';
import { useAdminAuth } from '@/components/admin/useAdminAuth';
import { AdminToastProvider, useAdminToast } from '@/components/admin/AdminToast';
import { apiMessage } from '@/lib/apiMessage';
import { formatDateTime, formatNumber } from '@/lib/datetime';
import { useT } from '@/i18n/LanguageProvider';
import Avatar from '@/components/avatar/Avatar';
import { mediaUrl } from '@/lib/mediaUrl';
import shared from '@/components/admin/admin.module.css';
import styles from './community-detail.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

function token() {
  return typeof window === 'undefined' ? '' : localStorage.getItem('adminToken') || '';
}

function CommunityDetailInner() {
  const tt = useT();
  const params = useParams();
  const slug = params?.slug;
  const { admin, loading: authLoading, logout } = useAdminAuth();
  const toast = useAdminToast();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const [removing, setRemoving] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!slug) return;
    if (!token()) { setLoading(false); return; }
    if (!quiet) setLoading(true);
    try {
      const res = await fetch(`${API}/auth/admin/communities/${slug}/`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const body = await res.json();
      if (!res.ok || body.status !== 'success') {
        setError(apiMessage(tt, body, 'api.couldNotLoad', 'Could not load this community.'));
        if (!quiet) setData(null);
        return;
      }
      setData(body.data);
      setError('');
    } catch {
      setError(tt('api.networkProblem', 'The network is not answering. Try again.'));
      if (!quiet) setData(null);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [slug, tt]);

  useEffect(() => { load(); }, [load, tick]);

  // Threads and replies arrive while a moderator is looking at this, and the
  // point of the screen is to see them. Quiet, so a refresh never blanks the
  // list or flashes the skeleton.
  //
  // Paused while the remove box is open: it carries a typed reason.
  useAutoRefresh(
    () => load({ quiet: true }),
    [],
    { interval: 30000, enabled: !removing },
  );

  const act = async (kind, ref, action, why) => {
    setBusy(true);
    try {
      const res = await fetch(`${API}/auth/admin/content/${kind}/${ref}/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason: why || '' }),
      });
      const body = await res.json();
      if (!res.ok || body.status !== 'success') {
        toast.error(apiMessage(tt, body, 'api.couldNotSave', 'That did not save.'));
        return false;
      }
      toast.success(body.message || tt('adminContent.done', 'Done.'));
      setTick((t) => t + 1);
      return true;
    } catch {
      toast.error(tt('api.networkProblem', 'The network is not answering. Try again.'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (authLoading) return null;

  const club = data?.club;

  return <div className={shared.pageContainer}>
      <div className={`${shared.sidebarOverlay} ${sidebarOpen ? shared.open : ''}`}
           onClick={() => setSidebarOpen(false)} />
      <AdminNav admin={admin} onLogout={logout} sidebarOpen={sidebarOpen} badges={{}} />
      <div className={shared.mainContainer}>
        <AdminHeader admin={admin} onLogout={logout} onMenuOpen={() => setSidebarOpen(true)} />
        <main className={shared.contentArea}>
          <Link className={styles.back} href="/admin/communities">
            {tt('adminClub.back', 'Back to communities')}
          </Link>

          {loading ? <p className={shared.stateText}>{tt('ui.loading', 'Loading...')}</p>
            : error ? <p className={shared.errorText}>{error}</p>
            : !club ? <p className={shared.stateText}>
                {tt('adminClub.gone', 'There is no community at that address.')}
              </p>
            : <>
              <div className={shared.pageHeader}>
                <div>
                  <h1 className={shared.pageTitle}>{club.name}</h1>
                  <p className={shared.pageSubtitle}>
                    {club.description || tt('adminClub.noDescription', 'Nobody has written what this club is for.')}
                  </p>
                </div>
              </div>

              <div className={shared.statsGrid}>
                <div className={shared.card}>
                  <p className={shared.metricLabel}>{tt('adminClub.members', 'Members')}</p>
                  <p className={shared.metricValue}>{formatNumber(club.members)}</p>
                </div>
                <div className={shared.card}>
                  <p className={shared.metricLabel}>{tt('adminClub.topics', 'Topics')}</p>
                  <p className={shared.metricValue}>{formatNumber(club.topics)}</p>
                </div>
                <div className={shared.card}>
                  <p className={shared.metricLabel}>{tt('adminClub.messages', 'Messages')}</p>
                  <p className={shared.metricValue}>{formatNumber(club.messages)}</p>
                </div>
                <div className={shared.card}>
                  <p className={shared.metricLabel}>{tt('adminClub.threads', 'Discussions')}</p>
                  <p className={shared.metricValue}>{formatNumber(club.threads)}</p>
                </div>
              </div>

              <h2 className={shared.sectionTitle}>{tt('adminClub.discussions', 'Discussions')}</h2>
              <div className={shared.card}>
                {(data.threads || []).length === 0
                  ? <p className={shared.stateText}>
                      {tt('adminClub.noThreads', 'Nobody has started a discussion in this club.')}
                    </p>
                  : <div className={shared.tableWrap}>
                      <table className={shared.table}>
                        <thead>
                          <tr>
                            <th>{tt('adminClub.colTitle', 'Discussion')}</th>
                            <th className={shared.hideMobile}>{tt('adminClub.colWho', 'Started by')}</th>
                            <th className={shared.hideMobile}>{tt('adminClub.colReach', 'Reach')}</th>
                            <th>{tt('adminClub.colDo', 'Do')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.threads.map((row) => <tr key={row.ref}>
                            <td>
                              <strong>{row.title}</strong>
                              {row.is_pinned ? <span className={`${shared.badge} ${shared.sApproved}`}>
                                {tt('adminContent.highlighted', 'Highlighted')}
                              </span> : null}
                              {row.is_locked ? <span className={`${shared.badge} ${shared.sBanned}`}>
                                {tt('adminContent.locked', 'Locked')}
                              </span> : null}
                            </td>
                            <td className={shared.hideMobile}>{row.author?.username || '-'}</td>
                            <td className={shared.hideMobile}>
                              {tt('adminContent.threadReach', '{r} replies, {v} views')
                                .replace('{r}', formatNumber(row.replies || 0))
                                .replace('{v}', formatNumber(row.views || 0))}
                            </td>
                            <td>
                              <div className={shared.actGroup}>
                                <button type="button" className={`${shared.actBtn} ${shared.actApprove}`}
                                        disabled={busy}
                                        onClick={() => act('thread', row.ref, row.is_pinned ? 'unpin' : 'pin')}>
                                  {row.is_pinned ? tt('adminContent.unhighlight', 'Unhighlight')
                                    : tt('adminContent.highlight', 'Highlight')}
                                </button>
                                <button type="button" className={`${shared.actBtn} ${shared.actView}`}
                                        disabled={busy}
                                        onClick={() => act('thread', row.ref, row.is_locked ? 'unlock' : 'lock')}>
                                  {row.is_locked ? tt('adminContent.unlock', 'Unlock')
                                    : tt('adminContent.lock', 'Lock')}
                                </button>
                              </div>
                            </td>
                          </tr>)}
                        </tbody>
                      </table>
                    </div>}
              </div>

              <h2 className={`${shared.sectionTitle} ${styles.spaced}`}>
                {tt('adminClub.recent', 'What was said recently')}
              </h2>
              <div className={shared.card}>
                {(data.messages || []).length === 0
                  ? <p className={shared.stateText}>
                      {tt('adminClub.noMessages', 'Nothing has been said in this club yet.')}
                    </p>
                  : <ul className={styles.messages}>
                      {data.messages.map((row) => <li key={row.id} className={styles.message}>
                        <div className={styles.messageHead}>
                          <Avatar src={mediaUrl(row.author?.avatar)}
                                  name={row.author?.username || '?'} size={28} />
                          <strong className={styles.messageWho}>{row.author?.username || '-'}</strong>
                          <span className={styles.messageTopic}>{row.topic}</span>
                          <span className={styles.messageWhen}>{formatDateTime(row.created_at)}</span>
                        </div>
                        <p className={styles.messageBody}>{row.body}</p>
                        <button type="button" className={`${shared.actBtn} ${shared.actReject}`}
                                onClick={() => { setRemoving(row); setReason(''); }}>
                          {tt('adminContent.remove', 'Remove')}
                        </button>
                      </li>)}
                    </ul>}
              </div>

              <h2 className={`${shared.sectionTitle} ${styles.spaced}`}>
                {tt('adminClub.people', 'People')}
              </h2>
              <div className={shared.card}>
                {(data.members || []).length === 0
                  ? <p className={shared.stateText}>
                      {tt('adminClub.noMembers', 'Nobody has joined this club yet.')}
                    </p>
                  : <ul className={styles.people}>
                      {data.members.map((row) => <li key={row.user?.username} className={styles.person}>
                        <Avatar src={mediaUrl(row.user?.avatar)}
                                name={row.user?.username || '?'} size={30} />
                        <strong>{row.user?.username}</strong>
                        <span className={`${shared.badge} ${shared.roleUser}`}>{row.role}</span>
                      </li>)}
                    </ul>}
              </div>
            </>}
        </main>
      </div>

      {removing ? <div className={shared.modalOverlay}
                       onClick={(e) => { if (e.target === e.currentTarget) setRemoving(null); }}>
        <div className={shared.modal}>
          <h3 className={shared.modalTitle}>{tt('adminClub.removeTitle', 'Remove this message?')}</h3>
          <p className={shared.modalSub}>
            {tt('adminClub.removeSub', 'It stops being readable in the club. It is kept underneath, so what was moderated can still be read back if somebody argues about it.')}
          </p>
          <input className={shared.modalInput} value={reason} maxLength={500}
                 placeholder={tt('adminContent.removeWhy', 'Why it is being removed')}
                 onChange={(e) => setReason(e.target.value)} />
          <div className={shared.modalActions}>
            <button type="button" className={`${shared.actBtn} ${shared.actView}`}
                    onClick={() => setRemoving(null)}>
              {tt('ui.cancel', 'Cancel')}
            </button>
            <button type="button" className={`${shared.actBtn} ${shared.actReject}`}
                    disabled={busy || !reason.trim()}
                    onClick={async () => {
                      const ok = await act('message', removing.id, 'delete', reason.trim());
                      if (ok) { setRemoving(null); setReason(''); }
                    }}>
              {busy ? tt('adminContent.removing', 'Removing...') : tt('adminContent.remove', 'Remove')}
            </button>
          </div>
        </div>
      </div> : null}
    </div>;
}

export default function AdminCommunityDetailPage() {
  return <AdminToastProvider><CommunityDetailInner /></AdminToastProvider>;
}
