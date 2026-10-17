import { matchName } from '@/lib/matchName';

/**
 * Where one side of a match comes from, in words (P1a).
 *
 * CEO, 16 October 2026: "i aprove the design". Section 8 of the bracket
 * structure design: every slot knows where it came from, so a seat nobody has
 * reached says "Winner of Round 2, match 1" instead of "To be decided", and a
 * bracket can be read whole before anyone has played. The server sends the
 * facts (`match.slots`: kind, seed, the match it comes from); the words are
 * built here so they read in the visitor's language.
 *
 * One definition, read by the bracket, the fixture card, the match room, the
 * running order and the organiser's console.
 */

/** "Round 2, match 1", "Group B, Round 1, match 2", or the match's own name. */
export function sourceName(tt, from, format) {
  if (!from) return null;
  const named = matchName(tt, {
    round: from.round, side: from.side, is_final: from.is_final,
    winner_place: from.winner_place, loser_place: from.loser_place,
  }, format);
  if (named) return named;
  const round = from.side === 'losers'
    ? tt('bracket.losersRoundN', 'Losers round {n}').replace('{n}', from.round)
    : tt('bracket.roundN', 'Round {n}').replace('{n}', from.round);
  const group = from.group
    ? `${tt('bracket.groupN', 'Group {g}').replace('{g}', String.fromCharCode(64 + Number(from.group)))}, `
    : '';
  return group + tt('bracket.matchInRound', '{round}, match {n}')
    .replace('{round}', round).replace('{n}', from.number);
}

/** The placeholder for an empty seat, or null when there is nothing better to say. */
export function slotLabel(tt, slot, format) {
  if (!slot) return null;
  if (slot.kind === 'winner' || slot.kind === 'loser') {
    const name = sourceName(tt, slot.from, format);
    if (!name) return null;
    return (slot.kind === 'winner'
      ? tt('bracket.winnerOf', 'Winner of {match}')
      : tt('bracket.loserOf', 'Loser of {match}')).replace('{match}', name);
  }
  // A seat in a stage drawn early waits for a place in a stage that feeds it
  // (P1d): "Groups: group A, place 1".
  if (slot.kind === 'place' && slot.from_place) {
    const p = slot.from_place;
    // From a circuit's ranking (P5c): "Naija Pro Circuit ranking: place 3".
    if (p.circuit) {
      return tt('bracket.slotPlaceCircuit', '{circuit} ranking: place {n}')
        .replace('{circuit}', p.circuit).replace('{n}', p.place);
    }
    // From another tournament (P2): "Lagos Qualifier, League: place 1".
    if (p.tournament) {
      return (p.group
        ? tt('bracket.slotPlaceTournamentGroup', '{tournament}, {stage}: group {g}, place {n}')
          .replace('{g}', String.fromCharCode(64 + Number(p.group)))
        : tt('bracket.slotPlaceTournament', '{tournament}, {stage}: place {n}'))
        .replace('{tournament}', p.tournament).replace('{stage}', p.stage || '').replace('{n}', p.place);
    }
    return (p.group
      ? tt('bracket.slotPlaceGroup', '{stage}: group {g}, place {n}')
        .replace('{g}', String.fromCharCode(64 + Number(p.group)))
      : tt('bracket.slotPlace', '{stage}: place {n}'))
      .replace('{stage}', p.stage || '').replace('{n}', p.place);
  }
  // A seat of a reseeded knockout (P3 W1): the survivor at this rank of seed,
  // the best remaining against the worst remaining.
  if (slot.kind === 'reseed' && slot.rank) {
    return tt('bracket.slotReseed', 'Seed rank {n} of those still in').replace('{n}', slot.rank);
  }
  if (slot.kind === 'reset') return tt('bracket.ifNeeded', 'Played only if needed');
  if (slot.kind === 'bye') return tt('bracket.byeSlot', 'Bye');
  if (slot.kind === 'entrant' && slot.seed) return tt('bracket.seedN', 'Seed {n}').replace('{n}', slot.seed);
  return null;
}

/** The slot row for side 1 or 2 of a match, whatever shape the match came in. */
export function slotOf(match, side) {
  return (match?.slots || []).find(s => Number(s.slot) === Number(side)) || null;
}

/** Who is in the seat, else where they will come from, else "To be decided". */
export function sideLabel(tt, match, side, format, person) {
  const who = person !== undefined ? person : (side === 1 ? match?.participant_1 : match?.participant_2);
  const name = who?.name || who?.participant?.name;
  if (name) return name;
  return slotLabel(tt, slotOf(match, side), format) || tt('bracket.tbd', 'To be decided');
}
