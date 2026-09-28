#!/usr/bin/env node
// A view that loads once and then never again.
//
// Match Control said "no bracket has been generated" after a draw made on the
// same page, until somebody reloaded (walk, 28 September 2026). The CEO: "fix
// this so it automatically loads, infact all page should be like this"
// (inbox 312). The sweep that followed found thirty components that fetched on
// mount and never again: the match room, the standings, invitations, squads,
// money, the door check-in, vendor slots, schedules. Twice is a class.
//
// Every one of those now refreshes through useAutoRefresh or useLiveData,
// which also wake at once after any successful write on the page
// (src/lib/changeSignal.js). This fails a component that loads with
// `useEffect(() => { load(); }, [load])` and uses neither, unless it is named
// below with the reason it must not refresh by itself: a form or an editor
// would overwrite what somebody is typing, a catalogue does not change.
//
//   node scripts/check-load-once.mjs
//   node scripts/check-load-once.mjs --self-test

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const FORM = 'a form: a refresh would overwrite what is being typed';
const EDITOR = 'an editor holding unsaved changes';
const ALLOWED = {
  'src/app/marketplace/purchase/[token]/page.js': 'a one-time purchase link, read once',
  'src/app/teams/join/[token]/page.js': 'a one-time join link, read once',
  'src/app/tournaments/register-tournament/page.js': FORM,
  'src/components/cards/LineupPicker.js': 'a lineup being picked: a refresh would drop the selection',
  'src/components/cards/LineupRulesPanel.js': FORM,
  'src/components/checkout-fields/CheckoutFields.js': FORM,
  'src/components/entry-requirements/EntryRequirements.js': EDITOR,
  'src/components/game-modes/useGameModes.js': 'the game mode catalogue, which does not change during a visit',
  'src/components/game-modes/useGames.js': 'the game catalogue, which does not change during a visit',
  'src/components/overlays/OverlaysPanel.js': EDITOR,
  'src/components/pay/PayShortfall.js': FORM,
  'src/components/rules-editor/RulesEditor.js': EDITOR,
  'src/components/run-of-show/RunOfShowPanel.js': EDITOR,
  'src/components/sponsor-editor/SponsorEditor.js': EDITOR,
  'src/components/studio/StudioMedia.js': EDITOR,
  'src/components/studio/StudioPanel.js': EDITOR,
  'src/components/studio/TextLayerEditor.js': EDITOR,
  'src/components/wallet/UsdtDestination.js': FORM,
};

const LOAD_ONCE = /useEffect\(\(\) => \{ ?(?:void )?load\(\);? ?\}, \[load\]\)/;
const LIVE = /\buseAutoRefresh\b|\buseLiveData\b/;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.next'].includes(entry.name) || entry.name.startsWith('.next-dev')) continue;
      walk(full, out);
    } else if (entry.name.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

export function findLoadOnce(files, root = ROOT) {
  const hits = [];
  for (const file of files) {
    const rel = path.relative(root, file).split(path.sep).join('/');
    if (ALLOWED[rel]) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (LOAD_ONCE.test(text) && !LIVE.test(text)) hits.push(rel);
  }
  return hits;
}

function selfTest() {
  const tmp = fs.mkdtempSync(path.join(ROOT, '.load-once-selftest-'));
  const cases = [
    ['src/a.js', 'const load = useCallback(async () => {}, []);\nuseEffect(() => { load(); }, [load]);', 1],
    ['src/b.js', 'useEffect(() => { void load(); }, [load]);', 1],
    ['src/c.js', "import { useAutoRefresh } from '@/lib/useLiveData';\nuseEffect(() => { load(); }, [load]);\nuseAutoRefresh(() => load({ quiet: true }));", 0],
    ['src/d.js', 'const { data } = useLiveData(fetcher, [id]);', 0],
    ['src/components/rules-editor/RulesEditor.js', 'useEffect(() => { load(); }, [load]);', 0],
    ['src/e.js', 'useEffect(() => { setOpen(false); }, [id]);', 0],
  ];
  let failed = 0;
  for (const [name, body, expected] of cases) {
    const file = path.join(tmp, ...name.split('/'));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, body + '\n');
    const got = findLoadOnce([file], tmp).length;
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
  const hits = findLoadOnce(files);
  for (const h of hits) console.log(`${h}: loads once and never again; use useAutoRefresh, or name it with a reason`);
  console.log(`${hits.length} view(s) that load once, ${Object.keys(ALLOWED).length} forms and editors named, in ${files.length} files`);
  process.exit(hits.length ? 1 : 0);
}
