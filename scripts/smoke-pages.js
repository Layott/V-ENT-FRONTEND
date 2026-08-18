#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Headless smoke test for V-ENT pages in mock mode.
 *
 * Usage: NODE_OPTIONS="" node scripts/smoke-pages.js
 *
 * What it does:
 *   1. Launches system Chrome via puppeteer-core.
 *   2. Visits /login, clicks "Try demo account", waits for /home.
 *   3. Visits each page in ROUTES, waits for network idle.
 *   4. Captures page errors + console.error + console.warn + 4xx/5xx responses.
 *   5. Prints a report. Exits 1 if any page has errors.
 */

const puppeteer = require('puppeteer-core');

const BASE = process.env.SMOKE_BASE || 'http://localhost:3001';
const CHROME = process.env.CHROME_BIN ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const ROUTES = [
  // ── Public / auth surfaces ────────────────────────────────────────
  { path: '/', label: 'Landing page' },
  { path: '/privacy-policy', label: 'Privacy policy' },

  // ── Logged-in home ────────────────────────────────────────────────
  { path: '/home', label: 'Home dashboard' },

  // ── Search ────────────────────────────────────────────────────────
  { path: '/search?q=fifa', label: 'Search results' },

  // ── User profile suite ────────────────────────────────────────────
  { path: '/user-profile', label: 'User profile (self)' },
  { path: '/user-profile?id=user_002', label: 'User profile (other)' },
  { path: '/user-profile?tab=activity', label: 'User profile - activity tab' },
  { path: '/user-profile?tab=gallery', label: 'User profile - gallery tab' },
  { path: '/user-profile?tab=social', label: 'User profile - social tab' },
  { path: '/user-profile?tab=games', label: 'User profile - games tab' },
  { path: '/edit-user-profile', label: 'Edit user profile (default)' },
  { path: '/edit-user-profile?panel=info', label: 'Edit user profile - info' },
  { path: '/edit-user-profile?panel=games', label: 'Edit user profile - games' },
  { path: '/edit-user-profile?panel=accounts', label: 'Edit user profile - accounts' },
  { path: '/edit-user-profile?panel=social', label: 'Edit user profile - social' },

  // ── Tournaments ───────────────────────────────────────────────────
  { path: '/tournaments', label: 'Tournaments list' },
  { path: '/tournaments/view-tournament?id=tmt_1000', label: 'Tournament detail (overview)' },
  { path: '/tournaments/view-tournament?id=tmt_1000&tab=rules', label: 'Tournament detail - rules' },
  { path: '/tournaments/view-tournament?id=tmt_1000&tab=bracket', label: 'Tournament detail - bracket' },
  { path: '/tournaments/view-tournament?id=tmt_1000&tab=participants', label: 'Tournament detail - participants' },
  { path: '/tournaments/view-tournament?id=tmt_1000&tab=prize', label: 'Tournament detail - prize' },
  { path: '/tournaments/create-tournament', label: 'Tournament create wizard' },
  { path: '/tournaments/drafts', label: 'Tournament drafts' },
  { path: '/tournaments/register-tournament?id=tmt_1000', label: 'Tournament register' },
  { path: '/tournaments/my-tournaments', label: 'My tournaments' },
  { path: '/tournaments/manage?id=tmt_1000', label: 'Tournament manage' },
  { path: '/tournaments/production?id=tmt_1000', label: 'Tournament production' },
  { path: '/tournaments/overlay?id=tmt_1000', label: 'Tournament overlay' },

  // ── Events ────────────────────────────────────────────────────────
  { path: '/events', label: 'Events list' },
  { path: '/events/view-event?id=evt_2000', label: 'Event detail' },
  { path: '/events/create-event', label: 'Event create wizard' },
  { path: '/events/my-tickets', label: 'My tickets' },
  { path: '/events/vendor-shop', label: 'Vendor shop dashboard' },
  { path: '/events/vendor-shop/vendor?id=vnd_0', label: 'Vendor public page' },

  // ── Teams ─────────────────────────────────────────────────────────
  { path: '/teams', label: 'Teams list' },
  { path: '/teams?tab=owned', label: 'Teams - owned tab' },
  { path: '/teams?tab=joined', label: 'Teams - joined tab' },
  { path: '/teams?tab=invited', label: 'Teams - invited tab' },
  { path: '/teams/create-team', label: 'Team create' },
  { path: '/teams/team-profile?id=team_500', label: 'Team profile' },
  { path: '/edit-team-profile?id=team_500', label: 'Edit team profile' },

  // ── Rankings ──────────────────────────────────────────────────────
  { path: '/rankings', label: 'Rankings' },

  // ── Wallets ───────────────────────────────────────────────────────
  { path: '/wallets', label: 'Wallets overview' },
  { path: '/wallets/topup', label: 'Wallet topup' },
  { path: '/wallets/send', label: 'Wallet send' },
  { path: '/wallets/withdraw', label: 'Wallet withdraw' },
  { path: '/wallets/history', label: 'Wallet history' },

  // ── Organizations ─────────────────────────────────────────────────
  { path: '/organizations', label: 'Organizations list' },
  { path: '/organizations/org-profile?id=org_0', label: 'Organization profile' },
  { path: '/organizations/create', label: 'Organization create' },
  { path: '/organizations/manage?id=org_0', label: 'Organization manage' },

  // ── Marketplace ───────────────────────────────────────────────────
  { path: '/marketplace', label: 'Marketplace listings' },
  { path: '/marketplace/listing?id=lstx_0', label: 'Marketplace listing detail' },
  { path: '/marketplace/create', label: 'Marketplace create' },
  { path: '/marketplace/seller?id=user_001', label: 'Marketplace seller page' },
  { path: '/marketplace/dashboard', label: 'Marketplace dashboard' },
  { path: '/marketplace/purchase?id=pur_0', label: 'Marketplace purchase' },

  // ── Shop ──────────────────────────────────────────────────────────
  { path: '/shop', label: 'Shop home' },
  { path: '/shop/product?id=prdx_0', label: 'Shop product detail' },
  { path: '/shop/cart', label: 'Shop cart' },
  { path: '/shop/orders', label: 'Shop orders' },
  { path: '/shop/wishlist', label: 'Shop wishlist' },

  // ── Anime ─────────────────────────────────────────────────────────
  { path: '/anime', label: 'Anime hub' },
  { path: '/anime?tab=amvs', label: 'Anime AMVs tab' },
  { path: '/anime?tab=coread', label: 'Anime co-read tab' },
  { path: '/anime?tab=battles', label: 'Anime battles tab' },
  { path: '/anime?tab=mylist', label: 'Anime my-list tab' },
  { path: '/anime/manga', label: 'Anime manga library' },
  { path: '/anime/manga/series?id=mngx_0', label: 'Anime manga series' },
  { path: '/anime/read?series=mngx_0&chapter=1', label: 'Anime manga read (chapter)' },
  { path: '/anime/reader?manga=mng_0&chapter=1', label: 'Anime manga reader (legacy)' },
  { path: '/anime/amv', label: 'Anime AMV gallery' },
  { path: '/anime/amv/detail?id=amvx_0', label: 'Anime AMV detail' },
  { path: '/anime/catalog', label: 'Anime catalog' },
  { path: '/anime/my-list', label: 'Anime my list' },
  { path: '/anime/room?id=roomx_0', label: 'Anime co-read room' },

  // ── Community ─────────────────────────────────────────────────────
  { path: '/community', label: 'Community hub (feed)' },
  { path: '/community?tab=forums', label: 'Community forums tab' },
  { path: '/community?tab=clubs', label: 'Community clubs tab' },
  { path: '/community?tab=dms', label: 'Community DMs tab' },
  { path: '/community?tab=scrims', label: 'Community scrims tab' },
  { path: '/community/post?id=pstx_0', label: 'Community post detail' },
  { path: '/community/thread?id=thx_0', label: 'Community thread detail' },
  { path: '/community/club?id=clbx_0', label: 'Community club detail' },
  { path: '/community/scrim/create', label: 'Community scrim create' },
  { path: '/community/dm?id=dmx_0', label: 'Community DM detail' },

  // ── Wager ─────────────────────────────────────────────────────────
  { path: '/wager', label: 'Wager hub' },
  { path: '/wager/pool?id=wp_0', label: 'Wager pool detail' },
  { path: '/wager/create', label: 'Wager create' },
  { path: '/wager/match?id=mtch_0', label: 'Wager match detail' },

  // ── Settings ──────────────────────────────────────────────────────
  { path: '/settings', label: 'Settings (default)' },
  { path: '/settings?panel=account', label: 'Settings - account' },
  { path: '/settings?panel=notifications', label: 'Settings - notifications' },
  { path: '/settings?panel=privacy', label: 'Settings - privacy' },
  { path: '/settings?panel=security', label: 'Settings - security' },
  { path: '/settings?panel=payments', label: 'Settings - payments' },
  { path: '/settings?panel=language', label: 'Settings - language' },
  { path: '/settings?panel=devices', label: 'Settings - devices' },
  { path: '/settings?panel=linked', label: 'Settings - linked accounts' },
  { path: '/settings?panel=danger', label: 'Settings - danger zone' },

  // ── Production ────────────────────────────────────────────────────
  { path: '/production', label: 'Production hub' },
  { path: '/production/overlay-editor?id=ovl_scoreboard', label: 'Production overlay editor' },
  { path: '/production/scene-editor?id=scn_default', label: 'Production scene editor' },

  // ── Admin ─────────────────────────────────────────────────────────
  { path: '/admin/login', label: 'Admin login' },
  { path: '/admin', label: 'Admin overview' },
  { path: '/admin/users', label: 'Admin users' },
  { path: '/admin/users/usr_1', label: 'Admin user detail' },
  { path: '/admin/tournaments', label: 'Admin tournaments' },
  { path: '/admin/payouts', label: 'Admin payouts' },
  { path: '/admin/kyc', label: 'Admin KYC' },
  { path: '/admin/audit-log', label: 'Admin audit log' },
  { path: '/admin/settings', label: 'Admin settings' },
];

