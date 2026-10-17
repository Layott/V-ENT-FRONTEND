// Groups into a knockout: two round robin groups of four, the top two of each
// into semi-finals. The thirteenth explainer, because it is the plan most
// staged tournaments run (a round robin stage feeding an elimination stage),
// and an organiser choosing it reads two formats where they need one picture.

import { Story, seed } from '../story';
import { bracket } from '../knockout';
import { standings, table } from '../table';

const GROUPS = {
  A: {
    names: [seed(1), seed(4), seed(5), seed(8)],
    rounds: [
      [['Kojo', 'Lola', 2, 0], ['Zara', 'Femi', 1, 1]],
      [['Kojo', 'Zara', 1, 1], ['Femi', 'Lola', 2, 1]],
      [['Kojo', 'Femi', 3, 1], ['Zara', 'Lola', 2, 0]],
    ],
  },
  B: {
    names: [seed(2), seed(3), seed(6), seed(7)],
    rounds: [
      [['Ada', 'Sipho', 1, 0], ['Tunde', 'Amara', 0, 2]],
      [['Ada', 'Amara', 2, 2], ['Tunde', 'Sipho', 1, 0]],
      [['Ada', 'Tunde', 2, 0], ['Amara', 'Sipho', 0, 1]],
    ],
  },
};

const explainer = {
  key: 'groups_knockout',
  title: 'Groups into a knockout',
  lines: [
    'Teams are split into small groups, and everyone in a group plays each other.',
    'The top two of each group go through to the knockout.',
    'From there, one loss and you are out, until one team is left.',
  ],
  build() {
    const st = new Story('groups_knockout');
    const groups = {};
    [['A', 18], ['B', 140]].forEach(([g, y]) => {
      const names = GROUPS[g].names.map((p) => p.name);
      st.add(`head${g}`, { t: 'text', x: 12, y, k: `group${g}`, size: 10, tone: 'muted', weight: 600, o: 0 });
      groups[g] = {
        names,
        t: table(st, {
          prefix: `g${g}`,
          x: 12,
          y: y + 6,
          w: 196,
          rowH: 20,
          names,
          cols: [{ k: 'pts', x: 176, weight: 700 }],
        }),
      };
    });

    const b = bracket(st, {
      prefix: 'ko',
      x0: 236,
      y0: 64,
      chipW: 104,
      gapX: 24,
      vgap: 56,
      cols: [
        [{ id: 's1' }, { id: 's2' }],
        [{ id: 'f', src: ['s1', 's2'] }],
      ],
      heads: ['semis', 'final'],
      headY: 50,
    });
    st.add('champ', { t: 'tag', x: b.pos.f.x, y: b.pos.f.y - 32, w: b.chipW, h: 22, k: 'champion', tone: 'gold', o: 0 });

    // The two tables after round 1 and after round 3, worked out from results.
    const after = (g, n) => standings(groups[g].names, GROUPS[g].rounds.slice(0, n).flat());
    const update = (n) => Object.assign({}, ...['A', 'B'].map((g) => groups[g].t.update(after(g, n), (row) => [row.pts])));
    const finalA = after('A', 3).map((r) => r.name);
    const finalB = after('B', 3).map((r) => r.name);
    const byName = Object.fromEntries([...GROUPS.A.names, ...GROUPS.B.names].map((p) => [p.name, p]));
    const from = (g, name, order) => groups[g].t.at(name, order);

    st.step(0, 3200, groups.A.t.reveal(), groups.B.t.reveal(), { headA: { o: 1 }, headB: { o: 1 } });
    st.step(0, 4200, update(1));
    st.step(0, 4200, update(3));
    st.step(1, 4200,
      groups.A.t.mark(finalA[0], 'through'), groups.A.t.mark(finalA[1], 'through'),
      groups.B.t.mark(finalB[0], 'through'), groups.B.t.mark(finalB[1], 'through'),
      groups.A.t.mark(finalA[2], 'out'), groups.A.t.mark(finalA[3], 'out'),
      groups.B.t.mark(finalB[2], 'out'), groups.B.t.mark(finalB[3], 'out'));
    st.step(1, 4800,
      b.frame(),
      b.fill('s1', 0, byName[finalA[0]], from('A', finalA[0], finalA)),
      b.fill('s1', 1, byName[finalB[1]], from('B', finalB[1], finalB)),
      b.fill('s2', 0, byName[finalB[0]], from('B', finalB[0], finalB)),
      b.fill('s2', 1, byName[finalA[1]], from('A', finalA[1], finalA)));
    st.step(2, 4600, b.play('s1', 0), b.play('s2', 0));
    st.step(2, 4600, b.play('f', 0));
    st.step(2, 6500, b.crown('f', 0), { champ: { o: 1 } });
    return st.scene();
  },
};

export default explainer;
