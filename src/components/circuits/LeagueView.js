'use client';

// A league's public page (P5d): /circuits/leagues/<slug>. Approved mockup
// docs/mockups/circuit-divisions.html, "The league page".
//
// Every division of a season on one page, top first, each its own ranking
// with who would go up and down if the season ended now (or who did, for a
// season that has ended). Readable signed out; nothing on it writes. Its
// manager sees one more link, decided from the server's `can_manage`.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { useViewer } from '@/lib/gating';
import { useAutoRefresh } from '@/lib/useLiveData';
import { formatNumber } from '@/lib/datetime';
import Avatar from '@/components/avatar/Avatar';
import { cameWords, zoneClass, zoneWords } from './CircuitRanking';
import { API, entrantWord, regionWord, request } from './circuitWords';
import styles from './circuits.module.css';
import BackLink from '@/components/back-link/BackLink';

/** "Top 2 go up to Division 1. Bottom 2 go down to Division 3." */
export function divisionRule(tt, league, above, below) {
  const parts = [];
  if (above && league.up) {
    parts.push(tt('league.ruleUp', 'Top {n} go up to {division}.').replace('{n}', league.up).replace('{division}', above.name));
  } else if (!above) {
    parts.push(tt('league.ruleTop', 'The top division: nobody goes up.'));
  }
  if (below && league.down) {
    parts.push(tt('league.ruleDown', 'Bottom {n} go down to {division}.').replace('{n}', league.down).replace('{division}', below.name));
  } else if (!below) {
    parts.push(tt('league.ruleBottom', 'The bottom division: nobody goes down.'));
  }
  return parts.join(' ');
}

