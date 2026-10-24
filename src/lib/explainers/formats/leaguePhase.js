// A league phase of eight (inbox 476): everybody is dealt into two pots by
// seed, and each player meets two opponents from each pot, nobody twice. One
// table ranks the whole field, the way a league's does; what makes it a phase
// is that the field is split into pots rather than everybody meeting everybody.

import { seed } from '../story';
import { roundsScene } from '../rounds';

// Hand check of the schedule (pot 1 is seeds 1-4, pot 2 is seeds 5-8).
//
// Within each pot the four play a ring, so each meets two of its own pot:
//   pot 1: 1-2, 2-3, 3-4, 4-1      pot 2: 5-6, 6-7, 7-8, 8-5
// Across the pots each plays two of the other, a ring of eight:
//   1-5, 5-4, 4-8, 8-3, 3-7, 7-2, 2-6, 6-1
// That is 16 matches, each player in four of them, and nobody meets anybody
// twice. They split into four rounds of four with nobody in a round twice:
//   round 1: 1-2, 3-4, 5-6, 7-8     round 2: 2-3, 1-4, 6-7, 5-8
//   round 3: 1-5, 2-6, 3-7, 4-8     round 4: 1-6, 2-7, 3-8, 4-5
// The home side follows the direction round each ring, 1 to 2 to 3 to 4 to 1
// and so on, so every player is the home side in exactly two of their four.
// Each row below is [home, away, home goals, away goals].

const explainer = {
  key: 'league_phase',
  title: 'League phase',
  lines: [
    'Everybody is dealt into pots by seed, strongest first.',
    'Each plays a few opponents from every pot, about half at home, and nobody twice.',
    'One table ranks the whole field: 3 points for a win, 1 for a draw.',
  ],
  build() {
    const { story } = roundsScene({
      key: 'league_phase',
      players: [1, 2, 3, 4, 5, 6, 7, 8].map(seed),
      rounds: [
        [['Kojo', 'Ada', 2, 1], ['Tunde', 'Zara', 1, 1], ['Femi', 'Amara', 0, 2], ['Sipho', 'Lola', 3, 0]],
        [['Ada', 'Tunde', 0, 1], ['Zara', 'Kojo', 1, 2], ['Amara', 'Sipho', 2, 2], ['Lola', 'Femi', 1, 0]],
        [['Kojo', 'Femi', 3, 1], ['Ada', 'Amara', 2, 0], ['Tunde', 'Sipho', 0, 0], ['Zara', 'Lola', 1, 3]],
        [['Amara', 'Kojo', 1, 2], ['Sipho', 'Ada', 0, 1], ['Lola', 'Tunde', 2, 2], ['Femi', 'Zara', 1, 0]],
      ],
      heading: (n) => ({ k: 'round', vars: { n } }),
      cols: ['p', 'w', 'd', 'l', 'pts'],
      sides: true,
      rowH: 26,
      times: { intro: 3600, results: 2900, table: 3300, end: 6500 },
    });
    return story.scene();
  },
};

export default explainer;
