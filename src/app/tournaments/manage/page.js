'use client';

import { appLocale } from '@/lib/appLocale';
import LeagueScoring from '@/components/view-tournament/standings/LeagueScoring';
import { apiMessage } from '@/lib/apiMessage';
import { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useViewer, sameUser, usernameOf } from '@/lib/gating';
import { useAdminCapabilities } from '@/components/admin-bar/AdminBar';
import { LuRadio, LuCheck, LuEye, LuArrowRight, LuTrophy, LuExternalLink, LuPencil } from 'react-icons/lu';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
// The thin organiser page, which is now this console's first tab rather
// than a second screen at another address.
import { ManageContent as ActionsPanel } from '../my-tournaments/manage/page';
import InvitationsPanel from '@/components/tournament-manage/InvitationsPanel';
import OverlaysPanel from '@/components/overlays/OverlaysPanel';
import StudioPanel from '@/components/studio/StudioPanel';
import styles from './manage.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const API = process.env.NEXT_PUBLIC_API_URL;
const TABS = [{
  // The thin `/tournaments/<slug>/manage` page, which every organiser link used
  // to land on. It is a tab here rather than a second screen, because two
  // screens for one tournament is how the Reminders panel ended up unreachable.
  id: 'actions',
  label: 'Actions'
}, {
  id: 'match-control',
  label: 'Match Control'
}, {
  id: 'participants',
  label: 'Participants'
}, {
  // Asking named players and teams, as opposed to the invite codes on the
  // Actions tab which anybody holding one can spend.
  id: 'invitations',
  label: 'Invitations'
}, {
  id: 'brackets',
  label: 'Brackets'
}, {
  id: 'production',
  label: 'Production'
}, {
  id: 'reminders',
  label: 'Reminders'
}, {
  id: 'stats',
  label: 'Player stats'
}];
const formatDate = d => d ? new Date(d).toLocaleDateString(appLocale(), {
  day: 'numeric',
  month: 'short'
}) : '-';
const formatTime = d => d ? new Date(d).toLocaleTimeString(appLocale(), {
  hour: '2-digit',
  minute: '2-digit'
}) : '';

