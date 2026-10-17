// Bracket groups (P3 W1): the field dealt into groups by snake, each group a
// knockout of its own that stops when two are left, so the opening matches of
// each group decide who goes through it. Eight players: group A holds seeds 1,
// 4, 5 and 8, group B seeds 2, 3, 6 and 7, as the draw deals them.

import { Story, seed } from '../story';
import { bracket } from '../knockout';

const GROUPS = [
  { g: 'A', y: 14, matches: [[1, 8, 0], [4, 5, 1]] },
  { g: 'B', y: 140, matches: [[2, 7, 0], [3, 6, 0]] },
];

const explainer = {
  key: 'bracket_groups',
  title: 'Bracket groups',
  lines: [
    'The field is split into small groups, and each group plays a knockout of its own.',
    'Nobody leaves their group: its bracket decides who goes through.',
    'The best of each group go on to the next stage.',
  ],
  build() {
    const st = new Story('bracket_groups');
    const plays = [];
    const tags = [];
    const frames = [];
    const entrants = [];
    GROUPS.forEach(({ g, y, matches }) => {
      st.add(`head${g}`, { t: 'text', x: 12, y: y + 4, k: `group${g}`, size: 10, tone: 'muted', weight: 600, o: 0 });
      const b = bracket(st, {
        prefix: `b${g}`,
        x0: 12,
        y0: y + 14,
        chipW: 118,
        vgap: 14,
        cols: [matches.map(([a, bb], i) => ({ id: `${g}${i}`, a: seed(a), b: seed(bb), label: 'opening' }))],
      });
      frames.push(b.frame());
      entrants.push(b.entrants());
      matches.forEach(([, , win], i) => {
        const id = `${g}${i}`;
        const at = b.pos[id];
        const tag = `through${g}${i}`;
        st.add(tag, { t: 'tag', x: at.x + b.chipW + 12, y: at.y + b.matchH / 2 - 11, w: 96, h: 22,
                      k: 'through', tone: 'through', o: 0 });
        plays.push(b.play(id, win, { winnerTone: 'through' }));
        tags.push(tag);
      });
    });

    st.step(0, 2400, ...frames, { headA: { o: 1 }, headB: { o: 1 } });
    st.step(0, 3600, ...entrants);
    plays.forEach((change) => st.step(1, 4500, change));
    st.step(2, 5200, Object.fromEntries(tags.map((id) => [id, { o: 1 }])));
    st.step(2, 6000, {});
    return st.scene();
  },
};

export default explainer;
