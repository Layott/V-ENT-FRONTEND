'use client'

import { useState, useEffect, useMemo } from 'react';
import styles from './tournament-details-bracket.module.css';

// ── Constants ──────────────────────────────────────────────────────────────
const CARD_H     = 102;
const CARD_W     = 200;   // base card width (wider on desktop via CSS)
const INNER_GAP  = 32;    // gap between the two cards within a pair
const PAIR_GAP   = 56;    // gap between successive pairs
const UNIT       = CARD_H + INNER_GAP + CARD_H + PAIR_GAP; // 292
const CONNECTOR_W = 60;

// ── Position helpers ────────────────────────────────────────────────────────
function buildFirstRoundPositions(numMatches) {
  const numPairs = Math.floor(numMatches / 2);
  const pos = [];
  for (let i = 0; i < numPairs; i++) {
    pos.push(i * UNIT);                      // top card of pair
    pos.push(i * UNIT + CARD_H + INNER_GAP); // bottom card of pair
  }
  // Odd-match bye: last match sits centred in the remaining space
  if (numMatches % 2 !== 0) {
    pos.push(numPairs * UNIT);
  }
  return pos;
}

function deriveNextPositions(prev) {
  const half = CARD_H / 2;
  const pos = [];
  for (let i = 0; i < prev.length - 1; i += 2) {
    const mid = (prev[i] + half + prev[i + 1] + half) / 2;
    pos.push(Math.round(mid - half));
  }
  // Bye: odd number of source positions → pass the last one straight through
  if (prev.length % 2 !== 0) {
    pos.push(prev[prev.length - 1]);
  }
  return pos;
}

function computeAllPositions(rounds) {
  if (!rounds.length) return [];
  const allPos = [buildFirstRoundPositions(rounds[0].matches?.length || 0)];
  for (let r = 1; r < rounds.length; r++) {
    allPos.push(deriveNextPositions(allPos[r - 1]));
  }
  return allPos;
}

function totalBracketHeight(firstRoundMatches) {
  if (firstRoundMatches <= 1) return CARD_H + 8;
  const numPairs = Math.floor(firstRoundMatches / 2);
  // bottom of last card
  return (numPairs - 1) * UNIT + CARD_H + INNER_GAP + CARD_H;
}

// ── Subcomponents ───────────────────────────────────────────────────────────

function WinnerTrophy() {
  return (
    <span className={styles.winnerBadge} aria-label="Winner">
      <svg viewBox="0 0 24 24" width="8" height="8" fill="#fff">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    </span>
  );
}

function MatchCard({ match, topY }) {
  const p1 = match.participants?.[0] || null;
  const p2 = match.participants?.[1] || null;
  const isLive = match.status === 'in_progress';
  const isDone = match.status === 'completed';

  const statusLabel = isLive ? 'Live' : isDone ? 'Done' : 'Upcoming';
  const statusMod   = isLive ? styles.statusLive : isDone ? styles.statusDone : styles.statusUpcoming;
  const cardMod     = isLive ? styles.matchLive   : isDone ? styles.matchDone   : '';

  function initials(participant) {
    if (!participant) return '?';
    const name = participant.name || participant.username || '';
    return name.slice(0, 3).toUpperCase() || '?';
  }

  function scoreEl(participant, opponent) {
    if (!isDone && !isLive) return <span className={`${styles.score} ${styles.scoreNA}`}>-</span>;
    const isWinner = isDone && participant?.is_winner;
    const isLoser  = isDone && opponent?.is_winner;
    return (
      <span className={`${styles.score} ${isWinner ? styles.scoreWinner : ''} ${isLoser ? styles.scoreLoser : ''}`}>
        {participant?.score ?? '-'}
      </span>
    );
  }

  const date = match.scheduled_at
    ? new Date(match.scheduled_at).toLocaleString('en-GB', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      })
    : null;

  return (
    <div
      className={`${styles.matchCard} ${cardMod}`}
      style={{ top: topY }}
    >
      {/* Card top row */}
      <div className={styles.cardTop}>
        {match.match_number && (
          <span className={styles.matchLabel}>Match {match.match_number}</span>
        )}
        <span className={`${styles.statusBadge} ${statusMod}`}>{statusLabel}</span>
        {date && <span className={styles.cardDate}>{date}</span>}
      </div>

      <div className={styles.cardDivider} />

      {/* Teams */}
      <div className={styles.cardTeams}>
        {/* Team 1 */}
        <div className={`${styles.teamRow} ${isDone && p1?.is_winner ? styles.teamWinner : ''}`}>
          <div className={styles.teamAvatar}>{initials(p1)}</div>
          <span className={styles.teamName}>{p1?.name || p1?.username || 'TBD'}</span>
          {isDone && p1?.is_winner && <WinnerTrophy />}
          {scoreEl(p1, p2)}
        </div>

        <div className={styles.teamDivider} />

        {/* Team 2 */}
        <div className={`${styles.teamRow} ${isDone && p2?.is_winner ? styles.teamWinner : ''}`}>
          <div className={styles.teamAvatar}>{initials(p2)}</div>
          <span className={styles.teamName}>{p2?.name || p2?.username || 'TBD'}</span>
          {isDone && p2?.is_winner && <WinnerTrophy />}
          {scoreEl(p2, p1)}
        </div>
      </div>
    </div>
  );
}

