#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * REAL-MODE mobile screenshot + responsive audit for the V-ENT ADMIN dashboard.
 *
 * The admin surface authenticates with `localStorage.adminToken` (+ adminUser +
 * an adminToken cookie), NOT the NextAuth session that scripts/mobile-shots.js
 * uses — so this companion script mints an admin session via the API, injects it
 * into the page origin, then walks every admin route at a TRUE 390x844 mobile
 * viewport (CDP device metrics via puppeteer-core) so media queries fire and
 * scrollWidth reflects the phone width (catches real horizontal overflow).
 *
 * Prereqs: both dev servers up on 127.0.0.1 (FE :3000 real mode, BE :8000),
 * a seeded super_admin (default orga@vent.test / Passw0rd!).
 *
 * Usage:
 *   node scripts/mobile-shots-admin.js
 *   ADMIN_EMAIL=orga@vent.test ADMIN_PASS='Passw0rd!' node scripts/mobile-shots-admin.js
 *
 * Output: scripts/mobile-shots/admin-<name>.png + a console table of overflow/errors.
 * Exits 1 if any page has horizontal overflow or a console error.
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const BASE = process.env.MOBILE_BASE || 'http://127.0.0.1:3000';
const API = process.env.API_BASE || 'http://127.0.0.1:8000';
const CHROME = process.env.CHROME_BIN ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EMAIL = process.env.ADMIN_EMAIL || 'orga@vent.test';
const PASS = process.env.ADMIN_PASS || 'Passw0rd!';
const OUT = path.join(__dirname, 'mobile-shots');

const VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
const UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 ' +
  '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

// Admin surfaces. `/admin/login` is shot BEFORE the token is injected.
const ROUTES = [
  { path: '/admin/login', label: 'admin-login', auth: false },
  { path: '/admin', label: 'admin-dashboard' },
  { path: '/admin/users', label: 'admin-users' },
  { path: '/admin/users/1', label: 'admin-user-detail' },
  { path: '/admin/tournaments', label: 'admin-tournaments' },
  { path: '/admin/disputes', label: 'admin-disputes' },
  { path: '/admin/payouts', label: 'admin-payouts' },
  { path: '/admin/kyc', label: 'admin-kyc' },
  { path: '/admin/audit-log', label: 'admin-audit-log' },
  { path: '/admin/settings', label: 'admin-settings' },
];

const IGNORE = [
  'Download the React DevTools', 'next-auth][warn][DEBUG_ENABLED', 'favicon',
  'preloaded using', 'was preloaded', '_rsc=', 'net::ERR_ABORTED', 'hot-update',
  'Largest Contentful Paint', 'Skipping auto-scroll', 'Fast Refresh',
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
    await new Promise((r) => setTimeout(r, 2000));
  }
  await new Promise((r) => setTimeout(r, 1400));

  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    smallTaps: Array.from(document.querySelectorAll('button, a[href]'))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44);
      }).length,
    url: location.pathname,
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

  // 1) Mint an admin session via the API (same shape the login page stores).
  const loginRes = await fetch(`${API}/auth/admin/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  });
  const loginJson = await loginRes.json();
  if (loginJson.status !== 'success' || !loginJson.data?.session_token) {
    console.error('admin login failed:', JSON.stringify(loginJson));
    process.exit(2);
  }
  const token = loginJson.data.session_token;
  const adminUser = loginJson.data.admin;
  console.log(`admin login OK: ${adminUser.username} (${adminUser.admin_role})`);

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

  // 2) Shoot the login page first (unauthenticated).
  for (const r of ROUTES.filter((x) => x.auth === false)) {
    results.push(await shoot(page, r));
  }

  // 3) Establish the origin, then inject the admin session into localStorage + cookie.
  await page.goto(`${BASE}/admin/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((tok, user) => {
    localStorage.setItem('adminToken', tok);
    localStorage.setItem('adminUser', JSON.stringify(user));
    document.cookie = `adminToken=${tok}; path=/; max-age=86400`;
  }, token, adminUser);

  // 4) Shoot the authed admin routes.
  for (const r of ROUTES.filter((x) => x.auth !== false)) {
    results.push(await shoot(page, r));
  }

  await browser.close();

  console.log('\n=== ADMIN MOBILE 390x844 AUDIT ===');
  let bad = 0;
  for (const r of results) {
    const flags = [];
    if (r.overflow) { flags.push(`OVERFLOW sw=${r.scrollWidth}>vw=${r.innerWidth}`); bad++; }
    if (r.errors.length) { flags.push(`${r.errors.length} console-err`); bad++; }
    const tap = r.smallTaps ? ` taps<44:${r.smallTaps}` : '';
    const landed = r.url && r.url !== r.path ? ` (->${r.url})` : '';
    console.log(`${r.overflow || r.errors.length ? 'X' : 'OK'}  ${r.label.padEnd(22)} ${flags.join(' | ') || 'clean'}${tap}${landed}`);
    for (const e of r.errors) console.log(`      - ${e}`);
  }
  console.log(`\nShots -> ${OUT}`);
  console.log(bad ? `FAIL: ${bad} issue(s).` : `PASS: no overflow, no console errors.`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('admin mobile-shots failed:', e); process.exit(2); });
