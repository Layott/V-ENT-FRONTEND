#!/usr/bin/env node
// A page that clears the sidebar with its own number, or a shell that switches before 1024px.
//
// CEO, 8 October 2026 (inbox 414): "Optimize the site for tablets devices." Decided the same
// day: under 1024px the shell is the phone layout (MobileHeader with the drawer, BottomMenu),
// 1024px and up the sidebar. What made tablets bad was the old 180px tablet sidebar: 115
// stylesheets cleared it with their own `margin-left: 180px`, and every page that forgot to
// (the roadmap and module pages, among others) sat underneath it. Twice is a class.
//
// So a page clears the sidebar with var(--shell-offset) (0 under 1024px, 250px from 1024px up,
// set once in globals.css), never with a number, and the five shell pieces switch at 1024px.
// This fails:
//   1. margin-left, padding-left or left of 180px or 250px inside a media block that starts
//      below 1024px and is not capped (a tablet sees it). A width of calc(100% - 250px) alone
//      is not counted: pages size a filter bar beside a 250px search box that way;
//   2. a shell piece (sidebar, header, phone header, bottom menu, drawer) showing or hiding its
//      root under a min-width below 1024px.
//
//   node scripts/check-shell-offset.mjs
//   node scripts/check-shell-offset.mjs --self-test

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

// The shell pieces and the class whose display decides whether each one is on screen.
const SHELL = {
  'src/components/sidebar/sidebar.module.css': 'desktopSidebar',
  'src/components/header/header.module.css': 'profileHeader',
  'src/components/mobile-header/mobile-header.module.css': 'profileHeader',
  'src/components/bottom-menu/bottom-menu.module.css': 'bottomMenuContainer',
  'src/components/mobile-sidebar/mobile-sidebar.module.css': 'mobileSidebar',
};

const OFFSET = /(?:^|[;\s{])(margin-left|padding-left|left)\s*:\s*(180|250)px/;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.next')) continue;
      walk(full, out);
    } else if (entry.name.endsWith('.css')) {
      out.push(full);
    }
  }
  return out;
}

// Every @media block: its prelude and its body, brace-matched.
function mediaBlocks(css) {
  const out = [];
  const re = /@media[^{]*\{/g;
  let m;
  while ((m = re.exec(css))) {
    let i = re.lastIndex;
    let depth = 1;
    while (depth && i < css.length) {
      if (css[i] === '{') depth += 1;
      else if (css[i] === '}') depth -= 1;
      i += 1;
    }
    out.push({ prelude: m[0], body: css.slice(re.lastIndex, i - 1), at: m.index });
  }
  return out;
}

const widthOf = (prelude, which) => {
  const m = prelude.match(new RegExp(`${which}-width:\\s*(\\d+)px`));
  return m ? Number(m[1]) : null;
};

// A block a tablet (768 to 1023px) can see: it starts below 1024 and is not capped below it.
const tabletSees = (prelude) => {
  const min = widthOf(prelude, 'min');
  const max = widthOf(prelude, 'max');
  if (min === null || min >= 1024) return false;
  return max === null || max >= 768;
};

const lineAt = (css, index) => css.slice(0, index).split('\n').length;

export function scan(css, rel) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
  const hits = [];
  for (const block of mediaBlocks(text)) {
    if (!tabletSees(block.prelude)) continue;
    const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
    let r;
    while ((r = ruleRe.exec(block.body))) {
      const off = r[2].match(OFFSET);
      if (off) {
        hits.push(`${rel}:${lineAt(text, block.at)}: ${r[1].trim()} clears the sidebar with ${off[0].replace(/^[;\s{]/, '').trim()}; use var(--shell-offset)`);
      }
      const root = SHELL[rel];
      if (root && new RegExp(`\\.${root}\\b`).test(r[1]) && /(?:^|[;\s{])display\s*:/.test(r[2])
          && widthOf(block.prelude, 'min') !== null) {
        hits.push(`${rel}:${lineAt(text, block.at)}: .${root} switches at ${widthOf(block.prelude, 'min')}px; the shell switches at 1024px`);
      }
    }
  }
  return hits;
}

function selfTest() {
  const cases = [
    ['a page clearing the old tablet sidebar', 'src/app/x/x.module.css',
      '@media only screen and (min-width: 768px) { .pane { margin-left: 180px; width: calc(100% - 180px); } }', 1],
    ['the desktop offset at 768 (a tablet sees 250px of nothing)', 'src/app/x/x.module.css',
      '@media (min-width: 768px) { .pane { margin-left: 250px; width: calc(100% - 250px); } }', 1],
    ['the old tablet offset at 900', 'public/styles/x.module.css',
      '@media only screen and (min-width: 900px) { .header { margin-left: 180px; } }', 1],
    ['a filter bar beside a 250px search box (user-profile-activity)', 'src/components/x.module.css',
      '@media only screen and (min-width: 550px) { .tournamentFilterContainer { width: calc(100% - 250px); } }', 0],
    ['the variable', 'src/app/x/x.module.css',
      '@media (min-width: 768px) { .pane { margin-left: var(--shell-offset); width: calc(100% - var(--shell-offset)); } }', 0],
    ['the desktop offset from 1024px up', 'src/app/x/x.module.css',
      '@media only screen and (min-width: 1024px) { .pane { margin-left: 250px; width: calc(100% - 250px); } }', 0],
    ['a phone-only block', 'src/app/x/x.module.css',
      '@media (max-width: 767px) { .menu { left: 180px; } }', 0],
    ['an in-page 180px column, not an offset', 'src/app/x/x.module.css',
      '@media (min-width: 768px) { .grid { grid-template-columns: 180px 1fr; width: 180px; } }', 0],
    ['an offset inside a comment', 'src/app/x/x.module.css',
      '@media (min-width: 768px) { /* margin-left: 180px; */ .pane { padding: 0; } }', 0],
    ['the sidebar showing itself at 768', 'src/components/sidebar/sidebar.module.css',
      '@media only screen and (min-width: 768px) { .desktopSidebar { display: flex; } }', 1],
    ['the bottom menu hiding itself at 768', 'src/components/bottom-menu/bottom-menu.module.css',
      '@media only screen and (min-width: 768px) { .bottomMenuContainer { display: none; } }', 1],
    ['the bottom menu hiding itself at 1024', 'src/components/bottom-menu/bottom-menu.module.css',
      '@media only screen and (min-width: 1024px) { .bottomMenuContainer { display: none; } }', 0],
    ['a shell piece styling something else at 768', 'src/components/header/header.module.css',
      '@media (min-width: 768px) { .searchBar { display: flex; } }', 0],
  ];
  let failed = 0;
  for (const [name, rel, css, expected] of cases) {
    const got = scan(css, rel).length;
    const ok = got === expected;
    if (!ok) failed += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: expected ${expected}, got ${got}`);
  }
  console.log(`${cases.length - failed}/${cases.length} self-test cases`);
  return failed === 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  if (process.argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);
  const files = [...walk(path.join(ROOT, 'src')), ...walk(path.join(ROOT, 'public', 'styles'))];
  const hits = [];
  for (const file of files) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    hits.push(...scan(fs.readFileSync(file, 'utf8'), rel));
  }
  for (const missing of Object.keys(SHELL).filter((rel) => !fs.existsSync(path.join(ROOT, rel)))) {
    hits.push(`${missing}: shell piece not found; update SHELL in this checker`);
  }
  for (const h of hits) console.log(h);
  console.log(`${hits.length} hard-coded sidebar offsets or early shell switches, in ${files.length} stylesheets`);
  process.exit(hits.length ? 1 : 0);
}
