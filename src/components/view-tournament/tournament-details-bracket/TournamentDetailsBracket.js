'use client'

import { useState, useEffect } from 'react';
import styles from './tournament-details-bracket.module.css';

const STATUS_LABEL = {
  upcoming: 'Upcoming',
  in_progress: 'Live',
  completed: 'Done',
};

const MatchCard = ({ match }) => {
  const p1 = match.participants?.[0] || null;
  const p2 = match.participants?.[1] || null;
  const isLive = match.status === 'in_progress';
  const isDone = match.status === 'completed';

  return (
    <div className={`${styles.matchCard} ${isLive ? styles.matchLive : ''}`}>
      <div className={`${styles.statusBadge} ${styles[`status_${match.status}`]}`}>
        {STATUS_LABEL[match.status] || match.status}
      </div>

      <div className={`${styles.participant} ${isDone && p1?.is_winner ? styles.winner : ''} ${isDone && !p1?.is_winner ? styles.loser : ''}`}>
        <span className={styles.participantName}>{p1?.name || p1?.username || 'TBD'}</span>
        {isDone || isLive ? (
          <span className={styles.score}>{p1?.score ?? '—'}</span>
        ) : null}
      </div>

      <div className={styles.matchDivider} />

      <div className={`${styles.participant} ${isDone && p2?.is_winner ? styles.winner : ''} ${isDone && !p2?.is_winner ? styles.loser : ''}`}>
        <span className={styles.participantName}>{p2?.name || p2?.username || 'TBD'}</span>
        {isDone || isLive ? (
          <span className={styles.score}>{p2?.score ?? '—'}</span>
        ) : null}
      </div>
    </div>
  );
};

const TournamentDetailsBracket = ({ tournament }) => {
  const [rounds, setRounds] = useState([]);
  const [bracketType, setBracketType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tournament?.id) return;
    fetchBracket();
  }, [tournament?.id]);

  const fetchBracket = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/tournament/get-tournament-brackets/${tournament.id}/`
      );
      const data = await res.json();

      if (data.status === 'success') {
        const payload = data.data;
        setBracketType(payload.bracket_type || 'single_elimination');
        // Support both data.data.rounds and data.data directly as array
        setRounds(Array.isArray(payload) ? payload : payload.rounds || []);
      } else {
        setError(data.message || 'Failed to load bracket.');
      }
    } catch (err) {
      console.error('Bracket fetch error:', err);
      setError('Failed to load bracket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.stateContainer}>
        <p className={styles.stateText}>Loading bracket...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.stateContainer}>
        <p className={styles.errorText}>{error}</p>
        <button className="btn grnBTN" onClick={fetchBracket}>Retry</button>
      </div>
    );
  }

  if (!rounds.length) {
    return (
      <div className={styles.stateContainer}>
        <p className={styles.stateText}>Bracket has not been generated yet.</p>
      </div>
    );
  }

  return (
    <div className={styles.bracketWrapper}>
      {bracketType && (
        <p className={styles.bracketType}>
          {bracketType === 'single_elimination' ? 'Single Elimination' : bracketType}
        </p>
      )}

      <div className={styles.bracketScroll}>
        <div className={styles.bracketRounds}>
          {rounds.map((round, roundIdx) => (
            <div key={round.id || roundIdx} className={styles.round}>
              <p className={styles.roundLabel}>
                {round.name || `Round ${round.round_number || roundIdx + 1}`}
              </p>

              <div className={styles.matchList}>
                {(round.matches || []).map((match, matchIdx) => (
                  <div
                    key={match.id || matchIdx}
                    className={`${styles.matchWrapper} ${roundIdx < rounds.length - 1 ? styles.hasConnector : ''}`}
                  >
                    <MatchCard match={match} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TournamentDetailsBracket;
