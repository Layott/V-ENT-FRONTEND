'use client';

// Organisations, from the console.
//
// CEO, 7 September 2026, from the admin dashboard spec: "Manage Organizations:
// edit organization profiles, manage member lists, assign roles within the
// organization. Financial Management: oversee organization funds."
//
// The shell is copied from admin/users - pageContainer, sidebarOverlay,
// AdminNav, mainContainer, AdminHeader, contentArea - because a console page
// that looks like a different console is how somebody loses their place.
//
// Money moves through `wallets.transfer` like every other movement on the
// platform, so an admin's transfer writes the same two lines and lands on the
// organisation's OWN statement. An admin moving money invisibly is how a
// platform loses an argument it cannot reconstruct.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AdminNav from '@/components/admin/AdminNav';
import AdminHeader from '@/components/admin/AdminHeader';
import { useAdminAuth } from '@/components/admin/useAdminAuth';
import { AdminToastProvider, useAdminToast } from '@/components/admin/AdminToast';
import { useAutoRefresh } from '@/lib/useLiveData';
import { apiMessage } from '@/lib/apiMessage';
import { formatNumber } from '@/lib/datetime';
import { useT } from '@/i18n/LanguageProvider';
import shared from '@/components/admin/admin.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

function OrganizationsInner() {
  const tt = useT();
  const { admin, loading: authLoading, logout } = useAdminAuth();
  const toast = useAdminToast();

  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tick, setTick] = useState(0);

  // Moving money between two wallets. Held open per organisation so the form
  // cannot be filled in against one row and submitted against another.
  // Making one. The owner is an existing account by name, because an
  // organisation with no owner is an organisation nobody can run.
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('esports');
  const [newOwner, setNewOwner] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const [moving, setMoving] = useState(null);
  const [toKind, setToKind] = useState('user');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [why, setWhy] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async ({ quiet = false } = {}) => {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('adminToken') : '';
    if (!token) { setLoading(false); return; }
    if (!quiet) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      const res = await fetch(`${API}/auth/admin/organizations/?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok || body.status !== 'success') {
        // A failed REFRESH never blanks the screen. Only the first load may
        // put an error where content was.
        if (!quiet) {
          setError(apiMessage(tt, body, 'api.couldNotLoad',
            'Could not load organisations.'));
        }
      } else {
        setRows(body.data.results || []);
        setError('');
      }
    } catch {
      if (!quiet) setError(tt('api.networkProblem',
        'The network is not answering. Try again.'));
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [search, tt]);

  useEffect(() => { load(); }, [load, tick]);
  useAutoRefresh(() => setTick((t) => t + 1), [], { interval: 30000 });

  const act = async (org, payload, okText) => {
    const token = localStorage.getItem('adminToken');
    try {
      const res = await fetch(`${API}/auth/admin/organizations/${org.slug}/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok || body.status !== 'success') {
        toast.error(apiMessage(tt, body, 'api.couldNotSave', 'That did not save.'));
        return;
      }
      toast.success(okText);
      setTick((t) => t + 1);
    } catch {
      toast.error(tt('api.networkProblem', 'The network is not answering. Try again.'));
    }
  };

  const createOrg = async () => {
    const token = localStorage.getItem('adminToken');
    setSending(true);
    try {
      const res = await fetch(`${API}/auth/admin/organizations/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(), org_type: newType,
          owner: newOwner.trim(), description: newDesc.trim(),
        }),
      });
      const body = await res.json();
      if (!res.ok || body.status !== 'success') {
        toast.error(apiMessage(tt, body, 'api.couldNotSave', 'That did not save.'));
        return;
      }
      toast.success(tt('adminOrgs.created', 'Created. It is owned by {who}.')
        .replace('{who}', newOwner.trim()));
      setCreating(false); setNewName(''); setNewOwner(''); setNewDesc('');
      setTick((t) => t + 1);
    } catch {
      toast.error(tt('api.networkProblem', 'The network is not answering. Try again.'));
    } finally {
      setSending(false);
    }
  };

  const moveFunds = async () => {
    const token = localStorage.getItem('adminToken');
    setSending(true);
    try {
      const res = await fetch(`${API}/auth/admin/transfer-funds/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_kind: 'org', from: moving.slug,
          to_kind: toKind, to: to.trim(),
          amount: Number(amount), reason: why.trim(),
        }),
      });
      const body = await res.json();
      if (!res.ok || body.status !== 'success') {
        toast.error(apiMessage(tt, body, 'api.couldNotSave', 'That did not save.'));
        return;
      }
      toast.success(tt('adminOrgs.moved', 'Moved. It is on their statement.'));
      setMoving(null); setTo(''); setAmount(''); setWhy('');
      setTick((t) => t + 1);
    } catch {
      toast.error(tt('api.networkProblem', 'The network is not answering. Try again.'));
    } finally {
      setSending(false);
    }
  };

  if (authLoading) return null;

  return <div className={shared.pageContainer}>
      <div className={`${shared.sidebarOverlay} ${sidebarOpen ? shared.open : ''}`} onClick={() => setSidebarOpen(false)} />
      <AdminNav admin={admin} onLogout={logout} sidebarOpen={sidebarOpen} badges={{}} />
      <div className={shared.mainContainer}>
        <AdminHeader admin={admin} onLogout={logout} onMenuOpen={() => setSidebarOpen(true)} searchValue={search} onSearch={setSearch} />
        <main className={shared.contentArea}>
          <div className={shared.pageHeader}>
            <div>
              <h1 className={shared.pageTitle}>{tt('adminOrgs.title', 'Organisations')}</h1>
              <p className={shared.pageSubtitle}>{tt('adminOrgs.sub', 'Every organisation on the platform, what it holds, and who runs it.')}</p>
            </div>
            <div className={shared.pageActions}>
              <button type="button" className={`${shared.actBtn} ${shared.actApprove}`}
                      onClick={() => setCreating(true)}>
                {tt('adminOrgs.create', 'Create one')}
              </button>
            </div>
          </div>

          {error ? <p className={shared.errorText}>{error}</p> : null}

          <div className={shared.card}>
            {loading ? <p className={shared.stateText}>{tt('ui.loading', 'Loading...')}</p>
              : rows.length === 0 ? <p className={shared.stateText}>
                  {search ? tt('adminOrgs.noneMatch', 'No organisation matches that.')
                    : tt('adminOrgs.none', 'There are no organisations yet.')}
                </p>
              : <div className={shared.tableWrap}><table className={shared.table}>
                  <thead>
                    <tr>
                      <th>{tt('adminOrgs.colName', 'Organisation')}</th>
                      <th className={shared.hideMobile}>{tt('adminOrgs.colType', 'Type')}</th>
                      <th className={shared.hideMobile}>{tt('adminOrgs.colMembers', 'Members')}</th>
                      <th className={shared.hideMobile}>{tt('adminOrgs.colOwner', 'Run by')}</th>
                      <th>{tt('adminOrgs.colHolds', 'Holds')}</th>
                      <th>{tt('adminOrgs.colVerified', 'Verified')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(org => <tr key={org.org_id}>
                        <td>
                          <Link className={shared.sectionLink}
                                href={`/admin/organizations/${org.slug}`}>
                            <strong>{org.name}</strong>
                          </Link>
                        </td>
                        <td className={shared.hideMobile}>{org.type}</td>
                        <td className={shared.hideMobile}>{formatNumber(org.members)}</td>
                        <td className={shared.hideMobile}>{org.owner || '-'}</td>
                        <td>{formatNumber(org.balance_vc)} VC</td>
                        <td>
                          <div className={shared.actGroup}>
                            <button type="button" className={org.verified ? shared.actBan : shared.actApprove}
                                    onClick={() => act(org, { action: 'verify', verified: !org.verified },
                                      org.verified ? tt('adminOrgs.unverified', 'No longer verified.')
                                        : tt('adminOrgs.verified', 'Verified.'))}>
                              {org.verified ? tt('adminOrgs.removeVerified', 'Remove')
                                : tt('adminOrgs.markVerified', 'Verify')}
                            </button>
                            <button type="button" className={shared.actView}
                                    onClick={() => { setMoving(org); setTo(''); setAmount(''); setWhy(''); }}>
                              {tt('adminOrgs.moveFunds', 'Move funds')}
                            </button>
                          </div>
                        </td>
                      </tr>)}
                  </tbody>
                </table></div>}
          </div>
        </main>
      </div>

      {creating ? <div className={shared.modalOverlay} onClick={(e) => {
        if (e.target === e.currentTarget) setCreating(false);
      }}>
        <div className={shared.modal}>
          <h3 className={shared.modalTitle}>{tt('adminOrgs.createTitle', 'Create an organisation')}</h3>
          <p className={shared.modalSub}>
            {tt('adminOrgs.createSub', 'It is owned by an account that already exists. The type decides what it can run, so a team organisation gets no ticketing and an event organiser does.')}
          </p>
          <input className={shared.modalInput} value={newName} maxLength={148} autoComplete="off"
                 placeholder={tt('adminOrgs.namePlaceholder', 'What it is called')}
                 onChange={(e) => setNewName(e.target.value)} />
          <select className={shared.modalInput} value={newType}
                  onChange={(e) => setNewType(e.target.value)}>
            <option value="team">{tt('adminOrgs.typeTeam', 'Team or club')}</option>
            <option value="esports">{tt('adminOrgs.typeEsports', 'Esports organisation')}</option>
            <option value="events">{tt('adminOrgs.typeEvents', 'Event organiser')}</option>
            <option value="brand">{tt('adminOrgs.typeBrand', 'Brand or sponsor')}</option>
            <option value="community">{tt('adminOrgs.typeCommunity', 'Community or fan group')}</option>
            <option value="mixed">{tt('adminOrgs.typeMixed', 'A bit of everything')}</option>
          </select>
          <input className={shared.modalInput} value={newOwner} autoComplete="off"
                 placeholder={tt('adminOrgs.ownerPlaceholder', 'Who owns it: a username or email address')}
                 onChange={(e) => setNewOwner(e.target.value)} />
          <input className={shared.modalInput} value={newDesc} maxLength={280}
                 placeholder={tt('adminOrgs.descPlaceholder', 'What it does, in a sentence')}
                 onChange={(e) => setNewDesc(e.target.value)} />
          <div className={shared.modalActions}>
            <button type="button" className={shared.actView} onClick={() => setCreating(false)}>
              {tt('ui.cancel', 'Cancel')}
            </button>
            <button type="button" className={shared.actApprove}
                    disabled={sending || !newName.trim() || !newOwner.trim()}
                    onClick={createOrg}>
              {sending ? tt('adminOrgs.creating', 'Creating...') : tt('adminOrgs.createDo', 'Create it')}
            </button>
          </div>
        </div>
      </div> : null}

      {/* Moving an organisation's money. It goes through the same transfer as
          every other movement on the platform, so it writes both lines and
          lands on the organisation's OWN statement - which this says out loud,
          because an admin who thinks a transfer is invisible will use it
          differently from one who knows the owner sees it. */}
      {moving ? <div className={shared.modalOverlay} onClick={(e) => {
        if (e.target === e.currentTarget) setMoving(null);
      }}>
        <div className={shared.modal}>
          <h3 className={shared.modalTitle}>
            {tt('adminOrgs.moveTitle', 'Move funds out of {name}').replace('{name}', moving.name)}
          </h3>
          <p className={shared.modalSub}>
            {tt('adminOrgs.moveSub', 'This organisation holds {n} VC. Whatever you move is written on its statement and on the recipient, where both can see it.')
              .replace('{n}', formatNumber(moving.balance_vc))}
          </p>

          <select className={shared.modalInput} value={toKind}
                  onChange={(e) => setToKind(e.target.value)}>
            <option value="user">{tt('wallet.toUser', 'A person')}</option>
            <option value="team">{tt('wallet.toTeam', 'A team')}</option>
            <option value="org">{tt('wallet.toOrg', 'An organisation')}</option>
          </select>
          <input className={shared.modalInput} value={to} autoComplete="off"
                 placeholder={tt('adminOrgs.moveTo', 'Who it goes to')}
                 onChange={(e) => setTo(e.target.value)} />
          <input className={shared.modalInput} type="number" min={1} value={amount}
                 placeholder={tt('wallet.amount', 'How much, in VENT COINS')}
                 onChange={(e) => setAmount(e.target.value)} />
          <input className={shared.modalInput} value={why} maxLength={200}
                 placeholder={tt('adminOrgs.moveWhy', 'Why this is being moved')}
                 onChange={(e) => setWhy(e.target.value)} />

          <div className={shared.modalActions}>
            <button type="button" className={shared.actApprove}
                    disabled={sending || !to.trim() || !amount || !why.trim()}
                    onClick={moveFunds}>
              {sending ? tt('wallet.sending', 'Sending...') : tt('adminOrgs.moveDo', 'Move it')}
            </button>
            <button type="button" className={shared.actView} onClick={() => setMoving(null)}>
              {tt('ui.cancel', 'Cancel')}
            </button>
          </div>
        </div>
      </div> : null}
    </div>;
}

export default function AdminOrganizationsPage() {
  return <AdminToastProvider><OrganizationsInner /></AdminToastProvider>;
}
