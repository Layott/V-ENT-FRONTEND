// Stepladder with 5 entrants, d_stepladder() on the bracket page: the lowest
// seeds play first and each winner climbs to the next seed up.

import { Story, seed } from '../story';
import { bracket } from '../knockout';

const explainer = {
  key: 'stepladder',
  title: 'Stepladder',
  lines: [
    'The two lowest-ranked players play first.',
    'Each winner climbs one step to face the next player up.',
    'The top-ranked player waits at the top and plays only the final.',
  ],
  build() {
    const st = new Story('stepladder');
    const b = bracket(st, {
      chipW: 96,
      gapX: 22,
      y0: 28,
      cols: [
        [{ id: 'm1', a: seed(5), b: seed(4), y: 168, label: { k: 'match', vars: { n: 1 } } }],
        [{ id: 'm2', src: ['m1', null], b: seed(3), y: 120, label: { k: 'match', vars: { n: 2 } } }],
        [{ id: 'm3', src: ['m2', null], b: seed(2), y: 72, label: { k: 'match', vars: { n: 3 } } }],
        [{ id: 'f', src: ['m3', null], b: seed(1), y: 24, label: 'final' }],
      ],
    });
    const f = b.pos.f;
    const under = f.y + b.matchH + 10;
    st.add('waits', { t: 'text', x: f.x, y: under + 12, k: 'waits', size: 10, tone: 'muted', o: 0 });
    st.add('champ', { t: 'tag', x: f.x, y: under, w: b.chipW, h: 22, k: 'champion', tone: 'gold', o: 0 });

    st.step(0, 2400, b.frame());
    st.step(0, 4000, b.entrants(), { waits: { o: 1 } });
    st.step(0, 4400, b.play('m1', 1));
    st.step(1, 4500, b.play('m2', 0));
    st.step(1, 4500, b.play('m3', 0));
    st.step(2, 5000, b.play('f', 1), { waits: { o: 0 } });
    st.step(2, 7000, b.crown('f', 1), { champ: { o: 1 } });
    return st.scene();
  },
};

export default explainer;
