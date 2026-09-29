'use client';

// The Stats tab: who leads, every entrant's record, and head to head.
//
// CEO, 28 September 2026 (inbox 306): "stats like h2h, most kills, most wins and
// other possibilities depending on the game and what info in results was
// inputted". Every number is the server's, derived from the results
// (vent_tournament/stats.py); nothing here counts anything. Which boards appear
// is also the server's: a football tournament has goals and clean sheets, a
// battle royale has kills and first places, and a board with nothing behind it
// is never sent, so this panel never names a leader of nothing.
//
// Public, like the tournament page. Shape and surfaces follow the Players tab
// beside it, deliberately: two result screens on one tournament that look
// different are two things a reader has to learn.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { formatNumber } from '@/lib/datetime';
import { metricLabel } from '@/lib/metricLabel';
import { apiMessage } from '@/lib/apiMessage';
import { plural } from '@/lib/plural';
import { useAutoRefresh } from '@/lib/useLiveData';
import UserChip from '@/components/user-chip/UserChip';
import styles from './stats.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

// One sentence per board, in the reader's language. `goals` changes the wording
// where a football reader expects "goals" and anybody else "score".
function boardTitle(tt, board, unit) {
  const goals = unit === 'goals';
  switch (board.key) {
    case 'wins': return tt('stats.wins', 'Most wins');
    case 'win_rate': return tt('stats.winRate', 'Best win rate');
    case 'longest_win_streak': return tt('stats.streak', 'Longest winning run');
    case 'scored': return goals ? tt('stats.goalsScored', 'Most goals scored') : tt('stats.scored', 'Highest score for');
    case 'conceded_per_match': return goals
      ? tt('stats.goalsConceded', 'Fewest goals conceded per match')
      : tt('stats.conceded', 'Fewest conceded per match');
    case 'clean_sheets': return tt('stats.cleanSheets', 'Most clean sheets');
    case 'games_won': return tt('stats.gamesWon', 'Most games won');
    case 'tie_wins': return tt('stats.tieWins', 'Most games won in ties');
    case 'tie_goals': return tt('stats.tieGoals', 'Most goals in ties');
    case 'br_first_places': return tt('stats.brFirst', 'Most first places');
    case 'br_team_kills': return tt('stats.brTeamKills', 'Most kills by a team');
    case 'br_average_placement': return tt('stats.brAverage', 'Best average finish');
    case 'br_kills': return tt('stats.brKills', 'Most kills');
    case 'br_damage': return tt('stats.brDamage', 'Most damage');
    case 'br_assists': return tt('stats.brAssists', 'Most assists');
    case 'br_mvps': return tt('stats.brMvps', 'Most match MVPs');
    default:
      if (board.key.startsWith('metric:') && board.metric) {
        const name = metricLabel(tt, board.metric);
        return board.metric.higher_is_better
          ? tt('stats.mostOf', 'Most: {metric}').replace('{metric}', name)
          : tt('stats.fewestOf', 'Fewest: {metric}').replace('{metric}', name);
      }
      return board.key;
  }
}

function boardValue(board, value) {
  if (board.key === 'win_rate') return `${formatNumber(value)}%`;
  if (board.key === 'conceded_per_match') return formatNumber(value, { maximumFractionDigits: 2 });
  if (board.key === 'br_average_placement') return formatNumber(value, { maximumFractionDigits: 1 });
  return formatNumber(value);
}

// An entrant is a person, a team or a squad; the server says which and gives
// the name and, for a person, the @handle beside it.
function Entrant({ entrant, big }) {
  if (!entrant) return null;
  return (
    <span className={big ? styles.entrantBig : styles.entrant}>
      {entrant.name}
      {entrant.handle && entrant.handle !== entrant.name && <span className={styles.handle}> @{entrant.handle}</span>}
    </span>
  );
}

function Who({ row, big }) {
  if (row.entrant) return <Entrant entrant={row.entrant} big={big} />;
  if (row.person) return <UserChip user={row.person} size={big ? 32 : 22} nameClassName={big ? styles.entrantBig : styles.entrant} />;
  return <span className={big ? styles.entrantBig : styles.entrant}>{row.name}</span>;
}

const SHOWN = 5;

