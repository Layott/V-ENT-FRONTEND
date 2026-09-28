'use client';

// Seeing the shape of a tournament, whatever shape it is, stage by stage.
//
// A tournament can now run in stages (groups, then Swiss, then a double
// elimination playoff), and each stage owns its own matches. So this reads one
// stage at a time, with a chip per stage, and draws it the way its format
// reads best:
//
//   groups       a table per group, then that group's fixtures
//   a table      (league, Swiss) the standings, then the matchdays
//   a knockout   the winners' bracket, then the losers' bracket and the grand
//                final as their own sections when the format has them. The old
//                drawing merged a double elimination's losers rounds into the
//                winners rounds, because the payload dropped which side a
//                match was on.
//
// Each reader sees what they can act on: the two sides of a match, and staff,
// open it in the match room (check in, the room code, report or record the
// result); everybody else gets the public fixture view. A reader who plays in
// this tournament sees their next match at the top.
//
// Public. A bracket is the most shareable thing a tournament produces, and
// putting it behind a sign-in is how a competition stays invisible.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { LuLayoutGrid, LuNetwork } from 'react-icons/lu';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { useAutoRefresh } from '@/lib/useLiveData';
import FixtureDetail from './FixtureDetail';
import MatchRoom from '../match-room/MatchRoom';
import BattleRoyaleBoard from '../battle-royale/BattleRoyaleBoard';
import { formatDayShort, formatTime } from '@/lib/datetime';
import { formatLabel } from '@/lib/formatLabel';
import { matchName } from '@/lib/matchName';
import styles from './bracket-visualizer.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

const TABLE_FORMATS = new Set(['round_robin', 'ladder', 'aggregate_2v2', 'swiss', 'league']);
const OPEN = ['scheduled', 'in_progress', 'pending_opponent_confirm'];

