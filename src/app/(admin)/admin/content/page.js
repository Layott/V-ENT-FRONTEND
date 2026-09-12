'use client';

// Reports somebody filed, and the content behind them.
//
// CEO, 7 September 2026, from the admin dashboard spec: "review user-generated
// content, approve or reject submissions, moderate content, enforce guidelines
// and take action on reported content."
//
// `UserReport` has had a status, an admin note and a reviewer since it was
// written, and nothing in the codebase ever read one. Every report a member
// filed went into a table with no reader. This is that queue.
//
// The spec also names manga and AMVs. Anime is Phase 5 and there is no manga
// and no AMV on this platform to review, so the page says that in a sentence
// rather than drawing an approval queue for a submission nobody can make. The
// sentence is built from what the API reports, so the day the module ships it
// goes away in one place.

import { useCallback, useEffect, useState } from 'react';
import { useAutoRefresh } from '@/lib/useLiveData';
import Link from 'next/link';
import AdminNav from '@/components/admin/AdminNav';
import AdminHeader from '@/components/admin/AdminHeader';
import { useAdminAuth } from '@/components/admin/useAdminAuth';
import { AdminToastProvider, useAdminToast } from '@/components/admin/AdminToast';
import { apiMessage } from '@/lib/apiMessage';
import { formatDateTime, formatNumber } from '@/lib/datetime';
import { useT } from '@/i18n/LanguageProvider';
import shared from '@/components/admin/admin.module.css';
import styles from './content.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

function token() {
  return typeof window === 'undefined' ? '' : localStorage.getItem('adminToken') || '';
}

const PHASE_NAMES = {
  manga: 'Manga',
  amv: 'AMVs',
  marketplace_listings: 'Marketplace listings',
  shop_products: 'Shop products',
};

