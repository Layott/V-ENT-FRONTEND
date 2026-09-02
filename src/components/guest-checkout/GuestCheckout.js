'use client';

// Buying a ticket without an account.
//
// Somebody buying a ticket to a one-off event should not have to make an
// account to do it. A platform that insists loses the sale rather than gaining
// a member, and the member it would have gained never comes back anyway.
//
// The fields come from the organiser, not from here. A five-a-side needs a
// shirt size, a conference needs a dietary requirement, a convention needs to
// know which day, and none of those is a field anybody could have guessed in
// advance. Email is the one thing always asked and never optional: a ticket
// with no way to reach the holder is not a ticket.
//
// Signing in is offered rather than required, and offered AFTER the form rather
// than in front of it, because a sign-in wall at the top of a checkout is the
// thing this exists to remove.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LuCheck, LuTicket } from 'react-icons/lu';
import { apiMessage } from '@/lib/apiMessage';
import { useT } from '@/i18n/LanguageProvider';
import { useCheckoutFields, CheckoutFieldList }
  from '@/components/checkout-fields/CheckoutFields';
import styles from './guest-checkout.module.css';
import { refFor } from '@/lib/referral';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function GuestCheckout({ eventRef, tier, onDone, onClose }) {
  const tt = useT();

  const { perOrder, perTicket, maxPerEmail } = useCheckoutFields(eventRef);
  const [email, setEmail] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [orderAnswers, setOrderAnswers] = useState({});
  const [people, setPeople] = useState([{ name: '', answers: {} }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [issued, setIssued] = useState(null);


  // One answer set per ticket, so the size on ticket two is not the size on
  // ticket one.
  useEffect(() => {
    if (maxPerEmail && quantity > maxPerEmail) setQuantity(maxPerEmail);
  }, [maxPerEmail, quantity]);

  useEffect(() => {
    setPeople(prev => {
      const next = [...prev];
      while (next.length < quantity) next.push({ name: '', answers: {} });
      return next.slice(0, quantity);
    });
  }, [quantity]);

  const setPerson = (index, patch) => setPeople(prev => prev.map(
    (p, i) => (i === index ? { ...p, ...patch } : p)));

  const setAnswer = (index, id, value) => setPeople(prev => prev.map(
    (p, i) => (i === index ? { ...p, answers: { ...p.answers, [id]: value } } : p)));

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`${API}/event/${eventRef}/guest-buy/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier_id: tier.id,
          quantity,
          email,
          answers: orderAnswers,
          attendees: people.map(p => ({ name: p.name, answers: p.answers })),
          callback_url: typeof window === 'undefined' ? ''
            : `${window.location.origin}/events/ticket-confirmed`,
          // The influencer link this buyer arrived through. A guest is the
          // common case for a link posted publicly, so this is the path that
          // matters most for crediting one.
          ref: refFor(eventRef),
        }),
      });
      const body = await res.json().catch(() => ({}));

      if (res.ok && body.status === 'success') {
        // A paid ticket goes to the card page. A free one is already issued.
        if (body.data.authorization_url) {
          window.location.href = body.data.authorization_url;
          return;
        }
        setIssued(body.data);
        if (onDone) onDone(body.data);
        return;
      }
      setError(apiMessage(tt, body, 'api.failed', 'Failed.'));
    } catch {
      setError(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
    } finally {
      setBusy(false);
    }
  };

  // ------------------------------------------------------------------ done

  if (issued) {
    return (
      <div className={styles.done}>
        <p className={styles.doneTitle}>
          <LuCheck aria-hidden="true" />
          {tt('guest.done', 'That is booked')}
        </p>
        <p className={styles.help}>
          {tt('guest.sentTo', 'Sent to {email}. Bring the code below, or the email, to the door.')
            .replace('{email}', issued.email)}
        </p>
        <ul className={styles.codes}>
          {(issued.tickets || []).map(t => (
            <li key={t.code} className={styles.code}>
              <LuTicket aria-hidden="true" />
              <strong>{t.code}</strong>
              {t.attendee_name && <span>{t.attendee_name}</span>}
            </li>
          ))}
        </ul>
        <p className={styles.help}>
          {tt('guest.findAgain', 'You can find it again with your email address and the code, without an account.')}
          {' '}
          <Link href="/events/find-ticket" className={styles.link}>
            {tt('guest.findLink', 'Find a ticket')}
          </Link>
        </p>
        {onClose && <button type="button" className={styles.done_close} onClick={onClose}>
          {tt('guest.close', 'Done')}
        </button>}
      </div>
    );
  }

  // --------------------------------------------------------- nothing to sell

  // CEO, 2 September: "i also did not like how people had to input their
  // deails to find out tickets were sold out."
  //
  // They filled in an email, a quantity, a WhatsApp number and a name on the
  // ticket, pressed the button, and were told the event was sold out. That is
  // the same fault as a compose box that answers 401 after somebody has typed:
  // tell them what they need BEFORE they spend the effort, never after.
  //
  // So when nothing can be bought the form is not drawn at all. What is drawn
  // says which ceiling was hit, because "sold out" beside a type showing
  // thousands unsold reads as a broken site rather than a full room.
  const soldOut = tier?.sold_out
    || (tier?.remaining != null && Number(tier.remaining) <= 0);
  if (soldOut) {
    const venueFull = tier?.unavailable_reason === 'venue_full';
    return (
      <div className={styles.wrap}>
        <p className={styles.soldOutTitle}>
          {venueFull
            ? tt('guest.venueFull', 'This day is full.')
            : tt('guest.tierSoldOut', '{tier} has sold out.')
                .replace('{tier}', tier?.name || tt('guest.thisTicket', 'This ticket'))}
        </p>
        <p className={styles.help}>
          {venueFull
            ? tt('guest.venueFullBody', 'Every place for this date has gone. Another date may still have room.')
            : tt('guest.tierSoldOutBody', 'Join the waiting list and you will be offered a place if one comes back.')}
        </p>
        {onClose && <button type="button" className={styles.buy} onClick={onClose}>
          {tt('guest.backToTickets', 'See the other tickets')}
        </button>}
      </div>
    );
  }

  // ------------------------------------------------------------------ form

  return (
    <div className={styles.wrap}>
      <p className={styles.intro}>
        {tt('guest.intro', 'No account needed. We only need an email address to send the ticket to.')}
      </p>

      <label className={styles.field}>
        <span className={styles.label}>{tt('guest.email', 'Email address')} *</span>
        <input className={styles.input} type="email" value={email}
               onChange={e => setEmail(e.target.value)}
               placeholder="you@example.com" autoComplete="email" />
      </label>

      {/* One ticket allowed means there is nothing to choose, so the box is
          not drawn at all. Offering a number somebody cannot use, and refusing
          them for picking it, is the thing this replaces. */}
      {maxPerEmail === 1
        ? <p className={styles.help}>
            {tt('guest.oneEachHint', 'One ticket per email address for this event.')}
          </p>
        : <label className={styles.field}>
            <span className={styles.label}>{tt('guest.howMany', 'How many tickets')}</span>
            <input className={styles.input} type="number" min="1"
                   max={maxPerEmail || 10}
                   value={quantity}
                   onChange={e => setQuantity(Math.max(1, Math.min(
                     maxPerEmail || 10, Number(e.target.value) || 1)))} />
            {maxPerEmail > 1 && <span className={styles.help}>
              {tt('guest.maxEachHint', 'Up to {n} per email address for this event.')
                .replace('{n}', maxPerEmail)}
            </span>}
          </label>}

      <CheckoutFieldList fields={perOrder} values={orderAnswers}
        onChange={(id, value) => setOrderAnswers(a => ({ ...a, [id]: value }))} />

      {people.map((person, index) => (
        <div key={index} className={styles.person}>
          {quantity > 1 && <p className={styles.personTitle}>
            {tt('guest.ticketN', 'Ticket {n}').replace('{n}', index + 1)}
          </p>}

          <label className={styles.field}>
            <span className={styles.label}>{tt('guest.name', 'Name on the ticket')}</span>
            <input className={styles.input} value={person.name}
                   onChange={e => setPerson(index, { name: e.target.value })} />
          </label>

          <CheckoutFieldList fields={perTicket} values={person.answers}
            onChange={(id, value) => setAnswer(index, id, value)} />
        </div>
      ))}

      {error && <p className={styles.error}>{error}</p>}

      <button type="button" className={styles.buy} disabled={busy || !email.trim()}
              onClick={submit}>
        {busy ? tt('ui.saving.8f2a', 'Saving…')
          /* The card mapper on the event page renames price_vc to price, so
             reading only one of them told somebody paying 3 VC that they were
             about to "get the ticket". Whichever the caller passes. */
          : (tier?.price_vc ?? tier?.price ?? 0) > 0
            ? tt('guest.payNow', 'Pay and get the ticket')
            : tt('guest.getFree', 'Get the ticket')}
      </button>

      {/* Offered, not required, and after the form rather than in front of it.
          A sign-in wall at the top of a checkout is the thing this removes. */}
      <p className={styles.help}>
        {tt('guest.haveAccount', 'Have a V-ENT account? Sign in to pay with your wallet and keep all your tickets in one place.')}
        {' '}
        <Link href="/login" className={styles.link}>
          {tt('ui.login.7b3c', 'Log in')}
        </Link>
      </p>
    </div>
  );
}
