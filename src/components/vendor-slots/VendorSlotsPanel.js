'use client';

// The pitches an organiser is selling, and what has gone.
//
// CEO, 7 September 2026: "event owners should be able to sell vendor slots to
// other people, they can list prices for vendor slots with their rules and
// conditions and other users should be able to buy and use the site to run the
// shop or they can invite people too."
//
// Invitation is the other door into the same room, and it already exists. What
// was missing is the offer: a pitch with a price on it that somebody can buy
// without being asked first.
//
// Two things this screen is careful about:
//
//   * A sold slot is WITHDRAWN, never deleted. Somebody paid for it and their
//     stall points at it, so deleting the row takes their record of what they
//     agreed to with it. The button says so rather than pretending.
//   * The rules are the organiser's own words, and editing them bumps a
//     version. What a vendor already agreed to is stored on their purchase,
//     word for word, so an edit here never changes what was agreed then.

import { useCallback, useEffect, useState } from 'react';
import { apiMessage } from '@/lib/apiMessage';
import { formatNumber } from '@/lib/datetime';
import { useT } from '@/i18n/LanguageProvider';
import styles from './vendor-slots.module.css';

const EMPTY = {
  name: '', description: '', category: '', price_ngn: '', quantity: '1',
  rules: '', requires_approval: true,
};

