// Every full-screen sheet stacks above the phone's bottom menu.
//
// The bottom menu is fixed to the foot of every page on a phone. A modal whose
// overlay has the same z-index loses the tie to whichever comes later in the
// page, and the menu comes later: fifteen overlays at 1000 against a menu at
// 1000 meant the bottom 70px of every sheet sat under the menu on a phone. The
// ticket step's main button was there on 13 October 2026, and a desktop walk
// or a resized window that never scrolls the sheet to its end cannot see it.
//
// A full-screen overlay is a rule with `position: fixed` that covers the
// viewport (`inset: 0`, or 0 on all four sides, or 0 on top and left with the
// full width and height). Its z-index must be above the menu's.
//
//   node scripts/check-sheet-stacking.mjs              exit 1 on any sheet at or under the menu
//   node scripts/check-sheet-stacking.mjs --self-test  proves it on fixtures
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MENU = 'src/components/bottom-menu/bottom-menu.module.css';
const SCAN = ['src', 'public/styles'];
//: Shells that never draw the bottom menu, so nothing in them can sit under it.
//: Each is checked: if any file under one starts rendering <BottomMenu, the run fails.
const NO_MENU = [
  ['src/app/(admin)/', 'the admin console has its own navigation'],
  ['src/components/admin/', "the admin console's own components"],
  ['src/app/studio/', 'the production studio is a full-screen workspace'],
  ['src/app/tournaments/overlay/', 'the broadcast overlay is drawn into OBS'],
];

//: Every innermost `selector { declarations }` block, with the line it starts on.
export function blocks(css) {
  const out = [];
  const text = css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
  const stack = [];
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '{') stack.push({ open: i, inner: false });
    else if (text[i] === '}') {
      const b = stack.pop();
      if (!b) continue;
      if (stack.length) stack[stack.length - 1].inner = true;
      if (b.inner) continue;
      const head = text.slice(0, b.open);
      const selector = head.slice(Math.max(head.lastIndexOf('}'), head.lastIndexOf('{'), head.lastIndexOf(';')) + 1).trim();
      out.push({ selector, body: text.slice(b.open + 1, i), line: head.split('\n').length });
    }
  }
  return out;
}

const decl = (body, prop) => {
  const m = body.match(new RegExp(`(?:^|[;\\s])${prop}\\s*:\\s*([^;]+)`, 'i'));
  return m ? m[1].replace(/!important/, '').trim() : null;
};
const zero = (v) => v !== null && /^0(px|rem|%)?$/.test(v);
const full = (v) => v !== null && /^(100(%|vw|vh|dvh|svh)|100dvh)$/.test(v);

export function coversScreen(body) {
  if (decl(body, 'position') !== 'fixed') return false;
  const inset = decl(body, 'inset');
  if (inset !== null && inset.split(/\s+/).every(zero)) return true;
  const [t, r, b, l] = ['top', 'right', 'bottom', 'left'].map((p) => decl(body, p));
  if (zero(t) && zero(r) && zero(b) && zero(l)) return true;
  return zero(t) && zero(l) && full(decl(body, 'width')) && full(decl(body, 'height'));
}

export function menuZ(css) {
  const menu = blocks(css).find((b) => /\.bottomMenuContainer\b/.test(b.selector));
  const z = menu && Number(decl(menu.body, 'z-index'));
  return Number.isFinite(z) ? z : null;
}

export function hits(files, menu) {
  const out = [];
  for (const [name, css] of files) {
    for (const b of blocks(css)) {
      if (!coversScreen(b.body)) continue;
      const raw = decl(b.body, 'z-index');
      const z = Number(raw);
      if (raw === null || !Number.isFinite(z) || z > menu) continue;
      out.push(`${name}:${b.line}  ${b.selector}  z-index ${z} is not above the bottom menu (${menu})`);
    }
  }
  return out;
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.css')) acc.push(p);
  }
  return acc;
}

function walkJs(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkJs(p, acc);
    else if (/\.(js|jsx)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

function selfTest() {
  const menuCss = '.bottomMenuContainer { position: fixed; bottom: 0; z-index: 950; }';
  const cases = [
    ['an overlay tied with the menu', '.modalOverlay { position: fixed; inset: 0; z-index: 950; }', 1],
    ['an overlay under the menu', '.overlay {\n  position: fixed;\n  top: 0; right: 0; bottom: 0; left: 0;\n  z-index: 100;\n}', 1],
    ['an overlay by width and height', '.backdrop { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 900; }', 1],
    ['an overlay inside a media query', '@media (max-width: 720px) { .sheet { position: fixed; inset: 0; z-index: 10; } }', 1],
    ['an overlay above the menu', '.modalOverlay { position: fixed; inset: 0; z-index: 1000; }', 0],
    ['a fixed bar, not a sheet', '.adminBar { position: fixed; bottom: 0; left: 0; right: 0; height: 56px; z-index: 900; }', 0],
    ['inset on something absolute', '.cover { position: absolute; inset: 0; z-index: 2; }', 0],
    ['a commented-out overlay', '/* .old { position: fixed; inset: 0; z-index: 5; } */ .x { color: red; }', 0],
    ['an overlay with no z-index', '.plain { position: fixed; inset: 0; }', 0],
  ];
  let failed = 0;
  const menu = menuZ(menuCss);
  if (menu !== 950) { failed += 1; console.log(`FAIL reading the menu: got ${menu}, wanted 950`); }
  for (const [label, css, want] of cases) {
    const got = hits([['fixture.module.css', css]], menu).length;
    if (got !== want) { failed += 1; console.log(`FAIL ${label}: ${got} hit(s), wanted ${want}`); }
  }
  console.log(`${cases.length + 1} self-test case(s), ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

if (process.argv.includes('--self-test')) selfTest();
else {
  const menu = menuZ(fs.readFileSync(path.join(ROOT, MENU), 'utf8'));
  if (menu === null) { console.log(`could not read the bottom menu's z-index from ${MENU}`); process.exit(1); }
  const rel = (f) => path.relative(ROOT, f).replace(/\\/g, '/');
  const stale = NO_MENU.flatMap(([dir]) => walkJs(path.join(ROOT, dir))
    .filter((f) => /<BottomMenu\b/.test(fs.readFileSync(f, 'utf8')))
    .map((f) => `${rel(f)}  renders the bottom menu, so ${dir} can no longer be skipped`));
  const files = SCAN.flatMap((d) => walk(path.join(ROOT, d)))
    .map(rel)
    .filter((f) => f !== MENU && !NO_MENU.some(([dir]) => f.startsWith(dir)))
    .map((f) => [f, fs.readFileSync(path.join(ROOT, f), 'utf8')]);
  const found = [...stale, ...hits(files, menu)];
  found.forEach((h) => console.log(h));
  console.log(`${found.length} full-screen sheet(s) at or under the bottom menu (z-index ${menu}), ${files.length} stylesheets read, ${NO_MENU.length} shells without the menu skipped`);
  process.exit(found.length ? 1 : 0);
}
