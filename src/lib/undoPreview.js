import { matchName } from '@/lib/matchName';
import { plural } from '@/lib/plural';

// What an undo would take with it, said the same way on every screen that
// offers one (P4b).
//
// The doors that undo played results answer `preview` with what they WOULD
// remove, clear and move, and change nothing. A screen shows that answer
// before its real call, so the organiser presses the confirm knowing the
// count. Each screen reads the same answer, so the sentence lives here once.

// "This undoes 3 matches and clears 1 result." The numbers are counted here,
// not in the server's English, so the sentence reads right in every language.
export function undoSentence(tt, preview) {
  const matches = Number(preview?.matches_removed) || (preview?.matches_undone || []).length;
  const results = Number(preview?.results_cleared) || 0;
  if (!matches && !results) return tt('undo.nothing', 'Nothing in the bracket is removed.');
  const matchText = plural(tt, matches, 'undo.matchOne', '{n} match', 'undo.matchMany', '{n} matches');
  if (!results) {
    return tt('undo.noResult', 'This undoes {matches}. No result is lost.').replace('{matches}', matchText);
  }
  const resultText = plural(tt, results, 'undo.resultOne', '{n} result', 'undo.resultMany', '{n} results');
  return tt('undo.sentence', 'This undoes {matches} and clears {results}.')
    .replace('{matches}', matchText)
    .replace('{results}', resultText);
}

// One match as the organiser knows it: its name in the format when it has one,
// otherwise its round and place in the round, its group, and the two sides by
// the names they play under. Never the database ids the server sends.
export function matchLine(tt, brief, format, nameOf = () => '') {
  const named = matchName(tt, { ...brief, round: brief.round_number, side: brief.bracket_side }, format);
  const place = named || tt('match.titleRound', 'Round {r}, match {m}')
    .replace('{r}', brief.round_number)
    .replace('{m}', brief.match_number);
  const group = brief.group_number
    ? tt('bracket.groupN', 'Group {g}').replace('{g}', String.fromCharCode(64 + Number(brief.group_number)))
    : '';
  const one = nameOf(brief.participant_1);
  const two = nameOf(brief.participant_2);
  const pair = one && two ? tt('undo.pair', '{a} vs {b}').replace('{a}', one).replace('{b}', two) : '';
  return [group, place, pair].filter(Boolean).join(' · ');
}

// The first few matches a preview would touch, and how many are left over.
export const PREVIEW_SHOWN = 8;
