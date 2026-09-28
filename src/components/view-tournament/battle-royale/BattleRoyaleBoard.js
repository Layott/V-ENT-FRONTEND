'use client';

// A battle royale, as everybody reads it: the table, the MVP, and each
// lobby's matches with every squad's finish.
//
// Public, like every bracket: somebody deciding whether to enter wants to see
// how it is going. A squad seated in a lobby also sees that lobby's room ID
// and password, which the server sends only to them and to staff; nobody
// else is sent them at all.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { useAutoRefresh } from '@/lib/useLiveData';
import { formatNumber, formatWithZone } from '@/lib/datetime';
import { plural } from '@/lib/plural';
import BRStandings, { StageMvp, goingThrough, lobbyLabel } from '@/components/tournament-manage/br/BRStandings';
import { matchLabel } from '@/components/tournament-manage/br/BattleRoyaleConsole';
import styles from '@/components/tournament-manage/br/br.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

const scoringLine = (tt, s) => {
  if (!s) return '';
  const table = s.placement_preset === 'pubg_mobile'
    ? tt('br.presetPubg', 'PUBG Mobile (10 down to 1 for eighth)')
    : s.placement_preset === 'custom'
      ? tt('br.customTable', 'the organiser’s own placement table')
      : tt('br.presetFreeFire', 'Free Fire (12 down to 1 for tenth)');
  return tt('br.scoringLine', 'Lobbies of up to {size} squads, {maps} matches each. Placement points: {table}. {kill} a kill.')
    .replace('{size}', s.lobby_size).replace('{maps}', s.maps).replace('{table}', table)
    .replace('{kill}', s.per_kill);
};

