'use client';

// Paying the winners: seeing the list first, and setting it to happen on its
// own.
//
// The button this replaces paid immediately. One press, real money out of the
// platform and into four wallets, and the organiser learned what had moved by
// reading the transactions afterwards. The spec asks for "a warning before
// coins leave", and a dialogue that says "are you sure" is not one: this names
// every winner, every amount and the total, which is a thing somebody can
// check.
//
// The list here is the same list the payout uses. It comes from the server's
// `prizes.plan`, which is the resolution `distribute` runs, so approving it and
// paying it cannot disagree.

import { useCallback, useEffect, useState } from 'react';
import { LuTrophy, LuX } from 'react-icons/lu';
import { apiMessage } from '@/lib/apiMessage';
import { useT } from '@/i18n/LanguageProvider';
import DateField from '@/components/date-field/DateField';
import { formatWithZone, localInputToISO } from '@/lib/datetime';
import styles from './prize-plan.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

// What is wrong with one row, in the reader's language. A code from the
// server, because a sentence built in Python cannot be translated.
const ROW_PROBLEMS = {
  no_amount: ['prizes.rowNoAmount', 'No prize set for this position.'],
  nobody_finished_here: ['prizes.rowNobody',
    'Nobody finished here, so nothing is paid.'],
  winner_wallet_missing: ['prizes.rowNoWallet',
    'This winner has no wallet yet, so they cannot be paid.'],
};

const PLAN_PROBLEMS = {
  tournament_not_completed: ['prizes.notCompleted',
    'This tournament is not finished, so there is nobody to pay yet.'],
  no_prize_configured: ['prizes.noPrize', 'This tournament awards no prizes.'],
  prize_distribution_missing: ['prizes.noTable',
    'No prize positions have been set, so there is nothing to pay.'],
};

