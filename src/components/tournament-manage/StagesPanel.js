'use client';

// How a tournament is shaped, drawing each stage, and moving it on.
//
// A tournament can run as one format or as a chain of them: groups into a
// playoff, Swiss into a double elimination, a GSL group phase into a knockout.
// Each stage owns its own matches now (27 September 2026). Before that a stage
// was a line in a plan with nowhere to put its matches, and closing one sent
// whatever table the browser happened to have.
//
// Three things on this panel, deliberately different weights:
//
//  * READING the plan is public: the shape of an event is the first thing
//    somebody deciding whether to enter wants to know.
//  * COMPOSING it belongs to the organiser, and only until the first stage is
//    drawn. Every stage says how it is played: its format's own switches
//    (third place, a grand-final reset, home and away, Swiss rounds), how a
//    match is played (best of, the final, two legs, what happens when it ends
//    level), and match day (check-in, who makes the room, what to set up in
//    the game). A football game offers its preset in one press.
//  * DRAWING and ADVANCING are decisions. Advancing shows who the server's
//    table sends through, in seed order, lets the organiser reorder it, and
//    only then commits; the next stage is drawn in the same press.

import { useCallback, useEffect, useState } from 'react';
import { LuArrowDown, LuArrowUp, LuPlus, LuX } from 'react-icons/lu';
import { apiMessage } from '@/lib/apiMessage';
import { formatLabel } from '@/lib/formatLabel';
import { useT } from '@/i18n/LanguageProvider';
import DateField from '@/components/date-field/DateField';
import { formatWithZone, isoToLocalInput, localInputToISO } from '@/lib/datetime';
import { presetButton, roomText } from '@/components/view-tournament/match-room/matchWords';
import styles from './stages-panel.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

// The English behind each place, which is also the dictionary fallback.
const PLACE_WORDS = {
  online: 'Online',
  physical: 'At a venue',
  hybrid: 'Online and at a venue',
};

const TABLE = new Set(['round_robin', 'ladder', 'aggregate_2v2', 'swiss']);
const KNOCKOUT = new Set(['single_elimination', 'double_elimination']);
const GROUPABLE = new Set(['round_robin', 'ladder', 'aggregate_2v2']);
const BEST_OF = [1, 2, 3, 5, 7];
const CHECK_IN = [0, 5, 10, 15, 30];

const defaultSettings = format => (TABLE.has(format)
  ? { best_of: 1, draws: 'allowed', check_in_minutes: 0, room_host: 'p1', room_settings: '',
      ...(format === 'swiss' ? { rounds: 0, win_target: 0, loss_limit: 0 } : { legs: 1 }) }
  : { best_of: 1, final_best_of: 0, knockout_legs: 1, draws: 'penalties', check_in_minutes: 0,
      room_host: 'p1', room_settings: '',
      ...(format === 'single_elimination' ? { third_place: false } : {}),
      ...(format === 'double_elimination' ? { grand_final: 'reset' } : {}) });

/** A set of filled chips, one pressed. Never a ring. */
const Chips = ({ value, options, onChange, disabled, label }) => (
  <div className={styles.chips} role="group" aria-label={label}>
    {options.map(([v, text]) => (
      <button key={String(v)} type="button" disabled={disabled}
              className={`${styles.chip} ${value === v ? styles.chipOn : ''}`}
              aria-pressed={value === v} onClick={() => onChange(v)}>
        {text}
      </button>
    ))}
  </div>
);

