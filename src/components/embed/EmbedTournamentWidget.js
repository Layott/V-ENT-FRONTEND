'use client';
/**
 * One part of a tournament inside somebody else's website (P8): the bracket,
 * the standings, the schedule or the path, under the tournament's name and a
 * link back.
 *
 * Each is drawn by what the tournament page itself draws, so a widget can
 * never disagree with the page: the bracket is BracketVisualizer, the
 * standings are the league tables or the stage's table from the bracket, the
 * schedule is the organiser's running order, the path is StageGraph from the
 * public plan. All public, all read without an
 * account (token null), and each keeps itself current with backoff.
 *
 * Every widget takes the look the snippet asks for: dark, as on V-ENT, unless
 * the snippet says theme=light. The bracket, the standings and the path take
 * the organiser's accent and font through the app's variables either way.
 */
import { useEffect, useState } from 'react';
import { useLanguage } from '@/i18n/LanguageProvider';
import BracketVisualizer from '@/components/view-tournament/bracket-visualizer/BracketVisualizer';
import EmbedFrame from './EmbedFrame';
import EmbedStandings from './EmbedStandings';
import EmbedSchedule from './EmbedSchedule';
import EmbedPath from './EmbedPath';
import styles from './embed.module.css';

export default function EmbedTournamentWidget({ widget, slug, initial, failed, look }) {
  const { t: tt } = useLanguage();
  const [origin, setOrigin] = useState('');
  useEffect(() => { setOrigin(window.location.origin); }, []);
  const frameLook = look;
  // The tournament page's own components read the app's variables, so they
  // take the organiser's accent through them; the card and the schedule do not.
  const appTokens = ['bracket', 'standings', 'path'].includes(widget);

  const t = initial;
  if (failed || !t) {
    return (
      <EmbedFrame look={frameLook} wide>
        <p className={styles.note}>
          {failed
            ? tt('embed.unavailable', 'This could not be loaded just now. Try again in a moment.')
            : tt('embed.missingTournament', 'This tournament could not be found. It may have been removed.')}
        </p>
      </EmbedFrame>
    );
  }

  const id = t.tournament_id || t.id;
  const name = t.tournament_title || t.name || t.title;

  return (
    <EmbedFrame kind="tournament" slug={slug} look={frameLook} appTokens={appTokens} wide>
      <header className={styles.widgetHead}>
        <h1 className={styles.widgetTitle}>{name}</h1>
        <a className={styles.widgetLink} href={`${origin}/tournaments/${encodeURIComponent(slug)}`}
           target="_blank" rel="noopener">
          {tt('embed.openOnVent', 'Open on V-ENT')}
        </a>
      </header>
      {widget === 'bracket' && <BracketVisualizer tournamentId={id} tournamentRef={slug} token={null} />}
      {widget === 'standings' && <EmbedStandings tournament={t} slug={slug} />}
      {widget === 'schedule' && <EmbedSchedule slug={slug} format={t.bracket_type} />}
      {widget === 'path' && <EmbedPath slug={slug} />}
    </EmbedFrame>
  );
}
