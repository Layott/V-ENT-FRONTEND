'use client';

// "Trade at this event" - the pitches on sale, on the public event page.
//
// CEO, 7 September 2026: "other users should be able to buy and use the site to
// run the shop".
//
// Three rules this screen follows, all of them from faults this platform has
// already shipped once:
//
//   1. The section is PUBLIC. Somebody deciding whether to trade at an event
//      has to see the pitch and its price before making an account. Only the
//      Buy control is gated, and it is absent rather than rendered live and
//      refused on press - telling somebody what they need AFTER they have
//      entered a PIN is the community-feed fault again.
//   2. A sold-out pitch still says sold out. A row that disappears reads as a
//      broken link to anybody who was told about it.
//   3. The organiser's conditions are shown in full and have to be ACCEPTED
//      before the pay button does anything. What was accepted is stored on the
//      purchase word for word, so an organiser editing them later cannot
//      change what somebody already agreed to.

import { useCallback, useEffect, useState } from 'react';
import { apiMessage } from '@/lib/apiMessage';
import { formatNumber } from '@/lib/datetime';
import { useT } from '@/i18n/LanguageProvider';
import { useViewer } from '@/lib/gating';
import NeedsAccount from '@/components/needs-account/NeedsAccount';
import styles from './trade-here.module.css';

