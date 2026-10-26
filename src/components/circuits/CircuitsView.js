'use client';

// Every published circuit (P5): /circuits. Approved mockup
// docs/mockups/circuits.html, "All circuits".
//
// Public. Signed in, your own circuits come first under Yours, drafts too,
// and Start a circuit opens the three fields a circuit needs to exist; the
// rest is set on its organiser screen. Signed out, Start a circuit is one
// sentence and a sign-in link (NeedsAccount), never a form that answers 401.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { useViewer } from '@/lib/gating';
import { plural } from '@/lib/plural';
import useGames from '@/hooks/useGames';
import { useAutoRefresh } from '@/lib/useLiveData';
import NeedsAccount from '@/components/needs-account/NeedsAccount';
import { API, REGIONS, entrantWord, regionWord, request } from './circuitWords';
import styles from './circuits.module.css';

const gameId = (g) => g?.game_id ?? g?.id;
const gameTitle = (g) => g?.game_title ?? g?.title ?? g?.name ?? '';

function CircuitItem({ c, tt }) {
  const facts = [c.game?.title, entrantWord(tt, c.entrant), regionWord(tt, c.region), c.season].filter(Boolean);
  return (
    <Link href={`/circuits/${encodeURIComponent(c.slug)}`} className={styles.item}>
      <span className={styles.itemTitle}>
        {c.name}
        <span className={styles.itemSub}>{facts.join(', ')}</span>
      </span>
      <span className={`${styles.itemMeta} ${styles.num}`}>
        {tt('circuit.tournamentCount', '{n} tournaments').replace('{n}', c.tournaments ?? 0)}
      </span>
      {!c.is_published && <span className={`${styles.tag} ${styles.tagGold}`}>{tt('circuit.draft', 'Draft')}</span>}
    </Link>
  );
}

function LeagueItem({ l, tt }) {
  const facts = [l.game?.title, entrantWord(tt, l.entrant), regionWord(tt, l.region), l.season].filter(Boolean);
  return (
    <Link href={`/circuits/leagues/${encodeURIComponent(l.slug)}`} className={styles.item}>
      <span className={styles.itemTitle}>
        {l.name}
        <span className={styles.itemSub}>{facts.join(', ')}</span>
      </span>
      <span className={`${styles.itemMeta} ${styles.num}`}>
        {plural(tt, l.divisions ?? 0, 'league.divisionOne', '{n} division', 'league.divisionsN', '{n} divisions')}
      </span>
      {!l.is_published && <span className={`${styles.tag} ${styles.tagGold}`}>{tt('circuit.draft', 'Draft')}</span>}
    </Link>
  );
}

/** Start a league (P5d): the fields it needs to exist; divisions and who is
 * in them are set on its organiser screen. */
function LeagueStartForm({ token, games, onCancel }) {
  const tt = useT();
  const router = useRouter();
  const [name, setName] = useState('');
  const [game, setGame] = useState('');
  const [entrant, setEntrant] = useState('player');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setProblem('');
    const got = await request(`${API}/circuits/leagues/`, {
      method: 'POST', token,
      body: { name: name.trim(), game: game ? Number(game) : null, entrant, up: 2, down: 2 },
    });
    setBusy(false);
    if (got.ok) {
      router.push(`/circuits/leagues/${encodeURIComponent(got.answer.data.league.slug)}/manage`);
      return;
    }
    setProblem(got.status === 0
      ? tt('api.networkProblem', 'The network is not answering. Try again.')
      : apiMessage(tt, got.answer, 'league.createFailed', 'That league was not made.'));
  };

  return (
    <form className={styles.panel} onSubmit={submit}>
      <h2 className={styles.sectionTitle}>{tt('league.startTitle', 'Start a league')}</h2>
      <p className={styles.muted}>
        {tt('league.startHelp', 'A league puts circuits you run one above the other as divisions. At the end of each season the top of every division goes up and the bottom goes down. It starts as a draft only you can see.')}
      </p>
      <label className={styles.field}>
        <span className={styles.label}>{tt('circuit.form.name', 'Name')}</span>
        <input id="league-start-name" className={styles.input} value={name} maxLength={120} required disabled={busy}
               placeholder={tt('league.form.namePlaceholder', 'Naija FC League')}
               onChange={(e) => setName(e.target.value)} />
      </label>
      <div className={styles.row2}>
        <label className={styles.field}>
          <span className={styles.label}>{tt('circuit.form.game', 'Game')}</span>
          <select id="league-start-game" className={styles.select} value={game} disabled={busy}
                  onChange={(e) => setGame(e.target.value)}>
            <option value="">{tt('circuit.form.anyGame', 'Any game')}</option>
            {games.map((g) => <option key={gameId(g)} value={gameId(g)}>{gameTitle(g)}</option>)}
          </select>
        </label>
        <div className={styles.field}>
          <span className={styles.label}>{tt('circuit.form.entrant', 'Who is ranked')}</span>
          <div className={styles.chips} role="group" aria-label={tt('circuit.form.entrant', 'Who is ranked')}>
            {['player', 'team'].map((key) => (
              <button key={key} type="button" className={styles.chip} aria-pressed={entrant === key}
                      disabled={busy} onClick={() => setEntrant(key)}>
                {entrantWord(tt, key)}
              </button>
            ))}
          </div>
        </div>
      </div>
      {problem && <p className={styles.problem} role="alert">{problem}</p>}
      <div className={styles.actions}>
        <button type="submit" className={styles.primary} disabled={busy || !name.trim()}>
          {busy ? tt('circuit.starting', 'Starting...') : tt('circuit.startIt', 'Start it')}
        </button>
        <button type="button" className={styles.ghost} disabled={busy} onClick={onCancel}>
          {tt('circuit.cancel', 'Cancel')}
        </button>
      </div>
    </form>
  );
}

