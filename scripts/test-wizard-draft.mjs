// The duplicate-tournament bug, reproduced and then pinned.
//
//   node scripts/test-wizard-draft.mjs
//
// Production had one tournament in two rows:
//
//   id=26  draft=False  rivalvry-series-s2
//   id=28  draft=True   rivalvry-series-s2-2
//
// Only one code path can create a Tournament, `create_tournament`, so the
// wizard must have POSTed. It POSTs whenever `draftId` is null, which is the
// "start a new tournament" route - and that route was opening pre-filled with
// the last draft somebody had edited, because both routes shared one
// unlabelled localStorage key and the new-tournament path never cleared it.
//
// The first test below is the reproduction: it is written against the OLD
// behaviour and describes what went wrong. The rest pin the fix.

import assert from 'node:assert/strict';
import {
  STORAGE_KEY, clearDraft, draftFor, readDraft, stampDraft, writeDraft,
} from '../src/lib/wizardDraft.js';

let failures = 0;
const test = (name, fn) => {
  try {
    fn();
    console.log(`  ok   ${name}`);
  } catch (err) {
    failures += 1;
    console.log(`  FAIL ${name}`);
    console.log(`       ${err.message}`);
  }
};

// A Storage-like object, so the tests exercise the real read and write paths.
const fakeStorage = () => {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
    _raw: map,
  };
};

console.log('the reproduction');

test('the old shape: unstamped draft data leaks into a NEW tournament', () => {
  // Exactly what was on disk before the stamp existed: the wizard's fields
  // and nothing saying which tournament they belong to.
  const leftBehind = { tournament_title: 'Rivalvry Series S2', team_size: '2' };

  // Opening "start a new tournament" asks for draftId null. Before the fix
  // this returned the draft, the wizard pre-filled, and saving POSTed a
  // second row. It must now return nothing.
  assert.deepEqual(draftFor(leftBehind, null), {},
    'unstamped data was handed to a new tournament, which is the duplicate bug');
});

console.log('continuing a draft');

test('a draft is restored into the wizard that asked for it', () => {
  const stored = stampDraft({ tournament_title: 'Rivalry S2' }, '26');
  assert.deepEqual(draftFor(stored, '26'), { tournament_title: 'Rivalry S2' });
});

test('the id may be a number on one side and a string on the other', () => {
  const stored = stampDraft({ tournament_title: 'Rivalry S2' }, 26);
  assert.deepEqual(draftFor(stored, '26'), { tournament_title: 'Rivalry S2' });
});

test('the stamp is never handed back as a form field', () => {
  const stored = stampDraft({ tournament_title: 'Rivalry S2' }, '26');
  assert.equal('__draft_id' in draftFor(stored, '26'), false,
    'a stray __draft_id would be submitted as a field');
});

console.log('refusing the wrong owner');

test("one draft's work never opens in another draft", () => {
  const stored = stampDraft({ tournament_title: 'Rivalry S2' }, '26');
  assert.deepEqual(draftFor(stored, '28'), {});
});

test('a new tournament never inherits a draft', () => {
  const stored = stampDraft({ tournament_title: 'Rivalry S2' }, '26');
  assert.deepEqual(draftFor(stored, null), {});
});

test('a draft never inherits an unfinished new tournament', () => {
  const stored = stampDraft({ tournament_title: 'Something new' }, null);
  assert.deepEqual(draftFor(stored, '26'), {});
});

test('a new tournament DOES resume its own unfinished work', () => {
  // The reason the store exists at all: a reload must not lose the form.
  const stored = stampDraft({ tournament_title: 'Half typed' }, null);
  assert.deepEqual(draftFor(stored, null), { tournament_title: 'Half typed' });
});

console.log('the storage wrapper');

test('write then read, for a draft', () => {
  const s = fakeStorage();
  writeDraft(s, { tournament_title: 'Rivalry S2' }, '26');
  assert.deepEqual(readDraft(s, '26'), { tournament_title: 'Rivalry S2' });
  assert.deepEqual(readDraft(s, null), {});
});

test('clearing works', () => {
  const s = fakeStorage();
  writeDraft(s, { tournament_title: 'x' }, '26');
  clearDraft(s);
  assert.deepEqual(readDraft(s, '26'), {});
});

test('unreadable storage is survivable rather than fatal', () => {
  // A private window, or site data blocked: touching localStorage throws.
  const hostile = {
    getItem() { throw new Error('denied'); },
    setItem() { throw new Error('denied'); },
    removeItem() { throw new Error('denied'); },
  };
  assert.deepEqual(readDraft(hostile, '26'), {});
  writeDraft(hostile, { a: 1 }, '26');   // must not throw
  clearDraft(hostile);                    // must not throw
});

test('corrupt JSON reads as empty rather than throwing', () => {
  const s = fakeStorage();
  s.setItem(STORAGE_KEY, '{not json');
  assert.deepEqual(readDraft(s, '26'), {});
});

test('a missing storage object is survivable', () => {
  assert.deepEqual(readDraft(undefined, '26'), {});
  writeDraft(undefined, { a: 1 }, '26');
  clearDraft(undefined);
});

console.log('');
console.log(failures ? `${failures} failing` : 'all passing');
process.exit(failures ? 1 : 0);