// A bracket match, flattened for the match list / scoreboard.
const flattenMatches = (rounds = []) => rounds.flatMap(r => (r.matches || []).map(m => ({
  id: m.match_id,
  round: r.round,
  round_label: `R${r.round}`,
  match_number: m.match_number,
  status: m.status || 'scheduled',
  score_p1: m.score_p1 ?? 0,
  score_p2: m.score_p2 ?? 0,
  p1: m.participant_1 || null,
  p2: m.participant_2 || null,
  winner: m.winner || null,
  scheduled_at: m.scheduled_at || null
})));
const nameOf = p => p?.name || p?.participant?.name || 'TBD';
const regIdOf = p => p?.registration_id ?? p?.id ?? null;
const ManageContent = ({ slug }) => {
  const tx = useTx();
  const tt = useT();
  const searchParams = useSearchParams();
  // Branch on session STATUS, never on session data. `data` alone cannot
  // tell "signed out" from "still asking", and the first render's fetch ran
  // without a token, then ran again with one: eight duplicate requests on
  // every console open.
  const viewer = useViewer();
  const token = viewer.token;
  const caps = useAdminCapabilities();
  // The address is the slug. `?id=` still resolves, because it is what this
  // page answered to before it had a route of its own and links exist.
  const id = slug || searchParams.get('id');
  const [tournament, setTournament] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Opens on Actions, because that is the screen every organiser link used
  // to reach and the one they will look for.
  // Seeded from the address, and written back to it. Without this the console
  // could not be linked into: every card on the edit hub would have landed on
  // Actions whatever it said, and a reload lost the tab you were on.
  const [tab, setTab] = useState(() => {
    const asked = searchParams.get('tab');
    return TABS.some(t => t.id === asked) ? asked : 'actions';
  });
  const openTab = useCallback((next) => {
    setTab(next);
    if (typeof window === 'undefined') return;
    // Built from the current address rather than a literal, so the two routes
    // this page answers on do not diverge.
    const url = new URL(window.location.href);
    url.searchParams.set('tab', next);
    window.history.replaceState(null, '', url.toString());
  }, []);
  const [toast, setToast] = useState(null);
  const showToast = msg => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };
  const load = useCallback(async () => {
    if (!id) {
      setError(tt("msg.noTournamentSelected", "No tournament selected."));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const headers = token ? {
        Authorization: `Bearer ${token}`
      } : {};
      const [tRes, pRes, bRes] = await Promise.all([fetch(`${API}/tournament/view-tournament/${id}/`, {
        headers
      }), fetch(`${API}/tournament/get-tournament-participants/${id}/`, {
        headers
      }), fetch(`${API}/tournament/get-tournament-brackets/${id}/`, {
        headers
      })]);
      if (!tRes.ok) throw new Error(`Tournament not found (${tRes.status})`);
      const tBody = await tRes.json();
      setTournament(tBody?.data || null);
      const pBody = pRes.ok ? await pRes.json() : null;
      setParticipants(pBody?.data?.participants || []);
      const bBody = bRes.ok ? await bRes.json() : null;
      setRounds(bBody?.data?.rounds || []);
    } catch (err) {
      setError(apiMessage(tt, err, "api.failedToLoadThisTournament", "Failed to load this tournament."));
    } finally {
      setLoading(false);
    }
  }, [id, token]);
  useEffect(() => {
    if (viewer.loading) return;
    load();
  }, [viewer.loading, load]);
  const matches = useMemo(() => flattenMatches(rounds), [rounds]);

  // Whether the viewer runs this tournament. Compared both ways because
  // session.user.id can be a username on some accounts, and never with
  // optional chaining on both sides: undefined === undefined is true.
  const creator = tournament?.tournament_creator;
  const runsIt = viewer.signedIn && (
    sameUser(viewer.username, usernameOf(creator))
    || sameUser(viewer.id, creator?.user_id ?? creator?.id)
    || sameUser(viewer.id, usernameOf(creator))
    || caps?.permissions?.manage_tournaments === true
  );
  const decided = !viewer.loading && (!viewer.signedIn || !!viewer.username) && caps !== null;
  if (loading) {
    return <div className={styles.pageContainer}>
        <Header /><MobileHeader />
        <main className={styles.mainContainer}>
          <Sidebar />
          <div className={styles.rightPaneContainer}>
            <p className={styles.panelSub}>{tt("ui.loading.tournament.7024", "Loading tournament…")}</p>
          </div>
        </main>
        <BottomMenu />
      </div>;
  }
  if (error || !tournament) {
    return <div className={styles.pageContainer}>
        <Header /><MobileHeader />
        <main className={styles.mainContainer}>
          <Sidebar />
          <div className={styles.rightPaneContainer}>
            <Link href="/tournaments/my-tournaments" className={styles.backLink}>{tt("ui.my.tournaments.053d", "← My Tournaments")}</Link>
            <h1 className={styles.pageTitle}>{tt("ui.can.t.open.this.8089", "Can’t open this tournament")}</h1>
            <p className={styles.panelSub}>{error || tx("Tournament not found.")}</p>
          </div>
        </main>
        <BottomMenu />
      </div>;
  }
  // A refusal, not a failure. Every panel below is a control whose save the
  // API has already decided, and rendering Start a broadcast or Choose File to
  // somebody who will get a 403 on press is the fault the signed-out rule
  // exists to stop, one step in. Decided only once the session and the admin
  // capabilities have answered, so the organiser is never refused their own
  // console for a moment while those load.
  if (decided && !runsIt) {
    const ref = tournament.slug || tournament.tournament_id;
    return <div className={styles.pageContainer}>
        <Header /><MobileHeader />
        <main className={styles.mainContainer}>
          <Sidebar />
          <div className={styles.rightPaneContainer}>
            <Link href={`/tournaments/${ref}`} className={styles.backLink}>{tt("ui.view.public.page.13b1", "View Public Page")}</Link>
            <h1 className={styles.pageTitle}>{tt("manage.tournamentRefusedTitle", "This console is not yours")}</h1>
            <p className={styles.panelSub}>{tt("manage.tournamentRefusedHint", "Only the person running this tournament can open its console. The tournament page itself is open to everybody.")}</p>
            <Link href={`/tournaments/${ref}`} className={styles.outlineBtn}>{tt("manage.viewTournamentPage", "View the tournament page")}</Link>
          </div>
        </main>
        <BottomMenu />
      </div>;
  }
  const prizePool = Number(tournament.prize_pool || 0);
  const statusLabel = (tournament.status || '').replace(/_/g, ' ') || 'draft';
  return <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <div className={styles.pageHeader}>
            <div>
              <Link href="/tournaments/my-tournaments" className={styles.backLink}>{tt("ui.my.tournaments.053d", "← My Tournaments")}</Link>
              <h1 className={styles.pageTitle}>{tournament.name || tournament.tournament_title}</h1>
              <div className={styles.headerMeta}>
                <span className={styles.gameTag}>{tournament.game || tx("Unknown game")}</span>
                <span className={styles.statusBadge}><LuRadio /> {statusLabel}</span>
                <span className={styles.metaText}>
                  {tournament.current_participants ?? 0}/{tournament.max_participants ?? 0} {tt("ui.participants.a94a", "participants")}
                </span>
                <span className={styles.metaText}><LuTrophy /> {prizePool.toLocaleString()} VC</span>
              </div>
            </div>
            <div className={styles.headerActions}>
              <Link href={`/tournaments/${tournament.slug || tournament.tournament_id}`}>
                <button className={styles.outlineBtn}><LuEye /> {tt("ui.view.public.page.13b1", "View Public Page")}</button>
              </Link>
              {/* Opens the Production tab below. This was a disabled button
                  titled "Production is not available yet", beside the tab
                  that worked. */}
              <button type="button" className={`${styles.btn} goldBTN`} onClick={() => openTab('production')}>
                <LuRadio /> {tt("ui.production.panel.ccb3", "Production Panel")}
              </button>
            </div>
          </div>

          {/* Sub-tab nav */}
          <div className={styles.tabBar}>
            {TABS.map(t => <button key={t.id} className={`${styles.tabBtn} ${tab === t.id ? styles.tabBtnActive : ''}`} onClick={() => openTab(t.id)}>{tx(t.label)}</button>)}
          </div>

          <div className={styles.panelArea}>
            {tab === 'actions' && <ActionsPanel slug={slug} embedded />}
            {tab === 'match-control' && <MatchControlPanel tournamentId={tournament.tournament_id} matches={matches} token={token} showToast={showToast} onSaved={load} />}
            {tab === 'participants' && <ParticipantsPanel participants={participants} />}
            {tab === 'invitations' && <InvitationsPanel tournamentRef={tournament.slug || tournament.tournament_id} token={token} showToast={showToast} />}
            {tab === 'brackets' && <BracketsPanel rounds={rounds} />}
            {tab === 'production' && <>
              {/* The studio. V-ENT's own graphics, bound to this tournament,
                  each with a URL for a browser source. Replaces a panel that
                  told organisers broadcast tooling was "still being built"
                  while showing them four dead cards. */}
              <StudioPanel tournamentRef={tournament.slug || tournament.tournament_id} />
              {/* Uploading an overlay, the URL for OBS, and the prompt that
                  converts a design into one. On this tab because this is
                  where somebody is already setting up their stream. */}
              <OverlaysPanel kind="tournament" ownerRef={tournament.slug || tournament.tournament_id} token={token} showToast={showToast} />
            </>}
            {tab === 'reminders' && <RemindersPanel tournamentId={tournament.tournament_id} token={token} showToast={showToast} />}
            {tab === 'stats' && <>
                {/* How the league table is worked out, above the MVP metrics:
                    the table is what everybody looks at, the awards are what
                    an organiser decides afterwards. */}
                <LeagueScoring tournamentId={tournament.tournament_id} token={token}
                               entrants={(participants || []).map(p => p.name || p.team_name || p.username).filter(Boolean)} />
                <StatsPanel tournamentId={tournament.tournament_id} matches={matches} token={token} showToast={showToast} />
              </>}
          </div>
        </div>
      </main>

      <BottomMenu />

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>;
};

