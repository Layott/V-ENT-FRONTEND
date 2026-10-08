'use client';

import { apiMessage } from '@/lib/apiMessage';
import { mediaUrl } from '@/lib/mediaUrl';
import InfoTip from '@/components/info-tip/InfoTip';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import Sidebar from '@/components/sidebar/Sidebar';
import { formatNumber, ngnFromVc } from '@/components/wallet/walletHelpers';
import PinPrompt from '@/components/wallet/PinPrompt';
import styles from '../wallets.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
import UserChip from '@/components/user-chip/UserChip';
import { plural } from '@/lib/plural';

const STEPS = [{
  n: 1,
  lbl: 'Recipient'
}, {
  n: 2,
  lbl: 'Amount'
}, {
  n: 3,
  lbl: 'Review'
}, {
  n: 4,
  lbl: 'Done'
}];

// The most people one send can go to (the server holds the same number).
const MAX_RECIPIENTS = 20;

const Stepper = ({
  step
}) => {
  // Bound here rather than in the page: this is its own component, defined at
  // module scope, so the page's translator is not in scope for it. That is
  // what threw "tx is not defined" at prerender.
  const tx = useTx();
  return <div className={styles.steps}>
    {STEPS.map((s, i) => {
    const status = step > s.n ? 'stepDone' : step === s.n ? 'stepActive' : 'stepWait';
    return <div key={`wrap-${s.n}`} style={{
      display: 'contents'
    }}>
          <div className={`${styles.step} ${styles[status]}`}>
            <div className={styles.stepCircle}>{step > s.n ? '✓' : s.n}</div>
            <div className={styles.stepLbl}>{tx(s.lbl)}</div>
          </div>
          {i < STEPS.length - 1 && <div className={`${styles.stepLine} ${step > s.n ? styles.stepLineDone : ''}`} />}
        </div>;
  })}
  </div>;
};

// One shape for a person, a team and an organisation, whichever list they
// came from. `key` is what makes "already on the list" answerable.
const fromUser = u => ({ kind: 'user', key: `user:${u.username}`, ref: u.username, name: u.full_name || u.username, label: `@${u.username}`, handle: `@${u.username}`, avatar: u.avatar, user: u });
const fromTeam = t => ({ kind: 'team', key: `team:${t.slug || t.name}`, ref: t.slug || t.name, name: t.name, label: t.name, handle: t.game || '', avatar: t.logo || t.logo_url });
const fromOrg = o => ({ kind: 'org', key: `org:${o.slug || o.name}`, ref: o.slug || o.name, name: o.name, label: o.name, handle: o.tag || '', avatar: o.logo });

/**
 * Hundredths of a coin, so 0.2 VC (200 naira) can be sent: CEO, 30 September
 * 2026, "Yes people should be able to send amounts under N1000". A comma is
 * read as the decimal point, because that is how French and Portuguese write
 * it. A third decimal place is named rather than rounded, because rounding is
 * choosing somebody's amount for them.
 *
 * Counted in whole hundredths (`cents`) so that 0.1 + 0.2 is 0.3 and not
 * 0.30000000000000004, which would call a balance of exactly 0.3 too small.
 */
const readCoins = raw => {
  const text = String(raw ?? '').trim().replace(',', '.');
  if (!text) return { cents: 0, coins: 0, state: 'empty' };
  const m = /^(\d*)(?:\.(\d*))?$/.exec(text);
  if (!m || (!m[1] && !m[2])) return { cents: 0, coins: 0, state: 'invalid' };
  if ((m[2] || '').length > 2) return { cents: 0, coins: 0, state: 'precise' };
  const cents = Number(m[1] || 0) * 100 + Number(((m[2] || '') + '00').slice(0, 2));
  return { cents, coins: cents / 100, state: cents > 0 ? 'ok' : 'empty' };
};

/** A coin amount as the server reads it: "0.20", "12.00". */
const sendable = cents => (cents / 100).toFixed(2);
const toCents = vc => Math.round((Number(vc) || 0) * 100);