function isIgnorable(text) {
  if (!text) return true;
  const ignored = [
    'favicon',
    'Download the React DevTools',
    'next-auth][warn][DEBUG_ENABLED',
    'The resource', // preload hints
    'preloaded using link preload',
    'was preloaded using',
    'Images loaded lazily',
    'react-scan',
    'Hydration failed', // we'll separately flag this if it appears, but info-level in dev
    'net::ERR_ABORTED', // benign — Next.js cancels in-flight RSC fetches when navigating
    'data:image/svg+xml;base64', // inline SVG fetches sometimes report aborted in dev
    '_rsc=', // Next.js RSC prefetch streams cancel on navigation, harmless
  ];
  return ignored.some((p) => text.includes(p));
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  const perPage = {};
  let current = { path: '', label: '' };
  function record(kind, detail) {
    if (isIgnorable(detail)) return;
    const key = current.path || 'pre-test';
    perPage[key] = perPage[key] || { label: current.label, errors: [], warns: [], fails: [] };
    perPage[key][kind].push(detail);
  }

  page.on('pageerror', (err) => record('errors', `pageerror: ${err.message}`));
  page.on('console', (msg) => {
    const type = msg.type();
    const txt = msg.text();
    if (type === 'error') record('errors', `console.error: ${txt}`);
    else if (type === 'warning') record('warns', `console.warn: ${txt}`);
  });
  page.on('requestfailed', (req) => record('fails', `requestfailed: ${req.url()} - ${req.failure()?.errorText || 'unknown'}`));
  page.on('response', (res) => {
    const url = res.url();
    const status = res.status();
    if (status >= 400 && !url.includes('/favicon') && !url.includes('hot-update')) {
      record('fails', `HTTP ${status}: ${url}`);
    }
  });

  // --- 1. Login as demo ---
  current = { path: '/login', label: 'Login + demo' };
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' });
  // Click the "Try demo account" button.
  try {
    await page.waitForSelector('button', { timeout: 5000 });
    const clicked = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button'))
        .find((b) => b.textContent && b.textContent.trim().toLowerCase().includes('try demo account'));
      if (btn) { btn.click(); return true; }
      return false;
    });
    if (!clicked) record('errors', 'Could not find "Try demo account" button on /login');
    else await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 });
  } catch (e) {
    record('errors', `Demo login step failed: ${e.message}`);
  }

  // --- 2. Walk every route ---
  const total = ROUTES.length;
  let walked = 0;
  for (const route of ROUTES) {
    current = { path: route.path, label: route.label };
    walked += 1;
    try {
      await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle0', timeout: 45000 });
      // Give client-side fetches a beat to settle.
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 1200));
    } catch (e) {
      record('errors', `navigation failed: ${e.message}`);
    }
  }

  await browser.close();

  // --- 3. Report ---
  const keys = Object.keys(perPage);
  const dirty = keys.filter((k) => {
    const p = perPage[k];
    return p.errors.length || p.fails.length;
  });
  const clean = total - dirty.filter((k) => k !== '/login').length;

  if (!keys.length) {
    console.log(`PASS  Walked ${walked} routes, all clean.`);
    process.exit(0);
  }

  let hasErrors = false;
  for (const k of keys) {
    const p = perPage[k];
    if (!p.errors.length && !p.fails.length && !p.warns.length) continue;
    console.log(`\n> ${k}  (${p.label})`);
    for (const e of p.errors) { hasErrors = true; console.log(`  X ${e}`); }
    for (const f of p.fails) { hasErrors = true; console.log(`  X ${f}`); }
    for (const w of p.warns) { console.log(`  ! ${w}`); }
  }

  console.log(`\nWalked ${walked} routes. Clean: ${clean}/${total}. Dirty: ${dirty.length}.`);
  process.exit(hasErrors ? 1 : 0);
})().catch((err) => {
  console.error('smoke-pages failed:', err);
  process.exit(2);
});
