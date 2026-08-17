#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * REAL-MODE mobile screenshot + responsive audit for V-ENT Stage-1 pages.
 *
 * Uses a TRUE mobile viewport (CDP device metrics via puppeteer-core:
 * 390x844, deviceScaleFactor 3, isMobile, hasTouch, mobile UA) — unlike the
 * Claude-in-Chrome extension, this actually shrinks the layout viewport, so
 * media queries fire and scrollWidth reflects the phone width. That means it
 * catches real mobile bugs the CSS-emulation trick cannot: horizontal overflow,
 * elements wider than the screen, sub-44px tap targets.
 *
 * Prereqs: both dev servers up, FE in REAL mode (.env.local NEXT_PUBLIC_USE_MOCK=false),
 * a seeded user (default orga / Passw0rd!).
 *
 * Usage:
 *   node scripts/mobile-shots.js
 *   MOBILE_USER=newbie2 MOBILE_PASS='Passw0rd!' node scripts/mobile-shots.js
 *
 * Output: scripts/mobile-shots/<name>.png  +  a console table of overflow/errors.
 * Exits 1 if any page has horizontal overflow or a console error.
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const BASE = process.env.MOBILE_BASE || 'http://127.0.0.1:3000';
const CHROME = process.env.CHROME_BIN ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER = process.env.MOBILE_USER || 'orga';
const PASS = process.env.MOBILE_PASS || 'Passw0rd!';
const OUT = path.join(__dirname, 'mobile-shots');

// iPhone 12-ish. width/height are CSS px; DSR 3 => crisp retina screenshots.
const VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
const UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 ' +
  '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

// Stage-1 surfaces only. `auth:false` = shoot before logging in.
const ROUTES = [
  { path: '/', label: 'landing', auth: false },
  { path: '/login', label: 'login', auth: false },
  { path: '/home', label: 'home' },
  { path: '/user-profile', label: 'user-profile' },
  { path: '/tournaments', label: 'tournaments-list' },
  { path: '/tournaments/view-tournament?id=3', label: 'tournament-detail' },
  { path: '/tournaments/create-tournament', label: 'tournament-create' },
  { path: '/events', label: 'events-list' },
  { path: '/events/view-event?id=1', label: 'event-detail' },
  { path: '/events/create-event', label: 'event-create' },
  { path: '/settings', label: 'settings' },
  { path: '/wallets', label: 'wallets' },
  { path: '/wallets/pin', label: 'wallets-pin' },
  { path: '/wallets/verify', label: 'wallets-verify' },
  { path: '/teams', label: 'teams-list' },
  { path: '/teams/team-profile?id=3', label: 'team-profile' },
  { path: '/teams/create-team', label: 'team-create' },
  { path: '/edit-team-profile?id=3', label: 'edit-team' },
  { path: '/notifications', label: 'notifications' },
  { path: '/disputes', label: 'disputes' },
];

const IGNORE = [
  'Download the React DevTools', 'next-auth][warn][DEBUG_ENABLED', 'favicon',
  'preloaded using', 'was preloaded', '_rsc=', 'net::ERR_ABORTED', 'hot-update',
];
const ignorable = (t) => !t || IGNORE.some((p) => t.includes(p));

async function shoot(page, route) {
  const errors = [];
  const onErr = (e) => { if (!ignorable(e.message)) errors.push(`pageerror: ${e.message}`); };
  const onConsole = (m) => { if (m.type() === 'error' && !ignorable(m.text())) errors.push(`console: ${m.text()}`); };
  page.on('pageerror', onErr);
  page.on('console', onConsole);

  try {
    await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle0', timeout: 45000 });
  } catch (e) {
    // networkidle can time out on pages that poll; fall back to a settle wait.
    await new Promise((r) => setTimeout(r, 2000));
  }
  await new Promise((r) => setTimeout(r, 1200));

  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    // tap targets smaller than 44px on either axis (buttons/links only)
    smallTaps: Array.from(document.querySelectorAll('button, a[href]'))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44);
      }).length,
  }));

  const file = path.join(OUT, `${route.label}.png`);
  await page.screenshot({ path: file, fullPage: true });

  page.off('pageerror', onErr);
  page.off('console', onConsole);

  const overflow = metrics.scrollWidth > metrics.innerWidth + 1;
  return { ...route, ...metrics, overflow, errors, file };
}

(async () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  await page.setUserAgent(UA);
  page.setDefaultTimeout(30000);

  const results = [];

  // Public pages first (logged out).
  for (const r of ROUTES.filter((x) => x.auth === false)) {
    results.push(await shoot(page, r));
  }

  // Real login.
  let loggedIn = false;
  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('input[type="password"]', { timeout: 8000 });
    await page.type('input[type="text"], input[type="email"], input:not([type])', USER, { delay: 20 });
    await page.type('input[type="password"]', PASS, { delay: 20 });
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find((x) => /log\s?in/i.test(x.textContent || ''));
      if (b) b.click();
    });
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 45000 });
    loggedIn = !/\/login$/.test(page.url());
  } catch (e) {
    console.log(`! login step: ${e.message} (url=${page.url()})`);
    loggedIn = !/\/login$/.test(page.url());
  }
  console.log(`login as ${USER}: ${loggedIn ? 'OK -> ' + page.url() : 'FAILED'}`);

  // Authed pages.
  if (loggedIn) {
    for (const r of ROUTES.filter((x) => x.auth !== false)) {
      results.push(await shoot(page, r));
    }
  }

  await browser.close();

  // Report.
  console.log('\n=== MOBILE 390x844 AUDIT ===');
  let bad = 0;
  for (const r of results) {
    const flags = [];
    if (r.overflow) { flags.push(`OVERFLOW sw=${r.scrollWidth}>vw=${r.innerWidth}`); bad++; }
    if (r.errors.length) { flags.push(`${r.errors.length} console-err`); bad++; }
    const tap = r.smallTaps ? ` taps<44:${r.smallTaps}` : '';
    console.log(`${r.overflow || r.errors.length ? 'X' : 'OK'}  ${r.label.padEnd(20)} ${flags.join(' | ') || 'clean'}${tap}`);
    for (const e of r.errors) console.log(`      - ${e}`);
  }
  console.log(`\nShots -> ${OUT}`);
  console.log(bad ? `FAIL: ${bad} issue(s).` : `PASS: no overflow, no console errors.`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('mobile-shots failed:', e); process.exit(2); });
