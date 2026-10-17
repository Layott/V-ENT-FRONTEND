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
//  * EDITING AFTER THE START (CEO, 12 and 13 October 2026, inbox 450 and 452:
//    "edit their tournaments, including the formats/brackets, seeding and all
//    that even after the event has started"). The plan stays editable until
//    the tournament ends: a drawn stage keeps its format, groups and match
//    rules (what was played on them) and still changes its name, time, place
//    and, while it runs, how many go through. Each drawn stage can have its
//    draw undone or its format changed in one press; a closed one can be
//    opened again; a bracket drawn as one format becomes stage 1 so stages
//    can follow it. The server holds every rule (bracket_edit.py).

import { useCallback, useEffect, useRef, useState } from 'react';
import { LuArrowDown, LuArrowUp, LuPlus, LuX } from 'react-icons/lu';
import { apiMessage } from '@/lib/apiMessage';
import { formatLabel } from '@/lib/formatLabel';
import { lineWords } from '@/lib/stageGraph';
import StageGraph from '@/components/stage-graph/StageGraph';
import FeedsPanel from './FeedsPanel';
import { useT } from '@/i18n/LanguageProvider';
import DateField from '@/components/date-field/DateField';
import { formatWithZone, isoToLocalInput, localInputToISO } from '@/lib/datetime';
import { presetButton, roomText } from '@/components/view-tournament/match-room/matchWords';
import BRSettingsFields, { defaultBR } from './br/BRSettingsFields';
import { lobbyLabel } from './br/BRStandings';
import { plural } from '@/lib/plural';
import styles from './stages-panel.module.css';
import { useAutoRefresh } from '@/lib/useLiveData';

const API = process.env.NEXT_PUBLIC_API_URL;

// The English behind each place, which is also the dictionary fallback.
const PLACE_WORDS = {
  online: 'Online',
  physical: 'At a venue',
  hybrid: 'Online and at a venue',
};

const TABLE = new Set(['round_robin', 'league', 'ladder', 'aggregate_2v2', 'swiss']);
// A knockout for the purpose of how a match is played: a final, two legs,
// a winner when it ends level. The placing formats are knockouts too.
const KNOCKOUT = new Set(['single_elimination', 'double_elimination', 'stepladder',
  'page_playoff', 'winner_stays_on', 'bracket_groups']);
// The table formats whose fixtures can follow FIDE's Berger tables (P3 W1).
const BERGER = new Set(['round_robin', 'league', 'ladder', 'aggregate_2v2']);
const GROUPABLE = new Set(['round_robin', 'league', 'ladder', 'aggregate_2v2', 'bracket_groups']);
// How many go through each bracket group: 1 is the group's winner (the
// bracket played to one winner), more is the group's threshold (P3 W1).
const GROUP_THROUGH = [1, 2, 4, 8];
const BEST_OF = [1, 2, 3, 5, 7];
// The seeding a redraw can use: the same choices the first draw offers.
const SEEDING = [
  ['ranked', 'seed.ranked', 'By results'],
  ['registration', 'seed.registration', 'Who signed up first'],
  ['random', 'seed.random', 'Draw at random'],
];

/** Drawn, or past drawn: what was played on it is fixed. */
const isDrawn = row => Boolean(row?.drawn_at) || Boolean(row?.status && row.status !== 'pending');
const CHECK_IN = [0, 5, 10, 15, 30];

const defaultSettings = format => (format === 'battle_royale' ? defaultBR() : TABLE.has(format)
  ? { best_of: 1, draws: 'allowed', check_in_minutes: 0, room_host: 'p1', room_settings: '',
      ...(format === 'swiss' ? { rounds: 0, win_target: 0, loss_limit: 0, pairing: 'monrad', decisive_best_of: 0 }
        : { legs: format === 'league' ? 2 : 1, pairing: 'circle' }) }
  : { best_of: 1, final_best_of: 0, knockout_legs: 1, draws: 'penalties', check_in_minutes: 0,
      room_host: 'p1', room_settings: '',
      ...(format === 'single_elimination'
        ? { third_place: false, every_place: false, threshold: 0, reseed: false } : {}),
      ...(format === 'winner_stays_on' ? { streak_target: 0, max_matches: 0 } : {}),
      ...(format === 'double_elimination' ? { grand_final: 'reset', threshold: 0 } : {}),
      ...(format === 'bracket_groups'
        ? { bracket: 'double', threshold: 2, group_size: 4, grand_final: 'none' } : {}),
      ...(format === 'custom_bracket' ? { preset: '', schema_text: '' } : {}) });

// How a Swiss pairs the rounds after the first (P3 W1), and its word.
const SWISS_PAIRINGS = [
  ['monrad', 'stages.pairMonrad', 'Monrad'],
  ['dutch', 'stages.pairDutch', 'Dutch'],
  ['valve', 'stages.pairValve', 'Valve'],
];
// The tie-breaks that read opponents' win percentages, which have a floor.
const OWP_KEYS = ['opponents_win_pct', 'opp_opp_win_pct'];

// Stop when this many are left (P3 W1). 0 plays to one winner; in a double
// elimination 2 is the same as no grand final.
const THRESHOLDS = [0, 2, 4, 8, 16];

const POINT_FIELDS = ['points_win', 'points_draw', 'points_loss', 'points_bye'];

/** A stage's scoring as the server reads it; null means the standard. */
const rulesPayload = r => {
  if (!TABLE.has(r.format)) return null;
  const rules = r.rules || {};
  const out = {};
  POINT_FIELDS.forEach(key => {
    if (rules[key] !== '' && rules[key] !== undefined && rules[key] !== null) out[key] = Number(rules[key]);
  });
  if (Array.isArray(rules.tiebreakers) && rules.tiebreakers.length) out.tiebreakers = rules.tiebreakers;
  if (rules.buchholz) out.buchholz = rules.buchholz;
  if (rules.owp_floor !== '' && rules.owp_floor !== undefined && rules.owp_floor !== null) {
    out.owp_floor = Number(rules.owp_floor);
  }
  return Object.keys(out).length ? out : null;
};

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

