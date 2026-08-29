'use client';

// Seeing the shape of a tournament, whatever shape it is.
//
// The existing bracket drawing assumes every round has half the matches of the
// one before it, which is true of a knockout and false of everything else. Draw
// a five-nation round robin with it and the connectors join fixtures that have
// nothing to do with each other: the picture is confidently wrong, which is
// worse than no picture.
//
// So two views, and the reader chooses:
//
//   Map   the boxes-and-lines picture. For a knockout that is the classic
//         bracket with the lines showing who meets whom. For a league there is
//         nothing to join, because nobody advances, so it draws the matchdays
//         as columns and says so rather than inventing lines.
//
//   Grid  every entrant against every entrant. For a round robin this is the
//         better read by a distance - you can see at a glance who somebody has
//         left to play. For a knockout it lists the rounds, which is what
//         actually fits on a phone.
//
// Public. A bracket is the most shareable thing a tournament produces, and
// putting it behind a sign-in is how a competition stays invisible.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { LuLayoutGrid, LuNetwork } from 'react-icons/lu';
import { useT } from '@/i18n/LanguageProvider';
import FixtureDetail from './FixtureDetail';
import styles from './bracket-visualizer.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

// Formats where nobody advances out of a round, so there is nothing to join.
const FLAT_FORMATS = new Set([
  'round_robin', 'round-robin', 'roundrobin', 'rr',
  'league', 'ladder', 'swiss', 'swiss_system', 'swiss-system',
  'battle_royale', 'battle-royale', 'aggregate_2v2',
]);

const isFlat = format => FLAT_FORMATS.has(
  String(format || '').trim().toLowerCase().replace(/\s+/g, '_'));

const nameOf = side => side?.name || null;

/** One fixture, drawn the same way in every view so nothing looks like two things. */
const Fixture = ({ match, tt, onOpen }) => {
  const one = nameOf(match.participant_1);
  const two = nameOf(match.participant_2);
  const done = match.status === 'completed';
  const winner = match.winner;

  const side = (label, score, isWinner) => (
    <div className={`${styles.side} ${done && isWinner ? styles.sideWon : ''}`}>
      <span className={styles.sideName}>
        {label || <span className={styles.tbd}>{tt('bracket.tbd', 'To be decided')}</span>}
      </span>
      <span className={styles.sideScore}>{done ? score : ''}</span>
    </div>
  );

  const wonBy = which => {
    if (!done || winner == null) return false;
    const id = which === 1 ? match.participant_1?.id : match.participant_2?.id;
    return String(winner) === String(id) || winner === which;
  };

  return (
    <button type="button" className={styles.fixture}
            onClick={() => onOpen && onOpen(match)}
            aria-label={`${one || '?'} v ${two || '?'}`}>
      {side(one, match.score_p1, wonBy(1))}
      {/* Reads as one fixture rather than two rows that happen to be adjacent.
          Hidden from a screen reader, which gets the two names in order and
          does not need a decorative letter between them. */}
      <span className={styles.versus} aria-hidden="true">v</span>
      {side(two, match.score_p2, wonBy(2))}
    </button>
  );
};