/* ──────────────── PLAYER STATS AND THE MVP ──────────────── */

// What counts as a good game here, what each player did, and who wins.
//
// The weights are shown while the organiser edits them, because the score is
// the sum of value times weight and somebody setting a weight of 0.001 for
// damage should see why: damage is counted in thousands and would otherwise
// drown every other metric.
//
// An award that goes against the table has to carry a reason. "The numbers
// said X and the organiser chose Y" is a fact somebody will ask about, and the
// reason is what makes it a decision rather than a surprise.
const StatsPanel = ({ tournamentId, matches, token, showToast }) => {
  const tt = useT();
  const [metrics, setMetrics] = useState([]);
  const [isDefault, setIsDefault] = useState(true);
  const [catalogue, setCatalogue] = useState([]);
  const [table, setTable] = useState([]);
  const [award, setAward] = useState(null);
  const [busy, setBusy] = useState(false);
  const [matchId, setMatchId] = useState('');
  const [player, setPlayer] = useState('');
  const [entry, setEntry] = useState({});
  const [overrideTo, setOverrideTo] = useState('');
  const [overrideWhy, setOverrideWhy] = useState('');

  const load = useCallback(async () => {
    if (!token || !tournamentId) return;
    try {
      const [m, v] = await Promise.all([
        fetch(`${API}/tournament/${tournamentId}/metrics/`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()).catch(() => ({})),
        fetch(`${API}/tournament/${tournamentId}/mvp/`)
          .then(r => r.json()).catch(() => ({})),
      ]);
      setMetrics(m?.data?.metrics || []);
      setIsDefault(m?.data?.is_default !== false);
      setCatalogue(m?.data?.catalogue || []);
      setTable(v?.data?.table || []);
      setAward(v?.data?.award || null);
    } catch {
      // A panel that cannot load still has to render rather than spin.
      setMetrics([]);
    }
  }, [tournamentId, token]);

  useEffect(() => { load(); }, [load]);

  const saveMetrics = async next => {
    setBusy(true);
    try {
      const res = await fetch(`${API}/tournament/${tournamentId}/metrics/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ metrics: next }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') { await load(); return true; }
      showToast(apiMessage(tt, body, 'api.failed', 'Failed.'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const addMetric = key => saveMetrics([
    ...metrics.map(m => ({ key: m.key, weight: m.weight })),
    { key },
  ]);

  const removeMetric = key => saveMetrics(
    metrics.filter(m => m.key !== key).map(m => ({ key: m.key, weight: m.weight })));

  const setWeight = (key, weight) => saveMetrics(
    metrics.map(m => ({ key: m.key, weight: m.key === key ? weight : m.weight })));

  // The order is the tiebreak, so moving a row up is a real setting and not a
  // cosmetic sort.
  const move = (index, by) => {
    const next = [...metrics];
    const target = index + by;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    saveMetrics(next.map(m => ({ key: m.key, weight: m.weight })));
  };

  const recordLine = async () => {
    const stats = {};
    Object.entries(entry).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        stats[key] = Number(value);
      }
    });
    if (!matchId || !player.trim() || !Object.keys(stats).length) return;
    setBusy(true);
    try {
      const res = await fetch(
        `${API}/tournament/${tournamentId}/matches/${matchId}/stats/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ players: [{ player: player.trim(), stats }] }),
        });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        showToast(tt('stats.recorded', 'Recorded.'));
        setPlayer('');
        setEntry({});
        await load();
        return;
      }
      showToast(apiMessage(tt, body, 'api.failed', 'Failed.'));
    } finally {
      setBusy(false);
    }
  };

  const makeAward = async () => {
    setBusy(true);
    try {
      const payload = overrideTo.trim()
        ? { player: overrideTo.trim(), reason: overrideWhy.trim() }
        : {};
      const res = await fetch(`${API}/tournament/${tournamentId}/mvp/award/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        showToast(tt('stats.awarded', 'Award recorded.'));
        setOverrideTo('');
        setOverrideWhy('');
        await load();
        return;
      }
      showToast(apiMessage(tt, body, 'api.failed', 'Failed.'));
    } finally {
      setBusy(false);
    }
  };

  const unused = catalogue.filter(c => !metrics.some(m => m.key === c.key));
  const overriding = overrideTo.trim()
    && (!table.length || table[0].username !== overrideTo.trim());

  return <div>
      <h2 className={styles.panelTitle}>{tt('stats.title', 'Player stats')}</h2>
      <p className={styles.panelSub}>
        {tt('stats.hint', 'What counts as a good game here, what each player did, and who wins. The score is every number times what you said it is worth, so the answer to "why them" is a row of figures rather than an opinion.')}
      </p>

      {/* -------------------------------------------------- what counts */}
      <h3 className={styles.statsHeading}>{tt('stats.whatCounts', 'What counts')}</h3>
      {isDefault && <p className={styles.remindCount}>
        {tt('stats.usingDefaults', 'These are suggestions for this game. Change any of them and they become yours.')}
      </p>}

      <div className={styles.statMetrics}>
        {metrics.map((m, index) => <div key={m.key} className={styles.statMetric}>
            <span className={styles.statMetricName}>{m.label}</span>
            <input
              className={styles.statWeight}
              type="number"
              step="0.001"
              defaultValue={m.weight}
              aria-label={tt('stats.weightFor', 'What one {metric} is worth').replace('{metric}', m.label)}
              onBlur={e => {
                const next = Number(e.target.value);
                if (!Number.isNaN(next) && next !== m.weight) setWeight(m.key, next);
              }} />
            <button type="button" className={styles.smallBtn} disabled={busy || index === 0}
                    aria-label={tt('stats.moveUp', 'Move up')}
                    onClick={() => move(index, -1)}>↑</button>
            <button type="button" className={styles.smallBtn} disabled={busy || index === metrics.length - 1}
                    aria-label={tt('stats.moveDown', 'Move down')}
                    onClick={() => move(index, 1)}>↓</button>
            <button type="button" className={styles.smallBtnRed} disabled={busy}
                    aria-label={tt('stats.remove', 'Stop counting this')}
                    onClick={() => removeMetric(m.key)}>×</button>
          </div>)}
      </div>
      <p className={styles.remindCount}>
        {tt('stats.orderIsTiebreak', 'The order is the tiebreak: two players level on score are separated by the first metric in this list, then the second.')}
      </p>

      {unused.length > 0 && <div className={styles.newRowInline}>
        <select className={styles.modalInput} value="" disabled={busy}
                aria-label={tt('stats.addMetric', 'Count something else')}
                onChange={e => e.target.value && addMetric(e.target.value)}>
          <option value="">{tt('stats.addMetric', 'Count something else')}</option>
          {unused.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </div>}

      {/* ------------------------------------------------- record a line */}
      <h3 className={styles.statsHeading}>{tt('stats.record', 'Record a stat line')}</h3>
      <div className={styles.newRowInline}>
        <select className={styles.modalInput} value={matchId}
                aria-label={tt('stats.match', 'Match')}
                onChange={e => setMatchId(e.target.value)}>
          <option value="">{tt('stats.pickMatch', 'Which match')}</option>
          {(matches || []).map(m => <option key={m.id} value={m.id}>
            {`R${m.round} M${m.match_number}: ${nameOf(m.p1)} v ${nameOf(m.p2)}`}
          </option>)}
        </select>
        <input className={styles.modalInput} value={player}
               placeholder={tt('stats.player', 'Player username')}
               onChange={e => setPlayer(e.target.value)} />
      </div>
      <div className={styles.statEntry}>
        {metrics.map(m => <label key={m.key} className={styles.statField}>
            <span className={styles.statFieldLabel}>{m.label}</span>
            <input className={styles.statWeight} type="number"
                   step={m.decimals ? '0.1' : '1'}
                   value={entry[m.key] ?? ''}
                   onChange={e => setEntry({ ...entry, [m.key]: e.target.value })} />
          </label>)}
      </div>
      <button type="button" className={styles.btn}
              disabled={busy || !matchId || !player.trim()}
              onClick={recordLine}>
        {tt('stats.save', 'Record it')}
      </button>

      {/* -------------------------------------------------------- award */}
      <h3 className={styles.statsHeading}>{tt('stats.mvp', 'Most valuable player')}</h3>
      {award && <p className={styles.remindCount}>
        {tt('stats.currentAward', 'Currently {name}, on {score} points.')
          .replace('{name}', award.username)
          .replace('{score}', Number(award.score).toFixed(1))}
        {award.overridden ? ` ${tt('stats.wasOverridden', 'Chosen by you rather than by the table.')}` : ''}
      </p>}
      {!table.length ? <p className={styles.remindCount}>
          {tt('stats.noStatsYet', 'Record some stat lines and the table will fill in.')}
        </p>
        : <>
          <p className={styles.remindCount}>
            {tt('stats.topOfTable', 'Top of the table: {name}, {score} points.')
              .replace('{name}', table[0].username)
              .replace('{score}', Number(table[0].score).toFixed(1))}
          </p>
          <div className={styles.newRowInline}>
            <input className={styles.modalInput} value={overrideTo}
                   placeholder={tt('stats.orSomebodyElse', 'Or somebody else, by username')}
                   onChange={e => setOverrideTo(e.target.value)} />
            {overriding && <input className={styles.modalInput} value={overrideWhy}
                   placeholder={tt('stats.why', 'Why them?')}
                   onChange={e => setOverrideWhy(e.target.value)} />}
          </div>
          {overriding && <p className={styles.remindCount}>
            {tt('stats.whyNeeded', 'A reason is required when the award does not go to the top of the table. It is what makes it a decision rather than a surprise.')}
          </p>}
          <button type="button" className={styles.btn}
                  disabled={busy || (overriding && !overrideWhy.trim())}
                  onClick={makeAward}>
            {tt('stats.award', 'Record the award')}
          </button>
        </>}
    </div>;
};

/* ──────────────── REMINDERS ──────────────── */

// Nudging entrants before they miss something.
//
// The counts are fetched before anything is offered, so an organiser sees "0
// entrants have not checked in" rather than pressing a button that reaches
// nobody. That is the same rule as everywhere else here: say what will happen
// before somebody spends the effort, not after.
const RemindersPanel = ({ tournamentId, token, showToast }) => {
  const tt = useT();
  const [audience, setAudience] = useState(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({ subject: '', body: '' });
  // The diary: reminders set now for the platform to send later.
  const [scheduled, setScheduled] = useState([]);
  const [anchors, setAnchors] = useState([]);
  const [plan, setPlan] = useState({
    kind: 'check_in', anchor: 'check_in_opens', offset_minutes: 60,
    subject: '', body: '',
  });

  const load = useCallback(async () => {
    if (!token || !tournamentId) return;
    const auth = { Authorization: `Bearer ${token}` };
    try {
      const [a, s] = await Promise.all([
        fetch(`${API}/tournament/${tournamentId}/remind/audience/`, { headers: auth })
          .then(r => r.json()).catch(() => ({})),
        fetch(`${API}/tournament/${tournamentId}/remind/scheduled/`, { headers: auth })
          .then(r => r.json()).catch(() => ({})),
      ]);
      setAudience(a?.status === 'success' ? a.data : null);
      setScheduled(s?.data?.scheduled || []);
      setAnchors(s?.data?.anchors || []);
    } catch {
      // A panel that cannot count its audience still has to render, and the
      // buttons below explain themselves without it.
      setAudience(null);
    }
  }, [tournamentId, token]);

  useEffect(() => { load(); }, [load]);

  const send = async payload => {
    setBusy(true);
    try {
      const res = await fetch(`${API}/tournament/${tournamentId}/remind/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        showToast(tt('run.remindSent', 'Sent to {n} people.')
          .replace('{n}', body.data.people));
        if (payload.kind === 'custom') setDraft({ subject: '', body: '' });
        await load();
        return;
      }
      showToast(apiMessage(tt, body, 'api.failed', 'Failed.'));
    } finally {
      setBusy(false);
    }
  };

  const schedule = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${API}/tournament/${tournamentId}/remind/scheduled/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(plan),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        showToast(tt('run.scheduled', 'Scheduled.'));
        setPlan({ ...plan, subject: '', body: '' });
        await load();
        return;
      }
      showToast(apiMessage(tt, body, 'api.failed', 'Failed.'));
    } finally {
      setBusy(false);
    }
  };

  const cancelScheduled = async (id) => {
    setBusy(true);
    try {
      const res = await fetch(
        `${API}/tournament/${tournamentId}/remind/scheduled/${id}/`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        showToast(tt('run.scheduleCancelled', 'Called off.'));
        await load();
        return;
      }
      showToast(apiMessage(tt, body, 'api.failed', 'Failed.'));
    } finally {
      setBusy(false);
    }
  };

  const checkInCount = audience?.check_in?.entrants ?? 0;
  const matchCount = audience?.match?.sides ?? 0;
  const usesCheckIn = audience?.check_in?.used !== false;

  return <div>
      <h2 className={styles.panelTitle}>{tt('run.tabReminders', 'Reminders')}</h2>
      <p className={styles.panelSub}>
        {tt('run.remindersHint', 'Nudge entrants before they miss something. Check-in skips anybody who has already checked in, and a match reminder names the opponent, the round and the time.')}
      </p>

      <div className={styles.remindGrid}>
        <div className={styles.remindCard}>
          <strong className={styles.remindTitle}>
            {tt('run.remindCheckIn', 'Remind them to check in')}
          </strong>
          <span className={styles.remindCount}>
            {!usesCheckIn
              ? tt('run.remindNoCheckIn', 'This tournament does not use check-in.')
              : tt('run.remindCheckInCount', '{n} entrants have not checked in')
                .replace('{n}', checkInCount)}
          </span>
          <button type="button" className={styles.btn} disabled={busy || !usesCheckIn || checkInCount === 0}
                  onClick={() => send({ kind: 'check_in' })}>
            {checkInCount === 0 && usesCheckIn
              ? tt('run.remindNobody', 'Nobody needs this one right now.')
              : tt('run.remindCheckIn', 'Remind them to check in')}
          </button>
        </div>

        <div className={styles.remindCard}>
          <strong className={styles.remindTitle}>
            {tt('run.remindMatch', 'Tell them who they play')}
          </strong>
          <span className={styles.remindCount}>
            {tt('run.remindMatchCount', '{n} sides still to play').replace('{n}', matchCount)}
          </span>
          <button type="button" className={styles.btn} disabled={busy || matchCount === 0}
                  onClick={() => send({ kind: 'match' })}>
            {matchCount === 0
              ? tt('run.remindNobody', 'Nobody needs this one right now.')
              : tt('run.remindMatch', 'Tell them who they play')}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------ the diary ------ */}
      <div className={styles.remindCard} style={{ marginTop: '1rem' }}>
        <strong className={styles.remindTitle}>
          {tt('run.scheduleTitle', 'Set one to go out later')}
        </strong>
        <span className={styles.remindCount}>
          {tt('run.scheduleHint', 'Measured from the tournament rather than pinned to a date, so if you move the tournament the reminder moves with it.')}
        </span>

        <div className={styles.remindRow}>
          <select className={styles.modalInput} value={plan.kind}
                  aria-label={tt('run.scheduleWhat', 'What to send')}
                  onChange={e => setPlan({ ...plan, kind: e.target.value })}>
            <option value="check_in">{tt('run.remindCheckIn', 'Remind them to check in')}</option>
            <option value="match">{tt('run.remindMatch', 'Tell them who they play')}</option>
            <option value="custom">{tt('run.remindCustom', 'Send your own message')}</option>
          </select>

          <input className={styles.remindOffset} type="number" step="5"
                 aria-label={tt('run.scheduleMinutes', 'Minutes before')}
                 value={plan.offset_minutes}
                 disabled={plan.anchor === 'fixed'}
                 onChange={e => setPlan({ ...plan, offset_minutes: Number(e.target.value) })} />

          <select className={styles.modalInput} value={plan.anchor}
                  aria-label={tt('run.scheduleWhen', 'Measured from')}
                  onChange={e => setPlan({ ...plan, anchor: e.target.value })}>
            {(anchors.length ? anchors : [
              { value: 'check_in_opens', label: 'Check-in opening' },
              { value: 'check_in_closes', label: 'Check-in closing' },
              { value: 'tournament_start', label: 'The tournament start' },
            ]).filter(a => a.value !== 'fixed').map(a => (
              <option key={a.value} value={a.value}>
                {tt(`run.anchor_${a.value}`, a.label)}
              </option>
            ))}
          </select>
        </div>

        {plan.kind === 'custom' && <div className={styles.remindRow}>
          <input className={styles.modalInput} maxLength={140}
                 placeholder={tt('run.remindSubject', 'Subject')}
                 value={plan.subject}
                 onChange={e => setPlan({ ...plan, subject: e.target.value })} />
        </div>}
        {plan.kind === 'custom' && <textarea className={styles.remindBody} rows={3}
                  maxLength={2000}
                  placeholder={tt('run.remindBody', 'What do they need to know?')}
                  value={plan.body}
                  onChange={e => setPlan({ ...plan, body: e.target.value })} />}

        <button type="button" className={styles.btn}
                disabled={busy || (plan.kind === 'custom' && (!plan.subject.trim() || !plan.body.trim()))}
                onClick={schedule}>
          {tt('run.scheduleIt', 'Schedule it')}
        </button>

        {scheduled.length > 0 && <div className={styles.scheduleList}>
          {scheduled.map(row => <div key={row.id} className={styles.scheduleRow}>
            <span className={styles.scheduleWhat}>
              {row.kind === 'custom' ? row.subject
                : row.kind === 'match' ? tt('run.remindMatch', 'Tell them who they play')
                  : tt('run.remindCheckIn', 'Remind them to check in')}
            </span>
            <span className={styles.remindCount}>
              {row.cancelled_at ? tt('run.scheduleOff', 'Called off')
                : row.skipped_reason ? row.skipped_reason
                  : row.sent_at ? tt('run.scheduleSent', 'Sent to {n}').replace('{n}', row.people_reached)
                    : row.schedulable ? formatDateTime(row.due_at)
                      : tt('run.scheduleNoTime', 'Waiting for a start time')}
            </span>
            {!row.sent_at && !row.cancelled_at && <button type="button"
                    className={styles.smallBtnRed} disabled={busy}
                    aria-label={tt('run.scheduleCancel', 'Call it off')}
                    onClick={() => cancelScheduled(row.id)}>×</button>}
          </div>)}
        </div>}
      </div>

      <div className={styles.remindCard} style={{ marginTop: '1rem' }}>
        <strong className={styles.remindTitle}>
          {tt('run.remindCustom', 'Send your own message')}
        </strong>
        <input className={styles.modalInput} maxLength={140}
               placeholder={tt('run.remindSubject', 'Subject')}
               value={draft.subject}
               onChange={e => setDraft({ ...draft, subject: e.target.value })} />
        <textarea className={styles.remindBody} rows={4} maxLength={2000}
                  placeholder={tt('run.remindBody', 'What do they need to know?')}
                  value={draft.body}
                  onChange={e => setDraft({ ...draft, body: e.target.value })} />
        <span className={styles.remindCount}>
          {audience
            ? tt('run.remindToday', '{sent} of {limit} reminders sent today.')
              .replace('{sent}', audience.sent_today)
              .replace('{limit}', audience.daily_limit)
            : ''}
        </span>
        <button type="button" className={styles.btn}
                disabled={busy || !draft.subject.trim() || !draft.body.trim()}
                onClick={() => send({ kind: 'custom', ...draft })}>
          {tt('run.remindCustom', 'Send your own message')}
        </button>
      </div>
    </div>;
};

