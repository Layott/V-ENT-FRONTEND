// One name for a tournament format, wherever it is printed.
//
// Four pages kept their own five-entry map (tournaments list, search, the
// public tournament page, the wizard's review) and a fifth printed the raw
// key. None knew `gsl`, `aggregate_2v2` or `ladder`, so the three formats the
// wizard offers last read as "Aggregate 2v2", "Gsl" and "Ladder" or as the
// key itself. This is the list, keyed the way the backend catalogue in
// `vent_tournament/formats.py` keys it, and translated.

export const FORMAT_KEYS = [
  'single_elimination',
  'double_elimination',
  'round_robin',
  'league',
  // P3 W3a: pots dealt by seed, a few opponents from each. Stage only.
  'league_phase',
  'swiss',
  'gsl',
  // P3 W1: several small knockouts; GSL is its preset. A stage only format:
  // the stage planner offers it, the one-format wizard does not.
  'bracket_groups',
  // P3 W2: a bracket written match by match, or a ready-made one. Stage only.
  'custom_bracket',
  'battle_royale',
  'aggregate_2v2',
  'ladder',
  'stepladder',
  'page_playoff',
  'winner_stays_on',
  // P3 W3d: a challenge ladder, a stage only format. Places are held and swapped
  // by challenges, so nothing is drawn up front.
  'challenge_ladder',
];

const FALLBACK = {
  single_elimination: 'Single elimination',
  double_elimination: 'Double elimination',
  round_robin: 'Round robin',
  league: 'League',
  league_phase: 'League phase',
  swiss: 'Swiss',
  gsl: 'GSL groups',
  bracket_groups: 'Bracket groups',
  custom_bracket: 'Custom bracket',
  battle_royale: 'Battle royale',
  aggregate_2v2: 'Aggregate tie',
  ladder: 'Ladder',
  stepladder: 'Stepladder',
  page_playoff: 'Page playoff',
  winner_stays_on: 'Winner stays on',
  challenge_ladder: 'Challenge ladder',
};

// The spellings a row or a screen may still hold, mapped to the key. Mirrors
// `formats.ALIASES` on the server.
const ALIASES = {
  swiss_system: 'swiss',
  swiss_rounds: 'swiss',
  // 'league' was read as round robin until it became its own format (inbox
  // 440, 12 October 2026).
  football_league: 'league',
  home_and_away: 'league',
  roundrobin: 'round_robin',
  rr: 'round_robin',
  single: 'single_elimination',
  double: 'double_elimination',
  se: 'single_elimination',
  de: 'double_elimination',
  br: 'battle_royale',
  gsl_groups: 'gsl',
  bracket_group: 'bracket_groups',
  knockout_groups: 'bracket_groups',
  custom: 'custom_bracket',
  aggregate: 'aggregate_2v2',
  aggregate_2_v_2: 'aggregate_2v2',
  aggregate_league: 'aggregate_2v2',
  free_for_all: 'battle_royale',
  ffa: 'battle_royale',
  step_ladder: 'stepladder',
  page: 'page_playoff',
  page_system: 'page_playoff',
  mcintyre: 'page_playoff',
  king_of_the_hill: 'winner_stays_on',
  winner_stay_on: 'winner_stays_on',
};

/** The catalogue key for however a format was written, or null. */
export const formatKey = (value) => {
  if (!value) return null;
  const slug = String(value).trim().toLowerCase().replace(/[-\s]+/g, '_');
  const key = ALIASES[slug] || slug;
  return FORMAT_KEYS.includes(key) ? key : null;
};

/**
 * What the format is called, in the reader's language.
 *
 *   formatLabel(tt, tournament.bracket_type)
 *
 * A value that names no format is shown as written rather than hidden, so a
 * bad row is visible instead of silent.
 */
export const formatLabel = (tt, value, empty = '-') => {
  // A stage whose format is chosen later (P4c) is not in the catalogue, and its
  // raw key "undecided" reached the overview and the format card (walk, 25 Oct).
  if (String(value || '').trim().toLowerCase() === 'undecided') {
    return tt('stages.undecidedName', 'Format to be decided');
  }
  const key = formatKey(value);
  if (!key) return value ? String(value) : empty;
  return tt(`format.label.${key}`, FALLBACK[key]);
};

/**
 * A plan's stages as runs of the same format, in order:
 * [{ format, label, count }]. Three battle royale stages in a row are one
 * run of three (a free for all bracket), so a sentence can say "three
 * rounds of lobbies" instead of naming the format three times (walk of P3,
 * 17 October 2026).
 */
export const formatRuns = (stages) => (stages || []).reduce((runs, stage) => {
  const key = formatKey(stage.format) || stage.format;
  const preset = stage.preset || null;
  const last = runs[runs.length - 1];
  if (last && last.format === key && last.preset === preset) last.count += 1;
  else runs.push({ format: key, label: stage.format_label, preset, count: 1 });
  return runs;
}, []);

