#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * FULL-PLATFORM AUDIT WALKER (real mode).
 *
 * Walks EVERY route under src/app (auto-discovered), at a real viewport, and for
 * each page records:
 *   - console errors / uncaught page errors
 *   - failed network requests (4xx/5xx) with the URL that failed
 *   - horizontal overflow (scrollWidth > innerWidth)
 *   - sub-44px tap targets (mobile a11y heuristic)
 *   - every visible button + link, its label, and its href
 *   - internal links whose target route does NOT exist (dead links)
 *   - buttons with no click handler attribute AND no form association (dead-button hint)
 *   - whether the page rendered an empty shell / error text
 *   - a full-page screenshot
 *
 * Usage:
 *   node scripts/audit-walk.js                       # desktop 1440, user session
 *   VIEW=mobile node scripts/audit-walk.js           # 390x844
 *   AS=admin node scripts/audit-walk.js              # admin surfaces (localStorage adminToken)
 *   ONLY=/wallets,/teams node scripts/audit-walk.js  # subset
 *
 * Output: scripts/audit-out/<view>-<as>/*.png + report.json + report.md
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const BASE = process.env.AUDIT_BASE || 'http://127.0.0.1:3100';
const API = process.env.API_BASE || 'http://127.0.0.1:8100';
const CHROME = process.env.CHROME_BIN || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER = process.env.AUDIT_USER || 'orga';
const PASS = process.env.AUDIT_PASS || 'Passw0rd!';
const VIEW = (process.env.VIEW || 'desktop').toLowerCase();
const AS = (process.env.AS || 'user').toLowerCase();
const ONLY = (process.env.ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);

const OUT = path.join(__dirname, 'audit-out', `${VIEW}-${AS}`);
const APP = path.join(__dirname, '..', 'src', 'app');

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  wide: { width: 1920, height: 1080, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
};
const UA_MOBILE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

// Query params the page needs to render real data.
const PARAMS = {
  '/tournaments/view-tournament': '?id=3',
  '/tournaments/manage': '?id=3',
  '/tournaments/my-tournaments/manage': '?id=3',
  '/tournaments/register-tournament': '?id=4',
  '/tournaments/overlay': '?id=3',
  '/tournaments/production': '?id=3',
  '/events/view-event': '?id=1',
  '/teams/team-profile': '?id=3',
  '/edit-team-profile': '?id=3',
  '/admin/users/[id]': null, // replaced below
};

const SKIP = [/^\/api\//, /^\/email-verified/, /^\/wallet-topup-callback/];

function discoverRoutes() {
  const routes = [];
  const walk = (dir, rel) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // route groups like (admin) don't appear in the URL
        const seg = /^\(.*\)$/.test(entry.name) ? rel : `${rel}/${entry.name}`;
        walk(abs, seg);
      } else if (entry.name === 'page.js') {
        routes.push(rel === '' ? '/' : rel);
      }
    }
  };
  walk(APP, '');
  return routes
    .map((r) => r.replace(/\\/g, '/'))
    .filter((r) => !SKIP.some((re) => re.test(r)))
    .map((r) => r.replace('/[id]', '/2').replace('/[key]/[value]', '/k/v'))
    .sort();
}

const IGNORE = [
  'Download the React DevTools', 'next-auth][warn][DEBUG_ENABLED', 'favicon',
  'preloaded using', 'was preloaded', '_rsc=', 'hot-update', 'Fast Refresh',
  'react-devtools', 'DevTools failed to load source map',
];
const ignorable = (t) => !t || IGNORE.some((p) => t.includes(p));

async function walkRoute(page, route, allRoutes) {
  const errors = [];
  const netFails = [];
  const onErr = (e) => { if (!ignorable(e.message)) errors.push(`pageerror: ${e.message}`); };
  const onConsole = (m) => { if (m.type() === 'error' && !ignorable(m.text())) errors.push(`console: ${m.text()}`); };
  const onResponse = (res) => {
    const s = res.status();
    const u = res.url();
    if (s >= 400 && !u.includes('/_next/') && !u.includes('favicon') && !u.includes('hot-update')) {
      netFails.push(`${s} ${res.request().method()} ${u.replace(API, 'API').replace(BASE, 'FE')}`);
    }
  };
  page.on('pageerror', onErr);
  page.on('console', onConsole);
  page.on('response', onResponse);

  const url = `${BASE}${route}${PARAMS[route] || ''}`;
  let navErr = null;
  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 45000 });
  } catch (e) {
    navErr = e.message.slice(0, 120);
    await new Promise((r) => setTimeout(r, 2500));
  }
  await new Promise((r) => setTimeout(r, 1400));

  const data = await page.evaluate(() => {
    const vis = (el) => {
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none';
    };
    const label = (el) =>
      (el.innerText || el.textContent || el.getAttribute('aria-label') || el.title || '')
        .replace(/\s+/g, ' ').trim().slice(0, 48);

    const buttons = Array.from(document.querySelectorAll('button, [role="button"], input[type="submit"]'))
      .filter(vis)
      .map((el) => ({
        text: label(el) || '(icon)',
        disabled: !!el.disabled,
        type: el.getAttribute('type') || '',
        inForm: !!el.closest('form'),
      }));

    const links = Array.from(document.querySelectorAll('a[href]'))
      .filter(vis)
      .map((el) => ({ text: label(el) || '(icon)', href: el.getAttribute('href') }));

    const inputs = Array.from(document.querySelectorAll('input, select, textarea')).filter(vis).length;

    const bodyText = (document.body.innerText || '').replace(/\s+/g, ' ').trim();

    return {
      title: document.title,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      buttons,
      links,
      inputs,
      textLen: bodyText.length,
      snippet: bodyText.slice(0, 180),
      looksEmpty: bodyText.length < 120,
      errorText: /404|not found|something went wrong|failed to (load|fetch)|application error/i.test(bodyText.slice(0, 4000)),
      // Design-rule compliance (owner 2026-08-17): no hairline strokes, no glow.
      strokes: (() => {
        const out = [];
        for (const el of document.querySelectorAll('*')) {
          if (!vis(el)) continue;
          const c = getComputedStyle(el);
          const sides = ['Top', 'Right', 'Bottom', 'Left'];
          for (const side of sides) {
            const w = parseFloat(c[`border${side}Width`]);
            const style = c[`border${side}Style`];
            const col = c[`border${side}Color`];
            if (w > 0 && w <= 2 && style !== 'none' && col !== 'rgba(0, 0, 0, 0)' && col !== 'transparent') {
              out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}:border-${side.toLowerCase()} ${w}px`);
              break;
            }
          }
          // 1px-tall filled elements are rules by another name
          const r = el.getBoundingClientRect();
          if (r.height > 0 && r.height <= 1.5 && r.width > 24 && c.backgroundColor !== 'rgba(0, 0, 0, 0)') {
            out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}:1px-rule`);
          }
        }
        return [...new Set(out)].slice(0, 8);
      })(),
      glows: (() => {
        const out = [];
        for (const el of document.querySelectorAll('*')) {
          if (!vis(el)) continue;
          const sh = getComputedStyle(el).boxShadow;
          // "rgba(...) 0px 0px 10px" = centred bloom; inset fills are fine
          if (sh && sh !== 'none' && /(^|\s)0px 0px (?!0px)/.test(sh) && !sh.includes('inset')) {
            out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}`);
          }
        }
        return [...new Set(out)].slice(0, 6);
      })(),
      smallTaps: Array.from(document.querySelectorAll('button, a[href]')).filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44);
      }).length,
    };
  });

  // dead links: internal hrefs pointing at a route that doesn't exist.
  // Static files under /public (PDFs, images) are valid targets too.
  const norm = (h) => decodeURIComponent(h.split('?')[0].split('#')[0]).replace(/\/$/, '') || '/';
  const known = new Set(allRoutes.map(norm));
  const publicDir = path.join(__dirname, '..', 'public');
  const publicFiles = new Set(
    fs.existsSync(publicDir) ? fs.readdirSync(publicDir).map((f) => `/${f}`) : []
  );
  const deadLinks = [...new Set(
    data.links
      .map((l) => l.href)
      .filter((h) => h && h.startsWith('/') && !h.startsWith('//'))
      .filter((h) => {
        const n = norm(h);
        if (known.has(n) || publicFiles.has(n)) return false;
        // allow dynamic children of known parents, e.g. /admin/users/7
        return ![...known].some((k) => k !== '/' && n.startsWith(`${k}/`));
      })
  )];

  const hashLinks = data.links.filter((l) => l.href === '#' || l.href === '' || l.href === 'javascript:void(0)');

  const file = path.join(OUT, `${(route === '/' ? 'root' : route.slice(1).replace(/\//g, '_'))}.png`);
  try { await page.screenshot({ path: file, fullPage: true }); } catch (e) { /* oversize page */ }

  page.off('pageerror', onErr);
  page.off('console', onConsole);
  page.off('response', onResponse);

  return {
    route,
    url,
    navErr,
    title: data.title,
    overflow: data.scrollWidth > data.innerWidth + 1,
    scrollWidth: data.scrollWidth,
    innerWidth: data.innerWidth,
    buttons: data.buttons.length,
    buttonList: data.buttons,
    links: data.links.length,
    linkList: data.links,
    inputs: data.inputs,
    deadLinks,
    hashLinks: hashLinks.length,
    smallTaps: data.smallTaps,
    strokes: data.strokes,
    glows: data.glows,
    looksEmpty: data.looksEmpty,
    errorText: data.errorText,
    snippet: data.snippet,
    errors: [...new Set(errors)].slice(0, 12),
    netFails: [...new Set(netFails)].slice(0, 12),
  };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const allRoutes = discoverRoutes();
  const routes = ONLY.length ? allRoutes.filter((r) => ONLY.some((o) => r.startsWith(o))) : allRoutes;
  console.log(`[audit] ${routes.length} routes · view=${VIEW} · as=${AS} · base=${BASE}`);

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport(VIEWPORTS[VIEW]);
  if (VIEW === 'mobile') await page.setUserAgent(UA_MOBILE);
  page.setDefaultTimeout(30000);

  // ---- auth ----
  let authNote = 'anonymous';
  if (AS === 'admin') {
    // Admin sign-in is two steps: credentials return a short-lived pending
    // token, then a real TOTP code exchanges it for a session token.
    // Pass the enrolled secret as ADMIN_TOTP_SECRET (read it from AdminTOTP).
    const totpCode = (secretB32) => {
      const crypto = require('crypto');
      const padded = secretB32 + '='.repeat((8 - (secretB32.length % 8)) % 8);
      // base32 decode
      const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
      let bits = '';
      for (const ch of padded.replace(/=+$/, '').toUpperCase()) {
        bits += alpha.indexOf(ch).toString(2).padStart(5, '0');
      }
      const bytes = Buffer.from((bits.match(/.{8}/g) || []).map((b) => parseInt(b, 2)));
      const step = Math.floor(Date.now() / 1000 / 30);
      const counter = Buffer.alloc(8);
      counter.writeBigUInt64BE(BigInt(step));
      const digest = crypto.createHmac('sha1', bytes).update(counter).digest();
      const offset = digest[digest.length - 1] & 0x0f;
      const code = digest.readUInt32BE(offset) & 0x7fffffff;
      return String(code % 1e6).padStart(6, '0');
    };

    const step1 = await fetch(`${API}/auth/admin/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: process.env.AUDIT_ADMIN_EMAIL || 'orga@vent.test', password: PASS }),
    });
    const s1 = await step1.json().catch(() => ({}));
    const secret = s1?.data?.secret || process.env.ADMIN_TOTP_SECRET;
    let j = {};
    if (s1?.data?.pending_token && secret) {
      const step2 = await fetch(`${API}/auth/admin/2fa/verify/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pending_token: s1.data.pending_token, code: totpCode(secret) }),
      });
      j = await step2.json().catch(() => ({}));
    } else {
      console.error('[audit] admin 2FA: no secret available — set ADMIN_TOTP_SECRET');
    }
    const tok = j?.data?.session_token;
    const adminObj = j?.data?.admin || {};
    if (!tok) { console.error('[audit] admin login FAILED', JSON.stringify(j).slice(0, 300)); }
    await page.goto(`${BASE}/admin/login`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((t, admin) => {
      localStorage.setItem('adminToken', t);
      localStorage.setItem('adminUser', JSON.stringify(admin));
      document.cookie = `adminToken=${t}; path=/; max-age=604800; SameSite=Lax`;
    }, tok || '', adminObj);
    authNote = tok ? `admin(${USER})` : 'admin-login-FAILED';
  } else {
    try {
      await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('input[type="password"]', { timeout: 10000 });
      await page.type('input[type="text"], input[type="email"], input:not([type])', USER, { delay: 15 });
      await page.type('input[type="password"]', PASS, { delay: 15 });
      await page.evaluate(() => {
        const b = Array.from(document.querySelectorAll('button')).find((x) => /log\s?in|sign\s?in/i.test(x.textContent || ''));
        if (b) b.click();
      });
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 45000 }).catch(() => {});
      authNote = /\/login/.test(page.url()) ? 'login-FAILED' : `user(${USER})`;
    } catch (e) {
      authNote = `login-ERROR ${e.message.slice(0, 60)}`;
    }
  }
  console.log(`[audit] auth: ${authNote}`);

  const results = [];
  for (const r of routes) {
    const res = await walkRoute(page, r, allRoutes);
    results.push(res);
    const flag = [
      res.errors.length ? `ERR×${res.errors.length}` : '',
      res.netFails.length ? `NET×${res.netFails.length}` : '',
      res.overflow ? 'OVERFLOW' : '',
      res.deadLinks.length ? `DEAD×${res.deadLinks.length}` : '',
      res.looksEmpty ? 'EMPTY' : '',
      res.strokes.length ? `STROKE×${res.strokes.length}` : '',
      res.glows.length ? `GLOW×${res.glows.length}` : '',
      res.errorText ? 'ERRTEXT' : '',
    ].filter(Boolean).join(' ');
    console.log(`  ${res.route.padEnd(42)} btn=${String(res.buttons).padStart(3)} lnk=${String(res.links).padStart(3)} ${flag}`);
  }

  await browser.close();

  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ view: VIEW, as: AS, auth: authNote, results }, null, 2));

  // markdown summary
  const md = [];
  md.push(`# Audit walk — ${VIEW} · ${AS} (${authNote})`, '');
  md.push('| Route | Btn | Link | Input | Console err | Net 4xx/5xx | Overflow | Dead links | Empty |');
  md.push('|---|---|---|---|---|---|---|---|---|');
  for (const r of results) {
    md.push(`| \`${r.route}\` | ${r.buttons} | ${r.links} | ${r.inputs} | ${r.errors.length} | ${r.netFails.length} | ${r.overflow ? '**YES**' : ''} | ${r.deadLinks.length} | ${r.looksEmpty ? 'YES' : ''} |`);
  }
  md.push('', '## Details (only routes with findings)', '');
  for (const r of results) {
    if (!r.errors.length && !r.netFails.length && !r.overflow && !r.deadLinks.length
        && !r.looksEmpty && !r.navErr && !r.strokes.length && !r.glows.length) continue;
    md.push(`### \`${r.route}\``);
    if (r.navErr) md.push(`- navigation: ${r.navErr}`);
    if (r.looksEmpty) md.push(`- **renders near-empty** (text length ${r.snippet.length}): "${r.snippet}"`);
    if (r.overflow) md.push(`- **horizontal overflow**: scrollWidth ${r.scrollWidth} > viewport ${r.innerWidth}`);
    r.errors.forEach((e) => md.push(`- console: \`${e}\``));
    r.netFails.forEach((e) => md.push(`- network: \`${e}\``));
    if (r.deadLinks.length) md.push(`- dead links: ${r.deadLinks.map((d) => `\`${d}\``).join(', ')}`);
    r.strokes.forEach((sK) => md.push(`- hairline: \`${sK}\``));
    r.glows.forEach((g) => md.push(`- glow: \`${g}\``));
    md.push('');
  }
  fs.writeFileSync(path.join(OUT, 'report.md'), md.join('\n'));

  const bad = results.filter((r) => r.errors.length || r.netFails.length || r.overflow
    || r.deadLinks.length || r.strokes.length || r.glows.length);
  console.log(`\n[audit] ${results.length} routes walked · ${bad.length} with findings · report: ${path.join(OUT, 'report.md')}`);
})();