/* ──────────────── MATCH CONTROL ──────────────── */
const MatchControlPanel = ({
  tournamentId,
  matches,
  token,
  showToast,
  onSaved
}) => {
  const tx = useTx();
  const tt = useT();
  const [selected, setSelected] = useState(matches[0]?.id ?? null);
  const live = matches.find(m => m.id === selected) || matches[0] || null;
  const [scoreA, setScoreA] = useState(live?.score_p1 ?? 0);
  const [scoreB, setScoreB] = useState(live?.score_p2 ?? 0);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setScoreA(live?.score_p1 ?? 0);
    setScoreB(live?.score_p2 ?? 0);
  }, [live?.id, live?.score_p1, live?.score_p2]);
  if (!matches.length) {
    return <div>
        <h2 className={styles.panelTitle}>{tt("ui.match.control.9540", "Match Control")}</h2>
        <p className={styles.panelSub}>
          {tt("ui.no.bracket.has.been.fd5b", "No bracket has been generated for this tournament yet. Once the bracket exists,\n          every match appears here for live scoring.")}
        </p>
      </div>;
  }
  const selectMatch = m => setSelected(m.id);
  const updateScore = (delta, side) => {
    if (side === 'a') setScoreA(s => Math.max(0, s + delta));else setScoreB(s => Math.max(0, s + delta));
  };

  // Winner is implied by the score - the backend requires it explicitly.
  const winnerRegId = () => {
    if (scoreA === scoreB) return null;
    return scoreA > scoreB ? regIdOf(live.p1) : regIdOf(live.p2);
  };
  const saveScore = async () => {
    const winner = winnerRegId();
    if (!winner) {
      showToast(tt("msg.scoresAreLevelAWinner", "Scores are level - a winner is required"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API}/tournament/update-bracket/${tournamentId}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? {
            Authorization: `Bearer ${token}`
          } : {})
        },
        body: JSON.stringify({
          match_id: live.id,
          score_p1: scoreA,
          score_p2: scoreB,
          winner_registration_id: winner
        })
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.status !== 'success') {
        showToast(body?.message || `Could not save score (${res.status})`);
      } else {
        showToast(tt("msg.scoreSavedBracketAdvanced", "Score saved \u00b7 bracket advanced"));
        onSaved?.();
      }
    } catch {
      showToast(tt("msg.connectionErrorScoreNotSaved", "Connection error - score not saved"));
    } finally {
      setSaving(false);
    }
  };
  return <div className={styles.matchCtrlGrid}>
      <div className={styles.matchList}>
        <h2 className={styles.panelTitle}>{tt("ui.all.matches.dfb5", "All Matches")}</h2>
        {matches.map(m => <button key={m.id} className={`${styles.matchListItem} ${selected === m.id ? styles.matchListActive : ''}`} onClick={() => selectMatch(m)}>
            <div className={styles.matchListTop}>
              <span className={styles.matchRound}>{m.round_label} · M{m.match_number}</span>
              <span className={`${styles.matchStatusBadge} ${styles[`matchStatus_${m.status}`]}`}>{m.status}</span>
            </div>
            <p className={styles.matchListLabel}>{nameOf(m.p1)} vs {nameOf(m.p2)}</p>
            {m.scheduled_at && <p className={styles.matchListTime}>{formatDate(m.scheduled_at)} · {formatTime(m.scheduled_at)}</p>}
            {m.status !== 'scheduled' && <p className={styles.matchListScore}>{m.score_p1} - {m.score_p2}</p>}
          </button>)}
      </div>

      <div className={styles.scoreboardWrap}>
        <h2 className={styles.panelTitle}>{tt("ui.live.scoring.e82b", "Live Scoring")}</h2>
        <div className={styles.scoreboardCard}>
          <div className={styles.sbHeader}>
            <span className={styles.sbRound}>{live.round_label} {tt("ui.match.b4ba", "· Match")} {live.match_number}</span>
            <span className={`${styles.sbStatusPill} ${styles[`matchStatus_${live.status}`]}`}>{live.status}</span>
          </div>

          <div className={styles.sbScoreRow}>
            <div className={styles.sbTeam}>
              <div className={styles.sbAvatar}>{nameOf(live.p1).charAt(0)}</div>
              <p className={styles.sbTeamName}>{nameOf(live.p1)}</p>
              <div className={styles.scoreCounter}>
                <button className={styles.scoreBtn} onClick={() => updateScore(-1, 'a')}>−</button>
                <span className={styles.scoreValue}>{scoreA}</span>
                <button className={styles.scoreBtn} onClick={() => updateScore(1, 'a')}>+</button>
              </div>
            </div>

            <div className={styles.sbVS}>VS</div>

            <div className={styles.sbTeam}>
              <div className={styles.sbAvatar}>{nameOf(live.p2).charAt(0)}</div>
              <p className={styles.sbTeamName}>{nameOf(live.p2)}</p>
              <div className={styles.scoreCounter}>
                <button className={styles.scoreBtn} onClick={() => updateScore(-1, 'b')}>−</button>
                <span className={styles.scoreValue}>{scoreB}</span>
                <button className={styles.scoreBtn} onClick={() => updateScore(1, 'b')}>+</button>
              </div>
            </div>
          </div>

          <div className={styles.sbControls}>
            <button className={`${styles.btn} ${styles.outlineBtn}`} onClick={saveScore} disabled={saving || live.status === 'completed' || !live.p1 || !live.p2}>
              <LuCheck /> {saving ? tx("Saving…") : tx("Save Score")}
            </button>
          </div>
          {live.status === 'completed' && <p className={styles.previewHint}>
              {tt("ui.this.match.complete.winner.dc54", "This match is complete. Winner:")} {nameOf(live.winner)}.
            </p>}
        </div>
      </div>
    </div>;
};

