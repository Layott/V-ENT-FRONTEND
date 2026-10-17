// A ladder of five, d_ladder_table() on the bracket page: one table that
// stays open, results added as they are played. Femi starts at the bottom and
// climbs, which is the point of a ladder.

import { seed } from '../story';
import { roundsScene } from '../rounds';

const explainer = {
  key: 'ladder',
  title: 'Ladder',
  lines: [
    'Everyone starts on one table that stays open for the whole season.',
    'Play whenever you like. Every win adds points, and you climb past the players you overtake.',
    'The order keeps changing as results come in, and whoever is on top at the end wins.',
  ],
  build() {
    const { story } = roundsScene({
      key: 'ladder',
      players: [seed(1), seed(2), seed(3), seed(4), seed(5)],
      rounds: [
        [['Femi', 'Kojo', 2, 1], ['Zara', 'Ada', 2, 0]],
        [['Femi', 'Tunde', 2, 0], ['Kojo', 'Zara', 2, 1]],
        [['Ada', 'Femi', 2, 1], ['Kojo', 'Tunde', 2, 0]],
        [['Femi', 'Zara', 2, 0], ['Ada', 'Kojo', 2, 1]],
      ],
      heading: (n) => ({ k: 'week', vars: { n } }),
      cols: ['w', 'l', 'pts'],
      times: { intro: 3600, results: 2900, table: 3400, end: 6500 },
    });
    return story.scene();
  },
};

export default explainer;
