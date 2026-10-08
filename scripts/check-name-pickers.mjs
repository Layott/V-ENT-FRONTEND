#!/usr/bin/env node
// A plain text box that asks for somebody's username.
//
// CEO, 4 September 2026: the organisation invite form should be "showing
// people with usernames closest to that on the platform, same for other places
// on the website that require you to input username". The picker was built and
// used in five places. On 8 October the team invite was still a plain box, and
// the CEO asked again (inbox 416): "it should show users with that name close
// to what you typed ... anywhere you have to input a team, player or
// organization name should also trigger drop-downs". Ten more boxes were
// found. Twice is a class.
//
// This fails an `<input>` whose placeholder or label asks for a person by
// username or handle, or for "who it goes to / comes from", unless the file is
// named below with the reason: those are the boxes where somebody types THEIR
// OWN name (signing in, choosing a handle), which no list can answer.
// The fix is NamePicker (kind user, team or org), or UserPicker.
//
//   node scripts/check-name-pickers.mjs
//   node scripts/check-name-pickers.mjs --self-test

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const OWN = 'somebody types their own name here; there is nobody to pick';
const ALLOWED = {
  'src/app/login/page.js': OWN,
  'src/app/signup/page.js': OWN,
  'src/app/onboarding/page.js': OWN,
  'src/app/claim/[token]/page.js': OWN,
  'src/components/settings-panels/AccountPanel.js': OWN,
  'src/components/edit-profile-panels/ProfileInfoPanel.js': OWN,
  // The picker itself draws the one input it owns.
  'src/components/name-picker/NamePicker.js': 'the picker itself',
  'src/app/wallets/send/page.js': 'its own suggestion list, for up to 20 recipients of three kinds at once; it searches with purpose=pick',
};

