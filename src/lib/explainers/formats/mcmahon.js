// A McMahon Swiss of eight in two bands (stage setting mcmahon_bands: 2). The
// field is split by seed into bands (shown here with two: the top starts on 0,
// the next on -1; a third would start on -2), and
// every round pairs players on the same score, which is their starting score
// plus the wins they have. A loss leaves the score where it is. The first round
// is drawn in the same way, so the table below is the one those scores make.

import { Story, PLAYERS } from '../story';
import { table } from '../table';

const BANDS = 2;
const NAMES = PLAYERS.map((p) => p.name);
// mcmahon_starts: seed i of n starts on -(i * bands // n).
const START = Object.fromEntries(NAMES.map((name, i) => [name, -Math.floor((i * BANDS) / NAMES.length)]));
// Round one: the top half's pairs and the bottom half's, winners first.
const WINNERS = ['Kojo', 'Tunde', 'Femi', 'Sipho'];
const WINS = Object.fromEntries(NAMES.map((n) => [n, WINNERS.includes(n) ? 1 : 0]));
const scoreOf = (name) => START[name] + WINS[name];
const AFTER_ONE = [...NAMES].sort((a, b) => (scoreOf(b) - scoreOf(a)) || (NAMES.indexOf(a) - NAMES.indexOf(b)));

const row = (name) => ({ name });
const atStart = (name) => [START[name], 0, START[name]];
const afterOne = (name) => [START[name], WINS[name], scoreOf(name)];

const explainer = {
  key: 'mcmahon',
  title: 'McMahon Swiss',
  lines: [
    'The field is split into bands by seed: the top band starts on 0, the next on -1, and so on.',
    'Every round pairs players on the same score, so the games are even from round one.',
    'A win adds one to a score, and a loss leaves it where it is.',
  ],
  build() {
    const st = new Story('mcmahon');
    const t = table(st, {
      x: 12,
      y: 40,
      w: 456,
      rowH: 26,
      names: NAMES,
      cols: [
        { k: 'start', x: 290 },
        { k: 'won', x: 360 },
        { k: 'score', x: 430, weight: 700 },
      ],
    });

    st.step(0, 6000, t.reveal(), t.update(NAMES.map(row), (r) => atStart(r.name)));
    st.step(0, 4000, {});
    st.step(1, 5000, t.update(AFTER_ONE.map(row), (r) => afterOne(r.name)));
    st.step(1, 5000, {});
    st.step(2, 6000, {});
    st.step(2, 6000, {});
    return st.scene();
  },
};

export default explainer;
