#!/usr/bin/env node
// A page that loads a tournament or an event by its address and does not
// follow a rename.
//
// The slug rule (V-ENT CLAUDE.md) promises every address a record has ever had
// keeps working: the API answers {status: 'moved', data: {slug, url}} and the
// page follows it. Found twice on 29 September 2026: the tournament console
// read the "moved" answer as the tournament and told its own organiser "this
// console is not yours"; the registration page showed "Failed to load
// tournament". Both were one rename away from anybody following an old link.
//
// Reads every file a page reaches that loads a tournament or event record
// (view-tournament / view-event, raw or through API.*.VIEW) and asks that it
// handles the move: `moved`, `SLUG_CHANGED`, `followRename` or `__moved`.
// Server metadata fetched through fetchRecordForMetadata is exempt: a moved
// record there costs a title, never a page. The admin console loads by id.
//
//   node scripts/check-renames.mjs
//   node scripts/check-renames.mjs --self-test

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { reachableFrom } from './check-literal-text.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const LOADS = /(fetch|ventFetch)\([^)]*(view-tournament\/|view-event\/|API\.TOURNAMENT\.VIEW\(|API\.EVENT\.VIEW\()/;
const HANDLES = /\bmoved\b|SLUG_CHANGED|followRename|__moved/;

export function ignoresRenames(source) {
  const code = source.replace(/fetchRecordForMetadata\([^)]*\)/g, '');
  return LOADS.test(code) && !HANDLES.test(code);
}

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'i18n') continue;
      walk(p, acc);
    } else if (/\.jsx?$/.test(e.name)) acc.push(p);
  }
  return acc;
}

function selfTest() {
  const cases = [
    ['a console that loads and never follows', "const r = await fetch(`${API}/tournament/view-tournament/${id}/`);", true],
    ['the same console following the move', "const r = await fetch(`${API}/tournament/view-tournament/${id}/`); if (b.status === 'moved') go();", false],
    ['ventFetch with followRename', 'try { await ventFetch(API.TOURNAMENT.VIEW(id)) } catch (e) { if (followRename(e, router)) return; }', false],
    ['ventFetch that ignores the move', 'try { await ventFetch(API.TOURNAMENT.VIEW(id)) } catch (e) { show(e) }', true],
    ['metadata only', 'const d = await fetchRecordForMetadata(`/event/view-event/${slug}/`);', false],
  ];
  let failed = 0;
  for (const [name, src, want] of cases) {
    const got = ignoresRenames(src);
    if (got !== want) failed++;
    console.log(`${got === want ? 'ok  ' : 'FAIL'} ${name}: ${got} (want ${want})`);
  }
  console.log(failed ? `${failed} self-test case(s) FAILED` : `${cases.length} self-test case(s) pass`);
  process.exit(failed ? 1 : 0);
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const files = walk(path.join(ROOT, 'src'));
  const reachable = reachableFrom(files);
  const bad = files
    .filter((f) => reachable.has(path.resolve(f)))
    .filter((f) => !/[\\/]\(admin\)[\\/]/.test(f))
    .filter((f) => ignoresRenames(fs.readFileSync(f, 'utf8')));
  for (const f of bad) console.log(path.relative(ROOT, f).split(path.sep).join('/'));
  console.log(`${bad.length} page(s) that load a record by address and do not follow a rename`);
  process.exit(bad.length ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
