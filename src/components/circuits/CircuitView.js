'use client';

// A circuit's public page (P5): /circuits/<slug>. Approved mockup
// docs/mockups/circuits.html, "Circuit page".
//
// Readable signed out (public by default); nothing on it writes. Its manager
// sees one more link, to the organiser screen, decided after the session
// resolves and from the server's `can_manage`, never from comparing names.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { useViewer } from '@/lib/gating';
import { useAutoRefresh } from '@/lib/useLiveData';
import { formatDate, formatNumber } from '@/lib/datetime';
import { describeTable, parseTable } from '@/lib/circuitTable';
import CircuitRanking from './CircuitRanking';
import { API, entrantWord, regionWord, request, seasonDates } from './circuitWords';
import styles from './circuits.module.css';

const TABS = [
  ['ranking', 'circuit.tab.ranking', 'Ranking'],
  ['tournaments', 'circuit.tab.tournaments', 'Tournaments'],
  ['points', 'circuit.tab.points', 'How points work'],
  ['adjustments', 'circuit.tab.adjustments', 'Adjustments'],
];

function TableCard({ title, text, tt }) {
  const { table } = parseTable(text);
  return (
    <div className={styles.tier}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {text ? <div className={styles.typed}>{text}</div> : null}
      <div className={styles.places}>
        {describeTable(tt, table || {}).map((p) => (
          <span key={p.label} className={styles.place}>{p.label} <b className={styles.num}>{p.points}</b></span>
        ))}
      </div>
    </div>
  );
}