function ContentInner() {
  const tt = useT();
  const { admin, loading: authLoading, logout } = useAdminAuth();
  const toast = useAdminToast();

  const [tab, setTab] = useState('reports');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [tick, setTick] = useState(0);

  const [reports, setReports] = useState([]);
  const [reportMeta, setReportMeta] = useState(null);
  const [reportState, setReportState] = useState('open');

  const [items, setItems] = useState([]);
  const [engagement, setEngagement] = useState(null);
  const [notBuilt, setNotBuilt] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // What is about to be decided, and why. Null when nothing is open.
  const [deciding, setDeciding] = useState(null);
  const [note, setNote] = useState('');
  const [alsoBan, setAlsoBan] = useState(false);
  const [removing, setRemoving] = useState(null);
  // Withdrawing a licence is a decision about a photograph somebody consented
  // to, recorded on the row with the wording they agreed to. It was the one
  // control on this console that acted on a single press.
  const [withdrawing, setWithdrawing] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!token()) { setLoading(false); return; }
    if (!quiet) { setLoading(true); setError(''); }
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      let url;
      if (tab === 'reports') {
        params.set('status', reportState);
        url = `${API}/auth/admin/reports/?${params}`;
      } else {
        params.set('kind', tab);
        url = `${API}/auth/admin/content/?${params}`;
      }
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } });
      const body = await res.json();
      if (!res.ok || body.status !== 'success') {
        setError(apiMessage(tt, body, 'api.couldNotLoad', 'Could not load this.'));
        if (!quiet) { setReports([]); setItems([]); }
        return;
      }
      if (tab === 'reports') {
        setReports(body.data.results || []);
        setReportMeta(body.data);
      } else {
        setItems(body.data.results || []);
        setEngagement(body.data.engagement || null);
        setNotBuilt(body.data.not_built || []);
      }
    } catch {
      // A bare await with no catch turns any network failure into a spinner
      // that runs for ever. Three pages here have done exactly that.
      setError(tt('api.networkProblem', 'The network is not answering. Try again.'));
      if (!quiet) { setReports([]); setItems([]); }
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [tab, reportState, search, tt]);

  useEffect(() => { load(); }, [load, tick]);

  // A report queue is the clearest case for keeping itself current: somebody
  // files one while this screen is open, and the person watching it should see
  // it without pressing anything.
  //
  // Paused while a decision box is open. Both of those carry a typed note or a
  // reason, and a queue reordering underneath somebody halfway through writing
  // one is how the wrong row gets the note.
  useAutoRefresh(
    () => load({ quiet: true }),
    [],
    { interval: 30000, enabled: !deciding && !removing },
  );

  const decide = async (action) => {
    if (!deciding) return;
    setBusy(true);
    try {
      const res = await fetch(`${API}/auth/admin/reports/${deciding.id}/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note: note.trim(), also_ban: alsoBan }),
      });
      const body = await res.json();
      if (!res.ok || body.status !== 'success') {
        toast.error(apiMessage(tt, body, 'api.couldNotSave', 'That did not save.'));
        return;
      }
      toast.success(body.data?.banned
        ? tt('adminContent.decidedBanned', 'Decided, and the account is banned.')
        : tt('adminContent.decided', 'Decided. The queue is updated.'));
      setDeciding(null); setNote(''); setAlsoBan(false);
      setTick((t) => t + 1);
    } catch {
      toast.error(tt('api.networkProblem', 'The network is not answering. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  const act = async (kind, ref, action, why) => {
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
    }
  };

  const confirmRemoval = async () => {
    if (!removing || !reason.trim()) return;
    setBusy(true);
    const ok = await act(removing.kind, removing.ref, 'delete', reason.trim());
    setBusy(false);
    if (ok) { setRemoving(null); setReason(''); }
  };

  if (authLoading) return null;

  const TABS = [
    { key: 'reports', label: tt('adminContent.tabReports', 'Reports') },
    { key: 'threads', label: tt('adminContent.tabThreads', 'Discussions') },
    { key: 'posts', label: tt('adminContent.tabPosts', 'Posts') },
    { key: 'gallery', label: tt('adminContent.tabGallery', 'Pictures') },
  ];

  return <div className={shared.pageContainer}>
      <div className={`${shared.sidebarOverlay} ${sidebarOpen ? shared.open : ''}`}
           onClick={() => setSidebarOpen(false)} />
      <AdminNav admin={admin} onLogout={logout} sidebarOpen={sidebarOpen}
                badges={{ reports: reportMeta?.counts?.open || 0 }} />
      <div className={shared.mainContainer}>
        <AdminHeader admin={admin} onLogout={logout} onMenuOpen={() => setSidebarOpen(true)}
                     searchValue={search} onSearch={setSearch} />
        <main className={shared.contentArea}>
          <div className={shared.pageHeader}>
            <div>
              <h1 className={shared.pageTitle}>{tt('adminContent.title', 'Reports and content')}</h1>
              <p className={shared.pageSubtitle}>
                {tt('adminContent.sub', 'What people told us about, and what they posted.')}
              </p>
            </div>
          </div>

          {/* Filled chips with aria-pressed. Never an underline, never a ring. */}
          <div className={styles.tabs} role="group"
               aria-label={tt('adminContent.title', 'Reports and content')}>
            {TABS.map(({ key, label }) => <button key={key} type="button"
                    className={`${styles.tab} ${tab === key ? styles.tabOn : ''}`}
                    aria-pressed={tab === key}
                    onClick={() => setTab(key)}>
              {label}
              {key === 'reports' && reportMeta?.counts?.open
                ? <span className={styles.tabCount}>{reportMeta.counts.open}</span> : null}
            </button>)}
          </div>

          {engagement && tab !== 'reports' ? <div className={shared.statsGrid}>
            <div className={shared.card}>
              <p className={shared.metricLabel}>{tt('adminContent.postsWeek', 'Posts, 7 days')}</p>
              <p className={shared.metricValue}>{formatNumber(engagement.posts_7d)}</p>
            </div>
            <div className={shared.card}>
              <p className={shared.metricLabel}>{tt('adminContent.threadsWeek', 'Discussions, 7 days')}</p>
              <p className={shared.metricValue}>{formatNumber(engagement.threads_7d)}</p>
            </div>
            <div className={shared.card}>
              <p className={shared.metricLabel}>{tt('adminContent.repliesWeek', 'Replies, 7 days')}</p>
              <p className={shared.metricValue}>{formatNumber(engagement.replies_7d)}</p>
            </div>
            <div className={shared.card}>
              <p className={shared.metricLabel}>{tt('adminContent.openReports', 'Reports waiting')}</p>
              <p className={shared.metricValue}>{formatNumber(engagement.reports_open)}</p>
            </div>
          </div> : null}

          {tab === 'reports' ? <div className={shared.filtersRow}>
            <select className={shared.filterSelect} value={reportState}
                    onChange={(e) => setReportState(e.target.value)}>
              {(reportMeta?.statuses || [{ value: 'open', label: 'Open' }]).map((row) =>
                <option key={row.value} value={row.value}>{row.label}</option>)}
              <option value="all">{tt('adminContent.allStates', 'Every report')}</option>
            </select>
            <span className={shared.resultsCount}>
              {tt('adminContent.waiting', '{n} waiting')
                .replace('{n}', formatNumber(reportMeta?.counts?.open || 0))}
            </span>
          </div> : null}

          {error ? <p className={shared.errorText}>{error}</p> : null}

          <div className={shared.card}>
            {loading ? <p className={shared.stateText}>{tt('ui.loading', 'Loading...')}</p>
              : tab === 'reports' ? (reports.length === 0
                  ? <p className={shared.stateText}>
                      {tt('adminContent.noReports', 'Nothing is waiting. Reports people file land here.')}
                    </p>
                  : <div className={shared.tableWrap}>
                      <table className={shared.table}>
                        <thead>
                          <tr>
                            <th>{tt('adminContent.colAbout', 'About')}</th>
                            <th className={shared.hideMobile}>{tt('adminContent.colFrom', 'Filed by')}</th>
                            <th>{tt('adminContent.colWhy', 'Why')}</th>
                            <th className={shared.hideMobile}>{tt('adminContent.colWhere', 'Where')}</th>
                            <th className={shared.hideMobile}>{tt('adminContent.colWhen', 'When')}</th>
                            <th>{tt('adminContent.colDo', 'Do')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reports.map((row) => <tr key={row.id}>
                            <td><strong>{row.reported?.username || '-'}</strong></td>
                            <td className={shared.hideMobile}>{row.reporter?.username || '-'}</td>
                            <td>
                              <span className={`${shared.badge} ${shared.sPending}`}>{row.reason_label}</span>
                              {row.detail ? <p className={styles.detail}>{row.detail}</p> : null}
                            </td>
                            <td className={shared.hideMobile}>{row.context || '-'}</td>
                            <td className={shared.hideMobile}>{formatDateTime(row.created_at)}</td>
                            <td>
                              <div className={shared.actGroup}>
                                <button type="button" className={`${shared.actBtn} ${shared.actView}`}
                                        onClick={() => { setDeciding(row); setNote(row.admin_note || ''); setAlsoBan(false); }}>
                                  {tt('adminContent.decide', 'Decide')}
                                </button>
                              </div>
                            </td>
                          </tr>)}
                        </tbody>
                      </table>
                    </div>)
              : items.length === 0 ? <p className={shared.stateText}>
                    {tt('adminContent.nothingHere', 'There is nothing of this kind yet.')}
                  </p>
              : <div className={shared.tableWrap}>
                  <table className={shared.table}>
                    <thead>
                      <tr>
                        <th>{tt('adminContent.colWhat', 'What')}</th>
                        <th className={shared.hideMobile}>{tt('adminContent.colWho', 'Who')}</th>
                        <th className={shared.hideMobile}>{tt('adminContent.colReach', 'Reach')}</th>
                        <th>{tt('adminContent.colDo', 'Do')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((row) => <tr key={`${row.kind}-${row.ref}`}>
                        <td>
                          <strong>{row.title || row.caption || (row.body || '').slice(0, 60) || tt('adminContent.untitled', 'No words on it')}</strong>
                          {row.url ? <Link className={styles.open} href={row.url} target="_blank">
                            {tt('adminContent.open', 'Open it')}
                          </Link> : null}
                          {row.is_pinned ? <span className={`${shared.badge} ${shared.sApproved}`}>
                            {tt('adminContent.highlighted', 'Highlighted')}
                          </span> : null}
                          {row.is_locked ? <span className={`${shared.badge} ${shared.sBanned}`}>
                            {tt('adminContent.locked', 'Locked')}
                          </span> : null}
                          {row.released ? <span className={`${shared.badge} ${shared.sApproved}`}>
                            {tt('adminContent.released', 'Released to organisers')}
                          </span> : null}
                        </td>
                        <td className={shared.hideMobile}>{row.author?.username || '-'}</td>
                        <td className={shared.hideMobile}>
                          {row.kind === 'thread'
                            ? tt('adminContent.threadReach', '{r} replies, {v} views')
                                .replace('{r}', formatNumber(row.replies || 0))
                                .replace('{v}', formatNumber(row.views || 0))
                            : row.kind === 'post'
                              ? tt('adminContent.postReach', '{l} likes, {c} comments')
                                  .replace('{l}', formatNumber(row.likes || 0))
                                  .replace('{c}', formatNumber(row.comments || 0))
                              : formatDateTime(row.created_at)}
                        </td>
                        <td>
                          <div className={shared.actGroup}>
                            {row.kind === 'thread' ? <>
                              <button type="button" className={`${shared.actBtn} ${shared.actApprove}`}
                                      onClick={() => act('thread', row.ref, row.is_pinned ? 'unpin' : 'pin')}>
                                {row.is_pinned ? tt('adminContent.unhighlight', 'Unhighlight')
                                  : tt('adminContent.highlight', 'Highlight')}
                              </button>
                              <button type="button" className={`${shared.actBtn} ${shared.actView}`}
                                      onClick={() => act('thread', row.ref, row.is_locked ? 'unlock' : 'lock')}>
                                {row.is_locked ? tt('adminContent.unlock', 'Unlock')
                                  : tt('adminContent.lock', 'Lock')}
                              </button>
                            </> : null}
                            {row.kind === 'gallery' && row.released ? <button type="button"
                                    className={`${shared.actBtn} ${shared.actView}`}
                                    onClick={() => { setWithdrawing(row); setReason(''); }}>
                              {tt('adminContent.revoke', 'Withdraw the licence')}
                            </button> : null}
                            <button type="button" className={`${shared.actBtn} ${shared.actReject}`}
                                    onClick={() => { setRemoving(row); setReason(''); }}>
                              {tt('adminContent.remove', 'Remove')}
                            </button>
                          </div>
                        </td>
                      </tr>)}
                    </tbody>
                  </table>
                </div>}
          </div>

          {tab !== 'reports' && notBuilt.length ? <p className={styles.waiting}>
            {tt('adminContent.waitingOnFeature', 'Nothing to review for {list}. Those features are not built yet, so there is nothing anybody can submit.')
              .replace('{list}', notBuilt.map((row) => PHASE_NAMES[row.what] || row.what).join(', '))}
          </p> : null}
        </main>
      </div>

      {deciding ? <div className={shared.modalOverlay}
                       onClick={(e) => { if (e.target === e.currentTarget) setDeciding(null); }}>
        <div className={shared.modal}>
          <h3 className={shared.modalTitle}>
            {tt('adminContent.decideTitle', 'A report about {who}')
              .replace('{who}', deciding.reported?.username || '')}
          </h3>
          <p className={shared.modalSub}>
            {deciding.detail || tt('adminContent.noDetail', 'They gave no more detail than the reason.')}
          </p>
          <textarea className={shared.modalInput} rows={3} value={note} maxLength={2000}
                    placeholder={tt('adminContent.notePlaceholder', 'What you decided, and why')}
                    onChange={(e) => setNote(e.target.value)} />
          <label className={styles.check}>
            <input type="checkbox" checked={alsoBan}
                   onChange={(e) => setAlsoBan(e.target.checked)} />
            {tt('adminContent.alsoBan', 'Ban this account as well. They lose access immediately.')}
          </label>
          <div className={shared.modalActions}>
            <button type="button" className={`${shared.actBtn} ${shared.actView}`}
                    onClick={() => setDeciding(null)}>
              {tt('ui.cancel', 'Cancel')}
            </button>
            <button type="button" className={`${shared.actBtn} ${shared.actView}`}
                    disabled={busy || !note.trim()} onClick={() => decide('dismiss')}>
              {tt('adminContent.dismiss', 'Nothing to answer')}
            </button>
            <button type="button" className={`${shared.actBtn} ${shared.actReject}`}
                    disabled={busy || !note.trim()} onClick={() => decide('action')}>
              {tt('adminContent.uphold', 'Act on it')}
            </button>
          </div>
        </div>
      </div> : null}

      {withdrawing ? <div className={shared.modalOverlay}
                          onClick={(e) => { if (e.target === e.currentTarget) setWithdrawing(null); }}>
        <div className={shared.modal}>
          <h3 className={shared.modalTitle}>
            {tt('adminContent.withdrawTitle', 'Withdraw this licence?')}
          </h3>
          <p className={shared.modalSub}>
            {tt('adminContent.withdrawSub', 'The picture stays where it is. V-ENT stops being allowed to use it in anything new, and the reason you give is written to the audit log with your name on it.')}
          </p>
          <input className={shared.modalInput} value={reason} maxLength={500}
                 placeholder={tt('adminContent.withdrawWhy', 'Why the licence is being withdrawn')}
                 onChange={(e) => setReason(e.target.value)} />
          <div className={shared.modalActions}>
            <button type="button" className={`${shared.actBtn} ${shared.actView}`}
                    onClick={() => setWithdrawing(null)}>
              {tt('ui.cancel', 'Cancel')}
            </button>
            <button type="button" className={`${shared.actBtn} ${shared.actReject}`}
                    disabled={busy || !reason.trim()}
                    onClick={async () => {
                      const ok = await act('gallery', withdrawing.ref, 'revoke_release', reason.trim());
                      if (ok) { setWithdrawing(null); setReason(''); }
                    }}>
              {busy ? tt('adminContent.withdrawing', 'Withdrawing...')
                    : tt('adminContent.revoke', 'Withdraw the licence')}
            </button>
          </div>
        </div>
      </div> : null}

      {removing ? <div className={shared.modalOverlay}
                       onClick={(e) => { if (e.target === e.currentTarget) setRemoving(null); }}>
        <div className={shared.modal}>
          <h3 className={shared.modalTitle}>{tt('adminContent.removeTitle', 'Remove this?')}</h3>
          <p className={shared.modalSub}>
            {tt('adminContent.removeSub', 'It goes from every screen that shows it, and the reason you give is written to the audit log with your name on it.')}
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
                    disabled={busy || !reason.trim()} onClick={confirmRemoval}>
              {busy ? tt('adminContent.removing', 'Removing...') : tt('adminContent.remove', 'Remove')}
            </button>
          </div>
        </div>
      </div> : null}
    </div>;
}

export default function AdminContentPage() {
  return <AdminToastProvider><ContentInner /></AdminToastProvider>;
}
