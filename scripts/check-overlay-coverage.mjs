// Every item of the broadcast asset library has a graphic (inbox 396).
//
// The PDF (OVERLAYS-ELEMENTS/Esports_Broadcast_Asset_Library.pdf, its checklist
// copied to docs/asset-library-checklist.txt) lists 337 items. Each one is a
// row of docs/overlay-coverage.json naming the studio kind that makes it and,
// for the six library designs, the preset that says it. This fails when:
//
//   an item of the checklist has no row, or a row names no item
//   a row names a kind the server does not list (or a system part not below)
//   a row names a preset its design does not offer
//   a row is marked not_built without the reason
//
// Rows marked not_built are counted and named, never hidden.
//
//   node scripts/check-overlay-coverage.mjs
//   node scripts/check-overlay-coverage.mjs --self-test

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { kindsIn } from './check-studio-groups.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const MODELS = ['V-ENT-BACKEND-flw', 'V-ENT-BACKEND']
  .map((d) => path.join(ROOT, '..', d, 'vent_tournament', 'models.py')).find((p) => fs.existsSync(p));

/** The parts of the platform a row may name that are not a studio kind. */
export const SYSTEM = new Set(['system:designer', 'system:overlay_style', 'system:feed']);

/** `[section, item]` pairs of the checklist text. */
export function checklistItems(text) {
  const out = [];
  let section = '';
  for (const line of text.split(/\r?\n/)) {
    const s = /^\s*(\d+)\.\s+(.+)$/.exec(line);
    if (s) { section = `${s[1]}. ${s[2].trim()}`; continue; }
    const q = /^\s*q\s+(.+)$/.exec(line);
    if (q) out.push([section, q[1].trim()]);
  }
  return out;
}

/** The preset keys each library design offers, read from library.js. */
export function presetsIn(js) {
  const list = (name) => {
    const m = new RegExp(`export const ${name} = \\[([^\\]]*)\\]`).exec(js);
    return m ? [...m[1].matchAll(/'([a-z0-9_]+)'/g)].map((x) => x[1]) : [];
  };
  return { title_card: list('TITLE_PRESETS'), award_card: list('AWARD_PRESETS'), social_post: list('SOCIAL_PRESETS') };
}

export function faults({ checklist, rows, kinds, presets }) {
  const out = [];
  const key = (s, i) => `${s} | ${i}`;
  const listed = new Map(rows.map((r) => [key(r.section, r.item), r]));
  const wanted = new Set(checklist.map(([s, i]) => key(s, i)));
  for (const [s, i] of checklist) if (!listed.has(key(s, i))) out.push(`no row for "${i}" (${s})`);
  for (const r of rows) {
    const where = `"${r.item}" (${r.section})`;
    if (!wanted.has(key(r.section, r.item))) out.push(`${where} is not an item of the checklist`);
    if (r.status === 'not_built') {
      if (!String(r.reason || '').trim()) out.push(`${where} is not built and says no reason`);
      continue;
    }
    if (!kinds.has(r.kind) && !SYSTEM.has(r.kind)) { out.push(`${where} names "${r.kind}", which the studio does not have`); continue; }
    if (r.preset && !(presets[r.kind] || []).includes(r.preset)) out.push(`${where} names preset "${r.preset}", which ${r.kind} does not offer`);
  }
  return out;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain && process.argv.includes('--self-test')) {
  const checklist = [['1. Core', 'Grand Final Card'], ['4. MLBB', 'Draft / Pick Screen']];
  const kinds = new Set(['title_card', 'standings']);
  const presets = { title_card: ['grand_final'] };
  const good = [
    { section: '1. Core', item: 'Grand Final Card', kind: 'title_card', preset: 'grand_final' },
    { section: '4. MLBB', item: 'Draft / Pick Screen', status: 'not_built', reason: 'no draft data' },
  ];
  const cases = [
    ['a full register passes', faults({ checklist, rows: good, kinds, presets }).length, 0],
    ['an item with no row', faults({ checklist, rows: good.slice(0, 1), kinds, presets }).length, 1],
    ['a row for no item', faults({ checklist, rows: [...good, { section: '1. Core', item: 'Nope', kind: 'standings' }], kinds, presets }).length, 1],
    ['a kind the studio does not have', faults({ checklist, rows: [{ ...good[0], kind: 'title_cards' }, good[1]], kinds, presets }).length, 1],
    ['a preset the design does not offer', faults({ checklist, rows: [{ ...good[0], preset: 'grand_finale' }, good[1]], kinds, presets }).length, 1],
    ['not built without a reason', faults({ checklist, rows: [good[0], { ...good[1], reason: ' ' }], kinds, presets }).length, 1],
    ['a system part is a home', faults({ checklist: [['11. T', 'Custom colors']], rows: [{ section: '11. T', item: 'Custom colors', kind: 'system:overlay_style' }], kinds, presets }).length, 0],
    ['checklist lines read with their section', checklistItems('1. Core\n\nq Lower Third\n2. PUBG\nq Alive Counter').length, 2],
    ['presets read out of library.js', presetsIn("export const TITLE_PRESETS = [\n  'grand_final', 'custom',\n];").title_card.length, 2],
  ];
  let bad = 0;
  for (const [what, got, want] of cases) {
    if (got !== want) { bad += 1; console.log(`FAIL: ${what} -> ${got}, expected ${want}`); } else console.log(`ok: ${what}`);
  }
  console.log(bad ? 'self-test FAILED' : `${cases.length}/${cases.length} self-test cases`);
  process.exit(bad ? 1 : 0);
}

if (isMain) {
  if (!MODELS) { console.log('models.py not found beside this repo; cannot check'); process.exit(1); }
  const python = fs.readFileSync(MODELS, 'utf8');
  const kinds = new Set([...kindsIn(python, 'TOURNAMENT_KINDS'), ...kindsIn(python, 'EVENT_KINDS')]);
  const presets = presetsIn(fs.readFileSync(path.join(ROOT, 'src/lib/overlays/library.js'), 'utf8'));
  const checklist = checklistItems(fs.readFileSync(path.join(ROOT, 'docs/asset-library-checklist.txt'), 'utf8'));
  const rows = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/overlay-coverage.json'), 'utf8')).items;
  // The register's own count against the reader's, so a checklist that reads
  // as empty cannot pass by having nothing to compare (R47).
  if (!checklist.length || checklist.length !== rows.length) {
    console.log(`checklist has ${checklist.length} items and the register ${rows.length} rows`);
  }
  const found = faults({ checklist, rows, kinds, presets });
  for (const f of found) console.log(`  ${f}`);
  const notBuilt = rows.filter((r) => r.status === 'not_built');
  for (const r of notBuilt) console.log(`  not built: ${r.item} (${r.reason})`);
  console.log(`${checklist.length} asset library items, ${found.length} without a graphic, ${notBuilt.length} not built with a reason`);
  process.exit(found.length || !checklist.length ? 1 : 0);
}
