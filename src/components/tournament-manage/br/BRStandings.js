'use client';

// A battle royale table, the same on the console and the public page.
//
// Every number is the server's (`br_engine.standings`): total first, then the
// organiser's tiebreakers in order, and each row says which one separated it
// from the row above, because "why are we fourth on the same points" is the
// question every squad asks.

import { useT } from '@/i18n/LanguageProvider';
import { formatNumber } from '@/lib/datetime';
import { plural } from '@/lib/plural';
import UserChip from '@/components/user-chip/UserChip';
import { TIEBREAK_WORDS } from './BRSettingsFields';
import styles from './br.module.css';

/**
 * The stage MVP, the same line on the console and the public page. It read
 * "1 match MVPs" on both (walk, 28 September 2026) because the sentence was
 * written once with the plural baked in and copied.
 */
export function StageMvp({ mvp }) {
  const tt = useT();
  if (!mvp) return null;
  const stats = [
    plural(tt, mvp.match_mvps, 'br.mvpMatchesOne', '{n} match MVP', 'br.mvpMatches', '{n} match MVPs',
      formatNumber(mvp.match_mvps)),
    plural(tt, mvp.kills, 'br.killCountOne', '{n} kill', 'br.killCount', '{n} kills', formatNumber(mvp.kills)),
    tt('br.damageCount', '{n} damage').replace('{n}', formatNumber(mvp.damage)),
  ].join(', ');
  return (
    <div className={styles.mvp}>
      <span className={styles.mvpLabel}>{tt('br.stageMvp', 'Stage MVP')}</span>
      {mvp.user
        ? <UserChip user={mvp.user} size={28} nameClassName={styles.mvpName} />
        : <span className={styles.mvpName}>{mvp.name}</span>}
      <span className={styles.mvpStats}>{stats}</span>
    </div>
  );
}

// A lobby's name as everybody reads it: the organiser's name for it, or
// "Lobby 2". One place, because six screens wrote it by hand and the table
// column forgot the word and printed a bare 2 (walk, 28 September 2026).
export const lobbyLabel = (tt, lobby) => (lobby?.name
  || tt('br.lobbyN', 'Lobby {n}').replace('{n}', lobby?.number ?? ''));

const split = (tt, row) => {
  if (!row.decided_by || ['points', 'seed', 'name'].includes(row.decided_by)) return null;
  if (row.decided_by === 'match_point') {
    return tt('br.splitMatchPoint', 'Below the squad that won on match point');
  }
  return tt('bracket.splitBy', 'Level on points; {how}')
    .replace('{how}', tt(`tiebreak.${row.decided_by}`,
      TIEBREAK_WORDS[row.decided_by] || row.decided_by.replace(/_/g, ' ')).toLowerCase());
};

/**
 * @param rows      standings rows
 * @param through   Set of registration ids going through, as things stand
 * @param byLobby   show each row's rank inside its lobby rather than overall
 * @param lobbies   how many lobbies the stage has (the lobby column is shown
 *                  only when there is more than one)
 */
export default function BRStandings({ rows, through = new Set(), byLobby = false, lobbies = 1,
                                      mineIds = new Set(), closed = false }) {
  const tt = useT();
  if (!rows?.length) {
    return <p className={styles.state}>{tt('br.noTable', 'The table fills in as results are entered.')}</p>;
  }
  const n = v => formatNumber(v ?? 0);
  return (
    <div className={styles.tableScroller}>
      <table className={styles.table}>
        <caption className={styles.srOnly}>{tt('br.tableCaption', 'Battle royale standings')}</caption>
        <thead>
          <tr>
            <th>#</th>
            <th className={styles.tableName}>{tt('br.col.squad', 'Squad')}</th>
            {!byLobby && lobbies > 1 && <th>{tt('br.col.lobby', 'Lobby')}</th>}
            <th title={tt('br.col.playedLong', 'Matches played')}>{tt('br.col.played', 'M')}</th>
            <th title={tt('br.col.booyahsLong', 'First places')}>{tt('br.col.booyahs', '1st')}</th>
            <th title={tt('br.col.killsLong', 'Kills')}>{tt('br.col.kills', 'Kills')}</th>
            <th title={tt('br.col.placementLong', 'Points from placements')}>{tt('br.col.placement', 'Place pts')}</th>
            <th title={tt('br.col.killPointsLong', 'Points from kills')}>{tt('br.col.killPoints', 'Kill pts')}</th>
            <th title={tt('br.col.totalLong', 'Total points')}>{tt('br.col.total', 'Total')}</th>
            <th title={tt('br.col.mvpLong', 'Match MVPs')}>{tt('br.col.mvp', 'MVP')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const rank = byLobby ? row.lobby_rank : row.rank;
            const extra = [];
            if (row.carried) {
              extra.push(tt('br.carriedN', 'Started with {n}').replace('{n}', n(row.carried)));
            }
            if (row.bonus) extra.push(tt('br.bonusN', 'Bonus {n}').replace('{n}', n(row.bonus)));
            if (row.penalty) extra.push(tt('br.penaltyN', 'Penalty {n}').replace('{n}', n(row.penalty)));
            const why = split(tt, row);
            return (
              <tr key={row.registration_id}
                  className={row.champion ? styles.rowChampion
                    : through.has(row.registration_id) ? styles.rowThrough : ''}>
                <td>{rank ?? '-'}</td>
                <td className={styles.tableName}>
                  {row.name}
                  {mineIds.has(row.registration_id) && ` (${tt('br.you', 'you')})`}
                  {row.handle && row.handle !== row.name && <span className={styles.small}>@{row.handle}</span>}
                  {row.champion && <span className={styles.small}>{tt('br.champion', 'Won on match point')}</span>}
                  {why && <span className={styles.small}>{why}</span>}
                  {extra.length > 0 && <span className={styles.small}>{extra.join(', ')}</span>}
                </td>
                {!byLobby && lobbies > 1 && <td>{lobbyLabel(tt, { name: row.lobby_name, number: row.lobby })}</td>}
                <td>{row.maps_played}</td>
                <td>{row.booyahs}</td>
                <td>{row.kills}</td>
                <td>{n(row.placement_points)}</td>
                <td>{n(row.kill_points)}</td>
                <td className={styles.tablePts}>{n(row.points)}</td>
                <td>{row.mvp_count}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {through.size > 0 && (
        <p className={styles.note}>
          {closed
            ? tt('bracket.throughNoteClosed', 'Highlighted: went through to the next stage.')
            : tt('bracket.throughNote', 'Highlighted: going through to the next stage as things stand.')}
        </p>
      )}
    </div>
  );
}

/**
 * Who goes through: as things stand while the stage is played, and once it is
 * closed, who actually went (the organiser may have moved somebody at the
 * close, and the table must not claim a squad that was not sent).
 */
export const goingThrough = (data) => {
  const out = new Set();
  if (data?.stage?.status === 'complete' && Array.isArray(data?.stage?.advanced)) {
    data.stage.advanced.forEach(row => out.add(Number(row.registration_id)));
    return out;
  }
  const count = data?.stage?.advances || 0;
  if (!count || data?.is_last_stage) return out;
  const rows = data?.standings || [];
  if (data?.settings?.advance_by === 'lobby') {
    rows.filter(r => (r.lobby_rank || 99) <= count).forEach(r => out.add(r.registration_id));
  } else {
    rows.slice(0, count).forEach(r => out.add(r.registration_id));
  }
  return out;
};