function Board({ board, unit, tt }) {
  const [first, ...others] = board.rows;
  // Ties share a place, so a board can hold more names than places. Five names
  // are shown and the rest are counted, rather than a list that runs on
  // (walk, 29 September 2026: four level on 5th made a board of eight).
  const rest = others.slice(0, SHOWN - 1);
  const hidden = others.slice(SHOWN - 1);
  const level = board.rows.filter(r => r.place === 1).length;
  return (
    <section className={styles.board} aria-label={boardTitle(tt, board, unit)}>
      <h3 className={styles.boardTitle}>{boardTitle(tt, board, unit)}</h3>
      <div className={styles.leader}>
        <Who row={first} big />
        <span className={styles.leaderValue}>{boardValue(board, first.value)}</span>
        {level > 1 && <span className={styles.level}>
          {tt('stats.levelAtTop', '{n} level at the top').replace('{n}', String(level))}
        </span>}
      </div>
      {rest.length > 0 && <ol className={styles.rest}>
        {rest.map((r, i) => (
          <li key={i} className={styles.restRow}>
            <span className={styles.place}>{r.place}</span>
            <Who row={r} />
            <span className={styles.restValue}>{boardValue(board, r.value)}</span>
          </li>
        ))}
      </ol>}
      {hidden.length > 0 && <p className={styles.more}>
        {plural(tt, hidden.length,
          'stats.moreLevelOne', 'and {n} more on {value}',
          'stats.moreLevel', 'and {n} more on {value}', formatNumber(hidden.length))
          .replace('{value}', boardValue(board, hidden[hidden.length - 1].value))}
      </p>}
    </section>
  );
}

function HeadToHead({ tournamentId, field, suggested, tt }) {
  // The whole field, not only those with a head-to-head result: in a battle
  // royale nobody has one, and the comparison is who finished ahead.
  const options = useMemo(() => (field || []).filter(Boolean), [field]);
  // Opens on two who have actually met, as the server picks them (the latest
  // result), rather than on whoever registered first (walk, 29 September 2026:
  // it opened on a pair that never played).
  const start = suggested || [];
  const [a, setA] = useState(start[0] || options[0]?.registration_id || '');
  const [b, setB] = useState(start[1] || options[1]?.registration_id || '');
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  const compare = useCallback(async () => {
    if (!a || !b) return;
    setBusy(true);
    setProblem('');
    try {
      const res = await fetch(`${API}/tournament/${tournamentId}/stats/head-to-head/?a=${a}&b=${b}`);
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') setData(body.data);
      else { setData(null); setProblem(apiMessage(tt, body, 'stats.h2hFailed', 'Could not compare those two.')); }
    } catch {
      setProblem(tt('api.NETWORK_UNREACHABLE', 'Could not reach the server. Check the connection and try again.'));
    } finally {
      setBusy(false);
    }
  }, [a, b, tournamentId, tt]);

  useEffect(() => { if (a && b && a !== b) compare(); }, [a, b]); // eslint-disable-line react-hooks/exhaustive-deps

  if (options.length < 2) return null;
  const nameOf = id => options.find(o => String(o.registration_id) === String(id))?.name || '';
  const s = data?.summary;
  const br = data?.battle_royale;
  return (
    <section className={styles.h2h}>
      <h2 className={styles.sectionTitle}>{tt('stats.h2hTitle', 'Head to head')}</h2>
      <div className={styles.pickers}>
        <label className={styles.picker}>
          <span className={styles.pickerLabel}>{tt('stats.h2hFirst', 'First')}</span>
          <select value={a} onChange={e => setA(e.target.value)} className={styles.select}>
            {options.map(o => <option key={o.registration_id} value={o.registration_id}>{o.name}</option>)}
          </select>
        </label>
        <label className={styles.picker}>
          <span className={styles.pickerLabel}>{tt('stats.h2hSecond', 'Second')}</span>
          <select value={b} onChange={e => setB(e.target.value)} className={styles.select}>
            {options.map(o => <option key={o.registration_id} value={o.registration_id}>{o.name}</option>)}
          </select>
        </label>
      </div>
      {String(a) === String(b) && <p className={styles.state}>{tt('stats.h2hSame', 'Pick two different entrants.')}</p>}
      {problem && <p className={styles.problem} role="alert">{problem}</p>}
      {busy && !data && <p className={styles.state}>{tt('ui.loading', 'Loading...')}</p>}
      {data && String(a) !== String(b) && <>
        {s.played === 0 && !br && <p className={styles.state}>
          {tt('stats.h2hNever', '{a} and {b} have not met in this tournament yet.')
            .replace('{a}', nameOf(a)).replace('{b}', nameOf(b))}
        </p>}
        {s.played > 0 && <div className={styles.h2hScore}>
          <div className={styles.h2hSide}>
            <span className={styles.h2hName}>{nameOf(a)}</span>
            <span className={styles.h2hBig}>{formatNumber(s.first_wins)}</span>
          </div>
          <div className={styles.h2hMiddle}>
            <span className={styles.h2hDraws}>
              {plural(tt, s.played, 'stats.h2hMetOne', '{n} meeting', 'stats.h2hMet', '{n} meetings', formatNumber(s.played))}
              {s.draws > 0 && `, ${plural(tt, s.draws, 'stats.h2hDrawOne', '{n} draw', 'stats.h2hDraw', '{n} draws', formatNumber(s.draws))}`}
            </span>
            <span className={styles.h2hDraws}>
              {tt('stats.h2hScored', 'Scored {a} to {b}').replace('{a}', formatNumber(s.first_scored)).replace('{b}', formatNumber(s.second_scored))}
            </span>
          </div>
          <div className={`${styles.h2hSide} ${styles.h2hRight}`}>
            <span className={styles.h2hName}>{nameOf(b)}</span>
            <span className={styles.h2hBig}>{formatNumber(s.second_wins)}</span>
          </div>
        </div>}
        {data.meetings?.length > 0 && <ol className={styles.meetings}>
          {data.meetings.map(m => (
            <li key={m.match_id} className={styles.meeting}>
              <span className={styles.meetingRound}>
                {m.is_final ? tt('stats.final', 'Final') : tt('stats.roundN', 'Round {n}').replace('{n}', String(m.round_number))}
              </span>
              <span className={styles.meetingScore}>
                {m.walkover
                  ? (m.result === 'first'
                    ? tt('stats.walkoverTo', 'Walkover to {name}').replace('{name}', nameOf(a))
                    : tt('stats.walkoverTo', 'Walkover to {name}').replace('{name}', nameOf(b)))
                  : `${formatNumber(m.first_score)} - ${formatNumber(m.second_score)}`}
                {m.penalties && <span className={styles.pens}>
                  {' '}{tt('stats.onPens', '({a} - {b} on penalties)').replace('{a}', String(m.penalties[0])).replace('{b}', String(m.penalties[1]))}
                </span>}
              </span>
            </li>
          ))}
        </ol>}
        {br && <p className={styles.state}>
          {plural(tt, br.maps, 'stats.h2hBrMapsOne', 'Battle royale matches played together: {n}.',
            'stats.h2hBrMaps', 'Battle royale matches played together: {n}.', formatNumber(br.maps))}
          {' '}
          {tt('stats.h2hBrAhead', 'Finished ahead: {a} {x}, {b} {y}. Kills: {ka} to {kb}.')
            .replace('{a}', nameOf(a)).replace('{x}', formatNumber(br.first_ahead))
            .replace('{b}', nameOf(b)).replace('{y}', formatNumber(br.second_ahead))
            .replace('{ka}', formatNumber(br.first_kills)).replace('{kb}', formatNumber(br.second_kills))}
        </p>}
      </>}
    </section>
  );
}

