// Rounds of results feeding a table: round robin, league and ladder share it
// (inbox 476).
//
// The left of the stage shows the round being played, the right the table it
// makes. Each round is two steps: its results appear, then the table takes
// them in and the rows slide to their new places. Showing both at once hides
// the cause from the effect.

import { Story } from './story';
import { fixture, standings, table } from './table';

/**
 * @param key      the explainer key
 * @param players  [{ name }, ...] in the order they start the table
 * @param rounds   [[home, away, homeGoals, awayGoals], ...] per round
 * @param heading  (n) => the drawn word over round n, { k, vars }
 * @param cols     which numbers the table shows: any of p, w, d, l, pts
 * @param sides    draw Home and Away over the results (a league)
 * @param times    { intro, results, table, end }: how long each step holds
 */
export function roundsScene({ key, players, rounds, heading, cols, sides = false, times }) {
  const st = new Story(key);
  const names = players.map((p) => p.name);
  const COLS = {
    p: { k: 'played' }, w: { k: 'won' }, d: { k: 'drawn' }, l: { k: 'lost' }, pts: { k: 'pts', weight: 700 },
  };
  const x0 = 222;
  const width = 246;
  const step = cols.length > 4 ? 28 : 34;
  const t = table(st, {
    x: x0,
    y: 40,
    w: width,
    rowH: names.length > 4 ? 28 : 32,
    names,
    cols: cols.map((c, i) => ({ ...COLS[c], x: width - 18 - (cols.length - 1 - i) * step })),
  });

  // The round being played, over its results.
  const cx = 108;
  st.add('roundHead', { t: 'text', x: cx, y: 52, ...heading(1), size: 11, tone: 'muted', weight: 600, anchor: 'middle', o: 0 });
  if (sides) {
    st.add('homeHead', { t: 'text', x: cx - 26, y: 72, k: 'home', size: 9, tone: 'muted', anchor: 'end', o: 0 });
    st.add('awayHead', { t: 'text', x: cx + 26, y: 72, k: 'away', size: 9, tone: 'muted', anchor: 'start', o: 0 });
  }
  const top = sides ? 82 : 70;
  const shown = rounds.map((games, r) => games.map((g, i) => fixture(st, `fx_${r}_${i}`, {
    cx, y: top + i * 30, home: g[0], away: g[1], hg: g[2], ag: g[3],
  })));

  const cells = (row) => cols.map((c) => row[c]);
  st.step(0, times.intro, t.reveal(), { roundHead: { o: 1 } }, sides ? { homeHead: { o: 1 }, awayHead: { o: 1 } } : {});
  rounds.forEach((games, r) => {
    // The first results belong to "everyone plays"; the table moving is the
    // middle line; the last table is the ending.
    const line = r === rounds.length - 1 ? 2 : 1;
    const before = r > 0 ? Object.fromEntries(shown[r - 1].map((id) => [id, { o: 0 }])) : {};
    st.step(r === 0 ? 0 : 1, times.results,
      before,
      Object.fromEntries(shown[r].map((id) => [id, { o: 1 }])),
      { roundHead: heading(r + 1) });
    st.step(line, times.table, t.update(standings(names, rounds.slice(0, r + 1).flat()), cells));
  });
  const final = standings(names, rounds.flat());
  st.step(2, times.end, t.mark(final[0].name, 'gold'));
  return { story: st, final };
}
