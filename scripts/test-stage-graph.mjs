// The stage graph's layout and the words for a line (P1f).
//
//   node scripts/test-stage-graph.mjs
//
// CEO, 16 October 2026: "i aprove the design". Section 2: "Every competition
// on V-ENT becomes a graph of stages ... Progressions are the lines between
// boxes." One layout draws the organiser's planner and the public Path view,
// so it must hold every pattern of section 6 and must not fall over on a
// draft the save would refuse (a line to a removed stage, a cycle).

import assert from 'node:assert/strict';
import { layout, lineWords } from '../src/lib/stageGraph.js';

let failures = 0;
const test = (name, fn) => {
  try {
    fn();
    console.log(`  ok   ${name}`);
  } catch (err) {
    failures += 1;
    console.log(`  FAIL ${name}\n       ${err.message}`);
  }
};

const S = (id, extra = {}) => ({ id, label: id, format: 'round_robin', groups: 0, ...extra });
const L = (source, target, extra = {}) => ({
  source, target, group: null, place_from: 1, place_to: 2, side: 'any',
  carry_points: false, fire: 'after_preview', ...extra,
});
const cols = g => g.columns.map(c => c.map(n => n.id));

test('a chain is one stage per column', () => {
  const g = layout([S('groups'), S('playoff'), S('final')], [L('groups', 'playoff'), L('playoff', 'final')]);
  assert.deepEqual(cols(g), [['groups'], ['playoff'], ['final']]);
  assert.equal(g.edges.length, 2);
});

test('a split puts both targets in the next column', () => {
  const g = layout([S('league'), S('top'), S('bottom')],
    [L('league', 'top', { place_to: 6 }), L('league', 'bottom', { place_from: 7, place_to: 12 })]);
  assert.deepEqual(cols(g), [['league'], ['top', 'bottom']]);
});

test('a merge puts both pools before the playoff', () => {
  const g = layout([S('a'), S('b'), S('ko')], [L('a', 'ko'), L('b', 'ko')]);
  assert.deepEqual(cols(g), [['a', 'b'], ['ko']]);
});

test('parallel pools with no lines sit in the first column', () => {
  const g = layout([S('north'), S('south')], []);
  assert.deepEqual(cols(g), [['north', 'south']]);
  assert.equal(g.edges.length, 0);
});

test('a stage is placed after its longest way in', () => {
  const g = layout([S('a'), S('b'), S('c')], [L('a', 'b'), L('b', 'c'), L('a', 'c')]);
  assert.deepEqual(cols(g), [['a'], ['b'], ['c']]);
});

test('upper and lower lines into one double elimination are two edges', () => {
  const g = layout([S('groups', { groups: 2 }), S('de', { format: 'double_elimination' })],
    [L('groups', 'de', { side: 'winners' }), L('groups', 'de', { place_from: 3, place_to: 3, side: 'losers' })]);
  assert.deepEqual(cols(g), [['groups'], ['de']]);
  assert.deepEqual(g.edges.map(e => e.side), ['winners', 'losers']);
});

test('a line to a stage no longer in the draft is dropped, not drawn', () => {
  const g = layout([S('a'), S('b')], [L('a', 'b'), L('a', 'gone'), L('gone', 'b')]);
  assert.equal(g.edges.length, 1);
  assert.deepEqual(cols(g), [['a'], ['b']]);
});

test('a cycle in a draft still lays out', () => {
  const g = layout([S('a'), S('b')], [L('a', 'b'), L('b', 'a')]);
  assert.equal(g.columns.flat().length, 2);
});

test('ids compare as strings, so a draft key and a saved id both work', () => {
  const g = layout([S(7), S(9)], [L('7', '9')]);
  assert.deepEqual(cols(g), [[7], [9]]);
  assert.equal(g.edges.length, 1);
});

const tt = (_key, fallback) => fallback;

test('a line in words: each group, a range, the upper side', () => {
  assert.equal(lineWords(tt, L('g', 'p', { side: 'winners' }), { groups: 2 }, 'Playoff'),
    'Places 1 to 2 of each group go to Playoff, in the upper bracket.');
});

test('a line in words: one place of one group', () => {
  assert.equal(lineWords(tt, L('g', 'p', { group: 2, place_from: 3, place_to: 3 }), { groups: 2 }, 'Lower'),
    'Place 3 of group B goes to Lower.');
});

test('a line in words: the winner of a single field, points kept, sent on a press', () => {
  assert.equal(lineWords(tt, L('g', 'p', { place_to: 1, carry_points: true, fire: 'manual' }), { groups: 0 }, 'Final'),
    'The winner goes to Final, keeping their points, when you press send.');
});

console.log(`\n${failures} failed`);
process.exit(failures ? 1 : 0);
