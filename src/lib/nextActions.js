// The words for what a person has to do next, and for what the people running
// a tournament have to settle (P4a, design section 12).
//
// The API sends instants and keys, never sentences (V-ENT-BACKEND
// vent_tournament/next_actions.py). This turns them into what the reader sees,
// in the language they chose, and every deadline goes through formatWithZone
// so the time is in their zone and the zone is named.

import { formatWithZone } from '@/lib/datetime';

const when = (value) => (value ? formatWithZone(value) : '');

/** The sentence for one of the viewer's next actions (`for_viewer` row). */
export function nextActionText(tt, action) {
  const deadline = when(action.deadline);
  const opponent = action.match?.opponent || tt('next.theOpponent', 'your opponent');
  switch (action.action) {
    case 'decline_place':
      return tt('next.decline_place', 'You can decline your place. Decide by {deadline}.')
        .replace('{deadline}', deadline);
    case 'check_in':
      return tt('next.check_in', 'Check in by {deadline} or you are taken out.')
        .replace('{deadline}', deadline);
    case 'check_in_match':
      return tt('next.check_in_match', 'Check in for your match against {opponent} by {deadline}.')
        .replace('{opponent}', opponent)
        .replace('{deadline}', deadline);
    case 'confirm_score':
      return tt('next.confirm_score', 'Confirm or dispute the score reported for your match against {opponent}.')
        .replace('{opponent}', opponent);
    case 'report':
      return tt('next.report', 'Report the result of your match against {opponent}.')
        .replace('{opponent}', opponent);
    case 'play':
      return tt('next.play', 'Play {opponent} at {deadline}.')
        .replace('{opponent}', opponent)
        .replace('{deadline}', deadline);
    case 'register':
      return tt('next.register', 'Register before {deadline}.')
        .replace('{deadline}', deadline);
    default:
      return '';
  }
}

/** The sentence for one row of the actions list (`actions_list` item). */
export function todoText(tt, item) {
  const stage = item.stage?.label || tt('todo.aStage', 'a stage');
  const sides = item.match?.sides || [];
  const matchSides = tt('todo.sides', '{a} vs {b}')
    .replace('{a}', sides[0] || '')
    .replace('{b}', sides[1] || '');
  const detail = item.detail || {};
  switch (item.kind) {
    case 'dispute':
      return tt('todo.dispute', 'A dispute on {sides} is waiting to be settled.')
        .replace('{sides}', matchSides);
    case 'no_show':
      return tt('todo.no_show', 'Neither side of {sides} checked in. Decide what happens.')
        .replace('{sides}', matchSides);
    case 'unconfirmed':
      return tt('todo.unconfirmed', 'The result for {sides} is still waiting for the other side to confirm.')
        .replace('{sides}', matchSides);
    case 'late':
      return tt('todo.late', '{sides} has not started two hours after it was due.')
        .replace('{sides}', matchSides);
    case 'tie': {
      const [first, last] = detail.places || [];
      return tt('todo.tie', 'A tie for places {first} to {last} in {stage} needs settling: {names}.')
        .replace('{first}', first)
        .replace('{last}', last)
        .replace('{stage}', stage)
        .replace('{names}', (detail.names || []).join(', '));
    }
    case 'declined':
      if (Number(detail.count) === 1) {
        return tt('todo.declinedOne', 'A place in {stage} was declined and needs filling.')
          .replace('{stage}', stage);
      }
      return tt('todo.declined', '{count} places in {stage} were declined and need filling.')
        .replace('{count}', String(detail.count || 0))
        .replace('{stage}', stage);
    case 'advance':
      return tt('todo.advance', '{stage} has finished. Send its places on when you have previewed them.')
        .replace('{stage}', stage);
    case 'pull':
      return tt('todo.pull', '{stage} has finished and a pull is waiting for you.')
        .replace('{stage}', stage);
    case 'close_check_in':
      return tt('todo.close_check_in', 'Check-in time has ended. Close it to take out whoever has not checked in.');
    default:
      return '';
  }
}

/** The console tab that settles each kind of item. */
export const TAB_FOR_KIND = {
  dispute: 'match-control',
  no_show: 'match-control',
  unconfirmed: 'match-control',
  late: 'match-control',
  tie: 'brackets',
  declined: 'brackets',
  advance: 'brackets',
  pull: 'brackets',
};
