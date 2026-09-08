'use client';

// One organisation: who is in it, what it holds, and what has moved.
//
// CEO, 7 September 2026, from the admin dashboard spec: "edit organization
// profiles, manage member lists, assign roles within the organization",
// and "oversee organization funds, transfer funds, generate financial
// reports".
//
// The detail endpoint already returned the member list and the statement and
// no screen read either. This is that screen.
//
// The address is the organisation's slug, never its number, and a rename moves
// the address with it while the old one keeps working. The statement is
// downloaded from the API as a file rather than assembled here, so the report
// and the numbers on screen cannot disagree.

import { useCallback, useEffect, useState } from 'react';
import { useAutoRefresh } from '@/lib/useLiveData';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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
import styles from './org-detail.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

const MEMBER_ROLES = ['owner', 'admin', 'manager', 'member'];

function token() {
  return typeof window === 'undefined' ? '' : localStorage.getItem('adminToken') || '';
}

function OrgDetailInner() {
  const tt = useT();
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug;
  const { admin, loading: authLoading, logout } = useAdminAuth();
  const toast = useAdminToast();

  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tick, setTick] = useState(0);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(null);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!slug) return;
    if (!token()) { setLoading(false); return; }
    if (!quiet) setLoading(true);
    try {
      const res = await fetch(`${API}/auth/admin/organizations/${slug}/`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const body = await res.json();
      if (!res.ok || body.status !== 'success') {
        setError(apiMessage(tt, body, 'api.couldNotLoad', 'Could not load this organisation.'));
        if (!quiet) setOrg(null);
        return;
      }
      setOrg(body.data);
      // Only on a real load. `name` is the rename field, so writing the
      // server's copy back on a background refresh would delete what somebody
      // has typed into it, one character at a time.
      if (!quiet) setName(body.data.name || '');
      setError('');
    } catch {
      setError(tt('api.networkProblem', 'The network is not answering. Try again.'));
      if (!quiet) setOrg(null);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [slug, tt]);

  useEffect(() => { load(); }, [load, tick]);

  // Members join, roles change and the wallet moves while this is open, so it
  // keeps itself current.
  //
  // Paused while the rename box or the remove box is up. Both are forms, and
  // the rename one seeds itself from what the loader fetches, which is exactly
  // the shape the hook's own notes say must never refresh underneath somebody.
  useAutoRefresh(
    () => load({ quiet: true }),
    [],
    { interval: 30000, enabled: !editing && !removing },
  );

  const act = async (payload, okText) => {
    setBusy(true);
    try {
      const res = await fetch(`${API}/auth/admin/organizations/${slug}/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok || body.status !== 'success') {
        toast.error(apiMessage(tt, body, 'api.couldNotSave', 'That did not save.'));
        return false;
      }
      toast.success(okText);
      // A rename moves the address. Follow it rather than leaving the page
      // pointing at a slug the record no longer answers to.
      if (body.data?.slug && body.data.slug !== slug) {
        router.replace(`/admin/organizations/${body.data.slug}`);
      } else {
        setTick((t) => t + 1);
      }
      return true;
    } catch {
      toast.error(tt('api.networkProblem', 'The network is not answering. Try again.'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    try {
      const res = await fetch(`${API}/auth/admin/organizations/${slug}/report.csv`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) {
        toast.error(tt('adminOrg.reportFailed', 'The statement did not download.'));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${slug}-statement.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success(tt('adminOrg.reportReady', 'Statement downloaded.'));
    } catch {
      toast.error(tt('api.networkProblem', 'The network is not answering. Try again.'));
    }
  };

  if (authLoading) return null;

  return <div className={shared.pageContainer}>
      <div className={`${shared.sidebarOverlay} ${sidebarOpen ? shared.open : ''}`}
           onClick={() => setSidebarOpen(false)} />
      <AdminNav admin={admin} onLogout={logout} sidebarOpen={sidebarOpen} badges={{}} />
      <div className={shared.mainContainer}>
        <AdminHeader admin={admin} onLogout={logout} onMenuOpen={() => setSidebarOpen(true)} />
        <main className={shared.contentArea}>
          <Link className={styles.back} href="/admin/organizations">
            {tt('adminOrg.back', 'Back to organisations')}
          </Link>

          {loading ? <p className={shared.stateText}>{tt('ui.loading', 'Loading...')}</p>
            : error ? <p className={shared.errorText}>{error}</p>
            : !org ? <p className={shared.stateText}>
                {tt('adminOrg.gone', 'There is no organisation at that address.')}
              </p>
            : <>
              <div className={shared.pageHeader}>
                <div>
                  <h1 className={shared.pageTitle}>{org.name}</h1>
                  <p className={shared.pageSubtitle}>
                    {tt('adminOrg.runBy', 'Run by {who}').replace('{who}', org.owner || '-')}
                    {org.verified ? ` ${tt('adminOrg.isVerified', 'Verified')}` : ''}
                  </p>
                </div>
                <div className={shared.pageActions}>
                  <button type="button" className={`${shared.actBtn} ${shared.actView}`}
                          onClick={() => { setEditing(true); setName(org.name); setDescription(''); }}>
                    {tt('adminOrg.edit', 'Edit details')}
                  </button>
                  <button type="button" className={`${shared.actBtn} ${shared.actView}`} onClick={download}>
                    {tt('adminOrg.download', 'Download statement')}
                  </button>
                  <button type="button"
                          className={`${shared.actBtn} ${org.verified ? shared.actBan : shared.actApprove}`}
                          onClick={() => act({ action: 'verify', verified: !org.verified },
                            org.verified ? tt('adminOrgs.unverified', 'No longer verified.')
                              : tt('adminOrgs.verified', 'Verified.'))}>
                    {org.verified ? tt('adminOrgs.removeVerified', 'Remove verification')
                      : tt('adminOrgs.markVerified', 'Verify')}
                  </button>
                </div>
              </div>

              <div className={shared.statsGrid}>
                <div className={shared.card}>
                  <p className={shared.metricLabel}>{tt('adminOrg.holds', 'Holds')}</p>
                  <p className={shared.metricValue}>{formatNumber(org.balance_vc || 0)} VC</p>
                </div>
                <div className={shared.card}>
                  <p className={shared.metricLabel}>{tt('adminOrg.members', 'Members')}</p>
                  <p className={shared.metricValue}>{formatNumber(org.members || 0)}</p>
                </div>
                <div className={shared.card}>
                  <p className={shared.metricLabel}>{tt('adminOrg.type', 'Type')}</p>
                  <p className={styles.typeValue}>{org.type}</p>
                </div>
              </div>

              <h2 className={shared.sectionTitle}>{tt('adminOrg.people', 'People')}</h2>
              <div className={shared.card}>
                {(org.members_list || []).length === 0
                  ? <p className={shared.stateText}>
                      {tt('adminOrg.noMembers', 'Nobody has joined this organisation yet.')}
                    </p>
                  : <div className={shared.tableWrap}>
                      <table className={shared.table}>
                        <thead>
                          <tr>
                            <th>{tt('adminOrg.colWho', 'Who')}</th>
                            <th>{tt('adminOrg.colRole', 'Role here')}</th>
                            <th className={shared.hideMobile}>{tt('adminOrg.colScopes', 'Runs')}</th>
                            <th>{tt('adminOrg.colDo', 'Do')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {org.members_list.map((row) => <tr key={row.username}>
                            <td>
                              <div className={shared.userCell}>
                                <Avatar src={mediaUrl(row.avatar)} name={row.username} size={30} />
                                <strong>{row.username}</strong>
                              </div>
                            </td>
                            <td>
                              <select className={shared.filterSelect} value={row.role}
                                      aria-label={tt('adminOrg.colRole', 'Role here')}
                                      onChange={(e) => act({
                                        action: 'set_member_role', username: row.username,
                                        role: e.target.value,
                                      }, tt('adminOrg.roleSaved', 'Their role is changed.'))}>
                                {MEMBER_ROLES.map((value) => <option key={value} value={value}>{value}</option>)}
                              </select>
                            </td>
                            <td className={shared.hideMobile}>
                              {(row.scopes || []).join(', ') || tt('adminOrg.nothing', 'Nothing')}
                            </td>
                            <td>
                              <div className={shared.actGroup}>
                                <button type="button" className={`${shared.actBtn} ${shared.actReject}`}
                                        disabled={row.username === org.owner}
                                        title={row.username === org.owner
                                          ? tt('adminOrg.ownerStays', 'The owner cannot be removed. Change the owner first.')
                                          : undefined}
                                        onClick={() => setRemoving(row)}>
                                  {tt('adminOrg.remove', 'Remove')}
                                </button>
                              </div>
                            </td>
                          </tr>)}
                        </tbody>
                      </table>
                    </div>}
              </div>

              <h2 className={`${shared.sectionTitle} ${styles.spaced}`}>
                {tt('adminOrg.statement', 'What has moved')}
              </h2>
              <div className={shared.card}>
                {(org.transactions || []).length === 0
                  ? <p className={shared.stateText}>
                      {tt('adminOrg.noMoney', 'Nothing has gone in or out of this wallet.')}
                    </p>
                  : <div className={shared.tableWrap}>
                      <table className={shared.table}>
                        <thead>
                          <tr>
                            <th>{tt('adminOrg.colWhen', 'When')}</th>
                            <th>{tt('adminOrg.colWhat', 'What')}</th>
                            <th>{tt('adminOrg.colAmount', 'Amount')}</th>
                            <th className={shared.hideMobile}>{tt('adminOrg.colState', 'State')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {org.transactions.map((row) => <tr key={row.id}>
                            <td>{formatDateTime(row.at)}</td>
                            <td>{row.description}</td>
                            <td className={row.amount < 0 ? styles.debit : styles.credit}>
                              {formatNumber(row.amount)} VC
                            </td>
                            <td className={shared.hideMobile}>{row.status}</td>
                          </tr>)}
                        </tbody>
                      </table>
                    </div>}
              </div>
            </>}
        </main>
      </div>

      {editing ? <div className={shared.modalOverlay}
                      onClick={(e) => { if (e.target === e.currentTarget) setEditing(false); }}>
        <div className={shared.modal}>
          <h3 className={shared.modalTitle}>{tt('adminOrg.editTitle', 'Edit this organisation')}</h3>
          <p className={shared.modalSub}>
            {tt('adminOrg.editSub', 'Renaming it moves its address. Every address it has ever had keeps working, so links people already shared still open the right page.')}
          </p>
          <input className={shared.modalInput} value={name} maxLength={148}
                 placeholder={tt('adminOrg.namePlaceholder', 'What it is called')}
                 onChange={(e) => setName(e.target.value)} />
          <textarea className={shared.modalInput} rows={3} value={description} maxLength={280}
                    placeholder={tt('adminOrg.descPlaceholder', 'What it does, in a sentence')}
                    onChange={(e) => setDescription(e.target.value)} />
          <div className={shared.modalActions}>
            <button type="button" className={`${shared.actBtn} ${shared.actView}`}
                    onClick={() => setEditing(false)}>
              {tt('ui.cancel', 'Cancel')}
            </button>
            <button type="button" className={`${shared.actBtn} ${shared.actApprove}`}
                    disabled={busy || !name.trim()}
                    onClick={async () => {
                      const ok = await act({
                        action: 'set_details', name: name.trim(), description,
                      }, tt('adminOrg.saved', 'Saved.'));
                      if (ok) setEditing(false);
                    }}>
              {busy ? tt('adminOrg.saving', 'Saving...') : tt('ui.save', 'Save')}
            </button>
          </div>
        </div>
      </div> : null}

      {removing ? <div className={shared.modalOverlay}
                       onClick={(e) => { if (e.target === e.currentTarget) setRemoving(null); }}>
        <div className={shared.modal}>
          <h3 className={shared.modalTitle}>
            {tt('adminOrg.removeTitle', 'Take {who} out of this organisation?')
              .replace('{who}', removing.username)}
          </h3>
          <p className={shared.modalSub}>
            {tt('adminOrg.removeSub', 'They lose everything this organisation let them run. Their account and their own things are untouched.')}
          </p>
          <div className={shared.modalActions}>
            <button type="button" className={`${shared.actBtn} ${shared.actView}`}
                    onClick={() => setRemoving(null)}>
              {tt('ui.cancel', 'Cancel')}
            </button>
            <button type="button" className={`${shared.actBtn} ${shared.actReject}`} disabled={busy}
                    onClick={async () => {
                      const ok = await act({
                        action: 'remove_member', username: removing.username,
                        reason: 'removed from the console',
                      }, tt('adminOrg.removed', 'They are out of the organisation.'));
                      if (ok) setRemoving(null);
                    }}>
              {tt('adminOrg.remove', 'Remove')}
            </button>
          </div>
        </div>
      </div> : null}
    </div>;
}

export default function AdminOrganizationDetailPage() {
  return <AdminToastProvider><OrgDetailInner /></AdminToastProvider>;
}
