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
import DateField from '@/components/date-field/DateField';
import { appLocale } from '@/lib/appLocale';
import styles from './manage-event.module.css';
import { useT } from '@/i18n/LanguageProvider';
const API = process.env.NEXT_PUBLIC_API_URL;

// The site's language, not the browser's.
const formatDateTime = value => (value
  ? new Date(value).toLocaleString(appLocale(), {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
  : '');
const TABS = ['tickets', 'money', 'holds', 'programme', 'queue',
  'influencers', 'promos', 'team'];
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
  const [tab, setTab] = useState('tickets');
  const [tiers, setTiers] = useState([]);
  const [money, setMoney] = useState(null);
  const [holds, setHolds] = useState([]);
  const [newHold, setNewHold] = useState({ name: '', quantity: '', tier: '', kind: 'guest' });
  const [issuing, setIssuing] = useState(null);
  const [issueNames, setIssueNames] = useState('');
  const [sessions, setSessions] = useState([]);
  const [newSession, setNewSession] = useState({ title: '', starts_at: '', stage: '', capacity: '' });
  const [queue, setQueue] = useState(null);
  const [newTier, setNewTier] = useState({ name: '', price: '', quantity: '', perks: '' });
  const [pricing, setPricing] = useState(null);   // tier id being priced
  const [askFields, setAskFields] = useState([]);
  const [newField, setNewField] = useState({ label: '', kind: 'text', required: false, per_ticket: true, options: '' });
  const [editing, setEditing] = useState(null);
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
    const [r, p, m, ti, mo, ho, se, qu, cf] = await Promise.all([
      call('/referrals/'), call('/promos/'), call('/managers/'), call('/tiers/'),
      call('/money/'), call('/holds/'), call('/sessions/manage/'), call('/waitlist/all/'),
      call('/checkout-fields/manage/'),
    ]);
    if (!r.ok && !p.ok && !m.ok) {
      setError(apiMessage(tt, r.body, 'api.couldNotLoadThisEvent', 'Could not load this event.'));
      setLoading(false);
      return;
    }
    setTiers(ti.body?.data?.tiers || []);
    setMoney(mo.body?.data || null);
    setHolds(ho.body?.data?.holds || []);
    setSessions(se.body?.data?.sessions || []);
    setQueue(qu.body?.data || null);
    setAskFields(cf.body?.data?.fields || []);
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
  // Ticket types on an event that already exists.
  const addTier = () => {
    if (!newTier.name.trim()) return;
    return run(() => call('/tiers/', {
      method: 'POST',
      body: JSON.stringify({
        name: newTier.name.trim(),
        price: newTier.price || 0,
        quantity: newTier.quantity || 0,
        perks: newTier.perks,
      }),
    }), 'manage.tierAdded', 'Ticket type added.')
      .then(() => setNewTier({ name: '', price: '', quantity: '', perks: '' }));
  };

  const saveTier = (row, patch) => run(() => call(`/tiers/${row.id}/`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  }), 'manage.tierUpdated', 'Ticket type updated.').then(() => setEditing(null));

  const removeTier = row => run(() => call(`/tiers/${row.id}/delete/`, {
    method: 'DELETE',
  }), 'manage.tierRemoved', 'Ticket type removed.');

  const savePricing = (row, patch) => run(() => call(`/tiers/${row.id}/`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  }), 'manage.tierUpdated', 'Ticket type updated.').then(() => setPricing(null));

  // What a buyer is asked for. The organiser decides, because a five-a-side
  // needs a shirt size and a conference needs a dietary requirement, and
  // neither is a column anybody could have guessed.
  //
  // Email is not in this list and cannot be: a ticket with no way to reach the
  // holder is not a ticket.
  const saveFields = next => run(() => call('/checkout-fields/manage/', {
    method: 'PUT',
    body: JSON.stringify({
      fields: next.map(f => ({
        label: f.label,
        kind: f.kind,
        help_text: f.help_text || '',
        required: f.required,
        per_ticket: f.per_ticket,
        options: Array.isArray(f.options) ? f.options
          : String(f.options || '').split(',').map(o => o.trim()).filter(Boolean),
      })),
    }),
  }), 'manage.fieldsSaved', 'Saved.');

  const addField = async () => {
    if (!newField.label.trim()) return;
    const done = await saveFields([...askFields, newField]);
    if (done) setNewField({ label: '', kind: 'text', required: false, per_ticket: true, options: '' });
  };

  const removeField = row => saveFields(askFields.filter(f => f.id !== row.id));

  // ------------------------------------------------------------------ holds
  const addHold = () => {
    if (!newHold.name.trim()) return;
    return run(() => call('/holds/', {
      method: 'POST',
      body: JSON.stringify({
        name: newHold.name.trim(),
        quantity: newHold.quantity || 1,
        kind: newHold.kind,
        tier: newHold.tier || null,
      }),
    }), 'manage.holdAdded', 'Tickets held.')
      .then(() => setNewHold({ name: '', quantity: '', tier: '', kind: 'guest' }));
  };

  const releaseHold = row => run(() => call(`/holds/${row.id}/release/`, {
    method: 'POST', body: JSON.stringify({}),
  }), 'manage.holdReleased', 'Back on sale.');

  const issueHold = row => {
    const names = issueNames.split('\n').map(n => n.trim()).filter(Boolean);
    if (!names.length) return;
    return run(() => call(`/holds/${row.id}/issue/`, {
      method: 'POST', body: JSON.stringify({ names }),
    }), 'manage.holdIssued', 'Tickets issued.')
      .then(() => { setIssuing(null); setIssueNames(''); });
  };

  // -------------------------------------------------------------- programme
  const addSession = () => {
    if (!newSession.title.trim() || !newSession.starts_at) return;
    return run(() => call('/sessions/manage/', {
      method: 'POST',
      body: JSON.stringify({
        title: newSession.title.trim(),
        starts_at: newSession.starts_at,
        stage: newSession.stage,
        capacity: newSession.capacity || 0,
      }),
    }), 'manage.sessionAdded', 'Added to the programme.')
      .then(() => setNewSession({ title: '', starts_at: '', stage: '', capacity: '' }));
  };

  const removeSession = row => run(() => call(`/sessions/${row.id}/`, {
    method: 'DELETE',
  }), 'manage.sessionRemoved', 'Taken off the programme.');

  const tabLabel = key => ({
    tickets: tt('manage.tabTickets', 'Tickets'),
    money: tt('manage.tabMoney', 'Money'),
    holds: tt('manage.tabHolds', 'Holds'),
    programme: tt('manage.tabProgramme', 'Programme'),
    queue: tt('manage.tabQueue', 'Waiting list'),
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
          <div className={styles.rowBetween}>
            <h1 className={styles.pageTitle}>{tt('manage.title', 'Run this event')}</h1>
            <Link href={`/events/scan?event=${eventRef}&gate=Main`} className={styles.primaryBtn}>
              {tt('manage.openDoor', 'Open the door scanner')}
            </Link>
          </div>
          <p className={styles.pageSub}>
            {tt('manage.sub', 'What you sell, the people selling it for you, the codes they hand out, and who else can help.')}
          </p>

          <div className={styles.tabRow}>
            {TABS.map(key => <button key={key} type="button" className={`${styles.tab} ${tab === key ? styles.tabOn : ''}`} onClick={() => setTab(key)}>
                {tabLabel(key)}
              </button>)}
          </div>

          {error && <p className={styles.error}>{error}</p>}
          {notice && <p className={styles.notice}>{notice}</p>}
          {loading ? <p className={styles.muted}>{tt('ui.loading', 'Loading…')}</p> : <>
              {/* ---------------------------------------------------- tickets */}
              {tab === 'tickets' && <section className={styles.card}>
                  <p className={styles.cardHint}>
                    {tt('manage.tierHint', 'What people can buy. Add a type at any time, correct a price, or open more when one sells out. How many are sold is counted from the tickets themselves and cannot be typed.')}
                  </p>

                  {tiers.length === 0 ? <p className={styles.muted}>
                      {tt('manage.noTiers', 'No ticket types yet, so nobody can buy anything for this event.')}
                    </p> : <div className={styles.rows}>
                      {tiers.map(row => <div key={row.id} className={styles.row}>
                          <div className={styles.rowMain}>
                            <strong className={styles.rowName}>{row.name}</strong>
                            <span className={styles.code}>
                              {row.price_vc > 0
                                ? `${row.price_vc} VC`
                                : tt('manage.tierFree', 'Free')}
                            </span>
                            <span className={styles.muted}>
                              {tt('manage.tierSold', '{sold} of {total} sold')
                                .replace('{sold}', row.sold)
                                .replace('{total}', row.quantity || '-')}
                            </span>
                            {row.sold_out && <span className={styles.offBadge}>
                              {tt('manage.tierSoldOut', 'Sold out')}
                            </span>}
                          </div>

                          {pricing === row.id ? <div className={styles.editRow}>
                              <input className={styles.input} type="number" min="0"
                                     defaultValue={row.early_bird_quantity || ''}
                                     placeholder={tt('manage.earlyQuantity', 'Early bird: first how many')}
                                     onChange={e => { row._ebq = e.target.value; }} />
                              <input className={styles.input} type="number" min="0"
                                     defaultValue={row.early_bird_price ?? ''}
                                     placeholder={tt('manage.earlyPrice', 'Price after that')}
                                     onChange={e => { row._ebp = e.target.value; }} />
                              <input className={styles.input} type="number" min="0"
                                     defaultValue={row.group_min || ''}
                                     placeholder={tt('manage.groupMin', 'Group: from how many')}
                                     onChange={e => { row._gm = e.target.value; }} />
                              <input className={styles.input} type="number" min="0"
                                     defaultValue={row.group_price ?? ''}
                                     placeholder={tt('manage.groupPrice', 'Price each')}
                                     onChange={e => { row._gp = e.target.value; }} />
                              <input className={styles.input}
                                     defaultValue={row.access_code || ''}
                                     placeholder={tt('manage.accessCode', 'Access code, to hide it')}
                                     onChange={e => { row._ac = e.target.value; }} />
                              <button type="button" className={styles.primaryBtn} disabled={busy}
                                      onClick={() => savePricing(row, {
                                        ...(row._ebq !== undefined ? { early_bird_quantity: row._ebq } : {}),
                                        ...(row._ebp !== undefined ? { early_bird_price: row._ebp } : {}),
                                        ...(row._gm !== undefined ? { group_min: row._gm } : {}),
                                        ...(row._gp !== undefined ? { group_price: row._gp } : {}),
                                        ...(row._ac !== undefined ? { access_code: row._ac } : {}),
                                      })}>
                                {tt('manage.save', 'Save')}
                              </button>
                              <button type="button" className={styles.ghostBtn}
                                      onClick={() => setPricing(null)}>
                                {tt('ui.cancel.77df', 'Cancel')}
                              </button>
                            </div> : editing === row.id ? <div className={styles.editRow}>
                              <input className={styles.input} type="number" min="0"
                                     defaultValue={row.price_ngn}
                                     placeholder={tt('manage.tierPriceNgn', 'Price in naira')}
                                     onChange={e => { row._price = e.target.value; }} />
                              <input className={styles.input} type="number" min={row.sold}
                                     defaultValue={row.quantity}
                                     placeholder={tt('manage.tierQuantity', 'How many')}
                                     onChange={e => { row._quantity = e.target.value; }} />
                              <button type="button" className={styles.primaryBtn} disabled={busy}
                                      onClick={() => saveTier(row, {
                                        ...(row._price !== undefined ? { price: row._price } : {}),
                                        ...(row._quantity !== undefined ? { quantity: row._quantity } : {}),
                                      })}>
                                {tt('manage.save', 'Save')}
                              </button>
                              <button type="button" className={styles.ghostBtn}
                                      onClick={() => setEditing(null)}>
                                {tt('ui.cancel.77df', 'Cancel')}
                              </button>
                            </div> : <div className={styles.rowActions}>
                              <button type="button" className={styles.ghostBtn} disabled={busy}
                                      onClick={() => setEditing(row.id)}>
                                {tt('manage.tierEdit', 'Change price or how many')}
                              </button>
                              <button type="button" className={styles.ghostBtn} disabled={busy}
                                      onClick={() => setPricing(row.id)}>
                                {tt('manage.tierPricing', 'Early bird, groups, access code')}
                              </button>
                              {row.sold === 0 && <button type="button" className={styles.ghostBtn}
                                      disabled={busy} onClick={() => removeTier(row)}>
                                {tt('manage.tierRemove', 'Remove')}
                              </button>}
                            </div>}
                        </div>)}
                    </div>}

                  {/* What a buyer is asked for at checkout. */}
                  <h3 className={styles.subTitle}>
                    {tt('manage.askTitle', 'What buyers are asked for')}
                  </h3>
                  <p className={styles.cardHint}>
                    {tt('manage.askHint', 'An email address is always collected and cannot be turned off, because a ticket with no way to reach the holder is not a ticket. Anything else is up to you: a shirt size, a dietary requirement, which day they are coming.')}
                  </p>

                  {askFields.length === 0 ? <p className={styles.muted}>
                      {tt('manage.noFields', 'Just an email address. Buyers can check out in one step.')}
                    </p> : <div className={styles.rows}>
                      {askFields.map(row => <div key={row.id} className={styles.row}>
                          <div className={styles.rowMain}>
                            <strong className={styles.rowName}>{row.label}</strong>
                            <span className={styles.code}>{row.kind}</span>
                            {row.required && <span className={styles.muted}>
                              {tt('manage.fieldRequired', 'required')}
                            </span>}
                            {!row.per_ticket && <span className={styles.muted}>
                              {tt('manage.fieldPerOrder', 'once per order')}
                            </span>}
                          </div>
                          <div className={styles.rowActions}>
                            <button type="button" className={styles.ghostBtn} disabled={busy}
                                    onClick={() => removeField(row)}>
                              {tt('manage.fieldRemove', 'Remove')}
                            </button>
                          </div>
                        </div>)}
                    </div>}

                  <div className={styles.newRow}>
                    <input className={styles.input} value={newField.label}
                           placeholder={tt('manage.fieldLabel', 'What to ask, e.g. Shirt size')}
                           onChange={e => setNewField(v => ({ ...v, label: e.target.value }))} />
                    <select className={styles.input} value={newField.kind}
                            onChange={e => setNewField(v => ({ ...v, kind: e.target.value }))}>
                      <option value="text">{tt('manage.kindText', 'Text')}</option>
                      <option value="phone">{tt('manage.kindPhone', 'Phone number')}</option>
                      <option value="number">{tt('manage.kindNumber', 'A number')}</option>
                      <option value="choice">{tt('manage.kindChoice', 'One of a list')}</option>
                      <option value="checkbox">{tt('manage.kindCheckbox', 'A yes or no')}</option>
                    </select>
                    {newField.kind === 'choice' && <input className={styles.input}
                           value={newField.options}
                           placeholder={tt('manage.fieldOptions', 'The options, separated by commas')}
                           onChange={e => setNewField(v => ({ ...v, options: e.target.value }))} />}
                    <label className={styles.checkInline}>
                      <input type="checkbox" checked={newField.required}
                             onChange={e => setNewField(v => ({ ...v, required: e.target.checked }))} />
                      <span>{tt('manage.fieldRequiredLabel', 'Must be answered')}</span>
                    </label>
                    <label className={styles.checkInline}>
                      <input type="checkbox" checked={!newField.per_ticket}
                             onChange={e => setNewField(v => ({ ...v, per_ticket: !e.target.checked }))} />
                      <span>{tt('manage.fieldOnceLabel', 'Ask once per order')}</span>
                    </label>
                    <button type="button" className={styles.primaryBtn}
                            disabled={busy || !newField.label.trim()} onClick={addField}>
                      {tt('manage.addField', 'Add the question')}
                    </button>
                  </div>

                  <h3 className={styles.subTitle}>
                    {tt('manage.addTierTitle', 'Add a ticket type')}
                  </h3>
                  <div className={styles.newRow}>
                    <input className={styles.input} value={newTier.name}
                           placeholder={tt('manage.tierName', 'Name, e.g. VIP')}
                           onChange={e => setNewTier(v => ({ ...v, name: e.target.value }))} />
                    <input className={styles.input} type="number" min="0" value={newTier.price}
                           placeholder={tt('manage.tierPriceNgn', 'Price in naira')}
                           onChange={e => setNewTier(v => ({ ...v, price: e.target.value }))} />
                    <input className={styles.input} type="number" min="0" value={newTier.quantity}
                           placeholder={tt('manage.tierQuantity', 'How many')}
                           onChange={e => setNewTier(v => ({ ...v, quantity: e.target.value }))} />
                    <input className={styles.input} value={newTier.perks}
                           placeholder={tt('manage.tierPerks', 'What it includes, separated by commas')}
                           onChange={e => setNewTier(v => ({ ...v, perks: e.target.value }))} />
                    <button type="button" className={styles.primaryBtn}
                            disabled={busy || !newTier.name.trim()} onClick={addTier}>
                      {tt('manage.addTier', 'Add ticket type')}
                    </button>
                  </div>
                </section>}

              {/* ------------------------------------------------------ money */}
              {tab === 'money' && <section className={styles.card}>
                  <p className={styles.cardHint}>
                    {tt('manage.moneyHint', 'Counted from the tickets themselves, so it reconciles: what is owed is what was taken less what went back.')}
                  </p>
                  {!money ? <p className={styles.muted}>{tt('ui.loading', 'Loading…')}</p> : <>
                    <div className={styles.rows}>
                      <div className={styles.row}>
                        <div className={styles.rowMain}>
                          <strong className={styles.rowName}>{tt('manage.moneyTaken', 'Taken')}</strong>
                          <span className={styles.muted}>
                            {tt('manage.moneyTickets', '{n} tickets').replace('{n}', money.taken.count)}
                          </span>
                        </div>
                        <span className={styles.code}>{money.taken.vc} VC</span>
                      </div>
                      <div className={styles.row}>
                        <div className={styles.rowMain}>
                          <strong className={styles.rowName}>{tt('manage.moneyReturned', 'Refunded or cancelled')}</strong>
                          <span className={styles.muted}>
                            {tt('manage.moneyTickets', '{n} tickets').replace('{n}', money.returned.count)}
                          </span>
                        </div>
                        <span className={styles.code}>{money.returned.vc} VC</span>
                      </div>
                      <div className={styles.row}>
                        <div className={styles.rowMain}>
                          <strong className={styles.rowName}>{tt('manage.moneyOwed', 'Owed to you')}</strong>
                        </div>
                        <span className={styles.code}>{money.owed.vc} VC</span>
                      </div>
                      <div className={styles.row}>
                        <div className={styles.rowMain}>
                          <strong className={styles.rowName}>{tt('manage.moneyDoor', 'Checked in')}</strong>
                          <span className={styles.muted}>
                            {tt('manage.moneyFree', '{n} of them free').replace('{n}', money.free_tickets)}
                          </span>
                        </div>
                        <span className={styles.code}>{money.checked_in}</span>
                      </div>
                    </div>

                    <h3 className={styles.subTitle}>{tt('manage.moneyByType', 'By ticket type')}</h3>
                    <div className={styles.rows}>
                      {money.by_tier.map(row => <div key={row.id} className={styles.row}>
                          <div className={styles.rowMain}>
                            <strong className={styles.rowName}>{row.name}</strong>
                            <span className={styles.muted}>
                              {tt('manage.moneyTickets', '{n} tickets').replace('{n}', row.count)}
                            </span>
                          </div>
                          <span className={styles.code}>{row.vc} VC</span>
                        </div>)}
                    </div>
                  </>}
                </section>}

              {/* ------------------------------------------------------ holds */}
              {tab === 'holds' && <section className={styles.card}>
                  <p className={styles.cardHint}>
                    {tt('manage.holdHint', 'Tickets taken off sale without being sold: the guest list, press, the venue. Release them back, or issue them to named people as free tickets. This is what to use instead of buying your own tickets, which would put them in your sales figures.')}
                  </p>

                  {holds.length === 0 ? <p className={styles.muted}>
                      {tt('manage.noHolds', 'Nothing held back.')}
                    </p> : <div className={styles.rows}>
                      {holds.map(row => <div key={row.id} className={styles.row}>
                          <div className={styles.rowMain}>
                            <strong className={styles.rowName}>{row.name}</strong>
                            <span className={styles.code}>
                              {tt('manage.holdCount', '{held} held, {issued} issued')
                                .replace('{held}', row.outstanding)
                                .replace('{issued}', row.issued)}
                            </span>
                            {row.tier_name && <span className={styles.muted}>{row.tier_name}</span>}
                            {row.released && <span className={styles.offBadge}>{tt('manage.holdReleasedBadge', 'Released')}</span>}
                          </div>

                          {issuing === row.id ? <div className={styles.editRow}>
                              <textarea className={styles.input} rows={3} value={issueNames}
                                        placeholder={tt('manage.holdNames', 'One name per line')}
                                        onChange={e => setIssueNames(e.target.value)} />
                              <button type="button" className={styles.primaryBtn} disabled={busy}
                                      onClick={() => issueHold(row)}>
                                {tt('manage.holdIssue', 'Issue')}
                              </button>
                              <button type="button" className={styles.ghostBtn}
                                      onClick={() => { setIssuing(null); setIssueNames(''); }}>
                                {tt('ui.cancel.77df', 'Cancel')}
                              </button>
                            </div> : !row.released && <div className={styles.rowActions}>
                              <button type="button" className={styles.ghostBtn} disabled={busy}
                                      onClick={() => setIssuing(row.id)}>
                                {tt('manage.holdIssue', 'Issue')}
                              </button>
                              <button type="button" className={styles.ghostBtn} disabled={busy}
                                      onClick={() => releaseHold(row)}>
                                {tt('manage.holdRelease', 'Back on sale')}
                              </button>
                            </div>}
                        </div>)}
                    </div>}

                  <div className={styles.newRow}>
                    <input className={styles.input} value={newHold.name}
                           placeholder={tt('manage.holdName', 'Who for, e.g. Guest list')}
                           onChange={e => setNewHold(v => ({ ...v, name: e.target.value }))} />
                    <input className={styles.input} type="number" min="1" value={newHold.quantity}
                           placeholder={tt('manage.holdQuantity', 'How many')}
                           onChange={e => setNewHold(v => ({ ...v, quantity: e.target.value }))} />
                    <select className={styles.input} value={newHold.tier}
                            onChange={e => setNewHold(v => ({ ...v, tier: e.target.value }))}>
                      <option value="">{tt('manage.holdAnyType', 'Against the whole event')}</option>
                      {tiers.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                    </select>
                    <button type="button" className={styles.primaryBtn}
                            disabled={busy || !newHold.name.trim()} onClick={addHold}>
                      {tt('manage.addHold', 'Hold tickets')}
                    </button>
                  </div>
                </section>}

              {/* -------------------------------------------------- programme */}
              {tab === 'programme' && <section className={styles.card}>
                  <p className={styles.cardHint}>
                    {tt('manage.programmeHint', 'What is happening, when, and where in the venue. A session can carry its own capacity, for a room that holds fewer people than the event does. Nothing is shown publicly until you add something here.')}
                  </p>

                  {sessions.length === 0 ? <p className={styles.muted}>
                      {tt('manage.noSessions', 'Nothing on the programme yet, so the schedule is not shown on the event page.')}
                    </p> : <div className={styles.rows}>
                      {sessions.map(row => <div key={row.id} className={styles.row}>
                          <div className={styles.rowMain}>
                            <strong className={styles.rowName}>{row.title}</strong>
                            <span className={styles.code}>{formatDateTime(row.starts_at)}</span>
                            {row.stage && <span className={styles.muted}>{row.stage}</span>}
                            {row.capacity && <span className={styles.muted}>
                              {tt('manage.sessionCap', 'holds {n}').replace('{n}', row.capacity)}
                            </span>}
                          </div>
                          <div className={styles.rowActions}>
                            <button type="button" className={styles.ghostBtn} disabled={busy}
                                    onClick={() => removeSession(row)}>
                              {tt('manage.sessionRemove', 'Remove')}
                            </button>
                          </div>
                        </div>)}
                    </div>}

                  <div className={styles.newRow}>
                    <input className={styles.input} value={newSession.title}
                           placeholder={tt('manage.sessionTitle', 'What is happening')}
                           onChange={e => setNewSession(v => ({ ...v, title: e.target.value }))} />
                    <DateField withTime className={styles.input} name="session_start"
                               value={newSession.starts_at}
                               onChange={e => setNewSession(v => ({ ...v, starts_at: e.target.value }))} />
                    <input className={styles.input} value={newSession.stage}
                           placeholder={tt('manage.sessionStage', 'Where, e.g. Main Hall')}
                           onChange={e => setNewSession(v => ({ ...v, stage: e.target.value }))} />
                    <input className={styles.input} type="number" min="0" value={newSession.capacity}
                           placeholder={tt('manage.sessionCapacity', 'Room capacity')}
                           onChange={e => setNewSession(v => ({ ...v, capacity: e.target.value }))} />
                    <button type="button" className={styles.primaryBtn}
                            disabled={busy || !newSession.title.trim() || !newSession.starts_at}
                            onClick={addSession}>
                      {tt('manage.addSession', 'Add to the programme')}
                    </button>
                  </div>
                </section>}

              {/* ------------------------------------------------------ queue */}
              {tab === 'queue' && <section className={styles.card}>
                  <p className={styles.cardHint}>
                    {tt('manage.queueHint', 'Who is waiting for a ticket to come back. When one does, the first person in the queue is offered it at the price it was always sold at, and has half a day to take it before it passes on.')}
                  </p>

                  {!queue ? <p className={styles.muted}>{tt('ui.loading', 'Loading…')}</p>
                    : queue.waitlist.length === 0 ? <p className={styles.muted}>
                        {tt('manage.noQueue', 'Nobody is waiting.')}
                      </p> : <div className={styles.rows}>
                      {queue.waitlist.map(row => <div key={row.id} className={styles.row}>
                          <div className={styles.rowMain}>
                            <strong className={styles.rowName}>#{row.position} {row.user}</strong>
                            {row.status === 'offered' && <span className={styles.code}>
                              {tt('manage.queueOffered', 'Offered, expires {when}')
                                .replace('{when}', formatDateTime(row.offer_expires_at))}
                            </span>}
                          </div>
                        </div>)}
                    </div>}
                </section>}

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
