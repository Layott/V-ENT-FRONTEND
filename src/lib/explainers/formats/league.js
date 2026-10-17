// A league of four played home and away: six matchdays, and the second three
// are the first three with the sides swapped. The table is the same table as
// a round robin (inbox 440); what makes it a league is meeting twice.

import { seed } from '../story';
import { roundsScene } from '../rounds';

const explainer = {
  key: 'league',
  title: 'League',
  lines: [
    'Every team plays every other team twice, once at home and once away.',
    'Each matchday adds to the table: 3 points for a win, 1 for a draw.',
    'After the last matchday, the team at the top wins the league.',
  ],
  build() {
    const { story } = roundsScene({
      key: 'league',
      players: [seed(1), seed(2), seed(3), seed(4)],
      rounds: [
        [['Kojo', 'Zara', 2, 0], ['Ada', 'Tunde', 1, 1]],
        [['Tunde', 'Kojo', 2, 1], ['Zara', 'Ada', 0, 1]],
        [['Kojo', 'Ada', 1, 1], ['Tunde', 'Zara', 3, 0]],
        [['Zara', 'Kojo', 1, 1], ['Tunde', 'Ada', 0, 2]],
        [['Kojo', 'Tunde', 2, 1], ['Ada', 'Zara', 3, 1]],
        [['Ada', 'Kojo', 0, 0], ['Zara', 'Tunde', 2, 2]],
      ],
      heading: (n) => ({ k: 'matchday', vars: { n, total: 6 } }),
      cols: ['p', 'w', 'd', 'l', 'pts'],
      sides: true,
      times: { intro: 3600, results: 2900, table: 3300, end: 6500 },
    });
    return story.scene();
  },
};

export default explainer;
