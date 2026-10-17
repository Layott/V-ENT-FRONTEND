'use client';

// Running a circuit (P5): /circuits/<slug>/manage. Approved mockup
// docs/mockups/circuits.html, "Running it".
//
// Four panels, each saving on its own: the circuit, its tiers, the
// tournaments it counts, and adjustments. The server decides who may do any
// of it (the owner and admins); somebody else who opens this address is shown
// the public page's link instead of a single control (gate the action).

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { useViewer } from '@/lib/gating';
import { formatDate, formatNumber } from '@/lib/datetime';
import { describeTable, parseTable, tableProblem } from '@/lib/circuitTable';
import useGames from '@/hooks/useGames';
import DateField from '@/components/date-field/DateField';
import { useAutoRefresh } from '@/lib/useLiveData';
import { ventFetch, API as TOURNAMENT_API, toTournamentArray } from '@/components/tournament-lib/tournamentApi';
import MembersPanel from './MembersPanel';
import { API, REGIONS, entrantWord, regionWord, request } from './circuitWords';
import styles from './circuits.module.css';

const gameId = (g) => g?.game_id ?? g?.id;
const gameTitle = (g) => g?.game_title ?? g?.title ?? g?.name ?? '';

/** A table input with what it means underneath, read as it is typed. */
function TableField({ id, label, value, onChange, disabled, tt }) {
  const { table, error } = parseTable(value);
  return (
    <div className={styles.field}>
      {label && <label htmlFor={id} className={styles.label}>{label}</label>}
      <input id={id} className={styles.input} value={value} disabled={disabled} inputMode="text"
             placeholder="1: 300, 2-9: 100, default 10" onChange={(e) => onChange(e.target.value)} />
      {error
        ? <p className={styles.problem} role="alert">{tableProblem(tt, error)}</p>
        : (
          <div className={styles.places}>
            {describeTable(tt, table).map((p) => (
              <span key={p.label} className={styles.place}>{p.label} <b className={styles.num}>{p.points}</b></span>
            ))}
          </div>
        )}
    </div>
  );
}

/** One panel's save state: busy, a note, a problem. */
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
      setNote(done);
      return got.answer.data;
    }
    setProblem(got.status === 0
      ? tt('api.networkProblem', 'The network is not answering. Try again.')
      : apiMessage(tt, got.answer, 'circuit.saveFailed', 'That was not saved.'));
    return null;
  };
  return { busy, note, problem, run };
}

