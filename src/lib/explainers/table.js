// A table that moves, worked out from results (inbox 476).
//
// The rows are actors that slide to their new place when the order changes;
// the stripes and the place numbers behind them stay put, because a place is a
// position and a row is a team. The numbers in a row are computed here from
// the results the scene lists, so the table on screen is the table those
// results make, never a second set of numbers typed beside them.

/**
 * Standings from match results, the way a points table ranks them: points,
 * then goal difference, then goals scored, then name so the order is stable.
 *
 * @param names    every entrant's name
 * @param results  [[home, away, homeGoals, awayGoals], ...]
 * @param points   { win, draw }
 */
export function standings(names, results, { win = 3, draw = 1 } = {}) {
  const rows = Object.fromEntries(names.map((name) => [name, {
    name, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0,
  }]));
  for (const [home, away, hg, ag] of results) {
    const h = rows[home];
    const a = rows[away];
    h.p += 1; a.p += 1;
    h.gf += hg; h.ga += ag;
    a.gf += ag; a.ga += hg;
    if (hg > ag) { h.w += 1; a.l += 1; h.pts += win; }
    else if (hg < ag) { a.w += 1; h.l += 1; a.pts += win; }
    else { h.d += 1; a.d += 1; h.pts += draw; a.pts += draw; }
  }
  return Object.values(rows).sort((x, y) => (y.pts - x.pts)
    || ((y.gf - y.ga) - (x.gf - x.ga))
    || (y.gf - x.gf)
    || x.name.localeCompare(y.name));
}

/**
 * A table on the stage.
 *
 *   const t = table(story, {
 *     x: 210, y: 40, w: 258, rowH: 26, names,
 *     cols: [{ k: 'won', x: 150 }, { k: 'pts', x: 240, weight: 700 }],
 *   });
 *   story.step(0, 3000, t.reveal());
 *   story.step(1, 3000, t.update(sorted, (row) => [row.w, row.pts]));
 *
 * `cols` are the number columns, each centred on `x` (from the table's left
 * edge) under a drawn heading `k`. The name sits after the place number.
 */
export function table(story, {
  prefix = 't',
  x,
  y,
  w,
  rowH = 26,
  names,
  cols,
  nameX = 30,
  heading = true,
  bar = null,              // { x, w }: a bar drawn in each row, filled 0..1
}) {
  const top = heading ? y + 16 : y;
  const ids = {};
  const fixed = [];

  if (heading) {
    cols.forEach((c, i) => {
      if (!c.k) return;
      const id = `${prefix}_h_${i}`;
      story.add(id, { t: 'text', x: x + c.x, y: y + 10, k: c.k, size: 9, tone: 'muted', weight: 600, anchor: 'middle', o: 0 });
      fixed.push(id);
    });
  }

  names.forEach((_, i) => {
    if (i % 2 === 0) {
      const id = `${prefix}_stripe_${i}`;
      story.add(id, { t: 'panel', x, y: top + i * rowH, w, h: rowH, tone: 'stripe', r: 6, o: 0 });
      fixed.push(id);
    }
    const id = `${prefix}_place_${i}`;
    story.add(id, { t: 'text', x: x + 14, y: top + i * rowH + rowH / 2 + 4, v: String(i + 1), size: 11, tone: 'muted', weight: 600, anchor: 'middle', o: 0 });
    fixed.push(id);
  });

  names.forEach((name, i) => {
    const id = `${prefix}_row_${name}`;
    ids[name] = id;
    story.add(id, {
      t: 'row',
      x,
      y: top + i * rowH,
      w,
      h: rowH,
      cells: [
        { x: nameX, v: name, weight: 600 },
        ...cols.map((c) => ({ x: c.x, v: c.start ?? '0', anchor: 'middle', weight: c.weight || 500 })),
      ],
      bar: bar ? { ...bar, v: 0 } : null,
      // A lit row fills from the name, so the place number beside it stays
      // on its own stripe and readable.
      fillX: nameX - 10,
      o: 0,
    });
  });

  return {
    ids,
    rowY: (i) => top + i * rowH,
    rowH,
    /** Where a row is drawn once `order` is the order. */
    at(name, order) {
      const i = order.indexOf(name);
      return { x: x + nameX - 6, y: top + i * rowH + (rowH - 20) / 2 };
    },
    reveal() {
      return Object.fromEntries([...fixed, ...Object.values(ids)].map((id) => [id, { o: 1 }]));
    },
    /**
     * Rows in their new order with new numbers. `sorted` is a list of objects
     * with a `name`; `cells(row)` gives the numbers for the columns, in order;
     * `barOf(row)` the bar, 0..1, when the table has one.
     */
    update(sorted, cells, barOf = null) {
      const out = {};
      sorted.forEach((row, i) => {
        const values = cells(row).map((v) => String(v));
        out[ids[row.name]] = {
          y: top + i * rowH,
          cells: [
            { x: nameX, v: row.name, weight: 600 },
            ...cols.map((c, ci) => ({ x: c.x, v: values[ci], anchor: 'middle', weight: c.weight || 500 })),
          ],
          ...(bar && barOf ? { bar: { ...bar, v: barOf(row) } } : {}),
        };
      });
      return out;
    },
    /** One row lit: gold for the winner, through, out. */
    mark(name, tone) {
      return { [ids[name]]: { tone } };
    },
  };
}

/** The three cells of a results line, the winner bold and the loser quiet. */
export function fixtureCells(w, home, away, hg = null, ag = null) {
  const scored = hg !== null && ag !== null;
  return [
    { x: w / 2 - 22, v: home, anchor: 'end', weight: scored && hg > ag ? 700 : 500, tone: scored && hg < ag ? 'muted' : '' },
    { x: w / 2, v: scored ? `${hg} - ${ag}` : '-', anchor: 'middle', weight: 700 },
    { x: w / 2 + 22, v: away, anchor: 'start', weight: scored && ag > hg ? 700 : 500, tone: scored && ag < hg ? 'muted' : '' },
  ];
}

/** A results line: "Kojo 2 - 1 Zara", centred on `cx`. */
export function fixture(story, id, { cx, y, w = 190, home, away, hg = null, ag = null, o = 0 }) {
  story.add(id, { t: 'row', x: cx - w / 2, y, w, h: 22, cells: fixtureCells(w, home, away, hg, ag), tone: 'fixture', o });
  return id;
}
