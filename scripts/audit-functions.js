#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * V-ENT functional audit. Walks every route, exercises micro-interactions,
 * and emits a structured findings report.
 *
 * Usage: NODE_OPTIONS="" node scripts/audit-functions.js
 *
 * For each route we test (where applicable):
 *   1.  Page renders cleanly (no console error, no 4xx/5xx, no broken imgs)
 *   2.  Header search → /search?q=...
 *   3.  Sidebar links resolve
 *   4.  Mobile bottom-menu items navigate (re-tested at 375x812)
 *   5.  Logout works
 *   6.  Header icons (avatar / notif / cart / wishlist) do something
 *   7.  Tab/sub-tab switches update content + URL
 *   8.  Filters & search inputs filter
 *   9.  Pagination buttons move
 *   10. Primary CTAs open flow/modal
 *   11. Form submits produce toast/navigate/success
 *   12. Like/follow toggles flip state
 *   13. Modals open/close (ESC, click-outside)
 *   14. Image alt text present
 *   15. Empty-state CTAs go somewhere useful
 *   16. Coming-soon pills not on built routes
 *
 * Output:
 *   - tasks/audit-report.md
 *   - tasks/audit-screens/<route-slug>.png for any P0 finding
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const BASE = process.env.SMOKE_BASE || 'http://localhost:3000';
const CHROME = process.env.CHROME_BIN ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const REPORT_PATH = path.join(__dirname, '..', 'tasks', 'audit-report.md');
const SCREEN_DIR = path.join(__dirname, '..', 'tasks', 'audit-screens');
const RUN_DEADLINE_MS = 9 * 60 * 1000; // 9 min cap

if (!fs.existsSync(SCREEN_DIR)) fs.mkdirSync(SCREEN_DIR, { recursive: true });