// What asks for a person. Searched in the placeholder and aria-label text of
// an <input>, including the English fallback inside tt('key', '...').
const ASKS = /\busernames?\b|@handle|their handle|\bby handle\b|who (?:it )?(?:goes|comes) (?:to|from)|who owns it:/i;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.next', 'i18n'].includes(entry.name) || entry.name.startsWith('.next-dev')) continue;
      walk(full, out);
    } else if (entry.name.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

// Every `<input ... />` element, however many lines it spans. JSX attributes
// can hold `>` inside braces (arrow functions), so the end is found by
// tracking brace depth rather than by the first `>`.
function inputs(text) {
  const out = [];
  const re = /<input\b/g;
  let m;
  while ((m = re.exec(text))) {
    let depth = 0;
    let i = m.index + 6;
    for (; i < text.length; i += 1) {
      const c = text[i];
      if (c === '{') depth += 1;
      else if (c === '}') depth -= 1;
      else if (c === '>' && depth === 0) break;
    }
    out.push({ at: m.index, body: text.slice(m.index, i + 1) });
  }
  return out;
}

// The words a box shows: string literals only. `placeholder={u?.username}`
// shows somebody's name, it does not ask for one, and reading the identifier
// as text flagged a delete confirmation (calibration, 8 October).
function literals(expr) {
  const out = [];
  const re = /'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"|`((?:\\.|[^`\\])*)`/g;
  let m;
  while ((m = re.exec(expr))) out.push(m[1] ?? m[2] ?? m[3] ?? '');
  return out;
}

function asked(body) {
  const parts = [];
  for (const attr of ['placeholder', 'aria-label']) {
    const re = new RegExp(`${attr}=\\{([\\s\\S]*?)\\}(?=\\s*(?:[a-zA-Z-]+=|/?>))|${attr}="([^"]*)"`, 'g');
    let m;
    while ((m = re.exec(body))) {
      if (m[2] !== undefined) parts.push(m[2]);
      else parts.push(...literals(m[1] || ''));
    }
  }
  // A translation key ('team.usernamePlaceholder') is not a word on screen,
  // and a search box filters a list on the page; it is not choosing somebody.
  return parts
    .filter((p) => !/^[\w-]+(?:\.[\w-]+)+$/.test(p))
    .filter((p) => !/^\s*(?:search|filter)\b/i.test(p))
    .join(' ');
}

export function findPlainNameBoxes(files, root = ROOT) {
  const hits = [];
  for (const file of files) {
    const rel = path.relative(root, file).split(path.sep).join('/');
    if (ALLOWED[rel]) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (!text.includes('<input')) continue;
    for (const box of inputs(text)) {
      if (/type=["'](?:number|url|email|password|date|time|checkbox|radio|file|hidden)["']/.test(box.body)) continue;
      const words = asked(box.body);
      if (ASKS.test(words)) {
        const line = text.slice(0, box.at).split('\n').length;
        hits.push(`${rel}:${line}`);
      }
    }
  }
  return hits;
}

function selfTest() {
  const tmp = fs.mkdtempSync(path.join(ROOT, '.name-pickers-selftest-'));
  const cases = [
    ['src/a.js', `<input className={styles.input}\n  placeholder={tt('team.usernamePlaceholder', 'Their username')}\n  value={invitee} onChange={e => setInvitee(e.target.value)} />`, 1],
    ['src/b.js', `<input value={to} onChange={(e) => setTo(e.target.value)} placeholder={tt('adminOrgs.moveTo', 'Who it goes to')} />`, 1],
    ['src/c.js', `<input placeholder="Pay it to (email or @username)" value={x} />`, 1],
    ['src/d.js', `<UserPicker value={invitee} onChange={setInvitee} placeholder={tt('team.usernamePlaceholder', 'Their username')} />`, 0],
    ['src/e.js', `<NamePicker kind={toKind} value={to} onChange={setTo} placeholder={tt('adminOrgs.moveTo', 'Who it goes to')} />`, 0],
    ['src/app/login/page.js', `<input type="text" name="username_or_email" placeholder={tt('x', 'Enter your email address or username')} />`, 0],
    ['src/f.js', `<input placeholder={tt('ros.fieldOwner', 'Who owns it')} value={owner} />`, 0],
    ['src/g.js', `<input className={styles.searchInput} placeholder={tt('ui.search.members', 'Search members…')} value={q} />`, 0],
    ['src/h.js', `<input onChange={e => { if (a > b) set(e.target.value); }} placeholder={tt('x', 'Their username')} />`, 1],
    ['src/i.js', `<input type="number" placeholder={tt('x', 'How many usernames')} />`, 0],
    ['src/j.js', `<input value={typed} placeholder={u?.username || ''} onChange={e => setTyped(e.target.value)} />`, 0],
    ['src/k.js', `<input className={styles.searchInput} placeholder={tt('x', 'Search by name, username, code or tier')} />`, 0],
    ['src/m.js', `<input className={styles.searchInput} placeholder={tt("ui.search.name.username.code.2ef3", "Search by name, username, code or tier")} />`, 0],
    ['src/l.js', `<input placeholder={kind === 'team' ? tt('a', 'Team name') : tt('invite.username', 'Username')} />`, 1],
  ];
  let failed = 0;
  for (const [name, body, expected] of cases) {
    const file = path.join(tmp, ...name.split('/'));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, body + '\n');
    const got = findPlainNameBoxes([file], tmp).length;
    const ok = got === expected;
    if (!ok) failed += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: expected ${expected}, got ${got}`);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`${cases.length - failed}/${cases.length} self-test cases`);
  return failed === 0;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (process.argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);
  const files = walk(path.join(ROOT, 'src'));
  const hits = findPlainNameBoxes(files);
  const pickers = files.reduce((n, f) => n + (fs.readFileSync(f, 'utf8').match(/<(?:NamePicker|UserPicker)\b/g) || []).length, 0);
  for (const h of hits) console.log(`${h}: a plain box asking for a username; use NamePicker or UserPicker`);
  console.log(`${hits.length} plain name boxes, ${pickers} name pickers, ${Object.keys(ALLOWED).length} own-name boxes named, in ${files.length} files`);
  process.exit(hits.length ? 1 : 0);
}
