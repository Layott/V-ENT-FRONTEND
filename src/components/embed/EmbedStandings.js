'use client';
/**
 * A tournament's standings on somebody else's website (P8).
 *
 * The same tables the tournament page shows, ranked by the server's one
 * ranking function, never re-sorted here:
 *
 *   a league         both tables (StandingsPanel), as on the Table tab
 *   a battle royale  the points board (BattleRoyaleBoard)
 *   anything else    the current stage's table from the bracket payload,
 *                    per group, drawn by the bracket's own StandingsTable; a
 *                    knockout's table is its final places
 *
 * Public, read without an account, current through useLiveData (half a
 * minute, slowing to two when nothing moves).
 */
import { useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import useLiveData from '@/lib/useLiveData';
import { formatKey } from '@/lib/formatLabel';
import { isLeagueFormat } from '@/components/create-tournament-component/format-participants/league-setup/LeagueSetup';
import StandingsPanel from '@/components/view-tournament/standings/StandingsPanel';
import BattleRoyaleBoard from '@/components/view-tournament/battle-royale/BattleRoyaleBoard';
import { StandingsTable } from '@/components/view-tournament/bracket-visualizer/BracketVisualizer';
import styles from './embed.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

/** Formats whose table is the final places the matches decided. */
const PLACED = ['single_elimination', 'double_elimination', 'gsl', 'stepladder', 'page_playoff'];

function StageStandings({ tournamentId, slug }) {
  const tt = useT();
  const [stageId, setStageId] = useState(null);
  const { data, loading, error, refresh } = useLiveData(async ({ signal }) => {
    const query = stageId ? `?stage=${encodeURIComponent(stageId)}` : '';
    const res = await fetch(`${API}/tournament/get-tournament-brackets/${tournamentId}/${query}`, { signal });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.status !== 'success') throw body;
    return body.data;
  }, [tournamentId, stageId], { interval: 30000, maxInterval: 120000 });

  if (loading && !data) return <p className={styles.note} aria-busy="true">{tt('ui.loading', 'Loading…')}</p>;
  if (error && !data) {
    return (
      <div className={styles.stateBlock}>
        <p className={styles.note}>{error}</p>
        <button type="button" className={styles.chip} onClick={refresh}>{tt('embed.tryAgain', 'Try again')}</button>
      </div>
    );
  }
  if (!data) return null;

  const format = formatKey(data.bracket_type) || data.bracket_type;
  const stages = data.stages || [];
  const chips = stages.length > 1 && (
    <div className={styles.chips} role="group" aria-label={tt('bracket.stagesLabel', 'Stages of this tournament')}>
      {stages.map((stage) => (
        <button key={stage.id} type="button" aria-pressed={data.stage_id === stage.id}
                className={data.stage_id === stage.id ? `${styles.chip} ${styles.chipOn}` : styles.chip}
                onClick={() => setStageId(stage.id)}>
          {stage.label}
        </button>
      ))}
    </div>
  );

  if (format === 'battle_royale') {
    return <>{chips}<BattleRoyaleBoard key={data.stage_id || 'br'} tournamentRef={slug}
                                       stageId={data.stage_id} token={null} /></>;
  }

  const placed = PLACED.includes(format);
  const rows = (data.standings || []).filter((row) => !placed || row.rank);
  const groups = [...new Set(rows.map((row) => row.group).filter(Boolean))];

  return (
    <>
      {chips}
      {rows.length === 0 ? (
        <p className={styles.note}>
          {placed
            ? tt('embed.standingsLater', 'The final places appear here as the matches are decided.')
            : tt('embed.standingsEmpty', 'The table fills in as results come in.')}
        </p>
      ) : groups.length ? groups.map((group) => (
        <section key={group} className={styles.group}>
          <h2 className={styles.groupTitle}>
            {tt('bracket.groupN', 'Group {g}').replace('{g}', String.fromCharCode(64 + Number(group)))}
          </h2>
          <StandingsTable rows={rows.filter((row) => row.group === group)} format={format}
                          advancing={data.advancing} tt={tt} />
        </section>
      )) : (
        <StandingsTable rows={rows} format={format} advancing={data.advancing} tt={tt} />
      )}
    </>
  );
}

export default function EmbedStandings({ tournament, slug }) {
  const id = tournament.tournament_id || tournament.id;
  if (isLeagueFormat(tournament.bracket_type)) return <StandingsPanel tournamentId={id} />;
  return <StageStandings tournamentId={id} slug={slug} />;
}
