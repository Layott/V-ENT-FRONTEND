// A split league of six (plan preset split_league, P3 W3a): everybody plays one
// league, then the top three play on in a top league and the rest in a bottom
// league. Each half keeps the points it won, so the top league always sits
// above the bottom. The table is worked out from the results below, the way a
// league table is.

import { Story, PLAYERS } from '../story';
import { standings, table } from '../table';

const NAMES = PLAYERS.slice(0, 6).map((p) => p.name);
const [KOJO, ADA, TUNDE, ZARA, FEMI, AMARA] = NAMES;

// Every pair once: [home, away, home goals, away goals].
const RESULTS = [
  [KOJO, ADA, 2, 1], [KOJO, TUNDE, 3, 0], [KOJO, ZARA, 1, 2], [KOJO, FEMI, 2, 2], [KOJO, AMARA, 1, 0],
  [ADA, TUNDE, 0, 1], [ADA, ZARA, 1, 1], [ADA, FEMI, 2, 0], [ADA, AMARA, 0, 2],
  [TUNDE, ZARA, 1, 1], [TUNDE, FEMI, 0, 3], [TUNDE, AMARA, 2, 1],
  [ZARA, FEMI, 1, 0], [ZARA, AMARA, 0, 0],
  [FEMI, AMARA, 1, 2],
];

const ORDER = standings(NAMES, RESULTS);
const TOP = ORDER.slice(0, 3);
const BOTTOM = ORDER.slice(3);
const cells = (row) => [row.p, row.w, row.pts];

const explainer = {
  key: 'split_league',
  title: 'Split league',
  lines: [
    'Everybody plays one league, every entrant against every other.',
    'The top places play on in a top league, and the rest in a bottom league.',
    'Each league keeps the points it won, and the top league always sits above the bottom.',
  ],
  build() {
    const st = new Story('split_league');
    const all = table(st, {
      x: 12,
      y: 44,
      w: 456,
      rowH: 30,
      names: NAMES,
      cols: [
        { k: 'played', x: 300 },
        { k: 'won', x: 350 },
        { k: 'pts', x: 420, weight: 700 },
      ],
    });
    const top = table(st, {
      prefix: 'top',
      x: 12,
      y: 44,
      w: 222,
      rowH: 30,
      names: TOP.map((r) => r.name),
      cols: [
        { k: 'played', x: 138 },
        { k: 'won', x: 172 },
        { k: 'pts', x: 204, weight: 700 },
      ],
      nameX: 24,
    });
    const bottom = table(st, {
      prefix: 'bot',
      x: 246,
      y: 44,
      w: 222,
      rowH: 30,
      names: BOTTOM.map((r) => r.name),
      cols: [
        { k: 'played', x: 138 },
        { k: 'won', x: 172 },
        { k: 'pts', x: 204, weight: 700 },
      ],
      nameX: 24,
    });
    st.add('topHead', { t: 'text', x: 12, y: 30, k: 'topLeague', size: 10, tone: 'muted', weight: 600, o: 0 });
    st.add('botHead', { t: 'text', x: 246, y: 30, k: 'bottomLeague', size: 10, tone: 'muted', weight: 600, o: 0 });

    st.step(0, 6000, all.reveal());
    st.step(0, 5000, all.update(ORDER, cells));
    st.step(1, 6000, all.hide(), top.reveal(), bottom.reveal(), { topHead: { o: 1 }, botHead: { o: 1 } },
      top.update(TOP, cells), bottom.update(BOTTOM, cells));
    st.step(1, 5000, {});
    st.step(2, 6000, top.mark(TOP[0].name, 'gold'));
    st.step(2, 6000, {});
    return st.scene();
  },
};

export default explainer;
