// Double elimination with 4 entrants. Four is the smallest draw that still
// shows every part of it, an upper bracket, a lower bracket fed by its losers
// and a grand final, and small enough to read on a phone.

import { Story, seed } from '../story';
import { bracket } from '../knockout';

const explainer = {
  key: 'double_elimination',
  title: 'Double elimination',
  lines: [
    'Everyone starts in the upper bracket.',
    'Lose once and you drop to the lower bracket. Lose twice and you are out.',
    'The winners of both brackets meet in the grand final.',
  ],
  build() {
    const st = new Story('double_elimination');
    const b = bracket(st, {
      chipW: 100,
      gapX: 18,
      y0: 36,
      cols: [
        [{ id: 'u1', a: seed(1), b: seed(4) }, { id: 'u2', a: seed(2), b: seed(3) }],
        [{ id: 'uf', src: ['u1', 'u2'] }, { id: 'l1', y: 136 }],
        [{ id: 'lf', src: ['l1', null] }],
        [{ id: 'gf', src: ['uf', 'lf'], label: 'grandFinal' }],
      ],
      heads: ['upper'],
    });
    st.add('lowerHead', { t: 'text', x: b.pos.l1.x, y: b.pos.l1.y - 10, k: 'lower', size: 10, tone: 'muted', weight: 600, o: 0 });
    const gf = b.pos.gf;
    st.add('champ', { t: 'tag', x: gf.x, y: gf.y - 42, w: b.chipW, h: 22, k: 'champion', tone: 'gold', o: 0 });

    st.step(0, 2200, b.frame(), { lowerHead: { o: 1 } });
    st.step(0, 3500, b.entrants());
    st.step(1, 4200, b.play('u1', 0, { drop: { to: 'l1', side: 0 } }));
    st.step(1, 4200, b.play('u2', 1, { drop: { to: 'l1', side: 1 } }));
    st.step(1, 4200, b.play('uf', 0, { drop: { to: 'lf', side: 1 } }));
    st.step(1, 4200, b.play('l1', 1));
    st.step(1, 4200, b.play('lf', 0));
    st.step(2, 5000, b.play('gf', 0));
    st.step(2, 7000, b.crown('gf', 0), { champ: { o: 1 } });
    return st.scene();
  },
};

export default explainer;
