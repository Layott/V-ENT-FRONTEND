'use client';
/**
 * A tournament's schedule on somebody else's website (P8).
 *
 * The organiser's running order, day by day (scheduleGroups): their days and
 * their order first, then fixtures that have a time, on the reader's calendar
 * day for it, then whatever is not placed yet. Times are in the reader's own
 * zone, through the site's one timing model, and the zone is named once at the
 * top so two people comparing times are talking about the same moment.
 *
 * An empty seat says where its player comes from ("Winner of Round 1,
 * match 2"), as on the bracket. Public, current through useLiveData.
 */
import { useMemo } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import useLiveData from '@/lib/useLiveData';
import { dayKey, formatDayShort, formatTime, viewerZone } from '@/lib/datetime';
import { scheduleGroups } from '@/lib/scheduleGroups';
import { sideLabel, sourceName } from '@/lib/slotLabel';
import styles from './embed.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;
const DECIDED = ['completed', 'walkover_p1', 'walkover_p2'];

function Fixture({ fixture, format, tt }) {
  const decided = DECIDED.includes(fixture.status);
  const where = sourceName(tt, {
    round: fixture.round, side: fixture.bracket_side, group: fixture.group_number,
    number: fixture.match_number, is_final: fixture.is_final,
    winner_place: fixture.winner_place, loser_place: fixture.loser_place,
  }, format);
  const state = decided
    ? `${fixture.score_p1} - ${fixture.score_p2}`
    : fixture.status === 'in_progress' ? tt('embed.playingNow', 'Playing now')
      : fixture.status === 'bye' ? tt('bracket.bye', 'Through without playing') : '';
  return (
    <li className={styles.fixture}>
      <span className={styles.fixtureTime}>
        {fixture.scheduled_at ? formatTime(fixture.scheduled_at) : ''}
      </span>
      <span className={styles.fixtureMain}>
        <span className={styles.fixtureSides}>
          <span className={decided && fixture.winner_registration_id
            && fixture.winner_registration_id === fixture.participant_1?.registration_id ? styles.won : ''}>
            {sideLabel(tt, fixture, 1, format)}
          </span>
          <span className={styles.versus} aria-hidden="true"> v </span>
          <span className={decided && fixture.winner_registration_id
            && fixture.winner_registration_id === fixture.participant_2?.registration_id ? styles.won : ''}>
            {sideLabel(tt, fixture, 2, format)}
          </span>
        </span>
        {where && <span className={styles.fixtureWhere}>{where}</span>}
      </span>
      <span className={styles.fixtureState}>{state}</span>
    </li>
  );
}

export default function EmbedSchedule({ slug, format }) {
  const tt = useT();
  const { data, loading, error, refresh } = useLiveData(async ({ signal }) => {
    const res = await fetch(`${API}/tournament/${encodeURIComponent(slug)}/running-order/`, { signal });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.status !== 'success') throw body;
    return body.data;
  }, [slug], { interval: 30000, maxInterval: 120000 });
  const groups = useMemo(() => scheduleGroups(data, dayKey), [data]);

  if (loading && !data) return <p className={styles.note} aria-busy="true">{tt('ui.loading', 'Loading…')}</p>;
  if (error && !data) {
    return (
      <div className={styles.stateBlock}>
        <p className={styles.note}>{error}</p>
        <button type="button" className={styles.chip} onClick={refresh}>{tt('embed.tryAgain', 'Try again')}</button>
      </div>
    );
  }
  if (!groups.length) {
    return <p className={styles.note}>{tt('embed.scheduleEmpty', 'No fixtures yet. They appear here once the organiser draws the bracket.')}</p>;
  }

  const zone = viewerZone();
  return (
    <>
      {zone && (
        <p className={styles.meta}>
          {tt('embed.scheduleZone', 'Times are in your time zone, {zone}.').replace('{zone}', zone.replace(/_/g, ' '))}
        </p>
      )}
      {groups.map((group) => (
        <section key={group.day || 'later'} className={styles.group}>
          <h2 className={styles.groupTitle}>
            {group.day ? formatDayShort(group.day) : tt('embed.scheduleLater', 'Not scheduled yet')}
          </h2>
          <ol className={styles.fixtures}>
            {group.fixtures.map((fixture) => (
              <Fixture key={fixture.match_id} fixture={fixture} format={format} tt={tt} />
            ))}
          </ol>
        </section>
      ))}
    </>
  );
}