/* ──────────────── PARTICIPANTS ──────────────── */
const ParticipantsPanel = ({
  participants
}) => {
  const tx = useTx();
  const tt = useT();
  if (!participants.length) {
    return <div>
        <h2 className={styles.panelTitle}>{tt("ui.participants.cd56", "Participants")}</h2>
        <p className={styles.panelSub}>{tt("ui.nobody.has.registered.tournament.50e0", "Nobody has registered for this tournament yet.")}</p>
      </div>;
  }
  return <div>
      <h2 className={styles.panelTitle}>{tt("ui.participants.1fd9", "Participants (")}{participants.length})</h2>
      <div className={styles.partTable}>
        <div className={styles.partTableHeader}>
          <span>{tt("ui.seed.32fe", "Seed")}</span>
          <span>{tt("ui.participant.a773", "Participant")}</span>
          <span>{tt("ui.type.3deb", "Type")}</span>
          <span>{tt("ui.status.bae7", "Status")}</span>
          <span>{tt("ui.entry.fee.28b4", "Entry fee")}</span>
        </div>
        {participants.map((p, i) => <div key={p.registration_id} className={styles.partTableRow}>
            <span className={styles.seedCell}>#{i + 1}</span>
            <span className={styles.partTeamName}>{p.participant?.name || '-'}</span>
            <span className={styles.partCaptain}>{p.type}</span>
            <span className={`${styles.partStatusBadge} ${styles[`partStatus_${p.status}`] || ''}`}>{p.status}</span>
            <span className={styles.partCaptain}>{p.entry_fee_paid ? 'Paid' : tx("Not paid")}</span>
          </div>)}
      </div>
      <p className={styles.panelSub} style={{
      marginTop: '1rem'
    }}>
        {tt("ui.disqualifications.are.handled.by.3733", "Disqualifications are handled by platform admins from the admin console, so they are\n        recorded in the audit trail.")}
      </p>
    </div>;
};