export default function StagesPanel({ tournamentRef, token, canManage = false, showToast, onChanged }) {
  const tt = useT();

  const [rows, setRows] = useState([]);
  const [catalogue, setCatalogue] = useState([]);
  const [preset, setPreset] = useState(null);
  const [entrants, setEntrants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);

  // The plan being edited, held apart from what is saved so leaving the panel
  // without pressing Save changes nothing.
  const [draft, setDraft] = useState(null);
  // The stage being closed: the server's list of who goes through, which the
  // organiser may reorder before committing.
  const [closing, setClosing] = useState(null);
  // Whether entrants must have their in-game ID (FC Mobile user ID, eFootball
  // owner ID) on their profile to enter. The requirement already existed
  // (`game_details`); the football preset is where an organiser needs it.
  const [idRequired, setIdRequired] = useState(null);

  const auth = token ? { Authorization: `Bearer ${token}` } : {};

  const load = useCallback(async () => {
    if (!tournamentRef) { setLoading(false); return; }
    setProblem('');
    try {
      const res = await fetch(`${API}/tournament/${tournamentRef}/stages/`, { headers: auth });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setRows(body.data.stages || []);
        setCatalogue(body.data.catalogue || []);
        setPreset(body.data.preset || null);
      } else {
        setProblem(apiMessage(tt, body, 'stages.loadFailed',
          'Could not load how this tournament is shaped.'));
      }
    } catch {
      setProblem(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
    } finally {
      setLoading(false);
    }
  }, [tournamentRef, token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const loadIdRequirement = useCallback(async () => {
    try {
      const res = await fetch(`${API}/tournament/${tournamentRef}/requirements/`);
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        const rows = body.data.requirements || [];
        setIdRequired({ on: rows.some(r => r.kind === 'game_details'), rows });
      }
    } catch {
      // Unknown is shown as nothing, never as "not required".
    }
  }, [tournamentRef]);

  useEffect(() => { if (canManage && preset) loadIdRequirement(); }, [canManage, preset, loadIdRequirement]);

  // Adds the requirement to whatever the organiser already asks for: the set
  // endpoint replaces the list, so the list is read first and written whole.
  const requireGameId = async () => {
    if (!idRequired || idRequired.on) return;
    setBusy(true);
    setProblem('');
    try {
      const requirements = [
        ...idRequired.rows.map(r => ({ kind: r.kind, config: r.config || {}, required: r.required !== false })),
        { kind: 'game_details', config: {}, required: true },
      ];
      const res = await fetch(`${API}/tournament/${tournamentRef}/requirements/set/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify({ requirements }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setIdRequired({ on: true, rows: body.data.requirements || [] });
        if (showToast) showToast(tt('stages.idRequiredDone', 'Entrants now need their in-game ID on their profile to enter.'));
        return;
      }
      setProblem(apiMessage(tt, body, 'api.requirementsSaveFailed', 'Could not save the entry requirements.'));
    } catch {
      networkFail();
    } finally {
      setBusy(false);
    }
  };

  // Who is entered, for "seed straight into this stage". Only fetched when
  // somebody is composing, because nobody else needs it.
  const loadEntrants = useCallback(async () => {
    try {
      const res = await fetch(`${API}/tournament/get-tournament-participants/${tournamentRef}/`);
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setEntrants((body.data.participants || []).filter(p => ['confirmed', 'pending'].includes(p.status)));
      }
    } catch {
      // The picker says there is nobody to choose; the plan still saves.
    }
  }, [tournamentRef]);

  const after = () => { load(); if (onChanged) onChanged(); };

  // One sentence per stage, built here rather than taken from the server's
  // `summary`, which is written in English inside Python.
  const sentence = (row, index, list) => {
    const name = formatLabel(tt, row.format, row.format_label);
    const last = index === list.length - 1;
    if (last) {
      return tt('stages.lineLast', '{format}. This decides the tournament.')
        .replace('{format}', name);
    }
    if (row.format === 'gsl') {
      return tt('stages.lineGsl', '{format}. The top two of each group of four go through.')
        .replace('{format}', name);
    }
    if (row.groups > 1) {
      return tt('stages.lineGroups', '{format} in {groups} groups. The top {n} of each group go through.')
        .replace('{format}', name)
        .replace('{groups}', row.groups)
        .replace('{n}', row.advances);
    }
    return tt('stages.line', '{format} in one field. The top {n} go through.')
      .replace('{format}', name)
      .replace('{n}', row.advances);
  };

  // How a stage's matches are played, in words, for the plan view.
  const playedAs = row => {
    const s = row.settings || {};
    const bits = [];
    if (s.knockout_legs > 1) bits.push(tt('stages.twoLegs', 'two legs'));
    else bits.push(tt('stages.bestOfN', 'best of {n}').replace('{n}', s.best_of || 1));
    if (s.final_best_of) bits.push(tt('stages.finalBestOfN', 'final best of {n}').replace('{n}', s.final_best_of));
    if (s.third_place) bits.push(tt('stages.thirdPlaceOn', 'a third-place match'));
    if (s.grand_final === 'reset') bits.push(tt('stages.resetOn', 'grand final with a reset'));
    if (s.legs > 1) bits.push(tt('stages.homeAway', 'home and away'));
    if (row.format === 'swiss' && s.rounds) bits.push(tt('stages.roundsN', '{n} rounds').replace('{n}', s.rounds));
    if (s.draws === 'penalties') bits.push(tt('stages.pensOn', 'level goes to penalties'));
    if (s.draws === 'allowed') bits.push(tt('stages.drawsOn', 'draws count'));
    if (s.check_in_minutes) bits.push(tt('stages.checkInN', '{n} minutes to check in').replace('{n}', s.check_in_minutes));
    return bits.join(', ');
  };

  // How people arrive in a later stage, in words for the saved plan: the
  // placement and anybody invited straight in. Both were saved and neither was
  // shown (second bracket walk, 28 September 2026).
  const arrival = (row, index) => {
    if (index === 0) return '';
    const placed = {
      cross: tt('stages.placeCross', 'Group winners meet runners-up of another group'),
      by_record: tt('stages.placeRecord', 'By record'),
      random: tt('stages.placeRandom', 'At random'),
    }[row.placement || 'cross'];
    const bits = [tt('stages.placedAs', 'Placed: {how}').replace('{how}', placed)];
    const invited = (row.direct_entrants_named || []).map(e => e.name).filter(Boolean);
    if (invited.length) {
      bits.push(tt('stages.invitedIn', 'Straight in: {names}').replace('{names}', invited.join(', ')));
    }
    return bits.join('. ');
  };

  const blank = format => ({
    format, label: '', advances: format === 'round_robin' ? 2 : 0, groups: 0,
    starts_at: '', ends_at: '', place_type: '', location: '', virtual_link: '',
    placement: 'cross', direct_entrants: [], settings: defaultSettings(format),
  });

  const startEditing = () => {
    loadEntrants();
    setDraft(rows.length
      ? rows.map(r => ({
          format: r.format, label: r.label,
          advances: r.advances, groups: r.groups,
          // Read back what was SET on the stage, never what it inherited.
          starts_at: isoToLocalInput(r.starts_at) || '',
          ends_at: isoToLocalInput(r.ends_at) || '',
          place_type: r.place_type || '',
          location: r.location || '',
          virtual_link: r.virtual_link || '',
          placement: r.placement || 'cross',
          direct_entrants: r.direct_entrants || [],
          settings: { ...defaultSettings(r.format), ...(r.settings || {}) },
        }))
      : [blank('round_robin'), blank('single_elimination')]);
  };

  const setField = (index, key, value) => setDraft(prev => prev.map(
    (row, i) => (i === index
      ? (key === 'format'
        // A new format brings its own switches; the old ones mean nothing.
        ? { ...row, format: value, settings: defaultSettings(value),
            groups: GROUPABLE.has(value) ? row.groups : 0 }
        : { ...row, [key]: value })
      : row)));

  const setSetting = (index, key, value) => setDraft(prev => prev.map(
    (row, i) => (i === index ? { ...row, settings: { ...row.settings, [key]: value } } : row)));

  const applyPreset = index => setDraft(prev => prev.map((row, i) => {
    if (i !== index || !preset) return row;
    const half = TABLE.has(row.format) ? preset.group : preset.knockout;
    return { ...row, settings: { ...row.settings, ...half } };
  }));

  const toggleDirect = (index, regId) => setDraft(prev => prev.map((row, i) => {
    if (i !== index) return row;
    const has = row.direct_entrants.includes(regId);
    return { ...row, direct_entrants: has ? row.direct_entrants.filter(x => x !== regId)
      : [...row.direct_entrants, regId] };
  }));

  const move = (index, by) => setDraft(prev => {
    const next = [...prev];
    const to = index + by;
    if (to < 0 || to >= next.length) return prev;
    [next[index], next[to]] = [next[to], next[index]];
    return next;
  });

  const addRow = () => setDraft(prev => [...prev, blank('single_elimination')]);
  const removeRow = index => setDraft(prev => prev.filter((_, i) => i !== index));

  const networkFail = () => setProblem(tt('api.NETWORK_UNREACHABLE',
    'Could not reach the server. Check the connection and try again.'));

  const savePlan = async () => {
    setBusy(true);
    setProblem('');
    try {
      const res = await fetch(`${API}/tournament/${tournamentRef}/stages/set/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify({
          stages: draft.map((r, index) => ({
            format: r.format,
            label: r.label || '',
            advances: Number(r.advances) || 0,
            groups: GROUPABLE.has(r.format) ? (Number(r.groups) || 0) : 0,
            // Converted before it leaves the browser, which is the only side
            // that knows which zone the organiser typed in.
            starts_at: r.starts_at ? localInputToISO(r.starts_at) : '',
            ends_at: r.ends_at ? localInputToISO(r.ends_at) : '',
            place_type: r.place_type || '',
            location: r.location || '',
            virtual_link: r.virtual_link || '',
            placement: index === 0 ? 'cross' : r.placement,
            direct_entrants: index === 0 ? [] : r.direct_entrants,
            settings: r.settings,
          })),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setRows(body.data.stages || []);
        setDraft(null);
        if (showToast) showToast(tt('stages.saved', 'The plan is saved.'));
        if (onChanged) onChanged();
        return;
      }
      const where = Number.isInteger(body.stage_index)
        ? ` ${tt('stages.atStage', '(stage {n})').replace('{n}', body.stage_index + 1)}`
        : '';
      setProblem(apiMessage(tt, body, 'stages.saveFailed',
        'That plan was not saved.') + where);
    } catch {
      networkFail();
    } finally {
      setBusy(false);
    }
  };

  const drawStage = async row => {
    setBusy(true);
    setProblem('');
    try {
      const res = await fetch(`${API}/tournament/${tournamentRef}/stages/${row.id}/draw/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...auth }, body: '{}',
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        if (showToast) {
          showToast(tt('stages.drawn', '{stage} is drawn: {n} matches.')
            .replace('{stage}', row.label).replace('{n}', body.data?.draw?.matches_created ?? 0));
        }
        after();
        return;
      }
      setProblem(apiMessage(tt, body, 'stages.drawFailed', 'That stage was not drawn.'));
    } catch {
      networkFail();
    } finally {
      setBusy(false);
    }
  };

  // Closing a stage. The server works out who goes through from the stage's
  // own matches and says so by name before anything is committed.
  const prepareClose = async row => {
    setBusy(true);
    setProblem('');
    try {
      const res = await fetch(`${API}/tournament/${tournamentRef}/stages/${row.id}/advance/preview/`,
        { headers: auth });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.status !== 'success') {
        setProblem(apiMessage(tt, body, 'stages.previewFailed',
          'Could not work out who goes through.'));
        return;
      }
      setClosing({ row, next: body.data.next, finished: body.data.finished,
                   open: body.data.open_matches, disputes: body.data.open_disputes > 0,
                   through: body.data.advancing || [] });
    } catch {
      networkFail();
    } finally {
      setBusy(false);
    }
  };

  const moveThrough = (index, by) => setClosing(prev => {
    const list = [...prev.through];
    const to = index + by;
    if (to < 0 || to >= list.length) return prev;
    [list[index], list[to]] = [list[to], list[index]];
    return { ...prev, through: list, reordered: true };
  });

  const confirmClose = async (ignoreDisputes = false) => {
    setBusy(true);
    setProblem('');
    try {
      const res = await fetch(`${API}/tournament/${tournamentRef}/stages/${closing.row.id}/advance/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify({
          ...(closing.reordered ? { order: closing.through.map(r => r.registration_id) } : {}),
          ...(ignoreDisputes ? { ignore_disputes: true } : {}),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setClosing(null);
        after();
        if (showToast) {
          showToast(tt('stages.advanced', '{n} go through to {next}.')
            .replace('{n}', (body.data.advanced || []).length)
            .replace('{next}', body.data.next?.label || ''));
        }
        return;
      }
      if (body.code === 'DISPUTES_OPEN') {
        setClosing(prev => ({ ...prev, disputes: true }));
        setProblem(tt('stages.disputesOpen',
          'Results in this stage are still being disputed. Settle them first, or advance anyway and the disputes stay open.'));
        return;
      }
      setProblem(apiMessage(tt, body, 'stages.advanceFailed', 'That stage was not closed.'));
    } catch {
      networkFail();
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className={styles.state}>{tt('ui.loading.33ce', 'Loading…')}</p>;

  const planLocked = rows.some(r => r.drawn_at || r.status !== 'pending');
  const groupLetter = n => String.fromCharCode(64 + Number(n || 1));

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <div>
          <h3 className={styles.title}>{tt('stages.title', 'How this tournament is shaped')}</h3>
          <p className={styles.hint}>
            {tt('stages.hint2',
              'Run it as one format, or link stages: groups into a playoff, Swiss into a double elimination, GSL groups into a knockout. Each stage is drawn from the one before it when you close it.')}
          </p>
        </div>
        {canManage && !draft && !planLocked && (
          <button type="button" className={styles.ghost} onClick={startEditing}>
            {rows.length
              ? tt('stages.edit', 'Change the plan')
              : tt('stages.compose', 'Run this in stages')}
          </button>
        )}
      </div>

      {problem && <p className={styles.problem} role="alert">{problem}</p>}

      {/* The in-game ID, for a game with a preset. Two players on phones
          find each other by it, and a result is checked against it. */}
      {canManage && preset && idRequired && (
        <div className={styles.idRow}>
          <p className={styles.stageLine}>
            {idRequired.on
              ? tt('stages.idRequiredOn', 'Entrants must have their in-game ID on their profile to enter.')
              : tt('stages.idRequiredOff', 'Entrants are not asked for their in-game ID yet.')}
          </p>
          {!idRequired.on && (
            <button type="button" className={styles.ghost} disabled={busy} onClick={requireGameId}>
              {tt('stages.idRequire', 'Ask every entrant for their in-game ID')}
            </button>
          )}
        </div>
      )}

      {/* ------------------------------------------------------ the plan */}
      {!draft && rows.length === 0 && (
        <p className={styles.empty}>
          {tt('stages.none',
            'This tournament runs as one format from start to finish, which is how most of them run.')}
        </p>
      )}

      {!draft && rows.length > 0 && (
        <ol className={styles.list}>
          {rows.map((row, index) => {
            const prev = rows[index - 1];
            const drawable = canManage && !row.drawn_at && (index === 0 || prev?.status === 'complete');
            const closable = canManage && row.drawn_at && row.status !== 'complete' && index < rows.length - 1;
            return (
              <li key={row.id} className={styles.stage}>
                <span className={styles.order}>{index + 1}</span>
                <div className={styles.stageText}>
                  <span className={styles.stageName}>{row.label}</span>
                  <span className={styles.stageLine}>{sentence(row, index, rows)}</span>
                  <span className={styles.stageLine}>{playedAs(row)}</span>
                  {index > 0 && <span className={styles.stageLine}>{arrival(row, index)}</span>}
                  {(row.when?.is_its_own || row.where?.is_its_own) && (
                    <span className={styles.stageWhen}>
                      {[
                        row.when?.is_its_own && row.when?.starts_at
                          // Named zone: something people have to BE somewhere for.
                          ? formatWithZone(row.when.starts_at)
                          : null,
                        row.where?.is_its_own
                          ? (row.where.location
                            || tt(`stages.place.${row.where.place_type}`,
                                  PLACE_WORDS[row.where.place_type] || ''))
                          : null,
                      ].filter(Boolean).join(', ')}
                    </span>
                  )}
                  {row.status === 'complete' && index < rows.length - 1 && (
                    <span className={styles.done}>
                      {tt('stages.complete', 'Closed. {n} went through.')
                        .replace('{n}', (row.advanced || []).length)}
                    </span>
                  )}
                  {row.status === 'complete' && index === rows.length - 1 && (
                    <span className={styles.done}>{tt('stages.decided', 'Played. The tournament is decided.')}</span>
                  )}
                  {row.status === 'running' && (
                    <span className={styles.running}>
                      {row.finished
                        ? tt('stages.readyToClose', 'Every match is in. Ready to close.')
                        : tt('stages.running', 'Being played now')}
                    </span>
                  )}
                  {!row.drawn_at && index > 0 && prev?.status !== 'complete' && (
                    <span className={styles.stageWhen}>{tt('stages.waitsForPrevious', 'Drawn when the stage before it closes.')}</span>
                  )}
                </div>

                {drawable && (
                  <button type="button" className={styles.save} disabled={busy}
                          onClick={() => drawStage(row)}>
                    {tt('stages.drawNow', 'Draw this stage')}
                  </button>
                )}
                {closable && (
                  <button type="button" className={styles.close} disabled={busy}
                          onClick={() => prepareClose(row)}>
                    {tt('stages.closeStage', 'Close this stage')}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {!draft && planLocked && canManage && (
        <p className={styles.hint}>
          {tt('stages.lockedNote2',
            'A stage has been drawn, so the plan is fixed now. Changing it would restate what a drawn stage was.')}
        </p>
      )}

      {/* -------------------------------------------------- the composer */}
      {draft && (
        <div className={styles.editor}>
          {draft.map((row, index) => {
            const s = row.settings || {};
            const table = TABLE.has(row.format);
            const knockout = KNOCKOUT.has(row.format);
            const last = index === draft.length - 1;
            return (
              <div key={index} className={styles.row}>
                <div className={styles.rowTop}>
                  <span className={styles.order}>{index + 1}</span>
                  <input className={styles.text} value={row.label} disabled={busy}
                         placeholder={tt('stages.labelPlaceholder', 'Name this stage')}
                         aria-label={tt('stages.labelPlaceholder', 'Name this stage')}
                         onChange={e => setField(index, 'label', e.target.value)} />
                  <span className={styles.rowActions}>
                    <button type="button" className={styles.iconBtn} disabled={index === 0 || busy}
                            aria-label={tt('rules.moveUp', 'Move up')}
                            onClick={() => move(index, -1)}>
                      <LuArrowUp aria-hidden="true" />
                    </button>
                    <button type="button" className={styles.iconBtn} disabled={busy || last}
                            aria-label={tt('rules.moveDown', 'Move down')}
                            onClick={() => move(index, 1)}>
                      <LuArrowDown aria-hidden="true" />
                    </button>
                    <button type="button" className={styles.iconBtn} disabled={busy || draft.length < 2}
                            aria-label={tt('stages.removeStage', 'Remove this stage')}
                            onClick={() => removeRow(index)}>
                      <LuX aria-hidden="true" />
                    </button>
                  </span>
                </div>

                <div className={styles.fields}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>{tt('stages.format', 'Played as')}</span>
                    <select className={styles.select} value={row.format} disabled={busy}
                            onChange={e => setField(index, 'format', e.target.value)}>
                      {catalogue.filter(f => f.key !== 'battle_royale' || draft.length === 1).map(f => (
                        <option key={f.key} value={f.key}>
                          {formatLabel(tt, f.key, f.label)}
                        </option>
                      ))}
                    </select>
                  </label>

                  {GROUPABLE.has(row.format) && (
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>{tt('stages.groups', 'Groups')}</span>
                      <input className={styles.number} type="number" min="0" max="64"
                             value={row.groups} disabled={busy}
                             onChange={e => setField(index, 'groups', e.target.value)} />
                    </label>
                  )}

                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>
                      {last
                        ? tt('stages.advancesLast', 'Nobody advances')
                        : row.format === 'gsl'
                          ? tt('stages.advancesGsl', 'Through, per group (fixed at two)')
                          : (Number(row.groups) > 1
                            ? tt('stages.advancesEach', 'Through, per group')
                            : tt('stages.advances', 'How many go through'))}
                    </span>
                    <input className={styles.number} type="number" min="0"
                           value={last ? 0 : (row.format === 'gsl' ? 2 : row.advances)}
                           disabled={busy || last || row.format === 'gsl'}
                           onChange={e => setField(index, 'advances', e.target.value)} />
                  </label>
                </div>

                {/* The format's own switches. */}
                <p className={styles.subhead}>{tt('stages.formatSettings', 'This format')}</p>
                <div className={styles.fields}>
                  {row.format === 'single_elimination' && (
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>{tt('stages.thirdPlace', 'Third-place match')}</span>
                      <Chips value={Boolean(s.third_place)} disabled={busy}
                             label={tt('stages.thirdPlace', 'Third-place match')}
                             options={[[false, tt('stages.no', 'No')], [true, tt('stages.yes', 'Yes')]]}
                             onChange={v => setSetting(index, 'third_place', v)} />
                    </div>
                  )}
                  {row.format === 'double_elimination' && (
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>{tt('stages.grandFinal', 'Grand final')}</span>
                      <Chips value={s.grand_final || 'reset'} disabled={busy}
                             label={tt('stages.grandFinal', 'Grand final')}
                             options={[['reset', tt('stages.gfReset', 'With a reset')],
                                       ['single', tt('stages.gfSingle', 'One match')]]}
                             onChange={v => setSetting(index, 'grand_final', v)} />
                    </div>
                  )}
                  {GROUPABLE.has(row.format) && (
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>{tt('stages.legs', 'Everybody plays everybody')}</span>
                      <Chips value={Number(s.legs || 1)} disabled={busy}
                             label={tt('stages.legs', 'Everybody plays everybody')}
                             options={[[1, tt('stages.once', 'Once')], [2, tt('stages.twiceHomeAway', 'Twice, home and away')]]}
                             onChange={v => setSetting(index, 'legs', v)} />
                    </div>
                  )}
                  {row.format === 'swiss' && <>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>{tt('stages.swissRounds', 'Rounds (0 works it out)')}</span>
                      <input className={styles.number} type="number" min="0" max="15" disabled={busy}
                             value={s.rounds ?? 0} onChange={e => setSetting(index, 'rounds', Number(e.target.value) || 0)} />
                    </label>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>{tt('stages.winTarget', 'Wins to qualify (0 for none)')}</span>
                      <input className={styles.number} type="number" min="0" max="10" disabled={busy}
                             value={s.win_target ?? 0} onChange={e => setSetting(index, 'win_target', Number(e.target.value) || 0)} />
                    </label>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>{tt('stages.lossLimit', 'Losses to be out (0 for none)')}</span>
                      <input className={styles.number} type="number" min="0" max="10" disabled={busy}
                             value={s.loss_limit ?? 0} onChange={e => setSetting(index, 'loss_limit', Number(e.target.value) || 0)} />
                    </label>
                  </>}
                  {row.format === 'gsl' && (
                    <p className={styles.note}>{tt('stages.gslNote', 'Groups of four, drawn automatically. Two openers, a winners match, a losers match and a decider.')}</p>
                  )}
                </div>

                {/* How a match is played. */}
                <p className={styles.subhead}>{tt('stages.matchSettings', 'Each match')}</p>
                {preset && (
                  <button type="button" className={styles.ghost} disabled={busy} onClick={() => applyPreset(index)}>
                    {presetButton(tt, preset.key)}
                  </button>
                )}
                <div className={styles.fields}>
                  {!(knockout && Number(s.knockout_legs) > 1) && (
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>{tt('stages.bestOf', 'Best of')}</span>
                      <Chips value={Number(s.best_of || 1)} disabled={busy} label={tt('stages.bestOf', 'Best of')}
                             options={BEST_OF.filter(n => table || n !== 2).map(n => [n, String(n)])}
                             onChange={v => setSetting(index, 'best_of', v)} />
                    </div>
                  )}
                  {knockout && (
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>{tt('stages.finalBestOf', 'The final')}</span>
                      <Chips value={Number(s.final_best_of || 0)} disabled={busy} label={tt('stages.finalBestOf', 'The final')}
                             options={[[0, tt('stages.same', 'Same')], [3, tt('stages.bo3', 'Best of 3')],
                                       [5, tt('stages.bo5', 'Best of 5')], [7, tt('stages.bo7', 'Best of 7')]]}
                             onChange={v => setSetting(index, 'final_best_of', v)} />
                    </div>
                  )}
                  {knockout && (
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>{tt('stages.knockoutLegs', 'A tie is')}</span>
                      <Chips value={Number(s.knockout_legs || 1)} disabled={busy} label={tt('stages.knockoutLegs', 'A tie is')}
                             options={[[1, tt('stages.oneMatch', 'One match')], [2, tt('stages.twoLegsAgg', 'Two legs, total goals')]]}
                             onChange={v => setSetting(index, 'knockout_legs', v)} />
                    </div>
                  )}
                  {!table && (
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>{tt('stages.ifLevel', 'When it ends level')}</span>
                      <Chips value={s.draws || 'penalties'} disabled={busy} label={tt('stages.ifLevel', 'When it ends level')}
                             options={[['penalties', tt('stages.drawPens', 'Penalties')],
                                       ['winner_named', tt('stages.drawNamed', 'The organiser names the winner')]]}
                             onChange={v => setSetting(index, 'draws', v)} />
                    </div>
                  )}
                  {table && (
                    <p className={styles.note}>{tt('stages.drawsCountNote', 'A level match is a draw here and both sides get the draw points.')}</p>
                  )}
                </div>

                {/* Match day. */}
                <p className={styles.subhead}>{tt('stages.matchDay', 'Match day')}</p>
                <div className={styles.fields}>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>{tt('stages.checkIn', 'Check in before each match')}</span>
                    <Chips value={Number(s.check_in_minutes || 0)} disabled={busy} label={tt('stages.checkIn', 'Check in before each match')}
                           options={CHECK_IN.map(n => [n, n ? tt('stages.minutesN', '{n} min').replace('{n}', n) : tt('stages.off', 'Off')])}
                           onChange={v => setSetting(index, 'check_in_minutes', v)} />
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>{tt('stages.roomHost', 'Who makes the room in the game')}</span>
                    <Chips value={s.room_host || 'p1'} disabled={busy} label={tt('stages.roomHost', 'Who makes the room in the game')}
                           options={[['p1', tt('stages.hostFirst', 'The side listed first')],
                                     ['p2', tt('stages.hostSecond', 'The side listed second')],
                                     ['organiser', tt('stages.hostOrganiser', 'The organiser')]]}
                           onChange={v => setSetting(index, 'room_host', v)} />
                  </div>
                </div>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>{tt('stages.roomSettings', 'What to set up in the game (players see this on every match)')}</span>
                  <input className={styles.text} maxLength={400} disabled={busy}
                         value={roomText(tt, s.room_settings)}
                         placeholder={tt('stages.roomSettingsPlaceholder', 'For example: 6 minute halves, extra time and penalties on')}
                         onChange={e => setSetting(index, 'room_settings', e.target.value)} />
                </label>

                {/* How people arrive in this stage. */}
                {index > 0 && <>
                  <p className={styles.subhead}>{tt('stages.arrival', 'Who plays in this stage')}</p>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>{tt('stages.placement', 'How the ones coming through are placed')}</span>
                    <Chips value={row.placement || 'cross'} disabled={busy} label={tt('stages.placement', 'How the ones coming through are placed')}
                           options={[['cross', tt('stages.placeCross', 'Group winners meet runners-up of another group')],
                                     ['by_record', tt('stages.placeRecord', 'By record')],
                                     ['random', tt('stages.placeRandom', 'At random')]]}
                           onChange={v => setField(index, 'placement', v)} />
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>{tt('stages.direct', 'Seeded straight into this stage (they skip the stages before)')}</span>
                    {entrants.length === 0
                      ? <p className={styles.note}>{tt('stages.directNone', 'Nobody has entered yet.')}</p>
                      : <div className={styles.chips}>
                          {entrants.map(p => (
                            <button key={p.registration_id} type="button" disabled={busy}
                                    className={`${styles.chip} ${row.direct_entrants.includes(p.registration_id) ? styles.chipOn : ''}`}
                                    aria-pressed={row.direct_entrants.includes(p.registration_id)}
                                    onClick={() => toggleDirect(index, p.registration_id)}>
                              {p.participant?.name || '-'}
                            </button>
                          ))}
                        </div>}
                  </div>
                </>}

                {/* When and where. Blank is the tournament's own. */}
                <p className={styles.subhead}>{tt('stages.whenWhere', 'When and where (blank is the tournament’s own)')}</p>
                <div className={styles.fields}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>{tt('stages.startsAt', 'Starts')}</span>
                    <DateField withTime value={row.starts_at} disabled={busy}
                               onChange={e => setField(index, 'starts_at', e.target.value)} />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>{tt('stages.endsAt', 'Ends')}</span>
                    <DateField withTime value={row.ends_at} disabled={busy}
                               onChange={e => setField(index, 'ends_at', e.target.value)} />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>{tt('stages.placeType', 'Played')}</span>
                    <select className={styles.select} value={row.place_type} disabled={busy}
                            onChange={e => setField(index, 'place_type', e.target.value)}>
                      <option value="">{tt('stages.placeSame', 'Same as the tournament')}</option>
                      <option value="online">{tt('stages.place.online', 'Online')}</option>
                      <option value="physical">{tt('stages.place.physical', 'At a venue')}</option>
                      <option value="hybrid">{tt('stages.place.hybrid', 'Both')}</option>
                    </select>
                  </label>
                </div>
                {(row.place_type === 'physical' || row.place_type === 'hybrid') && (
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>{tt('stages.location', 'Where')}</span>
                    <input className={styles.text} value={row.location} disabled={busy}
                           placeholder={tt('stages.locationPlaceholder', 'The address people turn up to')}
                           onChange={e => setField(index, 'location', e.target.value)} />
                  </label>
                )}
                {(row.place_type === 'online' || row.place_type === 'hybrid') && (
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>{tt('stages.virtualLink', 'The link')}</span>
                    <input className={styles.text} value={row.virtual_link} disabled={busy}
                           placeholder="https://"
                           onChange={e => setField(index, 'virtual_link', e.target.value)} />
                  </label>
                )}
              </div>
            );
          })}

          <div className={styles.editorActions}>
            <button type="button" className={styles.ghost} onClick={addRow} disabled={busy}>
              <LuPlus aria-hidden="true" /> {tt('stages.addStage', 'Add a stage')}
            </button>
            <button type="button" className={styles.save} onClick={savePlan} disabled={busy}>
              {busy ? tt('stages.saving', 'Saving…') : tt('stages.savePlan', 'Save the plan')}
            </button>
            <button type="button" className={styles.quiet} onClick={() => setDraft(null)}
                    disabled={busy}>
              {tt('ui.cancel.0f8e', 'Cancel')}
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------- confirming who goes through */}
      {closing && (
        <div className={styles.confirm}>
          <p className={styles.confirmTitle}>
            {tt('stages.confirmTitle', 'Closing {stage}')
              .replace('{stage}', closing.row.label)}
          </p>
          {!closing.finished ? (
            <p className={styles.problem}>
              {tt('stages.notFinished', '{n} matches in this stage are still to be decided. Record them first.')
                .replace('{n}', closing.open)}
            </p>
          ) : (
            <>
              <p className={styles.hint}>
                {closing.next?.placement === 'random'
                  ? tt('stages.confirmHintRandom',
                    'These go through to {next}. {next} places them at random when it is drawn, in the same press, so the order here does not decide who meets whom.')
                    .replace(/\{next\}/g, closing.next?.label || '')
                  : tt('stages.confirmHint2',
                    'These go through to {next}, in this seed order, as the stage’s own table has them. Move anybody up or down if you need to, then send them through. {next} is drawn in the same press.')
                    .replace(/\{next\}/g, closing.next?.label || '')}
              </p>
              <ol className={styles.through}>
                {closing.through.map((entry, i) => (
                  <li key={entry.registration_id} className={styles.throughRow}>
                    <span className={styles.order}>{i + 1}</span>
                    <span className={styles.throughName}>
                      {entry.name}
                      {entry.handle && entry.handle !== entry.name ? ` @${entry.handle}` : ''}
                      {entry.group ? ` (${tt('bracket.groupN', 'Group {g}').replace('{g}', groupLetter(entry.group))}, ${entry.rank})` : ''}
                    </span>
                    <span className={styles.rowActions}>
                      <button type="button" className={styles.iconBtn} disabled={busy || i === 0}
                              aria-label={tt('rules.moveUp', 'Move up')} onClick={() => moveThrough(i, -1)}>
                        <LuArrowUp aria-hidden="true" />
                      </button>
                      <button type="button" className={styles.iconBtn} disabled={busy || i === closing.through.length - 1}
                              aria-label={tt('rules.moveDown', 'Move down')} onClick={() => moveThrough(i, 1)}>
                        <LuArrowDown aria-hidden="true" />
                      </button>
                    </span>
                  </li>
                ))}
              </ol>
              {(closing.next?.direct_entrants_named || []).length > 0 && (
                <p className={styles.hint}>
                  {tt('stages.joiningToo', 'Also joining {next}, invited straight in: {names}.')
                    .replace('{next}', closing.next?.label || '')
                    .replace('{names}', closing.next.direct_entrants_named.map(e => e.name).join(', '))}
                </p>
              )}
            </>
          )}
          <div className={styles.editorActions}>
            {closing.finished && (
              <button type="button" className={styles.save} disabled={busy || !closing.through.length}
                      onClick={() => confirmClose(Boolean(closing.disputes))}>
                {closing.disputes
                  ? tt('stages.advanceAnyway', 'Advance anyway')
                  : tt('stages.advanceNow', 'Send these through')}
              </button>
            )}
            <button type="button" className={styles.quiet} disabled={busy}
                    onClick={() => { setClosing(null); setProblem(''); }}>
              {tt('ui.cancel.0f8e', 'Cancel')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