export default function PrizePlan({ tournamentRef, token, onClose, showToast }) {
  const tt = useT();

  const [plan, setPlan] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [hasPremium, setHasPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [when, setWhen] = useState('');
  const [noticeHours, setNoticeHours] = useState('24');

  const load = useCallback(async () => {
    setLoading(true);
    setProblem('');
    try {
      const res = await fetch(`${API}/tournament/${tournamentRef}/prizes/plan/`,
        { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setPlan(body.data);
        setSchedule(body.data.schedule || null);
        setHasPremium(Boolean(body.data.has_premium));
        return;
      }
      setProblem(apiMessage(tt, body, 'prizes.loadFailed',
        'Could not read who would be paid.'));
    } catch {
      setProblem(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
    } finally {
      setLoading(false);
    }
  }, [tournamentRef, token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const payNow = async () => {
    setBusy(true);
    setProblem('');
    try {
      const res = await fetch(
        `${API}/tournament/${tournamentRef}/distribute-prizes/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json',
                     Authorization: `Bearer ${token}` },
          // The confirmation the server now requires. Sent only from here,
          // where the list has been on the screen.
          body: JSON.stringify({ confirm: true }),
        });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        if (showToast) {
          showToast(tt('prizes.paid', 'Paid. {n} positions have their prize.')
            .replace('{n}', (body.data?.distributions || []).length));
        }
        if (onClose) onClose(true);
        return;
      }
      setProblem(apiMessage(tt, body, 'prizes.payFailed',
        'The prizes were not paid.'));
    } catch {
      setProblem(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
    } finally {
      setBusy(false);
    }
  };

  const setAutomatic = async () => {
    if (!when) return;
    setBusy(true);
    setProblem('');
    try {
      const res = await fetch(
        `${API}/tournament/${tournamentRef}/prizes/schedule/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json',
                     Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            run_at: localInputToISO(when),
            warn_hours: Number(noticeHours) || 0,
          }),
        });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setSchedule(body.data.schedule);
        if (showToast) showToast(tt('prizes.scheduled', 'The prizes will be paid automatically.'));
        return;
      }
      setProblem(apiMessage(tt, body, 'prizes.scheduleFailed',
        'That automatic payout was not set.'));
    } catch {
      setProblem(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
    } finally {
      setBusy(false);
    }
  };

  const callOff = async () => {
    setBusy(true);
    try {
      const res = await fetch(
        `${API}/tournament/${tournamentRef}/prizes/schedule/`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setSchedule(body.data.schedule);
        if (showToast) showToast(tt('prizes.calledOff', 'The automatic payout is called off.'));
        return;
      }
      setProblem(apiMessage(tt, body, 'prizes.scheduleFailed',
        'That automatic payout was not changed.'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className={styles.panel}>
    <p className={styles.state}>{tt('ui.loading.33ce', 'Loading…')}</p>
  </div>;

  const rows = plan?.rows || [];
  const payable = rows.filter(r => !r.paid && !r.problem);
  const blocked = (plan?.problems || []).length > 0;

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <div>
          <h3 className={styles.title}>{tt('prizes.title', 'Paying the winners')}</h3>
          <p className={styles.hint}>
            {tt('prizes.hint', 'Check the list before anything moves. A payout cannot be undone from here.')}
          </p>
        </div>
        <button type="button" className={styles.iconBtn} onClick={() => onClose && onClose(false)}
                aria-label={tt('ui.close.bbfa', 'Close')}>
          <LuX aria-hidden="true" />
        </button>
      </div>

      {problem && <p className={styles.problem} role="alert">{problem}</p>}

      {(plan?.problems || []).map(code => (
        <p key={code} className={styles.problem}>
          {tt(...(PLAN_PROBLEMS[code] || [`prizes.problem.${code}`, code]))}
        </p>
      ))}

      {rows.length === 0 && !blocked && (
        <p className={styles.state}>
          {tt('prizes.noRows', 'No prize positions have been set for this tournament.')}
        </p>
      )}

      {rows.length > 0 && (
        <ol className={styles.rows}>
          {rows.map(row => (
            <li key={row.position} className={styles.row}>
              <span className={styles.position}>{row.position}</span>
              <span className={styles.who}>
                {row.name || tt('prizes.nobody', 'Nobody')}
                {row.problem && (
                  <span className={styles.rowProblem}>
                    {tt(...(ROW_PROBLEMS[row.problem] || [`prizes.row.${row.problem}`, row.problem]))}
                  </span>
                )}
              </span>
              <span className={styles.amount}>
                {tt('prizes.coins', '{n} VC').replace('{n}', row.amount)}
                {row.paid && <span className={styles.already}>
                  {tt('prizes.alreadyPaid', 'already paid')}
                </span>}
              </span>
            </li>
          ))}
        </ol>
      )}

      {payable.length > 0 && (
        <p className={styles.total}>
          {tt('prizes.total', '{total} VENT COINS go out to {n} winners.')
            .replace('{total}', plan.total)
            .replace('{n}', payable.length)}
        </p>
      )}

      <div className={styles.actions}>
        <button type="button" className={styles.pay} disabled={busy || !payable.length}
                onClick={payNow}>
          <LuTrophy aria-hidden="true" /> {busy
            ? tt('prizes.paying', 'Paying…')
            : tt('prizes.payNow', 'Pay these now')}
        </button>
      </div>

      {/* ------------------------------------------------- automatically */}
      <div className={styles.auto}>
        <p className={styles.autoTitle}>{tt('prizes.autoTitle', 'Or pay at a set time')}</p>

        {schedule && schedule.state !== 'cancelled' ? (
          <>
            <p className={styles.hint}>
              {tt('prizes.autoSet', 'Set for {when}. You are told {hours} hours before.')
                .replace('{when}', formatWithZone(schedule.run_at))
                .replace('{hours}', schedule.warn_hours)}
            </p>
            {schedule.state === 'warned' && (
              <p className={styles.hint}>{tt('prizes.autoWarned', 'You have been told this is coming.')}</p>
            )}
            {schedule.state !== 'paid' && (
              <button type="button" className={styles.ghost} disabled={busy} onClick={callOff}>
                {tt('prizes.callOff', 'Call it off')}
              </button>
            )}
          </>
        ) : hasPremium ? (
          <>
            <div className={styles.autoFields}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>{tt('prizes.autoWhen', 'Pay at')}</span>
                <DateField withTime value={when} disabled={busy}
                           onChange={e => setWhen(e.target.value)} />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>{tt('prizes.autoNotice', 'Tell me this many hours before')}</span>
                <input className={styles.number} type="number" min="0" max="168"
                       value={noticeHours} disabled={busy}
                       onChange={e => setNoticeHours(e.target.value.replace(/[^0-9]/g, ''))} />
              </label>
            </div>
            <button type="button" className={styles.ghost} disabled={busy || !when}
                    onClick={setAutomatic}>
              {tt('prizes.setAuto', 'Pay automatically')}
            </button>
          </>
        ) : (
          // Told before the effort, not after it. The control is not rendered
          // live to be refused on press.
          <p className={styles.hint}>
            {tt('prizes.autoPremium', 'Paying automatically at a time you set is a premium feature. Ask a V-ENT admin to turn premium on for this account.')}
          </p>
        )}
      </div>
    </div>
  );
}
