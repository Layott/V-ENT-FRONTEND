'use client';

// The format catalogue, fetched once, read by every screen that asks about a
// format.
//
// `formatLabel.js` next door holds the KEYS and the aliases, because a key has
// to be resolvable with no network. This holds everything else: what a format
// needs, what it forbids, and what it will actually build.
//
// Why it is fetched rather than written here. The wizard carried its own copy
// of the participant rules, and it was wrong for four of the eight formats:
//
//   - it tested `format === 'swiss'` while the value normalises to
//     `swiss_system`, so the Swiss rule NEVER fired and Swiss fell through to
//     "two or more" when the catalogue says four
//   - double elimination was given a minimum of 2, and the catalogue says 4
//   - round robin has a ceiling of 20 in the catalogue and none on the screen,
//     so 40 teams could be typed into a form that would build 780 fixtures
//   - gsl, aggregate_2v2 and ladder had no rule at all
//
// None of that is visible in either repo alone. It is the gap between them,
// which is the whole reason `tools/check-format-catalogue.py` exists.
//
// The WORDS still come from the dictionary, because a sentence built in Python
// cannot be translated. The English served by the API is the fallback, so a
// format added on the server appears here immediately, in English, rather than
// not appearing at all.

import { useEffect, useState } from 'react';
import { formatKey, formatLabel } from './formatLabel';

const API = process.env.NEXT_PUBLIC_API_URL;

// One request per distinct question, shared by every component that asks it.
// Keyed by the arguments because the shape depends on them.
const inFlight = new Map();

const cacheKey = (participants, seats) => `${participants || 0}|${seats || 1}`;

/** Every format, with the shape it takes for this many entrants. */
export function fetchFormats(participants, seats) {
  const key = cacheKey(participants, seats);
  if (inFlight.has(key)) return inFlight.get(key);
  // Typing a number walks through several of them, and each one is a distinct
  // question with a distinct answer. Cheap to keep, but not for ever.
  if (inFlight.size > 40) inFlight.clear();

  const query = [];
  if (participants) query.push(`participants=${encodeURIComponent(participants)}`);
  if (seats && Number(seats) > 1) query.push(`seats=${encodeURIComponent(seats)}`);
  const url = `${API}/tournament/formats/${query.length ? `?${query.join('&')}` : ''}`;

  const promise = fetch(url)
    .then(res => (res.ok ? res.json() : null))
    .then(body => (body?.status === 'success' ? body.data?.formats || [] : null))
    // A catalogue that will not load must not stop somebody creating a
    // tournament. The caller falls back to the rule that refuses least.
    .catch(() => null);

  inFlight.set(key, promise);
  return promise;
}

/**
 * The catalogue entry for one format, for this many entrants.
 *
 *   const { entry, loading } = useFormatShape(formData.bracket_type, count, seats);
 */
export function useFormatShape(bracketType, participants, rawSeats = 1) {
  const key = formatKey(bracketType);
  // Somebody typing "128" passes through 1, 12 and 128, so the count is only
  // asked about once it could be a real field. Anything outside that asks for
  // the plain catalogue, which is one cached request.
  const n = Number(participants);
  const count = Number.isFinite(n) && n >= 2 && n <= 4096 ? n : 0;
  const s = Number(rawSeats);
  const seats = Number.isFinite(s) && s > 1 && s <= 11 ? s : 1;
  const [entries, setEntries] = useState(null);

  useEffect(() => {
    let alive = true;
    // null while asking, false if it could not be asked, a list once it
    // answered. Three states, because "no formats" and "did not load" lead to
    // different screens and one nullable value cannot tell them apart.
    fetchFormats(count, seats).then(list => {
      if (alive) setEntries(list === null ? false : list);
    });
    return () => { alive = false; };
  }, [count, seats]);

  const list = Array.isArray(entries) ? entries : null;
  const entry = key && list ? list.find(f => f.key === key) || null : null;
  return { entry, entries: list, loading: entries === null, failed: entries === false };
}