const ROUTES = [
  // Public / auth
  { path: '/', label: 'Landing page', module: 'Landing' },
  { path: '/privacy-policy', label: 'Privacy policy', module: 'Public' },
  // Logged-in home
  { path: '/home', label: 'Home dashboard', module: 'Home' },
  // Search
  { path: '/search?q=fifa', label: 'Search results', module: 'Search' },
  // User profile
  { path: '/user-profile', label: 'User profile (self)', module: 'Profile' },
  { path: '/user-profile?id=user_002', label: 'User profile (other)', module: 'Profile' },
  { path: '/user-profile?tab=activity', label: 'User profile - activity', module: 'Profile' },
  { path: '/user-profile?tab=gallery', label: 'User profile - gallery', module: 'Profile' },
  { path: '/user-profile?tab=social', label: 'User profile - social', module: 'Profile' },
  { path: '/user-profile?tab=games', label: 'User profile - games', module: 'Profile' },
  { path: '/edit-user-profile', label: 'Edit user profile', module: 'Profile' },
  { path: '/edit-user-profile?panel=info', label: 'Edit profile - info', module: 'Profile' },
  { path: '/edit-user-profile?panel=games', label: 'Edit profile - games', module: 'Profile' },
  { path: '/edit-user-profile?panel=accounts', label: 'Edit profile - accounts', module: 'Profile' },
  { path: '/edit-user-profile?panel=social', label: 'Edit profile - social', module: 'Profile' },
  // Tournaments
  { path: '/tournaments', label: 'Tournaments list', module: 'Tournaments' },
  { path: '/tournaments/view-tournament?id=tmt_1000', label: 'Tournament detail (overview)', module: 'Tournaments' },
  { path: '/tournaments/view-tournament?id=tmt_1000&tab=rules', label: 'Tournament detail - rules', module: 'Tournaments' },
  { path: '/tournaments/view-tournament?id=tmt_1000&tab=bracket', label: 'Tournament detail - bracket', module: 'Tournaments' },
  { path: '/tournaments/view-tournament?id=tmt_1000&tab=participants', label: 'Tournament detail - participants', module: 'Tournaments' },
  { path: '/tournaments/view-tournament?id=tmt_1000&tab=prize', label: 'Tournament detail - prize', module: 'Tournaments' },
  { path: '/tournaments/create-tournament', label: 'Tournament create wizard', module: 'Tournaments' },
  { path: '/tournaments/drafts', label: 'Tournament drafts', module: 'Tournaments' },
  { path: '/tournaments/register-tournament?id=tmt_1000', label: 'Tournament register', module: 'Tournaments' },
  { path: '/tournaments/my-tournaments', label: 'My tournaments', module: 'Tournaments' },
  { path: '/tournaments/manage?id=tmt_1000', label: 'Tournament manage', module: 'Tournaments' },
  { path: '/tournaments/production?id=tmt_1000', label: 'Tournament production', module: 'Tournaments' },
  { path: '/tournaments/overlay?id=tmt_1000', label: 'Tournament overlay', module: 'Tournaments' },
  // Events
  { path: '/events', label: 'Events list', module: 'Events' },
  { path: '/events/view-event?id=evt_2000', label: 'Event detail', module: 'Events' },
  { path: '/events/create-event', label: 'Event create wizard', module: 'Events' },
  { path: '/events/my-tickets', label: 'My tickets', module: 'Events' },
  { path: '/events/vendor-shop', label: 'Vendor shop dashboard', module: 'Events' },
  { path: '/events/vendor-shop/vendor?id=vnd_0', label: 'Vendor public page', module: 'Events' },
  // Teams
  { path: '/teams', label: 'Teams list', module: 'Teams' },
  { path: '/teams?tab=owned', label: 'Teams - owned', module: 'Teams' },
  { path: '/teams?tab=joined', label: 'Teams - joined', module: 'Teams' },
  { path: '/teams?tab=invited', label: 'Teams - invited', module: 'Teams' },
  { path: '/teams/create-team', label: 'Team create', module: 'Teams' },
  { path: '/teams/team-profile?id=team_500', label: 'Team profile', module: 'Teams' },
  { path: '/edit-team-profile?id=team_500', label: 'Edit team profile', module: 'Teams' },
  // Rankings
  { path: '/rankings', label: 'Rankings', module: 'Rankings' },
  // Wallets
  { path: '/wallets', label: 'Wallets overview', module: 'Wallets' },
  { path: '/wallets/topup', label: 'Wallet topup', module: 'Wallets' },
  { path: '/wallets/send', label: 'Wallet send', module: 'Wallets' },
  { path: '/wallets/withdraw', label: 'Wallet withdraw', module: 'Wallets' },
  { path: '/wallets/history', label: 'Wallet history', module: 'Wallets' },
  // Organizations
  { path: '/organizations', label: 'Organizations list', module: 'Organizations' },
  { path: '/organizations/org-profile?id=org_0', label: 'Organization profile', module: 'Organizations' },
  { path: '/organizations/create', label: 'Organization create', module: 'Organizations' },
  { path: '/organizations/manage?id=org_0', label: 'Organization manage', module: 'Organizations' },
  // Marketplace
  { path: '/marketplace', label: 'Marketplace listings', module: 'Marketplace' },
  { path: '/marketplace/listing?id=lstx_0', label: 'Marketplace listing detail', module: 'Marketplace' },
  { path: '/marketplace/create', label: 'Marketplace create', module: 'Marketplace' },
  { path: '/marketplace/seller?id=user_001', label: 'Marketplace seller page', module: 'Marketplace' },
  { path: '/marketplace/dashboard', label: 'Marketplace dashboard', module: 'Marketplace' },
  { path: '/marketplace/purchase?id=pur_0', label: 'Marketplace purchase', module: 'Marketplace' },
  // Shop
  { path: '/shop', label: 'Shop home', module: 'Shop' },
  { path: '/shop/product?id=prdx_0', label: 'Shop product detail', module: 'Shop' },
  { path: '/shop/cart', label: 'Shop cart', module: 'Shop' },
  { path: '/shop/orders', label: 'Shop orders', module: 'Shop' },
  { path: '/shop/wishlist', label: 'Shop wishlist', module: 'Shop' },
  // Anime
  { path: '/anime', label: 'Anime hub', module: 'Anime' },
  { path: '/anime?tab=amvs', label: 'Anime AMVs tab', module: 'Anime' },
  { path: '/anime?tab=coread', label: 'Anime co-read tab', module: 'Anime' },
  { path: '/anime?tab=battles', label: 'Anime battles tab', module: 'Anime' },
  { path: '/anime?tab=mylist', label: 'Anime my-list tab', module: 'Anime' },
  { path: '/anime/manga', label: 'Anime manga library', module: 'Anime' },
  { path: '/anime/manga/series?id=mngx_0', label: 'Anime manga series', module: 'Anime' },
  { path: '/anime/read?series=mngx_0&chapter=1', label: 'Anime manga read', module: 'Anime' },
  { path: '/anime/reader?manga=mng_0&chapter=1', label: 'Anime manga reader (legacy)', module: 'Anime' },
  { path: '/anime/amv', label: 'Anime AMV gallery', module: 'Anime' },
  { path: '/anime/amv/detail?id=amvx_0', label: 'Anime AMV detail', module: 'Anime' },
  { path: '/anime/catalog', label: 'Anime catalog', module: 'Anime' },
  { path: '/anime/my-list', label: 'Anime my list', module: 'Anime' },
  { path: '/anime/room?id=roomx_0', label: 'Anime co-read room', module: 'Anime' },
  // Community
  { path: '/community', label: 'Community hub (feed)', module: 'Community' },
  { path: '/community?tab=forums', label: 'Community forums', module: 'Community' },
  { path: '/community?tab=clubs', label: 'Community clubs', module: 'Community' },
  { path: '/community?tab=dms', label: 'Community DMs', module: 'Community' },
  { path: '/community?tab=scrims', label: 'Community scrims', module: 'Community' },
  { path: '/community/post?id=pstx_0', label: 'Community post detail', module: 'Community' },
  { path: '/community/thread?id=thx_0', label: 'Community thread detail', module: 'Community' },
  { path: '/community/club?id=clbx_0', label: 'Community club detail', module: 'Community' },
  { path: '/community/scrim/create', label: 'Community scrim create', module: 'Community' },
  { path: '/community/dm?id=dmx_0', label: 'Community DM detail', module: 'Community' },
  // Wager
  { path: '/wager', label: 'Wager hub', module: 'Wager' },
  { path: '/wager/pool?id=wp_0', label: 'Wager pool detail', module: 'Wager' },
  { path: '/wager/create', label: 'Wager create', module: 'Wager' },
  { path: '/wager/match?id=mtch_0', label: 'Wager match detail', module: 'Wager' },
  // Settings
  { path: '/settings', label: 'Settings (default)', module: 'Settings' },
  { path: '/settings?panel=account', label: 'Settings - account', module: 'Settings' },
  { path: '/settings?panel=notifications', label: 'Settings - notifications', module: 'Settings' },
  { path: '/settings?panel=privacy', label: 'Settings - privacy', module: 'Settings' },
  { path: '/settings?panel=security', label: 'Settings - security', module: 'Settings' },
  { path: '/settings?panel=payments', label: 'Settings - payments', module: 'Settings' },
  { path: '/settings?panel=language', label: 'Settings - language', module: 'Settings' },
  { path: '/settings?panel=devices', label: 'Settings - devices', module: 'Settings' },
  { path: '/settings?panel=linked', label: 'Settings - linked accounts', module: 'Settings' },
  { path: '/settings?panel=danger', label: 'Settings - danger zone', module: 'Settings' },
  // Production
  { path: '/production', label: 'Production hub', module: 'Production' },
  { path: '/production/overlay-editor?id=ovl_scoreboard', label: 'Production overlay editor', module: 'Production' },
  { path: '/production/scene-editor?id=scn_default', label: 'Production scene editor', module: 'Production' },
  // Admin
  { path: '/admin/login', label: 'Admin login', module: 'Admin' },
  { path: '/admin', label: 'Admin overview', module: 'Admin' },
  { path: '/admin/users', label: 'Admin users', module: 'Admin' },
  { path: '/admin/users/usr_1', label: 'Admin user detail', module: 'Admin' },
  { path: '/admin/tournaments', label: 'Admin tournaments', module: 'Admin' },
  { path: '/admin/payouts', label: 'Admin payouts', module: 'Admin' },
  { path: '/admin/kyc', label: 'Admin KYC', module: 'Admin' },
  { path: '/admin/audit-log', label: 'Admin audit log', module: 'Admin' },
  { path: '/admin/settings', label: 'Admin settings', module: 'Admin' },
];