function StartForm({ token, games, onCancel }) {
  const tt = useT();
  const router = useRouter();
  const [name, setName] = useState('');
  const [game, setGame] = useState('');
  const [entrant, setEntrant] = useState('player');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setProblem('');
    const got = await request(`${API}/circuits/`, {
      method: 'POST', token,
      body: { name: name.trim(), game: game ? Number(game) : null, entrant },
    });
    setBusy(false);
    if (got.ok) {
      router.push(`/circuits/${encodeURIComponent(got.answer.data.circuit.slug)}/manage`);
      return;
    }
    setProblem(got.status === 0
      ? tt('api.networkProblem', 'The network is not answering. Try again.')
      : apiMessage(tt, got.answer, 'circuit.createFailed', 'That circuit was not made.'));
  };

  return (
    <form className={styles.panel} onSubmit={submit}>
      <h2 className={styles.sectionTitle}>{tt('circuit.startTitle', 'Start a circuit')}</h2>
      <p className={styles.muted}>
        {tt('circuit.startHelp', 'A circuit ranks a season of tournaments as one competition. It starts as a draft only you can see; add its tiers and tournaments, then publish it.')}
      </p>
      <label className={styles.field}>
        <span className={styles.label}>{tt('circuit.form.name', 'Name')}</span>
        <input id="circuit-start-name" className={styles.input} value={name} maxLength={120} required disabled={busy}
               placeholder={tt('circuit.form.namePlaceholder', 'Naija FC Season 1')}
               onChange={(e) => setName(e.target.value)} />
      </label>
      <div className={styles.row2}>
        <label className={styles.field}>
          <span className={styles.label}>{tt('circuit.form.game', 'Game')}</span>
          <select id="circuit-start-game" className={styles.select} value={game} disabled={busy}
                  onChange={(e) => setGame(e.target.value)}>
            <option value="">{tt('circuit.form.anyGame', 'Any game')}</option>
            {games.map((g) => <option key={gameId(g)} value={gameId(g)}>{gameTitle(g)}</option>)}
          </select>
        </label>
        <div className={styles.field}>
          <span className={styles.label}>{tt('circuit.form.entrant', 'Who is ranked')}</span>
          <div className={styles.chips} role="group" aria-label={tt('circuit.form.entrant', 'Who is ranked')}>
            {['player', 'team'].map((key) => (
              <button key={key} type="button" className={styles.chip} aria-pressed={entrant === key}
                      disabled={busy} onClick={() => setEntrant(key)}>
                {entrantWord(tt, key)}
              </button>
            ))}
          </div>
        </div>
      </div>
      {problem && <p className={styles.problem} role="alert">{problem}</p>}
      <div className={styles.actions}>
        <button type="submit" className={styles.primary} disabled={busy || !name.trim()}>
          {busy ? tt('circuit.starting', 'Starting...') : tt('circuit.startIt', 'Start it')}
        </button>
        <button type="button" className={styles.ghost} disabled={busy} onClick={onCancel}>
          {tt('circuit.cancel', 'Cancel')}
        </button>
      </div>
    </form>
  );
}

