// A custom bracket (P3 W2): the organiser writes each match and where its two
// sides come from. This is the four player example the schema help shows:
// A=[1,4], B=[2,3], the final C=[W:A,W:B], and D=[L:A,L:B] for third place.

import { Story, seed } from '../story';
import { bracket } from '../knockout';

const explainer = {
  key: 'custom_bracket',
  title: 'Custom bracket',
  lines: [
    'You write each match and say where its two sides come from.',
    'A side is a seed, or the winner or the loser of an earlier match.',
    'V-ENT checks it, draws it, and gives everybody a place when it is played.',
  ],
  build() {
    const st = new Story('custom_bracket');
    const b = bracket(st, {
      chipW: 118,
      gapX: 40,
      y0: 40,
      cols: [
        [
          { id: 'A', a: seed(1), b: seed(4), label: { k: 'match', vars: { n: 1 } } },
          { id: 'B', a: seed(2), b: seed(3), y: 72, label: { k: 'match', vars: { n: 2 } } },
        ],
        [{ id: 'C', src: ['A', 'B'], label: 'final' }, { id: 'D', y: 150, label: { k: 'match', vars: { n: 4 } } }],
      ],
    });
    const champ = b.pos.C;
    st.add('champ', { t: 'tag', x: champ.x, y: champ.y - 30, w: b.chipW, h: 22, k: 'champion', tone: 'gold', o: 0 });

    st.step(0, 3000, b.frame());
    st.step(0, 3600, b.entrants());
    st.step(1, 5000, b.play('A', 0, { drop: { to: 'D', side: 0 } }));
    st.step(1, 5000, b.play('B', 0, { drop: { to: 'D', side: 1 } }));
    st.step(2, 5200, b.play('C', 0, { winnerTone: 'gold' }), { champ: { o: 1 } });
    st.step(2, 5200, b.play('D', 1));
    st.step(2, 5000, {});
    return st.scene();
  },
};

export default explainer;
