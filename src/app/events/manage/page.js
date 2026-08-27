'use client';

// Where an organiser runs the commercial side of an event: the influencers
// selling for them, the promo codes those influencers hand out, and the people
// allowed to help.
//
// All three were API-only until now. The endpoints existed and were tested and
// there was no screen, which from the organiser's side is the same as not
// existing.
//
// Adding a manager is the one control that is not always offered. An event can
// only be shared when it belongs to an organisation, and the listing endpoint
// says whether that is true, so the page can explain why rather than showing a
// control whose save is refused.

import { apiMessage } from '@/lib/apiMessage';
import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FaTrash, FaPlus } from 'react-icons/fa6';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './manage-event.module.css';
import { useT } from '@/i18n/LanguageProvider';
const API = process.env.NEXT_PUBLIC_API_URL;
const TABS = ['influencers', 'promos', 'team'];
export const ManageEventContent = ({
  slug: slugFromPath
}) => {
  const tt = useT();
  const searchParams = useSearchParams();
  const {
    data: session
  } = useSession();
  const token = session?.user?.sessionToken;
  const eventRef = slugFromPath || searchParams.get('id');
  const [tab, setTab] = useState('influencers');
  const [referrals, setReferrals] = useState([]);
  const [promos, setPromos] = useState([]);
  const [managers, setManagers] = useState([]);
  const [canAddManagers, setCanAddManagers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  // New-row drafts, one per section.
  const [newReferral, setNewReferral] = useState({
    name: '',
    code: '',
    url: '',
    allocation: ''
  });
  const [newPromo, setNewPromo] = useState({
    code: '',
    kind: 'percent',
    value: '',
    max_tickets: '',
    referral_id: ''
  });
  const [newManager, setNewManager] = useState({
    username: '',
    role: 'manager'
  });
  const call = useCallback(async (path, options = {}) => {
    const res = await fetch(`${API}/event/${eventRef}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? {
          'Content-Type': 'application/json'
        } : {}),
        ...(options.headers || {})
      }
    });
    let body = {};
    try {
      body = await res.json();
    } catch {
      body = {};
    }
    return {
      ok: res.ok && body.status === 'success',
      body
    };
  }, [eventRef, token]);
  const load = useCallback(async () => {
    if (!token || !eventRef) return;
    setLoading(true);
    setError('');
    const [r, p, m] = await Promise.all([call('/referrals/'), call('/promos/'), call('/managers/')]);
    if (!r.ok && !p.ok && !m.ok) {
      setError(apiMessage(tt, r.body, 'api.couldNotLoadThisEvent', 'Could not load this event.'));
      setLoading(false);
      return;
    }
    setReferrals(r.body?.data?.results || []);
    setPromos(p.body?.data?.results || []);
    setManagers(m.body?.data?.results || []);
    setCanAddManagers(!!m.body?.data?.can_add);
    setLoading(false);
  }, [call, token, eventRef]);
  useEffect(() => {
    load();
  }, [load]);
  const run = async (fn, successKey, successText) => {
    setBusy(true);
    setNotice('');
    setError('');
    const {
      ok,
      body
    } = await fn();
    setBusy(false);
    if (ok) {
      setNotice(body.message || tt(successKey, successText));
      await load();
      return true;
    }
    setError(apiMessage(tt, body, 'api.failed', 'Failed.'));
    return false;
  };

  // ------------------------------------------------------------- influencers
  const addReferral = async () => {
    const done = await run(() => call('/referrals/', {
      method: 'POST',
      body: JSON.stringify({
        ...newReferral,
        allocation: Number(newReferral.allocation) || 0
      })
    }), 'manage.linkAdded', 'Link added.');
    if (done) setNewReferral({
      name: '',
      code: '',
      url: '',
      allocation: ''
    });
  };
  const saveReferral = (row, patch) => run(() => call(`/referrals/${row.id}/`, {
    method: 'PATCH',
    body: JSON.stringify(patch)
  }), 'manage.saved', 'Saved.');
  const removeReferral = row => run(() => call(`/referrals/${row.id}/`, {
    method: 'DELETE'
  }), 'manage.removed', 'Removed.');

  // ------------------------------------------------------------------ promos
  const addPromo = async () => {
    const done = await run(() => call('/promos/', {
      method: 'POST',
      body: JSON.stringify({
        ...newPromo,
        value: Number(newPromo.value) || 0,
        max_tickets: Number(newPromo.max_tickets) || 0,
        referral_id: newPromo.referral_id || null
      })
    }), 'manage.promoCreated', 'Promo created.');
    if (done) setNewPromo({
      code: '',
      kind: 'percent',
      value: '',
      max_tickets: '',
      referral_id: ''
    });
  };
  const savePromo = (row, patch) => run(() => call(`/promos/${row.id}/`, {
    method: 'PATCH',
    body: JSON.stringify(patch)
  }), 'manage.saved', 'Saved.');
  const removePromo = row => run(() => call(`/promos/${row.id}/`, {
    method: 'DELETE'
  }), 'manage.removed', 'Removed.');

  // ------------------------------------------------------------------- team
  const addManager = async () => {
    const done = await run(() => call('/managers/', {
      method: 'POST',
      body: JSON.stringify(newManager)
    }), 'manage.managerAdded', 'Added.');
    if (done) setNewManager({
      username: '',
      role: 'manager'
    });
  };
  const removeManager = row => run(() => call(`/managers/${row.id}/`, {
    method: 'DELETE'
  }), 'manage.removed', 'Removed.');
  const tabLabel = key => ({
    influencers: tt('manage.tabInfluencers', 'Influencers'),
    promos: tt('manage.tabPromos', 'Promo codes'),
    team: tt('manage.tabTeam', 'Team')
  })[key];
  return <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      <main className={styles.mainContainer}>
        <Sidebar />
        <div className={styles.rightPane}>
          <Link href={`/events/${eventRef}`} className={styles.backLink}>
            {tt('manage.backToEvent', '← Back to the event')}
          </Link>
          <h1 className={styles.pageTitle}>{tt('manage.title', 'Run this event')}</h1>
          <p className={styles.pageSub}>
            {tt('manage.sub', 'The people selling for you, the codes they hand out, and who else can help.')}
          </p>

          <div className={styles.tabRow}>
            {TABS.map(key => <button key={key} type="button" className={`${styles.tab} ${tab === key ? styles.tabOn : ''}`} onClick={() => setTab(key)}>
                {tabLabel(key)}
              </button>)}
          </div>

          {error && <p className={styles.error}>{error}</p>}
          {notice && <p className={styles.notice}>{notice}</p>}
          {loading ? <p className={styles.muted}>{tt('ui.loading', 'Loading…')}</p> : <>
              {/* ------------------------------------------------ influencers */}
              {tab === 'influencers' && <section className={styles.card}>
                  <p className={styles.cardHint}>
                    {tt('manage.influencerHint', 'Give somebody a code and their link becomes /events/…?ref=CODE. Set an allocation to hold a number of tickets for them, or leave it at zero to just track what they sell.')}
                  </p>

                  {referrals.length === 0 ? <p className={styles.muted}>{tt('manage.noInfluencers', 'Nobody is selling for you yet.')}</p> : <div className={styles.rows}>
                      {referrals.map(row => <div key={row.id} className={styles.row}>
                          <div className={styles.rowMain}>
                            <strong className={styles.rowName}>{row.name}</strong>
                            <span className={styles.code}>{row.code}</span>
                            {!row.is_active && <span className={styles.offBadge}>{tt('manage.switchedOff', 'Switched off')}</span>}
                          </div>
                          <div className={styles.rowStats}>
                            <span>{tt('manage.sold', 'Sold')}: <strong>{row.sold}</strong></span>
                            <span>
                              {tt('manage.allocation', 'Allocation')}:{' '}
                              <strong>{row.allocation ? `${row.remaining} / ${row.allocation}` : tt('manage.uncapped', 'No cap')}</strong>
                            </span>
                          </div>
                          <div className={styles.rowActions}>
                            <input className={styles.smallInput} type="number" min={row.sold} defaultValue={row.allocation} aria-label={tt('manage.allocation', 'Allocation')} onBlur={e => {
                      const next = Number(e.target.value) || 0;
                      if (next !== row.allocation) saveReferral(row, {
                        allocation: next
                      });
                    }} />
                            <button type="button" className={styles.ghostBtn} disabled={busy} onClick={() => saveReferral(row, {
                      is_active: !row.is_active
                    })}>
                              {row.is_active ? tt('manage.switchOff', 'Switch off') : tt('manage.switchOn', 'Switch on')}
                            </button>
                            <button type="button" className={styles.iconBtn} disabled={busy} onClick={() => removeReferral(row)} aria-label={tt('manage.remove', 'Remove')}>
                              <FaTrash />
                            </button>
                          </div>
                        </div>)}
                    </div>}

                  <div className={styles.newRow}>
                    <input className={styles.input} placeholder={tt('manage.influencerName', 'Name')} value={newReferral.name} onChange={e => setNewReferral(p => ({
                  ...p,
                  name: e.target.value
                }))} />
                    <input className={styles.input} placeholder={tt('manage.code', 'Code')} value={newReferral.code} onChange={e => setNewReferral(p => ({
                  ...p,
                  code: e.target.value.toUpperCase()
                }))} />
                    <input className={styles.input} type="url" placeholder={tt('manage.channel', 'Their channel (optional)')} value={newReferral.url} onChange={e => setNewReferral(p => ({
                  ...p,
                  url: e.target.value
                }))} />
                    <input className={styles.input} type="number" min={0} placeholder={tt('manage.allocationPlaceholder', 'Tickets held (0 = none)')} value={newReferral.allocation} onChange={e => setNewReferral(p => ({
                  ...p,
                  allocation: e.target.value
                }))} />
                    <button type="button" className={styles.addBtn} disabled={busy || !newReferral.name.trim() || !newReferral.code.trim()} onClick={addReferral}>
                      <FaPlus /> {tt('manage.addInfluencer', 'Add')}
                    </button>
                  </div>
                </section>}

              {/* ----------------------------------------------------- promos */}
              {tab === 'promos' && <section className={styles.card}>
                  <p className={styles.cardHint}>
                    {tt('manage.promoHint', 'The limit counts tickets, not uses, because one order can carry several. Credit a code to an influencer to see what their audience bought.')}
                  </p>

                  {promos.length === 0 ? <p className={styles.muted}>{tt('manage.noPromos', 'No promo codes yet.')}</p> : <div className={styles.rows}>
                      {promos.map(row => <div key={row.id} className={styles.row}>
                          <div className={styles.rowMain}>
                            <strong className={styles.rowName}>{row.code}</strong>
                            <span className={styles.code}>
                              {row.kind === 'percent' ? `${Number(row.value)}%` : `-${Number(row.value)}`}
                            </span>
                            {row.referral_name && <span className={styles.creditedTo}>
                                {tt('manage.creditedTo', 'credited to {name}').replace('{name}', row.referral_name)}
                              </span>}
                            {!row.is_active && <span className={styles.offBadge}>{tt('manage.switchedOff', 'Switched off')}</span>}
                          </div>
                          <div className={styles.rowStats}>
                            <span>
                              {tt('manage.used', 'Used')}:{' '}
                              <strong>{row.max_tickets ? `${row.used_tickets} / ${row.max_tickets}` : row.used_tickets}</strong>
                            </span>
                          </div>
                          <div className={styles.rowActions}>
                            <button type="button" className={styles.ghostBtn} disabled={busy} onClick={() => savePromo(row, {
                      is_active: !row.is_active
                    })}>
                              {row.is_active ? tt('manage.switchOff', 'Switch off') : tt('manage.switchOn', 'Switch on')}
                            </button>
                            <button type="button" className={styles.iconBtn} disabled={busy} onClick={() => removePromo(row)} aria-label={tt('manage.remove', 'Remove')}>
                              <FaTrash />
                            </button>
                          </div>
                        </div>)}
                    </div>}

                  <div className={styles.newRow}>
                    <input className={styles.input} placeholder={tt('manage.code', 'Code')} value={newPromo.code} onChange={e => setNewPromo(p => ({
                  ...p,
                  code: e.target.value.toUpperCase()
                }))} />
                    <select className={styles.input} value={newPromo.kind} onChange={e => setNewPromo(p => ({
                  ...p,
                  kind: e.target.value
                }))}>
                      <option value="percent">{tt('manage.percentOff', 'Percent off')}</option>
                      <option value="amount">{tt('manage.amountOff', 'Amount off')}</option>
                    </select>
                    <input className={styles.input} type="number" min={0} placeholder={tt('manage.value', 'Value')} value={newPromo.value} onChange={e => setNewPromo(p => ({
                  ...p,
                  value: e.target.value
                }))} />
                    <input className={styles.input} type="number" min={0} placeholder={tt('manage.maxTickets', 'Ticket limit (0 = none)')} value={newPromo.max_tickets} onChange={e => setNewPromo(p => ({
                  ...p,
                  max_tickets: e.target.value
                }))} />
                    <select className={styles.input} value={newPromo.referral_id} onChange={e => setNewPromo(p => ({
                  ...p,
                  referral_id: e.target.value
                }))}>
                      <option value="">{tt('manage.noCredit', 'Not credited to anybody')}</option>
                      {referrals.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    <button type="button" className={styles.addBtn} disabled={busy || !newPromo.code.trim() || !newPromo.value} onClick={addPromo}>
                      <FaPlus /> {tt('manage.addPromo', 'Create')}
                    </button>
                  </div>
                </section>}

              {/* ------------------------------------------------------- team */}
              {tab === 'team' && <section className={styles.card}>
                  {!canAddManagers ? <p className={styles.muted}>
                      {tt('manage.notAnOrgEvent', 'This event belongs to you rather than to an organisation, so it cannot be shared with other people. Move it to an organisation to give somebody else the door list and the codes.')}
                    </p> : <p className={styles.cardHint}>
                      {tt('manage.teamHint', 'A manager can do everything here except delete the event or add more managers. Door staff can only check tickets in.')}
                    </p>}

                  {managers.length === 0 ? <p className={styles.muted}>{tt('manage.noManagers', 'Nobody else is helping run this yet.')}</p> : <div className={styles.rows}>
                      {managers.map(row => <div key={row.id} className={styles.row}>
                          <div className={styles.rowMain}>
                            <strong className={styles.rowName}>{row.username}</strong>
                            <span className={styles.code}>
                              {row.role === 'door' ? tt('manage.roleDoor', 'Door staff') : tt('manage.roleManager', 'Manager')}
                            </span>
                          </div>
                          <div className={styles.rowActions}>
                            <button type="button" className={styles.iconBtn} disabled={busy} onClick={() => removeManager(row)} aria-label={tt('manage.remove', 'Remove')}>
                              <FaTrash />
                            </button>
                          </div>
                        </div>)}
                    </div>}

                  {canAddManagers && <div className={styles.newRow}>
                      <input className={styles.input} placeholder={tt('manage.username', 'Username')} value={newManager.username} onChange={e => setNewManager(p => ({
                  ...p,
                  username: e.target.value
                }))} />
                      <select className={styles.input} value={newManager.role} onChange={e => setNewManager(p => ({
                  ...p,
                  role: e.target.value
                }))}>
                        <option value="manager">{tt('manage.roleManager', 'Manager')}</option>
                        <option value="door">{tt('manage.roleDoor', 'Door staff')}</option>
                      </select>
                      <button type="button" className={styles.addBtn} disabled={busy || !newManager.username.trim()} onClick={addManager}>
                        <FaPlus /> {tt('manage.addManager', 'Add')}
                      </button>
                    </div>}
                </section>}
            </>}
        </div>
      </main>
      <BottomMenu />
    </div>;
};
const ManageEventPage = () => <Suspense fallback={<div style={{
  minHeight: '100vh',
  backgroundColor: '#131316'
}} />}>
    <ManageEventContent />
  </Suspense>;
export default ManageEventPage;
