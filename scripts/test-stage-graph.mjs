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
import { layout, lineWords, pathWithFeeds, stageState } from '../src/lib/stageGraph.js';

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

test('a stage drawn early, waiting for its places, is not being played', () => {
  assert.equal(stageState(tt, { status: 'pending', drawn_at: '2026-10-17T00:00:00Z' }), 'Drawn, waiting for its places');
  assert.equal(stageState(tt, { status: 'pending', drawn: true }), 'Drawn, waiting for its places');
});

test('the other three states', () => {
  assert.equal(stageState(tt, { status: 'running', drawn_at: 'x' }), 'Being played');
  assert.equal(stageState(tt, { status: 'complete', drawn_at: 'x' }), 'Finished');
  assert.equal(stageState(tt, { status: 'pending', drawn_at: null }), 'Not drawn yet');
});

// P2 feeds on the Path view: the other tournament's stage is a box of its
// own, before the stages a feed fills and after the stages a feed empties.
// One function draws it for the tournament page and the Path widget (P8),
// because the widget once said "one stage, no path" beside a page drawing two.
const side = (stage_id, title, slug) => ({ stage_id, stage: 'League', format: 'league', groups: 0,
  tournament: { title, slug } });

test('feeds become boxes either side of the tournament\'s own stages', () => {
  const g = pathWithFeeds(
    { stages: [{ id: 's1', label: 'Finals' }], progressions: [] },
    {
      incoming: [{ id: 9, source: side(4, 'Lagos Qualifier', 'lagos-qualifier'), target: { stage_id: 's1' },
        qualifiers: [{ name: 'Amara Nwosu', status: 'confirmed' }, { name: 'Bisi Adeleke', status: 'declined' }] }],
      outgoing: [{ id: 10, source: { stage_id: 's1' }, target: side(7, 'Africa Cup', 'africa-cup'), qualifiers: [] }],
    });
  assert.deepEqual(g.stages.map((s) => s.id), ['x-in-4', 's1', 'x-out-7']);
  assert.equal(g.stages[0].label, 'Lagos Qualifier: League');
  assert.equal(g.stages[0].slug, 'lagos-qualifier');
  assert.deepEqual(g.lines.map((l) => [l.source, l.target]), [['x-in-4', 's1'], ['s1', 'x-out-7']]);
  assert.deepEqual(g.lines[0].sent, [{ name: 'Amara Nwosu' }]);
  assert.equal(g.external.length, 2);
});

test('no feeds is the plan as it was; nothing at all is an empty graph', () => {
  const plan = { stages: [{ id: 'a' }, { id: 'b' }], progressions: [{ id: 1, source: 'a', target: 'b' }] };
  const g = pathWithFeeds(plan, null);
  assert.deepEqual(g.stages.map((s) => s.id), ['a', 'b']);
  assert.equal(g.lines.length, 1);
  assert.deepEqual(pathWithFeeds(null, null), { stages: [], lines: [], external: [] });
});

test('one other stage feeding twice is one box', () => {
  const src = side(4, 'Lagos Qualifier', 'lagos-qualifier');
  const g = pathWithFeeds({ stages: [{ id: 's1' }, { id: 's2' }], progressions: [] },
    { incoming: [{ id: 1, source: src, target: { stage_id: 's1' } }, { id: 2, source: src, target: { stage_id: 's2' } }] });
  assert.equal(g.stages.filter((s) => s.id === 'x-in-4').length, 1);
  assert.equal(g.lines.length, 2);
});

// P5c: a circuit's ranking feeding a stage is a box of its own, named for the
// circuit and opening its ranking, never a stage id that does not exist.
test('a circuit ranking is a box that opens the circuit', () => {
  const ranking = { stage_id: null, stage: null, format: 'circuit', groups: 0, tournament: null,
    circuit: { slug: 'naija-pro-circuit', name: 'Naija Pro Circuit' } };
  const g = pathWithFeeds({ stages: [{ id: 's1', label: 'Finals' }], progressions: [] },
    { incoming: [{ id: 3, source: ranking, target: { stage_id: 's1' }, qualifiers: [] },
                 { id: 4, source: ranking, target: { stage_id: 's1' }, qualifiers: [] }] });
  assert.deepEqual(g.stages.map((s) => s.id), ['x-in-c-naija-pro-circuit', 's1']);
  assert.equal(g.stages[0].label, 'Naija Pro Circuit');
  assert.equal(g.stages[0].kind, 'circuit');
  assert.equal(g.stages[0].href, '/circuits/naija-pro-circuit');
  assert.equal(g.lines.length, 2);
});

test('a tournament box carries its bracket address', () => {
  const g = pathWithFeeds({ stages: [{ id: 's1' }], progressions: [] },
    { incoming: [{ id: 1, source: side(4, 'Lagos Qualifier', 'lagos-qualifier'), target: { stage_id: 's1' } }] });
  assert.equal(g.stages[0].href, '/tournaments/lagos-qualifier?tab=bracket');
});

console.log(`\n${failures} failed`);
process.exit(failures ? 1 : 0);