function DivisionTable({ division, ended, tt }) {
  const rows = division.standings || [];
  if (!rows.length) {
    return <p className={styles.divFoot}>{tt('league.divisionEmpty', 'Nobody is in this division yet.')}</p>;
  }
  return (
    <div role="table" aria-label={division.name}>
      {rows.map((row, i) => {
        const name = row.entrant.name || row.entrant.handle || tt('circuit.unknownEntrant', 'Unknown');
        const sub = [row.entrant.handle ? `@${row.entrant.handle}` : '', cameWords(tt, row.came)].filter(Boolean).join(', ');
        return (
          <div key={`${row.entrant.type}-${row.entrant.id}`} role="row"
               className={`${styles.zrow} ${zoneClass(row.zone) || (i % 2 === 0 ? styles.zebra : '')}`}>
            <span className={`${styles.rank} ${styles.num}`} role="cell">{row.rank}</span>
            <span className={styles.who} role="cell">
              <Avatar src={row.entrant.avatar} name={name} size={32} />
              <span className={styles.whoText}>
                <span className={styles.whoName}>{name}</span>
                {sub && <span className={styles.whoHandle}>{sub}</span>}
              </span>
            </span>
            <span className={`${styles.points} ${styles.num}`} role="cell">
              {formatNumber(Number(row.points), { maximumFractionDigits: 2 })}
            </span>
            <span className={styles.zoneWord} role="cell">{zoneWords(tt, row.zone, ended)}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function LeagueView({ slug }) {
  const tt = useT();
  const router = useRouter();
  const viewer = useViewer();
  const [season, setSeason] = useState(null);
  const [data, setData] = useState(null);
  const [problem, setProblem] = useState('');
  const [missing, setMissing] = useState(false);

  const load = useCallback(async () => {
    const query = season ? `?season=${season}` : '';
    const got = await request(`${API}/circuits/leagues/${encodeURIComponent(slug)}/${query}`, { token: viewer.token });
    if (got.answer?.status === 'moved' && got.answer?.data?.slug) {
      router.replace(`/circuits/leagues/${got.answer.data.slug}`);
      return;
    }
    if (got.ok) {
      setData(got.answer.data);
      setMissing(false);
      setProblem('');
    } else if (got.status === 404 && got.answer?.code !== 'SEASON_NOT_FOUND') {
      if (!viewer.loading) setMissing(true);
    } else {
      setProblem(got.status === 0
        ? tt('api.networkProblem', 'The network is not answering. Try again.')
        : apiMessage(tt, got.answer, 'league.loadFailed', 'This league could not be loaded.'));
    }
  }, [slug, season, viewer.token, viewer.loading]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);
  // Rankings move as each division's tournaments finish.
  useAutoRefresh(() => load());

  if (missing) {
    return (
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>{tt('league.notFound', 'No such league')}</h1>
        <p className={styles.empty}>
          {tt('league.notFoundBody', 'This league does not exist, or it is not published yet.')}{' '}
          <Link href="/circuits" className={styles.textLink}>{tt('circuit.seeAll', 'See every circuit')}</Link>
        </p>
      </div>
    );
  }
  if (problem) {
    return (
      <div className={styles.container}>
        <p className={styles.problem} role="alert">{problem}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.ghost} onClick={() => { setProblem(''); load(); }}>
            {tt('circuit.retry', 'Try again')}
          </button>
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className={styles.container} aria-busy="true">
        <div className={`${styles.skeleton} ${styles.skeletonHero}`} />
        <div className={styles.skeletonList}>
          {[0, 1, 2].map((i) => <div key={i} className={`${styles.skeleton} ${styles.skeletonHero}`} />)}
        </div>
      </div>
    );
  }

  const { league, seasons, divisions } = data;
  const shown = data.season;
  const ended = Boolean(seasons.length && shown && shown !== seasons[seasons.length - 1].number);

  return (
    <div className={styles.container}>
      <BackLink href="/circuits">{tt('back.toCircuits', 'Back to circuits')}</BackLink>
      <header className={styles.hero}>
        <div className={styles.heroTop}>
          <div className={styles.chips}>
            {league.game && <span className={`${styles.tag} ${styles.tagRed}`}>{league.game.title}</span>}
            <span className={styles.tag}>{entrantWord(tt, league.entrant)}</span>
            <span className={styles.tag}>{regionWord(tt, league.region)}</span>
            <span className={`${styles.tag} ${styles.tagGreen}`}>
              {tt('league.divisionsN', '{n} divisions').replace('{n}', divisions.length)}
            </span>
            {!league.is_published && <span className={`${styles.tag} ${styles.tagGold}`}>{tt('circuit.draft', 'Draft')}</span>}
          </div>
          {league.can_manage && (
            <Link href={`/circuits/leagues/${encodeURIComponent(league.slug)}/manage`} className={styles.linkBtn}>
              {tt('league.manage', 'Run this league')}
            </Link>
          )}
        </div>
        <h1 className={styles.heroTitle}>{league.name}</h1>
        <div className={styles.meta}>
          {league.organization && (
            <span>
              {tt('circuit.runBy', 'Run by')}{' '}
              {league.organization.slug
                ? <Link href={`/organizations/${encodeURIComponent(league.organization.slug)}`}><b>{league.organization.name}</b></Link>
                : <b>{league.organization.name}</b>}
            </span>
          )}
          <span>
            {tt('league.moves', 'Top {up} of each division go up, bottom {down} go down')
              .replace('{up}', league.up).replace('{down}', league.down)}
          </span>
        </div>
        {league.description && <p className={styles.lede}>{league.description}</p>}
        {seasons.length > 1 && (
          <div className={styles.chips} role="group" aria-label={tt('league.season', 'Season')}>
            {seasons.map((s) => (
              <button key={s.number} type="button" className={styles.chip} aria-pressed={shown === s.number}
                      onClick={() => setSeason(s.number)}>
                {s.season || tt('league.seasonN', 'Season {n}').replace('{n}', s.number)}
              </button>
            ))}
          </div>
        )}
      </header>

      {divisions.length ? (
        <div className={styles.stack}>
          {divisions.map((d, i) => (
            <section key={d.slug} className={styles.divPanel} aria-label={d.name}>
              <div className={styles.divHead}>
                <h2 className={styles.divTitle}>{d.name}</h2>
                <span className={`${styles.itemMeta} ${styles.num}`}>
                  {tt('league.divisionCounts', '{members} in it, {played} of {total} played')
                    .replace('{members}', formatNumber(d.members)).replace('{played}', d.played).replace('{total}', d.tournaments)}
                </span>
                <Link href={`/circuits/${encodeURIComponent(d.slug)}`} className={styles.divLink}>
                  {tt('league.wholeRanking', 'Whole ranking')}
                </Link>
              </div>
              <DivisionTable division={d} ended={ended} tt={tt} />
              <p className={styles.divFoot}>{divisionRule(tt, league, divisions[i - 1], divisions[i + 1])}</p>
            </section>
          ))}
        </div>
      ) : (
        <p className={styles.empty}>{tt('league.noDivisions', 'This league has no divisions yet.')}</p>
      )}
      <p className={styles.faint}>
        {ended
          ? tt('league.endedRule', 'This season has ended: the colours say who went up and who went down.')
          : tt('league.zoneRule', 'Each division is ranked like any circuit. The colours say where everybody goes if the season ended today; the words say it too.')}
      </p>
    </div>
  );
}
