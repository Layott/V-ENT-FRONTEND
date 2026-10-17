// A bracket, laid out from its matches (inbox 476).
//
// The same layout the published bracket page uses
// (docs/specs/bracket-structure-page/build.py, `bracket()`): columns of
// matches, each match two slots, and a match fed by earlier ones sits halfway
// between them. A slot holds either an entrant from the start or the winner of
// another match, and the lines are drawn from those sources, so the picture
// follows the match data and never the other way round.
//
//   const b = bracket(story, {
//     cols: [
//       [{ id: 'a', a: seed(1), b: seed(8) }, ...],
//       [{ id: 's1', src: ['a', 'b'] }, ...],
//     ],
//     heads: ['round', 'semis', 'final'],
//   });
//   story.step(0, 3000, b.reveal());
//   story.step(0, 3000, b.play('a', 0));     // the top slot wins match a
//
// `play` lights the line to the next match and slides a copy of the winner's
// chip along to the slot it has earned; the original stays where it was, as a
// bracket on paper does. `drop` slides the loser to a slot in another part of
// the draw (double elimination, page playoff, GSL).

const CHIP_H = 20;
const SLOT_GAP = 2;

export function bracket(story, {
  prefix = 'k',
  x0 = 12,
  y0 = 34,
  chipW = 118,
  chipH = CHIP_H,
  gapX = 34,
  vgap = 14,
  cols,
  heads = [],
  headY = 16,
}) {
  const matchH = chipH * 2 + SLOT_GAP;
  const pos = {};
  const byId = {};
  const feeds = {};          // match id -> { to, side } its winner goes to

  cols.forEach((col, ci) => {
    const x = x0 + ci * (chipW + gapX);
    let nextY = y0;
    for (const m of col) {
      let y;
      if (typeof m.y === 'number') {
        y = y0 + m.y;
      } else {
        const known = (m.src || []).map((sid, si) => [si, sid]).filter(([, sid]) => sid && pos[sid]);
        if (known.length >= 2) {
          y = known.reduce((sum, [, sid]) => sum + pos[sid].y + matchH / 2, 0) / known.length - matchH / 2;
        } else if (known.length === 1) {
          const [si, sid] = known[0];
          y = pos[sid].y + matchH / 2 - (si * (chipH + SLOT_GAP) + chipH / 2);
        } else {
          y = nextY;
        }
        y = Math.max(y, nextY);
      }
      pos[m.id] = { x, y };
      byId[m.id] = m;
      nextY = y + matchH + vgap;
      (m.src || []).forEach((sid, si) => {
        if (sid) feeds[sid] = { to: m.id, side: si };
      });
    }
  });

  const slotAt = (id, side) => ({ x: pos[id].x, y: pos[id].y + side * (chipH + SLOT_GAP) });
  const chipId = (id, side) => `${prefix}_${id}_${side}`;
  const lineId = (from) => `${prefix}_ln_${from}`;

  // Lines first, so slots and chips paint over their ends.
  for (const [from, { to, side }] of Object.entries(feeds)) {
    const a = { x: pos[from].x + chipW, y: pos[from].y + matchH / 2 };
    const b = slotAt(to, side);
    const by = b.y + chipH / 2;
    const mid = b.x - gapX / 2;
    story.add(lineId(from), { t: 'line', d: [[a.x, a.y], [mid, a.y], [mid, by], [b.x, by]], o: 0 });
  }

  const heads_ = [];
  heads.forEach((k, ci) => {
    if (!k) return;
    const id = `${prefix}_head_${ci}`;
    const word = typeof k === 'string' ? { k } : k;
    story.add(id, { t: 'text', x: x0 + ci * (chipW + gapX), y: headY, size: 10, tone: 'muted', weight: 600, o: 0, ...word });
    heads_.push(id);
  });

  // Every slot, empty, and a label above any match that carries one.
  const slots = [];
  const labels = [];
  for (const m of Object.values(byId)) {
    for (const side of [0, 1]) {
      const at = slotAt(m.id, side);
      const id = `${prefix}_slot_${m.id}_${side}`;
      story.add(id, { t: 'slot', x: at.x, y: at.y, w: chipW, h: chipH, o: 0 });
      slots.push(id);
    }
    if (m.label) {
      const id = `${prefix}_label_${m.id}`;
      const word = typeof m.label === 'string' ? { k: m.label } : m.label;
      story.add(id, { t: 'text', x: pos[m.id].x, y: pos[m.id].y - 4, size: 9, tone: 'muted', o: 0, ...word });
      labels.push(id);
    }
  }

  // Who is in each slot. Entrants placed from the start get their chips now.
  const occupant = {};
  const firsts = [];
  for (const m of Object.values(byId)) {
    ['a', 'b'].forEach((field, side) => {
      const who = m[field];
      if (!who) return;
      const at = slotAt(m.id, side);
      const id = chipId(m.id, side);
      story.add(id, { t: 'chip', x: at.x, y: at.y, w: chipW, h: chipH, seed: who.seed, name: who.name, o: 0 });
      occupant[`${m.id}:${side}`] = { who, id };
      firsts.push(id);
    });
  }

  // A copy of `who` that starts invisible at `from` and lands in a slot.
  const arrive = (id, side, who, from, tone = '') => {
    const at = slotAt(id, side);
    const cid = chipId(id, side);
    story.add(cid, { t: 'chip', x: from.x, y: from.y, w: chipW, h: chipH, seed: who.seed, name: who.name, o: 0 });
    occupant[`${id}:${side}`] = { who, id: cid };
    return { [cid]: { x: at.x, y: at.y, o: 1, tone } };
  };

  const api = {
    pos,
    matchH,
    chipW,
    chipH,
    slot: slotAt,
    /** Who is in a slot once the matches before it have been played. */
    who: (id, side) => occupant[`${id}:${side}`]?.who || null,
    chip: (id, side) => occupant[`${id}:${side}`]?.id || null,

    /** The empty draw, its lines and headings, and the entrants placed in it. */
    reveal(extra = []) {
      return {
        ...Object.fromEntries([...heads_, ...labels, ...slots, ...firsts, ...extra].map((id) => [id, { o: 1 }])),
        ...Object.fromEntries(Object.keys(feeds).map((from) => [lineId(from), { o: 1 }])),
      };
    },

    /** Only the headings, slots and lines: entrants arrive separately. */
    frame() {
      return {
        ...Object.fromEntries([...heads_, ...labels, ...slots].map((id) => [id, { o: 1 }])),
        ...Object.fromEntries(Object.keys(feeds).map((from) => [lineId(from), { o: 1 }])),
      };
    },

    /** The entrants placed in the draw from the start. */
    entrants: () => Object.fromEntries(firsts.map((id) => [id, { o: 1 }])),

    /**
     * Match `id` is played and the entrant in slot `win` wins it. The winner
     * moves on along the line, when there is a line; `drop` names where the
     * loser goes instead of out: { to, side }.
     */
    play(id, win, { drop = null, loserTone = 'out', winnerTone = 'win' } = {}) {
      const w = occupant[`${id}:${win}`];
      const l = occupant[`${id}:${1 - win}`];
      if (!w || !l) throw new Error(`explainer ${story.key}: match ${id} is played before both slots are filled`);
      const out = {
        [w.id]: { tone: winnerTone },
        [l.id]: { tone: drop ? 'drop' : loserTone },
      };
      const next = feeds[id];
      if (next) {
        Object.assign(out, { [lineId(id)]: { tone: 'lit' } }, arrive(next.to, next.side, w.who, slotAt(id, win)));
      }
      if (drop) Object.assign(out, arrive(drop.to, drop.side, l.who, slotAt(id, 1 - win)));
      return out;
    },

    /** Somebody lands in a slot from outside this bracket (a group table). */
    fill(id, side, who, from, tone = '') {
      return arrive(id, side, who, from, tone);
    },

    /** The winner of the last match, lit gold. */
    crown(id, win) {
      const w = occupant[`${id}:${win}`];
      return { [w.id]: { tone: 'gold' } };
    },
  };
  return api;
}
