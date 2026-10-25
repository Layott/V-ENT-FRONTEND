// Battle royale scored by time (stage setting score_by: 'time', P3 W3b): every
// squad plays the same maps and the lowest total time across them wins. A
// squad that does not finish every map ranks below every squad that does. The
// totals are added up here from the times, the way the bracket page adds them.

import { Story, TEAMS } from '../story';
import { table } from '../table';

// Seconds per map, in the order the maps were played. null: not finished.
const TIMES = {
  Accra: [580, 492, 605],
  Lagos: [640, 455, 590],
  Dakar: [520, 610, 575],
  Nairobi: [700, 530, 498],
  Kumasi: [610, 600, 560],
  Abuja: [560, 470, null],
};
const MAPS = 3;

const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** Squads after `n` maps: the finished ones by total time, then the rest. */
export function afterMaps(n) {
  const rows = TEAMS.map((t) => {
    const times = TIMES[t.name].slice(0, n);
    const done = times.filter((s) => s !== null).length;
    const total = times.reduce((sum, s) => sum + (s || 0), 0);
    return { name: t.name, done, total: done === n ? total : null };
  });
  return rows.sort((a, b) => {
    if ((a.total === null) !== (b.total === null)) return a.total === null ? 1 : -1;
    if (a.total !== null && a.total !== b.total) return a.total - b.total;
    if (b.done !== a.done) return b.done - a.done;
    return a.name.localeCompare(b.name);
  });
}

const cellsOf = (row) => [String(row.done), row.total === null ? '-' : clock(row.total)];

const explainer = {
  key: 'battle_royale_time',
  title: 'Battle royale by time',
  lines: [
    'Every squad plays the same maps, and the time each one takes is added up.',
    'The lowest total time wins the stage, so the fastest squad over every map takes it.',
    'A squad that does not finish every map ranks below every squad that does.',
  ],
  build() {
    const st = new Story('battle_royale_time');
    const names = TEAMS.map((t) => t.name);
    const t = table(st, {
      x: 12,
      y: 44,
      w: 456,
      rowH: 30,
      names,
      cols: [
        { k: 'mapsDone', x: 270 },
        { k: 'totalTime', x: 400, weight: 700 },
      ],
    });
    st.add('mapHead', { t: 'text', x: 240, y: 22, k: 'map', vars: { n: 1, total: MAPS }, size: 11, tone: 'muted', weight: 600, anchor: 'middle', o: 0 });

    st.step(0, 4000, t.reveal(), { mapHead: { o: 1 } });
    st.step(0, 4000, t.update(afterMaps(1), cellsOf), { mapHead: { vars: { n: 1, total: MAPS } } });
    st.step(1, 4000, t.update(afterMaps(2), cellsOf), { mapHead: { vars: { n: 2, total: MAPS } } });
    st.step(1, 4000, t.update(afterMaps(3), cellsOf), { mapHead: { vars: { n: 3, total: MAPS } } });
    st.step(2, 4000, {});
    st.step(2, 6000, t.mark(afterMaps(MAPS)[0].name, 'gold'));
    st.step(2, 6000, {});
    return st.scene();
  },
};

export default explainer;