const TradeHere = ({ eventRef, eventName }) => {
  const tt = useT();
  const viewer = useViewer();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);      // the slot being bought
  const [accepted, setAccepted] = useState(false);
  const [stallName, setStallName] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [done, setDone] = useState(null);

  const load = useCallback(async () => {
    if (!eventRef) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/event/${eventRef}/slots/`,
        { headers: viewer.token ? { Authorization: `Bearer ${viewer.token}` } : {} });
      const body = await res.json().catch(() => null);
      if (body?.status === 'success') setSlots(body.data.slots || []);
    } catch {
      // A section that cannot load must not take the event page with it.
    } finally {
      setLoading(false);
    }
  }, [eventRef, viewer.token]);

  useEffect(() => { load(); }, [load]);

  const buy = async () => {
    if (busy || !open) return;
    setBusy(true);
    setProblem('');
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/event/${eventRef}/slots/${open.id}/buy/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${viewer.token}`,
          },
          body: JSON.stringify({
            accept_rules: accepted,
            stall_name: stallName.trim(),
            pin: pin.trim(),
          }),
        });
      const body = await res.json().catch(() => ({ status: 'error' }));
      if (body?.status !== 'success') {
        setProblem(apiMessage(tt, body, 'api.somethingWentWrong',
                              'That did not go through.'));
      } else {
        setDone(body.data.vendor);
        setOpen(null);
        setPin('');
        load();
      }
    } catch (err) {
      setProblem(apiMessage(tt, err, 'api.somethingWentWrong', 'That did not go through.'));
    } finally {
      setBusy(false);
    }
  };

  // Nothing on sale and nothing bought: the section is not drawn at all. An
  // empty "Trade at this event" heading on every event that never sold a pitch
  // is noise on the page people actually came for.
  if (loading || (!slots.length && !done)) return null;

  const needsPin = open && open.price_vc > 0;
  const canPay = open
    && (!open.rules || accepted)
    && (!needsPin || pin.trim().length >= 4);

  return (
    <section className={styles.wrap}>
      <h2 className={styles.title}>{tt('slots.tradeTitle', 'Trade at this event')}</h2>
      <p className={styles.blurb}>
        {tt('slots.tradeBlurb', 'Buy a pitch and you get a shop on V-ENT straight '
          + 'away: list what you sell, set your own prices, and take orders in '
          + 'VENT COINS.')}
      </p>

      {done && <p className={styles.good}>
        {tt('slots.bought', 'Your stall is set up. Open it from your account to add '
          + 'what you sell.')}
      </p>}

      <ul className={styles.list}>
        {slots.map((s) => (
          <li key={s.id} className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.name}>{s.name}</span>
              {s.is_sold_out && <span className={styles.gone}>
                {tt('slots.soldOut', 'Sold out')}
              </span>}
            </div>
            <p className={styles.price}>
              {s.price_vc > 0
                ? `${formatNumber(s.price_vc)} VC`
                : tt('slots.free', 'Free')}
            </p>
            {s.description && <p className={styles.desc}>{s.description}</p>}
            <p className={styles.meta}>
              {s.is_sold_out
                ? tt('slots.allTaken', 'All taken')
                : tt('slots.left', '{n} left').replace('{n}', formatNumber(s.remaining))}
              {s.requires_approval
                ? ` · ${tt('slots.organiserApproves', 'the organiser approves each one')}`
                : ''}
            </p>

            {/* Absent, not disabled-and-refused. Somebody without an account is
                told what they need before they choose a pitch. */}
            {s.already_mine
              ? <p className={styles.meta}>{tt('slots.yours', 'You have one of these.')}</p>
              : s.is_sold_out
                ? null
                : <NeedsAccount action={tt('slots.action', 'buy a pitch at this event')}>
                    <button type="button" className={styles.buy}
                            onClick={() => {
                              setOpen(s);
                              setAccepted(false);
                              setProblem('');
                              setStallName('');
                            }}>
                      {tt('slots.buy', 'Buy this pitch')}
                    </button>
                  </NeedsAccount>}
          </li>
        ))}
      </ul>

      {open && <div className={styles.backdrop} onClick={() => setOpen(null)}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <h3 className={styles.modalTitle}>{open.name}</h3>
          <p className={styles.modalSub}>
            {open.price_vc > 0
              ? tt('slots.payLine', '{n} VC at {event}')
                  .replace('{n}', formatNumber(open.price_vc))
                  .replace('{event}', eventName || '')
              : tt('slots.freeLine', 'Free at {event}').replace('{event}', eventName || '')}
          </p>

          <label className={styles.field}>
            <span className={styles.label}>{tt('slots.stallName', 'What your stall is called')}</span>
            {/* `autoComplete="off"` because Chrome decided a bare text input
                sitting above a password field was a username box and filled it
                with the signed-in person's email address. Caught by walking
                it: nothing about the markup looks wrong. */}
            <input className={styles.input} value={stallName} autoComplete="off"
                   name="stall-name" id="stall-name"
                   onChange={(e) => setStallName(e.target.value)}
                   placeholder={tt('slots.stallNamePlaceholder', 'Mama T Kitchen')} />
          </label>

          {open.rules && <div className={styles.rules}>
            <p className={styles.rulesTitle}>
              {tt('slots.rulesTitle', 'The conditions set by the organiser')}
            </p>
            <p className={styles.rulesBody}>{open.rules}</p>
            <label className={styles.check}>
              <input type="checkbox" checked={accepted}
                     onChange={(e) => setAccepted(e.target.checked)} />
              <span>{tt('slots.accept', 'I have read these and I accept them')}</span>
            </label>
          </div>}

          {needsPin && <label className={styles.field}>
            <span className={styles.label}>{tt('slots.pin', 'Your wallet PIN')}</span>
            <input className={styles.input} type="password" inputMode="numeric"
                   maxLength={6} value={pin} autoComplete="off"
                   onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
          </label>}

          {problem && <p className={styles.problem}>{problem}</p>}

          <div className={styles.actions}>
            <button type="button" className={styles.ghost} onClick={() => setOpen(null)}>
              {tt('ui.cancel.77df', 'Cancel')}
            </button>
            {/* Not pressable until it can succeed. A button whose only outcome
                is a refusal is a button that should not be pressable. */}
            <button type="button" className={styles.buy} onClick={buy}
                    disabled={busy || !canPay}>
              {busy ? tt('ui.checking', 'Checking...') : tt('slots.confirm', 'Take the pitch')}
            </button>
          </div>
        </div>
      </div>}
    </section>
  );
};

export default TradeHere;
