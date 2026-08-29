'use client';

// What happened inside one fixture.
//
// On a knockout that is a scoreline. On a league it is more than that: the
// fixture is two matches added together, and the interesting part is which seat
// won what. "Nigeria 3-2 Ghana" hides the fact that Ghana won one of the two
// matches 2-0, which is exactly the thing people argue about afterwards.
//
// So the seats are listed with their players and their own scores, and the
// aggregate is shown as arithmetic rather than as a conclusion.
//
// Public, like the fixtures themselves. Reached by pressing any matchup in
// either view.

import { useCallback, useEffect, useState } from 'react';
import { IoClose } from 'react-icons/io5';
import { useT } from '@/i18n/LanguageProvider';
import styles from './fixture-detail.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function FixtureDetail({ match, onClose }) {
  const tt = useT();
  const [tie, setTie] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!match?.match_id) { setLoading(false); return; }
    try {
      const res = await fetch(`${API}/tournament/tie/${match.match_id}/`);
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') setTie(body.data);
    } catch {
      // The scoreline from the fixture list is already on screen, so a failed
      // detail costs the seats and not the result.
    } finally {
      setLoading(false);
    }
  }, [match]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const onKey = event => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!match) return null;

  const one = match.participant_1?.name || tt('bracket.tbd', 'To be decided');
  const two = match.participant_2?.name || tt('bracket.tbd', 'To be decided');
  const done = match.status === 'completed';
  const seats = tie?.fixtures || [];
  const agg = tie?.aggregate;

  return (
    <div className={styles.overlay}
         onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.panel} role="dialog" aria-modal="true">
        <div className={styles.head}>
          <p className={styles.title}>{tt('fixture.title', 'This fixture')}</p>
          <button type="button" className={styles.close} onClick={onClose}
                  aria-label={tt('ui.close.4c1a', 'Close')}>
            <IoClose />
          </button>
        </div>

        {/* The headline. Scores only once the fixture is decided: a 0-0 shown
            before anything is played reads as a goalless draw. */}
        <div className={styles.score}>
          <span className={styles.scoreName}>{one}</span>
          <span className={styles.scoreNums}>
            {done ? `${match.score_p1} - ${match.score_p2}`
              : tt('bracket.toPlay', 'to play')}
          </span>
          <span className={styles.scoreName}>{two}</span>
        </div>

        {loading && <p className={styles.state}>{tt('ui.loading', 'Loading…')}</p>}

        {!loading && seats.length > 0 && (
          <>
            <p className={styles.seatsTitle}>
              {tt('fixture.seats', 'The matches inside it')}
            </p>
            <ul className={styles.seats}>
              {seats.map(seat => {
                const played = seat.status === 'completed';
                return (
                  <li key={seat.slot} className={styles.seat}>
                    <span className={styles.seatNo}>
                      {tt('fixture.seatN', 'Seat {n}').replace('{n}', seat.slot)}
                    </span>
                    <span className={styles.seatSide}>
                      {seat.player_1?.name || tt('fixture.empty', 'Nobody seated')}
                    </span>
                    <span className={`${styles.seatScore} ${played ? '' : styles.seatPending}`}>
                      {played ? `${seat.goals_1} - ${seat.goals_2}`
                        : tt('bracket.toPlay', 'to play')}
                    </span>
                    <span className={styles.seatSide}>
                      {seat.player_2?.name || tt('fixture.empty', 'Nobody seated')}
                    </span>
                  </li>
                );
              })}
            </ul>

            {/* The arithmetic, said out loud. The whole format turns on the
                fact that this is goals added and not matches won. */}
            {agg && (
              <p className={styles.aggregate}>
                {tt('fixture.aggregate', 'Added across the seats: {a} - {b}.')
                  .replace('{a}', agg.participant_1)
                  .replace('{b}', agg.participant_2)}
                {' '}
                {tt('fixture.aggregateNote', 'The fixture goes on goals added, not on how many matches each side won.')}
              </p>
            )}
          </>
        )}

        {!loading && seats.length === 0 && (
          <p className={styles.state}>
            {done
              ? tt('fixture.single', 'One match, and that is the result.')
              : tt('fixture.notYet', 'Not played yet.')}
          </p>
        )}
      </div>
    </div>
  );
}
