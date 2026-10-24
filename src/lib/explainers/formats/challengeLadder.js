// A challenge ladder of five, the ladder a bracket page runs (inbox 476). The
// places are drawn top to bottom and a player challenges somebody a few places
// above them: a win swaps the two, a loss changes nothing. Played out from the
// challenges, so where everybody stands is worked out rather than placed by
// hand, the way winner stays on is.

import { Story, seed, show } from '../story';

const CHIP_W = 150;
const CHIP_H = 26;
const CHIP_X = 140;
const NUMBER_X = 118;
const PLACE_Y = [46, 88, 130, 172, 214];
const OUTCOME = { x: 308, y: 130 };
const placeAt = (i) => ({ x: CHIP_X, y: PLACE_Y[i] });

// Hand check: the order starts Kojo, Ada, Tunde, Zara, Femi.
//   Zara (4) challenges Ada (2) and wins: Kojo, Zara, Tunde, Ada, Femi.
//   Femi (5) challenges Ada (4) and loses: the order stays as it is.
//   Tunde (3) challenges Kojo (1) and wins: Tunde, Zara, Kojo, Ada, Femi.
const CHALLENGES = [
  { challenger: 'Zara', defender: 'Ada', won: true },
  { challenger: 'Femi', defender: 'Ada', won: false },
  { challenger: 'Tunde', defender: 'Kojo', won: true },
];

const explainer = {
  key: 'challenge_ladder',
  title: 'Challenge ladder',
  lines: [
    'Everybody holds a place on the ladder, the top seed first.',
    'Challenge somebody up to a few places above you. Win, and you swap places.',
    'Lose, and you stay where you are. The ladder runs until the stage ends.',
  ],
  build() {
    const st = new Story('challenge_ladder');
    const players = [1, 2, 3, 4, 5].map(seed);
    const state = players.map((p) => p.name);
    const chipId = (name) => `c_${name}`;

    players.forEach((p, i) => {
      st.add(`n_${i + 1}`, { t: 'text', x: NUMBER_X, y: PLACE_Y[i] + 17, v: String(i + 1), size: 11, tone: 'muted', weight: 600, anchor: 'middle', o: 0 });
      st.add(chipId(p.name), { t: 'chip', ...placeAt(i), w: CHIP_W, h: CHIP_H, name: p.name, o: 0 });
    });
    st.add('outcome', { t: 'text', x: OUTCOME.x, y: OUTCOME.y, k: 'challengeWon', vars: { winner: '' }, size: 11, weight: 600, o: 0 });

    // Every chip where the order says, with its tone cleared.
    const places = () => Object.fromEntries(state.map((name, i) => [chipId(name), { ...placeAt(i), tone: '' }]));

    st.step(0, 7000, show(players.map((p, i) => `n_${i + 1}`), players.map((p) => chipId(p.name))));

    CHALLENGES.forEach(({ challenger, defender, won }, i) => {
      const line = i === 0 ? 1 : 2;
      st.step(line, 2800,
        places(),
        { [chipId(challenger)]: { tone: 'lit' }, [chipId(defender)]: { tone: 'lit' } },
        { outcome: { o: 0 } });
      const winner = won ? challenger : defender;
      if (won) {
        const from = state.indexOf(challenger);
        const to = state.indexOf(defender);
        state[from] = defender;
        state[to] = challenger;
      }
      st.step(line, 3600,
        places(),
        { [chipId(winner)]: { tone: 'win' }, [chipId(won ? defender : challenger)]: { tone: 'out' } },
        { outcome: { k: won ? 'challengeWon' : 'challengeHeld', vars: { winner }, o: 1 } });
    });
    st.step(2, 6000, {});
    return st.scene();
  },
};

export default explainer;