export default function CircuitsView() {
  const tt = useT();
  const viewer = useViewer();
  const { games } = useGames();
  const [rows, setRows] = useState(null);
  const [mine, setMine] = useState([]);
  const [problem, setProblem] = useState('');
  const [game, setGame] = useState('');
  const [region, setRegion] = useState('');
  const [starting, setStarting] = useState(false);
  const [leagues, setLeagues] = useState([]);
  const [myLeagues, setMyLeagues] = useState([]);
  const [startingLeague, setStartingLeague] = useState(false);

  const load = useCallback(async () => {
    const query = new URLSearchParams();
    if (game) query.set('game', game);
    if (region) query.set('region', region);
    const suffix = query.toString() ? `?${query}` : '';
    const got = await request(`${API}/circuits/${suffix}`);
    if (got.ok) {
      setRows(got.answer.data.circuits || []);
      setProblem('');
    } else {
      setRows([]);
      setProblem(got.status === 0
        ? tt('api.networkProblem', 'The network is not answering. Try again.')
        : apiMessage(tt, got.answer, 'circuit.listFailed', 'The circuits could not be loaded.'));
    }
  }, [game, region]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);
  useAutoRefresh(() => load());

  // Leagues of division circuits (P5d): the published ones for everybody,
  // and your own, drafts too.
  const loadLeagues = useCallback(async () => {
    const got = await request(`${API}/circuits/leagues/`);
    if (got.ok) setLeagues(got.answer.data.leagues || []);
  }, []);
  useEffect(() => { loadLeagues(); }, [loadLeagues]);
  useAutoRefresh(() => loadLeagues());
  useEffect(() => {
    if (!viewer.token) { setMyLeagues([]); return; }
    let gone = false;
    (async () => {
      const got = await request(`${API}/circuits/leagues/?mine=1`, { token: viewer.token });
      if (!gone && got.ok) setMyLeagues(got.answer.data.leagues || []);
    })();
    return () => { gone = true; };
  }, [viewer.token]);
  const shownLeagues = [...myLeagues, ...leagues.filter((l) => !myLeagues.some((m) => m.slug === l.slug))];

  useEffect(() => {
    if (!viewer.token) { setMine([]); return; }
    let gone = false;
    (async () => {
      const got = await request(`${API}/circuits/?mine=1`, { token: viewer.token });
      if (!gone && got.ok) setMine(got.answer.data.circuits || []);
    })();
    return () => { gone = true; };
  }, [viewer.token]);

  return (
    <div className={styles.container}>
      <div className={styles.heroTop}>
        <div>
          <h1 className={styles.pageTitle}>{tt('circuit.listTitle', 'Circuits')}</h1>
          <p className={styles.pageSub}>{tt('circuit.listSub', 'Seasons of tournaments ranked as one competition. Every final place earns points by the table of its tier.')}</p>
        </div>
        <div className={styles.actions}>
          {!starting && (
            <NeedsAccount action={tt('circuit.startAction', 'start a circuit')} compact>
              <button type="button" className={styles.primary} onClick={() => setStarting(true)}>
                {tt('circuit.startTitle', 'Start a circuit')}
              </button>
            </NeedsAccount>
          )}
          {!startingLeague && (
            <NeedsAccount action={tt('league.startAction', 'start a league')} compact>
              <button type="button" className={styles.ghost} onClick={() => setStartingLeague(true)}>
                {tt('league.startTitle', 'Start a league')}
              </button>
            </NeedsAccount>
          )}
        </div>
      </div>

      {starting && viewer.signedIn && <StartForm token={viewer.token} games={games} onCancel={() => setStarting(false)} />}
      {startingLeague && viewer.signedIn && (
        <LeagueStartForm token={viewer.token} games={games} onCancel={() => setStartingLeague(false)} />
      )}

      {shownLeagues.length > 0 && (
        <section className={styles.list} aria-labelledby="circuits-leagues">
          <h2 id="circuits-leagues" className={styles.sectionTitle}>{tt('league.listTitle', 'Leagues')}</h2>
          {shownLeagues.map((l) => <LeagueItem key={l.slug} l={l} tt={tt} />)}
        </section>
      )}

      {mine.length > 0 && (
        <section className={styles.list} aria-labelledby="circuits-mine">
          <h2 id="circuits-mine" className={styles.sectionTitle}>{tt('circuit.yours', 'Yours')}</h2>
          {mine.map((c) => <CircuitItem key={c.slug} c={c} tt={tt} />)}
        </section>
      )}

      <div className={styles.filters}>
        <select id="circuits-game" className={styles.select} value={game} aria-label={tt('circuit.form.game', 'Game')}
                onChange={(e) => setGame(e.target.value)}>
          <option value="">{tt('circuit.allGames', 'All games')}</option>
          {games.map((g) => <option key={gameId(g)} value={gameId(g)}>{gameTitle(g)}</option>)}
        </select>
        <select id="circuits-region" className={styles.select} value={region} aria-label={tt('circuit.form.region', 'Region')}
                onChange={(e) => setRegion(e.target.value)}>
          <option value="">{tt('circuit.region.everywhere', 'Everywhere')}</option>
          {REGIONS.map(([value]) => <option key={value} value={value}>{regionWord(tt, value)}</option>)}
        </select>
      </div>

      {problem && <p className={styles.problem} role="alert">{problem}</p>}
      {rows === null && (
        <div className={styles.skeletonList} aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className={styles.skeleton} />)}
        </div>
      )}
      {rows && rows.length === 0 && !problem && (
        <p className={styles.empty}>
          {game || region
            ? tt('circuit.noneMatch', 'No circuits match. Clear the filters to see them all.')
            : tt('circuit.noneYet', 'No circuits are published yet. Start one for the tournaments you run.')}
        </p>
      )}
      {rows && rows.length > 0 && (
        <div className={styles.list}>
          {rows.map((c) => <CircuitItem key={c.slug} c={c} tt={tt} />)}
        </div>
      )}
    </div>
  );
}
