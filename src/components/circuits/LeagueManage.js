'use client';

// Running a league (P5d): /circuits/leagues/<slug>/manage. Approved mockup
// docs/mockups/circuit-divisions.html, "Setting it up" and "Ending the season".
//
// The league's own settings, its divisions top first, who is in each, and the
// end of the season, which shows every move before anything changes. The
// server decides who may do any of it; anybody else opening this address is
// shown the public page's link instead of a control.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { useViewer } from '@/lib/gating';
import { formatNumber } from '@/lib/datetime';
import { useAutoRefresh } from '@/lib/useLiveData';
import DateField from '@/components/date-field/DateField';
import MembersPanel from './MembersPanel';
import { API, request } from './circuitWords';
import styles from './circuits.module.css';
import BackLink from '@/components/back-link/BackLink';

function useSaver(tt) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [problem, setProblem] = useState('');
  const run = async (fn, done) => {
    setBusy(true);
    setNote('');
    setProblem('');
    const got = await fn();
    setBusy(false);
    if (got.ok) {
      setNote(typeof done === 'function' ? done(got.answer.data) : done);
      return got.answer.data;
    }
    setProblem(got.status === 0
      ? tt('api.networkProblem', 'The network is not answering. Try again.')
      : apiMessage(tt, got.answer, 'league.saveFailed', 'That was not saved.'));
    return null;
  };
  return { busy, note, problem, run };
}

function SettingsPanel({ league, token, onSaved, tt }) {
  const [form, setForm] = useState(() => ({
    name: league.name, description: league.description || '', up: String(league.up), down: String(league.down),
  }));
  const save = useSaver(tt);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    const data = await save.run(() => request(`${API}/circuits/leagues/${encodeURIComponent(league.slug)}/`, {
      method: 'PATCH', token,
      body: { name: form.name.trim(), description: form.description, up: Number(form.up) || 0, down: Number(form.down) || 0 },
    }), tt('circuit.saved', 'Saved.'));
    if (data) onSaved(data);
  };
  return (
    <form className={styles.panel} onSubmit={submit}>
      <h2 className={styles.sectionTitle}>{tt('league.panel.league', 'The league')}</h2>
      <label className={styles.field}>
        <span className={styles.label}>{tt('circuit.form.name', 'Name')}</span>
        <input id="league-name" className={styles.input} value={form.name} maxLength={120} required
               disabled={save.busy} onChange={set('name')} />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>{tt('circuit.form.description', 'What it is (optional)')}</span>
        <textarea id="league-description" className={styles.textarea} value={form.description} maxLength={2000}
                  disabled={save.busy} onChange={set('description')} />
      </label>
      <div className={styles.row2}>
        <label className={styles.field}>
          <span className={styles.label}>{tt('league.form.up', 'Go up from each division')}</span>
          <input id="league-up" className={styles.input} type="number" min="0" max="64" inputMode="numeric"
                 value={form.up} disabled={save.busy} onChange={set('up')} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{tt('league.form.down', 'Go down from each division')}</span>
          <input id="league-down" className={styles.input} type="number" min="0" max="64" inputMode="numeric"
                 value={form.down} disabled={save.busy} onChange={set('down')} />
        </label>
      </div>
      <p className={styles.muted}>{tt('league.form.upDownHelp', 'The top division sends nobody up and the bottom one sends nobody down.')}</p>
      {save.note && <p className={styles.note} role="status">{save.note}</p>}
      {save.problem && <p className={styles.problem} role="alert">{save.problem}</p>}
      <div className={styles.actions}>
        <button type="submit" className={styles.primary} disabled={save.busy || !form.name.trim()}>
          {tt('circuit.save', 'Save')}
        </button>
      </div>
    </form>
  );
}

