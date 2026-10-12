// The names of a game's region and kind, in the reader's language.
//
// One place, because the explainer, the event's Games tab and the organiser's
// catalogue browser all print them, and three copies of a label list is how a
// fourth language ends up with two of them.

export const REGION_LABELS = {
  africa: ['games.region.africa', 'Africa'],
  uk: ['games.region.uk', 'United Kingdom'],
  world: ['games.region.world', 'Worldwide'],
};

export const KIND_LABELS = {
  cards: ['games.kind.cards', 'Cards'],
  board: ['games.kind.board', 'Board'],
  moving: ['games.kind.moving', 'Moving'],
  music: ['games.kind.music', 'Music and dance'],
  quiz: ['games.kind.quiz', 'Quiz'],
  words: ['games.kind.words', 'Words'],
  skill: ['games.kind.skill', 'Skill'],
  video: ['games.kind.video', 'Video game'],
  social: ['games.kind.social', 'Talk and bluff'],
  numbers: ['games.kind.numbers', 'Numbers'],
  acting: ['games.kind.acting', 'Acting'],
  drawing: ['games.kind.drawing', 'Drawing'],
  hands: ['games.kind.hands', 'Hands'],
};

export const regionName = (tt, region) => {
  const label = REGION_LABELS[region];
  return label ? tt(label[0], label[1]) : '';
};

export const kindName = (tt, kind) => {
  const label = KIND_LABELS[kind];
  return label ? tt(label[0], label[1]) : '';
};

/** Where a game comes from, short: the words before the first comma. */
export const shortOrigin = (origin) => String(origin || '').split(/[;,(:]/)[0].trim();
