// A stage's name on screen, and a format's summary, in the reader's language
// (inbox 515 and 516).
//
//   node scripts/test-stage-name.mjs
//
// A stage nobody named is stored with the format's English name, so a French
// screen read "Single elimination" inside a French sentence. These cases hold
// the rule: a name somebody typed is shown as typed, the server's own name for
// a format is translated, and a summary is looked up by its key.

import assert from 'node:assert/strict';
import { formatSummary, stageName } from '../src/lib/formatLabel.js';

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

// A translator that marks every string it is given, so a test can tell a
// translated name from one passed through unchanged.
const tt = (key) => `fr:${key}`;

test('a server name with its format is translated', () => {
  assert.equal(stageName(tt, 'Single elimination', 'single_elimination'), 'fr:format.label.single_elimination');
});

test('a server name with no format is still translated', () => {
  assert.equal(stageName(tt, 'Single elimination'), 'fr:format.label.single_elimination');
});

test('the battle royale server name is translated', () => {
  assert.equal(stageName(tt, 'Battle royale points', 'battle_royale'), 'fr:format.label.battle_royale');
});

test('a name somebody typed is shown as typed', () => {
  assert.equal(stageName(tt, 'Groupes du samedi', 'round_robin'), 'Groupes du samedi');
});

test('an empty name takes the format name, translated', () => {
  assert.equal(stageName(tt, '', 'swiss'), 'fr:format.label.swiss');
});

test('a custom bracket takes its preset name', () => {
  assert.equal(stageName(tt, 'Custom bracket', 'custom_bracket', 'compass'), 'fr:stages.customPreset.compass');
});

test('a summary is looked up by its key', () => {
  assert.equal(formatSummary(tt, 'single_elimination'), 'fr:format.summary.single_elimination');
});

test('a summary with no known format is the fallback', () => {
  assert.equal(formatSummary(tt, 'nonsense', 'x'), 'x');
});

console.log(`\n${failures} failed`);
process.exit(failures ? 1 : 0);
