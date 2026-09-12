'use client';

import { apiMessage } from '@/lib/apiMessage';
import { useAutoRefresh } from '@/lib/useLiveData';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import AdminNav from '@/components/admin/AdminNav';
import AdminHeader from '@/components/admin/AdminHeader';
import { useAdminAuth } from '@/components/admin/useAdminAuth';
import { AdminToastProvider, useAdminToast } from '@/components/admin/AdminToast';
import shared from '@/components/admin/admin.module.css';
import styles from './user-detail.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
import { formatDate, formatDateTime } from '@/lib/datetime';
import Avatar from '@/components/avatar/Avatar';
import { mediaUrl } from '@/lib/mediaUrl';
const TABS = [{
  key: 'logins',
  label: 'Logins'
}, {
  key: 'tournaments',
  label: 'Tournaments'
}, {
  key: 'wallet',
  label: 'Wallet'
}, {
  key: 'reports',
  label: 'Reports'
}, {
  key: 'ban_history',
  label: 'Ban History'
}];
function UserDetailInner() {
  const tx = useTx();
  const tt = useT();
  const params = useParams();
  const router = useRouter();
  const {
    admin,
    loading: authLoading,
    logout
  } = useAdminAuth();
  const toast = useAdminToast();
  const [detail, setDetail] = useState(null);
  const [activeTab, setActiveTab] = useState('logins');
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);
  const [newRole, setNewRole] = useState('user');
  const [notifyMsg, setNotifyMsg] = useState('');
  // Every destructive control confirms and says what it will do. The ban
  // button here used to fire straight away with a hardcoded reason, while the
  // users LIST asked properly: two surfaces, one job, one of them built.
  const [banOpen, setBanOpen] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [premiumNote, setPremiumNote] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTyped, setDeleteTyped] = useState('');
  const [busy, setBusy] = useState(false);
  // Why the page has nothing, when it has nothing. Without this a network
  // failure rendered as "User not found", which sends an admin looking for a
  // deleted account that is sitting in the database.
  const [error, setError] = useState('');
  const userId = params?.id;
  const fetchDetail = useCallback(async ({ quiet = false } = {}) => {
    if (!userId) {
      setLoading(false);
      return;
    }
    if (!quiet) { setLoading(true); setError(''); }
    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : '';
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/admin/users/${userId}/`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json().catch(() => ({}));
      if (data?.status === 'success' && data.data) {
        // Normalize collections so the render path never NPEs on .map(...) or .length
        const safeDetail = {
          user: data.data.user || null,
          logins: Array.isArray(data.data.logins) ? data.data.logins : [],
          tournaments: Array.isArray(data.data.tournaments) ? data.data.tournaments : [],
          wallet: Array.isArray(data.data.wallet) ? data.data.wallet : [],
          reports: Array.isArray(data.data.reports) ? data.data.reports : [],
          ban_history: Array.isArray(data.data.ban_history) ? data.data.ban_history : []
        };
        setDetail(safeDetail);
        setNewRole(safeDetail.user?.role || 'user');
      } else if (res.status === 404) {
        // Genuinely no such user: the not-found copy below is the right answer.
        setDetail(null);
      } else {
        setDetail(null);
        setError(apiMessage(tt, data, 'msg.failedToLoadUser', 'Failed to load user.'));
      }
    } catch (err) {
      console.error('Admin user detail fetch error:', err);
      setDetail(null);
      setError(apiMessage(tt, err, 'msg.failedToLoadUser', 'Failed to load user.'));
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  // Keeps itself current. One line, because fetchDetail already exists and the
  // loop lives in useAutoRefresh. `quiet` is what stops a refresh flashing
  // the loading state over content somebody is reading.
  useAutoRefresh(() => fetchDetail({ quiet: true }));
  useEffect(() => {
    if (!authLoading && admin) fetchDetail();
  }, [authLoading, admin, fetchDetail]);
  async function action(act, body) {
    const token = localStorage.getItem('adminToken');
    // Map the UI action to the real endpoint (path + verb + body).
    let url;
    let payload;
    if (act === 'ban' || act === 'unban') {
      url = `${process.env.NEXT_PUBLIC_API_URL}/auth/admin/users/${userId}/ban/`;
      payload = {
        ban: act === 'ban',
        reason: body?.reason || ''
      };
    } else if (act === 'premium' || act === 'unpremium') {
      url = `${process.env.NEXT_PUBLIC_API_URL}/auth/admin/users/${userId}/premium/`;
      payload = {
        premium: act === 'premium',
        note: body?.note || ''
      };
    } else if (act === 'role') {
      url = `${process.env.NEXT_PUBLIC_API_URL}/auth/admin/users/${userId}/role/`;
      payload = {
        role: body?.role
      };
      // BE requires the admin sub-role when promoting to admin.
      if (body?.role === 'admin') payload.admin_role = body?.admin_role || 'support_admin';
    } else {
      url = `${process.env.NEXT_PUBLIC_API_URL}/auth/admin/users/${userId}/${act}/`;
      payload = body;
    }
    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: payload ? JSON.stringify(payload) : undefined
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.push(tt('admin.actionApplied', 'Done: {action}').replace('{action}', act), 'success');
        fetchDetail();
        return true;
      }
      toast.push(apiMessage(tt, data, "api.actionFailed", "Action failed."), 'error');
    } catch {
      toast.push(tt("msg.connectionError", "Connection error."), 'error');
    }
    return false;
  }
  // `action` above is PATCH-shaped, which is right for ban and role and wrong
  // for everything added since. This is the POST half, kept separate rather
  // than bolted onto the same function with a verb argument.
  async function send(path, payload, okText) {
    const token = localStorage.getItem('adminToken');
    setBusy(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/admin/users/${userId}/${path}/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {})
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        toast.push(okText, 'success');
        fetchDetail();
        return true;
      }
      toast.push(apiMessage(tt, data, 'api.actionFailed', 'Action failed.'), 'error');
    } catch {
      toast.push(tt('msg.connectionError', 'Connection error.'), 'error');
    } finally {
      setBusy(false);
    }
    return false;
  }

  async function removeAccount() {
    const token = localStorage.getItem('adminToken');
    setBusy(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/admin/users/${userId}/delete/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true, reason: 'deleted from the console' })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        toast.push(tt('adminUser.deleted', 'The account is gone.'), 'success');
        router.replace('/admin/users');
        return;
      }
      toast.push(apiMessage(tt, data, 'api.actionFailed', 'Action failed.'), 'error');
    } catch {
      toast.push(tt('msg.connectionError', 'Connection error.'), 'error');
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) return null;
  const u = detail?.user;
  return <div className={shared.pageContainer}>
      <div className={`${shared.sidebarOverlay} ${sidebarOpen ? shared.open : ''}`} onClick={() => setSidebarOpen(false)} />
      <AdminNav admin={admin} onLogout={logout} sidebarOpen={sidebarOpen} badges={{}} />
      <div className={shared.mainContainer}>
        <AdminHeader admin={admin} onLogout={logout} onMenuOpen={() => setSidebarOpen(true)} />
        <main className={shared.contentArea}>
          {/* Page header */}
          <div className={shared.pageHeader}>
            <div>
              <Link href="/admin/users" className={styles.backLink}>{tt("ui.all.users.c1b5", "← All Users")}</Link>
              <h1 className={shared.pageTitle}>{u?.username || tt('admin.aUser', 'User')}</h1>
              <p className={shared.pageSubtitle}>
                {u?.full_name && `${u.full_name} · `}{u?.email}
              </p>
            </div>
            <div className={shared.pageActions}>
              <button className={`${shared.actBtn} ${shared.actView}`} onClick={() => setNotifyModalOpen(true)}>
                {tt("ui.send.notification.0df1", "Send Notification")}
              </button>
              <button className={`${shared.actBtn} ${shared.actApprove}`} onClick={() => setRoleModalOpen(true)}>
                {tt("ui.change.role.7b55", "Change Role")}
              </button>
              <button className={`${shared.actBtn} ${shared.actView}`} onClick={() => setResetOpen(true)}>
                {tt('adminUser.reset', 'Send a password reset')}
              </button>
              {u?.status === 'banned' ? <button className={`${shared.actBtn} ${shared.actApprove}`} onClick={() => action('unban')}>
                  {tt("ui.unban.d267", "Unban")}
                </button> : <button className={`${shared.actBtn} ${shared.actBan}`}
                  onClick={() => { setBanOpen(true); setBanReason(''); }}>
                  {tt("ui.ban.bfa1", "Ban")}
                </button>}
              {/* Only to somebody who may actually do it. A control that is
                  rendered and then refused is the fault this project bans by
                  name; `permissions` comes from the same ROLE_PERMISSIONS
                  table the endpoint checks, so the two cannot disagree. */}
              {admin?.permissions?.grant_premium && (u?.is_premium
                ? <button className={`${shared.actBtn} ${shared.actView}`}
                          onClick={() => action('unpremium')}>
                    {tt('adminUser.takePremium', 'Take premium back')}
                  </button>
                : <button className={`${shared.actBtn} ${shared.actApprove}`}
                          onClick={() => { setPremiumOpen(true); setPremiumNote(''); }}>
                    {tt('adminUser.givePremium', 'Give premium')}
                  </button>)}
              <button className={`${shared.actBtn} ${shared.actReject}`}
                      onClick={() => { setDeleteOpen(true); setDeleteTyped(''); }}>
                {tt('adminUser.delete', 'Delete account')}
              </button>
            </div>
          </div>

          {loading ? <p className={shared.stateText}>{tt("ui.loading.33ce", "Loading…")}</p> : error ? <p className={shared.errorText} role="alert">{error}</p> : !detail || !detail.user ? <p className={shared.stateText}>{tt("ui.user.not.found.9c98", "User not found.")}</p> : <>
              {/* Profile summary */}
              <div className={`${shared.card} ${styles.summary}`}>
                <div className={styles.avatar}>
                  <Avatar src={mediaUrl(u.avatar)} name={u.username} size={72} />
                </div>
                <div className={styles.summaryGrid}>
                  <div>
                    <p className={styles.label}>{tt("ui.status.bae7", "Status")}</p>
                    <p className={styles.value}>
                      <span className={`${shared.badge} ${u.status === 'banned' ? shared.sBanned : u.status === 'suspended' ? shared.sSuspended : shared.sActive}`}>
                        {u.status?.replace('_', ' ')}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className={styles.label}>{tt("ui.country.d523", "Country")}</p>
                    <p className={styles.value}>{u.country || '-'}</p>
                  </div>
                  <div>
                    <p className={styles.label}>{tt("ui.wallet.vc.221b", "Wallet VC")}</p>
                    <p className={styles.value}>{u.wallet_vc?.toLocaleString() || '0'}</p>
                  </div>
                  <div>
                    <p className={styles.label}>{tt("ui.tournaments.fee2", "Tournaments")}</p>
                    <p className={styles.value}>{u.tournaments_count || 0}</p>
                  </div>
                  <div>
                    <p className={styles.label}>{tt("ui.joined.43a1", "Joined")}</p>
                    <p className={styles.value}>
                      {u.date_joined ? formatDate(u.date_joined) : '-'}
                    </p>
                  </div>
                  <div>
                    <p className={styles.label}>{tt("ui.last.login.43da", "Last login")}</p>
                    <p className={styles.value}>
                      {u.last_login ? formatDate(u.last_login) : '-'}
                    </p>
                  </div>
                  <div>
                    <p className={styles.label}>{tt("ui.role.c3f1", "Role")}</p>
                    <p className={styles.value}>
                      <span className={`${shared.badge} ${u.role === 'admin' ? shared.roleAdmin : u.role === 'organizer' ? shared.roleOrganizer : shared.roleUser}`}>
                        {u.role || 'user'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className={styles.label}>{tt('adminUser.premium', 'Premium')}</p>
                    <p className={styles.value}>
                      <span className={`${shared.badge} ${u.is_premium ? shared.sApproved : shared.sDraft}`}>
                        {u.is_premium
                          ? tt('adminUser.premiumOn', 'On')
                          : tt('adminUser.premiumOff', 'Off')}
                      </span>
                      {/* The reason, beside the answer. It is the thing
                          somebody is looking for when they open this page
                          asking why an account has paid features. */}
                      {u.is_premium && u.premium_note && (
                        <span className={styles.premiumNote}> {u.premium_note}</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className={styles.label}>KYC</p>
                    <p className={styles.value}>
                      <span className={`${shared.badge} ${u.kyc_status === 'approved' ? shared.sApproved : u.kyc_status === 'pending' ? shared.sPending : shared.sDraft}`}>
                        {u.kyc_status || 'unsubmitted'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className={styles.tabs}>
                {TABS.map(tab => <button key={tab.key} className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`} onClick={() => setActiveTab(tab.key)}>
                    {tx(tab.label)}
                  </button>)}
              </div>

              {/* Tab content */}
              <div className={shared.card}>
                {activeTab === 'logins' && <div className={shared.tableWrap}>
                    <table className={shared.table}>
                      <thead>
                        <tr>
                          <th>{tt("ui.when.769b", "When")}</th>
                          <th>IP</th>
                          <th className={shared.hideMobile}>{tt("ui.device.a5a7", "Device")}</th>
                          <th className={shared.hideMobile}>{tt("ui.location.d219", "Location")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.logins.map(l => <tr key={l.id}>
                            <td>{formatDateTime(l.created_at)}</td>
                            <td><code className={styles.code}>{l.ip}</code></td>
                            <td className={shared.hideMobile}>{l.device}</td>
                            <td className={shared.hideMobile}>{l.location}</td>
                          </tr>)}
                      </tbody>
                    </table>
                  </div>}
                {activeTab === 'tournaments' && (detail.tournaments.length === 0 ? <p className={shared.stateText}>{tt("ui.no.tournament.history.9e4d", "No tournament history.")}</p> : <div className={shared.tableWrap}>
                      <table className={shared.table}>
                        <thead>
                          <tr>
                            <th>{tt("ui.name.709a", "Name")}</th>
                            <th>{tt("ui.status.bae7", "Status")}</th>
                            <th className={shared.hideMobile}>{tt("ui.placement.ab89", "Placement")}</th>
                            <th className={shared.hideMobile}>{tt("ui.prize.vc.7937", "Prize VC")}</th>
                            <th className={shared.hideMobile}>{tt("ui.joined.43a1", "Joined")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.tournaments.map(t => <tr key={t.id}>
                              <td>{t.name}</td>
                              <td>
                                <span className={`${shared.badge} ${t.status === 'completed' ? shared.sApproved : t.status === 'cancelled' ? shared.sCancelled : shared.sOngoing}`}>
                                  {t.status}
                                </span>
                              </td>
                              <td className={shared.hideMobile}>{t.placement}</td>
                              <td className={shared.hideMobile}>{Number(t.prize_vc || 0).toLocaleString()}</td>
                              <td className={shared.hideMobile}>{formatDate(t.joined_at)}</td>
                            </tr>)}
                        </tbody>
                      </table>
                    </div>)}
                {activeTab === 'wallet' && <div className={shared.tableWrap}>
                    <table className={shared.table}>
                      <thead>
                        <tr>
                          <th>{tt("ui.when.769b", "When")}</th>
                          <th>{tt("ui.type.3deb", "Type")}</th>
                          <th>{tt("ui.amount.43dc", "Amount")}</th>
                          <th className={shared.hideMobile}>{tt("ui.description.55f8", "Description")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.wallet.map(w => <tr key={w.id}>
                            <td>{formatDate(w.created_at)}</td>
                            <td>{w.type.replace('_', ' ')}</td>
                            <td className={w.amount >= 0 ? styles.amtUp : styles.amtDown}>
                              {Number(w.amount || 0) >= 0 ? '+' : ''}{Number(w.amount || 0).toLocaleString()} VC
                            </td>
                            <td className={shared.hideMobile}>{tx(w.description)}</td>
                          </tr>)}
                      </tbody>
                    </table>
                  </div>}
                {activeTab === 'reports' && (detail.reports && Array.isArray(detail.reports) && detail.reports.length > 0 ? <div className={shared.tableWrap}>
                      <table className={shared.table}>
                        <thead>
                          <tr>
                            <th>{tt("ui.when.769b", "When")}</th>
                            <th>{tt("ui.reporter.d37b", "Reporter")}</th>
                            <th>{tt("ui.reason.f219", "Reason")}</th>
                            <th>{tt("ui.status.bae7", "Status")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.reports.map(r => <tr key={r.id}>
                              <td>{formatDate(r.created_at)}</td>
                              <td>{r.reporter?.username || '-'}</td>
                              <td>
                                {r.reason_label || r.reason}
                                {r.detail ? <p className={styles.reportDetail}>{r.detail}</p> : null}
                              </td>
                              <td>
                                <span className={`${shared.badge} ${r.status === 'open' ? shared.sPending : shared.sApproved}`}>
                                  {r.status}
                                </span>
                              </td>
                            </tr>)}
                        </tbody>
                      </table>
                    </div> : <p className={shared.stateText}>{tt("ui.no.reports.filed.against.ab29", "No reports filed against this user.")}</p>)}
                {activeTab === 'ban_history' && (detail.ban_history.length === 0 ? <p className={shared.stateText}>{tt("ui.no.ban.history.d684", "No ban history.")}</p> : detail.ban_history.map(b => <div key={b.id} className={styles.banEntry}>
                        <p className={styles.banReason}>{b.reason}</p>
                        <p className={styles.banMeta}>
                          {tt("ui.banned.75c6", "Banned by")} <strong>{b.banned_by}</strong> on{' '}
                          {formatDate(b.created_at)}
                          {b.lifted_at && ` · Lifted ${formatDate(b.lifted_at)}`}
                        </p>
                      </div>))}
              </div>
            </>}
        </main>
      </div>

      {/* Role assignment modal */}
      {roleModalOpen && <div className={styles.modalOverlay} onClick={() => setRoleModalOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <p className={styles.modalTitle}>{tt("ui.change.role.7b55", "Change Role")}</p>
            <p className={styles.modalSub}>
              {tt("ui.updating.role.14b4", "Updating role for")} <strong>{u?.username}</strong>.
            </p>
            <select value={newRole} onChange={e => setNewRole(e.target.value)} className={styles.modalSelect}>
              <option value="user">{tt("ui.user.9f8a", "User")}</option>
              <option value="organizer">{tt("ui.organizer.debd", "Organizer")}</option>
              <option value="admin">{tt("ui.admin.staff.f0f5", "Admin (Staff)")}</option>
            </select>
            <div className={styles.modalBtns}>
              <button className={`${shared.actBtn} ${shared.actView}`} onClick={() => setRoleModalOpen(false)}>
                {tt("ui.cancel.77df", "Cancel")}
              </button>
              <button className={`${shared.actBtn} ${shared.actApprove}`} onClick={async () => {
            const ok = await action('role', {
              role: newRole
            });
            if (ok) setRoleModalOpen(false);
          }}>
                {tt("ui.save.efc0", "Save")}
              </button>
            </div>
          </div>
        </div>}

      {/* Send notification modal */}
      {/* Premium, with the reason in the same press. A note added afterwards
          is a note nobody adds, and "why does this account have premium" is
          the question the field exists to answer. */}
      {premiumOpen && <div className={shared.modalOverlay} onClick={(e) => {
        if (e.target === e.currentTarget) setPremiumOpen(false);
      }}>
          <div className={shared.modal}>
            <p className={shared.modalTitle}>
              {tt('adminUser.premiumTitle', 'Give this account premium?')}
            </p>
            <p className={shared.modalSub}>
              {tt('adminUser.premiumSub', 'They get every premium feature straight away, at no charge. Say why, so the next person reading this knows.')}
            </p>
            <input className={shared.modalInput} value={premiumNote} autoFocus
                   placeholder={tt('adminUser.premiumPlaceholder', 'Why? For example: partner for the Rivalry season')}
                   onChange={(e) => setPremiumNote(e.target.value)} />
            <div className={shared.modalActions}>
              <button className={`${shared.actBtn} ${shared.actView}`}
                      onClick={() => setPremiumOpen(false)}>
                {tt('ui.cancel.0f8e', 'Cancel')}
              </button>
              <button className={`${shared.actBtn} ${shared.actApprove}`}
                      disabled={!premiumNote.trim()}
                      onClick={async () => {
                        const ok = await action('premium', { note: premiumNote.trim() });
                        if (ok) setPremiumOpen(false);
                      }}>
                {tt('adminUser.premiumConfirm', 'Give premium')}
              </button>
            </div>
          </div>
        </div>}

      {banOpen && <div className={shared.modalOverlay} onClick={(e) => {
        if (e.target === e.currentTarget) setBanOpen(false);
      }}>
          <div className={shared.modal}>
            <p className={shared.modalTitle}>{tt('admin.banTitle', 'Ban this account?')}</p>
            <p className={shared.modalSub}>
              {tt('admin.banSub', 'They lose access immediately. The reason is written to the audit log.')}
            </p>
            <p className={shared.modalSub}><strong>{u?.username}</strong></p>
            <input className={shared.modalInput} value={banReason} maxLength={500}
                   placeholder={tt('admin.banReasonPlaceholder', 'Why? For example: repeated no-shows')}
                   onChange={(e) => setBanReason(e.target.value)} />
            <div className={shared.modalActions}>
              <button className={`${shared.actBtn} ${shared.actView}`} onClick={() => setBanOpen(false)}>
                {tt('ui.cancel.77df', 'Cancel')}
              </button>
              <button className={`${shared.actBtn} ${shared.actBan}`} disabled={!banReason.trim()}
                      onClick={async () => {
                        const ok = await action('ban', { reason: banReason.trim() });
                        if (ok) setBanOpen(false);
                      }}>
                {tt('admin.banConfirm', 'Ban account')}
              </button>
            </div>
          </div>
        </div>}

      {resetOpen && <div className={shared.modalOverlay} onClick={(e) => {
        if (e.target === e.currentTarget) setResetOpen(false);
      }}>
          <div className={shared.modal}>
            <p className={shared.modalTitle}>{tt('adminUser.resetTitle', 'Send a password reset?')}</p>
            <p className={shared.modalSub}>
              {tt('adminUser.resetSub', 'A code goes to {email}, the same one the sign-in page sends. Nobody here sees or sets their password.')
                .replace('{email}', u?.email || '')}
            </p>
            <div className={shared.modalActions}>
              <button className={`${shared.actBtn} ${shared.actView}`} onClick={() => setResetOpen(false)}>
                {tt('ui.cancel.77df', 'Cancel')}
              </button>
              <button className={`${shared.actBtn} ${shared.actApprove}`} disabled={busy}
                      onClick={async () => {
                        const ok = await send('reset-password', {},
                          tt('adminUser.resetSent', 'A reset code has been emailed to them.'));
                        if (ok) setResetOpen(false);
                      }}>
                {busy ? tt('adminUser.sending', 'Sending...') : tt('adminUser.resetDo', 'Send it')}
              </button>
            </div>
          </div>
        </div>}

      {deleteOpen && <div className={shared.modalOverlay} onClick={(e) => {
        if (e.target === e.currentTarget) setDeleteOpen(false);
      }}>
          <div className={shared.modal}>
            <p className={shared.modalTitle}>{tt('adminUser.deleteTitle', 'Delete this account for good?')}</p>
            <p className={shared.modalSub}>
              {tt('adminUser.deleteSub', 'This cannot be undone. Their profile, wallet, gallery and every registration go with it. Ban them instead if you only want to stop them signing in.')}
            </p>
            <p className={shared.modalSub}>
              {tt('adminUser.deleteType', 'Type {name} to confirm.').replace('{name}', u?.username || '')}
            </p>
            <input className={shared.modalInput} value={deleteTyped} autoComplete="off"
                   placeholder={u?.username || ''}
                   onChange={(e) => setDeleteTyped(e.target.value)} />
            <div className={shared.modalActions}>
              <button className={`${shared.actBtn} ${shared.actView}`} onClick={() => setDeleteOpen(false)}>
                {tt('ui.cancel.77df', 'Cancel')}
              </button>
              <button className={`${shared.actBtn} ${shared.actReject}`}
                      disabled={busy || deleteTyped.trim() !== (u?.username || '')}
                      onClick={removeAccount}>
                {busy ? tt('adminUser.deleting', 'Deleting...') : tt('adminUser.deleteDo', 'Delete it')}
              </button>
            </div>
          </div>
        </div>}

      {notifyModalOpen && <div className={styles.modalOverlay} onClick={() => setNotifyModalOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <p className={styles.modalTitle}>{tt("ui.send.notification.0df1", "Send Notification")}</p>
            <p className={styles.modalSub}>
              {tt("ui.sending.157e", "Sending to")} <strong>{u?.username}</strong> {tt("ui.via.app.notification.d278", "via in-app notification.")}
            </p>
            <textarea className={styles.modalTextarea} value={notifyMsg} onChange={e => setNotifyMsg(e.target.value)} placeholder={tt("ui.type.message.6733", "Type your message…")} rows={4} />
            <div className={styles.modalBtns}>
              <button className={`${shared.actBtn} ${shared.actView}`} onClick={() => setNotifyModalOpen(false)}>
                {tt("ui.cancel.77df", "Cancel")}
              </button>
              {/* This used to show a success toast and send nothing at all: no
                  endpoint, no request, no row. Somebody warning a member
                  believed they had, and the member never heard anything. */}
              <button className={`${shared.actBtn} ${shared.actApprove}`} disabled={busy} onClick={async () => {
            if (!notifyMsg.trim()) {
              toast.push(tt("msg.typeAMessageFirst", "Type a message first."), 'warn');
              return;
            }
            const ok = await send('notify', { message: notifyMsg.trim() },
              tt('admin.notificationSent', 'Notification sent to {name}.').replace('{name}', u?.username || ''));
            if (ok) {
              setNotifyMsg('');
              setNotifyModalOpen(false);
            }
          }}>
                {busy ? tt('adminUser.sending', 'Sending...') : tt("ui.send.9bc2", "Send")}
              </button>
            </div>
          </div>
        </div>}
    </div>;
}
export default function UserDetailPage() {
  return <AdminToastProvider>
      <UserDetailInner />
    </AdminToastProvider>;
}