/**
 * What one stage is played as: its format, or for a custom bracket drawn from
 * a preset the preset's own name ("Compass draw"). "Custom bracket" alone did
 * not say which of six shapes it was (walk of P3 W2, 17 October 2026).
 * `stage` is { format, format_label, preset }.
 */
export const stageFormatLabel = (tt, stage) => (
  formatKey(stage?.format) === 'custom_bracket' && stage?.preset
    ? tt(`stages.customPreset.${stage.preset}`, stage.preset)
    : formatLabel(tt, stage?.format, stage?.format_label)
);

// The English name each format carries in `vent_tournament/formats.py`. A
// stage nobody named is stored with that name (stages.py), so a French screen
// has to recognise it and translate it. Mirrors formats.py `label`;
// check-format-catalogue.py holds them equal.
const SERVER_NAME = {
  single_elimination: 'Single elimination',
  double_elimination: 'Double elimination',
  round_robin: 'Round robin',
  league: 'League',
  league_phase: 'League phase',
  swiss: 'Swiss',
  gsl: 'GSL groups',
  bracket_groups: 'Bracket groups',
  custom_bracket: 'Custom bracket',
  battle_royale: 'Battle royale points',
  stepladder: 'Stepladder',
  page_playoff: 'Page playoff',
  winner_stays_on: 'Winner stays on',
  aggregate_2v2: 'Aggregate tie',
  ladder: 'Ladder',
  challenge_ladder: 'Challenge ladder',
};

/**
 * What a stage is called on screen. A name somebody typed is shown as typed;
 * the server's own name for the format, or no name at all, is translated.
 * Inbox 515: a French console read "Les places 1 a 4 vont en Single
 * elimination." because the stage carried the English format name.
 *
 *   stageName(tt, stage.label, stage.format, stage.preset)
 */
export const stageName = (tt, label, format, preset) => {
  const text = String(label ?? '').trim();
  const lower = text.toLowerCase();
  const key = format
    ? formatKey(format)
    : Object.keys(SERVER_NAME).find((k) => SERVER_NAME[k].toLowerCase() === lower) || null;
  if (!key) return text;
  // Any format's own name counts, not only this stage's: a stage switched from
  // single elimination to a compass draw kept "Single elimination" as its name
  // (live walk, 24 October 2026). Nobody types a format's name for another format.
  const automatic = Object.values(SERVER_NAME).some((n) => n.toLowerCase() === lower);
  if (!text || automatic) return stageFormatLabel(tt, { format: key, preset });
  return text;
};

// The English summary each format carries in formats.py, the fallback when a
// translation is missing.
const SUMMARY = {
  single_elimination: 'One loss and you are out. The fastest way to find a winner.',
  double_elimination: 'Two losses to be out. One bad game does not end a run.',
  round_robin: 'Everyone plays everyone. The table decides it.',
  league: 'Everyone plays everyone, home and away. Points decide the table.',
  league_phase: 'Everybody is dealt into pots by seed and plays a few opponents from every pot, about half at home. One table ranks the whole field.',
  swiss: 'Paired against somebody on the same record each round. Nobody is knocked out early and everybody plays the same number of games.',
  gsl: 'Groups of four, double elimination inside each. Two advance, and everybody plays at least twice.',
  bracket_groups: 'Several small knockouts, single or double elimination. Everybody stays in their group, and the best of each go through.',
  custom_bracket: 'A bracket of your own shape, written match by match or taken from a ready-made one: AFL final eight, compass draw, feed-in consolation.',
  battle_royale: 'Several matches, points for where you finish and for each kill. The table after the last match decides it.',
  stepladder: 'The lowest seeds play first and each winner climbs to meet the next seed up. The top seed waits in the final.',
  page_playoff: 'Four sides. First plays second for a place in the final; third plays fourth to stay alive; the loser of the first meets the winner of the second for the other place in the final.',
  winner_stays_on: 'The winner keeps playing the next challenger in the queue. Ends when everybody has had a go, or when somebody reaches the winning streak the organiser set.',
  aggregate_2v2: 'Each player faces their opposite number, and the tie is decided on total goals across those fixtures.',
  ladder: 'Play when you like over a period. The table is the standing.',
  challenge_ladder: 'Everybody holds a place. Challenge somebody a few places above, win, and you swap places. Runs until the stage ends.',
};

// The rules screen and the format picker print the format's summary. Inbox
// 516: the summary came from the server in English, on every screen.
export const formatSummary = (tt, value, fallback) => {
  const key = formatKey(value);
  return key ? tt(`format.summary.${key}`, SUMMARY[key] || fallback || '') : (fallback || '');
};
