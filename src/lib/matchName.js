import { formatKey } from '@/lib/formatLabel';

/**
 * What a match is called in a format whose matches are not simply "round n":
 * a stepladder's rungs, a page playoff's four games, winner stays on's
 * challenges, and a match played for places below first.
 *
 * One definition, read by the public bracket and by the organiser's Match
 * Control. The console said "R4 · M1" for a stepladder final the bracket
 * called "Final" (walk, 28 September 2026). Returns null for an ordinary
 * round, so each screen keeps its own compact or long form for those.
 */
export function matchName(tt, match, format) {
  if (!match) return null;
  const f = formatKey(format);
  const winnerPlace = Number(match.winner_place) || 0;
  const loserPlace = Number(match.loser_place) || 0;
  if (winnerPlace > 1 && loserPlace) {
    return tt('bracket.forPlaces', 'For places {a} and {b}')
      .replace('{a}', winnerPlace).replace('{b}', loserPlace);
  }
  // A match on the way to a range of places (the semi-finals for fifth to
  // eighth): "R2 · M3" read like a third semi-final of the main draw.
  const range = Array.isArray(match.places) && match.places.length === 2 ? match.places : null;
  if (range && !winnerPlace && match.side === 'placement') {
    return (range[1] - range[0] === 1
      ? tt('bracket.placesAandB', 'Places {a} and {b}')
      : tt('bracket.placesAtoB', 'Places {a} to {b}'))
      .replace('{a}', range[0]).replace('{b}', range[1]);
  }
  const round = match.round ?? match.round_number;
  if (f === 'stepladder') {
    return match.is_final ? tt('bracket.final', 'Final') : tt('bracket.rungN', 'Rung {n}').replace('{n}', round);
  }
  if (f === 'page_playoff') {
    if (match.is_final) return tt('bracket.final', 'Final');
    if (match.side === 'losers' && Number(round) === 2) return tt('bracket.pageSemi', 'Semi-final');
    return match.side === 'losers'
      ? tt('bracket.pageBottom', 'Third against fourth')
      : tt('bracket.pageTop', 'First against second');
  }
  if (f === 'winner_stays_on') return tt('bracket.challengeN', 'Challenge {n}').replace('{n}', round);
  // Any other format's deciding match is its final, wherever it sits.
  if (match.side === 'grand_final') return tt('bracket.grandFinal', 'Grand final');
  if (match.is_final) return tt('bracket.final', 'Final');
  return null;
}