/** Knockout: columns that halve, with lines joining each pair to its next match. */
const MapKnockout = ({ rounds, tt, onOpen }) => (
  <div className={styles.mapScroller}>
    <div className={styles.mapRow}>
      {rounds.map((round, index) => (
        <div key={round.round} className={styles.mapCol}>
          <p className={styles.colTitle}>
            {index === rounds.length - 1
              ? tt('bracket.final', 'Final')
              : tt('bracket.roundN', 'Round {n}').replace('{n}', round.round)}
          </p>
          {/* Spaced so each match sits opposite the pair that feeds it. The
              gap doubles every round, which is what makes the lines read. */}
          <div className={styles.mapStack}
               style={{ gap: `${Math.max(12, 12 * (2 ** index))}px`,
                        paddingTop: `${index === 0 ? 0 : 12 * ((2 ** index) - 1)}px` }}>
            {(round.matches || []).map(match => (
              <Fixture key={match.match_id} match={match} tt={tt} onOpen={onOpen} />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

/** League or swiss: matchdays side by side. Nothing advances, so nothing joins. */
const MapFlat = ({ rounds, tt, onOpen }) => (
  <div className={styles.mapScroller}>
    <div className={styles.mapRow}>
      {rounds.map(round => (
        <div key={round.round} className={styles.mapCol}>
          <p className={styles.colTitle}>
            {tt('bracket.matchday', 'Matchday {n}').replace('{n}', round.round)}
          </p>
          <div className={styles.mapStack} style={{ gap: '12px' }}>
            {(round.matches || []).map(match => (
              <Fixture key={match.match_id} match={match} tt={tt} onOpen={onOpen} />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

/** Round robin: everyone against everyone, so you can see who is left to play. */
const GridCrosstab = ({ rounds, tt, onOpen }) => {
  const { names, cells } = useMemo(() => {
    const seen = new Map();
    const byPair = new Map();
    for (const round of rounds) {
      for (const match of round.matches || []) {
        const one = nameOf(match.participant_1);
        const two = nameOf(match.participant_2);
        if (!one || !two) continue;
        if (!seen.has(one)) seen.set(one, true);
        if (!seen.has(two)) seen.set(two, true);
        byPair.set(`${one}|${two}`, match);
      }
    }
    return { names: [...seen.keys()], cells: byPair };
  }, [rounds]);

  if (names.length === 0) {
    return <p className={styles.empty}>
      {tt('bracket.empty', 'No fixtures yet. They appear once the organiser generates them.')}
    </p>;
  }

  const find = (row, col) => cells.get(`${row}|${col}`) || cells.get(`${col}|${row}`);

  return (
    <div className={styles.gridScroller}>
      <table className={styles.grid}>
        <thead>
          <tr>
            <th className={styles.gridCorner} />
            {names.map(name => (
              <th key={name} className={styles.gridHead}>
                <span className={styles.gridHeadText}>{name}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {names.map(row => (
            <tr key={row}>
              <th className={styles.gridRowHead}>{row}</th>
              {names.map(col => {
                if (row === col) {
                  // Nobody plays themselves. Filled rather than left blank so
                  // the diagonal reads as deliberate.
                  return <td key={col} className={styles.gridSelf} aria-hidden="true" />;
                }
                const match = find(row, col);
                if (!match) {
                  return <td key={col} className={styles.gridNone}>
                    <span className={styles.gridDash}>-</span>
                  </td>;
                }
                const rowIsOne = nameOf(match.participant_1) === row;
                const mine = rowIsOne ? match.score_p1 : match.score_p2;
                const theirs = rowIsOne ? match.score_p2 : match.score_p1;
                const done = match.status === 'completed';
                return (
                  <td key={col} className={styles.gridCell}>
                    <button type="button" className={styles.gridBtn}
                            onClick={() => onOpen && onOpen(match)}
                            aria-label={`${row} v ${col}`}>
                    {done
                      ? <span className={`${styles.gridScore} ${
                          mine > theirs ? styles.gridWin
                            : mine < theirs ? styles.gridLoss : styles.gridDraw}`}>
                          {mine}-{theirs}
                        </span>
                      : <span className={styles.gridToPlay}>
                          {tt('bracket.toPlay', 'to play')}
                        </span>}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className={styles.gridNote}>
        {tt('bracket.gridNote', 'Read across the row: that side’s score first. A blank means the two have no fixture.')}
      </p>
    </div>
  );
};

/** Knockout in the grid view: the rounds as a list, which is what fits a phone. */
const GridRounds = ({ rounds, tt, onOpen }) => (
  <div className={styles.list}>
    {rounds.map((round, index) => (
      <section key={round.round} className={styles.listRound}>
        <p className={styles.colTitle}>
          {index === rounds.length - 1
            ? tt('bracket.final', 'Final')
            : tt('bracket.roundN', 'Round {n}').replace('{n}', round.round)}
        </p>
        <div className={styles.listStack}>
          {(round.matches || []).map(match => (
            <Fixture key={match.match_id} match={match} tt={tt} onOpen={onOpen} />
          ))}
        </div>
      </section>
    ))}
  </div>
);

export default function BracketVisualizer({ tournamentId }) {
  const tt = useT();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState(null);
  const [openFixture, setOpenFixture] = useState(null);

  const load = useCallback(async () => {
    if (!tournamentId) { setLoading(false); return; }
    try {
      const res = await fetch(`${API}/tournament/get-tournament-brackets/${tournamentId}/`);
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') setData(body.data);
      else setError(tt('bracket.failed', 'Could not load the fixtures.'));
    } catch {
      setError(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
    } finally {
      setLoading(false);
    }
  }, [tournamentId, tt]);

  useEffect(() => { load(); }, [load]);

  const flat = isFlat(data?.bracket_type);

  // The default follows the format, because the better read differs: a league
  // is easier to follow as a grid and a knockout as a map. The reader can
  // still swap, and their choice is what the buttons are for.
  useEffect(() => {
    if (data && view === null) setView(flat ? 'grid' : 'map');
  }, [data, view, flat]);

  if (loading) return <p className={styles.state}>{tt('ui.loading', 'Loading…')}</p>;
  if (error) return <p className={styles.state}>{error}</p>;
  if (!data) return null;

  const rounds = data.rounds || [];
  if (rounds.length === 0) {
    return <p className={styles.state}>
      {tt('bracket.empty', 'No fixtures yet. They appear once the organiser generates them.')}
    </p>;
  }

  const current = view || (flat ? 'grid' : 'map');

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div>
          <p className={styles.formatName}>{data.format_label || data.bracket_type}</p>
          <p className={styles.formatHint}>
            {flat
              ? tt('bracket.flatHint', 'Every entrant meets the others. Nobody is knocked out, so the table decides it.')
              : tt('bracket.knockoutHint', 'The winner of each match moves along the line to the next one.')}
          </p>
        </div>

        {/* Two ways to read the same fixtures. */}
        <div className={styles.switch} role="group"
             aria-label={tt('bracket.viewLabel', 'How to show the fixtures')}>
          <button type="button"
                  className={`${styles.switchBtn} ${current === 'map' ? styles.switchOn : ''}`}
                  onClick={() => setView('map')} aria-pressed={current === 'map'}>
            <LuNetwork aria-hidden="true" />
            {tt('bracket.viewMap', 'Map')}
          </button>
          <button type="button"
                  className={`${styles.switchBtn} ${current === 'grid' ? styles.switchOn : ''}`}
                  onClick={() => setView('grid')} aria-pressed={current === 'grid'}>
            <LuLayoutGrid aria-hidden="true" />
            {flat ? tt('bracket.viewGrid', 'Grid') : tt('bracket.viewList', 'List')}
          </button>
        </div>
      </div>

      {current === 'map'
        ? (flat ? <MapFlat rounds={rounds} tt={tt} onOpen={setOpenFixture} />
          : <MapKnockout rounds={rounds} tt={tt} onOpen={setOpenFixture} />)
        : (flat ? <GridCrosstab rounds={rounds} tt={tt} onOpen={setOpenFixture} />
          : <GridRounds rounds={rounds} tt={tt} onOpen={setOpenFixture} />)}

      {openFixture && <FixtureDetail match={openFixture}
        onClose={() => setOpenFixture(null)} />}
    </div>
  );
}
