// A studio graphic with no home in the console (inbox 394, 395).
//
// CEO, 30 September 2026: "please let the overlays be properly structured and
// arranged on the site, so its easy for someone to manoeuvre the production
// studio." The console groups graphics (src/components/studio/studioGroups.js)
// and names them (labelsFor in StudioPanel.js); a designed kind also needs its
// drawing (src/lib/overlays/index.js). A kind added on the server and missed
// on one of those lands under "More" with its machine name, or draws nothing.
// This fails when any kind the server lists is:
//
//   in no group
//   without a label in the console
//   designed on the server (DESIGNED_KINDS) with no drawing registered
//
//   node scripts/check-studio-groups.mjs
//   node scripts/check-studio-groups.mjs --self-test

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const MODELS = ['V-ENT-BACKEND-flw', 'V-ENT-BACKEND']
  .map((d) => path.join(ROOT, '..', d, 'vent_tournament', 'models.py')).find((p) => fs.existsSync(p));

/** Kinds in a named list of (kind, label) pairs in models.py. */
export function kindsIn(python, name) {
  const start = python.indexOf(`${name} = [`);
  if (start < 0) return [];
  const end = python.indexOf(']', python.indexOf('\n    ]', start));
  return [...python.slice(start, end).matchAll(/\('([a-z_]+)',\s*'[^']*'\)/g)].map((m) => m[1]);
}
export function designedIn(python) {
  const m = /DESIGNED_KINDS = \[([^\]]*)\]/.exec(python);
  return m ? [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]) : [];
}
export function faults({ server, designed, grouped, labelled, drawn }) {
  const out = [];
  for (const k of server) {
    if (!grouped.includes(k)) out.push(`${k}: in no group (studioGroups.js)`);
    if (!labelled.includes(k)) out.push(`${k}: no label in the console (labelsFor, StudioPanel.js)`);
  }
  for (const k of designed) {
    if (!drawn.includes(k)) out.push(`${k}: designed on the server, no drawing in src/lib/overlays/index.js`);
    if (!server.includes(k)) out.push(`${k}: designed but in neither kind list`);
  }
  return out;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain && process.argv.includes('--self-test')) {
  const base = { server: ['a', 'b'], designed: ['b'], grouped: ['a', 'b'], labelled: ['a', 'b'], drawn: ['b'] };
  const py = "    TOURNAMENT_KINDS = [\n        ('a', 'A'),\n        ('b', 'B'),\n    ]\n    DESIGNED_KINDS = ['b']\n";
  const cases = [
    ['everything has a home', faults(base).length, 0],
    ['a kind in no group', faults({ ...base, grouped: ['a'] }).length, 1],
    ['a kind with no label', faults({ ...base, labelled: ['b'] }).length, 1],
    ['a designed kind with no drawing', faults({ ...base, drawn: [] }).length, 1],
    ['reads the kind list', kindsIn(py, 'TOURNAMENT_KINDS').join(','), 'a,b'],
    ['reads DESIGNED_KINDS', designedIn(py).join(','), 'b'],
  ];
  let bad = 0;
  for (const [what, got, want] of cases) {
    if (got !== want) { bad += 1; console.log(`FAIL: ${what} -> ${got}, expected ${want}`); } else console.log(`ok: ${what}`);
  }
  console.log(bad ? 'self-test FAILED' : `${cases.length}/${cases.length} self-test cases`);
  process.exit(bad ? 1 : 0);
}

if (isMain) {
  if (!MODELS) { console.log('backend models.py not found'); process.exit(1); }
  const python = fs.readFileSync(MODELS, 'utf8');
  const server = [...new Set([...kindsIn(python, 'TOURNAMENT_KINDS'), ...kindsIn(python, 'EVENT_KINDS')])];
  const groupsSrc = fs.readFileSync(path.join(ROOT, 'src/components/studio/studioGroups.js'), 'utf8');
  const grouped = [...groupsSrc.matchAll(/kinds: \[([^\]]*)\]/g)].flatMap((m) => [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]));
  const panel = fs.readFileSync(path.join(ROOT, 'src/components/studio/StudioPanel.js'), 'utf8');
  const labelsBlock = panel.slice(panel.indexOf('const labelsFor'), panel.indexOf('});', panel.indexOf('const labelsFor')));
  const labelled = [...labelsBlock.matchAll(/^\s+([a-z_]+): tt\(/gm)].map((m) => m[1]);
  const index = fs.readFileSync(path.join(ROOT, 'src/lib/overlays/index.js'), 'utf8');
  const designsBlock = index.slice(index.indexOf('DESIGNS = {'), index.indexOf('};', index.indexOf('DESIGNS = {')));
  const drawn = [...designsBlock.matchAll(/^\s+([a-z_]+)(?::|,)/gm)].map((m) => m[1]);
  const found = faults({ server, designed: designedIn(python), grouped, labelled, drawn });
  for (const f of found) console.log(`  ${f}`);
  console.log(`${server.length} studio kind(s), ${found.length} without a home in the console`);
  process.exit(found.length ? 1 : 0);
}
