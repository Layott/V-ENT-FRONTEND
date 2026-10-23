// The circuit point table read in the browser the way the server reads it
// (P5). The cases are vent_circuits/tests.py PointTableTests, so the form's
// preview and the server can never disagree on what a table means.
//
//   node scripts/test-circuit-table.mjs
import { describeTable, parseTable, tableProblem } from '../src/lib/circuitTable.js';

let passed = 0;
let failed = 0;
const check = (name, ok, got) => {
  if (ok) passed += 1;
  else { failed += 1; console.log(`FAIL ${name}: ${JSON.stringify(got)}`); }
};
const tt = (_key, english) => english;

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

let got = parseTable('1: 300, 2-9: 100, default 10');
check('the design example reads', same(got.table, { rows: [[1, 1, '300'], [2, 9, '100']], default: '10' }), got);

got = parseTable('1:300 ,2 - 9 : 100\n default 10');
check('spacing and new lines read the same', same(got.table, { rows: [[1, 1, '300'], [2, 9, '100']], default: '10' }), got);

got = parseTable('1: 12.5, default 0.25');
check('halves are kept', same(got.table, { rows: [[1, 1, '12.5']], default: '0.25' }), got);

check('an empty table is empty', same(parseTable('   ').table, {}), parseTable('   '));

for (const [text, code, part] of [
  ['1: 300, 2-x: 100', 'POINT_TABLE_INVALID', '2-x: 100'],
  ['first: 300', 'POINT_TABLE_INVALID', 'first: 300'],
  ['1 300', 'POINT_TABLE_INVALID', '1 300'],
  ['1: -5', 'POINT_TABLE_RANGE', '1: -5'],
  ['0: 10', 'POINT_TABLE_RANGE', '0: 10'],
  ['1: 1000001', 'POINT_TABLE_RANGE', '1: 1000001'],
  ['1: 10.125', 'POINT_TABLE_INVALID', '1: 10.125'],
  ['9-2: 10', 'POINT_TABLE_ORDER', '9-2: 10'],
  ['1-4: 10, 3: 5', 'POINT_TABLE_OVERLAP', '3: 5'],
  ['1: 10, 1: 5', 'POINT_TABLE_OVERLAP', '1: 5'],
  ['default 5, default 6', 'POINT_TABLE_OVERLAP', 'default 6'],
  ['1-5000: 10', 'POINT_TABLE_RANGE', '1-5000: 10'],
]) {
  got = parseTable(text);
  check(`refused: ${text}`, got.table === null && got.error.code === code && got.error.part === part, got);
}

got = parseTable(Array.from({ length: 129 }, (_, i) => `${i + 1}: 1`).join(', '));
check('too long', got.error?.code === 'POINT_TABLE_TOO_LONG', got);

const words = describeTable(tt, parseTable('1: 300, 2-9: 100, default 10').table);
check('described place by place', same(words, [
  { label: 'Place 1', points: '300' },
  { label: 'Places 2 to 9', points: '100' },
  { label: 'Everybody else', points: '10' },
]), words);
check('no default is nothing for everybody else', describeTable(tt, { rows: [] })[0].points === '0', describeTable(tt, { rows: [] }));

const problem = tableProblem(tt, parseTable('1: 300, 2-x: 100').error);
check('the problem names the part', problem.includes('"2-x: 100"'), problem);

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
