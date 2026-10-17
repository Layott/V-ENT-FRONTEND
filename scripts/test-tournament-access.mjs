// What the tournament console shows each kind of helper (P7), and the words
// for a blueprint's schedule.
//
//   node scripts/test-tournament-access.mjs               the console tabs
//   node scripts/test-tournament-access.mjs --blueprints  the schedule words
//
// Design section 16, P7: "granular roles (structure, report, place entrants,
// standings, caster)". The server answers /access/ with the permissions the
// viewer holds; this is the one place that turns them into tabs, so a helper
// never sees a tab whose doors refuse them, and never lands on Actions.

import assert from 'node:assert/strict';
import { can, tabsFor, PERMISSION_KEYS } from '../src/lib/tournamentAccess.js';

const blueprints = process.argv.includes('--blueprints');
let passed = 0;
let failures = 0;
const test = (name, fn) => {
  try {
    fn();
    passed += 1;
    console.log(`  ok   ${name}`);
  } catch (err) {
    failures += 1;
    console.log(`  FAIL ${name}\n       ${err.message}`);
  }
};

const ALL_TABS = ['actions', 'match-control', 'participants', 'lineup', 'invitations', 'brackets',
  'run-of-show', 'production', 'reminders', 'money', 'stats'];
const helper = (permissions, extra = {}) => ({
  role: 'staff', can_manage: false, can_record_results: permissions.includes('report'),
  is_entrant: false, permissions, ...extra,
});

if (!blueprints) {
  test('the five permissions in the order the server writes them', () => {
    assert.deepEqual(PERMISSION_KEYS, ['structure', 'place', 'report', 'standings', 'caster']);
  });

  test('the organiser sees every tab', () => {
    const organiser = { role: 'organiser', can_manage: true, can_record_results: true,
      is_entrant: false, permissions: PERMISSION_KEYS };
    assert.deepEqual(tabsFor(organiser), ALL_TABS);
  });

  test('report only sees match control', () => {
    assert.deepEqual(tabsFor(helper(['report'])), ['match-control']);
  });

  test('caster only sees production and run of show', () => {
    assert.deepEqual(tabsFor(helper(['caster'])), ['run-of-show', 'production']);
  });

  test('structure sees match control and brackets', () => {
    assert.deepEqual(tabsFor(helper(['structure'])), ['match-control', 'brackets']);
  });

  test('place sees match control and brackets', () => {
    assert.deepEqual(tabsFor(helper(['place'])), ['match-control', 'brackets']);
  });

  test('standings sees player stats', () => {
    assert.deepEqual(tabsFor(helper(['standings'])), ['stats']);
  });

  test('a helper who also plays adds the lineup tab', () => {
    assert.deepEqual(tabsFor(helper(['report'], { is_entrant: true })), ['match-control', 'lineup']);
  });

  test('a player with no permissions sees the lineup alone', () => {
    assert.deepEqual(tabsFor(helper([], { role: null, is_entrant: true })), ['lineup']);
  });

  test('a stranger sees none', () => {
    assert.deepEqual(tabsFor({ role: null, can_manage: false, permissions: [] }), []);
    assert.deepEqual(tabsFor(null), []);
  });

  test('can() with a missing access is false', () => {
    assert.equal(can(null, 'report'), false);
    assert.equal(can(undefined, 'manage'), false);
    assert.equal(can({}, 'caster'), false);
  });

  test('can() reads manage from can_manage and everything else from the list', () => {
    assert.equal(can(helper(['caster']), 'caster'), true);
    assert.equal(can(helper(['caster']), 'report'), false);
    assert.equal(can(helper(['caster']), 'manage'), false);
    assert.equal(can({ can_manage: true, permissions: [] }, 'standings'), true);
    assert.equal(can({ can_manage: true }, 'manage'), true);
  });

  test('a name the server never sends opens nothing', () => {
    assert.deepEqual(tabsFor(helper(['owner'])), []);
  });
}

console.log(`\n${passed} passed, ${failures} failed`);
process.exit(failures || !passed ? 1 : 0);
