// The fifty party games, in the order the CEO asked for them: Africa, then the
// United Kingdom, then worldwide (inbox 434 and 439, 12 October 2026).
//
// Keys, region and kind only. The server holds the same list with the numbers
// (V-ENT-BACKEND vent_event/party_games.py); the words are in ./words/<language>.js
// and the animations in ./stories.js. tools/check-party-games.py fails when any of
// them disagree.

export const REGIONS = ['africa', 'uk', 'world'];

export const KINDS = ['cards', 'board', 'moving', 'music', 'quiz', 'words', 'skill', 'video',
  'social', 'numbers', 'acting', 'drawing', 'hands'];

export const GAMES = [
  // Africa
  { key: 'whot', region: 'africa', kind: 'cards' },
  { key: 'ludo', region: 'africa', kind: 'board' },
  { key: 'ayo', region: 'africa', kind: 'board' },
  { key: 'draughts', region: 'africa', kind: 'board' },
  { key: 'ten-ten', region: 'africa', kind: 'moving' },
  { key: 'ampe', region: 'africa', kind: 'moving' },
  { key: 'musical-chairs', region: 'africa', kind: 'music' },
  { key: 'afro-dance-off', region: 'africa', kind: 'music' },
  { key: 'finish-the-lyrics', region: 'africa', kind: 'quiz' },
  { key: 'guess-the-slang', region: 'africa', kind: 'words' },
  { key: 'name-animal-place-thing', region: 'africa', kind: 'words' },
  { key: 'lemon', region: 'africa', kind: 'words' },
  { key: 'fire-on-the-mountain', region: 'africa', kind: 'moving' },
  { key: 'pilolo', region: 'africa', kind: 'moving' },
  { key: 'morabaraba', region: 'africa', kind: 'board' },
  { key: 'thirty-seconds', region: 'africa', kind: 'words' },
  { key: 'diketo', region: 'africa', kind: 'skill' },
  { key: 'kgati', region: 'africa', kind: 'moving' },
  { key: 'winner-stays-on', region: 'africa', kind: 'video' },
  { key: 'king-of-the-hill', region: 'africa', kind: 'video' },
  // United Kingdom
  { key: 'pass-the-parcel', region: 'uk', kind: 'music' },
  { key: 'musical-statues', region: 'uk', kind: 'music' },
  { key: 'wink-murder', region: 'uk', kind: 'social' },
  { key: 'sardines', region: 'uk', kind: 'moving' },
  { key: 'quiz-night', region: 'uk', kind: 'quiz' },
  { key: 'articulate', region: 'uk', kind: 'words' },
  { key: 'herd-mentality', region: 'uk', kind: 'social' },
  { key: 'egg-and-spoon', region: 'uk', kind: 'moving' },
  { key: 'sack-race', region: 'uk', kind: 'moving' },
  { key: 'bingo', region: 'uk', kind: 'numbers' },
  { key: 'simon-says', region: 'uk', kind: 'moving' },
  { key: 'charades', region: 'uk', kind: 'acting' },
  // Worldwide
  { key: 'uno', region: 'world', kind: 'cards' },
  { key: 'jenga', region: 'world', kind: 'skill' },
  { key: 'pictionary', region: 'world', kind: 'drawing' },
  { key: 'taboo', region: 'world', kind: 'words' },
  { key: 'codenames', region: 'world', kind: 'words' },
  { key: 'mafia', region: 'world', kind: 'social' },
  { key: 'two-truths', region: 'world', kind: 'social' },
  { key: 'never-have-i-ever', region: 'world', kind: 'social' },
  { key: 'truth-or-dare', region: 'world', kind: 'social' },
  { key: 'tug-of-war', region: 'world', kind: 'moving' },
  { key: 'twister', region: 'world', kind: 'moving' },
  { key: 'karaoke', region: 'world', kind: 'music' },
  { key: 'limbo', region: 'world', kind: 'moving' },
  { key: 'rock-paper-scissors', region: 'world', kind: 'hands' },
  { key: 'red-light-green-light', region: 'world', kind: 'moving' },
  { key: 'cup-pong', region: 'world', kind: 'skill' },
  { key: 'just-dance', region: 'world', kind: 'video' },
  { key: 'mario-kart', region: 'world', kind: 'video' },
];

export const BY_KEY = Object.fromEntries(GAMES.map((g) => [g.key, g]));
