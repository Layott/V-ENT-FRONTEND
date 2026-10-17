// A GSL group of four, d_gsl() on the bracket page: two openings, a winners
// match for first place, a losers match to stay alive, and a decider for
// second.

import { Story, seed } from '../story';
import { bracket } from '../knockout';

const explainer = {
  key: 'gsl',
  title: 'GSL groups',
  lines: [
    'Four players in a group play two opening matches.',
    'The two winners play for first place, and the two losers play to stay alive.',
    'One last match decides second place, and the top two go through.',
  ],
  build() {
    const st = new Story('gsl');
    const b = bracket(st, {
      chipW: 118,
      gapX: 34,
      y0: 40,
      cols: [
        [
          { id: 'oA', a: seed(1), b: seed(4), label: 'opening' },
          { id: 'oB', a: seed(2), b: seed(3), y: 72, label: 'opening' },
        ],
        [{ id: 'wm', src: ['oA', 'oB'], label: 'winnersMatch' }, { id: 'lm', y: 150, label: 'losersMatch' }],
        [{ id: 'dec', src: [null, 'lm'], label: 'decider' }],
      ],
    });
    const wm = b.pos.wm;
    const dec = b.pos.dec;
    const midY = wm.y + b.matchH / 2;
    st.add('firstLine', { t: 'line', d: [[wm.x + b.chipW, midY], [dec.x, midY]], o: 0 });
    st.add('first', { t: 'tag', x: dec.x, y: midY - 11, w: b.chipW, h: 22, k: 'firstThrough', tone: 'through', o: 0 });
    st.add('second', { t: 'tag', x: dec.x, y: dec.y + b.matchH + 8, w: b.chipW, h: 22, k: 'secondThrough', tone: 'through', o: 0 });

    st.step(0, 2400, b.frame());
    st.step(0, 3600, b.entrants());
    st.step(0, 4500, b.play('oA', 0, { drop: { to: 'lm', side: 0 } }));
    st.step(0, 4500, b.play('oB', 1, { drop: { to: 'lm', side: 1 } }));
    st.step(1, 5200, b.play('wm', 0, { drop: { to: 'dec', side: 0 }, winnerTone: 'through' }), { first: { o: 1 }, firstLine: { o: 1, tone: 'lit' } });
    st.step(1, 5200, b.play('lm', 1));
    st.step(2, 5500, b.play('dec', 1, { winnerTone: 'through' }), { second: { o: 1 } });
    st.step(2, 6000, {});
    return st.scene();
  },
};

export default explainer;
