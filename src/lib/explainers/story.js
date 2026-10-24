// The pieces every format explainer is drawn with (inbox 476).
//
// CEO, 16 October 2026: "we'll need a video explainer for all these
// bracket/format systems, so users can easily understand, it needs to be very
// simple and straightforward explainers." The approved design (section 14d of
// docs/specs/2026-10-16-bracket-structure-design.md): one short explainer per
// format, 30 to 60 seconds, where the diagram itself moves. Entrants appear,
// matches play out, winners move along the lines, the places land.
//
// A scene is a stage of STAGE_W x STAGE_H, a cast of actors and where each
// starts, and a list of steps. Each step changes some actors, lasts `ms`, and
// names which of the three caption lines is on screen while it plays. The
// player (src/components/format-explainer) turns that into the picture after
// each step and lets the browser animate between two of them, the way the
// party game stage does. Nothing in here knows about React.
//
// The brackets are LAID OUT from match data (knockout.js, table.js), never
// drawn by hand, so a scene cannot show a bracket that its own results do not
// produce. scripts/check-explainers.mjs reads every scene and fails on one
// that is too short or too long, a step with no caption, or a drawn word with
// no translation.

export const STAGE_W = 480;
export const STAGE_H = 270;

// The people in every explainer. Names rather than "Seed 1", because a name is
// somebody to follow across a bracket and a number is not; the seed is still
// drawn beside each one, because several formats are about seeds. Names are
// the same in every language, so none of them needs translating.
export const PLAYERS = [
  { seed: 1, name: 'Kojo' },
  { seed: 2, name: 'Ada' },
  { seed: 3, name: 'Tunde' },
  { seed: 4, name: 'Zara' },
  { seed: 5, name: 'Femi' },
  { seed: 6, name: 'Amara' },
  { seed: 7, name: 'Sipho' },
  { seed: 8, name: 'Lola' },
];

/** The player with this seed. */
export const seed = (n) => PLAYERS[n - 1];

// Teams, for the formats a squad plays. Cities, for the same reason as the
// names: they read the same in English, French and Portuguese.
export const TEAMS = ['Lagos', 'Accra', 'Dakar', 'Nairobi', 'Abuja', 'Kumasi'].map(
  (name, i) => ({ seed: i + 1, name }),
);

// Every word drawn ON the stage, in English. The dictionary carries each one
// as `explainer.art.<key>` in en, fr and pt; this is the fallback and the list
// the catcher checks the dictionary against. A word drawn with `{n}` gets the
// number filled in after translation.
export const ART = {
  round: 'Round {n}',
  semis: 'Semi-finals',
  final: 'Final',
  champion: 'Champion',
  upper: 'Upper bracket',
  lower: 'Lower bracket',
  grandFinal: 'Grand final',
  groupA: 'Group A',
  groupB: 'Group B',
  through: 'Through',
  out: 'Out',
  firstThrough: '1st, through',
  secondThrough: '2nd, through',
  winsFixture: '{team} win {goals} on goals',
  start: 'Start',
  afterRound: 'After round {n}',
  matchday: 'Matchday {n} of {total}',
  week: 'Week {n}',
  map: 'Map {n} of {total}',
  matchesWon: 'Matches won',
  goals: 'Goals',
  points: 'Points',
  played: 'P',
  won: 'W',
  drawn: 'D',
  lost: 'L',
  pts: 'Pts',
  kills: 'Kills',
  finish: 'Finish',
  home: 'Home',
  away: 'Away',
  match: 'Match {n}',
  opening: 'Opening match',
  winnersMatch: 'Winners match',
  losersMatch: 'Losers match',
  decider: 'Decider',
  secondChance: 'Second chance',
  holdsSpot: 'Holding the spot',
  queue: 'Waiting in line',
  streak: '{n} in a row',
  streakGoal: 'First to {n} in a row wins',
  waits: 'Waits for the final',
  challengeWon: '{winner} wins and they swap',
  challengeHeld: '{winner} wins, nobody moves',
};

