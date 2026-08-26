'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { LuAlarmClock, LuCircleCheck, LuUsers } from 'react-icons/lu';
import { ventFetch, API, tokenFrom } from '@/components/tournament-lib/tournamentApi';
import styles from './check-in.module.css';

// The check-in window, on the page where somebody is actually waiting.
//
// Three audiences, one strip:
//   an entrant, who needs a button and a countdown;
//   the organiser, who needs the count and the button that closes it;
//   everybody else, who gets nothing at all, which is why this renders null
//   far more often than it renders.
//
// The countdown ticks locally off a fetched deadline rather than polling every
// second. Server time is the authority, so the clock is re-synced whenever the
// component refetches instead of drifting quietly for an hour.

const pad = (n) => String(n).padStart(2, '0');

const formatRemaining = (seconds) => {
  if (seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    return `${Math.floor(mins / 60)}:${pad(mins % 60)}:${pad(secs)}`;
  }
  return `${mins}:${pad(secs)}`;
};

const formatClock = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

const CheckInStrip = ({ tournamentId, session, isOrganizer, onChanged }) => {
  const [state, setState] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [closeResult, setCloseResult] = useState(null);
  const timerRef = useRef(null);

  const token = tokenFrom(session);

  const load = useCallback(async () => {
    if (!token || !tournamentId) return;
    try {
      const data = await ventFetch(API.TOURNAMENT.CHECK_IN_STATUS(tournamentId), { token });
      setState(data);
      setRemaining(Number(data?.seconds_remaining) || 0);
    } catch {
      // A tournament that predates check-in answers 404 here. Silence is the
      // right response: there is nothing for this strip to say.
      setState(null);
    }
  }, [token, tournamentId]);

  useEffect(() => { load(); }, [load]);

  // Local tick, re-synced by load(). Stops dead at zero rather than counting
  // into negative numbers.
  useEffect(() => {
    if (!state?.open_now || remaining <= 0) return undefined;
    timerRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          load();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [state?.open_now, remaining > 0, load]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkIn = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await ventFetch(API.TOURNAMENT.CHECK_IN(tournamentId), { method: 'POST', token });
      // No success notice: the headline flips to "You are checked in", and
      // saying it twice reads like it happened twice.
      await load();
      onChanged?.();
    } catch (error) {
      setNotice({ type: 'error', text: error?.message || 'Could not check you in.' });
    } finally {
      setBusy(false);
    }
  };

  const closeWindow = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const data = await ventFetch(API.TOURNAMENT.CLOSE_CHECK_IN(tournamentId), {
        method: 'POST', token,
      });
      setCloseResult(data);
      await load();
      onChanged?.();
    } catch (error) {
      setNotice({ type: 'error', text: error?.message || 'Could not close check-in.' });
    } finally {
      setBusy(false);
    }
  };

  const extend = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await ventFetch(API.TOURNAMENT.EXTEND_CHECK_IN(tournamentId), {
        method: 'POST', token, body: { minutes: 15 },
      });
      setNotice({ type: 'ok', text: 'Start moved back 15 minutes.' });
      await load();
      onChanged?.();
    } catch (error) {
      setNotice({ type: 'error', text: error?.message || 'Could not extend check-in.' });
    } finally {
      setBusy(false);
    }
  };

  if (!state || !state.required) return null;
  if (!state.registered && !isOrganizer) return null;
  if (state.closed && !isOrganizer && state.checked_in) return null;

  const showEntrantAction = state.registered && !state.checked_in && state.open_now;

  return (
    <div className={styles.strip}>
      <div className={styles.main}>
        <p className={styles.label}>Check-in</p>

        {state.checked_in && state.registered ? (
          <p className={styles.headlineDone}>
            <LuCircleCheck /> You are checked in
          </p>
        ) : state.open_now ? (
          <p className={styles.headline}>
            <LuAlarmClock /> Check-in closes in {formatRemaining(remaining)}
          </p>
        ) : state.closed ? (
          <p className={styles.headlineClosed}>
            {state.closed_by_organiser
              ? `Check-in was closed by the organiser at ${formatClock(state.closes_at)}`
              : `Check-in closed at ${formatClock(state.closes_at)}`}
          </p>
        ) : (
          <p className={styles.headline}>
            <LuAlarmClock /> Check-in opens at {formatClock(state.opens_at)}
          </p>
        )}

        <p className={styles.meta}>
          <LuUsers /> {state.checked_in_count} of {state.registered_count} entrants in
          {state.closed || !state.forfeit_without_check_in
            ? '.'
            : '. Anyone who does not check in forfeits.'}
        </p>

        {notice && (
          <p className={notice.type === 'ok' ? styles.noticeOk : styles.noticeError}>
            {notice.text}
          </p>
        )}

        {closeResult && (
          <div className={styles.closeSummary}>
            <p className={styles.closeSummaryLine}>
              {closeResult.checked_in?.length || 0} checked in
              {closeResult.forfeited?.length
                ? `, ${closeResult.forfeited.length} forfeited`
                : ''}
            </p>
            {closeResult.forfeited?.length > 0 && (
              <p className={styles.closeSummaryNames}>
                Removed: {closeResult.forfeited.map((f) => f.name).join(', ')}
              </p>
            )}
          </div>
        )}
      </div>

      <div className={styles.actions}>
        {showEntrantAction && (
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={checkIn}
            disabled={busy}
          >
            {busy ? 'Checking in...' : 'Check in'}
          </button>
        )}

        {isOrganizer && !state.closed_by_organiser && !state.closed && (
          <button type="button" className={styles.ghostBtn} onClick={extend} disabled={busy}>
            Add 15 minutes
          </button>
        )}

        {isOrganizer && !state.closed_by_organiser && (state.open_now || state.closed) && (
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={closeWindow}
            disabled={busy}
          >
            {busy ? 'Closing...' : 'Close check-in'}
          </button>
        )}
      </div>
    </div>
  );
};

export default CheckInStrip;