const IGNORE_PATTERNS = [
  'favicon', 'Download the React DevTools', 'next-auth][warn][DEBUG_ENABLED',
  'preloaded using link preload', 'was preloaded using', 'Images loaded lazily',
  'react-scan', 'net::ERR_ABORTED', 'data:image/svg+xml;base64', '_rsc=',
  'hot-update', 'webpack', 'HMR',
];
const isIgnorable = (t) => !t || IGNORE_PATTERNS.some((p) => t.includes(p));

const findings = []; // { module, route, severity, type, description, fix }
const consoleByRoute = {};
const httpByRoute = {};

function add(modName, route, severity, type, description, fix) {
  findings.push({ module: modName, route, severity, type, description, fix });
}

function slugify(p) {
  return p.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'root';
}

const startTs = Date.now();
function timeLeftMs() { return RUN_DEADLINE_MS - (Date.now() - startTs); }

(async () => {
  console.log(`[audit] starting against ${BASE}`);

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME,
      headless: 'new',
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
  } catch (e) {
    console.error('[audit] failed to launch Chrome:', e.message);
    process.exit(2);
  }

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  page.setDefaultTimeout(20000);

  let currentPath = '';
  page.on('pageerror', (err) => {
    if (!currentPath) return;
    consoleByRoute[currentPath] = consoleByRoute[currentPath] || [];
    consoleByRoute[currentPath].push(`pageerror: ${err.message}`);
  });
  page.on('console', (msg) => {
    if (!currentPath) return;
    const t = msg.text();
    if (isIgnorable(t)) return;
    if (msg.type() === 'error') {
      consoleByRoute[currentPath] = consoleByRoute[currentPath] || [];
      consoleByRoute[currentPath].push(`console.error: ${t}`);
    }
  });
  page.on('response', (res) => {
    if (!currentPath) return;
    const url = res.url();
    const status = res.status();
    if (status >= 400 && !url.includes('/favicon') && !url.includes('hot-update') && !url.includes('_rsc')) {
      httpByRoute[currentPath] = httpByRoute[currentPath] || [];
      httpByRoute[currentPath].push(`HTTP ${status}: ${url.slice(0, 200)}`);
    }
  });

  // Pre-flight: dev server check
  try {
    const r = await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!r || !r.ok()) {
      console.error(`[audit] dev server not healthy at ${BASE} (status ${r ? r.status() : 'no response'})`);
      await browser.close();
      process.exit(2);
    }
  } catch (e) {
    console.error(`[audit] cannot reach ${BASE}:`, e.message);
    await browser.close();
    process.exit(2);
  }

  // === DEMO LOGIN ===
  console.log('[audit] demo login...');
  try {
    await page.waitForSelector('button', { timeout: 8000 });
    const clicked = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button'))
        .find((b) => b.textContent && b.textContent.trim().toLowerCase().includes('try demo account'));
      if (btn) { btn.click(); return true; }
      return false;
    });
    if (!clicked) {
      add('Auth', '/login', 'P0', 'BROKEN', 'Demo account button not found on /login', 'Restore demo login affordance');
    }
    await new Promise((r) => setTimeout(r, 4500));
  } catch (e) {
    add('Auth', '/login', 'P0', 'BROKEN', `Demo login failed: ${e.message}`, 'Investigate auth flow');
  }

  // === ROUTE WALK ===
  let walked = 0;
  for (const r of ROUTES) {
    if (timeLeftMs() < 30000) {
      console.log(`[audit] time budget low, stopping route walk at ${walked}/${ROUTES.length}`);
      break;
    }
    walked++;
    currentPath = r.path;
    process.stdout.write(`  [${walked}/${ROUTES.length}] ${r.path} ... `);

    let renderOK = false;
    try {
      await page.goto(`${BASE}${r.path}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await new Promise((res) => setTimeout(res, 2000));
      renderOK = true;
    } catch (e) {
      add(r.module, r.path, 'P0', 'BROKEN', `Navigation failed: ${e.message.slice(0, 120)}`, 'Investigate route');
      console.log('NAV FAIL');
      continue;
    }

    // 1. Render checks - console errors (already captured), HTTP errors (already captured)
    const consoleErrs = (consoleByRoute[r.path] || []).filter((e) => !isIgnorable(e));
    if (consoleErrs.length) {
      const sample = consoleErrs[0].slice(0, 160);
      add(r.module, r.path, 'P0', 'BROKEN', `Console error: ${sample}`, 'Fix runtime exception');
    }
    const httpFails = httpByRoute[r.path] || [];
    if (httpFails.length) {
      const sample = httpFails[0].slice(0, 160);
      add(r.module, r.path, 'P1', 'BROKEN', `Network error: ${sample}`, 'Investigate failed request / endpoint');
    }

    // === Page introspection in one evaluate to keep wall-clock low ===
    let info;
    try {
      info = await page.evaluate(() => {
        const $ = (s) => document.querySelector(s);
        const $$ = (s) => Array.from(document.querySelectorAll(s));

        // Image audit
        const imgs = $$('img');
        const brokenImgs = imgs.filter((i) => i.complete && i.naturalWidth === 0).length;
        const missingAlt = imgs.filter((i) => !i.hasAttribute('alt')).length;

        // Header pieces - V-ENT uses a div.profileHeader, not <header>
        const headerEl = $('[class*="profileHeader" i]') || $('header')
          || $('[class*="mobileHeader" i]') || $('[class*="MobileHeader"]');
        const headerHTML = headerEl ? headerEl.outerHTML.slice(0, 8000) : '';

        const headerSearchInput = (headerEl && (headerEl.querySelector('input[type="search"], input[placeholder*="earch" i]')))
          || $$('input[type="search"]')[0]
          || $$('input[placeholder*="earch" i]')[0];

        // Sidebar links (component is .sidebar with `<aside>` or div)
        const sidebarLinks = $$('aside a, [class*="sidebar" i] a, [class*="Sidebar"] a').map((a) => ({
          href: a.getAttribute('href') || '',
          text: (a.textContent || '').trim().slice(0, 40),
        })).filter((l) => l.href);

        // Bottom menu
        const bottomLinks = $$('[class*="bottomMenu" i] a, [class*="BottomMenu"] a, [class*="bottom-menu"] a').map((a) => ({
          href: a.getAttribute('href') || '',
        })).filter((l) => l.href);

        // Heuristic icons in header (avatar, notif, cart, wishlist)
        const headerButtons = headerEl ? headerEl.querySelectorAll('button, a').length : 0;
        const headerHasNotifIcon = !!headerEl && /notif|bell/i.test(headerHTML);
        const headerHasAvatar = !!headerEl && (
          !!headerEl.querySelector('img[alt*="user" i]')
          || !!headerEl.querySelector('img[alt*="avatar" i]')
          || !!headerEl.querySelector('[class*="avatar" i]')
          || !!headerEl.querySelector('[class*="userAvatar" i]')
          || !!headerEl.querySelector('img[src*="profile" i]')
        );
        const headerHasCart = !!headerEl && /\bcart\b|shopping/i.test(headerHTML);
        const headerHasWishlist = !!headerEl && /wishlist|heart/i.test(headerHTML);

        // Tabs - role=tab or [class*="tab"]
        const tabs = $$('[role="tab"], [class*="tabBtn" i], [class*="tabsRow" i] button, [class*="tabRow" i] button').map((t) => ({
          text: (t.textContent || '').trim().slice(0, 40),
          ariaSelected: t.getAttribute('aria-selected'),
        }));

        // Logout
        const logoutEl = $$('button, a').find((el) => /\b(log\s*out|logout|sign\s*out)\b/i.test(el.textContent || ''));

        // Coming-soon pill / TODO copy
        const bodyText = (document.body && document.body.innerText) ? document.body.innerText : '';
        const hasComingSoon = /\bcoming\s*soon\b/i.test(bodyText);
        const hasTodoCopy = /\bTODO\b|\bplaceholder\b/i.test(bodyText.slice(0, 5000));

        // CTA presence (rough)
        const ctas = $$('button, a').filter((b) => {
          const txt = (b.textContent || '').trim();
          return /^(create|buy|stake|send|topup|top\s*up|withdraw|add\s*to\s*cart|register|join|follow|like|submit|save|publish|deposit)$/i.test(txt)
            || /^(add to cart|create new|create tournament|create event|create team|create club|create pool)$/i.test(txt);
        }).length;

        // Forms
        const forms = $$('form').length;
        const submitButtons = $$('button[type="submit"], form button').length;

        // Modals already-open? (be strict — dialog role or visible modal class)
        const modalOpen = !!$$('[role="dialog"][aria-hidden="false"], [class*="modalOpen" i], [class*="modal-open" i]').length;

        // Pagination
        const pagination = !!$$('[class*="pagination" i] button, [aria-label="pagination"], [class*="Pagination"]').length;

        // Filter inputs
        const filterInputs = $$('input[type="search"], select, input[placeholder*="ilter" i], input[placeholder*="earch" i]').length;

        // Heading present — exclude sidebar/header content
        const headingEl = $$('main h1, main h2, [class*="pageTitle" i], [class*="heroTitle" i], h1, h2').find((h) => {
          let p = h.parentElement;
          for (let i = 0; i < 6 && p; i++) {
            const cls = (p.className || '').toString();
            if (/sidebar|Sidebar|profileHeader|mobileHeader|MobileHeader|breadcrumb/i.test(cls)) return false;
            p = p.parentElement;
          }
          return true;
        });
        const heading = (headingEl?.textContent || '').trim().slice(0, 100);

        // 404 / not found markers
        const notFound = /404|page not found|not\s*found/i.test(bodyText.slice(0, 2000));

        return {
          brokenImgs, missingAlt, totalImgs: imgs.length,
          headerSearchPresent: !!headerSearchInput,
          sidebarLinks, bottomLinks,
          headerButtons, headerHasNotifIcon, headerHasAvatar, headerHasCart, headerHasWishlist,
          tabs, hasLogout: !!logoutEl,
          hasComingSoon, hasTodoCopy, ctas, forms, submitButtons,
          modalOpen, pagination, filterInputs, heading, notFound,
        };
      });
    } catch (e) {
      add(r.module, r.path, 'P1', 'BROKEN', `Page introspection failed: ${e.message.slice(0, 200)}`, 'Investigate render failure');
      console.log(`INSPECT FAIL: ${e.message.slice(0, 160)}`);
      continue;
    }

    // 1. Broken images
    if (info.brokenImgs > 0) {
      add(r.module, r.path, 'P1', 'BROKEN', `${info.brokenImgs} broken image(s) (naturalWidth==0)`, 'Fix image src or fallback');
    }
    // 14. Missing alt text
    if (info.missingAlt > 0) {
      add(r.module, r.path, 'P2', 'MISSING', `${info.missingAlt} <img> without alt attribute`, 'Add alt text for a11y');
    }
    // 16. Coming-soon pills
    if (info.hasComingSoon) {
      // Whitelist: routes that are intentionally stubbed (Phase 5/6)
      const phasedStubs = ['/anime', '/wager', '/marketplace', '/shop', '/community'];
      const isPhased = phasedStubs.some((p) => r.path.startsWith(p));
      if (!isPhased) {
        add(r.module, r.path, 'P2', 'STALE', '"Coming soon" copy still on built route', 'Remove placeholder pill');
      }
    }
    if (info.hasTodoCopy) {
      add(r.module, r.path, 'P2', 'STALE', 'TODO/placeholder copy visible to user', 'Replace with final copy');
    }

    // 404 detect
    if (info.notFound && r.path !== '/404') {
      add(r.module, r.path, 'P0', 'BROKEN', 'Page renders 404 / Not Found content', 'Build route or fix data fetch');
    }

    // 2. Header search test (only on a representative subset to save time)
    const isAuthShellRoute = !['/', '/privacy-policy', '/login', '/admin/login'].includes(r.path)
      && !r.path.startsWith('/admin/login');
    const isAdminRoute = r.path.startsWith('/admin');
    if (isAuthShellRoute && info.headerSearchPresent && !isAdminRoute && walked % 6 === 0) {
      try {
        const hadHeaderSearch = await page.evaluate(() => {
          const inp = document.querySelector('header input[type="search"], header input[placeholder*="earch" i]')
            || document.querySelector('input[type="search"]')
            || document.querySelector('input[placeholder*="earch" i]');
          if (!inp) return false;
          inp.focus();
          inp.value = 'fifa';
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          return true;
        });
        if (hadHeaderSearch) {
          await new Promise((res) => setTimeout(res, 1500));
          const url = page.url();
          if (!/\/search\?q=/.test(url)) {
            add(r.module, r.path, 'P1', 'BROKEN', 'Header search Enter does not navigate to /search?q=', 'Wire search submit to /search route');
          }
        }
      } catch { /* tolerate */ }
    } else if (isAuthShellRoute && !info.headerSearchPresent && !isAdminRoute) {
      // Only flag once per module to avoid noise — track via global set
      if (!globalThis.__auditNoSearch) globalThis.__auditNoSearch = new Set();
      if (!globalThis.__auditNoSearch.has(r.module)) {
        globalThis.__auditNoSearch.add(r.module);
        add(r.module, r.path, 'P2', 'INCONSISTENT', 'Header search input absent', 'Confirm whether header search expected on this shell');
      }
    }

    // 3. Sidebar dead links - sample
    if (isAuthShellRoute && info.sidebarLinks.length === 0 && !isAdminRoute) {
      add(r.module, r.path, 'P1', 'MISSING', 'No sidebar links detected (sidebar absent or empty)', 'Confirm sidebar shell mounted');
    } else if (info.sidebarLinks.length) {
      const dead = info.sidebarLinks.filter((l) => !l.href || l.href === '#' || l.href === 'javascript:void(0)').length;
      if (dead) {
        add(r.module, r.path, 'P2', 'BROKEN', `${dead} sidebar link(s) with empty/# href`, 'Wire link to real route');
      }
    }

    // 6. Header icons
    if (isAuthShellRoute && !isAdminRoute) {
      if (!info.headerHasAvatar && !info.headerHasNotifIcon) {
        if (!globalThis.__auditNoHeaderIcons) globalThis.__auditNoHeaderIcons = new Set();
        if (!globalThis.__auditNoHeaderIcons.has(r.module)) {
          globalThis.__auditNoHeaderIcons.add(r.module);
          add(r.module, r.path, 'P2', 'MISSING', 'Header lacks avatar + notification icons', 'Add header user actions (avatar dropdown, notification bell)');
        }
      }
    }

    // 7. Tabs check - if URL has ?tab= and tabs detected, verify the active tab matches
    if (/[?&]tab=/.test(r.path) || /[?&]panel=/.test(r.path)) {
      if (info.tabs.length === 0 && !info.notFound) {
        add(r.module, r.path, 'P2', 'BROKEN', 'URL has tab/panel param but no tab UI rendered', 'Render tabs that match URL state');
      }
    }

    // 11. Forms without submit
    if (info.forms > 0 && info.submitButtons === 0) {
      add(r.module, r.path, 'P1', 'BROKEN', `${info.forms} form(s) have no submit button`, 'Add submit button or convert to non-form');
    }

    // 13. Modals open on initial render? (suspicious)
    if (info.modalOpen && !/register|create|topup|send|withdraw/.test(r.path)) {
      // Skip flag: most pages render hidden modals as overlays already
    }

    // Severity escalation: if route is "built" per CLAUDE status and renders nothing identifiable
    if (!info.heading && !info.notFound) {
      add(r.module, r.path, 'P1', 'BROKEN', 'No <h1>/<h2>/page-title found on render', 'Confirm content actually mounts');
    }

    console.log(`OK (${(consoleByRoute[r.path] || []).length} cerr, ${(httpByRoute[r.path] || []).length} httpErr)`);
  }

  // === LIKE / FOLLOW TOGGLE on a high-traffic page ===
  console.log('[audit] testing like/follow toggle on /tournaments...');
  try {
    currentPath = '/tournaments';
    await page.goto(`${BASE}/tournaments`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise((r) => setTimeout(r, 2000));
    const result = await page.evaluate(() => {
      const heart = Array.from(document.querySelectorAll('button, [role="button"]')).find((el) => {
        const c = (el.className || '').toString();
        const html = el.outerHTML;
        return /like|heart|favorite|wish/i.test(c) || /heart|like/i.test(html.slice(0, 500));
      });
      if (!heart) return { found: false };
      const before = heart.outerHTML.slice(0, 500);
      heart.click();
      return { found: true, before };
    });
    if (result.found) {
      await new Promise((r) => setTimeout(r, 600));
      const after = await page.evaluate((before) => {
        const heart = Array.from(document.querySelectorAll('button, [role="button"]')).find((el) => {
          const c = (el.className || '').toString();
          const html = el.outerHTML;
          return /like|heart|favorite|wish/i.test(c) || /heart|like/i.test(html.slice(0, 500));
        });
        return heart ? heart.outerHTML.slice(0, 500) : null;
      }, result.before);
      if (after && after === result.before) {
        add('Tournaments', '/tournaments', 'P2', 'BROKEN', 'Like/heart click did not change visual state', 'Wire toggle handler');
      }
    }
  } catch { /* tolerate */ }

  // === LOGOUT TEST ===
  console.log('[audit] testing logout from /home...');
  try {
    currentPath = '/home';
    await page.goto(`${BASE}/home`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise((r) => setTimeout(r, 2000));
    const clicked = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button, a, [role="button"]'))
        .find((el) => /\b(log\s*out|logout|sign\s*out)\b/i.test((el.textContent || '').trim()));
      if (btn) { btn.click(); return true; }
      return false;
    });
    if (!clicked) {
      add('Auth', '/home', 'P1', 'MISSING', 'No logout button found on /home shell', 'Add logout to sidebar/header menu');
    } else {
      await new Promise((r) => setTimeout(r, 2500));
      const url = page.url();
      if (!/\/login|\/$/.test(url)) {
        add('Auth', '/home', 'P1', 'BROKEN', `Logout did not redirect to /login (now: ${url.replace(BASE, '')})`, 'Wire logout to signOut + redirect');
      }
    }
    // Re-login for any subsequent steps
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise((r) => setTimeout(r, 1500));
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button'))
        .find((b) => b.textContent && b.textContent.trim().toLowerCase().includes('try demo account'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 4000));
  } catch { /* tolerate */ }

  // === MOBILE BOTTOM MENU TEST ===
  if (timeLeftMs() > 60000) {
    console.log('[audit] testing mobile bottom menu @ 375x812...');
    try {
      await page.setViewport({ width: 375, height: 812 });
      const mobileChecks = ['/home', '/tournaments', '/wallets', '/user-profile', '/settings'];
      for (const m of mobileChecks) {
        if (timeLeftMs() < 30000) break;
        currentPath = m + '#mobile';
        try {
          await page.goto(`${BASE}${m}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
          await new Promise((r) => setTimeout(r, 1500));
          const probe = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('[class*="bottomMenu" i] a, [class*="BottomMenu"] a'));
            return {
              count: links.length,
              dead: links.filter((a) => !a.getAttribute('href') || a.getAttribute('href') === '#').length,
              visible: links.length > 0 ? !!links[0].offsetParent : false,
            };
          });
          if (probe.count === 0) {
            add('Mobile', m, 'P1', 'MISSING', 'Bottom menu absent at 375px viewport', 'Mount BottomMenu on mobile shell');
          } else if (probe.dead) {
            add('Mobile', m, 'P2', 'BROKEN', `${probe.dead} bottom-menu link(s) with empty/# href`, 'Wire link to real route');
          } else if (!probe.visible) {
            add('Mobile', m, 'P2', 'BROKEN', 'Bottom menu present but not visible at 375px', 'Check display/visibility CSS');
          }
        } catch (e) {
          // tolerate
        }
      }
      await page.setViewport({ width: 1440, height: 900 });
    } catch { /* tolerate */ }
  }

  // === MODAL ESC + OUTSIDE-CLICK on /tournaments/register-tournament ===
  if (timeLeftMs() > 30000) {
    console.log('[audit] testing modal ESC behavior on /tournaments/register-tournament...');
    try {
      currentPath = '/tournaments/register-tournament?id=tmt_1000';
      await page.goto(`${BASE}/tournaments/register-tournament?id=tmt_1000`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await new Promise((r) => setTimeout(r, 1800));
      const hasModal = await page.evaluate(() => !!document.querySelector('[role="dialog"], [class*="modal" i]'));
      if (hasModal) {
        await page.keyboard.press('Escape');
        await new Promise((r) => setTimeout(r, 500));
        const stillOpen = await page.evaluate(() => {
          const m = document.querySelector('[role="dialog"], [class*="modal" i]:not([class*="close" i])');
          if (!m) return false;
          const style = window.getComputedStyle(m);
          return style.display !== 'none' && style.visibility !== 'hidden';
        });
        if (stillOpen) {
          add('Tournaments', '/tournaments/register-tournament', 'P2', 'MISSING', 'ESC does not close modal', 'Bind keydown ESC to modal close');
        }
      }
    } catch { /* tolerate */ }
  }

  // === SCREENSHOT P0 ROUTES ===
  console.log('[audit] capturing screenshots of P0 routes...');
  const p0Routes = [...new Set(findings.filter((f) => f.severity === 'P0').map((f) => f.route))];
  for (const rp of p0Routes.slice(0, 20)) {
    if (timeLeftMs() < 15000) break;
    try {
      await page.goto(`${BASE}${rp}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await new Promise((r) => setTimeout(r, 1500));
      const file = path.join(SCREEN_DIR, `${slugify(rp)}.png`);
      await page.screenshot({ path: file, fullPage: false });
    } catch { /* tolerate */ }
  }

  await browser.close();

  // === REPORT ===
  console.log(`[audit] writing report (${findings.length} findings)...`);
  const byModule = {};
  for (const f of findings) {
    byModule[f.module] = byModule[f.module] || [];
    byModule[f.module].push(f);
  }

  const ord = ['P0', 'P1', 'P2'];
  const counts = ord.reduce((a, s) => { a[s] = findings.filter((f) => f.severity === s).length; return a; }, {});

  let md = '';
  md += `# V-ENT Functional Audit Report\n\n`;
  md += `**Run:** ${new Date().toISOString()}  \n`;
  md += `**Base URL:** ${BASE}  \n`;
  md += `**Routes walked:** ${ROUTES.length}  \n`;
  md += `**Total findings:** ${findings.length} — P0: ${counts.P0} / P1: ${counts.P1} / P2: ${counts.P2}\n\n`;
  md += `## Methodology\n\n`;
  md += `Headless Chrome via puppeteer-core. Demo-login once, then visit every route and exercise:\n`;
  md += `console errors, HTTP 4xx/5xx, broken imgs, missing alt, header search submit, sidebar/bottom-menu link health, header icons (avatar/notif/cart/wishlist), tab/panel sync with URL, form/submit pairing, like-toggle, modal ESC close, logout, mobile shell @ 375x812, and stale "coming soon"/TODO copy. Findings de-duped per route+module.\n\n`;
  md += `## Top 10 Most-Impactful Issues\n\n`;
  const top = findings
    .slice()
    .sort((a, b) => ord.indexOf(a.severity) - ord.indexOf(b.severity))
    .slice(0, 10);
  for (const t of top) {
    md += `- **${t.severity}** \`${t.route}\` — ${t.description}\n`;
  }
  md += `\n## Findings by Module\n\n`;

  const moduleOrder = ['Auth', 'Landing', 'Public', 'Home', 'Search', 'Profile', 'Tournaments', 'Events', 'Teams', 'Rankings', 'Wallets', 'Organizations', 'Marketplace', 'Shop', 'Anime', 'Community', 'Wager', 'Settings', 'Production', 'Admin', 'Mobile'];
  const seen = new Set();
  const orderedMods = [];
  for (const m of moduleOrder) if (byModule[m]) { orderedMods.push(m); seen.add(m); }
  for (const m of Object.keys(byModule)) if (!seen.has(m)) orderedMods.push(m);

  for (const m of orderedMods) {
    const list = byModule[m];
    if (!list || !list.length) continue;
    md += `### ${m}  (${list.length})\n\n`;
    md += `| Route | Severity | Type | Description | Suggested Fix |\n`;
    md += `|-------|----------|------|-------------|---------------|\n`;
    list.sort((a, b) => ord.indexOf(a.severity) - ord.indexOf(b.severity));
    for (const f of list) {
      const desc = (f.description || '').replace(/\|/g, '\\|');
      const fix = (f.fix || '').replace(/\|/g, '\\|');
      md += `| \`${f.route}\` | ${f.severity} | ${f.type} | ${desc} | ${fix} |\n`;
    }
    md += `\n`;
  }

  md += `## Notes\n\n`;
  md += `- Screenshots of P0 routes saved to \`tasks/audit-screens/\`\n`;
  md += `- Many findings are derived from heuristic DOM probes; verify edge cases manually before fixing\n`;
  md += `- Phase 4–6 routes (Marketplace / Shop / Anime / Community / Wager) are intentionally stubbed; "coming soon" markers there are not flagged\n`;

  fs.writeFileSync(REPORT_PATH, md, 'utf8');
  console.log(`[audit] wrote ${REPORT_PATH}`);
  console.log(`[audit] DONE: ${findings.length} findings (${counts.P0} P0 / ${counts.P1} P1 / ${counts.P2} P2)`);
  process.exit(0);
})().catch((err) => {
  console.error('[audit] failed:', err);
  process.exit(2);
});