const norm = format => String(format || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
const isTable = format => TABLE_FORMATS.has(norm(format)) || norm(format) === 'swiss_system';
const groupLetter = n => String.fromCharCode(64 + Number(n || 1));
const nameOf = side => side?.name || null;

// A person's @username beside their full name (CEO, 27 September 2026:
// "both"). Nothing for a team, which has one name, or when the two match.
const handleOf = side => (side?.handle && side.handle !== side.name ? `@${side.handle}` : null);

/** One fixture, drawn the same way everywhere so nothing looks like two things. */
const Fixture = ({ match, tt, onOpen, mine }) => {
  const one = nameOf(match.participant_1);
  const two = nameOf(match.participant_2);
  const decided = ['completed', 'walkover_p1', 'walkover_p2'].includes(match.status);
  const winner = match.winner_registration_id;
  const pens = match.penalties_p1 != null && match.penalties_p2 != null;

  const side = (label, score, pen, regId, handle) => (
    <div className={`${styles.side} ${decided && winner && winner === regId ? styles.sideWon : ''}`}>
      <span className={styles.sideName}>
        {label || <span className={styles.tbd}>{tt('bracket.tbd', 'To be decided')}</span>}
        {label && handle && <span className={styles.handle}>{handle}</span>}
      </span>
      <span className={styles.sideScore}>
        {decided ? score : ''}
        {decided && pens ? <span className={styles.pen}>({pen})</span> : null}
      </span>
    </div>
  );

  return (
    <button type="button" className={`${styles.fixture} ${mine ? styles.fixtureMine : ''}`}
            onClick={() => onOpen && onOpen(match)}
            aria-label={`${one || '?'} v ${two || '?'}`}>
      {side(one, match.score_p1, match.penalties_p1, match.participant_1?.registration_id, handleOf(match.participant_1))}
      <span className={styles.versus} aria-hidden="true">v</span>
      {side(two, match.score_p2, match.penalties_p2, match.participant_2?.registration_id, handleOf(match.participant_2))}
      {match.loser_place && !match.winner_place && (
        <span className={styles.fixtureNote}>
          {tt('bracket.loserPlace', 'The loser finishes in place {n}').replace('{n}', match.loser_place)}
        </span>
      )}
      {match.winner_place && match.loser_place && match.winner_place > 1 && (
        <span className={styles.fixtureNote}>
          {tt('bracket.forPlaces', 'For places {a} and {b}')
            .replace('{a}', match.winner_place).replace('{b}', match.loser_place)}
        </span>
      )}
      {match.status === 'scheduled' && match.scheduled_at && (
        <span className={styles.fixtureNote}>
          {tt('bracket.startsAt', 'Starts {time}').replace('{time}',
            `${formatDayShort(match.scheduled_at)}, ${formatTime(match.scheduled_at)}`)}
        </span>
      )}
      {(match.status === 'bye' || match.forfeit_reason || (decided && !winner)
        || match.status === 'disputed' || match.status === 'pending_opponent_confirm') && (
        <span className={styles.fixtureNote}>
          {match.status === 'bye' ? tt('bracket.bye', 'Through without playing')
            : match.forfeit_reason === 'no_show' ? tt('bracket.noShow', 'Won by forfeit, no show')
              : match.status === 'disputed' ? tt('bracket.disputed', 'Disputed')
                : match.status === 'pending_opponent_confirm' ? tt('bracket.pending', 'Waiting to be confirmed')
                  : tt('bracket.draw', 'Draw')}
        </span>
      )}
    </button>
  );
};

const roundTitle = (tt, round, index, count, side, format) => {
  // The formats whose matches have names share them with the console.
  if (['stepladder', 'page_playoff', 'winner_stays_on'].includes(norm(format))) {
    return matchName(tt, {
      round: round.round, side, is_final: round.matches?.some(m => m.is_final),
    }, format);
  }
  if (side === 'grand_final') {
    return count > 1 && index === count - 1
      ? tt('bracket.grandFinalReset', 'Grand final, reset')
      : tt('bracket.grandFinal', 'Grand final');
  }
  if (side === 'losers') return tt('bracket.losersRoundN', 'Losers round {n}').replace('{n}', round.round);
  if (index === count - 1 && round.matches?.some(m => m.is_final)) return tt('bracket.final', 'Final');
  return tt('bracket.roundN', 'Round {n}').replace('{n}', round.round);
};

/** A knockout section: columns that halve, spaced so each match sits opposite its pair. */
const MapKnockout = ({ rounds, tt, onOpen, isMine, side, format }) => (
  <div className={styles.mapScroller}>
    <div className={styles.mapRow}>
      {rounds.map((round, index) => (
        <div key={`${side}-${round.round}`} className={styles.mapCol}>
          <p className={styles.colTitle}>{roundTitle(tt, round, index, rounds.length, side, format)}</p>
          <div className={styles.mapStack}
               style={side === 'winners'
                 ? { gap: `${Math.max(12, 12 * (2 ** index))}px`,
                     paddingTop: `${index === 0 ? 0 : 12 * ((2 ** index) - 1)}px` }
                 : { gap: '12px' }}>
            {(round.matches || []).map(match => (
              <Fixture key={match.match_id} match={match} tt={tt} onOpen={onOpen} mine={isMine(match)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

/** Matchdays side by side. Nothing advances out of a round, so nothing joins. */
const MapFlat = ({ rounds, tt, onOpen, isMine, format }) => (
  <div className={styles.mapScroller}>
    <div className={styles.mapRow}>
      {rounds.map(round => (
        <div key={round.round} className={styles.mapCol}>
          <p className={styles.colTitle}>
            {norm(format) === 'winner_stays_on'
              ? roundTitle(tt, round, 0, 0, 'winners', format)
              : tt('bracket.matchday', 'Matchday {n}').replace('{n}', round.round)}
          </p>
          <div className={styles.mapStack} style={{ gap: '12px' }}>
            {(round.matches || []).map(match => (
              <Fixture key={match.match_id} match={match} tt={tt} onOpen={onOpen} mine={isMine(match)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

/** Everyone against everyone, so you can see who is left to play. */
const GridCrosstab = ({ rounds, tt, onOpen }) => {
  const { names, cells } = useMemo(() => {
    const seen = new Map();
    const byPair = new Map();
    for (const round of rounds) {
      for (const match of round.matches || []) {
        const one = nameOf(match.participant_1);
        const two = nameOf(match.participant_2);
        if (!one || !two) continue;
        seen.set(one, true);
        seen.set(two, true);
        // Home and away plays each pair twice; keep both.
        const key = `${one}|${two}`;
        byPair.set(key, [...(byPair.get(key) || []), match]);
      }
    }
    return { names: [...seen.keys()], cells: byPair };
  }, [rounds]);

  if (names.length === 0) {
    return <p className={styles.empty}>
      {tt('bracket.empty', 'No fixtures yet. They appear once the organiser generates them.')}
    </p>;
  }

  const find = (row, col) => [...(cells.get(`${row}|${col}`) || []), ...(cells.get(`${col}|${row}`) || [])];

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
                if (row === col) return <td key={col} className={styles.gridSelf} aria-hidden="true" />;
                const matches = find(row, col);
                if (!matches.length) {
                  return <td key={col} className={styles.gridNone}><span className={styles.gridDash}>-</span></td>;
                }
                return (
                  <td key={col} className={styles.gridCell}>
                    {matches.map(match => {
                      const rowIsOne = nameOf(match.participant_1) === row;
                      const mine = rowIsOne ? match.score_p1 : match.score_p2;
                      const theirs = rowIsOne ? match.score_p2 : match.score_p1;
                      const done = match.status === 'completed';
                      return (
                        <button key={match.match_id} type="button" className={styles.gridBtn}
                                onClick={() => onOpen && onOpen(match)}
                                aria-label={`${row} v ${col}`}>
                          {done
                            ? <span className={`${styles.gridScore} ${
                                mine > theirs ? styles.gridWin : mine < theirs ? styles.gridLoss : styles.gridDraw}`}>
                                {mine}-{theirs}
                              </span>
                            : <span className={styles.gridToPlay}>{tt('bracket.toPlay', 'to play')}</span>}
                        </button>
                      );
                    })}
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

/** A stage's table, worked out on the server from its own matches. */
const StandingsTable = ({ rows, format, advancing, tt }) => {
  if (!rows?.length) return null;
  const swiss = norm(format) === 'swiss';
  // Formats whose table is final places decided by the matches, not a record
  // of wins and goals: a stepladder's table read P0 W0 D0 L0 on every row
  // (walk, 28 September 2026).
  const placed = ['single_elimination', 'double_elimination', 'gsl', 'stepladder', 'page_playoff']
    .includes(norm(format));
  const goingThrough = new Set(advancing || []);
  // A football Swiss can end level, and a row that reads P3 W1 L1 hides the
  // draw it counted (second bracket walk, 28 September 2026). The column shows
  // on a Swiss table as soon as anybody has drawn.
  const showDraws = !swiss || rows.some(r => Number(r.draws) > 0);
  // What split two sides level on points. The server knows (`decided_by`);
  // a table that did not say so read as wrong to the very person checking it.
  const splitBy = row => (row.decided_by && !['points', 'rank'].includes(row.decided_by)
    ? tt('bracket.splitBy', 'Level on points; {how}')
      .replace('{how}', tt(`tiebreak.${row.decided_by}`, row.decided_by.replace(/_/g, ' ')).toLowerCase())
    : null);
  return (
    <div className={styles.tableScroller}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>#</th>
            <th className={styles.tableName}>{tt('bracket.col.name', 'Name')}</th>
            {!placed && <th title={tt('bracket.col.playedLong', 'Played')}>{tt('bracket.col.played', 'P')}</th>}
            {!placed && <th title={tt('bracket.col.winsLong', 'Won')}>{tt('bracket.col.wins', 'W')}</th>}
            {!placed && showDraws && <th title={tt('bracket.col.drawsLong', 'Drawn')}>{tt('bracket.col.draws', 'D')}</th>}
            {!placed && <th title={tt('bracket.col.lossesLong', 'Lost')}>{tt('bracket.col.losses', 'L')}</th>}
            {!placed && <th title={tt('bracket.col.gdLong', 'Goal difference')}>{tt('bracket.col.gd', 'GD')}</th>}
            {swiss && <th title={tt('bracket.col.buchholzLong', 'Strength of the opponents faced')}>{tt('bracket.col.buchholz', 'Opp')}</th>}
            {!placed && <th title={tt('bracket.col.pointsLong', 'Points')}>{tt('bracket.col.points', 'Pts')}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.registration_id}
                className={goingThrough.has(row.registration_id) || row.status === 'qualified'
                  ? styles.rowThrough : row.status === 'eliminated' ? styles.rowOut : ''}>
              <td>{row.rank ?? '-'}</td>
              <td className={styles.tableName}>
                {row.name}
                {row.handle && row.handle !== row.name && <span className={styles.handle}>@{row.handle}</span>}
                {!placed && splitBy(row) && <span className={styles.handle}>{splitBy(row)}</span>}
              </td>
              {!placed && <td>{row.played}</td>}
              {!placed && <td>{row.wins}</td>}
              {!placed && showDraws && <td>{row.draws}</td>}
              {!placed && <td>{row.losses}</td>}
              {!placed && <td>{row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}</td>}
              {swiss && <td>{row.buchholz}</td>}
              {!placed && <td className={styles.tablePts}>{row.points}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {advancing?.length > 0 && (
        <p className={styles.gridNote}>{tt('bracket.throughNote', 'Highlighted: going through to the next stage as things stand.')}</p>
      )}
    </div>
  );
};

/** Winner stays on: placed by wins, then the longest run of them. */
const StreakTable = ({ rows, tt }) => {
  if (!rows?.length) return null;
  const holder = rows.find(r => r.holder);
  const queue = rows.filter(r => r.queue_position).sort((a, b) => a.queue_position - b.queue_position);
  return <>
    {holder && (
      <p className={styles.gridNote}>
        {tt('bracket.holderNow', '{name} holds the spot.').replace('{name}', holder.name)}
        {queue.length > 0 && ' ' + tt('bracket.queueNow', 'Next in the queue: {names}.')
          .replace('{names}', queue.map(r => r.name).join(', '))}
      </p>
    )}
    <div className={styles.tableScroller}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>#</th>
            <th className={styles.tableName}>{tt('bracket.col.name', 'Name')}</th>
            <th title={tt('bracket.col.winsLong', 'Won')}>{tt('bracket.col.wins', 'W')}</th>
            <th title={tt('bracket.col.lossesLong', 'Lost')}>{tt('bracket.col.losses', 'L')}</th>
            <th title={tt('bracket.col.streakLong', 'Longest winning streak')}>{tt('bracket.col.streak', 'Streak')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.registration_id} className={row.holder ? styles.rowThrough : ''}>
              <td>{row.rank ?? '-'}</td>
              <td className={styles.tableName}>
                {row.name}
                {row.holder && <span className={styles.handle}>{tt('bracket.holder', 'holding the spot')}</span>}
                {row.challenger && <span className={styles.handle}>{tt('bracket.challenger', 'challenging now')}</span>}
                {row.queue_position && <span className={styles.handle}>
                  {tt('bracket.queuedN', 'number {n} in the queue').replace('{n}', row.queue_position)}
                </span>}
              </td>
              <td>{row.wins}</td>
              <td>{row.losses}</td>
              <td className={styles.tablePts}>{row.longest_streak}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </>;
};

/** The matches below first place, one section per range of places. */
const PlacementSections = ({ rounds, tt, onOpen, isMine, format }) => {
  const ranges = new Map();
  for (const round of rounds) {
    for (const match of round.matches || []) {
      const key = (match.places || []).join('-') || 'x';
      if (!ranges.has(key)) ranges.set(key, { places: match.places, rounds: new Map() });
      const bucket = ranges.get(key).rounds;
      if (!bucket.has(round.round)) bucket.set(round.round, { ...round, matches: [] });
      bucket.get(round.round).matches.push(match);
    }
  }
  const ordered = [...ranges.values()].sort((a, b) => (a.places?.[0] || 0) - (b.places?.[0] || 0));
  return ordered.map(range => (
    <div key={(range.places || []).join('-')}>
      <p className={styles.sectionTitle}>
        {range.places
          ? tt(range.places[1] - range.places[0] === 1 ? 'bracket.placesAandB' : 'bracket.placesAtoB',
               range.places[1] - range.places[0] === 1 ? 'Places {a} and {b}' : 'Places {a} to {b}')
            .replace('{a}', range.places[0]).replace('{b}', range.places[1])
          : tt('bracket.placementMatches', 'Placement matches')}
      </p>
      <MapKnockout rounds={[...range.rounds.values()].sort((a, b) => a.round - b.round)} tt={tt}
                   onOpen={onOpen} isMine={isMine} side="placement" format={format} />
    </div>
  ));
};

export default function BracketVisualizer({ tournamentId, token = null, tournamentRef = null,
                                           onChanged = null }) {
  const tt = useT();
  const [data, setData] = useState(null);
  const [stageId, setStageId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState(null);
  const [openFixture, setOpenFixture] = useState(null);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!tournamentId) { setLoading(false); return; }
    if (!quiet) setError('');
    try {
      const query = stageId ? `?stage=${encodeURIComponent(stageId)}` : '';
      const res = await fetch(`${API}/tournament/get-tournament-brackets/${tournamentId}/${query}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setData(body.data);
        setError('');
      } else if (!quiet) {
        setError(apiMessage(tt, body, 'bracket.failed', 'Could not load the fixtures.'));
      }
    } catch {
      if (!quiet) {
        setError(tt('api.NETWORK_UNREACHABLE',
          'Could not reach the server. Check the connection and try again.'));
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, token, stageId]);

  useEffect(() => { load(); }, [load]);
  // Results arrive while people watch. Quiet, so a refresh never flashes the
  // loading state over somebody reading.
  useAutoRefresh(() => load({ quiet: true }));

  const format = data?.bracket_type;
  const table = isTable(format);

  useEffect(() => {
    if (data && view === null) setView(table ? 'grid' : 'map');
  }, [data, view, table]);

  const mineIds = useMemo(() => new Set(data?.you?.registration_ids || []), [data]);
  const isMine = useCallback(match => mineIds.has(match.participant_1?.registration_id)
    || mineIds.has(match.participant_2?.registration_id), [mineIds]);
  const canRecord = Boolean(data?.you?.can_record);

  const rounds = useMemo(() => data?.rounds || [], [data]);
  // A result waiting to be confirmed comes first: it is the one thing a
  // player has to act on now, and it sat behind an unplayed earlier match.
  const myNext = useMemo(() => {
    const mine = rounds.flatMap(round => round.matches || [])
      .filter(m => isMine(m) && OPEN.includes(m.status) && m.participant_1 && m.participant_2);
    return mine.find(m => m.status === 'pending_opponent_confirm') || mine[0] || null;
  }, [rounds, isMine]);

  if (loading) return <p className={styles.state}>{tt('ui.loading', 'Loading…')}</p>;
  if (error) {
    return <div className={styles.state}>
      <p>{error}</p>
      <button type="button" className={styles.retry} onClick={() => { setLoading(true); load(); }}>
        {tt('ui.retry.9f5c', 'Retry')}
      </button>
    </div>;
  }
  if (!data) return null;

  const stages = data.stages || [];
  const battleRoyale = norm(format) === 'battle_royale';
  const streak = norm(format) === 'winner_stays_on';
  const current = view || (table ? 'grid' : 'map');

  // Sections: one per group, or per side of a knockout, in playing order.
  const groups = [...new Set(rounds.map(r => r.group_number).filter(Boolean))];
  const bySide = side => rounds.filter(r => (r.bracket_side || 'winners') === side);
  const hasLosers = bySide('losers').length > 0;
  const standings = data.standings || [];

  const openMatch = match => setOpenFixture(match);
  const roomFor = openFixture && (canRecord || isMine(openFixture))
    && openFixture.participant_1 && openFixture.participant_2;

  const fixtures = list => (current === 'map' || !table
    ? (table
      ? <MapFlat rounds={list} tt={tt} onOpen={openMatch} isMine={isMine} />
      : <MapKnockout rounds={list} tt={tt} onOpen={openMatch} isMine={isMine} side="winners" />)
    : <GridCrosstab rounds={list} tt={tt} onOpen={openMatch} />);

  return (
    <div className={styles.wrap}>
      {stages.length > 1 && (
        <div className={styles.stageChips} role="group"
             aria-label={tt('bracket.stagesLabel', 'Stages of this tournament')}>
          {stages.map(stage => (
            <button key={stage.id} type="button"
                    className={`${styles.stageChip} ${data.stage_id === stage.id ? styles.stageChipOn : ''}`}
                    aria-pressed={data.stage_id === stage.id}
                    onClick={() => { setStageId(stage.id); setView(null); }}>
              <span>{stage.label}</span>
              <span className={styles.stageChipState}>
                {stage.status === 'complete' ? tt('bracket.stageDone', 'Finished')
                  : stage.drawn ? tt('bracket.stageLive', 'Being played')
                    : tt('bracket.stageLater', 'Not drawn yet')}
              </span>
            </button>
          ))}
        </div>
      )}

      {battleRoyale && (
        <BattleRoyaleBoard key={data.stage_id || 'br'} tournamentRef={tournamentRef || tournamentId}
                           stageId={data.stage_id} token={token} />
      )}

      {!battleRoyale && myNext && (
        <button type="button" className={styles.myNext} onClick={() => openMatch(myNext)}>
          <span className={styles.myNextLabel}>{tt('bracket.yourMatch', 'Your match')}</span>
          <span className={styles.myNextVs}>
            {nameOf(myNext.participant_1)} v {nameOf(myNext.participant_2)}
          </span>
          <span className={styles.myNextGo}>
            {myNext.status === 'pending_opponent_confirm'
              ? tt('bracket.yourMatchConfirm', 'A result is waiting. Open it')
              : tt('bracket.yourMatchOpen', 'Check in, find the room, report the result')}
          </span>
        </button>
      )}

      {battleRoyale ? null : rounds.length === 0 ? (
        <p className={styles.state}>
          {stages.length && !stages.find(s => s.id === data.stage_id)?.drawn
            ? tt('bracket.stageNotDrawn', 'This stage is drawn when the one before it finishes.')
            : tt('bracket.empty', 'No fixtures yet. They appear once the organiser generates them.')}
        </p>
      ) : <>
        <div className={styles.head}>
          <div>
            {/* In the reader's language; the server's label is English. */}
            <p className={styles.formatName}>{formatLabel(tt, format, data.format_label || format)}</p>
            <p className={styles.formatHint}>
              {/* How THIS format runs, in the words the wizard used for it: a
                  page playoff carried the knockout sentence (walk, 28 September 2026). */}
              {table
                ? tt('bracket.flatHint', 'Every entrant meets the others. Nobody is knocked out, so the table decides it.')
                : norm(format) === 'stepladder'
                  ? tt('format.stepladderBlurb', 'The lowest seeds play first and each winner climbs to meet the next seed up. The top seed waits in the final.')
                  : norm(format) === 'page_playoff'
                    ? tt('format.pageBlurb', 'Four sides. First plays second for a place in the final; third plays fourth to stay alive; the loser of the first meets the winner of the second for the other place in the final.')
                    : norm(format) === 'winner_stays_on'
                      ? tt('bracket.wsoHint', 'The winner keeps playing the next challenger in the queue until everybody has had a go, or somebody reaches the winning streak the organiser set.')
                      : tt('bracket.knockoutHint', 'The winner of each match moves along the line to the next one.')}
            </p>
          </div>
          {table && !groups.length && (
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
                {tt('bracket.viewGrid', 'Grid')}
              </button>
            </div>
          )}
        </div>

        {groups.length > 0 ? groups.map(g => (
          <section key={g} className={styles.section}>
            <p className={styles.sectionTitle}>{tt('bracket.groupN', 'Group {g}').replace('{g}', groupLetter(g))}</p>
            <StandingsTable rows={standings.filter(r => r.group === g)} format={format}
                            advancing={data.advancing} tt={tt} />
            {norm(format) === 'gsl'
              ? <MapKnockout rounds={rounds.filter(r => r.group_number === g)} tt={tt}
                             onOpen={openMatch} isMine={isMine} side="gsl" />
              : <MapFlat rounds={rounds.filter(r => r.group_number === g)} tt={tt}
                         onOpen={openMatch} isMine={isMine} />}
          </section>
        )) : table ? (
          <>
            <StandingsTable rows={standings} format={format} advancing={data.advancing} tt={tt} />
            {fixtures(rounds)}
          </>
        ) : streak ? (
          <>
            <StreakTable rows={standings} tt={tt} />
            <MapFlat rounds={rounds} tt={tt} onOpen={openMatch} isMine={isMine} format={format} />
          </>
        ) : (
          <>
            {hasLosers && <p className={styles.sectionTitle}>
              {norm(format) === 'page_playoff'
                ? tt('bracket.pageTopPath', 'The top two')
                : tt('bracket.winnersBracket', 'Winners bracket')}
            </p>}
            <MapKnockout rounds={bySide('winners')} tt={tt} onOpen={openMatch} isMine={isMine}
                         side={norm(format) === 'single_elimination' || norm(format) === 'double_elimination' ? 'winners' : 'flat'}
                         format={format} />
            {hasLosers && <>
              <p className={styles.sectionTitle}>
                {norm(format) === 'page_playoff'
                  ? tt('bracket.pageBottomPath', 'The bottom two, and the second chance')
                  : tt('bracket.losersBracket', 'Losers bracket')}
              </p>
              <MapKnockout rounds={bySide('losers')} tt={tt} onOpen={openMatch} isMine={isMine} side="losers" format={format} />
            </>}
            {bySide('placement').length > 0 && (
              <PlacementSections rounds={bySide('placement')} tt={tt} onOpen={openMatch}
                                 isMine={isMine} format={format} />
            )}
            {bySide('grand_final').length > 0 && <>
              <p className={styles.sectionTitle}>{tt('bracket.grandFinal', 'Grand final')}</p>
              <MapKnockout rounds={bySide('grand_final')} tt={tt} onOpen={openMatch} isMine={isMine} side="grand_final" />
            </>}
            {standings.some(r => r.rank) && (<>
              <p className={styles.sectionTitle}>{tt('bracket.finalPlaces', 'Final places')}</p>
              <StandingsTable rows={standings.filter(r => r.rank)} format={format} tt={tt} />
            </>)}
          </>
        )}
      </>}

      {openFixture && (roomFor
        ? <MatchRoom matchId={openFixture.match_id} tournamentRef={tournamentRef || tournamentId}
                     token={token} canRecord={canRecord}
                     onClose={() => setOpenFixture(null)}
                     onChanged={() => { load({ quiet: true }); if (onChanged) onChanged(); }} />
        : <FixtureDetail match={openFixture} onClose={() => setOpenFixture(null)} />)}
    </div>
  );
}
