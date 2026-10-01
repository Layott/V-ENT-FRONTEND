// A server's English label drawn straight onto the page (inbox 408, 1 October 2026).
//
// Walking the battle console in French showed "Voting is open": the server sent
// `state_label` in English and two pages drew it as it came. The same was true
// of the admin role names, the report reasons and the manga kind. A page draws
// a stored value through t() with the code as the key and the server's English
// as the fallback:
//
//   {tt(`anime.battleState.${battle.state}`, battle.state_label)}
//
// This fails on `{x.something_label}` rendered bare in JSX. Fields that are
// names or words a person typed (a USDT network's own name, the words an
// organiser gave a poll's scale) are listed below with the reason.
//
//   node scripts/check-server-labels.mjs
//   node scripts/check-server-labels.mjs --self-test

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

export const ALLOWED = {
  network_label: 'the network’s own name (TRON, Ethereum), the same in every language',
  scale_min_label: 'words the organiser typed for the low end of a poll scale',
  scale_max_label: 'words the organiser typed for the high end of a poll scale',
};

const BARE = /(^|[>}])\s*\{\s*([A-Za-z_$][\w$]*(?:\??\.[\w$]+)*?\??\.([a-z]+(?:_[a-z]+)*_label))\s*\}/g;

export function findIn(text) {
  const out = [];
  for (const m of text.matchAll(BARE)) {
    if (ALLOWED[m[3]]) continue;
    out.push(m[2]);
  }
  return out;
}

function walk(dir, files = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'i18n') continue;
      walk(p, files);
    } else if (/\.(js|jsx)$/.test(e.name)) files.push(p);
  }
  return files;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain && process.argv.includes('--self-test')) {
  const cases = [
    ['a bare state label', findIn('<p>{battle.state_label}</p>').length, 1],
    ['a bare label after optional chaining', findIn('<span>{row?.reason_label}</span>').length, 1],
    ['a label through tt', findIn('<p>{tt(`a.${b.state}`, b.state_label)}</p>').length, 0],
    ['an allowed proper name', findIn('<b>{row.network_label}</b>').length, 0],
    ['a label used in a condition, not drawn', findIn('{x.kind_label ? 1 : 0}').length, 0],
    ['a label as an attribute value', findIn('<img alt={x.kind_label} />').length, 0],
  ];
  let bad = 0;
  for (const [what, got, want] of cases) {
    if (got !== want) { bad += 1; console.log(`FAIL: ${what} -> ${got}, expected ${want}`); } else console.log(`ok: ${what}`);
  }
  console.log(bad ? 'self-test FAILED' : `${cases.length}/${cases.length} self-test cases`);
  process.exit(bad ? 1 : 0);
}

if (isMain) {
  let n = 0;
  for (const f of walk(path.join(ROOT, 'src'))) {
    const text = fs.readFileSync(f, 'utf8');
    for (const hit of findIn(text)) {
      n += 1;
      console.log(`  ${path.relative(ROOT, f).replace(/\\/g, '/')}: {${hit}} drawn as the server sent it; route it through t()`);
    }
  }
  console.log(`${n} server label(s) drawn without translation`);
  process.exit(n ? 1 : 0);
}