export default function StatsPanel({ tournamentId }) {
  const tt = useT();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!tournamentId) { setLoading(false); return; }
    try {
      const res = await fetch(`${API}/tournament/${tournamentId}/stats/`);
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') { setData(body.data); setError(''); }
      else if (!quiet) setError(apiMessage(tt, body, 'stats.failed', 'Could not load the stats.'));
    } catch {
      if (!quiet) setError(tt('api.NETWORK_UNREACHABLE', 'Could not reach the server. Check the connection and try again.'));
    } finally {
      setLoading(false);
    }
  }, [tournamentId, tt]);

  useEffect(() => { load(); }, [load]);
  // Current without a reload, as every result screen on this page is.
  useAutoRefresh(() => load({ quiet: true }));

  if (loading) return <p className={styles.state}>{tt('ui.loading', 'Loading...')}</p>;
  if (error) return <div className={styles.wrap}>
    <p className={styles.problem} role="alert">{error}</p>
    <button type="button" className={styles.retry} onClick={() => { setLoading(true); load(); }}>
      {tt('stats.retry', 'Try again')}
    </button>
  </div>;
  if (!data || !data.has_results) {
    return <p className={styles.state}>
      {tt('stats.none', 'Stats appear here once the first result is in: wins, the leaders on what this game records, and head to head.')}
    </p>;
  }

  const unit = data.score_unit;
  const entrants = data.entrants || [];
  const rec = data.records || {};
  const recLine = (r, key, fallback) => r && tt(key, fallback)
    .replace('{a}', r.participant_1?.name || '').replace('{b}', r.participant_2?.name || '')
    .replace('{score}', `${formatNumber(r.score_p1)} - ${formatNumber(r.score_p2)}`)
    .replace('{n}', String(r.round_number));

  return (
    <div className={styles.wrap}>
      <p className={styles.intro}>
        {plural(tt, data.matches_counted + (data.maps_played || 0),
          'stats.introOne', 'Worked out from the one result entered so far. Nothing here is typed in by hand.',
          'stats.intro', 'Worked out from {n} results entered so far. Nothing here is typed in by hand.',
          formatNumber(data.matches_counted + (data.maps_played || 0)))}
      </p>

      {data.boards.length > 0 && <>
        <h2 className={styles.sectionTitle}>{tt('stats.leaders', 'Leaders')}</h2>
        <div className={styles.boards}>
          {data.boards.map(b => <Board key={b.key} board={b} unit={unit} tt={tt} />)}
        </div>
        {data.minimum_for_rates > 1 && <p className={styles.note}>
          {tt('stats.rateNote', 'Rates count only entrants with at least {n} matches, so one win from one match does not lead.')
            .replace('{n}', String(data.minimum_for_rates))}
        </p>}
      </>}

      {(rec.biggest_win || rec.highest_scoring) && <section className={styles.records}>
        <h2 className={styles.sectionTitle}>{tt('stats.records', 'Records')}</h2>
        {rec.biggest_win && <p className={styles.record}>
          <span className={styles.recordLabel}>{tt('stats.biggestWin', 'Biggest win')}</span>
          {recLine(rec.biggest_win, 'stats.recordLine', '{a} {score} {b}, round {n}')}
        </p>}
        {rec.highest_scoring && <p className={styles.record}>
          <span className={styles.recordLabel}>{tt('stats.highestScoring', 'Highest scoring match')}</span>
          {recLine(rec.highest_scoring, 'stats.recordLine', '{a} {score} {b}, round {n}')}
        </p>}
      </section>}

      <HeadToHead tournamentId={tournamentId} field={data.field} suggested={data.suggested_pair} tt={tt} />

      {entrants.length > 0 && <section>
        <h2 className={styles.sectionTitle}>{tt('stats.everyEntrant', 'Every entrant')}</h2>
        <div className={styles.scroller}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.nameCol}>{tt('stats.entrant', 'Entrant')}</th>
                <th title={tt('stats.playedLong', 'Played')}>{tt('stats.playedShort', 'P')}</th>
                <th title={tt('stats.wonLong', 'Won')}>{tt('stats.wonShort', 'W')}</th>
                <th title={tt('stats.drawnLong', 'Drawn')}>{tt('stats.drawnShort', 'D')}</th>
                <th title={tt('stats.lostLong', 'Lost')}>{tt('stats.lostShort', 'L')}</th>
                <th>{unit === 'goals' ? tt('stats.goalsFor', 'Goals for') : tt('stats.for', 'For')}</th>
                <th>{unit === 'goals' ? tt('stats.goalsAgainst', 'Goals against') : tt('stats.against', 'Against')}</th>
                <th>{tt('stats.winPct', 'Win %')}</th>
                <th>{tt('stats.bestRun', 'Best run')}</th>
                <th className={styles.formCol}>{tt('stats.form', 'Last five')}</th>
              </tr>
            </thead>
            <tbody>
              {entrants.map(r => (
                <tr key={r.entrant?.registration_id}>
                  <td className={styles.nameCol}><Entrant entrant={r.entrant} /></td>
                  <td>{formatNumber(r.played)}</td>
                  <td>{formatNumber(r.wins)}</td>
                  <td>{formatNumber(r.draws)}</td>
                  <td>{formatNumber(r.losses)}</td>
                  <td>{formatNumber(r.scored)}</td>
                  <td>{formatNumber(r.conceded)}</td>
                  <td>{`${formatNumber(r.win_rate)}%`}</td>
                  <td>{formatNumber(r.longest_win_streak)}</td>
                  <td className={styles.formCol}>
                    {/* The letters are said in words to a screen reader. */}
                    <span className={styles.form} aria-label={r.form.map(f => f === 'W' ? tt('stats.wonLong', 'Won') : f === 'D' ? tt('stats.drawnLong', 'Drawn') : tt('stats.lostLong', 'Lost')).join(', ')}>
                      {r.form.map((f, i) => <span key={i} className={f === 'W' ? styles.fw : f === 'D' ? styles.fd : styles.fl}>
                        {f === 'W' ? tt('stats.wonShort', 'W') : f === 'D' ? tt('stats.drawnShort', 'D') : tt('stats.lostShort', 'L')}
                      </span>)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>}
    </div>
  );
}