/**
 * What a valid entrant count looks like for this format.
 *
 * With no entry (still loading, or the catalogue did not answer) it returns
 * the rule that refuses least, so a form never blocks somebody because a
 * request was slow.
 */
export function countRule(entry) {
  if (!entry) return { min: 2, max: null, evenOnly: false, known: false };
  return {
    min: entry.min_participants || 2,
    max: entry.max_participants || null,
    evenOnly: !!entry.even_only,
    known: true,
  };
}

/**
 * What choosing this format commits the organiser to, in sentences.
 *
 * Codes and numbers arrive from the server; the words are assembled here so
 * they can be read in French or Portuguese. Returns an array of strings, most
 * important first, or an empty array when there is nothing certain to say.
 */
export function structureLines(tt, entry) {
  if (!entry) return [];
  const lines = [];
  const fill = (key, fallback, values) => {
    let out = tt(key, fallback);
    Object.entries(values || {}).forEach(([name, value]) => {
      out = out.split(`{${name}}`).join(String(value));
    });
    return out;
  };

  const shape = entry.shape;
  if (shape && shape.kind === 'table') {
    lines.push(fill('format.structTable',
      '{n} sides each play everyone once: {matches} fixtures over {rounds} rounds.',
      { n: shape.participants, matches: shape.matches, rounds: shape.rounds }));
    if (shape.sits_out_each_round) {
      lines.push(tt('format.structSitsOut',
        'An odd number means one side sits out each round.'));
    }
    if (entry.seats_per_side > 1) {
      lines.push(fill('format.structSeats',
        'Each fixture is {seats} matches, one per seat, so {floor} matches to run.',
        { seats: entry.seats_per_side, floor: shape.games_on_the_floor }));
    }
  } else if (shape && shape.kind === 'knockout' && shape.winners_rounds) {
    lines.push(fill('format.structDouble',
      '{n} entrants in a bracket of {slots}: {wr} winners rounds, {lr} losers rounds, then the grand final. Up to {games} matches.',
      { n: shape.participants, slots: shape.slots, wr: shape.winners_rounds,
        lr: shape.losers_rounds, games: shape.games }));
  } else if (shape && shape.kind === 'knockout') {
    lines.push(fill('format.structKnockout',
      '{n} entrants in a bracket of {slots}: {rounds} rounds and {games} matches.',
      { n: shape.participants, slots: shape.slots, rounds: shape.rounds,
        games: shape.games }));
  } else if (shape && shape.kind === 'points') {
    lines.push(tt('format.structPoints',
      'Everybody plays in the same match. How many matches, and what a placing is worth, is set in the rules.'));
  }

  if (shape && shape.byes > 0) {
    lines.push(fill('format.structByes',
      '{byes} of them get a bye in the first round, which should go to the top seeds.',
      { byes: shape.byes }));
  }

  if (shape && shape.problem === 'at_least') {
    lines.push(fill('format.structNeedsAtLeast',
      'This format needs at least {min} entrants.', { min: entry.min_participants }));
  } else if (shape && shape.problem === 'at_most') {
    lines.push(fill('format.structNeedsAtMost',
      'This format takes at most {max} entrants.', { max: entry.max_participants }));
  } else if (shape && shape.problem === 'even') {
    lines.push(tt('format.structNeedsEven',
      'This format needs an even number, so nobody is left without an opponent.'));
  }

  // Said last, and said plainly: the bracket that gets drawn today is not
  // always the one the format names. Somebody choosing Swiss should learn that
  // here rather than on the day they generate it.
  if (entry.drawn_as_differs) {
    lines.push(fill('format.structDrawnAs',
      'The bracket V-ENT draws for this today is {drawn}. The rest of the format, its scoring and its tie-breakers, applies as written.',
      { drawn: formatLabel(tt, entry.drawn_as) }));
  }

  return lines;
}
