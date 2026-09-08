'use client';

// Who the administrators are, and who made them one.
//
// CEO, 7 September 2026, from the admin dashboard spec: "Super Admin: can
// create and manage other admin accounts and assign roles." That sentence is
// the whole difference between Super Admin and Admin, and it had no screen: a
// role could be granted from inside one person's detail page, if you already
// knew which account to open, and nothing answered "who can get into the
// console", which is the question somebody asks when an admin leaves.
//
// A role is granted to an EXISTING account. There is no create-a-login here:
// somebody signs up like everybody else, so their address is verified and
// their password is their own. Making logins for other people from a console
// is how shared passwords start.
//
// The role table on the right is built from what the API reports, which is
// built from ROLE_PERMISSIONS. A hand-written copy would eventually tell
// somebody they granted less than they did.

import { useCallback, useEffect, useState } from 'react';
import { useAutoRefresh } from '@/lib/useLiveData';
import AdminNav from '@/components/admin/AdminNav';
import AdminHeader from '@/components/admin/AdminHeader';
import { useAdminAuth } from '@/components/admin/useAdminAuth';
import { AdminToastProvider, useAdminToast } from '@/components/admin/AdminToast';
import { apiMessage } from '@/lib/apiMessage';
import { formatDateTime } from '@/lib/datetime';
import { useT } from '@/i18n/LanguageProvider';
import Avatar from '@/components/avatar/Avatar';
import shared from '@/components/admin/admin.module.css';
import styles from './admins.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

function token() {
  return typeof window === 'undefined' ? '' : localStorage.getItem('adminToken') || '';
}

