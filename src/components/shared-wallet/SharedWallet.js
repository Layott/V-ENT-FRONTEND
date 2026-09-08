'use client';

// A team's wallet and an organisation's wallet, drawn once.
//
// CEO, 7 September 2026: "Teams should have their own wallets and
// organizations should also have their own wallets."
//
// One component for both, because they are the same thing with a different
// owner: a balance, a statement, and a way to send. Two copies would be two
// places for the balance and the statement to start disagreeing, which is the
// fault this codebase keeps producing.
//
// ## Read is wide, spend is narrow
//
// Everybody who belongs sees the statement - a team whose members cannot see
// where the money went is worse than no wallet - and only the owner, captain
// or manager may spend. The API decides that and sends `can_spend`; this
// screen never guesses it, and never renders a send form that would be
// refused. Telling somebody what they need BEFORE they type is the rule.

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { appLocale } from '@/lib/appLocale';
import { formatDateTime } from '@/lib/datetime';
import styles from './shared-wallet.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function SharedWallet({ kind, reference, name }) {
  const tt = useT();
  const { data: session, status } = useSession();
  const token = session?.user?.sessionToken;

  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const [toKind, setToKind] = useState('user');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');

  const path = kind === 'team'
    ? `${API}/auth/team/${encodeURIComponent(reference)}/wallet/`
    : `${API}/auth/organization/${encodeURIComponent(reference)}/wallet/`;

  const load = useCallback(async () => {
    if (!token || !reference) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
      if (!res.ok || body.status !== 'success') {
        setError(apiMessage(tt, body, 'api.couldNotLoadWallet',
          'Could not open this wallet.'));
        setWallet(null);
      } else {
        setWallet(body.data);
        setError('');
      }
    } catch {
      setError(tt('api.networkProblem', 'The network is not answering. Try again.'));
    } finally {
      setLoading(false);
    }
  }, [path, token, reference, tt]);

  useEffect(() => { load(); }, [load]);

  const post = async (payload, okKey, okText) => {
    setBusy(true);
    setNotice('');
    setError('');
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok || body.status !== 'success') {
        setError(apiMessage(tt, body, 'api.couldNotSend', 'That did not go through.'));
      } else {
        setWallet(body.data);
        setNotice(tt(okKey, okText));
        setTo(''); setAmount(''); setNote(''); setPin(''); setNewPin('');
      }
    } catch {
      setError(tt('api.networkProblem', 'The network is not answering. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  // Decide on STATUS, never on data alone: `data` cannot tell "signed out"
  // from "still asking", and deciding while loading shows a stranger's screen
  // to the owner for a moment.
  if (status === 'loading' || loading) {
    return <p className={styles.muted}>{tt('ui.loading', 'Loading...')}</p>;
  }
  if (!token) {
    return <p className={styles.muted}>
      {tt('wallet.signInToSee', 'Sign in to see this wallet.')}
    </p>;
  }
  if (error && !wallet) {
    return <p className={styles.error}>{error}</p>;
  }
  if (!wallet) return null;

  const money = (n) => `${Number(n).toLocaleString(appLocale())} VC`;

  return (
    <div className={styles.wrap}>
      <div className={styles.balanceCard}>
        <span className={styles.balanceLabel}>
          {kind === 'team'
            ? tt('wallet.teamBalance', 'This team holds')
            : tt('wallet.orgBalance', 'This organisation holds')}
        </span>
        <strong className={styles.balanceValue}>{money(wallet.balance)}</strong>
        {name ? <span className={styles.balanceOwner}>{name}</span> : null}
      </div>

      {notice ? <p className={styles.notice}>{notice}</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {/* The send form exists only for somebody who may send. A control that
          renders live and is refused on press is what the community feed
          shipped once and had to take back. */}
      {wallet.can_spend ? (
        <section className={styles.panel}>
          <h3 className={styles.panelTitle}>{tt('wallet.sendTitle', 'Send from this wallet')}</h3>

          {!wallet.has_pin ? (
            <div className={styles.pinBox}>
              <p className={styles.hint}>
                {tt('wallet.needPin', 'Set a PIN before this wallet can send anything. Everybody who belongs here can open this page, so the PIN is what stands between them and the balance.')}
              </p>
              <label className={styles.label} htmlFor="sw-newpin">
                {tt('wallet.choosePin', 'Choose a 4 to 6 digit PIN')}
              </label>
              <input id="sw-newpin" name="sw-newpin" className={styles.input}
                     type="password" inputMode="numeric" autoComplete="off"
                     value={newPin}
                     onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))} />
              <button type="button" className={`${styles.primaryBtn} grnBTN`}
                      disabled={busy || newPin.length < 4}
                      onClick={() => post({ action: 'set_pin', pin: newPin },
                                          'wallet.pinSaved', 'PIN saved.')}>
                {tt('wallet.savePin', 'Save the PIN')}
              </button>
            </div>
          ) : (
            <div className={styles.sendBox}>
              <label className={styles.label} htmlFor="sw-kind">
                {tt('wallet.toKind', 'Sending to')}
              </label>
              {/* Named, never guessed. The same word could be a username, a
                  team or an organisation, and guessing wrong sends the money
                  to a stranger. */}
              <select id="sw-kind" className={styles.input} value={toKind}
                      onChange={(e) => setToKind(e.target.value)}>
                <option value="user">{tt('wallet.toUser', 'A person')}</option>
                <option value="team">{tt('wallet.toTeam', 'A team')}</option>
                <option value="org">{tt('wallet.toOrg', 'An organisation')}</option>
              </select>

              <label className={styles.label} htmlFor="sw-to">
                {toKind === 'user'
                  ? tt('wallet.toUserHint', 'Their username or email')
                  : tt('wallet.toNameHint', 'Its name')}
              </label>
              <input id="sw-to" name="sw-to" className={styles.input}
                     value={to} autoComplete="off"
                     onChange={(e) => setTo(e.target.value)} />

              <label className={styles.label} htmlFor="sw-amount">
                {tt('wallet.amount', 'How much, in VENT COINS')}
              </label>
              <input id="sw-amount" name="sw-amount" className={styles.input}
                     type="number" min={1} value={amount}
                     onChange={(e) => setAmount(e.target.value)} />

              <label className={styles.label} htmlFor="sw-note">
                {tt('wallet.note', 'What it is for (optional)')}
              </label>
              <input id="sw-note" name="sw-note" className={styles.input}
                     value={note} maxLength={200}
                     onChange={(e) => setNote(e.target.value)} />

              <label className={styles.label} htmlFor="sw-pin">
                {tt('wallet.pin', 'Wallet PIN')}
              </label>
              <input id="sw-pin" name="sw-pin" className={styles.input}
                     type="password" inputMode="numeric" autoComplete="off"
                     value={pin}
                     onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} />

              <button type="button" className={`${styles.primaryBtn} grnBTN`}
                      disabled={busy || !to.trim() || !amount || pin.length < 4}
                      onClick={() => post({
                        action: 'send', to_kind: toKind, to: to.trim(),
                        amount: Number(amount), note, pin,
                      }, 'wallet.sent', 'Sent.')}>
                {busy ? tt('wallet.sending', 'Sending...') : tt('wallet.send', 'Send')}
              </button>
            </div>
          )}
        </section>
      ) : (
        <p className={styles.hint}>
          {kind === 'team'
            ? tt('wallet.readOnlyTeam', 'You can see everything this team spends. Only the owner, the captain or a manager can send from it.')
            : tt('wallet.readOnlyOrg', 'You can see everything this organisation spends. Only the owner, an admin or a manager who runs its teams can send from it.')}
        </p>
      )}

      <section className={styles.panel}>
        <h3 className={styles.panelTitle}>{tt('wallet.history', 'Everything that has moved')}</h3>
        {wallet.transactions.length === 0 ? (
          <p className={styles.muted}>
            {tt('wallet.nothingYet', 'Nothing has moved through this wallet yet.')}
          </p>
        ) : (
          <div className={styles.rows}>
            {wallet.transactions.map((row) => (
              <div key={row.id} className={styles.row}>
                <div className={styles.rowMain}>
                  <strong className={styles.rowName}>{row.description}</strong>
                  <span className={styles.muted}>{formatDateTime(row.at)}</span>
                </div>
                <span className={row.amount < 0 ? styles.out : styles.in}>
                  {row.amount < 0 ? '' : '+'}{money(row.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