function SettingsPanel({ circuit, token, onSaved, tt }) {
  const { games } = useGames();
  const [orgs, setOrgs] = useState([]);
  const [form, setForm] = useState(() => ({
    name: circuit.name, description: circuit.description || '', game: circuit.game ? String(circuit.game.id) : '',
    entrant: circuit.entrant, season: circuit.season || '', region: circuit.region || '',
    starts_on: circuit.starts_on || '', ends_on: circuit.ends_on || '', default_table: circuit.default_table || '',
    organization: circuit.organization?.slug || '',
    engine: circuit.engine || 'points', elo_k: String(circuit.elo_k ?? 32),
  }));
  const save = useSaver(tt);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    let gone = false;
    (async () => {
      const got = await request(`${API}/organization/mine/`, { token });
      if (!gone && got.ok) setOrgs(got.answer.data.organizations || []);
    })();
    return () => { gone = true; };
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    if (parseTable(form.default_table).error) return;
    const data = await save.run(() => request(`${API}/circuits/${encodeURIComponent(circuit.slug)}/`, {
      method: 'PATCH', token,
      body: { ...form, game: form.game ? Number(form.game) : null, elo_k: Number(form.elo_k) || 32 },
    }), tt('circuit.saved', 'Saved.'));
    if (data) onSaved(data);
  };

  return (
    <form className={styles.panel} onSubmit={submit}>
      <h2 className={styles.sectionTitle}>{tt('circuit.panel.circuit', 'The circuit')}</h2>
      <label className={styles.field}>
        <span className={styles.label}>{tt('circuit.form.name', 'Name')}</span>
        <input id="circuit-name" className={styles.input} value={form.name} maxLength={120} required
               disabled={save.busy} onChange={(e) => set('name')(e.target.value)} />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>{tt('circuit.form.description', 'What it is (optional)')}</span>
        <textarea id="circuit-description" className={styles.textarea} value={form.description} maxLength={2000}
                  disabled={save.busy} onChange={(e) => set('description')(e.target.value)} />
      </label>
      <div className={styles.row2}>
        <label className={styles.field}>
          <span className={styles.label}>{tt('circuit.form.game', 'Game')}</span>
          <select id="circuit-game" className={styles.select} value={form.game} disabled={save.busy}
                  onChange={(e) => set('game')(e.target.value)}>
            <option value="">{tt('circuit.form.anyGame', 'Any game')}</option>
            {games.map((g) => <option key={gameId(g)} value={gameId(g)}>{gameTitle(g)}</option>)}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{tt('circuit.form.region', 'Region')}</span>
          <select id="circuit-region" className={styles.select} value={form.region} disabled={save.busy}
                  onChange={(e) => set('region')(e.target.value)}>
            <option value="">{tt('circuit.region.everywhere', 'Everywhere')}</option>
            {REGIONS.map(([value]) => <option key={value} value={value}>{regionWord(tt, value)}</option>)}
          </select>
        </label>
      </div>
      <div className={styles.field}>
        <span className={styles.label}>{tt('circuit.form.entrant', 'Who is ranked')}</span>
        <div className={styles.chips} role="group" aria-label={tt('circuit.form.entrant', 'Who is ranked')}>
          {['player', 'team'].map((key) => (
            <button key={key} type="button" className={styles.chip} aria-pressed={form.entrant === key}
                    disabled={save.busy} onClick={() => set('entrant')(key)}>
              {entrantWord(tt, key)}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.row2}>
        <label className={styles.field}>
          <span className={styles.label}>{tt('circuit.form.season', 'Season')}</span>
          <input id="circuit-season" className={styles.input} value={form.season} maxLength={60} disabled={save.busy}
                 placeholder={tt('circuit.form.seasonPlaceholder', '2026 Season 1')}
                 onChange={(e) => set('season')(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{tt('circuit.form.runBy', 'Run by')}</span>
          <select id="circuit-org" className={styles.select} value={form.organization} disabled={save.busy}
                  onChange={(e) => set('organization')(e.target.value)}>
            <option value="">{tt('circuit.form.justMe', 'Just me')}</option>
            {orgs.map((o) => <option key={o.slug || o.id} value={o.slug}>{o.name}</option>)}
          </select>
        </label>
      </div>
      <div className={styles.row2}>
        <div className={styles.field}>
          <span className={styles.label}>{tt('circuit.form.starts', 'Starts')}</span>
          <DateField id="circuit-starts" value={form.starts_on} disabled={save.busy}
                     ariaLabel={tt('circuit.form.starts', 'Starts')} onChange={(e) => set('starts_on')(e.target.value)} />
        </div>
        <div className={styles.field}>
          <span className={styles.label}>{tt('circuit.form.ends', 'Ends')}</span>
          <DateField id="circuit-ends" value={form.ends_on} disabled={save.busy} min={form.starts_on || undefined}
                     ariaLabel={tt('circuit.form.ends', 'Ends')} onChange={(e) => set('ends_on')(e.target.value)} />
        </div>
      </div>
      <div className={styles.field}>
        <span className={styles.label}>{tt('circuit.form.engine', 'Ranked by')}</span>
        <div className={styles.chips} role="group" aria-label={tt('circuit.form.engine', 'Ranked by')}>
          <button type="button" className={styles.chip} aria-pressed={form.engine === 'points'} disabled={save.busy}
                  onClick={() => set('engine')('points')}>{tt('circuit.engine.points', 'Points from final places')}</button>
          <button type="button" className={styles.chip} aria-pressed={form.engine === 'elo'} disabled={save.busy}
                  onClick={() => set('engine')('elo')}>{tt('circuit.engine.elo', 'Elo from every match')}</button>
        </div>
      </div>
      {form.engine === 'elo' ? (
        <label className={styles.field}>
          <span className={styles.label}>{tt('circuit.form.eloK', 'Most one match can move a rating (4 to 64)')}</span>
          <input id="circuit-elo-k" className={styles.input} type="number" min="4" max="64" inputMode="numeric"
                 value={form.elo_k} disabled={save.busy} onChange={(e) => set('elo_k')(e.target.value)} />
        </label>
      ) : (
        <TableField id="circuit-default-table" tt={tt} value={form.default_table} disabled={save.busy}
                    label={tt('circuit.form.defaultTable', 'Points for a tournament with no tier')}
                    onChange={set('default_table')} />
      )}
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

function TierRow({ circuit, tier, token, onChanged, tt }) {
  const [name, setName] = useState(tier.name);
  const [table, setTable] = useState(tier.table);
  const [removing, setRemoving] = useState(false);
  const save = useSaver(tt);
  const base = `${API}/circuits/${encodeURIComponent(circuit.slug)}/tiers/${tier.id}/`;
  return (
    <div className={styles.tierRow}>
      <input id={`tier-name-${tier.id}`} className={styles.input} value={name} maxLength={60} disabled={save.busy}
             aria-label={tt('circuit.form.tierName', 'Tier name')} onChange={(e) => setName(e.target.value)} />
      <TableField id={`tier-table-${tier.id}`} tt={tt} value={table} disabled={save.busy} onChange={setTable}
                  label={tt('circuit.form.tierTable', 'Its points (empty uses the default table)')} />
      {save.note && <p className={styles.note} role="status">{save.note}</p>}
      {save.problem && <p className={styles.problem} role="alert">{save.problem}</p>}
      <div className={styles.actions}>
        <button type="button" className={styles.ghost} disabled={save.busy || !name.trim() || !!parseTable(table).error}
                onClick={async () => {
                  const data = await save.run(() => request(base, { method: 'PATCH', token, body: { name: name.trim(), table } }),
                    tt('circuit.saved', 'Saved.'));
                  if (data) onChanged();
                }}>
          {tt('circuit.saveTier', 'Save the tier')}
        </button>
        {!removing ? (
          <button type="button" className={styles.ghost} disabled={save.busy} onClick={() => setRemoving(true)}>
            {tt('circuit.removeTier', 'Remove it')}
          </button>
        ) : (
          <>
            <button type="button" className={styles.danger} disabled={save.busy}
                    onClick={async () => {
                      setRemoving(false);
                      const data = await save.run(() => request(base, { method: 'DELETE', token }), '');
                      if (data) onChanged();
                    }}>
              {tt('circuit.removeTierAsk', 'Remove {name}? Its tournaments score by the default table.').replace('{name}', tier.name)}
            </button>
            <button type="button" className={styles.ghost} disabled={save.busy} onClick={() => setRemoving(false)}>
              {tt('circuit.keepIt', 'Keep it')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function TiersPanel({ circuit, tiers, token, onChanged, tt }) {
  const [name, setName] = useState('');
  const [table, setTable] = useState('');
  const save = useSaver(tt);
  const add = async (e) => {
    e.preventDefault();
    const data = await save.run(() => request(`${API}/circuits/${encodeURIComponent(circuit.slug)}/tiers/`, {
      method: 'POST', token, body: { name: name.trim(), table, order: tiers.length },
    }), tt('circuit.tierAdded', 'Tier added.'));
    if (data) {
      setName('');
      setTable('');
      onChanged();
    }
  };
  return (
    <div className={styles.panel}>
      <h2 className={styles.sectionTitle}>{tt('circuit.panel.tiers', 'Tiers')}</h2>
      <p className={styles.muted}>{tt('circuit.tiersHelp', "A bigger event is worth more. Type each tier's table the way you would say it.")}</p>
      {tiers.map((tier) => <TierRow key={tier.id} circuit={circuit} tier={tier} token={token} onChanged={onChanged} tt={tt} />)}
      <form className={styles.tierRow} onSubmit={add}>
        <input id="tier-new-name" className={styles.input} value={name} maxLength={60} disabled={save.busy}
               placeholder={tt('circuit.form.tierPlaceholder', 'Major')} aria-label={tt('circuit.form.tierName', 'Tier name')}
               onChange={(e) => setName(e.target.value)} />
        <TableField id="tier-new-table" tt={tt} value={table} disabled={save.busy} onChange={setTable}
                    label={tt('circuit.form.tierTable', 'Its points (empty uses the default table)')} />
        {save.note && <p className={styles.note} role="status">{save.note}</p>}
        {save.problem && <p className={styles.problem} role="alert">{save.problem}</p>}
        <div className={styles.actions}>
          <button type="submit" className={styles.ghost} disabled={save.busy || !name.trim() || !!parseTable(table).error}>
            {tt('circuit.addTier', 'Add a tier')}
          </button>
        </div>
      </form>
    </div>
  );
}

function TournamentsPanel({ circuit, tiers, tournaments, token, onChanged, tt }) {
  const [mine, setMine] = useState([]);
  const [pick, setPick] = useState('');
  const [tier, setTier] = useState('');
  const [removing, setRemoving] = useState(null);
  const save = useSaver(tt);
  const base = `${API}/circuits/${encodeURIComponent(circuit.slug)}/tournaments/`;

  useEffect(() => {
    let gone = false;
    (async () => {
      try {
        const data = await ventFetch(TOURNAMENT_API.TOURNAMENT.ORGANIZER_LIST, { token });
        if (!gone) setMine(toTournamentArray(data).filter((t) => t?.slug));
      } catch {
        if (!gone) setMine([]);
      }
    })();
    return () => { gone = true; };
  }, [token]);

  const inIt = new Set(tournaments.map((t) => t.slug));
  const choices = mine.filter((t) => !inIt.has(t.slug));

  const add = async (e) => {
    e.preventDefault();
    const data = await save.run(() => request(base, {
      method: 'POST', token, body: { tournament: pick, tier: tier ? Number(tier) : null },
    }), tt('circuit.counting', 'Counted.'));
    if (data) {
      setPick('');
      onChanged();
    }
  };
  const setTierOf = (slug, value) => save.run(() => request(
    `${API}/circuits/${encodeURIComponent(circuit.slug)}/tournaments/${encodeURIComponent(slug)}/`,
    { method: 'PATCH', token, body: { tier: value ? Number(value) : null } },
  ), tt('circuit.saved', 'Saved.')).then((data) => data && onChanged());
  const remove = (slug) => save.run(() => request(
    `${API}/circuits/${encodeURIComponent(circuit.slug)}/tournaments/${encodeURIComponent(slug)}/`,
    { method: 'DELETE', token },
  ), tt('circuit.notCounted', 'No longer counted.')).then((data) => data && onChanged());

  return (
    <div className={styles.panel}>
      <h2 className={styles.sectionTitle}>{tt('circuit.panel.tournaments', 'Tournaments in it')}</h2>
      {tournaments.length ? (
        <div className={styles.list}>
          {tournaments.map((t) => (
            <div key={t.slug} className={`${styles.item} ${styles.itemStep}`}>
              <span className={styles.itemTitle}>
                {t.title}
                <span className={styles.itemSub}>
                  {[t.starts_at ? formatDate(t.starts_at) : null,
                    t.counts ? tt('circuit.counted', 'Counted') : tt('circuit.notPlayedYet', 'Not finished yet')]
                    .filter(Boolean).join(', ')}
                </span>
              </span>
              <select id={`tier-of-${t.slug}`} className={styles.select} value={t.tier ? String(t.tier.id) : ''}
                      disabled={save.busy} aria-label={tt('circuit.form.tier', 'Tier')}
                      onChange={(e) => setTierOf(t.slug, e.target.value)}>
                <option value="">{tt('circuit.noTier', 'No tier (default table)')}</option>
                {tiers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
              {removing !== t.slug ? (
                <button type="button" className={styles.ghost} disabled={save.busy} onClick={() => setRemoving(t.slug)}>
                  {tt('circuit.stopCounting', 'Stop counting it')}
                </button>
              ) : (
                <>
                  <button type="button" className={styles.danger} disabled={save.busy}
                          onClick={() => { setRemoving(null); remove(t.slug); }}>
                    {tt('circuit.stopCountingAsk', 'Stop counting {title}? Its points leave the ranking.').replace('{title}', t.title)}
                  </button>
                  <button type="button" className={styles.ghost} disabled={save.busy} onClick={() => setRemoving(null)}>
                    {tt('circuit.keepIt', 'Keep it')}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      ) : <p className={styles.muted}>{tt('circuit.noTournamentsManage', 'Nothing is counted yet. Add a tournament you run.')}</p>}
      <form className={styles.field} onSubmit={add}>
        <div className={styles.row2}>
          <label className={styles.field}>
            <span className={styles.label}>{tt('circuit.form.yourTournament', 'A tournament you run')}</span>
            <select id="circuit-add-tournament" className={styles.select} value={pick} disabled={save.busy}
                    onChange={(e) => setPick(e.target.value)}>
              <option value="">{tt('circuit.form.pickOne', 'Pick one')}</option>
              {choices.map((t) => (
                <option key={t.slug} value={t.slug}>{t.name || t.tournament_title || t.title || t.slug}</option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{tt('circuit.form.tier', 'Tier')}</span>
            <select id="circuit-add-tier" className={styles.select} value={tier} disabled={save.busy}
                    onChange={(e) => setTier(e.target.value)}>
              <option value="">{tt('circuit.noTier', 'No tier (default table)')}</option>
              {tiers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </label>
        </div>
        {save.note && <p className={styles.note} role="status">{save.note}</p>}
        {save.problem && <p className={styles.problem} role="alert">{save.problem}</p>}
        <div className={styles.actions}>
          <button type="submit" className={styles.primary} disabled={save.busy || !pick}>
            {tt('circuit.countIt', 'Count it')}
          </button>
        </div>
      </form>
    </div>
  );
}

function AdjustmentsPanel({ circuit, adjustments, token, onChanged, tt }) {
  const [who, setWho] = useState('');
  const [points, setPoints] = useState('');
  const [reason, setReason] = useState('');
  const [removing, setRemoving] = useState(null);
  const save = useSaver(tt);
  const base = `${API}/circuits/${encodeURIComponent(circuit.slug)}/adjustments/`;
  const add = async (e) => {
    e.preventDefault();
    const data = await save.run(() => request(base, {
      method: 'POST', token, body: { entrant: who.trim(), points: points.replace('+', '').trim(), reason: reason.trim() },
    }), tt('circuit.adjustmentSaved', 'Saved. They have been told.'));
    if (data) {
      setWho('');
      setPoints('');
      setReason('');
      onChanged();
    }
  };
  return (
    <div className={styles.panel}>
      <h2 className={styles.sectionTitle}>{tt('circuit.panel.adjustments', 'Adjustments')}</h2>
      <p className={styles.muted}>{tt('circuit.adjustHelp', 'Give or take points by hand. The reason is shown to everybody beside the points, and the player or team is told.')}</p>
      <form className={styles.field} onSubmit={add}>
        <div className={styles.row2}>
          <label className={styles.field}>
            <span className={styles.label}>
              {circuit.entrant === 'team'
                ? tt('circuit.form.teamAddress', 'Team (its address, like lagos-titans)')
                : tt('circuit.form.playerHandle', 'Player (@username)')}
            </span>
            <input id="adjust-who" className={styles.input} value={who} maxLength={160} disabled={save.busy}
                   onChange={(e) => setWho(e.target.value)} />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{tt('circuit.form.points', 'Points (minus to take)')}</span>
            <input id="adjust-points" className={styles.input} value={points} inputMode="decimal" disabled={save.busy}
                   placeholder="+50" onChange={(e) => setPoints(e.target.value)} />
          </label>
        </div>
        <label className={styles.field}>
          <span className={styles.label}>{tt('circuit.form.reason', 'Why (everybody reads this)')}</span>
          <input id="adjust-reason" className={styles.input} value={reason} maxLength={240} disabled={save.busy}
                 onChange={(e) => setReason(e.target.value)} />
        </label>
        {save.note && <p className={styles.note} role="status">{save.note}</p>}
        {save.problem && <p className={styles.problem} role="alert">{save.problem}</p>}
        <div className={styles.actions}>
          <button type="submit" className={styles.primary} disabled={save.busy || !who.trim() || !points.trim() || reason.trim().length < 3}>
            {tt('circuit.saveAdjustment', 'Save the adjustment')}
          </button>
        </div>
      </form>
      {adjustments.length > 0 && (
        <div className={styles.list}>
          {adjustments.map((adj) => (
            <div key={adj.id} className={`${styles.item} ${styles.itemStep}`}>
              <span className={styles.itemTitle}>
                {adj.entrant.name}
                <span className={styles.itemSub}>{adj.reason}</span>
              </span>
              <span className={`${styles.tag} ${Number(adj.points) >= 0 ? styles.tagGreen : styles.tagRed} ${styles.num}`}>
                {Number(adj.points) > 0 ? '+' : ''}{formatNumber(Number(adj.points), { maximumFractionDigits: 2 })}
              </span>
              {removing !== adj.id ? (
                <button type="button" className={styles.ghost} disabled={save.busy} onClick={() => setRemoving(adj.id)}>
                  {tt('circuit.takeBack', 'Take it back')}
                </button>
              ) : (
                <>
                  <button type="button" className={styles.danger} disabled={save.busy}
                          onClick={() => {
                            setRemoving(null);
                            save.run(() => request(`${API}/circuits/${encodeURIComponent(circuit.slug)}/adjustments/${adj.id}/`,
                              { method: 'DELETE', token }), tt('circuit.adjustmentRemoved', 'Taken back.')).then((d) => d && onChanged());
                          }}>
                    {tt('circuit.takeBackAsk', 'Take back these points?')}
                  </button>
                  <button type="button" className={styles.ghost} disabled={save.busy} onClick={() => setRemoving(null)}>
                    {tt('circuit.keepIt', 'Keep it')}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CircuitManage({ slug }) {
  const tt = useT();
  const router = useRouter();
  const viewer = useViewer();
  const [data, setData] = useState(null);
  const [problem, setProblem] = useState('');
  const [missing, setMissing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const publish = useSaver(tt);
  const removal = useSaver(tt);

  const load = useCallback(async () => {
    if (!viewer.token) return;
    const got = await request(`${API}/circuits/${encodeURIComponent(slug)}/`, { token: viewer.token });
    if (got.answer?.status === 'moved' && got.answer?.data?.slug) {
      router.replace(`/circuits/${got.answer.data.slug}/manage`);
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
        : apiMessage(tt, got.answer, 'circuit.loadFailed', 'This circuit could not be loaded.'));
    }
  }, [slug, viewer.token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);
  // Results land while the organiser has the screen open: the tournaments'
  // states follow without a reload.
  useAutoRefresh(() => load());

  if (viewer.loading) return <div className={styles.container}><div className={styles.skeleton} /></div>;
  if (!viewer.signedIn) {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>
          {tt('circuit.manageSignedOut', 'Only the person running this circuit can change it.')}{' '}
          <Link href={`/circuits/${encodeURIComponent(slug)}`} className={styles.textLink}>{tt('circuit.seePublic', 'See the circuit')}</Link>
        </p>
      </div>
    );
  }
  if (missing) {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>{tt('circuit.notFoundBody', 'This circuit does not exist, or it is not published yet.')}</p>
      </div>
    );
  }
  if (problem) return <div className={styles.container}><p className={styles.problem} role="alert">{problem}</p></div>;
  if (!data) {
    return (
      <div className={styles.container} aria-busy="true">
        <div className={styles.skeletonList}>{[0, 1, 2].map((i) => <div key={i} className={styles.skeleton} />)}</div>
      </div>
    );
  }

  const { circuit, tiers, tournaments, adjustments, league } = data;
  if (!circuit.can_manage) {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>
          {tt('circuit.manageSignedOut', 'Only the person running this circuit can change it.')}{' '}
          <Link href={`/circuits/${encodeURIComponent(circuit.slug)}`} className={styles.textLink}>{tt('circuit.seePublic', 'See the circuit')}</Link>
        </p>
      </div>
    );
  }

  const setPublished = async (value) => {
    const got = await publish.run(() => request(`${API}/circuits/${encodeURIComponent(circuit.slug)}/`, {
      method: 'PATCH', token: viewer.token, body: { is_published: value },
    }), value ? tt('circuit.publishedNow', 'Published. Anybody can see it now.') : tt('circuit.draftNow', 'Back to a draft. Only you can see it.'));
    if (got) setData(got);
  };

  return (
    <div className={styles.container}>
      <div className={styles.heroTop}>
        <div>
          <h1 className={styles.pageTitle}>{circuit.name}</h1>
          <p className={styles.pageSub}>
            <Link href={`/circuits/${encodeURIComponent(circuit.slug)}`} className={styles.textLink}>{tt('circuit.seePublic', 'See the circuit')}</Link>
            {league && (
              <>
                {' '}
                <Link href={`/circuits/leagues/${encodeURIComponent(league.slug)}/manage`} className={styles.textLink}>
                  {tt('league.runLeague', 'Run {league}').replace('{league}', league.name)}
                </Link>
              </>
            )}
          </p>
        </div>
        <div className={styles.chips} role="group" aria-label={tt('circuit.visibility', 'Who can see it')}>
          <button type="button" className={styles.chip} aria-pressed={!circuit.is_published} disabled={publish.busy}
                  onClick={() => setPublished(false)}>{tt('circuit.draft', 'Draft')}</button>
          <button type="button" className={styles.chip} aria-pressed={circuit.is_published} disabled={publish.busy}
                  onClick={() => setPublished(true)}>{tt('circuit.published', 'Published')}</button>
        </div>
      </div>
      {publish.note && <p className={styles.note} role="status">{publish.note}</p>}
      {publish.problem && <p className={styles.problem} role="alert">{publish.problem}</p>}

      <div className={styles.grid2}>
        <SettingsPanel key={`s-${circuit.slug}`} circuit={circuit} token={viewer.token} tt={tt}
                       onSaved={(next) => {
                         setData(next);
                         if (next.circuit.slug !== slug) router.replace(`/circuits/${next.circuit.slug}/manage`);
                       }} />
        <TiersPanel circuit={circuit} tiers={tiers} token={viewer.token} onChanged={load} tt={tt} />
        <TournamentsPanel circuit={circuit} tiers={tiers} tournaments={tournaments} token={viewer.token} onChanged={load} tt={tt} />
        <AdjustmentsPanel circuit={circuit} adjustments={adjustments} token={viewer.token} onChanged={load} tt={tt} />
        {league && <MembersPanel circuit={circuit} token={viewer.token} onChanged={load} />}
      </div>

      <div className={styles.panel}>
        <h2 className={styles.sectionTitle}>{tt('circuit.deleteTitle', 'Delete the circuit')}</h2>
        <p className={styles.muted}>{tt('circuit.deleteHelp', 'The ranking, tiers and adjustments go. The tournaments in it stay exactly as they are.')}</p>
        {removal.problem && <p className={styles.problem} role="alert">{removal.problem}</p>}
        <div className={styles.actions}>
          {!confirmDelete
            ? <button type="button" className={styles.ghost} onClick={() => setConfirmDelete(true)}>{tt('circuit.delete', 'Delete')}</button>
            : (
              <>
                <button type="button" className={styles.danger} disabled={removal.busy}
                        onClick={async () => {
                          setConfirmDelete(false);
                          const done = await removal.run(() => request(`${API}/circuits/${encodeURIComponent(circuit.slug)}/`,
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
