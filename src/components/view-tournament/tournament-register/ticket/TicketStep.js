'use client';

// The event ticket as a step of a tournament registration (inbox 436, G4).
//
// CEO, 12 October 2026: "a way for people to be ble to register for an event,
// while they are registering for the tournament under that event". When the
// organiser made the event ticket the entry, the registration used to stop with
// "Entry to this tournament is a ticket for ..." and the person bought one
// somewhere else and started again. Here the ticket is bought inside the
// registration: the type the organiser named (or any, when none was named),
// the event's own questions, coins with the PIN and a card for whatever the
// wallet is short. The registration is saved on the server at this step, so a
// trip to the card page, a closed tab or another device comes back to it.

import { useEffect, useMemo, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { formatNumber, formatDateTime } from '@/lib/datetime';
import { ventFetch } from '@/components/tournament-lib/tournamentApi';
import { useCheckoutFields, CheckoutFieldList, missingRequired } from '@/components/checkout-fields/CheckoutFields';
import PayShortfall from '@/components/pay/PayShortfall';
import { returnReferenceHere } from '@/lib/payReturn';
import styles from './ticket-step.module.css';

/**
 * @param tournament  the tournament being registered for
 * @param entry       the draft answer's `entry` (event {slug, name}, tier {id, name} or null)
 * @param savedAt     when the draft was last saved, for the line that says so
 * @param token       the session token
 * @param trip        the note left before a trip to the card page: the ticket
 *                    type and the answers typed, so nothing is typed twice
 * @param onBought    called with the new ticket once it is bought
 * @param onBack      the previous step
 * @param onLater     leave; the registration waits on the server
 */
export default function TicketStep({ tournament, entry, savedAt, token, trip = null, onBought, onBack, onLater }) {
  const tt = useT();
  const eventSlug = entry?.event?.slug;
  const { fields, perOrder, perTicket } = useCheckoutFields(eventSlug);
  const [tiers, setTiers] = useState(null);
  // A list that did not come back is not an empty list: "no ticket left" on
  // a dropped connection sends somebody away from a tournament with places.
  const [tiersFailed, setTiersFailed] = useState(false);
  const [tiersKey, setTiersKey] = useState(0);
  const [tierId, setTierId] = useState(entry?.tier?.id || trip?.tier || null);
  // Back from the card page: the panel that confirms the payment stays on the
  // screen whatever happened to the ticket list meanwhile, because nothing
  // else credits those coins.
  const [cardReturn] = useState(() => Boolean(returnReferenceHere()));
  const [quote, setQuote] = useState(null);
  const [answers, setAnswers] = useState(trip?.answers || {});
  const [person, setPerson] = useState({ answers: trip?.person || {} });
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  // Said once the card payment is confirmed: the panel that offered the card
  // goes away with the shortfall, and nothing else would say why.
  const [cardIn, setCardIn] = useState(false);
  const [walletKey, setWalletKey] = useState(0);

  useEffect(() => {
    if (!eventSlug) return undefined;
    let gone = false;
    setTiersFailed(false);
    ventFetch(`/event/${encodeURIComponent(eventSlug)}/ticket-types/`)
      .then((data) => {
        if (gone) return;
        const all = (data?.tiers || []).filter((t) => !t.sold_out && Number(t.remaining ?? 1) > 0);
        // The type the organiser named is the only one that admits; with
        // none named, any ticket to the event does.
        const usable = entry?.tier?.id ? all.filter((t) => t.id === entry.tier.id) : all;
        setTiers(usable);
        if (!tierId && usable.length === 1) setTierId(usable[0].id);
      })
      .catch(() => { if (!gone) setTiersFailed(true); });
    return () => { gone = true; };
  }, [eventSlug, tiersKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const tier = useMemo(() => (tiers || []).find((t) => t.id === tierId) || null, [tiers, tierId]);

  // What it costs, from the endpoint the purchase itself is priced by.
  useEffect(() => {
    if (!eventSlug || !tier) { setQuote(null); return undefined; }
    let gone = false;
    const params = new URLSearchParams({ tier: String(tier.id), quantity: '1' });
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/${encodeURIComponent(eventSlug)}/quote/?${params}`)
      .then((r) => r.json())
      .then((body) => { if (!gone) setQuote(body?.status === 'success' ? body.data : null); })
      .catch(() => { if (!gone) setQuote(null); });
    return () => { gone = true; };
  }, [eventSlug, tier]);

  const total = quote && quote.tier_id === tier?.id ? Number(quote.total_vc || 0) : null;

  const buy = async () => {
    if (!tier) return;
    const missing = missingRequired(fields || [], answers, [person]);
    if (missing) {
      setProblem(tt('guest.answerNeeded', '{label} is needed.').replace('{label}', missing.label));
      return;
    }
    if (total > 0 && pin.length < 4) {
      setProblem(tt('buy.pinNeeded', 'Enter your 4-digit wallet PIN to authorise this payment.'));
      return;
    }
    setBusy(true);
    setProblem('');
    try {
      const data = await ventFetch(`/event/${encodeURIComponent(eventSlug)}/buy-ticket/`, {
        method: 'POST',
        token,
        body: { tier_id: tier.id, quantity: 1, pin, answers, attendees: [{ answers: person.answers }] },
      });
      onBought(data?.tickets?.[0] || null);
    } catch (err) {
      setProblem(apiMessage(tt, err, 'regTicket.failed', 'The ticket was not bought. Nothing was taken.'));
      if (err?.code === 'INSUFFICIENT_BALANCE') setWalletKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  };

  const eventName = entry?.event?.name || '';

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true"
         aria-label={tt('regTicket.title', 'Entry is a ticket for {event}').replace('{event}', eventName)}>
      <div className={styles.sheet}>
        <div className={styles.head}>
          <div>
            <span className={styles.kicker}>
              {tt('regTicket.kicker', '{tournament} · at {event}')
                .replace('{tournament}', tournament?.title || tournament?.tournament_title || '')
                .replace('{event}', eventName)}
            </span>
            <h2 className={styles.title}>{tt('regTicket.title', 'Entry is a ticket for {event}').replace('{event}', eventName)}</h2>
          </div>
        </div>

        {savedAt && (
          <p className={styles.saved}>
            {tt('regTicket.saved', 'Saved {when}. Leave and come back from any device you sign in on; your registration waits here for 30 days.')
              .replace('{when}', formatDateTime(savedAt))}
          </p>
        )}
        <p className={styles.muted}>
          {tt('regTicket.lede', 'The organiser made the event ticket your entry to this tournament. Get it here; you do not lose anything you have filled in.')}
        </p>

        {tiersFailed && (
          <p className={styles.problem} role="alert">
            {tt('regTicket.loadFailed', 'The tickets could not be loaded. Check the connection and try again.')}{' '}
            <button type="button" className={styles.quiet} onClick={() => setTiersKey((k) => k + 1)}>
              {tt('ui.tryAgain', 'Try again')}
            </button>
          </p>
        )}
        {tiers === null && !tiersFailed && <p className={styles.muted}>{tt('regTicket.loading', 'Loading the tickets...')}</p>}
        {tiers && tiers.length === 0 && (
          <p className={styles.problem}>
            {tt('regTicket.none', 'There is no ticket left that admits you to this tournament. The organiser can add more.')}
          </p>
        )}
        {tiers && tiers.length > 0 && (
          <ul className={styles.tiers}>
            {tiers.map((t) => (
              <li key={t.id}>
                <button type="button" className={styles.tier} aria-pressed={t.id === tierId} onClick={() => setTierId(t.id)}>
                  <span className={styles.tierText}>
                    <b>{t.name}</b>
                    <span className={styles.muted}>
                      {[t.day_label, tt('regTicket.entersYou', 'Enters you in this tournament')].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <b className={styles.price}>
                    {Number(t.price_vc ?? t.price ?? 0) > 0
                      ? tt('regTicket.coins', '{n} VC').replace('{n}', formatNumber(Number(t.price_vc ?? t.price)))
                      : tt('guest.free', 'Free')}
                  </b>
                </button>
              </li>
            ))}
          </ul>
        )}

        {tier && perOrder.length > 0 && (
          <div className={styles.block}>
            <CheckoutFieldList fields={perOrder} values={answers}
              onChange={(id, value) => setAnswers((a) => ({ ...a, [id]: value }))} />
          </div>
        )}
        {tier && perTicket.length > 0 && (
          <div className={styles.block}>
            <CheckoutFieldList fields={perTicket} values={person.answers}
              onChange={(id, value) => setPerson((p) => ({ answers: { ...p.answers, [id]: value } }))} />
          </div>
        )}

        {tier && total !== null && (
          <div className={styles.totalRow}>
            <span>{tt('ui.pay.2d77', 'You pay')}</span>
            <b>{total > 0 ? tt('regTicket.coins', '{n} VC').replace('{n}', formatNumber(total)) : tt('guest.free', 'Free')}</b>
          </div>
        )}

        {tier && total > 0 && (
          <label className={styles.field}>
              <span>{tt('ui.wallet.pin.2cdf', 'Wallet PIN')}</span>
              <input type="password" inputMode="numeric" maxLength={6} autoComplete="off" className={styles.pin}
                     placeholder="••••" value={pin}
                     onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} />
          </label>
        )}
        {/* A card for whatever the wallet is short. A card page sends the
            person back here, and the saved registration opens at this step
            with the same ticket type. */}
        {((tier && total > 0) || cardReturn) && (
          <PayShortfall key={walletKey} needVc={tier && total > 0 ? total : 0} purpose="ticket" token={token}
                        resume={{ door: 'tournament-ticket', tournament: tournament?.slug, tier: tier?.id || null,
                                  answers, person: person.answers }}
                        onPaid={(paid) => { setProblem(''); if (paid?.viaCard) setCardIn(true); }} />
        )}

        {cardIn && !problem && (
          <p className={styles.saved} role="status">
            {tt('regTicket.cardIn', 'Your card payment is in and the coins are in your wallet. Enter your PIN to get the ticket.')}
          </p>
        )}
        {problem && <p className={styles.problem} role="alert">{problem}</p>}

        <div className={styles.foot}>
          <button type="button" className={styles.quiet} onClick={onBack}>{tt('ui.back.b52b', 'Back')}</button>
          <button type="button" className={styles.quiet} onClick={onLater}>
            {tt('regTicket.later', 'Leave and come back later')}
          </button>
          <button type="button" className={styles.goldBtn} disabled={busy || !tier || total === null} onClick={buy}>
            {busy ? tt('pay.working', 'Paying...') : tt('regTicket.buy', 'Get the ticket and continue')}
          </button>
        </div>
      </div>
    </div>
  );
}
