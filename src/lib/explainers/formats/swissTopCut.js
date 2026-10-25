// A Swiss with a top cut of four (plan preset swiss_top_cut, P3 W3c): everybody
// plays a fixed number of Swiss rounds, nobody is sent out early, and the top
// places play a single elimination bracket. The records below are the ones the
// three rounds leave; the bracket is laid out from the four who go through.

import { Story, PLAYERS, seed } from '../story';
import { table } from '../table';
import { bracket } from '../knockout';

const RECORDS = [
  ['Kojo', 3, 0], ['Ada', 2, 1], ['Zara', 2, 1], ['Amara', 2, 1],
  ['Femi', 1, 2], ['Tunde', 1, 2], ['Sipho', 1, 2], ['Lola', 0, 3],
].map(([name, won, lost]) => ({ name, won, lost }));
const NAMES = PLAYERS.map((p) => p.name);
const TOP = RECORDS.slice(0, 4).map((r) => r.name);
const who = (name) => PLAYERS.find((p) => p.name === name);
const cells = (row) => [row.won, row.lost];

const explainer = {
  key: 'swiss_top_cut',
  title: 'Swiss with a top cut',
  lines: [
    'Everybody plays a fixed number of Swiss rounds, and the record decides who goes on.',
    'The top places go into a single elimination bracket, where one loss is out.',
    'Nobody is sent out early, so everybody plays every Swiss round.',
  ],
  build() {
    const st = new Story('swiss_top_cut');
    const t = table(st, {
      x: 12,
      y: 40,
      w: 226,
      rowH: 24,
      names: NAMES,
      cols: [
        { k: 'won', x: 150 },
        { k: 'lost', x: 200 },
      ],
      nameX: 30,
    });
    const b = bracket(st, {
      x0: 252,
      y0: 60,
      chipW: 96,
      gapX: 22,
      cols: [
        [
          { id: 's1', a: who('Kojo'), b: who('Amara') },
          { id: 's2', a: who('Ada'), b: who('Zara') },
        ],
        [{ id: 'f', src: ['s1', 's2'] }],
      ],
      heads: ['semis', 'final'],
      headY: 40,
    });

    st.step(0, 6000, t.reveal());
    st.step(0, 5000, t.update(RECORDS, cells));
    st.step(1, 4000, t.mark(RECORDS[0].name, 'through'), ...TOP.slice(1).map((n) => t.mark(n, 'through')),
      ...RECORDS.slice(4).map((r) => t.mark(r.name, 'out')), b.frame());
    st.step(1, 4000, b.entrants(), b.play('s1', 0), b.play('s2', 1));
    st.step(2, 4000, b.play('f', 0));
    st.step(2, 6000, b.crown('f', 0));
    st.step(2, 4000, {});
    return st.scene();
  },
};

export default explainer;
