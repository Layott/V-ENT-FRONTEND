'use client';

// Entering the result of a league tie, one seat at a time.
//
// CEO, 3 September 2026: "there will be a place to input results on the
// website inside the tournament". For a knockout that place was Match Control.
// For a league tie it was nowhere: the endpoint that records a seat's goals
// had existed since 29 August and no screen called it, so the Rivalry Series,
// an aggregate league, had no way to enter a result on the site the day
// before it ran.
//
// A tie is one game per seat and is decided on TOTAL goals across them, never
// on games won. So this shows every seat with its two players, takes the
// goals for each, and shows the running aggregate the server sends back. The
// tie settles itself once every seat is in.

import { useCallback, useEffect, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import styles from './tie-scoring.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function TieScoring({ tie, token, onRecorded, showToast }) {
  const tt = useT();
  const [detail, setDetail] = useState(tie);
  const [draft, setDraft] = useState({});
  const [busySlot, setBusySlot] = useState(null);
  const [error, setError] = useState('');

  const tieId = tie?.tie_id;

  const reload = useCallback(async () => {
    if (!tieId) return;
    try {
      const res = await fetch(`${API}/tournament/tie/${tieId}/`, { cache: 'no-store' });
      const body = await res.json();
      if (res.ok && body.status === 'success') setDetail(body.data);
    } catch {
      // The last known state stays on screen; the next record refreshes it.
    }
  }, [tieId]);

  // The seats and who is in them come from the tie itself, not from the
  // bracket list: a match row says who is playing, and a tie says who is in
  // each seat, which is the thing being scored.
  useEffect(() => {
    setDetail(tie);
    setDraft({});
    reload();
  }, [tie, reload]);

  /** What a seat's boxes show: what has been typed, else what is recorded. */
  const shown = (f) => {
    const d = draft[f.slot] || {};
    const done = f.status === 'completed';
    return {
      goals_1: d.goals_1 ?? (done ? String(f.goals_1) : ''),
      goals_2: d.goals_2 ?? (done ? String(f.goals_2) : ''),
    };
  };

  const record = async (f) => {
    const slot = f.slot;
    // What is on screen, which after a seat is recorded is what is stored.
    // Reading the draft alone left "Correct this seat" permanently disabled
    // once a seat was in: recording clears that seat's draft to an empty
    // object, so both numbers read as untyped and the button could only be
    // woken by retyping BOTH. Found by correcting a seat on production,
    // 3 September; an operator fixing one mistyped score is the whole point
    // of the button.
    const v = shown(f);
    const one = Number(v.goals_1);
    const two = Number(v.goals_2);
    if (v.goals_1 === '' || v.goals_2 === ''
      || !Number.isInteger(one) || !Number.isInteger(two) || one < 0 || two < 0) {
      setError(tt('tie.wholeNumbers', 'Goals are whole numbers, zero or more.'));
      return;
    }
    setBusySlot(slot);
    setError('');
    try {
      const res = await fetch(`${API}/tournament/tie/${detail.tie_id}/record/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ slot, goals_1: one, goals_2: two }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.status !== 'success') {
        setError(apiMessage(tt, body, 'tie.recordFailed', 'That result was not saved.'));
      } else {
        setDraft((all) => ({ ...all, [slot]: {} }));
        await reload();
        showToast?.(body.data?.tie_status === 'completed'
          ? tt('tie.settled', 'Every seat is in. The tie is settled.')
          : tt('tie.recorded', 'Seat {n} recorded.').replace('{n}', String(slot)));
        onRecorded?.();
      }
    } catch {
      setError(tt('msg.connectionError', 'Connection error.'));
    } finally {
      setBusySlot(null);
    }
  };

  if (!detail) return null;
  const agg = detail.aggregate || {};
  const settled = detail.status === 'completed';

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <h2 className={styles.title}>{tt('tie.title', 'This tie, seat by seat')}</h2>
        <p className={styles.sub}>
          {tt('tie.sub', 'One game per seat. The tie is decided on total goals across the seats, never on games won, and it settles itself once every seat is in.')}
        </p>
      </div>

      <div className={styles.aggregate}>
        <span className={styles.aggLabel}>{tt('tie.aggregate', 'Aggregate')}</span>
        <span className={styles.aggScore}>
          {agg.participant_1 ?? 0} <span className={styles.aggDash} /> {agg.participant_2 ?? 0}
        </span>
        <span className={`${styles.status} ${settled ? styles.statusDone : ''}`}>
          {settled
            ? (detail.winner_registration_id
              ? tt('tie.won', 'Settled')
              : tt('tie.drawn', 'Settled, drawn'))
            : tt('tie.open', 'Open')}
        </span>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.seats}>
        {(detail.fixtures || []).map((f) => {
          const done = f.status === 'completed';
          const { goals_1: v1, goals_2: v2 } = shown(f);
          // Sendable when both boxes hold something, whether typed now or
          // recorded earlier. A correction that changes one number is the
          // common one, and it must not need the other retyped.
          const sendable = v1 !== '' && v2 !== '';
          return (
            <div key={f.slot} className={`${styles.seat} ${done ? styles.seatDone : ''}`}>
              <div className={styles.seatHead}>
                <span className={styles.seatLabel}>{tt('tie.seat', 'Seat {n}').replace('{n}', String(f.slot))}</span>
                <span className={styles.seatStatus}>{done ? tt('tie.in', 'In') : tt('tie.notYet', 'Not yet')}</span>
              </div>
              <div className={styles.seatRow}>
                <span className={styles.player}>{f.player_1?.name || f.player_1?.username || tt('tie.seatEmpty', 'Seat not filled')}</span>
                <input className={styles.goals} inputMode="numeric" value={v1}
                       onChange={(e) => setDraft((all) => ({ ...all, [f.slot]: { ...(all[f.slot] || {}), goals_1: e.target.value } }))} />
                <span className={styles.dash} />
                <input className={styles.goals} inputMode="numeric" value={v2}
                       onChange={(e) => setDraft((all) => ({ ...all, [f.slot]: { ...(all[f.slot] || {}), goals_2: e.target.value } }))} />
                <span className={`${styles.player} ${styles.playerAway}`}>{f.player_2?.name || f.player_2?.username || tt('tie.seatEmpty', 'Seat not filled')}</span>
              </div>
              <div className={styles.seatActions}>
                <button type="button" className={styles.primary}
                        disabled={busySlot === f.slot || !sendable}
                        onClick={() => record(f)}>
                  {busySlot === f.slot
                    ? tt('ui.saving', 'Saving...')
                    : (done ? tt('tie.correct', 'Correct this seat') : tt('tie.record', 'Record this seat'))}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
