'use client';

// What a tournament's entries earn, and paying it out.
//
// CEO, 13 September 2026, asked whether tournaments should pay organisers a
// share of entry fees: "i want it". Until then an entry fee left the player's
// wallet and reached nobody. This is the organiser's side of it, the same
// shape as the Money tab on the event console: what came in, what V-ENT took,
// what went out as prizes, what is waiting, and one button that pays it.
//
// Every number is the server's. The rate is read from the dashboard by the
// server, the split is stamped on each entry when it is paid, and this panel
// draws what `/earnings/` says. Nothing here computes a fee.

import { useCallback, useEffect, useState } from 'react';
import { LuWallet } from 'react-icons/lu';
import { apiMessage } from '@/lib/apiMessage';
import { formatNumber } from '@/lib/datetime';
import { useT } from '@/i18n/LanguageProvider';
import styles from './money-panel.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function MoneyPanel({ tournamentRef, token, showToast }) {
  const tt = useT();
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);
  const [paidSaid, setPaidSaid] = useState('');

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  const load = useCallback(async ({ quiet } = {}) => {
    if (!tournamentRef || !token) { setLoading(false); return; }
    if (!quiet) setProblem('');
    try {
      const res = await fetch(`${API}/tournament/${tournamentRef}/earnings/`, { headers: headers() });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') setEarnings(body.data);
      else setProblem(apiMessage(tt, body, 'money.loadFailed', 'Could not load the money on this tournament.'));
    } catch {
      setProblem(tt('api.NETWORK_UNREACHABLE', 'Could not reach the server. Check the connection and try again.'));
    } finally {
      setLoading(false);
    }
  }, [tournamentRef, token, headers]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const setBearer = async (value) => {
    setBusy(true);
    setProblem('');
    try {
      const res = await fetch(`${API}/tournament/edit-tournament/${tournamentRef}/`, {
        method: 'PUT', headers: headers(), body: JSON.stringify({ fee_bearer: value }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        showToast && showToast(tt('money.feeBearerSaved', 'Saved. It applies to entries from now on.'));
        await load({ quiet: true });
      } else {
        setProblem(apiMessage(tt, body, 'money.saveFailed', 'That was not saved.'));
      }
    } catch {
      setProblem(tt('api.NETWORK_UNREACHABLE', 'Could not reach the server. Check the connection and try again.'));
    } finally {
      setBusy(false);
    }
  };

  const payOut = async () => {
    setBusy(true);
    setProblem('');
    setPaidSaid('');
    try {
      const res = await fetch(`${API}/tournament/${tournamentRef}/settle/`, {
        method: 'POST', headers: headers(), body: JSON.stringify({}),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setPaidSaid(tt('money.paidSaid', 'Paid {n} VC into your wallet.')
          .replace('{n}', formatNumber(body.data?.amount_vc || 0)));
        setEarnings(prev => ({ ...(prev || {}), ...body.data }));
        await load({ quiet: true });
      } else {
        setProblem(apiMessage(tt, body, 'api.couldNotSettle', 'Could not pay this out.'));
      }
    } catch {
      setProblem(tt('api.NETWORK_UNREACHABLE', 'Could not reach the server. Check the connection and try again.'));
    } finally {
      setBusy(false);
    }
  };

  const money = (ngn, vc) => `${formatNumber(Number(ngn || 0))} NGN (${formatNumber(Number(vc || 0))} VC)`;

  if (loading) return <div className={styles.panel}><p className={styles.state}>{tt('ui.loading.33ce', 'Loading…')}</p></div>;
  if (!earnings) return <div className={styles.panel}><p className={styles.problem} role="alert">{problem || tt('money.loadFailed', 'Could not load the money on this tournament.')}</p></div>;

  const takesAFee = earnings.fee_pct > 0 || earnings.fee_flat_ngn > 0;
  const paidEntries = earnings.entry_vc > 0;

  return (
    <div className={styles.panel}>
      <div>
        <h3 className={styles.title}>{tt('money.title', 'Money')}</h3>
        <p className={styles.hint}>
          {paidEntries
            ? tt('money.hint', 'Entries build the prize pool. V-ENT takes its fee on each entry, prizes come out of what is left, and the rest is yours.')
            : tt('money.hintFree', 'Entry is free, so nothing comes in. Prizes on a free tournament are paid from your own wallet.')}
        </p>
      </div>

      {problem && <p className={styles.problem} role="alert">{problem}</p>}

      {paidEntries && <>
        <h4 className={styles.subTitle}>{tt('manage.whoPaysTheFee', 'Who pays the service fee')}</h4>
        {takesAFee ? <>
          <div className={styles.chips}>
            {[['organiser', 'manage.feeOnMe', 'I absorb it'],
              ['player', 'money.feeOnPlayer', 'The player pays it on top']].map(([value, key, fallback]) => (
              <button key={value} type="button"
                      className={earnings.fee_bearer === value ? `${styles.chip} ${styles.chipOn}` : styles.chip}
                      aria-pressed={earnings.fee_bearer === value}
                      disabled={busy || earnings.fee_bearer === value}
                      onClick={() => setBearer(value)}>
                {tt(key, fallback)}
              </button>
            ))}
          </div>
          <p className={styles.hint}>
            {tt('money.feeExplained', 'V-ENT takes {pct}% plus {flat} naira on each paid entry. Whichever you pick applies to entries from now on, never to anybody already in. A wallet pays in whole VENT COINS, so with the fee on the player the whole coins of it are added to their entry and the part under a coin still comes out of yours.')
              .replace('{pct}', String(earnings.fee_pct))
              .replace('{flat}', formatNumber(earnings.fee_flat_ngn))}
          </p>
        </> : <p className={styles.hint}>{tt('money.noFeeAtAll', 'V-ENT is not taking a fee on entries, so there is nothing to pass on.')}</p>}
      </>}

      <h4 className={styles.subTitle}>{tt('money.cameIn', 'What came in and went out')}</h4>
      <div className={styles.rows}>
        <div className={styles.row}>
          <div className={styles.rowMain}>
            <strong className={styles.rowName}>{tt('money.entries', 'Paid entries')}</strong>
            <span className={styles.muted}>
              {tt('money.entriesCount', '{n} entries at {entry} VC').replace('{n}', earnings.entries_paid).replace('{entry}', earnings.entry_vc)}
            </span>
          </div>
          <span className={styles.figure}>{money(earnings.entries_ngn, earnings.entries_vc)}</span>
        </div>
        {earnings.refunded_entries > 0 && <div className={styles.row}>
          <div className={styles.rowMain}>
            <strong className={styles.rowName}>{tt('money.refunded', 'Refunded')}</strong>
            <span className={styles.muted}>{tt('money.refundedCount', '{n} entries').replace('{n}', earnings.refunded_entries)}</span>
          </div>
          <span className={styles.figure}>{formatNumber(earnings.refunded_ngn)} NGN</span>
        </div>}
        <div className={styles.row}>
          <div className={styles.rowMain}>
            <strong className={styles.rowName}>{tt('manage.platformTook', 'V-ENT service fee')}</strong>
            {earnings.platform_fee_ngn - earnings.fee_ngn > 0 && <span className={styles.muted}>
              {tt('money.playersPaidOfIt', '{n} naira of it paid by players on top; {yours} naira came out of yours')
                .replace('{n}', formatNumber(earnings.platform_fee_ngn - earnings.fee_ngn))
                .replace('{yours}', formatNumber(earnings.fee_ngn))}
            </span>}
          </div>
          <span className={styles.figure}>{formatNumber(earnings.platform_fee_ngn)} NGN</span>
        </div>
        <div className={styles.row}>
          <div className={styles.rowMain}>
            <strong className={styles.rowName}>{tt('money.prizesPaid', 'Prizes paid from the pool')}</strong>
          </div>
          <span className={styles.figure}>{money(earnings.prizes_ngn, earnings.prizes_vc)}</span>
        </div>
        {earnings.topup_vc > 0 && <div className={styles.row}>
          <div className={styles.rowMain}>
            <strong className={styles.rowName}>{tt('money.topup', 'Put in from your wallet for prizes')}</strong>
          </div>
          <span className={styles.figure}>{money(earnings.topup_ngn, earnings.topup_vc)}</span>
        </div>}
      </div>

      <h4 className={styles.subTitle}>{tt('manage.settlement', 'Paying it out')}</h4>
      <div className={styles.rows}>
        <div className={styles.row}>
          <div className={styles.rowMain}>
            <strong className={styles.rowName}>{tt('manage.owedToYou', 'Waiting to be paid to you')}</strong>
          </div>
          <span className={styles.figure}>{money(earnings.organiser_owed_ngn, earnings.organiser_owed_vc)}</span>
        </div>
        <div className={styles.row}>
          <div className={styles.rowMain}>
            <strong className={styles.rowName}>{tt('manage.alreadyPaidYou', 'Already paid to you')}</strong>
          </div>
          <span className={styles.figure}>{money(earnings.organiser_paid_ngn, earnings.organiser_paid_vc)}</span>
        </div>
      </div>
      <p className={styles.hint}>
        {tt('manage.carryExplained', 'The ledger keeps naira. A payout moves the whole VENT COINS the naira has reached into the wallet, and the rest waits for the next payout; nothing under a coin is lost.')}
      </p>

      <div className={styles.actions}>
        <button type="button" className={styles.pay} disabled={busy || earnings.organiser_owed_vc <= 0}
                title={earnings.organiser_owed_vc <= 0 && earnings.organiser_owed_ngn > 0
                  ? tt('manage.underACoin', 'Under one VENT COIN so far; it is paid when it reaches one.') : undefined}
                onClick={payOut}>
          <LuWallet aria-hidden="true" /> {busy ? tt('manage.settling', 'Paying...') : tt('money.payMe', 'Pay me out')}
        </button>
      </div>
      {paidSaid && <p className={styles.hint}>{paidSaid}</p>}
      <p className={styles.hint}>
        {tt('money.settleExplained', 'It pays what the entries have earned into your V-ENT wallet. Pressing it again pays nothing twice.')}
      </p>
    </div>
  );
}
