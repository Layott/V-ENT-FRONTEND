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
  'swiss',
  'gsl',
  'battle_royale',
  'aggregate_2v2',
  'ladder',
];

const FALLBACK = {
  single_elimination: 'Single elimination',
  double_elimination: 'Double elimination',
  round_robin: 'Round robin',
  swiss: 'Swiss',
  gsl: 'GSL groups',
  battle_royale: 'Battle royale',
  aggregate_2v2: 'Aggregate tie',
  ladder: 'Ladder',
};

// The spellings a row or a screen may still hold, mapped to the key. Mirrors
// `formats.ALIASES` on the server.
const ALIASES = {
  swiss_system: 'swiss',
  swiss_rounds: 'swiss',
  league: 'round_robin',
  roundrobin: 'round_robin',
  rr: 'round_robin',
  single: 'single_elimination',
  double: 'double_elimination',
  se: 'single_elimination',
  de: 'double_elimination',
  br: 'battle_royale',
  gsl_groups: 'gsl',
  aggregate: 'aggregate_2v2',
  aggregate_2_v_2: 'aggregate_2v2',
  aggregate_league: 'aggregate_2v2',
  free_for_all: 'battle_royale',
  ffa: 'battle_royale',
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
  const key = formatKey(value);
  if (!key) return value ? String(value) : empty;
  return tt(`format.label.${key}`, FALLBACK[key]);
};