/* ──────────────── BRACKETS ──────────────── */
const BracketsPanel = ({
  rounds
}) => {
  const tt = useT();
  if (!rounds.length) {
    return <div>
        <h2 className={styles.panelTitle}>{tt("ui.bracket.e42a", "Bracket")}</h2>
        <p className={styles.panelSub}>
          {tt("ui.no.bracket.generated.yet.055e", "No bracket generated yet. Generate it from the tournament page once registration closes.")}
        </p>
      </div>;
  }
  return <div>
      <div className={styles.bracketHeader}>
        <h2 className={styles.panelTitle}>{tt("ui.bracket.e42a", "Bracket")}</h2>
        <p className={styles.bracketSub}>{tt("ui.live.bracket.as.scored.0802", "Live bracket as scored. Update results from Match Control.")}</p>
      </div>

      <div className={styles.bracketScroll}>
        <div className={styles.bracketChart}>
          {rounds.map((round, rIdx) => <div key={round.round} className={styles.roundCol} style={{
          '--round-idx': rIdx
        }}>
              <div className={styles.roundLabel}>{tt("ui.round.ec7b", "Round")} {round.round}</div>
              {(round.matches || []).map(m => {
            const winnerId = regIdOf(m.winner);
            const slots = [{
              p: m.participant_1,
              score: m.score_p1
            }, {
              p: m.participant_2,
              score: m.score_p2
            }];
            return <div key={m.match_id} className={styles.bracketMatch}>
                    {slots.map((slot, idx) => <div key={`${m.match_id}_${idx}`} className={`${styles.bracketTeamSlot} ${winnerId && regIdOf(slot.p) === winnerId ? styles.slotWinner : ''}`}>
                        <span className={styles.slotName}>{nameOf(slot.p)}</span>
                        <span className={styles.slotScore}>{slot.score ?? '-'}</span>
                      </div>)}
                  </div>;
          })}
            </div>)}
        </div>
      </div>
    </div>;
};


const Manage = () => <Suspense fallback={<div style={{
  minHeight: '100vh',
  backgroundColor: '#131316'
}} />}>
    <ManageContent />
  </Suspense>;
export default Manage;

// Rendered by `/tournaments/<slug>/manage`, which is where every organiser link
// in the app actually points.
export { ManageContent };