// `onNotice` takes a message and nothing else: the event console renders one
// notice style and no severity, and passing a level it ignores would make the
// next person think there is one.
const VendorSlotsPanel = ({ eventRef, token, onNotice }) => {
  const tt = useT();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  // The other door. The blurb below has always said "you can still invite
  // people directly instead", and until 12 September nothing on the panel
  // could: the endpoint that adds a stall by hand had no caller. `owner` is an
  // email address or a username, as every invite on the platform takes.
  const [stall, setStall] = useState({ name: '', owner: '', booth: '' });
  const [stallBusy, setStallBusy] = useState(false);
  const [stallError, setStallError] = useState('');
  const addStall = async () => {
    setStallBusy(true);
    setStallError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/${eventRef}/vendors/create/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(stall),
      });
      const body = await res.json().catch(() => ({ status: 'error' }));
      if (body.status !== 'success') {
        setStallError(apiMessage(tt, body, 'slots.stallFailed', 'That stall was not added.'));
        return;
      }
      onNotice?.(body.data?.invite
        ? tt('slots.stallInvited', 'Invited. The stall opens when {email} joins V-ENT.')
          .replace('{email}', body.data.invite.email)
        : tt('slots.stallAdded', '{name} is in.').replace('{name}', body.data?.vendor?.name || stall.name));
      setStall({ name: '', owner: '', booth: '' });
    } catch (err) {
      setStallError(apiMessage(tt, err, 'slots.stallFailed', 'That stall was not added.'));
    } finally {
      setStallBusy(false);
    }
  };

  const api = useCallback(async (path, options = {}) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/${eventRef}/slots/${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...options,
    });
    return res.json().catch(() => ({ status: 'error' }));
  }, [eventRef, token]);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!eventRef) return;
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const out = await api('');
      if (out?.status === 'success') setSlots(out.data.slots || []);
      else setError(apiMessage(tt, out, 'api.somethingWentWrong', 'Something went wrong.'));
    } catch (err) {
      setError(apiMessage(tt, err, 'api.somethingWentWrong', 'Something went wrong.'));
    } finally {
      setLoading(false);
    }
  }, [api, eventRef, tt]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (busy) return;
    setBusy(true);
    const body = {
      ...draft,
      price_ngn: Number(draft.price_ngn || 0),
      quantity: Number(draft.quantity || 1),
    };
    const out = editing
      ? await api(`${editing}/`, { method: 'PATCH', body: JSON.stringify(body) })
      : await api('', { method: 'POST', body: JSON.stringify(body) });
    setBusy(false);
    if (out?.status !== 'success') {
      return onNotice?.(apiMessage(tt, out, 'api.saveFailed', 'Save failed'));
    }
    onNotice?.(editing
      ? tt('slots.saved', 'Slot saved.')
      : tt('slots.listed', 'The slot is on sale.'));
    setDraft(EMPTY);
    setEditing(null);
    load({ quiet: true });
  };

  const withdraw = async (slot) => {
    if (busy) return;
    setBusy(true);
    const out = await api(`${slot.id}/`, { method: 'DELETE' });
    setBusy(false);
    if (out?.status !== 'success') {
      return onNotice?.(apiMessage(tt, out, 'api.saveFailed', 'Could not remove it'));
    }
    onNotice?.(out.message);
    load({ quiet: true });
  };

  const beginEdit = (slot) => {
    setEditing(slot.id);
    setDraft({
      name: slot.name, description: slot.description || '',
      category: slot.category || '', price_ngn: String(slot.price_ngn ?? ''),
      quantity: String(slot.quantity ?? '1'), rules: slot.rules || '',
      requires_approval: !!slot.requires_approval,
    });
  };

  const set = (key) => (e) => setDraft((d) => ({
    ...d,
    [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
  }));

  if (loading) {
    return <p className={styles.muted}>{tt('slots.loading', 'Loading pitches...')}</p>;
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.blurb}>
        {tt('slots.blurb', 'Sell a pitch at your event. Anybody who buys one gets a '
          + 'shop on V-ENT straight away: their own stock, prices and orders. You can '
          + 'still invite people directly instead.')}
      </p>

      {error && <p className={styles.error}>{error}</p>}

      {slots.length === 0
        ? <p className={styles.muted}>
            {tt('slots.none', 'No pitches for sale yet. Add one below and it appears on '
              + 'your event page.')}
          </p>
        : <ul className={styles.list}>
            {slots.map((s) => (
              <li key={s.id} className={styles.row}>
                <div className={styles.rowHead}>
                  <span className={styles.rowName}>{s.name}</span>
                  {s.is_sold_out
                    ? <span className={styles.pillGone}>{tt('slots.soldOut', 'Sold out')}</span>
                    : <span className={styles.pillLeft}>
                        {tt('slots.left', '{n} left').replace('{n}', formatNumber(s.remaining))}
                      </span>}
                  {!s.is_active && <span className={styles.pillGone}>
                    {tt('slots.withdrawn', 'Off sale')}
                  </span>}
                </div>
                <p className={styles.rowMeta}>
                  {formatNumber(s.price_vc)} VC
                  {' · '}
                  {tt('slots.soldCount', '{n} sold').replace('{n}', formatNumber(s.sold))}
                  {s.requires_approval
                    ? ` · ${tt('slots.needsApproval', 'you approve each one')}`
                    : ` · ${tt('slots.instant', 'live straight away')}`}
                </p>
                {s.description && <p className={styles.rowDesc}>{s.description}</p>}
                <div className={styles.rowActions}>
                  <button type="button" className={styles.ghost} onClick={() => beginEdit(s)}>
                    {tt('ui.edit', 'Edit')}
                  </button>
                  <button type="button" className={styles.danger} disabled={busy}
                          onClick={() => withdraw(s)}>
                    {/* Says what it will actually do. A sold pitch cannot be
                        deleted without taking somebody's record with it. */}
                    {s.sold > 0
                      ? tt('slots.takeOffSale', 'Take off sale')
                      : tt('ui.remove', 'Remove')}
                  </button>
                </div>
              </li>
            ))}
          </ul>}

      <h4 className={styles.formTitle}>
        {editing ? tt('slots.editTitle', 'Edit this pitch') : tt('slots.addTitle', 'Sell a pitch')}
      </h4>
      <div className={styles.form}>
        <label className={styles.field}>
          <span className={styles.label}>{tt('slots.name', 'What it is')}</span>
          <input className={styles.input} value={draft.name} onChange={set('name')}
                 placeholder={tt('slots.namePlaceholder', 'Food stall, 3x3m')} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{tt('slots.price', 'Price in naira')}</span>
          <input className={styles.input} inputMode="numeric" value={draft.price_ngn}
                 onChange={set('price_ngn')} placeholder="50000" />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{tt('slots.quantity', 'How many')}</span>
          <input className={styles.input} inputMode="numeric" value={draft.quantity}
                 onChange={set('quantity')} placeholder="5" />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{tt('slots.category', 'Kind of trader')}</span>
          <input className={styles.input} value={draft.category} onChange={set('category')}
                 placeholder={tt('slots.categoryPlaceholder', 'Food, merch, drinks')} />
        </label>
        <label className={styles.fieldWide}>
          <span className={styles.label}>{tt('slots.description', 'What they get')}</span>
          <textarea className={styles.textarea} rows={2} value={draft.description}
                    onChange={set('description')}
                    placeholder={tt('slots.descriptionPlaceholder',
                      'A table, one power point, and space behind it.')} />
        </label>
        <label className={styles.fieldWide}>
          <span className={styles.label}>{tt('slots.rules', 'Your rules and conditions')}</span>
          <textarea className={styles.textarea} rows={3} value={draft.rules}
                    onChange={set('rules')}
                    placeholder={tt('slots.rulesPlaceholder',
                      'No open flames. Clear your own waste. Set up by 4pm.')} />
          <span className={styles.help}>
            {tt('slots.rulesHelp', 'A buyer has to accept these before they can pay, and '
              + 'what they accepted is kept as it was written that day.')}
          </span>
        </label>
        <label className={styles.check}>
          <input type="checkbox" checked={draft.requires_approval}
                 onChange={set('requires_approval')} />
          <span>{tt('slots.approvalLabel', 'I want to approve each stall before it opens')}</span>
        </label>
      </div>

      <div className={styles.formActions}>
        {editing && <button type="button" className={styles.ghost}
                            onClick={() => { setEditing(null); setDraft(EMPTY); }}>
          {tt('ui.cancel.77df', 'Cancel')}
        </button>}
        <button type="button" className={styles.primary} disabled={busy || !draft.name.trim()}
                onClick={save}>
          {busy ? tt('ui.saving', 'Saving...')
            : editing ? tt('ui.save', 'Save') : tt('slots.put', 'Put it on sale')}
        </button>
      </div>

      <h4 className={styles.formTitle}>
        {tt('slots.addStallTitle', 'Or add a stall yourself')}
      </h4>
      <p className={styles.muted}>
        {tt('slots.addStallBlurb', 'For a trader you have already agreed with. Give them the '
          + 'stall by email or username and it is theirs the moment they are on V-ENT.')}
      </p>
      {stallError && <p className={styles.error}>{stallError}</p>}
      <div className={styles.form}>
        <label className={styles.field}>
          <span className={styles.label}>{tt('slots.stallName', 'Stall name')}</span>
          <input className={styles.input} value={stall.name}
                 onChange={e => setStall({ ...stall, name: e.target.value })}
                 placeholder={tt('slots.stallNamePlaceholder', 'Mama Put Grill')} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{tt('slots.stallOwner', 'Who runs it')}</span>
          <input className={styles.input} value={stall.owner}
                 onChange={e => setStall({ ...stall, owner: e.target.value })}
                 placeholder={tt('slots.stallOwnerPlaceholder', 'Email or @username, or leave it empty')} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{tt('slots.stallBooth', 'Pitch or booth')}</span>
          <input className={styles.input} value={stall.booth}
                 onChange={e => setStall({ ...stall, booth: e.target.value })}
                 placeholder={tt('slots.stallBoothPlaceholder', 'B4')} />
        </label>
      </div>
      <div className={styles.formActions}>
        <button type="button" className={styles.primary}
                disabled={stallBusy || !stall.name.trim()} onClick={addStall}>
          {stallBusy ? tt('ui.saving', 'Saving...') : tt('slots.addStall', 'Add the stall')}
        </button>
      </div>
    </div>
  );
};

export default VendorSlotsPanel;
