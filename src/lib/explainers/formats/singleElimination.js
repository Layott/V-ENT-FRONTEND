// Single elimination with 8 entrants: the shape of d_single() on the bracket
// page, played out. Seeds are spread so 1 and 2 can only meet in the final.

import { Story, seed } from '../story';
import { bracket } from '../knockout';

const explainer = {
  key: 'single_elimination',
  title: 'Single elimination',
  lines: [
    'Everyone is paired up for the first round.',
    'Win and you move on to the next round. Lose once and you are out.',
    'The last two play the final, and the winner takes the title.',
  ],
  build() {
    const st = new Story('single_elimination');
    const b = bracket(st, {
      chipW: 124,
      gapX: 30,
      cols: [
        [
          { id: 'a', a: seed(1), b: seed(8) },
          { id: 'b', a: seed(4), b: seed(5) },
          { id: 'c', a: seed(2), b: seed(7) },
          { id: 'd', a: seed(3), b: seed(6) },
        ],
        [{ id: 's1', src: ['a', 'b'] }, { id: 's2', src: ['c', 'd'] }],
        [{ id: 'f', src: ['s1', 's2'] }],
      ],
      heads: [{ k: 'round', vars: { n: 1 } }, 'semis', 'final'],
    });
    const f = b.pos.f;
    st.add('champ', { t: 'tag', x: f.x, y: f.y - 32, w: b.chipW, h: 22, k: 'champion', tone: 'gold', o: 0 });

    st.step(0, 2200, b.frame());
    st.step(0, 4000, b.entrants());
    st.step(1, 3800, b.play('a', 0), b.play('b', 1));
    st.step(1, 3800, b.play('c', 0), b.play('d', 0));
    st.step(1, 4200, b.play('s1', 0));
    st.step(1, 4200, b.play('s2', 1));
    st.step(2, 5000, b.play('f', 0));
    st.step(2, 7000, b.crown('f', 0), { champ: { o: 1 } });
    return st.scene();
  },
};

export default explainer;
