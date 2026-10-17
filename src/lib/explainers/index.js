// Every format explainer, by key (inbox 476).
//
// One entry per format the platform runs: the twelve keys of
// vent_tournament/formats.py, plus groups into a knockout, the plan most staged
// tournaments are. A format added later is a new module in ./formats and a
// line here, with its title and three lines in en, fr and pt; the player does
// not change. scripts/check-explainers.mjs fails when a format in the catalogue
// has no explainer here, or an explainer has no words in a language.

import { formatKey, FORMAT_KEYS } from '@/lib/formatLabel';
import singleElimination from './formats/singleElimination';
import doubleElimination from './formats/doubleElimination';
import roundRobin from './formats/roundRobin';
import league from './formats/league';
import groupsKnockout from './formats/groupsKnockout';
import swiss from './formats/swiss';
import gsl from './formats/gsl';
import bracketGroups from './formats/bracketGroups';
import battleRoyale from './formats/battleRoyale';
import stepladder from './formats/stepladder';
import pagePlayoff from './formats/pagePlayoff';
import winnerStaysOn from './formats/winnerStaysOn';
import aggregate from './formats/aggregate';
import ladder from './formats/ladder';

// The order the help page lists them in: the knockouts, then the tables, then
// the playoffs and the rest.
const ALL = [
  singleElimination,
  doubleElimination,
  roundRobin,
  league,
  groupsKnockout,
  swiss,
  gsl,
  bracketGroups,
  battleRoyale,
  stepladder,
  pagePlayoff,
  winnerStaysOn,
  aggregate,
  ladder,
];

export const EXPLAINERS = Object.fromEntries(ALL.map((e) => [e.key, e]));
export const EXPLAINER_KEYS = ALL.map((e) => e.key);

// The music the explainers play under their captions. Decision 10 of the
// design: captions over music, no voice, for the first set. No track is
// licensed yet, so this is empty and the player plays silently; set it to the
// address of the licensed file (under /public) and every explainer plays it.
export const MUSIC_TRACK = null;

const scenes = new Map();

/** The built scene for an explainer key, or null. Built once, then kept. */
export function sceneFor(key) {
  if (!EXPLAINERS[key]) return null;
  if (!scenes.has(key)) scenes.set(key, EXPLAINERS[key].build());
  return scenes.get(key);
}

/** The explainer key for however a format was written, or null. */
export function explainerKey(value) {
  if (!value) return null;
  const slug = String(value).trim().toLowerCase().replace(/[-\s]+/g, '_');
  if (EXPLAINERS[slug]) return slug;
  const key = formatKey(value);
  return key && EXPLAINERS[key] ? key : null;
}

const TABLES = new Set(['round_robin', 'league']);
const KNOCKOUTS = new Set(['single_elimination', 'double_elimination']);

/**
 * The explainers for a tournament, in the order its plan plays them.
 *
 * A tournament in stages is its plan: a round robin or league stage followed
 * by an elimination stage is groups into a knockout, which has its own
 * explainer, and any other stage is explained as its own format. A tournament
 * with no stages is its one format.
 *
 * @param formats  the stage formats in order, or the tournament's one format
 */
export function explainersFor(formats) {
  const keys = (Array.isArray(formats) ? formats : [formats])
    .map((f) => formatKey(f))
    .filter(Boolean);
  const out = [];
  for (let i = 0; i < keys.length; i += 1) {
    if (TABLES.has(keys[i]) && keys.slice(i + 1).some((k) => KNOCKOUTS.has(k))) {
      out.push('groups_knockout');
      // The knockout that the groups feed is part of that one picture.
      const next = keys.findIndex((k, j) => j > i && KNOCKOUTS.has(k));
      keys.splice(next, 1);
    } else if (EXPLAINERS[keys[i]]) {
      out.push(keys[i]);
    }
  }
  return [...new Set(out)];
}

/** The stage formats of a tournament as the API sends it, or its one format. */
export function tournamentFormats(tournament) {
  if (!tournament) return [];
  const stages = Array.isArray(tournament.stages) ? tournament.stages : [];
  if (stages.length) return stages.map((s) => s.format).filter(Boolean);
  if (Array.isArray(tournament.stage_formats) && tournament.stage_formats.length) {
    return tournament.stage_formats;
  }
  const one = tournament.format || tournament.bracket_type;
  return one ? [one] : [];
}

/** Formats the catalogue has that no explainer covers. Empty is correct. */
export const missingExplainers = () => FORMAT_KEYS.filter((k) => !EXPLAINERS[k]);
