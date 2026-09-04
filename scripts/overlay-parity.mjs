// Shoot every broadcast graphic beside the original it was drawn from.
//
// CEO, 4 September 2026: "please note that the design youi were doing did nnot
// match the original design." The originals are the CADE Rivalry Series pack in
// CLAUDE/VIDEOS/RIVALRY/motion/stream/, fifty six standalone 1920x1080 files.
// The ported graphics are the studio's own element pages reading the live feed.
//
// Both are shot at 1920x1080 with no scaling. A broadcast graphic looked at in
// a narrower window is a broadcast graphic whose design is cropped, and every
// measurement then looks right while being wrong on air. The pack's own harness
// makes the same point: `tools/stream-shot.mjs` shoots at native size.
//
//   node scripts/overlay-parity.mjs
//   node scripts/overlay-parity.mjs standings head_to_head
//
// Needs the dev servers up: the backend on 8000 and the frontend on 3001.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SITE = process.env.WALK_SITE || 'http://127.0.0.1:3001';
const SLUG = process.env.WALK_SLUG || 'rivalry-series-season-2-demo';
const TOKEN = process.env.WALK_TOKEN || '';
const PACK = 'C:/Users/Sweez/Desktop/LAYO/CLAUDE/VIDEOS/RIVALRY/motion/stream';
const OUT = 'C:/Users/Sweez/Desktop/LAYO/CLAUDE/V-ENT/tasks/audit/overlay-parity';

// Which studio graphic came from which file in the pack, and what the operator
// has to have typed for the graphic to be about anything. A payload here is
// pushed to the console before the shot, so the pair being compared is the same
// fixture rather than whatever happened to be live.
const PAIRS = [
  { kind: 'standings', payload: { table: 'players', limit: 10 },
    original: 'D2 individual table.html', as: 'individual-table' },
  { kind: 'standings', payload: { table: 'nations', limit: 10 },
    original: 'A3 standings.html', as: 'nations-table' },
  { kind: 'head_to_head', payload: {}, original: 'B4 head 2 head.html' },
  { kind: 'now_next', payload: {}, original: 'C2 now next bar.html' },
  { kind: 'desk_lower_third',
    // Two people, because a desk names two: the original draws HOST and
    // LEAD CASTER stacked, and a one person payload cannot be compared to it.
    payload: { role: 'Host', name: 'Kunmi',
               role_2: 'Lead caster', name_2: 'Tomide' },
    original: 'C1b desk lower third.html' },
  { kind: 'matchday', payload: { day: '', results: '' },
    original: 'B10 matchday day 2.html' },
  { kind: 'matchday', payload: { day: '', results: 'yes' },
    original: 'B10 matchday day 2 results.html', as: 'matchday-results' },
  { kind: 'analyst_desk', payload: { label: 'The desk', note: 'Analysts' },
    original: 'C3 analyst desk.html' },
  { kind: 'play_area', payload: { label: 'Live play', note: 'Seat 1' },
    original: 'C6 play area frame.html' },
];

const wanted = process.argv.slice(2);
const chosen = wanted.length
  ? PAIRS.filter((p) => wanted.includes(p.kind) || wanted.includes(p.as))
  : PAIRS;

fs.mkdirSync(OUT, { recursive: true });

/** Put a graphic on air with the payload this comparison is about.
 *
 * Through the management command rather than the API, because the API wants an
 * organiser's bearer token and this script is a local harness, not a user.
 */
function cue(kind, payload) {
  const code = [
    'from vent_tournament.models import BroadcastSession, BroadcastElement',
    'import json, sys',
    `s = BroadcastSession.objects.filter(token=${JSON.stringify(TOKEN)}).first()`,
    `row, _ = BroadcastElement.objects.get_or_create(session=s, kind=${JSON.stringify(kind)}, defaults={'payload': {}})`,
    `row.payload = json.loads(${JSON.stringify(JSON.stringify(payload))})`,
    'row.is_active = True',
    'row.save()',
  ].join('\n');
  execFileSync('./venv/Scripts/python.exe', ['manage.py', 'shell', '-c', code], {
    cwd: 'C:/Users/Sweez/Desktop/LAYO/CLAUDE/V-ENT/V-ENT-BACKEND',
    env: { ...process.env, DB_ENGINE: 'sqlite', DEBUG: 'True' },
    stdio: 'ignore',
  });
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--allow-file-access-from-files', '--force-device-scale-factor=1'],
});

const shoot = async (url, file, settle = 2500) => {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  const complaints = [];
  page.on('pageerror', (e) => complaints.push(String(e).slice(0, 160)));
  page.on('console', (m) => {
    if (m.type() === 'error') complaints.push(m.text().slice(0, 160));
  });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
  // The element page polls, and a graphic that has not had its first answer
  // yet draws nothing. Fonts matter too: a shot taken before Astronum loads is
  // a shot of the fallback face, which is exactly the thing being checked.
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await new Promise((r) => setTimeout(r, settle));
  await page.screenshot({ path: path.join(OUT, file) });
  await page.close();
  return complaints;
};

const notes = [];
for (const pair of chosen) {
  const name = pair.as || pair.kind;
  if (TOKEN) cue(pair.kind, pair.payload);
  const mine = await shoot(
    `${SITE}/studio/${SLUG}/${pair.kind}/${TOKEN}`, `${name}-vent.png`);
  const theirs = await shoot(
    'file:///' + path.join(PACK, pair.original).replace(/\\/g, '/'),
    `${name}-original.png`, 3500);
  notes.push({ name, mine, theirs });
  console.log(`${name}: shot both${mine.length ? '  CONSOLE: ' + mine[0] : ''}`);
}

await browser.close();
const bad = notes.filter((n) => n.mine.length);
console.log(`\n${chosen.length} pairs in ${OUT}`);
console.log(bad.length ? `${bad.length} with console errors` : 'no console errors');