function DivisionsPanel({ league, divisions, token, onSaved, tt }) {
  const [mine, setMine] = useState([]);
  const [pick, setPick] = useState('');
  const [removing, setRemoving] = useState(null);
  const save = useSaver(tt);
  const base = `${API}/circuits/leagues/${encodeURIComponent(league.slug)}/divisions/`;

  useEffect(() => {
    let gone = false;
    (async () => {
      const got = await request(`${API}/circuits/?mine=1`, { token });
      if (!gone && got.ok) setMine(got.answer.data.circuits || []);
    })();
    return () => { gone = true; };
  }, [token]);

  const choices = mine.filter((c) => !c.league);
  const order = divisions.map((d) => d.slug);
  const move = (index, by) => {
    const next = [...order];
    [next[index], next[index + by]] = [next[index + by], next[index]];
    save.run(() => request(base, { method: 'PATCH', token, body: { order: next } }), tt('circuit.saved', 'Saved.'))
      .then((data) => data && onSaved(data));
  };
  const add = async (e) => {
    e.preventDefault();
    const data = await save.run(() => request(base, { method: 'POST', token, body: { circuit: pick } }),
      tt('league.divisionAdded', 'Added as the bottom division.'));
    if (data) {
      setPick('');
      setMine((list) => list.map((c) => (c.slug === pick ? { ...c, league: league.slug } : c)));
      onSaved(data);
    }
  };
  const remove = (slug) => save.run(() => request(`${API}/circuits/leagues/${encodeURIComponent(league.slug)}/divisions/${encodeURIComponent(slug)}/`,
    { method: 'DELETE', token }), tt('league.divisionRemoved', 'Taken out. The circuit stays as it is.'))
    .then((data) => {
      if (!data) return;
      setMine((list) => list.map((c) => (c.slug === slug ? { ...c, league: null } : c)));
      onSaved(data);
    });

  return (
    <div className={styles.panel}>
      <h2 className={styles.sectionTitle}>{tt('league.panel.divisions', 'Divisions, top first')}</h2>
      {divisions.length ? (
        <div className={styles.list}>
          {divisions.map((d, i) => (
            <div key={d.slug} className={`${styles.item} ${styles.itemStep}`}>
              <span className={styles.itemTitle}>
                {`${i + 1}. ${d.name}`}
                <span className={styles.itemSub}>
                  {tt('league.inIt', '{n} in it').replace('{n}', formatNumber(d.members))}
                  {!d.is_published ? `, ${tt('circuit.draft', 'Draft')}` : ''}
                </span>
              </span>
              <Link href={`/circuits/${encodeURIComponent(d.slug)}/manage`} className={styles.linkBtn}>
                {tt('league.runDivision', 'Run it')}
              </Link>
              {i > 0 && (
                <button type="button" className={styles.ghost} disabled={save.busy} onClick={() => move(i, -1)}
                        aria-label={tt('league.moveUpLabel', 'Move {name} up').replace('{name}', d.name)}>
                  {tt('league.moveUp', 'Move up')}
                </button>
              )}
              {i < divisions.length - 1 && (
                <button type="button" className={styles.ghost} disabled={save.busy} onClick={() => move(i, 1)}
                        aria-label={tt('league.moveDownLabel', 'Move {name} down').replace('{name}', d.name)}>
                  {tt('league.moveDown', 'Move down')}
                </button>
              )}
              {removing !== d.slug ? (
                <button type="button" className={styles.ghost} disabled={save.busy} onClick={() => setRemoving(d.slug)}>
                  {tt('league.takeOut', 'Take it out')}
                </button>
              ) : (
                <>
                  <button type="button" className={styles.danger} disabled={save.busy}
                          onClick={() => { setRemoving(null); remove(d.slug); }}>
                    {tt('league.takeOutAsk', 'Take {name} out of the league?').replace('{name}', d.name)}
                  </button>
                  <button type="button" className={styles.ghost} disabled={save.busy} onClick={() => setRemoving(null)}>
                    {tt('circuit.keepIt', 'Keep it')}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      ) : <p className={styles.muted}>{tt('league.noDivisionsManage', 'No divisions yet. Add a circuit you run as the top one.')}</p>}
      {choices.length === 0 && (
        <p className={styles.muted}>
          {tt('league.noCircuitToAdd', 'Every division is a circuit you run. You have none free to add: start one, then come back.')}{' '}
          <Link href="/circuits" className={styles.textLink}>{tt('circuit.startTitle', 'Start a circuit')}</Link>
        </p>
      )}
      <form className={styles.row2} onSubmit={add}>
        <label className={styles.field}>
          <span className={styles.label}>{tt('league.form.addCircuit', 'Add a circuit you run')}</span>
          <select id="league-add-circuit" className={styles.select} value={pick} disabled={save.busy}
                  onChange={(e) => setPick(e.target.value)}>
            <option value="">{tt('circuit.form.pickOne', 'Pick one')}</option>
            {choices.map((c) => <option key={c.slug} value={c.slug}>{c.season ? `${c.name}, ${c.season}` : c.name}</option>)}
          </select>
        </label>
        <div className={styles.field}>
          <span className={styles.label} aria-hidden="true">&nbsp;</span>
          <button type="submit" className={styles.ghost} disabled={save.busy || !pick}>
            {tt('league.addAsBottom', 'Add as the bottom division')}
          </button>
        </div>
      </form>
      {save.note && <p className={styles.note} role="status">{save.note}</p>}
      {save.problem && <p className={styles.problem} role="alert">{save.problem}</p>}
    </div>
  );
}

function MoveBox({ title, people, kind, tt }) {
  const fill = people.length ? (kind === 'up' ? styles.moveUp : kind === 'down' ? styles.moveDown : '') : '';
  return (
    <div className={`${styles.move} ${fill}`}>
      <h4 className={styles.moveTitle}>{title}</h4>
      {people.length ? people.map((p) => (
        <span key={`${p.entrant.type}-${p.entrant.id}`} className={styles.movePerson}>
          {p.entrant.name}{' '}
          <span>{tt('league.pointsShort', '{n} pts').replace('{n}', formatNumber(Number(p.points), { maximumFractionDigits: 2 }))}</span>
        </span>
      )) : <span className={styles.movePerson}><span>{tt('league.nobody', 'Nobody')}</span></span>}
    </div>
  );
}

function EndSeasonPanel({ league, current, token, onStarted, tt }) {
  const [plan, setPlan] = useState(null);
  const [season, setSeason] = useState('');
  const [startsOn, setStartsOn] = useState('');
  const [endsOn, setEndsOn] = useState('');
  const look = useSaver(tt);
  const start = useSaver(tt);
  const door = `${API}/circuits/leagues/${encodeURIComponent(league.slug)}/next-season/`;

  const open = async () => {
    const data = await look.run(() => request(door, { token }), '');
    if (data) setPlan(data.plan);
  };
  const go = async (e) => {
    e.preventDefault();
    const data = await start.run(() => request(door, {
      method: 'POST', token, body: { season: season.trim(), starts_on: startsOn || null, ends_on: endsOn || null },
    }), (d) => tt('league.started', '{season} started: {n} moved and told.').replace('{season}', season.trim()).replace('{n}', d.moved ?? 0));
    if (data) {
      setPlan(null);
      setSeason('');
      onStarted(data);
    }
  };

  return (
    <div className={styles.panel}>
      <h2 className={styles.sectionTitle}>
        {current ? tt('league.endTitle', 'End {season}').replace('{season}', current) : tt('league.endTitlePlain', 'End the season')}
      </h2>
      <p className={styles.muted}>
        {tt('league.endHelp', 'Each division is copied into a new season with the same tiers, points tables and settings, and no tournaments yet. The players below move, and everybody moved is told. Nothing changes until the last button.')}
      </p>
      {start.note && <p className={styles.note} role="status">{start.note}</p>}
      {!plan && (
        <div className={styles.actions}>
          <button type="button" className={styles.ghost} disabled={look.busy} onClick={open}>
            {tt('league.seeMoves', 'See who moves')}
          </button>
        </div>
      )}
      {look.problem && <p className={styles.problem} role="alert">{look.problem}</p>}
      {plan && (
        <>
          {plan.map((d) => (
            <div key={d.circuit.slug} className={styles.stack}>
              <h3 className={styles.sectionTitle}>{d.circuit.name}</h3>
              <div className={styles.moves}>
                <MoveBox kind="up" people={d.up} tt={tt}
                         title={d.above ? tt('league.upTo', 'Up to {division}').replace('{division}', d.above.name) : tt('league.nobodyUp', 'Nobody goes up')} />
                <MoveBox kind="stay" people={d.stay} tt={tt} title={tt('league.stay', 'Stay')} />
                <MoveBox kind="down" people={d.down} tt={tt}
                         title={d.below ? tt('league.downTo', 'Down to {division}').replace('{division}', d.below.name) : tt('league.nobodyDown', 'Nobody goes down')} />
              </div>
              {d.level.map((l) => (
                <p key={l.line} className={styles.level}>
                  {(l.line === 'up'
                    ? tt('league.levelUp', '{a} and {b} are level on everything at the line for going up. The ranking puts {b} lower (name order, the last thing it sorts by). Give one of them an adjustment first if that is not what you want.')
                    : tt('league.levelDown', '{a} and {b} are level on everything at the line for going down. The ranking puts {b} lower (name order, the last thing it sorts by). Give one of them an adjustment first if that is not what you want.'))
                    .replaceAll('{a}', l.names[0]).replaceAll('{b}', l.names[1])}
                </p>
              ))}
            </div>
          ))}
          <form className={styles.stack} onSubmit={go}>
            <div className={styles.row2}>
              <label className={styles.field}>
                <span className={styles.label}>{tt('league.form.nextSeason', 'Next season')}</span>
                <input id="league-next-season" className={styles.input} value={season} maxLength={60} required
                       disabled={start.busy} placeholder={tt('circuit.form.seasonPlaceholder', '2026 Season 1')}
                       onChange={(e) => setSeason(e.target.value)} />
              </label>
              <div className={styles.row2}>
                <div className={styles.field}>
                  <span className={styles.label}>{tt('circuit.form.starts', 'Starts')}</span>
                  <DateField id="league-next-starts" value={startsOn} disabled={start.busy}
                             ariaLabel={tt('circuit.form.starts', 'Starts')} onChange={(e) => setStartsOn(e.target.value)} />
                </div>
                <div className={styles.field}>
                  <span className={styles.label}>{tt('circuit.form.ends', 'Ends')}</span>
                  <DateField id="league-next-ends" value={endsOn} disabled={start.busy} min={startsOn || undefined}
                             ariaLabel={tt('circuit.form.ends', 'Ends')} onChange={(e) => setEndsOn(e.target.value)} />
                </div>
              </div>
            </div>
            {start.problem && <p className={styles.problem} role="alert">{start.problem}</p>}
            <div className={styles.actions}>
              <button type="submit" className={styles.primary} disabled={start.busy || !season.trim()}>
                {season.trim() ? tt('league.startNamed', 'Start {season}').replace('{season}', season.trim()) : tt('league.startNext', 'Start the next season')}
              </button>
              <button type="button" className={styles.ghost} disabled={start.busy} onClick={() => setPlan(null)}>
                {tt('league.notYet', 'Not yet')}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

export default function LeagueManage({ slug }) {
  const tt = useT();
  const router = useRouter();
  const viewer = useViewer();
  const [data, setData] = useState(null);
  const [problem, setProblem] = useState('');
  const [missing, setMissing] = useState(false);
  const [division, setDivision] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const publish = useSaver(tt);
  const removal = useSaver(tt);

  const load = useCallback(async () => {
    if (!viewer.token) return;
    const got = await request(`${API}/circuits/leagues/${encodeURIComponent(slug)}/`, { token: viewer.token });
    if (got.answer?.status === 'moved' && got.answer?.data?.slug) {
      router.replace(`/circuits/leagues/${got.answer.data.slug}/manage`);
      return;
    }
    if (got.ok) {
      setData(got.answer.data);
      setProblem('');
    } else if (got.status === 404) {
      setMissing(true);
    } else {
      setProblem(got.status === 0
        ? tt('api.networkProblem', 'The network is not answering. Try again.')
        : apiMessage(tt, got.answer, 'league.loadFailed', 'This league could not be loaded.'));
    }
  }, [slug, viewer.token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);
  // Each division's ranking moves as its tournaments finish while the
  // organiser has this open, and decides who the season end moves.
  useAutoRefresh(() => load());

  if (viewer.loading) return <div className={styles.container}><div className={styles.skeleton} /></div>;
  const publicLink = (
    <Link href={`/circuits/leagues/${encodeURIComponent(data?.league?.slug || slug)}`} className={styles.textLink}>{tt('league.seePublic', 'See the league')}</Link>
  );
  if (!viewer.signedIn) {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>{tt('league.manageSignedOut', 'Only the person running this league can change it.')}{' '}{publicLink}</p>
      </div>
    );
  }
  if (missing) {
    return <div className={styles.container}><p className={styles.empty}>{tt('league.notFoundBody', 'This league does not exist, or it is not published yet.')}</p></div>;
  }
  if (problem) return <div className={styles.container}><p className={styles.problem} role="alert">{problem}</p></div>;
  if (!data) {
    return (
      <div className={styles.container} aria-busy="true">
        <div className={styles.skeletonList}>{[0, 1, 2].map((i) => <div key={i} className={styles.skeleton} />)}</div>
      </div>
    );
  }

  const { league, divisions, seasons } = data;
  if (!league.can_manage) {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>{tt('league.manageSignedOut', 'Only the person running this league can change it.')}{' '}{publicLink}</p>
      </div>
    );
  }
  const current = seasons.length ? seasons[seasons.length - 1].season : '';
  const chosen = divisions.find((d) => d.slug === division) || divisions[0];
  const setPublished = async (value) => {
    const got = await publish.run(() => request(`${API}/circuits/leagues/${encodeURIComponent(league.slug)}/`, {
      method: 'PATCH', token: viewer.token, body: { is_published: value },
    }), value ? tt('league.publishedNow', 'Published. Anybody can see it now.') : tt('league.draftNow', 'Back to a draft. Only you can see it.'));
    if (got) setData(got);
  };
  const saved = (next) => {
    setData(next);
    if (next.league.slug !== slug) router.replace(`/circuits/leagues/${next.league.slug}/manage`);
  };

  return (
    <div className={styles.container}>
      <BackLink href={`/circuits/leagues/${encodeURIComponent(slug)}`}>{tt('back.toLeague', 'Back to league')}</BackLink>
      <div className={styles.heroTop}>
        <div>
          <h1 className={styles.pageTitle}>{league.name}</h1>
          <p className={styles.pageSub}>{publicLink}</p>
        </div>
        <div className={styles.chips} role="group" aria-label={tt('circuit.visibility', 'Who can see it')}>
          <button type="button" className={styles.chip} aria-pressed={!league.is_published} disabled={publish.busy}
                  onClick={() => setPublished(false)}>{tt('circuit.draft', 'Draft')}</button>
          <button type="button" className={styles.chip} aria-pressed={league.is_published} disabled={publish.busy}
                  onClick={() => setPublished(true)}>{tt('circuit.published', 'Published')}</button>
        </div>
      </div>
      {publish.note && <p className={styles.note} role="status">{publish.note}</p>}
      {publish.problem && <p className={styles.problem} role="alert">{publish.problem}</p>}

      <div className={styles.grid2}>
        <SettingsPanel key={`l-${league.slug}`} league={league} token={viewer.token} onSaved={saved} tt={tt} />
        <DivisionsPanel league={league} divisions={divisions} token={viewer.token} onSaved={saved} tt={tt} />
        {chosen && (
          <div className={styles.stack}>
            {divisions.length > 1 && (
              <div className={styles.chips} role="group" aria-label={tt('league.panel.divisions', 'Divisions, top first')}>
                {divisions.map((d) => (
                  <button key={d.slug} type="button" className={styles.chip} aria-pressed={d.slug === chosen.slug}
                          onClick={() => setDivision(d.slug)}>{d.name}</button>
                ))}
              </div>
            )}
            <MembersPanel key={chosen.slug} circuit={{ ...chosen, entrant: league.entrant }} token={viewer.token} onChanged={load} />
          </div>
        )}
      </div>

      {divisions.length > 0 && (
        <EndSeasonPanel league={league} current={current} token={viewer.token} tt={tt} onStarted={(next) => setData(next)} />
      )}

      <div className={styles.panel}>
        <h2 className={styles.sectionTitle}>{tt('league.deleteTitle', 'Delete the league')}</h2>
        <p className={styles.muted}>{tt('league.deleteHelp', 'The league goes. Every division stays as a circuit of its own, with its ranking and tournaments.')}</p>
        {removal.problem && <p className={styles.problem} role="alert">{removal.problem}</p>}
        <div className={styles.actions}>
          {!confirmDelete
            ? <button type="button" className={styles.ghost} onClick={() => setConfirmDelete(true)}>{tt('circuit.delete', 'Delete')}</button>
            : (
              <>
                <button type="button" className={styles.danger} disabled={removal.busy}
                        onClick={async () => {
                          setConfirmDelete(false);
                          const done = await removal.run(() => request(`${API}/circuits/leagues/${encodeURIComponent(league.slug)}/`,
                            { method: 'DELETE', token: viewer.token }), '');
                          if (done) router.push('/circuits');
                        }}>
                  {tt('circuit.deleteYes', 'Delete it')}
                </button>
                <button type="button" className={styles.ghost} disabled={removal.busy} onClick={() => setConfirmDelete(false)}>
                  {tt('circuit.cancel', 'Cancel')}
                </button>
              </>
            )}
        </div>
      </div>
    </div>
  );
}
