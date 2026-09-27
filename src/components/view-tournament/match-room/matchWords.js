// The words for a match that more than one screen shows: what to set up in
// the game, a match's status, and the button that applies a game's preset.
//
// Literal keys, one per case, so the translation checker can see every one of
// them. A key built with a template string is invisible to it, and a key the
// checker cannot see is the one that ships untranslated.

/** A preset stores a key for its room text; an organiser's own words are shown as written. */
export function roomText(tt, value) {
  if (!value) return '';
  switch (value) {
    case 'room.fc_mobile.group':
      return tt('room.fc_mobile.group',
        'Head to Head, Quick Match room. Full 90 minutes of game time. A draw stands in the group.');
    case 'room.fc_mobile.knockout':
      return tt('room.fc_mobile.knockout',
        'Head to Head, Quick Match room. Extra time and penalties on.');
    case 'room.efootball.group':
      return tt('room.efootball.group',
        'Friend Match room with a password. 6 minute match, authentic teams, excellent condition for both. A draw stands in the group.');
    case 'room.efootball.knockout':
      return tt('room.efootball.knockout',
        'Friend Match room with a password. 6 minute match, extra time and penalties on, authentic teams.');
    default:
      return value.startsWith('room.') ? '' : value;
  }
}

export function statusWord(tt, status) {
  switch (status) {
    case 'scheduled': return tt('match.status.scheduled', 'To be played');
    case 'in_progress': return tt('match.status.in_progress', 'Being played');
    case 'pending_opponent_confirm': return tt('match.status.pending', 'Waiting for the other side to confirm');
    case 'completed': return tt('match.status.completed', 'Finished');
    case 'disputed': return tt('match.status.disputed', 'Disputed, with the organiser');
    case 'bye': return tt('match.status.bye', 'Went through without playing');
    case 'walkover_p1':
    case 'walkover_p2': return tt('match.status.walkover', 'Walkover');
    case 'cancelled': return tt('match.status.cancelled', 'Not played');
    default: return status || '';
  }
}

export function presetButton(tt, key) {
  switch (key) {
    case 'fc mobile': return tt('stages.preset.fc_mobile', 'Use the FC Mobile settings');
    case 'efootball': return tt('stages.preset.efootball', 'Use the eFootball settings');
    case 'ea fc': return tt('stages.preset.ea_fc', 'Use the EA FC settings');
    default: return tt('stages.preset.generic', 'Use the recommended settings for this game');
  }
}