/** A drawn word with its numbers filled in, through a translator. */
export function artText(tt, k, vars) {
  let text = tt ? tt(`explainer.art.${k}`, ART[k] || k) : (ART[k] || k);
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replace(`{${name}}`, String(value));
    }
  }
  return text;
}

/**
 * A scene being written: the cast, and the steps that change it.
 *
 * Actor kinds, all in stage units:
 *   chip   an entrant: x, y, w, h, seed, name, tone ('' | win | out | gold | through | drop)
 *   slot   an empty place a chip will land in: x, y, w, h, k (a drawn word, optional)
 *   line   a path between two places: d [[x, y], ...], tone ('' | lit)
 *   text   a drawn word: x, y, k + vars, or v (a literal), size, tone, anchor, weight
 *   panel  a filled surface behind a group or a table: x, y, w, h, tone
 *   row    a line of a table that moves when the order changes: x, y, w, h,
 *          cells [{ x, v | k, anchor, weight }], bar (0..1, optional), tone
 *   tag    a filled label: x, y, w, h, k + vars, tone
 *
 * Every actor also has `o`, its opacity. Steps change any of these; the
 * player animates x, y, o, a row's bar and a tone, and swaps text instantly.
 */
export class Story {
  constructor(key) {
    this.key = key;
    this.cast = {};
    this.order = [];
    this.steps = [];
  }

  /** Adds an actor and returns its id. Paint order is the order added. */
  add(id, actor) {
    if (this.cast[id]) throw new Error(`explainer ${this.key}: actor ${id} added twice`);
    this.cast[id] = { o: 1, tone: '', ...actor };
    this.order.push(id);
    return id;
  }

  /**
   * One step: which caption line (0, 1 or 2), how long it lasts, and the
   * changes. Several change sets may be passed; later ones win.
   */
  step(line, ms, ...changes) {
    const set = {};
    for (const change of changes) {
      for (const [id, props] of Object.entries(change || {})) {
        if (!this.cast[id]) throw new Error(`explainer ${this.key}: step changes unknown actor ${id}`);
        set[id] = { ...(set[id] || {}), ...props };
      }
    }
    this.steps.push({ line, ms, set });
  }

  scene() {
    return {
      key: this.key,
      w: STAGE_W,
      h: STAGE_H,
      cast: this.cast,
      order: this.order,
      steps: this.steps,
    };
  }
}

/** Changes that show every listed actor. */
export const show = (...ids) => Object.fromEntries(ids.flat().map((id) => [id, { o: 1 }]));

/** Changes that hide every listed actor. */
export const hide = (...ids) => Object.fromEntries(ids.flat().map((id) => [id, { o: 0 }]));

/**
 * The picture after each step: frame 0 is the cast as added, frame N the
 * picture once step N has played.
 */
export function frames(scene) {
  const first = {};
  for (const id of scene.order) first[id] = { ...scene.cast[id] };
  const all = [first];
  for (const step of scene.steps) {
    const prev = all[all.length - 1];
    const next = {};
    for (const id of scene.order) next[id] = step.set[id] ? { ...prev[id], ...step.set[id] } : prev[id];
    all.push(next);
  }
  return all;
}

/** How long the whole scene plays, in milliseconds. */
export const duration = (scene) => scene.steps.reduce((sum, step) => sum + step.ms, 0);

/** Where each step starts, in milliseconds from the beginning. */
export const starts = (scene) => {
  let at = 0;
  return scene.steps.map((step) => {
    const start = at;
    at += step.ms;
    return start;
  });
};

/** Every drawn word a scene uses, for the catcher. */
export function artKeys(scene) {
  const keys = new Set();
  const visit = (actor) => {
    if (actor.k) keys.add(actor.k);
    for (const cell of actor.cells || []) if (cell.k) keys.add(cell.k);
  };
  for (const id of scene.order) visit(scene.cast[id]);
  for (const step of scene.steps) {
    for (const props of Object.values(step.set)) visit(props);
  }
  return [...keys];
}
