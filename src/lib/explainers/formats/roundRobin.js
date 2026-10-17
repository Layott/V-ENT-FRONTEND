// Round robin of four, d_rr() on the bracket page: every result, then the
// table those results make. Points are the catalogue's 3 for a win, 1 for a
// draw (`points_3_1_0` in vent_tournament/formats.py).

import { seed } from '../story';
import { roundsScene } from '../rounds';

const explainer = {
  key: 'round_robin',
  title: 'Round robin',
  lines: [
    'Everyone plays everyone else once.',
    'A win is worth 3 points and a draw 1, and the table changes after every round.',
    'Whoever has the most points at the end finishes first.',
  ],
  build() {
    const { story } = roundsScene({
      key: 'round_robin',
      players: [seed(1), seed(2), seed(3), seed(4)],
      rounds: [
        [['Kojo', 'Zara', 2, 1], ['Ada', 'Tunde', 1, 1]],
        [['Kojo', 'Tunde', 1, 1], ['Ada', 'Zara', 2, 0]],
        [['Ada', 'Kojo', 1, 0], ['Tunde', 'Zara', 3, 1]],
      ],
      heading: (n) => ({ k: 'round', vars: { n } }),
      cols: ['w', 'd', 'l', 'pts'],
      times: { intro: 3400, results: 4000, table: 4200, end: 6500 },
    });
    return story.scene();
  },
};

export default explainer;