/**
 * Who the money is going to. A person is drawn by their chip, which carries
 * its own picture; a team or an organisation has no chip, so it gets one
 * picture here. Drawing both is what put two pictures on one row.
 */
const Who = ({ r, initials }) => r.kind === 'user'
  ? <div className={styles.recipientInfo}>
      <UserChip user={r.user} size={40} secondary link={false}
                nameClassName={styles.recipientName} handleClassName={styles.recipientHandle} />
    </div>
  : <>
      <div className={styles.recipientAvatar}>
        {r.avatar ? <Image src={mediaUrl(r.avatar)} width={40} height={40} alt={r.name} unoptimized /> : initials(r.name)}
      </div>
      <div className={styles.recipientInfo}>
        <p className={styles.recipientName}>{r.name}</p>
        {r.handle ? <p className={styles.recipientHandle}>{r.handle}</p> : null}
      </div>
    </>;

const SendPage = () => {
  const tx = useTx();
  const tt = useT();
  const router = useRouter();
  const {
    data: session
  } = useSession();
  const [step, setStep] = useState(1);
  const [balance, setBalance] = useState(null);
  const [requires2fa, setRequires2fa] = useState(false);
  // Who the money is going to is NAMED, never guessed from the text typed.
  // The same word could be a username, a team or an organisation, and guessing
  // wrong sends somebody's money to a stranger with the same name. The API
  // refuses to guess for exactly that reason, so the screen has to say.
  const [toKind, setToKind] = useState('user');
  const [query, setQuery] = useState('');
  // Everybody this send goes to, in the order they were added (inbox 386:
  // "What of if I want to send to multiple people at the same time?").
  const [recipients, setRecipients] = useState([]);
  // The closest matches to what is typed, forgiving of a wrong or half-typed
  // name (inbox 383). Tapping one adds it.
  const [suggestions, setSuggestions] = useState([]);
  const [lookupState, setLookupState] = useState('idle');
  const [amounts, setAmounts] = useState({});
  const [sameForAll, setSameForAll] = useState('');
  const [memo, setMemo] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState('');
  const [newBalance, setNewBalance] = useState(null);
  const authHeaders = () => ({
    'Content-Type': 'application/json',
    ...(session?.user?.sessionToken ? {
      Authorization: `Bearer ${session.user.sessionToken}`
    } : {})
  });
  const initials = name => (name || '').split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join('') || '?';

  // Load balance + own username (used for self-send guard)
  useEffect(() => {
    let cancelled = false;
    // Wait for the NextAuth token - firing tokenless returns 400 and paints a
    // zero balance on first load.
    if (!session?.user?.sessionToken) return;
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/balance/`, {
          headers: authHeaders()
        });
        const data = await res.json();
        if (!cancelled && data?.status === 'success') {
          setBalance(Number(data.data?.balance ?? 0));
          setRequires2fa(Boolean(data.data?.requires_2fa));
        }
      } catch (err) {
        console.error('Balance fetch error:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.sessionToken]);

  // The closest names as you type. Every list is a REAL record from the API,
  // never something built in the browser: this page once synthesised a
  // plausible-looking recipient, so a card could show somebody who does not
  // exist. An email is matched exactly (it is private, so it is never guessed
  // at); everything else is matched forgivingly by the server.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setLookupState('idle');
      return undefined;
    }
    const token = session?.user?.sessionToken;
    if (!token) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLookupState('loading');
      try {
        const base = process.env.NEXT_PUBLIC_API_URL;
        const headers = { Authorization: `Bearer ${token}` };
        const get = async path => (await fetch(`${base}${path}`, { headers, signal: controller.signal })).json();
        let found = [];
        if (toKind === 'user') {
          if (q.includes('@') && q.indexOf('@') > 0) {
            const data = await get(`/auth/user/lookup/?q=${encodeURIComponent(q)}`);
            if (data.status === 'success' && data.data?.user) found = [fromUser(data.data.user)];
          } else {
            // purpose=pick: a rough spelling finds anyone you send to (inbox 416).
            const data = await get(`/user/search/?q=${encodeURIComponent(q.replace(/^@/, ''))}&purpose=pick`);
            found = (data?.data?.users || []).map(fromUser);
          }
        } else if (toKind === 'team') {
          const data = await get(`/team/list-teams/?search=${encodeURIComponent(q)}`);
          found = (data?.data?.teams || []).map(fromTeam);
        } else {
          const data = await get(`/organization/list/?search=${encodeURIComponent(q)}`);
          found = (data?.data?.organizations || []).map(fromOrg);
        }
        setSuggestions(found.slice(0, 6));
        setLookupState(found.length ? 'ready' : 'none');
      } catch (err) {
        if (err?.name !== 'AbortError') {
          setSuggestions([]);
          setLookupState('failed');
        }
      }
    }, 280);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, toKind, session?.user?.sessionToken]);

  const chosenKeys = useMemo(() => new Set(recipients.map(r => r.key)), [recipients]);
  const addRecipient = r => {
    if (chosenKeys.has(r.key)) return;
    if (recipients.length >= MAX_RECIPIENTS) {
      setError(tt('api.TOO_MANY_RECIPIENTS', 'One send can go to at most {limit}.').replace('{limit}', MAX_RECIPIENTS));
      return;
    }
    setError('');
    setRecipients(list => [...list, r]);
    setAmounts(a => ({ ...a, [r.key]: sameForAll || a[r.key] || '' }));
    setQuery('');
    setSuggestions([]);
  };
  const removeRecipient = key => {
    setRecipients(list => list.filter(r => r.key !== key));
    setAmounts(a => {
      const next = { ...a };
      delete next[key];
      return next;
    });
  };

  const many = recipients.length > 1;
  const readings = recipients.map(r => ({ r, ...readCoins(amounts[r.key]) }));
  const totalCents = readings.reduce((sum, row) => sum + row.cents, 0);
  const total = totalCents / 100;
  const balanceAfter = (toCents(balance ?? 0) - totalCents) / 100;
  const people = n => plural(tt, n, 'count.personOne', '{n} person', 'count.person', '{n} people', formatNumber(n));

  const amountProblem = () => {
    const unreadable = readings.find(row => row.state === 'invalid' || row.state === 'precise');
    if (unreadable) {
      return (unreadable.state === 'precise'
        ? tt('wallet.twoPlaces', 'Coins go to two decimal places at most, like 0.25. {value} has more.')
        : tt('wallet.notAnAmount', '{value} is not an amount. Type a number, like 5 or 0.25.'))
        .replace('{value}', String(amounts[unreadable.r.key]).trim());
    }
    const empty = readings.find(row => row.state === 'empty');
    if (empty) {
      return many
        ? tt('wallet.enterAmountFor', 'Enter how much to send to {name}.').replace('{name}', empty.r.name)
        : tt('msg.enterHowMuchYouWant', 'Enter how much you want to send.');
    }
    if (balance != null && totalCents > toCents(balance)) return tt('msg.insufficientBalance', 'Insufficient balance.');
    return '';
  };

  const setAmountFor = (key, value) => {
    setAmounts(a => ({ ...a, [key]: value }));
    setError('');
  };
  const applySameToAll = value => {
    setSameForAll(value);
    setAmounts(Object.fromEntries(recipients.map(r => [r.key, value])));
    setError('');
  };

  const goReview = () => {
    if (!recipients.length) {
      setError(tt('msg.pickAValidRecipientFirst', 'Pick a valid recipient first.'));
      return;
    }
    const problem = amountProblem();
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    setStep(3);
  };

  // The endpoint has always required a PIN and this page never asked for one,
  // so every send returned "recipient_username, amount, and pin are required"
  // and the screen showed that sentence as though the recipient were at fault.
  const [pinOpen, setPinOpen] = useState(false);
  const [pinError, setPinError] = useState('');

  const handleSend = async (pin, code) => {
    setSubmitting(true);
    setError('');
    setPinError('');
    try {
      // One person goes the way it always has; several go in one request,
      // all of them or none (the server's send-many).
      const single = recipients.length === 1;
      const body = single
        ? { to_kind: recipients[0].kind, to: recipients[0].ref, amount: sendable(readings[0].cents), pin, note: memo }
        : { recipients: readings.map(row => ({ to_kind: row.r.kind, to: row.r.ref, amount: sendable(row.cents) })), pin, note: memo };
      if (code) body.code = code;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/${single ? 'send' : 'send-many'}/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data?.status !== 'success') {
        let message = apiMessage(tt, data, 'api.transferFailed', 'Transfer failed.');
        // Which one on the list, when the server says.
        if (Number.isInteger(data?.index) && recipients[data.index]) message = `${recipients[data.index].name}: ${message}`;
        // A refused PIN is answered where it was typed. Closing the prompt and
        // showing it on the page behind would read as the send having failed
        // for some other reason.
        const failedCode = String(data?.code || '');
        if (/PIN/i.test(failedCode) || /pin/i.test(message)
            || failedCode === 'TWO_FACTOR_REQUIRED' || failedCode === 'INVALID_CODE') {
          setPinError(message);
        } else {
          setPinOpen(false);
          setError(message);
        }
        setSubmitting(false);
        return;
      }
      setPinOpen(false);
      setNewBalance(Number(data.data?.new_balance ?? balance - total));
      setReference(data.data?.transaction_id || data.data?.reference || `TXN-${Date.now().toString().slice(-8)}`);
      setStep(4);
    } catch (err) {
      console.error(err);
      setPinError(tt('msg.networkErrorPleaseTryAgain', 'Network error. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };
  const KINDS = [
    { id: 'user', label: tt('wallet.kindUser', 'A person') },
    { id: 'team', label: tt('wallet.kindTeam', 'A team') },
    { id: 'org', label: tt('wallet.kindOrg', 'An organisation') },
  ];
  const pickKind = (id) => {
    setToKind(id);
    setQuery('');
    setSuggestions([]);
  };
  const lookupLabel = toKind === 'user'
    ? tt('wallet.toUserHint', 'Their username or email')
    : toKind === 'team'
      ? tt('wallet.toTeamHint', 'The team name')
      : tt('wallet.toOrgHint', 'The organisation name');
  const summary = many
    ? tt('wallet.sendSummaryMany', '{amount} VC in all, to {people}')
        .replace('{amount}', formatNumber(total)).replace('{people}', people(recipients.length))
    : recipients[0]
      ? tt('wallet.sendSummaryTo', '{amount} VC to {who}')
          .replace('{amount}', formatNumber(total)).replace('{who}', recipients[0].label || recipients[0].name)
      : '';
  const reset = () => {
    setStep(1);
    setQuery('');
    setRecipients([]);
    setAmounts({});
    setSameForAll('');
    setMemo('');
    setReference('');
  };

  return <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <div className={styles.pageHeader}>
            <div className={styles.pageHeaderLeft}>
              <h1 className={styles.pageTitle}>{tt("ui.send.vent.coins.6a21", "Send VENT COINS")}</h1>
              <p className={styles.pageSubtitle}>{tt('wallet.sendSubtitle', 'Send coins to a person, a team, or an organisation.')}</p>
            </div>
          </div>

          <div className={styles.formCard}>
            <Stepper step={step} />

            {step === 1 && <>
                <div className={styles.infoRow}>
                  <span className={styles.infoRowLabel}>{tt("ui.balance.ec62", "Your balance")}</span>
                  <span className={styles.infoRowVal}>{formatNumber(balance ?? 0)} VC</span>
                </div>

                {recipients.length > 0 && <div className={styles.formGroup}>
                    <p className={styles.formLabel}>{tt('wallet.sendingToCount', 'Sending to {people}').replace('{people}', people(recipients.length))}</p>
                    <ul className={styles.chosenList}>
                      {recipients.map(r => <li key={r.key} className={styles.recipientCard}>
                          <Who r={r} initials={initials} />
                          <button type="button" className={styles.linkBtn} onClick={() => removeRecipient(r.key)}
                                  aria-label={tt('wallet.removeNamed', 'Remove {name}').replace('{name}', r.name)}>
                            {tt('wallet.remove', 'Remove')}
                          </button>
                        </li>)}
                    </ul>
                  </div>}

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <span className="fieldLabelRow">{recipients.length ? tt('wallet.addAnother', 'Add somebody else') : tt('wallet.sendingTo', 'Sending to')} <InfoTip id="sendRecipient" /></span>
                  </label>
                  {/* Said, never guessed. "vermillion" could be a username, a
                      team or an organisation, and the API refuses to guess
                      because guessing wrong sends the money to a stranger. */}
                  <div className={styles.chipGroup} role="group" aria-label={tt('wallet.sendingTo', 'Sending to')}>
                    {KINDS.map(k => (
                      <button key={k.id} type="button"
                              className={`${styles.chip} ${toKind === k.id ? styles.chipActive : ''}`}
                              aria-pressed={toKind === k.id}
                              onClick={() => pickKind(k.id)}>
                        {k.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="send-lookup">
                    <span className="fieldLabelRow">{lookupLabel}</span>
                  </label>
                  <input id="send-lookup" name="send-lookup" type="text" className={styles.formInput}
                         placeholder={toKind === 'user'
                           ? tt("ui.username.user.email.com.26ca", "@username or user@email.com")
                           : tt('wallet.startTyping', 'Start typing the name')}
                         autoComplete="off"
                         value={query} onChange={e => setQuery(e.target.value)} autoFocus />
                  <p className={styles.fieldHint}>{tt('wallet.closeEnough', 'It does not have to be spelt exactly. Tap a name to add it.')}</p>
                </div>

                {suggestions.length > 0 && <ul className={styles.suggestList} aria-label={tt('wallet.closestMatches', 'Closest matches')}>
                    {suggestions.map(s => {
                  const added = chosenKeys.has(s.key);
                  return <li key={s.key}>
                        <button type="button" className={styles.suggestRow} onClick={() => addRecipient(s)} disabled={added}
                                aria-pressed={added}>
                          <Who r={s} initials={initials} />
                          <span className={`${styles.recipientStatus} ${added ? styles.recipientFound : styles.suggestAdd}`}>
                            {added ? tt('wallet.added', 'Added') : tt('wallet.add', 'Add')}
                          </span>
                        </button>
                      </li>;
                })}
                  </ul>}

                {lookupState === 'loading' && !suggestions.length && <p className={styles.pageSubtitle}>{tt('wallet.checkingName', 'Checking that name...')}</p>}
                {lookupState === 'none' && <div className={`${styles.notice} ${styles.noticeError}`}>
                    {tt('wallet.noneClose', 'Nothing close to "{q}". Check the spelling, or try part of the name.').replace('{q}', query.trim())}
                  </div>}
                {lookupState === 'failed' && <div className={`${styles.notice} ${styles.noticeError}`}>{tt('wallet.lookupFailed', 'Could not check that name. Try again.')}</div>}
                {error && <div className={`${styles.notice} ${styles.noticeError}`}>{error}</div>}

                <div className={styles.btnRow}>
                  <Link href="/wallets" className={`${styles.btn} ${styles.btnGhost}`}>{tt("ui.cancel.77df", "Cancel")}</Link>
                  <button type="button" className={`${styles.btn} ${styles.btnRed}`} onClick={() => { setError(''); setStep(2); }} disabled={!recipients.length}>
                    {tt("ui.continue.2e02", "Continue")}
                  </button>
                </div>
              </>}

            {step === 2 && recipients.length > 0 && <>
                {many && <div className={styles.formGroup}>
                    <label className={styles.formLabel} htmlFor="send-same">
                      <span className="fieldLabelRow">{tt('wallet.sameForEveryone', 'Same amount for everyone')}</span>
                    </label>
                    <div className={styles.inputPrefixWrap}>
                      <span className={styles.prefixTag}>VC</span>
                      <input id="send-same" type="text" inputMode="decimal" placeholder="10"
                             value={sameForAll} onChange={e => applySameToAll(e.target.value)} />
                    </div>
                  </div>}

                {recipients.map(r => <div key={r.key} className={styles.formGroup}>
                    <div className={styles.recipientCard}>
                      <Who r={r} initials={initials} />
                      {!many && <button type="button" className={styles.linkBtn} onClick={() => setStep(1)}>
                          {tt("ui.change.64fb", "Change")}
                        </button>}
                    </div>
                    <label className={styles.formLabel} htmlFor={`send-amount-${r.key}`}>
                      <span className="fieldLabelRow">
                        {many ? tt('wallet.amountFor', 'Amount for {name}').replace('{name}', r.name) : tt("ui.amount.vent.coins.a1db", "Amount (VENT COINS)")}
                        {!many && <InfoTip id="ventCoins" />}
                      </span>
                    </label>
                    <div className={styles.inputPrefixWrap}>
                      <span className={styles.prefixTag}>VC</span>
                      {/* Text with a numeric keypad, not type="number": a number
                          input quietly accepts "0.2" and hands back 0.2, which
                          is how a fraction reached the send. */}
                      <input id={`send-amount-${r.key}`} type="text" inputMode="decimal" placeholder="50"
                             value={amounts[r.key] || ''} onChange={e => setAmountFor(r.key, e.target.value)} autoFocus={!many} />
                    </div>
                  </div>)}

                <p className={styles.fieldHint}>{tt('wallet.centsHint', 'Down to 0.01 VC, which is ₦10. 1 VC is ₦1,000.')}</p>

                <div className={styles.infoRow}>
                  <span className={styles.infoRowLabel}>{many ? tt('wallet.total', 'Total') : tt("ui.balance.after.50e7", "Balance after")}</span>
                  <span className={`${styles.infoRowVal} ${balanceAfter < 0 ? styles.infoRed : styles.infoNeutral}`}>
                    {many ? `${formatNumber(total)} VC` : `${formatNumber(total > 0 ? balanceAfter : balance ?? 0)} VC`}
                  </span>
                </div>
                {many && <div className={styles.infoRow}>
                    <span className={styles.infoRowLabel}>{tt("ui.balance.after.50e7", "Balance after")}</span>
                    <span className={`${styles.infoRowVal} ${balanceAfter < 0 ? styles.infoRed : styles.infoNeutral}`}>{formatNumber(balanceAfter)} VC</span>
                  </div>}

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}><span className="fieldLabelRow">{tt("ui.memo.optional.40c6", "Memo (optional)")} <InfoTip id="sendMemo" /></span></label>
                  <input type="text" className={styles.formInput} placeholder={tt("ui.e.g.team.contribution.6070", "e.g. team contribution")} value={memo} onChange={e => setMemo(e.target.value)} maxLength={120} />
                </div>

                {error && <div className={`${styles.notice} ${styles.noticeError}`}>{error}</div>}

                <div className={styles.btnRow}>
                  <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => { setError(''); setStep(1); }}>
                    {tt("ui.back.b52b", "Back")}
                  </button>
                  <button type="button" className={`${styles.btn} ${styles.btnRed}`} onClick={goReview}>
                    {tt("ui.review.e29a", "Review")}
                  </button>
                </div>
              </>}

            {step === 3 && recipients.length > 0 && <>
                <h2 className={styles.reviewTitle}>{tt("ui.review.transfer.77cc", "Review your transfer")}</h2>
                <p className={styles.reviewSub}>
                  {tt("ui.double.check.recipient.amount.e347", "Double-check the recipient and amount. This action cannot be undone.")}
                </p>

                <div className={styles.summaryList}>
                  {readings.map(({ r, coins }) => <div key={r.key} className={styles.summaryRow}>
                      <span className={styles.summaryKey}>{r.name}{r.handle ? ` (${r.handle})` : ''}</span>
                      <span className={`${styles.summaryVal} ${styles.summaryRed}`}>-{formatNumber(coins)} VC</span>
                    </div>)}
                  {many && <div className={styles.summaryRow}>
                      <span className={styles.summaryKey}>{tt('wallet.total', 'Total')}</span>
                      <span className={`${styles.summaryVal} ${styles.summaryRed}`}>-{formatNumber(total)} VC</span>
                    </div>}
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>{tt("ui.ngn.value.bb32", "≈ NGN value")}</span>
                    <span className={styles.summaryVal}>₦{formatNumber(ngnFromVc(total))}</span>
                  </div>
                  {memo && <div className={styles.summaryRow}>
                      <span className={styles.summaryKey}>{tt("ui.memo.1fd7", "Memo")}</span>
                      <span className={styles.summaryVal}>{memo}</span>
                    </div>}
                  <div className={styles.summaryHr} />
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>{tt("ui.balance.after.50e7", "Balance after")}</span>
                    <span className={styles.summaryVal}>{formatNumber(balanceAfter)} VC</span>
                  </div>
                </div>

                {error && <div className={`${styles.notice} ${styles.noticeError}`}>{error}</div>}

                <div className={styles.btnRow}>
                  <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setStep(2)} disabled={submitting}>
                    {tt("ui.back.b52b", "Back")}
                  </button>
                  <button type="button" className={`${styles.btn} ${styles.btnGrn}`} onClick={() => { setPinError(''); setPinOpen(true); }} disabled={submitting}>
                    {/* Built with t(), not interpolated into an English
                        sentence. This read "Send 5 VC" on a French page,
                        which is the failure a template literal always
                        produces: the number is translated and the words
                        around it are not. */}
                    {submitting ? tx("Sending…")
                      : tt('wallet.sendAmount', 'Send {amount} VC')
                          .replace('{amount}', formatNumber(total))}
                  </button>
                </div>
              </>}

            {step === 4 && recipients.length > 0 && <div className={styles.successCenter}>
                <div className={styles.successIcon}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--v-ent-gold)" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h2 className={styles.successTitle}>{tt("ui.transfer.successful.9bd2", "Transfer Successful")}</h2>
                <p className={styles.successSub}>
                  {many
                    ? tt('wallet.sentToMany', '{amount} VC sent to {people}.')
                        .replace('{amount}', `${formatNumber(total)}`).replace('{people}', people(recipients.length))
                    : <><strong className={styles.successAmount}>{formatNumber(total)} VC</strong> {tt("ui.sent.0a7e", "sent to")} <strong>{recipients[0].label || recipients[0].name}</strong>.</>}
                </p>

                <div className={`${styles.summaryList} ${styles.summaryLeft}`}>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>{tt("ui.reference.db1c", "Reference")}</span>
                    <span className={`${styles.summaryVal} ${styles.summaryRef}`}>{reference}</span>
                  </div>
                  {newBalance != null && <div className={styles.summaryRow}>
                      <span className={styles.summaryKey}>{tt("ui.new.balance.193e", "New balance")}</span>
                      <span className={`${styles.summaryVal} ${styles.summaryGrn}`}>{formatNumber(newBalance)} VC</span>
                    </div>}
                </div>

                <div className={styles.btnRow}>
                  <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={reset}>
                    {tt("ui.send.another.00e1", "Send another")}
                  </button>
                  <button type="button" className={`${styles.btn} ${styles.btnRed}`} onClick={() => router.push('/wallets')}>
                    {tt("ui.done.e9b4", "Done")}
                  </button>
                </div>
              </div>}
          </div>
        </div>
      </main>

      <BottomMenu />

      <PinPrompt
        open={pinOpen}
        busy={submitting}
        error={pinError}
        onCancel={() => { setPinOpen(false); setPinError(''); }}
        onConfirm={handleSend}
        requires2fa={requires2fa}
        title={tt('wallet.send.pinTitle', 'Confirm this transfer')}
        detail={summary}
      />
    </div>;
};
export default SendPage;
