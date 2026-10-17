// Swiss with 8 entrants, d_swiss() on the bracket page made smaller: a box
// for every record, two wins through and two losses out. Each entrant is one
// chip that moves from box to box as its results come in, and each round only
// pairs people inside the same box, which is the whole idea of a Swiss.

import { Story, seed } from '../story';

const BOX_W = 100;
const GAP_X = 20;
const CHIP_H = 18;
const CHIP_GAP = 2;
const HEAD = 16;
const PAD = 5;
const X0 = 10;

// [wins, losses] -> column and top of its box.
const BOXES = {
  '0-0': { col: 0, y: 52, n: 8 },
  '1-0': { col: 1, y: 30, n: 4 },
  '0-1': { col: 1, y: 146, n: 4 },
  '2-0': { col: 2, y: 20, n: 2, tone: 'through' },
  '1-1': { col: 2, y: 90, n: 4 },
  '0-2': { col: 2, y: 200, n: 2, tone: 'outBox' },
  '2-1': { col: 3, y: 50, n: 2, tone: 'through' },
  '1-2': { col: 3, y: 172, n: 2, tone: 'outBox' },
};

const boxH = (n) => HEAD + n * (CHIP_H + CHIP_GAP) + PAD;
const boxX = (col) => X0 + col * (BOX_W + GAP_X);
const place = (record, i) => ({
  x: boxX(BOXES[record].col) + PAD,
  y: BOXES[record].y + HEAD + i * (CHIP_H + CHIP_GAP),
});

// Who wins each pairing, round by round, winner first. Each pair sits side
// by side in its box, so the two who play each other are next to each other.
const ROUNDS = [
  { box: '0-0', pairs: [['Kojo', 'Femi'], ['Amara', 'Ada'], ['Tunde', 'Sipho'], ['Zara', 'Lola']] },
  { box: '1-0', pairs: [['Kojo', 'Amara'], ['Tunde', 'Zara']] },
  { box: '0-1', pairs: [['Ada', 'Femi'], ['Lola', 'Sipho']] },
  { box: '1-1', pairs: [['Zara', 'Amara'], ['Ada', 'Lola']] },
];

const explainer = {
  key: 'swiss',
  title: 'Swiss',
  lines: [
    'Every round, you play someone with the same score as you.',
    'Two wins and you are through. Two losses and you are out.',
    'One bad game never knocks you out, and you never have to play everyone.',
  ],
  build() {
    const st = new Story('swiss');
    const everyone = [1, 5, 6, 2, 3, 7, 4, 8].map(seed);
    const lines = [];
    const after = (record, won) => {
      const [w, l] = record.split('-').map(Number);
      return won ? `${w + 1}-${l}` : `${w}-${l + 1}`;
    };

    // The lines from each record to the two it can lead to.
    for (const record of ['0-0', '1-0', '0-1', '1-1']) {
      for (const won of [true, false]) {
        const to = after(record, won);
        const a = BOXES[record];
        const b = BOXES[to];
        const ax = boxX(a.col) + BOX_W;
        const ay = a.y + boxH(a.n) / 2;
        const bx = boxX(b.col);
        const by = b.y + boxH(b.n) / 2;
        const id = `ln_${record}_${to}`;
        st.add(id, { t: 'line', d: [[ax, ay], [ax + GAP_X / 2, ay], [ax + GAP_X / 2, by], [bx, by]], o: 0 });
        lines.push(id);
      }
    }
    const heads = ['start', { k: 'afterRound', vars: { n: 1 } }, { k: 'afterRound', vars: { n: 2 } }, { k: 'afterRound', vars: { n: 3 } }];
    heads.forEach((h, col) => {
      const word = typeof h === 'string' ? { k: h } : h;
      st.add(`head_${col}`, { t: 'text', x: boxX(col) + BOX_W / 2, y: 12, size: 9, tone: 'muted', weight: 600, anchor: 'middle', o: 0, ...word });
    });
    for (const [record, b] of Object.entries(BOXES)) {
      st.add(`box_${record}`, { t: 'panel', x: boxX(b.col), y: b.y, w: BOX_W, h: boxH(b.n), r: 10, tone: b.tone || 'box', o: 0 });
      st.add(`rec_${record}`, { t: 'text', x: boxX(b.col) + 8, y: b.y + 12, v: record, size: 10, weight: 700, o: 0 });
      if (b.tone) {
        st.add(`verdict_${record}`, {
          t: 'text', x: boxX(b.col) + BOX_W - 8, y: b.y + 12, k: b.tone === 'through' ? 'through' : 'out',
          size: 9, weight: 600, anchor: 'end', tone: b.tone === 'through' ? 'good' : 'bad', o: 0,
        });
      }
    }
    everyone.forEach((p, i) => {
      st.add(`c_${p.name}`, { t: 'chip', ...place('0-0', i), w: BOX_W - PAD * 2, h: CHIP_H, seed: p.seed, name: p.name, o: 0 });
    });

    // Plays one round: each pair's winner goes up a box, the loser down one,
    // filling the target boxes from the top in the order they arrive.
    // Where each chip is now, and how many have arrived in each box. A chip
    // that leaves a box leaves a quiet copy behind, so the finished picture
    // still shows who passed through every record, as a bracket on paper
    // keeps every name in the round it played.
    const filled = {};
    const at = Object.fromEntries(everyone.map((p, i) => [p.name, place('0-0', i)]));
    const bySeed = Object.fromEntries(everyone.map((p) => [p.name, p.seed]));
    const playRound = ({ box, pairs }) => {
      const out = {};
      const won = after(box, true);
      const lost = after(box, false);
      for (const [w, l] of pairs) {
        for (const [name, to] of [[w, won], [l, lost]]) {
          const ghost = `g_${box}_${name}`;
          st.add(ghost, { t: 'chip', ...at[name], w: BOX_W - PAD * 2, h: CHIP_H, seed: bySeed[name], name, tone: 'drop', o: 0 });
          out[ghost] = { o: 1 };
          const i = filled[to] || 0;
          filled[to] = i + 1;
          const tone = BOXES[to].tone === 'through' ? 'through' : BOXES[to].tone === 'outBox' ? 'out' : '';
          at[name] = place(to, i);
          out[`c_${name}`] = { ...at[name], tone };
        }
      }
      out[`ln_${box}_${won}`] = { tone: 'lit' };
      return out;
    };
    const verdicts = (...records) => Object.fromEntries(records.map((r) => [`verdict_${r}`, { o: 1 }]));

    st.step(0, 2600,
      Object.fromEntries(Object.keys(BOXES).flatMap((r) => [[`box_${r}`, { o: 1 }], [`rec_${r}`, { o: 1 }]])),
      Object.fromEntries(lines.map((id) => [id, { o: 1 }])),
      Object.fromEntries(heads.map((_, col) => [`head_${col}`, { o: 1 }])));
    st.step(0, 3600, Object.fromEntries(everyone.map((p) => [`c_${p.name}`, { o: 1 }])));
    st.step(0, 4800, playRound(ROUNDS[0]));
    st.step(1, 4400, playRound(ROUNDS[1]), verdicts('2-0'));
    st.step(1, 4400, playRound(ROUNDS[2]), verdicts('0-2'));
    st.step(1, 4800, playRound(ROUNDS[3]), verdicts('2-1', '1-2'));
    st.step(2, 7000, {});
    return st.scene();
  },
};

export default explainer;