// `can` is what the viewer holds here (P7, from /access/): `structure` changes
// the plan, a stage's format and adopts a drawn bracket; `place` draws a stage,
// closes it, sends a line and undoes or reopens a draw; `manage` (the
// organiser) asks entrants for their in-game ID, which is an entry rule.
export default function StagesPanel({ tournamentRef, token, can = {}, showToast, onChanged }) {
  const tt = useT();
  const canShape = Boolean(can.structure);
  const canPlace = Boolean(can.place);
  const canManage = Boolean(can.manage);

  const [rows, setRows] = useState([]);
  const [catalogue, setCatalogue] = useState([]);
  const [preset, setPreset] = useState(null);
  // Whole setups a stage can start from (P3 W1): the Counter-Strike Major Swiss.
  const [formatPresets, setFormatPresets] = useState({});
  // The ready-made custom brackets and the fields each is proven on (P3 W2).
  const [customPresets, setCustomPresets] = useState([]);
  const [entrants, setEntrants] = useState([]);
  // The free for all bracket builder (P3 W1): its numbers while open, and
  // the rounds of the plan it last wrote.
  const [ffa, setFfa] = useState(null);
  const [ffaRounds, setFfaRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);

  // The plan being edited, held apart from what is saved so leaving the panel
  // without pressing Save changes nothing.
  const [draft, setDraft] = useState(null);
  // The links between stages (P1b, design section 6): who goes where, and
  // when. `lines` is what the server has; `draftLines` is edited beside the
  // draft, naming its stages by the draft row's `key`, because a new stage
  // has no id yet.
  const [lines, setLines] = useState([]);
  const [draftLines, setDraftLines] = useState([]);
  const keySeq = useRef(0);
  const newKey = () => { keySeq.current += 1; return `new-${keySeq.current}`; };
  // The stage being closed: the server's list of who goes through, which the
  // organiser may reorder before committing.
  const [closing, setClosing] = useState(null);
  // Whether entrants must have their in-game ID (FC Mobile user ID, eFootball
  // owner ID) on their profile to enter. The requirement already existed
  // (`game_details`); the football preset is where an organiser needs it.
  const [idRequired, setIdRequired] = useState(null);
  // What the server says about editing after the start: a bracket drawn as
  // one format (offered as stage 1), whether the tournament is over (nothing
  // changes then), and how many results each drawn stage holds.
  const [meta, setMeta] = useState({ oneFormat: false, finished: false, played: {} });
  // A stage tool in progress: { row, kind: 'undo' | 'format' | 'reopen' },
  // plus the choices for a format change.
  const [acting, setActing] = useState(null);

  const auth = token ? { Authorization: `Bearer ${token}` } : {};

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!tournamentRef) { setLoading(false); return; }
    setProblem('');
    try {
      const res = await fetch(`${API}/tournament/${tournamentRef}/stages/`, { headers: auth });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setRows(body.data.stages || []);
        setLines(body.data.progressions || []);
        setCatalogue(body.data.catalogue || []);
        setPreset(body.data.preset || null);
        setFormatPresets(body.data.format_presets || {});
        setCustomPresets(body.data.custom_presets || []);
        setMeta({
          oneFormat: Boolean(body.data.one_format_drawn),
          finished: Boolean(body.data.finished),
          played: body.data.played || {},
        });
      } else {
        if (!quiet) setProblem(apiMessage(tt, body, 'stages.loadFailed',
          'Could not load how this tournament is shaped.'));
      }
    } catch {
      if (!quiet) setProblem(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
    } finally {
      setLoading(false);
    }
  }, [tournamentRef, token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);
  // Current without a reload: on a timer, and at once after any save on this
  // page (CEO, 28 September 2026, inbox 312: "all page should be like this").
  // Except our own save: its answer already carried the plan, so the wake it
  // sets off would only read it again (inbox 487).
  const savedAt = useRef(0);
  useAutoRefresh(() => (Date.now() - savedAt.current < 2000 ? false : load({ quiet: true })));

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

  // On whether there is a preset, not on the preset object: every refresh
  // hands back a new object, so this re-read the requirements every 15
  // seconds and after every save (inbox 487).
  const hasPreset = Boolean(preset);
  useEffect(() => { if (canManage && hasPreset) loadIdRequirement(); }, [canManage, hasPreset, loadIdRequirement]);

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
    // One going through is "the winner", never "the top 1" (walk, 16 October
    // 2026: the French read "Les 1 premiers de chaque poule passent").
    if (row.format === 'battle_royale' && row.settings?.advance_by === 'lobby') {
      return plural(tt, row.advances,
        'stages.lineLobbiesOne', '{format}. The winner of each lobby goes through.',
        'stages.lineLobbies', '{format}. The top {n} of each lobby go through.')
        .replace('{format}', name);
    }
    if (row.format === 'gsl') {
      return tt('stages.lineGsl', '{format}. The top two of each group of four go through.')
        .replace('{format}', name);
    }
    if (row.format === 'bracket_groups' && !(row.groups > 1)) {
      // No group count of its own: the groups come from the group size (P3 W1).
      return plural(tt, row.advances,
        'stages.lineGroupSizeOne', '{format} in groups of {size}. The winner of each group goes through.',
        'stages.lineGroupSize', '{format} in groups of {size}. The top {n} of each group go through.')
        .replace('{format}', name)
        .replace('{size}', row.settings?.group_size || 4);
    }
    if (row.groups > 1) {
      return plural(tt, row.advances,
        'stages.lineGroupsOne', '{format} in {groups} groups. The winner of each group goes through.',
        'stages.lineGroups', '{format} in {groups} groups. The top {n} of each group go through.')
        .replace('{format}', name)
        .replace('{groups}', row.groups);
    }
    return plural(tt, row.advances,
      'stages.lineOne', '{format} in one field. The winner goes through.',
      'stages.line', '{format} in one field. The top {n} go through.')
      .replace('{format}', name);
  };

  // How a stage's matches are played, in words, for the plan view.
  const playedAs = row => {
    const s = row.settings || {};
    const bits = [];
    if (row.format === 'battle_royale') {
      bits.push(tt('stages.brLobbies', 'lobbies of up to {n} squads').replace('{n}', s.lobby_size || 12));
      bits.push(plural(tt, s.maps || 6, 'stages.brMapsOne', '{n} match each', 'stages.brMapsMany', '{n} matches each'));
      bits.push(tt('stages.brKill', '{n} a kill').replace('{n}', s.per_kill ?? 1));
      if (s.match_point) bits.push(tt('stages.brMatchPoint', 'match point at {n}').replace('{n}', s.match_point));
      // The head start is part of how the stage is played, and a squad
      // deciding whether first place is worth chasing needs to see it
      // (walk, 28 September 2026: it was set and said nowhere).
      const carried = Object.entries(s.carry_over || {}).filter(([, v]) => Number(v) > 0)
        .sort((a, b) => Number(a[0]) - Number(b[0]));
      if (carried.length) {
        bits.push(tt('stages.brCarry', 'a head start in the next stage: {list}').replace('{list}', carried
          .map(([place, pts]) => tt('stages.brCarryOne', 'place {n} +{pts}').replace('{n}', place).replace('{pts}', pts))
          .join(', ')));
      }
      return bits.join(', ');
    }
    if (s.every_place) bits.push(tt('stages.everyPlaceOn', 'a match for every place'));
    if (row.format === 'bracket_groups') {
      bits.push(tt('stages.perGroupOn', '{n} through from each group')
        .replace('{n}', Number(s.threshold) > 1 ? s.threshold : 1));
    } else if (Number(s.threshold) > 1) {
      bits.push(tt('stages.thresholdOn', 'stops when {n} are left').replace('{n}', s.threshold));
    } else if (s.grand_final === 'none') {
      bits.push(tt('stages.noGrandFinal', 'no grand final'));
    }
    if (s.reseed) bits.push(tt('stages.reseedOn', 'paired again by seed each round'));
    if (row.format === 'bracket_groups') {
      bits.push(formatLabel(tt, s.bracket === 'single' ? 'single_elimination' : 'double_elimination', ''));
    }
    if (s.pairing === 'berger') bits.push(tt('stages.bergerOn', 'in Berger order'));
    if (row.format === 'winner_stays_on') {
      bits.push(s.streak_target
        ? tt('stages.streakOn', 'until {n} wins in a row').replace('{n}', s.streak_target)
        : tt('stages.onePass', 'one challenge each'));
    }
    if (s.knockout_legs > 1) bits.push(tt('stages.twoLegs', 'two legs'));
    else bits.push(tt('stages.bestOfN', 'best of {n}').replace('{n}', s.best_of || 1));
    if (s.final_best_of) bits.push(tt('stages.finalBestOfN', 'final best of {n}').replace('{n}', s.final_best_of));
    if (s.third_place) bits.push(tt('stages.thirdPlaceOn', 'a third-place match'));
    if (s.grand_final === 'reset') bits.push(tt('stages.resetOn', 'grand final with a reset'));
    if (s.legs > 1) bits.push(tt('stages.homeAway', 'home and away'));
    if (row.format === 'swiss' && s.rounds) bits.push(tt('stages.roundsN', '{n} rounds').replace('{n}', s.rounds));
    if (row.format === 'swiss' && s.pairing && s.pairing !== 'monrad') {
      const found = SWISS_PAIRINGS.find(([v]) => v === s.pairing);
      if (found) bits.push(tt('stages.pairedBy', 'paired {how}').replace('{how}', tt(found[1], found[2])));
    }
    if (Number(s.decisive_best_of) > 0) {
      bits.push(tt('stages.decisiveOn', 'a match that decides is best of {n}').replace('{n}', s.decisive_best_of));
    }
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
    // A battle royale has lobbies, not a first round: nobody "meets" anybody,
    // they are spread across lobbies by how they finished (walk, 28 September).
    const how = row.format === 'battle_royale' && row.placement !== 'random'
      ? tt('stages.placeLobbies', 'Spread across the lobbies by how they finished')
      : placed;
    const bits = [tt('stages.placedAs', 'Placed: {how}').replace('{how}', how)];
    const invited = (row.direct_entrants_named || []).map(e => e.name).filter(Boolean);
    if (invited.length) {
      bits.push(tt('stages.invitedIn', 'Straight in: {names}').replace('{names}', invited.join(', ')));
    }
    return bits.join('. ');
  };

  // ------------------------------------------------ the links (P1b)
  const outOf = id => lines.filter(l => l.source === id)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const into = id => lines.filter(l => l.target === id);
  const labelOf = id => rows.find(r => r.id === id)?.label || '';

  // "Places 1 to 2 of each group go to Playoff, in the upper bracket." One
  // sentence, shared with the stage graph (src/lib/stageGraph.js).
  const lineSentence = (line, sourceRow, targetLabel) => lineWords(tt, line, sourceRow, targetLabel);

  // A plan that is only a chain (each stage into the next, from the top
  // places, nothing else) reads as it always has.
  const plainChain = lines.every(l => {
    const si = rows.findIndex(r => r.id === l.source);
    const ti = rows.findIndex(r => r.id === l.target);
    return ti === si + 1 && Number(l.place_from) === 1 && (l.group === null || l.group === undefined)
      && l.side === 'any' && !l.carry_points && l.fire === 'after_preview';
  }) && rows.every(r => outOf(r.id).length <= 1);

  const formatSentence = row => {
    const name = formatLabel(tt, row.format, row.format_label);
    return Number(row.groups) > 1
      ? tt('stages.lineFormatGroups', '{format} in {groups} groups.').replace('{format}', name).replace('{groups}', row.groups)
      : tt('stages.lineFormatOne', '{format} in one field.').replace('{format}', name);
  };

  // The stage that decides the tournament: the one no link leaves, fed by
  // the best places.
  const topSinkId = (() => {
    const sinks = rows.filter(r => outOf(r.id).length === 0);
    const best = r => Math.min(...into(r.id).map(l => Number(l.place_from) || 1), 1e9);
    return sinks.sort((a, b) => best(a) - best(b) || a.order - b.order)[0]?.id;
  })();

  const newLine = (source, target, placeTo = 2) => ({
    k: newKey(), id: null, source, target, group: null, place_from: 1, place_to: placeTo,
    side: 'any', carry_points: false, fire: 'after_preview', fired: false,
  });
  const setLine = (k, key, value) => setDraftLines(prev => prev.map(l => (l.k === k ? { ...l, [key]: value } : l)));
  // Changing where a link goes clears a side the new stage does not have.
  const setLineTarget = (k, key) => setDraftLines(prev => prev.map(l => {
    if (l.k !== k) return l;
    const target = (draft || []).find(r => r.key === key);
    return { ...l, target: key, side: target?.format === 'double_elimination' ? l.side : 'any' };
  }));
  const removeLine = k => setDraftLines(prev => prev.filter(l => l.k !== k || l.fired));
  const addLine = sourceKey => {
    const at = draft.findIndex(r => r.key === sourceKey);
    const target = draft[at + 1] || draft.find(r => r.key !== sourceKey);
    if (target) setDraftLines([...draftLines, newLine(sourceKey, target.key)]);
  };

  const sendLine = async (row, line) => {
    setBusy(true);
    setProblem('');
    try {
      const res = await fetch(`${API}/tournament/${tournamentRef}/stages/${row.id}/lines/${line.id}/pull/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...auth }, body: '{}',
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        after();
        if (showToast) showToast(tt('stages.lines.sentToast', 'Sent to {target}.').replace('{target}', labelOf(line.target)));
        return;
      }
      setProblem(apiMessage(tt, body, 'stages.lines.sendFailed', 'That link was not sent.'));
    } catch {
      networkFail();
    } finally {
      setBusy(false);
    }
  };

  const blank = format => ({
    key: newKey(),
    format, label: '', advances: format === 'round_robin' ? 2 : 0, groups: 0,
    starts_at: '', ends_at: '', place_type: '', location: '', virtual_link: '',
    placement: 'cross', direct_entrants: [], settings: defaultSettings(format),
    rules: {},
  });

  const startEditing = () => {
    loadEntrants();
    if (!rows.length) {
      const first = blank('round_robin');
      const second = blank('single_elimination');
      setDraft([first, second]);
      setDraftLines([newLine(first.key, second.key)]);
      return;
    }
    setDraftLines(lines.map(l => ({
      k: newKey(), id: l.id || null, source: String(l.source), target: String(l.target),
      group: l.group ?? null, place_from: l.place_from, place_to: l.place_to, side: l.side,
      carry_points: Boolean(l.carry_points), fire: l.fire, fired: Boolean(l.fired_at),
    })));
    setDraft(rows.length
      ? rows.map(r => ({
          key: String(r.id),
          // The id is how the server knows a drawn stage is still the same
          // stage (it keeps what was played on it); a new row has none.
          id: r.id,
          drawn: isDrawn(r),
          closed: r.status === 'complete',
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
          // The stage's own scoring. It was never sent back, so saving the
          // plan wiped whatever a stage had (P0, 16 October 2026).
          rules: r.rules || {},
        }))
      : [blank('round_robin'), blank('single_elimination')]);
  };

  const setField = (index, key, value) => setDraft(prev => prev.map(
    (row, i) => (i === index
      ? (key === 'format'
        // A new format brings its own switches; the old ones mean nothing.
        ? { ...row, format: value, settings: defaultSettings(value),
            groups: GROUPABLE.has(value) ? row.groups : 0,
            rules: { ...(row.rules || {}), tiebreakers: [] } }
        : { ...row, [key]: value })
      : row)));

  const setSetting = (index, key, value) => setDraft(prev => prev.map(
    (row, i) => (i === index ? { ...row, settings: { ...row.settings, [key]: value } } : row)));

  // A stage's scoring: points and the tie-breakers in the organiser's order.
  const setRule = (index, key, value) => setDraft(prev => prev.map(
    (row, i) => (i === index ? { ...row, rules: { ...(row.rules || {}), [key]: value } } : row)));
  const setTies = (index, change) => setDraft(prev => prev.map((row, i) => {
    if (i !== index) return row;
    const list = change([...((row.rules || {}).tiebreakers || [])]);
    return { ...row, rules: { ...(row.rules || {}), tiebreakers: list } };
  }));
  const addTie = (index, key) => setTies(index, list => (list.includes(key) ? list : [...list, key]));
  const removeTie = (index, at) => setTies(index, list => list.filter((_k, i) => i !== at));
  const moveTie = (index, at, by) => setTies(index, list => {
    const to = at + by;
    if (to < 0 || to >= list.length) return list;
    [list[at], list[to]] = [list[to], list[at]];
    return list;
  });

  const applyFormatPreset = (index, key) => setDraft(prev => prev.map((row, i) => {
    const chosen = formatPresets[key];
    if (i !== index || !chosen || chosen.format !== row.format) return row;
    return { ...row, settings: { ...row.settings, ...chosen.settings },
             rules: { ...(row.rules || {}), ...chosen.rules } };
  }));

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

  // A drawn stage stays where it was played: it neither moves nor is passed.
  const move = (index, by) => setDraft(prev => {
    const next = [...prev];
    const to = index + by;
    if (to < 0 || to >= next.length) return prev;
    if (next[index].drawn || next[to].drawn) return prev;
    [next[index], next[to]] = [next[to], next[index]];
    return next;
  });

  // A stage added at the end is fed from the one before it, as adding a
  // stage always meant, when that format can feed it.
  const addRow = () => {
    const row = blank('single_elimination');
    const last = draft[draft.length - 1];
    const fmt = catalogue.find(f => f.key === last?.format);
    setDraft([...draft, row]);
    if (last && (fmt?.can_feed_into || []).includes(row.format)) {
      setDraftLines([...draftLines, newLine(last.key, row.key)]);
    }
  };
  // A free for all bracket as a plan (P3 W1): the server writes the rounds
  // of lobbies and the lines between them, and the draft takes them whole.
  const buildFfa = async () => {
    if (!ffa) return;
    setBusy(true);
    setProblem('');
    try {
      const query = new URLSearchParams({ kind: 'ffa_bracket', entrants: ffa.entrants,
        lobby_size: ffa.lobby_size, through: ffa.through, maps: ffa.maps, final_maps: ffa.final_maps });
      const res = await fetch(`${API}/tournament/${tournamentRef}/stages/preset/?${query}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.status !== 'success') {
        setProblem(apiMessage(tt, body, 'stages.ffaFailed', 'That bracket could not be built.'));
        return;
      }
      const made = (body.data.stages || []).map(s => ({
        ...blank('battle_royale'),
        label: s.kind === 'final'
          ? tt('stages.ffaFinal', 'Final lobby')
          : tt('stages.ffaRound', 'Round {n}').replace('{n}', s.round),
        advances: s.advances,
        settings: { ...defaultSettings('battle_royale'), ...s.settings },
      }));
      setDraft(made);
      setDraftLines((body.data.lines || []).map(l => ({
        ...newLine(made[l.source].key, made[l.target].key, l.place_to),
        place_from: l.place_from,
      })));
      setFfaRounds(body.data.rounds || []);
      setFfa(null);
    } catch {
      networkFail();
    } finally {
      setBusy(false);
    }
  };

  const removeRow = index => {
    const row = draft[index];
    if (!row || row.drawn) return;
    setDraft(draft.filter((_, i) => i !== index));
    setDraftLines(draftLines.filter(l => l.source !== row.key && l.target !== row.key));
  };

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
            ...(r.id ? { id: r.id } : {}),
            format: r.format,
            label: r.label || '',
            // What the screen shows, not what the row last held: the last
            // stage reads "Nobody advances" (0) and GSL "fixed at two" in a
            // disabled field, but the row kept its old number. Removing the
            // second default stage left round robin's 2 on the only stage,
            // and the plan could never be saved (production walk, 28
            // September 2026).
            advances: index === draft.length - 1 ? 0
              : r.format === 'gsl' ? 2 : (Number(r.advances) || 0),
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
            rules: rulesPayload(r),
          })),
          // The links, naming their stages by position in this plan.
          progressions: draftLines
            .map((l, order) => ({ l, order, source: draft.findIndex(r => r.key === l.source),
                                  target: draft.findIndex(r => r.key === l.target) }))
            .filter(x => x.source >= 0 && x.target >= 0)
            .map(({ l, order, source, target }) => ({
              ...(l.id ? { id: l.id } : {}), source, target,
              group: l.group === null || l.group === '' || l.group === undefined ? null : Number(l.group),
              place_from: Number(l.place_from) || 1, place_to: Number(l.place_to) || 0,
              side: l.side, carry_points: Boolean(l.carry_points), fire: l.fire, order,
            })),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        savedAt.current = Date.now();
        setRows(body.data.stages || []);
        setLines(body.data.progressions || []);
        setDraft(null);
        if (showToast) showToast(tt('stages.saved', 'The plan is saved.'));
        if (onChanged) onChanged();
        return;
      }
      const where = Number.isInteger(body.stage_index)
        ? ` ${tt('stages.atStage', '(stage {n})').replace('{n}', body.stage_index + 1)}`
        : Number.isInteger(body.detail?.line_index)
          ? ` ${tt('stages.atLine', '(link {n})').replace('{n}', body.detail.line_index + 1)}`
          : '';
      setProblem(apiMessage(tt, body, 'stages.saveFailed',
        'That plan was not saved.') + where);
    } catch {
      networkFail();
    } finally {
      setBusy(false);
    }
  };

  // `early` draws a knockout before the stages feeding it finish, every seat
  // waiting for its place (P1d).
  const drawStage = async (row, early = false) => {
    setBusy(true);
    setProblem('');
    try {
      const res = await fetch(`${API}/tournament/${tournamentRef}/stages/${row.id}/draw/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify(early ? { early: true } : {}),
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
      const sending = (body.data.lines || []).filter(l => !l.fired_at);
      setClosing({ row, next: body.data.next, finished: body.data.finished,
                   open: body.data.open_matches, disputes: body.data.open_disputes > 0,
                   through: body.data.advancing || [],
                   // One link into the next stage reads as one list the
                   // organiser may reorder; several are shown link by link.
                   lines: sending,
                   perLine: sending.length > 1 || sending.some(l => l.fire === 'manual'),
                   // Closing a stage whose every link waits for a press sends
                   // nobody yet, and a next stage drawn early (P1d) is not
                   // drawn again: its seats fill. The panel said "{next} is
                   // drawn in the same press" in both cases (walk, 17 Oct).
                   manualOnly: sending.length > 0 && sending.every(l => l.fire === 'manual'),
                   seatsWaiting: Boolean(body.data.next?.drawn_at) });
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
          ...(closing.reordered && !closing.perLine ? { order: closing.through.map(r => r.registration_id) } : {}),
          ...(ignoreDisputes ? { ignore_disputes: true } : {}),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setClosing(null);
        after();
        if (showToast) {
          showToast(closing.manualOnly
            ? tt('stages.closedWaiting', '{stage} is closed. Press send when you want them in {next}.')
              .replace('{stage}', closing.row.label).replace('{next}', closing.next?.label || '')
            : tt('stages.advanced', '{n} go through to {next}.')
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

  // ---------------------------------------------- editing after the start
  //
  // One request per tool, each answered with a code the screen translates.
  // The refusals worth naming (a later stage already drawn, open disputes,
  // results in the way) come back from the server rather than being guessed
  // here, so the rule lives in one place.
  const stageTool = async (path, payload, done) => {
    setBusy(true);
    setProblem('');
    try {
      const res = await fetch(`${API}/tournament/${tournamentRef}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify(payload || {}),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setActing(null);
        if (showToast) showToast(done(body.data || {}));
        after();
        return;
      }
      setProblem(apiMessage(tt, body, 'stages.toolFailed', 'That change was not made.'));
    } catch {
      networkFail();
    } finally {
      setBusy(false);
    }
  };

  const adoptBracket = () => stageTool('stages/adopt/', {}, () =>
    tt('stages.adopted', 'The bracket is the first stage now. Add stages after it, or change its format.'));

  const undoDraw = row => stageTool(`stages/${row.id}/undraw/`,
    { discard_results: Number(meta.played[row.id] || 0) > 0 },
    () => tt('stages.undrawn', 'The draw for {stage} is undone. Change it and draw it again when you are ready.')
      .replace('{stage}', row.label));

  const reopenStage = row => stageTool(`stages/${row.id}/reopen/`, {},
    () => tt('stages.reopened', '{stage} is open again.').replace('{stage}', row.label));

  const reformatStage = (row, index) => {
    const a = acting || {};
    const last = index === rows.length - 1;
    stageTool(`stages/${row.id}/reformat/`, {
      format: a.format,
      ...(GROUPABLE.has(a.format) ? { groups: Number(a.groups) || 0 } : { groups: 0 }),
      ...(last ? {} : { advances: a.format === 'gsl' ? 2 : (Number(a.advances) || 0) }),
      seed_strategy: a.seeding || 'ranked',
      discard_results: Number(meta.played[row.id] || 0) > 0,
      draw: true,
    }, data => tt('stages.reformatted', '{stage} is now {format}, drawn again: {n} matches.')
      .replace('{stage}', row.label)
      .replace('{format}', formatLabel(tt, a.format, ''))
      .replace('{n}', data?.draw?.matches_created ?? 0));
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
        {/* Until the tournament ends, not just until the first draw. A bracket
            drawn as one format is adopted as stage 1 first (below). */}
        {canShape && !draft && !meta.finished && !(rows.length === 0 && meta.oneFormat) && (
          <button type="button" className={styles.ghost} disabled={busy} onClick={startEditing}>
            {rows.length
              ? tt('stages.edit', 'Change the plan')
              : tt('stages.compose', 'Run this in stages')}
          </button>
        )}
      </div>

      {/* While a plan is being edited the refusal is drawn beside its save
          button instead: up here it sat 2,000px above the button on a long
          plan, and pressing save seemed to do nothing (walk of P3, 17
          October 2026). */}
      {problem && !draft && <p className={styles.problem} role="alert">{problem}</p>}

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

      {/* A bracket already drawn as one format. Making it stage 1 keeps every
          match and result exactly as played, and is what lets a stage follow
          it, or its format be changed and drawn again. */}
      {!draft && rows.length === 0 && meta.oneFormat && canShape && !meta.finished && (
        <div className={styles.idRow}>
          <p className={styles.stageLine}>
            {tt('stages.adoptHint', 'The bracket is drawn. To add stages after it, or to play it as a different format, make it the first stage. Every match and result stays as it is.')}
          </p>
          <button type="button" className={styles.ghost} disabled={busy} onClick={adoptBracket}>
            {tt('stages.adopt', 'Add stages or change the format')}
          </button>
        </div>
      )}

      {/* The plan as a picture (P1f): the same graph the public Path view
          draws, with what each stage is doing and who each line sent. */}
      {!draft && rows.length > 1 && (
        <div className={styles.graphWrap}>
          <StageGraph stages={rows} lines={lines} showState />
        </div>
      )}

      {!draft && rows.length > 0 && (
        <ol className={styles.list}>
          {rows.map((row, index) => {
            // The links decide the flow (P1b): a stage is drawn once every
            // link into it has sent its people, closed when it has links out.
            const ins = into(row.id);
            const outs = outOf(row.id);
            const fed = ins.length === 0 || ins.every(l => l.fired_at);
            const drawable = canPlace && !row.drawn_at && fed;
            // A knockout fed by links can be drawn before they send, seats
            // waiting for their places (P1d); its seats are fixed by place, so
            // only with the cross placement.
            const earlyDrawable = canPlace && !row.drawn_at && !fed && !meta.finished
              && ['single_elimination', 'double_elimination'].includes(row.format)
              && (row.placement || 'cross') === 'cross';
            const closable = canPlace && row.drawn_at && row.status !== 'complete' && outs.length > 0;
            // The tools for a stage already drawn. Not while a stage it feeds
            // is drawn on top of it (that one is undone first), and not once
            // the tournament is over.
            const nextDrawn = outs.some(l => isDrawn(rows.find(r => r.id === l.target)));
            // Changing the format is the structure's; undoing a draw and
            // reopening a closed stage are placing (P7).
            const tools = !meta.finished && !draft && !closing && isDrawn(row) && !nextDrawn;
            const running = tools && row.status !== 'complete';
            const reformable = running && canShape;
            const undoable = running && canPlace;
            const reopenable = tools && canPlace && row.status === 'complete' && outs.length > 0;
            const waitingToSend = canPlace && row.status === 'complete'
              ? outs.filter(l => l.fire === 'manual' && !l.fired_at && l.id) : [];
            return (
              <li key={row.id} className={styles.stage}>
                <span className={styles.order}>{index + 1}</span>
                <div className={styles.stageText}>
                  <span className={styles.stageName}>{row.label}</span>
                  {plainChain
                    ? <span className={styles.stageLine}>{sentence(row, index, rows)}</span>
                    : <>
                        <span className={styles.stageLine}>{formatSentence(row)}</span>
                        {outs.length
                          ? outs.map(l => (
                            <span key={l.id || `${l.source}-${l.target}-${l.place_from}`} className={styles.stageLine}>
                              {lineSentence(l, row, labelOf(l.target))}
                            </span>
                          ))
                          : <span className={styles.stageLine}>
                              {row.id === topSinkId
                                ? tt('stages.lineDecides', 'This decides the tournament.')
                                : tt('stages.lineSink', 'Their final places are decided here.')}
                            </span>}
                      </>}
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
                  {row.status === 'complete' && outs.length > 0 && (
                    <span className={styles.done}>
                      {/* Closed with a link still waiting for the press: "0 went
                          through" beside the send button read as a failure
                          (walk, 17 October 2026). */}
                      {(row.advanced || []).length === 0 && outs.some(l => l.fire === 'manual' && !l.fired_at)
                        ? tt('stages.closedSendWaiting', 'Closed. Nobody has gone through yet: press send when you are ready.')
                        : tt('stages.complete', 'Closed. {n} went through.')
                          .replace('{n}', (row.advanced || []).length)}
                    </span>
                  )}
                  {row.status === 'complete' && outs.length === 0 && (
                    <span className={styles.done}>{tt('stages.decided', 'Played. The tournament is decided.')}</span>
                  )}
                  {row.status === 'running' && (
                    <span className={styles.running}>
                      {row.finished
                        ? tt('stages.readyToClose', 'Every match is in. Ready to close.')
                        : tt('stages.running', 'Being played now')}
                    </span>
                  )}
                  {!row.drawn_at && !fed && (
                    <span className={styles.stageWhen}>
                      {ins.length > 1
                        ? tt('stages.lines.waitsForAll', 'Drawn when every stage that feeds it has sent its people.')
                        : tt('stages.waitsForPrevious', 'Drawn when the stage before it closes.')}
                    </span>
                  )}
                </div>

                {waitingToSend.map(l => (
                  <button key={l.id} type="button" className={styles.save} disabled={busy}
                          onClick={() => sendLine(row, l)}>
                    {tt('stages.lines.sendNow', 'Send to {target} now').replace('{target}', labelOf(l.target))}
                  </button>
                ))}
                {earlyDrawable && (
                  <button type="button" className={styles.ghost} disabled={busy}
                          onClick={() => drawStage(row, true)}>
                    {tt('stages.drawEarly', 'Draw it now with placeholders')}
                  </button>
                )}
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
                {(reformable || undoable || reopenable) && (
                  <span className={styles.stageTools}>
                    {reformable && (
                      <button type="button" className={styles.ghost} disabled={busy}
                              aria-pressed={acting?.row?.id === row.id && acting.kind === 'format'}
                              onClick={() => setActing({
                                row, kind: 'format', index, format: row.format,
                                groups: row.groups || 0, advances: row.advances || 0, seeding: 'ranked',
                              })}>
                        {tt('stages.changeFormat', 'Change the format')}
                      </button>
                    )}
                    {undoable && (
                      <button type="button" className={styles.ghost} disabled={busy}
                              aria-pressed={acting?.row?.id === row.id && acting.kind === 'undo'}
                              onClick={() => setActing({ row, kind: 'undo', index })}>
                        {tt('stages.undoDraw', 'Undo the draw')}
                      </button>
                    )}
                    {reopenable && (
                      <button type="button" className={styles.ghost} disabled={busy}
                              aria-pressed={acting?.row?.id === row.id && acting.kind === 'reopen'}
                              onClick={() => setActing({ row, kind: 'reopen', index })}>
                        {tt('stages.reopen', 'Open it again')}
                      </button>
                    )}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {!draft && planLocked && canShape && (
        <p className={styles.hint}>
          {meta.finished
            ? tt('stages.finishedNote', 'This tournament is finished, so its stages stay as they were played.')
            : tt('stages.afterStartNote', 'Some stages are drawn. The plan still changes: a drawn stage keeps its format, groups and match rules, and the buttons on it undo its draw or change its format. Stages not drawn yet change freely.')}
        </p>
      )}

      {/* ------------------------------------------- a stage tool, confirmed */}
      {acting && (
        <div className={styles.confirm}>
          <p className={styles.confirmTitle}>
            {acting.kind === 'format'
              ? tt('stages.formatTitle', 'Change the format of {stage}').replace('{stage}', acting.row.label)
              : acting.kind === 'undo'
                ? tt('stages.undoTitle', 'Undo the draw of {stage}').replace('{stage}', acting.row.label)
                : tt('stages.reopenTitle', 'Open {stage} again').replace('{stage}', acting.row.label)}
          </p>

          {acting.kind === 'format' && (
            <div className={styles.fields}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>{tt('stages.format', 'Played as')}</span>
                <select className={styles.select} value={acting.format} disabled={busy}
                        onChange={e => setActing(prev => ({ ...prev, format: e.target.value,
                          groups: GROUPABLE.has(e.target.value) ? prev.groups : 0 }))}>
                  {catalogue.map(f => (
                    <option key={f.key} value={f.key}>{formatLabel(tt, f.key, f.label)}</option>
                  ))}
                </select>
              </label>
              {GROUPABLE.has(acting.format) && (
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>{tt('stages.groups', 'Groups')}</span>
                  <input className={styles.number} type="number" min="0" max="64" value={acting.groups}
                         disabled={busy} onChange={e => setActing(prev => ({ ...prev, groups: e.target.value }))} />
                </label>
              )}
              {acting.index < rows.length - 1 && (
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>
                    {acting.format === 'gsl'
                      ? tt('stages.advancesGsl', 'Through, per group (fixed at two)')
                      : Number(acting.groups) > 1
                        ? tt('stages.advancesEach', 'Through, per group')
                        : tt('stages.advances', 'How many go through')}
                  </span>
                  <input className={styles.number} type="number" min="0"
                         value={acting.format === 'gsl' ? 2 : acting.advances}
                         disabled={busy || acting.format === 'gsl'}
                         onChange={e => setActing(prev => ({ ...prev, advances: e.target.value }))} />
                </label>
              )}
              <div className={styles.field}>
                <span className={styles.fieldLabel}>{tt('seed.title', 'How to seed the field')}</span>
                <Chips value={acting.seeding} disabled={busy} label={tt('seed.title', 'How to seed the field')}
                       options={SEEDING.map(([v, key, text]) => [v, tt(key, text)])}
                       onChange={v => setActing(prev => ({ ...prev, seeding: v }))} />
              </div>
            </div>
          )}

          <p className={styles.hint}>
            {acting.kind === 'reopen'
              ? tt('stages.reopenHint', 'Its results stay. It goes back to being played, and who went through is decided again when you close it.')
              : Number(meta.played[acting.row.id] || 0) > 0
                ? plural(tt, meta.played[acting.row.id],
                    'stages.discardOne', 'Its matches are removed, and the {n} result already in them is thrown away. That cannot be undone.',
                    'stages.discardMany', 'Its matches are removed, and the {n} results already in them are thrown away. That cannot be undone.')
                : tt('stages.noResultsYet', 'Its matches are removed. Nothing has been played in them yet, so no result is lost.')}
          </p>

          <div className={styles.editorActions}>
            <button type="button"
                    className={Number(meta.played[acting.row.id] || 0) > 0 && acting.kind !== 'reopen' ? styles.danger : styles.save}
                    disabled={busy}
                    onClick={() => (acting.kind === 'format' ? reformatStage(acting.row, acting.index)
                      : acting.kind === 'undo' ? undoDraw(acting.row) : reopenStage(acting.row))}>
              {acting.kind === 'format'
                ? tt('stages.formatGo', 'Change it and draw again')
                : acting.kind === 'undo'
                  ? (Number(meta.played[acting.row.id] || 0) > 0
                    ? tt('stages.undoGoDiscard', 'Undo the draw and discard the results')
                    : tt('stages.undoGo', 'Undo the draw'))
                  : tt('stages.reopenGo', 'Open it again')}
            </button>
            <button type="button" className={styles.quiet} disabled={busy}
                    onClick={() => { setActing(null); setProblem(''); }}>
              {tt('ui.cancel.0f8e', 'Cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Places taken from another tournament the organiser runs (P2). */}
      {!draft && canManage && rows.length > 0 && (
        <FeedsPanel tournamentRef={tournamentRef} stages={rows} token={token}
                    showToast={showToast} onChanged={after} />
      )}

      {/* -------------------------------------------------- the composer */}
      {draft && (
        <div className={styles.editor}>
          {/* The draft as a picture, redrawn as links and stages change. */}
          {draft.length > 1 && (
            <div className={styles.graphWrap}>
              <StageGraph stages={draft.map(r => ({ ...r, id: r.key }))} lines={draftLines} />
            </div>
          )}
          {draft.map((row, index) => {
            const s = row.settings || {};
            const table = TABLE.has(row.format);
            const knockout = KNOCKOUT.has(row.format);
            const last = index === draft.length - 1;
            // Drawn: what was played on it stays (server: bracket_edit.save_plan).
            const locked = Boolean(row.drawn);
            // A neighbour that is drawn cannot be passed either way.
            const by = step => Boolean(draft[index + step]?.drawn);
            const pinned = locked || by(-1);
            return (
              <div key={row.key} className={styles.row}>
                <div className={styles.rowTop}>
                  <span className={styles.order}>{index + 1}</span>
                  <input className={styles.text} value={row.label} disabled={busy}
                         placeholder={tt('stages.labelPlaceholder', 'Name this stage')}
                         aria-label={tt('stages.labelPlaceholder', 'Name this stage')}
                         onChange={e => setField(index, 'label', e.target.value)} />
                  <span className={styles.rowActions}>
                    <button type="button" className={styles.iconBtn} disabled={index === 0 || busy || pinned}
                            aria-label={tt('rules.moveUp', 'Move up')}
                            onClick={() => move(index, -1)}>
                      <LuArrowUp aria-hidden="true" />
                    </button>
                    <button type="button" className={styles.iconBtn} disabled={busy || last || locked || by(1)}
                            aria-label={tt('rules.moveDown', 'Move down')}
                            onClick={() => move(index, 1)}>
                      <LuArrowDown aria-hidden="true" />
                    </button>
                    <button type="button" className={styles.iconBtn} disabled={busy || draft.length < 2 || locked}
                            aria-label={tt('stages.removeStage', 'Remove this stage')}
                            onClick={() => removeRow(index)}>
                      <LuX aria-hidden="true" />
                    </button>
                  </span>
                </div>

                {locked && (
                  <p className={styles.note}>
                    {row.closed
                      ? tt('stages.drawnClosedNote', 'Drawn and closed: its format, groups, match rules and who went through stay as played. Its name, time and place still change. To change the rest, open it again from the plan.')
                      : tt('stages.drawnRunningNote', 'Drawn: its format, groups and match rules stay as played. Its name, time, place and how many go through still change. To change the rest, use Change the format or Undo the draw on the plan.')}
                  </p>
                )}

                <div className={styles.fields}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>{tt('stages.format', 'Played as')}</span>
                    <select className={styles.select} value={row.format} disabled={busy || locked}
                            onChange={e => setField(index, 'format', e.target.value)}>
                      {catalogue.map(f => (
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
                             value={row.groups} disabled={busy || locked}
                             onChange={e => setField(index, 'groups', e.target.value)} />
                    </label>
                  )}

                </div>

                {/* Everything below up to "when and where" is how the stage is
                    played, which a drawn stage keeps: one fieldset disables
                    every control in it rather than forty separate props. */}
                <fieldset className={styles.lockSet} disabled={locked}>
                {/* The format's own switches. */}
                <p className={styles.subhead}>{tt('stages.formatSettings', 'This format')}</p>
                <div className={styles.fields}>
                  {['single_elimination', 'double_elimination'].includes(row.format) && (
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>{tt('stages.threshold', 'Stop when this many are left')}</span>
                      <Chips value={Number(s.threshold || 0)} disabled={busy}
                             label={tt('stages.threshold', 'Stop when this many are left')}
                             options={THRESHOLDS.map(n => [n, n ? String(n) : tt('stages.thresholdNone', 'Play to one winner')])}
                             onChange={v => setDraft(prev => prev.map((r, i) => (i === index
                               ? { ...r, settings: { ...r.settings, threshold: v,
                                 ...(v && row.format === 'single_elimination' ? { third_place: false, every_place: false } : {}) } }
                               : r)))} />
                      {Number(s.threshold) > 1 && (
                        <span className={styles.note}>
                          {row.format === 'double_elimination'
                            ? tt('stages.thresholdNoteDouble', 'Half go through from the winners bracket and half from the losers bracket, the winners bracket first. There is no grand final.')
                            : tt('stages.thresholdNote', 'The rounds between them are not played. They all go through, the best seeds first.')}
                        </span>
                      )}
                    </div>
                  )}
                  {row.format === 'single_elimination' && !s.every_place && (
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>{tt('stages.reseed', 'Pair again by seed each round')}</span>
                      <Chips value={Boolean(s.reseed)} disabled={busy}
                             label={tt('stages.reseed', 'Pair again by seed each round')}
                             options={[[false, tt('stages.no', 'No')], [true, tt('stages.yes', 'Yes')]]}
                             onChange={v => setSetting(index, 'reseed', v)} />
                      {s.reseed && (
                        <span className={styles.note}>
                          {tt('stages.reseedNote', 'After each round the best seed still in plays the lowest seed still in, instead of following the lines of the bracket.')}
                        </span>
                      )}
                    </div>
                  )}
                  {row.format === 'single_elimination' && !(Number(s.threshold) > 1) && (
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>{tt('stages.thirdPlace', 'Third-place match')}</span>
                      <Chips value={Boolean(s.third_place)} disabled={busy}
                             label={tt('stages.thirdPlace', 'Third-place match')}
                             options={[[false, tt('stages.no', 'No')], [true, tt('stages.yes', 'Yes')]]}
                             onChange={v => setSetting(index, 'third_place', v)} />
                    </div>
                  )}
                  {row.format === 'single_elimination' && !(Number(s.threshold) > 1) && (
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>{tt('stages.everyPlace', 'Play for every place')}</span>
                      <Chips value={Boolean(s.every_place)} disabled={busy}
                             label={tt('stages.everyPlace', 'Play for every place')}
                             options={[[false, tt('stages.no', 'No')], [true, tt('stages.yes', 'Yes')]]}
                             onChange={v => setDraft(prev => prev.map((r, i) => (i === index
                               ? { ...r, settings: { ...r.settings, every_place: v,
                                 third_place: v ? false : r.settings.third_place,
                                 reseed: v ? false : r.settings.reseed } }
                               : r)))} />
                    </div>
                  )}
                  {row.format === 'winner_stays_on' && <>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>{tt('stages.streakTarget', 'Wins in a row that end it (0 for one challenge each)')}</span>
                      <input className={styles.number} type="number" min="0" max="20" disabled={busy}
                             value={s.streak_target ?? 0}
                             onChange={e => setSetting(index, 'streak_target', Number(e.target.value) || 0)} />
                    </label>
                    {Number(s.streak_target) > 0 && (
                      <label className={styles.field}>
                        <span className={styles.fieldLabel}>{tt('stages.maxMatches', 'Most matches before it stops (0 works it out)')}</span>
                        <input className={styles.number} type="number" min="0" max="200" disabled={busy}
                               value={s.max_matches ?? 0}
                               onChange={e => setSetting(index, 'max_matches', Number(e.target.value) || 0)} />
                      </label>
                    )}
                  </>}
                  {row.format === 'stepladder' && (
                    <p className={styles.note}>{tt('stages.stepladderNote', 'The lowest seeds play first and each winner climbs to meet the next seed up; the top seed waits in the final. Seed it from the stage before.')}</p>
                  )}
                  {row.format === 'page_playoff' && (
                    <p className={styles.note}>{tt('stages.pageNote', 'Exactly four: first against second for the final, third against fourth to stay alive, then the second chance.')}</p>
                  )}
                  {row.format === 'double_elimination' && !(Number(s.threshold) > 1) && (
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>{tt('stages.grandFinal', 'Grand final')}</span>
                      <Chips value={s.grand_final || 'reset'} disabled={busy}
                             label={tt('stages.grandFinal', 'Grand final')}
                             options={[['reset', tt('stages.gfReset', 'With a reset')],
                                       ['single', tt('stages.gfSingle', 'One match')],
                                       ['none', tt('stages.gfNone', 'None: both bracket winners go through')]]}
                             onChange={v => setSetting(index, 'grand_final', v)} />
                    </div>
                  )}
                  {/* Home and away is a table's question; a bracket group is a
                      knockout (walk of P3, 17 October 2026). */}
                  {BERGER.has(row.format) && (
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>{tt('stages.legs', 'Everybody plays everybody')}</span>
                      <Chips value={Number(s.legs || (row.format === 'league' ? 2 : 1))} disabled={busy}
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
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>{tt('stages.swissPairing', 'Pair the later rounds')}</span>
                      <Chips value={s.pairing || 'monrad'} disabled={busy} label={tt('stages.swissPairing', 'Pair the later rounds')}
                             options={SWISS_PAIRINGS.map(([v, key, text]) => [v, tt(key, text)])}
                             onChange={v => setSetting(index, 'pairing', v)} />
                      <span className={styles.note}>
                        {(s.pairing || 'monrad') === 'dutch'
                          ? tt('stages.pairDutchNote', 'The chess way: the top half of each score group plays its bottom half, first against the one half way down.')
                          : s.pairing === 'valve'
                            ? tt('stages.pairValveNote', 'The Counter-Strike Major way: the strongest on a record plays the weakest on it.')
                            : tt('stages.pairMonradNote', 'First against second, third against fourth, on the same record.')}
                      </span>
                    </div>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>{tt('stages.decisive', 'A match that can send a side through or out')}</span>
                      <Chips value={Number(s.decisive_best_of || 0)} disabled={busy}
                             label={tt('stages.decisive', 'A match that can send a side through or out')}
                             options={[[0, tt('stages.decisiveSame', 'Like any other')],
                                       [3, tt('stages.bestOfN', 'best of {n}').replace('{n}', 3)],
                                       [5, tt('stages.bestOfN', 'best of {n}').replace('{n}', 5)]]}
                             onChange={v => setSetting(index, 'decisive_best_of', v)} />
                    </div>
                    {formatPresets.valve_major && (
                      <button type="button" className={styles.ghost} disabled={busy}
                              onClick={() => applyFormatPreset(index, 'valve_major')}>
                        {tt('stages.valvePreset', 'Use the Counter-Strike Major setup: three wins through, three losses out, decisive matches best of three')}
                      </button>
                    )}
                  </>}
                  {row.format === 'gsl' && (
                    <p className={styles.note}>{tt('stages.gslNote', 'Groups of four, drawn automatically. Two openers, a winners match, a losers match and a decider.')}</p>
                  )}
                  {row.format === 'bracket_groups' && <>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>{tt('stages.bracket', 'Each group plays')}</span>
                      <Chips value={s.bracket || 'double'} disabled={busy} label={tt('stages.bracket', 'Each group plays')}
                             options={[['single', formatLabel(tt, 'single_elimination', '')],
                                       ['double', formatLabel(tt, 'double_elimination', '')]]}
                             onChange={v => setSetting(index, 'bracket', v)} />
                    </div>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>{tt('stages.groupThrough', 'Go through from each group')}</span>
                      <Chips value={Number(s.threshold) > 1 ? Number(s.threshold) : 1} disabled={busy}
                             label={tt('stages.groupThrough', 'Go through from each group')}
                             options={GROUP_THROUGH.map(n => [n, String(n)])}
                             onChange={v => setSetting(index, 'threshold', v > 1 ? v : 0)} />
                    </div>
                    {!(Number(row.groups) > 1) && (
                      <label className={styles.field}>
                        <span className={styles.fieldLabel}>{tt('stages.groupSize', 'Group size, when no number of groups is set')}</span>
                        <input className={styles.number} type="number" min="2" max="64" disabled={busy}
                               value={s.group_size ?? 4}
                               onChange={e => setSetting(index, 'group_size', Number(e.target.value) || 4)} />
                      </label>
                    )}
                    {s.bracket !== 'single' && !(Number(s.threshold) > 1) && (
                      <div className={styles.field}>
                        <span className={styles.fieldLabel}>{tt('stages.grandFinal', 'Grand final')}</span>
                        <Chips value={s.grand_final && s.grand_final !== 'none' ? s.grand_final : 'single'} disabled={busy}
                               label={tt('stages.grandFinal', 'Grand final')}
                               options={[['reset', tt('stages.gfReset', 'With a reset')],
                                         ['single', tt('stages.gfSingle', 'One match')]]}
                               onChange={v => setSetting(index, 'grand_final', v)} />
                      </div>
                    )}
                    <p className={styles.note}>{tt('stages.bracketGroupsNote', 'Each group is a knockout of its own and everybody stays in their group. The matches between the ones who go through are not played.')}</p>
                  </>}
                  {row.format === 'custom_bracket' && <>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>{tt('stages.customFrom', 'Start from')}</span>
                      <Chips value={s.preset || ''} disabled={busy} label={tt('stages.customFrom', 'Start from')}
                             options={[['', tt('stages.customOwn', 'A bracket I write')],
                                       ...customPresets.map(p => [p.key, tt(`stages.customPreset.${p.key}`, p.key)])]}
                             onChange={v => setSetting(index, 'preset', v)} />
                      {s.preset ? (
                        <span className={styles.note}>
                          {tt(`stages.customPresetNote.${s.preset}`, '')}
                          {' '}
                          {tt('stages.customSizes', 'Ready for {sizes} entrants.')
                            .replace('{sizes}', ((customPresets.find(p => p.key === s.preset) || {}).sizes || []).join(', '))}
                        </span>
                      ) : null}
                    </div>
                    {!s.preset && (
                      <label className={styles.field}>
                        <span className={styles.fieldLabel}>{tt('stages.customSchema', 'The bracket, one match a line')}</span>
                        <textarea className={styles.schemaBox} rows={8} spellCheck={false} disabled={busy}
                                  value={s.schema_text || ''} placeholder={'A=[1,4]\nB=[2,3]\nC=[W:A,W:B]! >1,2'}
                                  onChange={e => setSetting(index, 'schema_text', e.target.value)} />
                        <span className={styles.note}>
                          {tt('stages.customHelpMore', 'R:GF1 in both seats of a [GF] match plays GF1 again if its second seat wins it, and X:F:1:2 is whoever lost to the finalist in seat 1 of F in round 2.')}
                        </span>
                        <span className={styles.note}>
                          {tt('stages.customHelp', 'A=[1,4] is seed 1 against seed 4. C=[W:A,W:B] puts the winners of A and B together, L: takes a loser instead, and - is a bye. #round 2 starts a round, [PL] puts the matches below it on the placement side, @east names a part of the bracket. ! marks the final, and >3,4 gives the places a match decides.')}
                        </span>
                      </label>
                    )}
                  </>}
                  {BERGER.has(row.format) && (
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>{tt('stages.pairing', 'Fixture order')}</span>
                      <Chips value={s.pairing || 'circle'} disabled={busy} label={tt('stages.pairing', 'Fixture order')}
                             options={[['circle', tt('stages.pairingCircle', 'Rotation')],
                                       ['berger', tt('stages.pairingBerger', 'FIDE Berger tables')]]}
                             onChange={v => setSetting(index, 'pairing', v)} />
                      {s.pairing === 'berger' && (
                        <span className={styles.note}>{tt('stages.bergerNote', 'The order chess federations publish. Home and away alternate, and in a home and away league nobody has the same side three rounds running.')}</span>
                      )}
                    </div>
                  )}
                </div>
                {row.format === 'battle_royale' && (
                  <BRSettingsFields value={s} disabled={busy} isLast={last}
                                    onChange={next => setDraft(prev => prev.map((r, i) => (i === index ? { ...r, settings: next } : r)))} />
                )}

                {/* How a match is played. */}
                {row.format !== 'battle_royale' && <>
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
                </>}

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

                </fieldset>

                {/* Where they go (P1b): the links out of this stage. Outside
                    the locked set: a drawn stage's links still change until
                    they have sent people. */}
                <div className={styles.lines}>
                  <p className={styles.subhead}>{tt('stages.lines.title', 'Where they go')}</p>
                  {draftLines.filter(l => l.source === row.key).length === 0 && (
                    <p className={styles.note}>{tt('stages.lines.none', 'Nobody goes on from this stage. Its places are final.')}</p>
                  )}
                  {draftLines.filter(l => l.source === row.key).map(l => {
                    const target = draft.find(r => r.key === l.target);
                    const groups = Number(row.groups) || 0;
                    const targetName = target ? (target.label || formatLabel(tt, target.format)) : '';
                    if (l.fired) {
                      return (
                        <div key={l.k} className={styles.lineRow}>
                          <p className={styles.stageLine}>{lineSentence(l, row, targetName)}</p>
                          <p className={styles.note}>{tt('stages.lines.firedNote', 'Already sent, so it stays as it is.')}</p>
                        </div>
                      );
                    }
                    return (
                      <div key={l.k} className={styles.lineRow}>
                        <div className={styles.fields}>
                          <label className={styles.field}>
                            <span className={styles.fieldLabel}>{tt('stages.lines.from', 'From place')}</span>
                            <input className={styles.number} type="number" min="1" inputMode="numeric"
                                   value={l.place_from} disabled={busy}
                                   onChange={e => setLine(l.k, 'place_from', e.target.value)} />
                          </label>
                          <label className={styles.field}>
                            <span className={styles.fieldLabel}>{tt('stages.lines.to', 'To place')}</span>
                            <input className={styles.number} type="number" min="1" inputMode="numeric"
                                   value={l.place_to} disabled={busy}
                                   onChange={e => setLine(l.k, 'place_to', e.target.value)} />
                          </label>
                          {groups > 1 && (
                            <label className={styles.field}>
                              <span className={styles.fieldLabel}>{tt('stages.lines.of', 'Of')}</span>
                              <select className={styles.select} value={l.group ?? ''} disabled={busy}
                                      onChange={e => setLine(l.k, 'group', e.target.value === '' ? null : Number(e.target.value))}>
                                <option value="">{tt('stages.lines.eachGroup', 'Each group')}</option>
                                {Array.from({ length: groups }, (_, g) => (
                                  <option key={g} value={g + 1}>
                                    {tt('bracket.groupN', 'Group {g}').replace('{g}', groupLetter(g + 1))}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}
                          <label className={styles.field}>
                            <span className={styles.fieldLabel}>{tt('stages.lines.target', 'Go to')}</span>
                            <select className={styles.select} value={l.target} disabled={busy}
                                    onChange={e => setLineTarget(l.k, e.target.value)}>
                              {draft.filter(r => r.key !== row.key).map(r => (
                                <option key={r.key} value={r.key}>
                                  {`${draft.indexOf(r) + 1}. ${r.label || formatLabel(tt, r.format)}`}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        {target?.format === 'double_elimination' && (
                          <div className={styles.field}>
                            <span className={styles.fieldLabel}>{tt('stages.lines.side', 'Into')}</span>
                            <Chips value={l.side} disabled={busy} label={tt('stages.lines.side', 'Into')}
                                   options={[['any', tt('stages.lines.sideAny', 'Wherever the format puts them')],
                                             ['winners', tt('stages.lines.sideWinners', 'The upper bracket')],
                                             ['losers', tt('stages.lines.sideLosers', 'The lower bracket')]]}
                                   onChange={v => setLine(l.k, 'side', v)} />
                          </div>
                        )}
                        {TABLE.has(row.format) && TABLE.has(target?.format) && (
                          <div className={styles.field}>
                            <span className={styles.fieldLabel}>{tt('stages.lines.carry', 'Keep their points')}</span>
                            <Chips value={Boolean(l.carry_points)} disabled={busy} label={tt('stages.lines.carry', 'Keep their points')}
                                   options={[[false, tt('stages.no', 'No')], [true, tt('stages.yes', 'Yes')]]}
                                   onChange={v => setLine(l.k, 'carry_points', v)} />
                          </div>
                        )}
                        <div className={styles.field}>
                          <span className={styles.fieldLabel}>{tt('stages.lines.when', 'When they go')}</span>
                          <Chips value={l.fire} disabled={busy} label={tt('stages.lines.when', 'When they go')}
                                 options={[['after_preview', tt('stages.lines.fireAfterPreview', 'When I confirm the list')],
                                           ['on_close', tt('stages.lines.fireOnClose', 'As soon as the stage ends')],
                                           ['manual', tt('stages.lines.fireManual', 'When I press send')]]}
                                 onChange={v => setLine(l.k, 'fire', v)} />
                        </div>
                        <button type="button" className={styles.quiet} disabled={busy} onClick={() => removeLine(l.k)}>
                          {tt('stages.lines.remove', 'Remove this link')}
                        </button>
                      </div>
                    );
                  })}
                  {draft.length > 1 && (
                    <button type="button" className={styles.ghost} disabled={busy} onClick={() => addLine(row.key)}>
                      <LuPlus aria-hidden="true" /> {tt('stages.lines.add', 'Add a link')}
                    </button>
                  )}
                </div>

                {/* How a table ranks: points, then tie-breakers in order. Open
                    after the draw too: the server lets the scoring change. */}
                {TABLE.has(row.format) && (() => {
                  const r = row.rules || {};
                  const offered = (catalogue.find(f => f.key === row.format) || {}).scoring_tiebreakers || [];
                  const chosen = Array.isArray(r.tiebreakers) ? r.tiebreakers : [];
                  const name = key => tt(`tiebreak.${key}`,
                    (offered.find(o => o.key === key) || {}).label || key.replace(/_/g, ' '));
                  const winStandard = r.points_win !== '' && r.points_win !== undefined ? String(r.points_win) : '3';
                  const points = [
                    ['points_win', tt('stages.pointsWin', 'A win'), '3'],
                    ['points_draw', tt('stages.pointsDraw', 'A draw'), '1'],
                    ['points_loss', tt('stages.pointsLoss', 'A loss'), '0'],
                    ...(row.format === 'swiss' ? [['points_bye', tt('stages.pointsBye', 'A bye'), winStandard]] : []),
                  ];
                  return (
                    <div className={styles.scoring}>
                      <p className={styles.subhead}>{tt('stages.scoring', 'Scoring')}</p>
                      <p className={styles.note}>
                        {tt('stages.scoringHint', 'How this stage ranks its table. Leave a number empty to use the tournament’s own, or 3, 1 and 0.')}
                      </p>
                      <div className={styles.fields}>
                        {points.map(([key, label, standard]) => (
                          <label key={key} className={styles.field}>
                            <span className={styles.fieldLabel}>{label}</span>
                            <input className={styles.number} type="number" min="0" max="100" inputMode="numeric"
                                   value={r[key] ?? ''} placeholder={standard} disabled={busy}
                                   onChange={e => setRule(index, key, e.target.value)} />
                          </label>
                        ))}
                      </div>
                      {row.format === 'swiss' && (
                        <div className={styles.field}>
                          <span className={styles.fieldLabel}>{tt('stages.buchholzForm', 'The strength of the opponents counts their')}</span>
                          <Chips value={r.buchholz || 'wins'} disabled={busy}
                                 label={tt('stages.buchholzForm', 'The strength of the opponents counts their')}
                                 options={[['wins', tt('stages.buchholzWins', 'Wins')],
                                           ['points', tt('stages.buchholzPoints', 'Points')],
                                           ['wins_minus_losses', tt('stages.buchholzWL', 'Wins minus losses')]]}
                                 onChange={v => setRule(index, 'buchholz', v)} />
                        </div>
                      )}
                      <p className={styles.subhead}>{tt('stages.tiebreakers', 'When level on points, then')}</p>
                      {chosen.length ? (
                        <ol className={styles.tieList}>
                          {chosen.map((key, at) => (
                            <li key={key} className={styles.tieRow}>
                              <span className={styles.tieName}>{`${at + 1}. ${name(key)}`}</span>
                              <button type="button" className={styles.iconBtn} disabled={busy || at === 0}
                                      aria-label={tt('rules.moveUp', 'Move up')}
                                      onClick={() => moveTie(index, at, -1)}>
                                <LuArrowUp aria-hidden="true" />
                              </button>
                              <button type="button" className={styles.iconBtn}
                                      disabled={busy || at === chosen.length - 1}
                                      aria-label={tt('rules.moveDown', 'Move down')}
                                      onClick={() => moveTie(index, at, 1)}>
                                <LuArrowDown aria-hidden="true" />
                              </button>
                              <button type="button" className={styles.iconBtn} disabled={busy}
                                      aria-label={tt('stages.tiebreakRemove', 'Remove {name}').replace('{name}', name(key))}
                                      onClick={() => removeTie(index, at)}>
                                <LuX aria-hidden="true" />
                              </button>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className={styles.note}>
                          {tt('stages.tiebreakStandard', 'The standard order is used until you add one: the tournament’s own, else the usual order for this format.')}
                        </p>
                      )}
                      {offered.some(o => !chosen.includes(o.key)) && (
                        <div className={styles.chips} role="group" aria-label={tt('stages.tiebreakAdd', 'Add a tie-breaker')}>
                          {offered.filter(o => !chosen.includes(o.key)).map(o => (
                            <button key={o.key} type="button" className={`${styles.chip} ${styles.chipAdd}`} disabled={busy}
                                    onClick={() => addTie(index, o.key)}>
                              <LuPlus aria-hidden="true" /> {name(o.key)}
                            </button>
                          ))}
                        </div>
                      )}
                      {chosen.some(k => OWP_KEYS.includes(k)) && (
                        <label className={styles.field}>
                          <span className={styles.fieldLabel}>{tt('stages.owpFloor', 'The lowest win percentage an opponent counts as')}</span>
                          <input className={styles.number} type="number" min="0" max="50" inputMode="numeric"
                                 value={r.owp_floor ?? ''} placeholder="25" disabled={busy}
                                 onChange={e => setRule(index, 'owp_floor', e.target.value)} />
                        </label>
                      )}
                      <p className={styles.note}>
                        {tt('stages.tiebreakShared', 'Sides still level on all of them share a place, and share its prize.')}
                      </p>
                    </div>
                  );
                })()}

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

          {!draft.some(r => r.drawn) && (
            <div className={styles.scoring}>
              <p className={styles.subhead}>{tt('stages.ffaTitle', 'A free for all bracket')}</p>
              <p className={styles.note}>
                {tt('stages.ffaHint', 'Rounds of lobbies: the best of each lobby go on to the next round until one final lobby is left. This replaces the stages above.')}
              </p>
              {ffaRounds.length > 0 && (
                <p className={styles.note}>
                  {ffaRounds.map((r, i) => (i === ffaRounds.length - 1
                    ? tt('stages.ffaFinalLine', 'Final: {n} in one lobby').replace('{n}', r.entrants)
                    : tt('stages.ffaRoundLine', 'Round {round}: {n} in {lobbies} lobbies')
                      .replace('{round}', i + 1).replace('{n}', r.entrants).replace('{lobbies}', r.lobbies))).join('. ')}
                </p>
              )}
              {ffa ? (
                <>
                  <div className={styles.fields}>
                    {[
                      ['entrants', tt('stages.ffaEntrants', 'Entrants expected'), 2, 5000],
                      ['lobby_size', tt('stages.ffaLobbySize', 'Squads in a lobby'), 2, 100],
                      ['through', tt('stages.ffaThrough', 'Go on from each lobby'), 1, 99],
                      ['maps', tt('stages.ffaMaps', 'Matches in each round'), 1, 30],
                      ['final_maps', tt('stages.ffaFinalMaps', 'Matches in the final'), 1, 30],
                    ].map(([key, label, low, high]) => (
                      <label key={key} className={styles.field}>
                        <span className={styles.fieldLabel}>{label}</span>
                        <input className={styles.number} type="number" min={low} max={high} inputMode="numeric"
                               value={ffa[key]} disabled={busy}
                               onChange={e => setFfa(prev => ({ ...prev, [key]: e.target.value }))} />
                      </label>
                    ))}
                  </div>
                  <div className={styles.editorActions}>
                    <button type="button" className={styles.save} onClick={buildFfa} disabled={busy}>
                      {tt('stages.ffaBuild', 'Write the plan')}
                    </button>
                    <button type="button" className={styles.quiet} onClick={() => setFfa(null)} disabled={busy}>
                      {tt('ui.cancel.0f8e', 'Cancel')}
                    </button>
                  </div>
                </>
              ) : (
                <button type="button" className={styles.ghost} disabled={busy}
                        onClick={() => setFfa({ entrants: entrants.length || 24, lobby_size: 12, through: 4,
                                                maps: 4, final_maps: 6 })}>
                  {tt('stages.ffaOpen', 'Build a free for all bracket')}
                </button>
              )}
            </div>
          )}

          {problem && <p className={styles.problem} role="alert">{problem}</p>}
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
                {closing.manualOnly
                  ? tt('stages.confirmHintManual',
                    'Closing {stage} fixes its final table. Nobody goes to {next} until you press send on the link.')
                    .replace('{stage}', closing.row.label).replace(/\{next\}/g, closing.next?.label || '')
                  : closing.seatsWaiting
                    ? tt('stages.confirmHintSeats',
                      'These go through to {next}, as the stage’s own table has them. Move anybody up or down within their group if a place needs correcting. {next} is already drawn, so each one takes the seat waiting for their group and place.')
                      .replace(/\{next\}/g, closing.next?.label || '')
                  : closing.next?.placement === 'random'
                  ? tt('stages.confirmHintRandom',
                    'These go through to {next}. {next} places them at random when it is drawn, in the same press, so the order here does not decide who meets whom.')
                    .replace(/\{next\}/g, closing.next?.label || '')
                  : tt('stages.confirmHint2',
                    'These go through to {next}, in this seed order, as the stage’s own table has them. Move anybody up or down if you need to, then send them through. {next} is drawn in the same press.')
                    .replace(/\{next\}/g, closing.next?.label || '')}
              </p>
              {closing.perLine && closing.lines.map(l => (
                <div key={l.id} className={styles.lineRow}>
                  <p className={styles.stageLine}>
                    {tt('stages.lines.toTarget', 'To {target}').replace('{target}', l.target_label)}
                    {l.fire === 'manual' ? ` ${tt('stages.lines.waitsForPress', 'Waits for you to press send.')}` : ''}
                  </p>
                  <ol className={styles.through}>
                    {l.rows.map((entry, i) => (
                      <li key={entry.registration_id} className={styles.throughRow}>
                        <span className={styles.order}>{i + 1}</span>
                        <span className={styles.throughName}>
                          {entry.name}
                          {entry.handle && entry.handle !== entry.name ? ` @${entry.handle}` : ''}
                          {entry.group ? ` (${tt('bracket.groupN', 'Group {g}').replace('{g}', groupLetter(entry.group))}, ${entry.rank})` : ''}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
              {!closing.perLine && <ol className={styles.through}>
                {closing.through.map((entry, i) => (
                  <li key={entry.registration_id} className={styles.throughRow}>
                    <span className={styles.order}>{i + 1}</span>
                    <span className={styles.throughName}>
                      {entry.name}
                      {entry.handle && entry.handle !== entry.name ? ` @${entry.handle}` : ''}
                      {entry.lobby_rank
                        ? ` (${lobbyLabel(tt, { name: entry.lobby_name, number: entry.lobby })}, ${tt('br.placeN', 'Place {n}').replace('{n}', entry.lobby_rank)})`
                        : entry.group ? ` (${tt('bracket.groupN', 'Group {g}').replace('{g}', groupLetter(entry.group))}, ${entry.rank})` : ''}
                      {Number(entry.carry) > 0
                        ? `, ${plural(tt, entry.carry, 'stages.startsOnOne', 'starts on {n} point', 'stages.startsOnMany', 'starts on {n} points')}`
                        : ''}
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
              </ol>}
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
              <button type="button" className={styles.save} disabled={busy || (!closing.through.length && !closing.manualOnly)}
                      onClick={() => confirmClose(Boolean(closing.disputes))}>
                {closing.disputes
                  ? tt('stages.advanceAnyway', 'Advance anyway')
                  : closing.manualOnly
                    ? tt('stages.closeOnly', 'Close the stage')
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