export default function CircuitView({ slug }) {
  const tt = useT();
  const router = useRouter();
  const viewer = useViewer();
  const [data, setData] = useState(null);
  const [problem, setProblem] = useState('');
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState('ranking');

  // A public page never waits for a session: it asks at once, and asks again
  // when a token arrives (a manager's draft, and the manage link). A 404
  // while the session is still being asked for is not "missing" yet: it may
  // be the manager's own draft.
  const load = useCallback(async () => {
    const got = await request(`${API}/circuits/${encodeURIComponent(slug)}/`, { token: viewer.token });
    if (got.answer?.status === 'moved' && got.answer?.data?.slug) {
      router.replace(`/circuits/${got.answer.data.slug}`);
      return;
    }
    if (got.ok) {
      setData(got.answer.data);
      setMissing(false);
      setProblem('');
    } else if (got.status === 404) {
      if (!viewer.loading) setMissing(true);
    } else {
      setProblem(got.status === 0
        ? tt('api.networkProblem', 'The network is not answering. Try again.')
        : apiMessage(tt, got.answer, 'circuit.loadFailed', 'This circuit could not be loaded.'));
    }
  }, [slug, viewer.token, viewer.loading]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);
  // The ranking moves as tournaments finish; it follows without a reload.
  useAutoRefresh(() => load());

  if (missing) {
    return (
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>{tt('circuit.notFound', 'No such circuit')}</h1>
        <p className={styles.empty}>
          {tt('circuit.notFoundBody', 'This circuit does not exist, or it is not published yet.')}{' '}
          <Link href="/circuits">{tt('circuit.seeAll', 'See every circuit')}</Link>
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
          {[0, 1, 2, 3].map((i) => <div key={i} className={styles.skeleton} />)}
        </div>
      </div>
    );
  }

  const { circuit, tiers, tournaments, standings, adjustments } = data;
  const played = tournaments.filter((t) => t.counts).length;
  const dates = seasonDates(tt, circuit, formatDate);

  return (
    <div className={styles.container}>
      <header className={styles.hero}>
        <div className={styles.heroTop}>
          <div className={styles.chips}>
            {circuit.game && <span className={`${styles.tag} ${styles.tagRed}`}>{circuit.game.title}</span>}
            <span className={styles.tag}>{entrantWord(tt, circuit.entrant)}</span>
            <span className={styles.tag}>{regionWord(tt, circuit.region)}</span>
            <span className={`${styles.tag} ${styles.tagGreen}`}>
              {tt('circuit.playedOf', '{n} of {total} played').replace('{n}', played).replace('{total}', tournaments.length)}
            </span>
            {!circuit.is_published && <span className={`${styles.tag} ${styles.tagGold}`}>{tt('circuit.draft', 'Draft')}</span>}
          </div>
          {circuit.can_manage && (
            <Link href={`/circuits/${encodeURIComponent(circuit.slug)}/manage`} className={styles.linkBtn}>
              {tt('circuit.manage', 'Run this circuit')}
            </Link>
          )}
        </div>
        <h1 className={styles.heroTitle}>{circuit.name}</h1>
        <div className={styles.meta}>
          {circuit.season && <span><b>{circuit.season}</b></span>}
          {dates && <span className={styles.num}>{dates}</span>}
          {circuit.organization && (
            <span>
              {tt('circuit.runBy', 'Run by')}{' '}
              {circuit.organization.slug
                ? <Link href={`/organizations/${encodeURIComponent(circuit.organization.slug)}`}><b>{circuit.organization.name}</b></Link>
                : <b>{circuit.organization.name}</b>}
            </span>
          )}
        </div>
        {circuit.description && <p className={styles.lede}>{circuit.description}</p>}
      </header>

      <div className={styles.chips} role="group" aria-label={tt('circuit.sections', 'Sections')}>
        {TABS.map(([id, key, english]) => (
          <button key={id} type="button" className={styles.chip} aria-pressed={tab === id} onClick={() => setTab(id)}>
            {tt(key, english)}
            {id === 'adjustments' && adjustments.length ? ` (${formatNumber(adjustments.length)})` : ''}
          </button>
        ))}
      </div>

      {tab === 'ranking' && (
        <>
          <CircuitRanking rows={standings} entrant={circuit.entrant} />
          <p className={styles.faint}>
            {tt('circuit.rankingRule', 'Level on points, the better single place goes first, then more events won. Entrants still level share the rank.')}
          </p>
        </>
      )}

      {tab === 'tournaments' && (
        tournaments.length ? (
          <div className={styles.list}>
            {tournaments.map((t) => (
              <Link key={t.slug} href={`/tournaments/${encodeURIComponent(t.slug)}`} className={styles.item}>
                <span className={styles.itemTitle}>{t.title}</span>
                {t.tier && <span className={styles.tag}>{t.tier.name}</span>}
                {t.starts_at && <span className={`${styles.itemMeta} ${styles.num}`}>{formatDate(t.starts_at)}</span>}
                <span className={`${styles.tag} ${t.counts ? styles.tagGreen : ''}`}>
                  {t.counts ? tt('circuit.counted', 'Counted') : tt('circuit.notPlayedYet', 'Not finished yet')}
                </span>
              </Link>
            ))}
          </div>
        ) : <p className={styles.empty}>{tt('circuit.noTournaments', 'No tournaments are in this circuit yet.')}</p>
      )}

      {tab === 'points' && (
        <>
          <div className={styles.tiers}>
            {tiers.map((tier) => (
              <TableCard key={tier.id} title={tier.name} text={tier.uses_default ? circuit.default_table : tier.table} tt={tt} />
            ))}
            <TableCard title={tt('circuit.defaultTable', 'A tournament with no tier')} text={circuit.default_table} tt={tt} />
          </div>
          <p className={styles.faint}>
            {circuit.entrant === 'team'
              ? tt('circuit.pointsRuleTeam', 'Teams that share a place share its points: two teams on 3rd took 3rd and 4th between them, so each gets half of the two.')
              : tt('circuit.pointsRulePlayer', 'Players who share a place share its points: two players on 3rd took 3rd and 4th between them, so each gets half of the two. A team that enters a tournament here gives each of its players the points.')}
          </p>
        </>
      )}

      {tab === 'adjustments' && (
        adjustments.length ? (
          <div className={styles.list}>
            {adjustments.map((adj) => (
              <div key={adj.id} className={styles.item}>
                <span className={styles.itemTitle}>
                  {adj.entrant.name}
                  {adj.entrant.handle && <span className={styles.itemSub}>@{adj.entrant.handle}</span>}
                </span>
                <span className={`${styles.tag} ${Number(adj.points) >= 0 ? styles.tagGreen : styles.tagRed} ${styles.num}`}>
                  {Number(adj.points) > 0 ? '+' : ''}{formatNumber(Number(adj.points), { maximumFractionDigits: 2 })}
                </span>
                <span className={styles.itemMeta}>{adj.reason}</span>
                <span className={`${styles.itemMeta} ${styles.num}`}>{formatDate(adj.at)}</span>
              </div>
            ))}
          </div>
        ) : <p className={styles.empty}>{tt('circuit.noAdjustments', 'No points have been given or taken by hand.')}</p>
      )}
    </div>
  );
}