export default function BattleRoyaleBoard({ tournamentRef, stageId = null, token = null }) {
  const tt = useT();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lobbyNo, setLobbyNo] = useState(null);
  const [openMatch, setOpenMatch] = useState(null);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!tournamentRef) { setLoading(false); return; }
    try {
      const query = stageId ? `?stage=${encodeURIComponent(stageId)}` : '';
      const res = await fetch(`${API}/tournament/${tournamentRef}/br/${query}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setData(body.data);
        setError('');
      } else if (!quiet) {
        setError(apiMessage(tt, body, 'br.loadFailed', 'Could not load the battle royale.'));
      }
    } catch {
      if (!quiet) {
        setError(tt('api.NETWORK_UNREACHABLE', 'Could not reach the server. Check the connection and try again.'));
      }
    } finally {
      setLoading(false);
    }
  }, [tournamentRef, stageId, token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);
  useAutoRefresh(() => load({ quiet: true }));

  const current = data?.current || null;
  const through = useMemo(() => goingThrough(current), [current]);
  const lobbies = current?.lobbies || [];
  // A squad's own lobby first, when the reader plays in one.
  const mine = lobbies.find(l => l.seated_here);
  const lobby = lobbies.find(l => l.number === lobbyNo) || mine || lobbies[0] || null;
  const mineIds = useMemo(() => new Set(current?.my_registration_ids || []), [current]);

  if (loading) return <p className={styles.state}>{tt('ui.loading', 'Loading…')}</p>;
  if (error) {
    return <div className={styles.state}>
      <p>{error}</p>
      <button type="button" className={styles.ghost} onClick={() => { setLoading(true); load(); }}>
        {tt('ui.retry.9f5c', 'Retry')}
      </button>
    </div>;
  }
  if (!current) {
    return (
      <div>
        <p className={styles.state}>{tt('br.notDrawnYet', 'The lobbies have not been drawn yet.')}</p>
        {data?.settings && <p className={styles.note}>{scoringLine(tt, data.settings)}</p>}
      </div>
    );
  }
  if (!current.drawn) {
    return (
      <div>
        <p className={styles.state}>{tt('br.notDrawnYet', 'The lobbies have not been drawn yet.')}</p>
        <p className={styles.note}>{scoringLine(tt, current.settings)}</p>
      </div>
    );
  }

  return (
    <div>
      <p className={styles.note}>{scoringLine(tt, current.settings)}</p>
      {current.settings.match_point > 0 && (
        <p className={styles.note}>
          {tt('br.matchPointLine', 'Match point is {n}: a squad at or over it that wins a match takes its lobby.')
            .replace('{n}', current.settings.match_point)}
        </p>
      )}

      <StageMvp mvp={current.mvp} />

      <p className={styles.sectionTitle}>
        {lobbies.length > 1 ? tt('br.overall', 'Every squad') : tt('br.table', 'Standings')}
      </p>
      <BRStandings rows={current.standings} through={through} lobbies={lobbies.length} mineIds={mineIds}
                   closed={current.stage?.status === 'complete'} />

      {lobbies.length > 1 && (
        <div className={styles.lobbyChips} role="group" aria-label={tt('br.lobbiesHead', 'Lobbies')}>
          {lobbies.map(l => (
            <button key={l.id} type="button"
                    className={`${styles.lobbyChip} ${lobby?.id === l.id ? styles.lobbyChipOn : ''}`}
                    aria-pressed={lobby?.id === l.id}
                    onClick={() => { setLobbyNo(l.number); setOpenMatch(null); }}>
              {lobbyLabel(tt, l)}
              <span className={styles.lobbyChipState}>
                {l.seated_here ? tt('br.yourLobby', 'Your lobby')
                  : tt('br.squadsN', '{n} squads').replace('{n}', l.seats.length)}
              </span>
            </button>
          ))}
        </div>
      )}

      {lobby && (
        <div className={styles.lobby}>
          <div className={styles.lobbyHead}>
            <h3 className={styles.lobbyName}>
              {lobbyLabel(tt, lobby)}
            </h3>
            {lobby.seated_here && <span className={styles.statusEntered}>{tt('br.yourLobby', 'Your lobby')}</span>}
          </div>
          <ul className={styles.seats}>
            {lobby.seats.map(seat => (
              <li key={seat.registration_id} className={styles.seat}>
                <span className={styles.seatName}>{seat.name}</span>
                {seat.carried_points > 0 && <span className={styles.carry}>+{seat.carried_points}</span>}
              </li>
            ))}
          </ul>

          <ul className={styles.matches}>
            {lobby.maps.map(match => {
              const isOpen = openMatch === match.id;
              return (
                <li key={match.id} className={styles.match}>
                  <div className={styles.matchTop}>
                    <span className={styles.matchName}>{matchLabel(tt, match.number)}</span>
                    {match.map_name && <span className={styles.matchMeta}>{match.map_name}</span>}
                    {match.scheduled_at && <span className={styles.matchMeta}>{formatWithZone(match.scheduled_at)}</span>}
                    <span className={match.status === 'entered' ? styles.statusEntered : styles.statusPending}>
                      {match.status === 'entered' ? tt('br.entered', 'Results in') : tt('br.toPlay', 'To play')}
                    </span>
                    {match.status === 'entered' && (
                      <span className={styles.matchActions}>
                        <button type="button" className={styles.matchBtn} aria-expanded={isOpen}
                                onClick={() => setOpenMatch(isOpen ? null : match.id)}>
                          {isOpen ? tt('br.hideResults', 'Hide results') : tt('br.showResults', 'Show results')}
                        </button>
                      </span>
                    )}
                  </div>
                  {(match.room_code || match.room_password) && (
                    <div className={styles.room}>
                      {match.room_code && <span>{tt('br.roomCode', 'Room ID')}: <span className={styles.roomValue}>{match.room_code}</span></span>}
                      {match.room_password && <span>{tt('br.roomPassword', 'Room password')}: <span className={styles.roomValue}>{match.room_password}</span></span>}
                    </div>
                  )}
                  {isOpen && (
                    <div className={styles.tableScroller}>
                      <table className={styles.table} style={{ minWidth: '22rem' }}>
                        <caption className={styles.srOnly}>
                          {tt('br.resultsOf', 'Results of {match}').replace('{match}', matchLabel(tt, match.number))}
                        </caption>
                        <thead>
                          <tr>
                            <th>{tt('br.placement', 'Place')}</th>
                            <th className={styles.tableName}>{tt('br.col.squad', 'Squad')}</th>
                            <th>{tt('br.kills', 'Kills')}</th>
                            <th>{tt('br.col.total', 'Total')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {match.results.map(r => (
                            <tr key={r.registration_id}>
                              <td>{r.played ? r.placement : '-'}</td>
                              <td className={styles.tableName}>
                                {r.name}
                                {!r.played && <span className={styles.small}>{tt('br.didNotPlay', 'Did not play')}</span>}
                                {r.adjustment_note && <span className={styles.small}>{r.adjustment_note}</span>}
                              </td>
                              <td>{r.kills}</td>
                              <td className={styles.tablePts}>{r.total}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {match.mvp && (
                        <p className={styles.note}>
                          {tt('br.matchMvpLine', 'Match MVP: {name}, {kills}')
                            .replace('{name}', match.mvp.username ? `@${match.mvp.username}` : match.mvp.name)
                            .replace('{kills}', plural(tt, match.mvp.kills, 'br.killCountOne', '{n} kill',
                              'br.killCount', '{n} kills', formatNumber(match.mvp.kills)))}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {lobbies.length > 1 && <>
            <p className={styles.sectionTitle}>{tt('br.lobbyTable', 'This lobby')}</p>
            <BRStandings rows={lobby.standings} byLobby through={through} closed={current.stage?.status === 'complete'} />
          </>}
        </div>
      )}
    </div>
  );
}
