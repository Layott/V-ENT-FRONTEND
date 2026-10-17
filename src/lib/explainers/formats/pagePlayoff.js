// Page playoff with 4 entrants, d_page() on the bracket page: the top two can
// lose once, third and fourth cannot.

import { Story, seed } from '../story';
import { bracket } from '../knockout';

const explainer = {
  key: 'page_playoff',
  title: 'Page playoff',
  lines: [
    'First plays second, and the winner goes straight to the final.',
    'Third plays fourth, and the loser is out.',
    'The loser of the top match gets a second chance to reach the final.',
  ],
  build() {
    const st = new Story('page_playoff');
    const b = bracket(st, {
      chipW: 124,
      gapX: 30,
      y0: 40,
      cols: [
        [
          { id: 'p1', a: seed(1), b: seed(2), label: { k: 'match', vars: { n: 1 } } },
          { id: 'p2', a: seed(3), b: seed(4), y: 104, label: { k: 'match', vars: { n: 2 } } },
        ],
        [{ id: 'p3', src: [null, 'p2'], label: 'secondChance' }],
        [{ id: 'p4', src: ['p1', 'p3'], label: 'final' }],
      ],
    });
    const f = b.pos.p4;
    st.add('champ', { t: 'tag', x: f.x, y: f.y - 42, w: b.chipW, h: 22, k: 'champion', tone: 'gold', o: 0 });

    st.step(0, 2400, b.frame());
    st.step(0, 3600, b.entrants());
    st.step(0, 5200, b.play('p1', 0, { drop: { to: 'p3', side: 0 } }));
    st.step(1, 6400, b.play('p2', 0));
    st.step(2, 5000, b.play('p3', 0));
    st.step(2, 5000, b.play('p4', 1));
    st.step(2, 7000, b.crown('p4', 1), { champ: { o: 1 } });
    return st.scene();
  },
};

export default explainer;
