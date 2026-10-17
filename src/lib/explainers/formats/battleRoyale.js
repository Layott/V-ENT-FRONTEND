// Battle royale points, d_br() on the bracket page: six squads, three maps,
// the Free Fire placement table (12 for first down to 5 for sixth) plus a
// point a kill. The totals are added up here from the finishes, so the table
// on screen is the arithmetic of the finishes and nothing else.

import { Story, TEAMS } from '../story';
import { table } from '../table';

const PLACE_POINTS = [12, 9, 8, 7, 6, 5];
const KILL_POINTS = 1;

// Each map: the squads in the order they finished, with their kills.
const MAPS = [
  [['Accra', 5], ['Lagos', 3], ['Dakar', 6], ['Abuja', 2], ['Nairobi', 1], ['Kumasi', 0]],
  [['Lagos', 7], ['Nairobi', 4], ['Accra', 2], ['Kumasi', 3], ['Dakar', 1], ['Abuja', 0]],
  [['Dakar', 4], ['Accra', 2], ['Lagos', 2], ['Nairobi', 1], ['Abuja', 2], ['Kumasi', 0]],
];

/** Totals after `n` maps, highest first, and each squad's last finish. */
export function afterMaps(n) {
  const rows = Object.fromEntries(TEAMS.map((t) => [t.name, { name: t.name, total: 0, place: 0, kills: 0 }]));
  MAPS.slice(0, n).forEach((finish) => {
    finish.forEach(([name, kills], i) => {
      const row = rows[name];
      row.total += PLACE_POINTS[i] + kills * KILL_POINTS;
      row.place = i + 1;
      row.kills = kills;
    });
  });
  return Object.values(rows).sort((a, b) => (b.total - a.total) || a.name.localeCompare(b.name));
}

const explainer = {
  key: 'battle_royale',
  title: 'Battle royale',
  lines: [
    'Every team drops into the same match, map after map.',
    'You score points for where you finish and for every elimination.',
    'Points add up over every map, and the highest total wins.',
  ],
  build() {
    const st = new Story('battle_royale');
    const names = TEAMS.map((t) => t.name);
    const t = table(st, {
      x: 12,
      y: 44,
      w: 456,
      rowH: 30,
      names,
      cols: [
        { k: 'finish', x: 176 },
        { k: 'kills', x: 232 },
        { k: 'points', x: 424, weight: 700 },
      ],
      bar: { x: 268, w: 124 },
    });
    st.add('mapHead', { t: 'text', x: 240, y: 22, k: 'map', vars: { n: 1, total: MAPS.length }, size: 11, tone: 'muted', weight: 600, anchor: 'middle', o: 0 });

    const best = afterMaps(MAPS.length)[0].total;
    // A row's numbers for the map just played, kept in the row's current place
    // until the next step sorts them.
    const keepOrder = (n) => {
      const before = n > 1 ? afterMaps(n - 1).map((r) => r.name) : names;
      const now = Object.fromEntries(afterMaps(n).map((r) => [r.name, r]));
      return before.map((name) => now[name]);
    };
    const cellsOf = (row) => [row.place ? `#${row.place}` : '-', row.kills, row.total];
    const barOf = (row) => row.total / best;

    st.step(0, 3400, t.reveal(), { mapHead: { o: 1 } });
    MAPS.forEach((_, i) => {
      const n = i + 1;
      st.step(n === 1 ? 0 : 1, 3600, t.update(keepOrder(n), cellsOf, barOf), { mapHead: { vars: { n, total: MAPS.length } } });
      st.step(n === MAPS.length ? 2 : 1, 3600, t.update(afterMaps(n), cellsOf, barOf));
    });
    st.step(2, 6500, t.mark(afterMaps(MAPS.length)[0].name, 'gold'));
    return st.scene();
  },
};

export default explainer;