function BracketConnector({ prevPositions, nextPositions, totalHeight }) {
  const half = CARD_H / 2;
  const lines = [];

  for (let i = 0; i < nextPositions.length; i++) {
    const topIdx = 2 * i;
    const botIdx = 2 * i + 1;
    if (botIdx >= prevPositions.length) continue; // bye - no connector needed

    const top = prevPositions[topIdx] + half;
    const bot = prevPositions[botIdx] + half;
    const mid = nextPositions[i] + half;
    const mx  = CONNECTOR_W / 2;

    lines.push(
      <g key={i}>
        <line x1={0}  y1={top} x2={mx} y2={top} />
        <line x1={mx} y1={top} x2={mx} y2={bot} />
        <line x1={0}  y1={bot} x2={mx} y2={bot} />
        <line x1={mx} y1={mid} x2={CONNECTOR_W} y2={mid} />
      </g>
    );
  }

  return (
    <svg
      className={styles.connectorSvg}
      width={CONNECTOR_W}
      height={totalHeight}
      xmlns="http://www.w3.org/2000/svg"
    >
      {lines}
    </svg>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

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
        setRounds(Array.isArray(payload) ? payload : payload.rounds || []);
      } else {
        setError(data.message || 'Failed to load bracket.');
      }
    } catch {
      setError('Failed to load bracket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const allPositions = useMemo(() => computeAllPositions(rounds), [rounds]);

  const bracketHeight = useMemo(
    () => totalBracketHeight(rounds[0]?.matches?.length || 0),
    [rounds]
  );

  if (loading) {
    return (
      <div className={styles.stateContainer}>
        <span className={styles.stateText}>Loading bracket…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.stateContainer}>
        <span className={styles.errorText}>{error}</span>
        <button className="btn goldBTN" onClick={fetchBracket}>Retry</button>
      </div>
    );
  }

  if (!rounds.length) {
    return (
      <div className={styles.stateContainer}>
        <span className={styles.stateText}>Bracket has not been generated yet.</span>
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
        <div className={styles.bracketInner}>
          {rounds.map((round, roundIdx) => {
            const positions = allPositions[roundIdx] || [];
            const isLast    = roundIdx === rounds.length - 1;
            const allDone   = (round.matches || []).every(m => m.status === 'completed');

            return (
              <div key={round.id || roundIdx} className={styles.roundGroup}>
                {/* Round column */}
                <div className={styles.roundCol}>
                  <div className={styles.roundHeader}>
                    <span className={styles.roundLabel}>
                      {round.name || `Round ${round.round_number || roundIdx + 1}`}
                    </span>
                    {allDone && (
                      <span className={styles.roundBadge}>Completed</span>
                    )}
                  </div>

                  <div className={styles.cardsArea} style={{ height: bracketHeight }}>
                    {(round.matches || []).map((match, matchIdx) => (
                      <MatchCard
                        key={match.id || matchIdx}
                        match={match}
                        topY={positions[matchIdx] ?? 0}
                      />
                    ))}
                  </div>
                </div>

                {/* Connector to next round */}
                {!isLast && allPositions[roundIdx + 1] && (
                  <div className={styles.connectorCol}>
                    <div className={styles.connectorSpacer} />
                    <BracketConnector
                      prevPositions={positions}
                      nextPositions={allPositions[roundIdx + 1]}
                      totalHeight={bracketHeight}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TournamentDetailsBracket;