function AdminsInner() {
  const tt = useT();
  const { admin, loading: authLoading, logout } = useAdminAuth();
  const toast = useAdminToast();

  const [rows, setRows] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [tick, setTick] = useState(0);
  const [openRole, setOpenRole] = useState(null);

  const [grantOpen, setGrantOpen] = useState(false);
  const [who, setWho] = useState('');
  const [role, setRole] = useState('mod_admin');
  const [why, setWhy] = useState('');
  const [busy, setBusy] = useState(false);
  const [revoking, setRevoking] = useState(null);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!token()) { setLoading(false); return; }
    if (!quiet) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      const res = await fetch(`${API}/auth/admin/administrators/?${params}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const body = await res.json();
      if (!res.ok || body.status !== 'success') {
        setError(apiMessage(tt, body, 'api.couldNotLoad', 'Could not load the administrators.'));
        if (!quiet) setRows([]);
        return;
      }
      setRows(body.data.results || []);
      setRoles(body.data.roles || []);
      setError('');
    } catch {
      setError(tt('api.networkProblem', 'The network is not answering. Try again.'));
      if (!quiet) setRows([]);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [search, tt]);

  useEffect(() => { load(); }, [load, tick]);

  // Keeps itself current, because a grant made by another super admin should
  // show up here without anybody reloading. Quiet, so a refresh never flashes
  // the loading state or empties the table under somebody reading it.
  //
  // Paused while the grant or revoke box is open: both are forms, and a list
  // moving underneath a decision somebody is halfway through is how the row
  // they meant to act on stops being the row they are looking at.
  useAutoRefresh(
    () => load({ quiet: true }),
    [],
    { interval: 30000, enabled: !grantOpen && !revoking },
  );

  const send = async (payload, okText) => {
    setBusy(true);
    try {
      const res = await fetch(`${API}/auth/admin/administrators/grant/`, {
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
      setTick((t) => t + 1);
      return true;
    } catch {
      toast.error(tt('api.networkProblem', 'The network is not answering. Try again.'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const grant = async () => {
    const ok = await send({ username: who.trim(), admin_role: role, reason: why.trim() },
      tt('adminAdmins.granted', 'Role granted. It is in the audit log.'));
    if (ok) { setGrantOpen(false); setWho(''); setWhy(''); }
  };

  const revoke = async () => {
    if (!revoking) return;
    const ok = await send({ username: revoking.username, revoke: true, reason: why.trim() },
      tt('adminAdmins.revoked', 'They can no longer open the console.'));
    if (ok) { setRevoking(null); setWhy(''); }
  };

  if (authLoading) return null;

  return <div className={shared.pageContainer}>
      <div className={`${shared.sidebarOverlay} ${sidebarOpen ? shared.open : ''}`}
           onClick={() => setSidebarOpen(false)} />
      <AdminNav admin={admin} onLogout={logout} sidebarOpen={sidebarOpen} badges={{}} />
      <div className={shared.mainContainer}>
        <AdminHeader admin={admin} onLogout={logout} onMenuOpen={() => setSidebarOpen(true)}
                     searchValue={search} onSearch={setSearch} />
        <main className={shared.contentArea}>
          <div className={shared.pageHeader}>
            <div>
              <h1 className={shared.pageTitle}>{tt('adminAdmins.title', 'Administrators')}</h1>
              <p className={shared.pageSubtitle}>
                {tt('adminAdmins.sub', 'Everybody who can open this console, and what each of them may do.')}
              </p>
            </div>
            <div className={shared.pageActions}>
              <button type="button" className={`${shared.actBtn} ${shared.actApprove}`}
                      onClick={() => { setGrantOpen(true); setWhy(''); }}>
                {tt('adminAdmins.grant', 'Give somebody a role')}
              </button>
            </div>
          </div>

          {error ? <p className={shared.errorText}>{error}</p> : null}

          <div className={shared.card}>
            {loading ? <p className={shared.stateText}>{tt('ui.loading', 'Loading...')}</p>
              : rows.length === 0 ? <p className={shared.stateText}>
                  {tt('adminAdmins.none', 'No administrators match that.')}
                </p>
              : <div className={shared.tableWrap}>
                  <table className={shared.table}>
                    <thead>
                      <tr>
                        <th>{tt('adminAdmins.colWho', 'Who')}</th>
                        <th>{tt('adminAdmins.colRole', 'Role')}</th>
                        <th className={shared.hideMobile}>{tt('adminAdmins.colFactor', 'Authenticator')}</th>
                        <th className={shared.hideMobile}>{tt('adminAdmins.colSeen', 'Last seen')}</th>
                        <th>{tt('adminAdmins.colDo', 'Do')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => <tr key={row.user_id}>
                        <td>
                          <div className={shared.userCell}>
                            <Avatar name={row.username} size={32} />
                            <div>
                              <strong>{row.username}</strong>
                              <p className={styles.email}>{row.email}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`${shared.badge} ${shared.roleAdmin}`}>{row.role_label}</span>
                          {row.awaiting_feature ? <p className={styles.note}>
                            {tt('adminAdmins.awaiting', 'Grants nothing until {what} is built.')
                              .replace('{what}', row.awaiting_feature)}
                          </p> : null}
                        </td>
                        <td className={shared.hideMobile}>
                          {row.two_factor
                            ? <span className={`${shared.badge} ${shared.sApproved}`}>
                                {tt('adminAdmins.enrolled', 'Set up')}
                              </span>
                            : <span className={`${shared.badge} ${shared.sPending}`}>
                                {tt('adminAdmins.notEnrolled', 'Not set up, cannot sign in here')}
                              </span>}
                        </td>
                        <td className={shared.hideMobile}>
                          {row.last_login ? formatDateTime(row.last_login)
                            : tt('adminAdmins.never', 'Never')}
                        </td>
                        <td>
                          <div className={shared.actGroup}>
                            <button type="button" className={`${shared.actBtn} ${shared.actReject}`}
                                    disabled={row.username === admin?.username}
                                    title={row.username === admin?.username
                                      ? tt('adminAdmins.notYourself', 'You cannot change your own role here.')
                                      : undefined}
                                    onClick={() => { setRevoking(row); setWhy(''); }}>
                              {tt('adminAdmins.revoke', 'Remove')}
                            </button>
                          </div>
                        </td>
                      </tr>)}
                    </tbody>
                  </table>
                </div>}
          </div>

          <h2 className={`${shared.sectionTitle} ${styles.rolesHeading}`}>
            {tt('adminAdmins.rolesTitle', 'What each role may do')}
          </h2>
          <div className={styles.roleGrid}>
            {roles.map((row) => <div key={row.value} className={styles.roleCard}>
              <div className={styles.roleHead}>
                <strong className={styles.roleName}>{row.label}</strong>
                <button type="button" className={styles.roleToggle}
                        aria-expanded={openRole === row.value}
                        onClick={() => setOpenRole(openRole === row.value ? null : row.value)}>
                  {openRole === row.value ? tt('adminAdmins.hide', 'Hide')
                    : tt('adminAdmins.showPerms', '{n} permissions').replace('{n}', String(row.may.length))}
                </button>
              </div>
              {row.awaiting_feature ? <p className={styles.note}>
                {tt('adminAdmins.awaiting', 'Grants nothing until {what} is built.')
                  .replace('{what}', row.awaiting_feature)}
              </p> : null}
              {openRole === row.value ? <ul className={styles.permList}>
                {row.may.map((perm) => <li key={perm.key} className={styles.perm}>{perm.label}</li>)}
              </ul> : null}
            </div>)}
          </div>
        </main>
      </div>

      {grantOpen ? <div className={shared.modalOverlay}
                        onClick={(e) => { if (e.target === e.currentTarget) setGrantOpen(false); }}>
        <div className={shared.modal}>
          <h3 className={shared.modalTitle}>{tt('adminAdmins.grantTitle', 'Give somebody a role')}</h3>
          <p className={shared.modalSub}>
            {tt('adminAdmins.grantSub', 'They need an account already, and an authenticator set up before they can open the console. The grant goes in the audit log with your name on it.')}
          </p>
          <input className={shared.modalInput} value={who} autoComplete="off"
                 placeholder={tt('adminAdmins.whoPlaceholder', 'Their username or email address')}
                 onChange={(e) => setWho(e.target.value)} />
          <select className={shared.modalInput} value={role}
                  onChange={(e) => setRole(e.target.value)}>
            {roles.map((row) => <option key={row.value} value={row.value}>{row.label}</option>)}
          </select>
          <input className={shared.modalInput} value={why} maxLength={500}
                 placeholder={tt('adminAdmins.whyPlaceholder', 'Why they are getting it')}
                 onChange={(e) => setWhy(e.target.value)} />
          <div className={shared.modalActions}>
            <button type="button" className={`${shared.actBtn} ${shared.actView}`}
                    onClick={() => setGrantOpen(false)}>
              {tt('ui.cancel', 'Cancel')}
            </button>
            <button type="button" className={`${shared.actBtn} ${shared.actApprove}`}
                    disabled={busy || !who.trim()} onClick={grant}>
              {busy ? tt('adminAdmins.granting', 'Granting...') : tt('adminAdmins.grantDo', 'Grant it')}
            </button>
          </div>
        </div>
      </div> : null}

      {revoking ? <div className={shared.modalOverlay}
                       onClick={(e) => { if (e.target === e.currentTarget) setRevoking(null); }}>
        <div className={shared.modal}>
          <h3 className={shared.modalTitle}>
            {tt('adminAdmins.revokeTitle', 'Take the console away from {who}?')
              .replace('{who}', revoking.username)}
          </h3>
          <p className={shared.modalSub}>
            {tt('adminAdmins.revokeSub', 'Their account stays, and everything they did stays in the audit log. They lose every administrator permission immediately.')}
          </p>
          <input className={shared.modalInput} value={why} maxLength={500}
                 placeholder={tt('adminAdmins.whyPlaceholder', 'Why they are getting it')}
                 onChange={(e) => setWhy(e.target.value)} />
          <div className={shared.modalActions}>
            <button type="button" className={`${shared.actBtn} ${shared.actView}`}
                    onClick={() => setRevoking(null)}>
              {tt('ui.cancel', 'Cancel')}
            </button>
            <button type="button" className={`${shared.actBtn} ${shared.actReject}`}
                    disabled={busy} onClick={revoke}>
              {busy ? tt('adminAdmins.removing', 'Removing...') : tt('adminAdmins.revoke', 'Remove')}
            </button>
          </div>
        </div>
      </div> : null}
    </div>;
}

export default function AdminAdminsPage() {
  return <AdminToastProvider><AdminsInner /></AdminToastProvider>;
}
