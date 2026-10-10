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
 *   VIEW=tablet768|tablet820|tablet1024 node scripts/audit-walk.js   # tablets (inbox 414)
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
const SAMPLES = process.env.AUDIT_SAMPLES
  ? JSON.parse(fs.readFileSync(process.env.AUDIT_SAMPLES, 'utf8'))
  : {};

// One folder per person walked, so walking several roles keeps every report.
const OUT = path.join(__dirname, 'audit-out', `${VIEW}-${AS}${AS === 'user' ? `-${USER}` : ''}`);
const APP = path.join(__dirname, '..', 'src', 'app');

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  wide: { width: 1920, height: 1080, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  // Tablets, portrait, for inbox 414: under 1024px the shell is the phone one, from 1024 the
  // sidebar. 1024 is an iPad Pro held upright, the first width that gets the sidebar.
  tablet768: { width: 768, height: 1024, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  tablet820: { width: 820, height: 1180, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  tablet1024: { width: 1024, height: 1366, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};
const UA_TABLET =
  'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
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

  // A dynamic route is walked as a real record when the samples file names
  // one (AUDIT_SAMPLES, a JSON map of route to address); otherwise the
  // bracketed placeholder only tests the not-found state.
  const url = `${BASE}${SAMPLES[route] || route}${PARAMS[route] || ''}`;
  let navErr = null;
  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 45000 });
  } catch (e) {
    navErr = e.message.slice(0, 120);
    await new Promise((r) => setTimeout(r, 2500));
  }
  await new Promise((r) => setTimeout(r, 1400));

  const measure = () => {
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
      // A link laid out inline inside a sentence is typography, and counting it
      // reports faults nobody can act on (reference_emulator_devtools): those
      // are counted apart, as inlineLinks.
      inlineLinks: Array.from(document.querySelectorAll('a[href]')).filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.height < 44 && getComputedStyle(el).display === 'inline'
          && (el.parentElement && (el.parentElement.textContent || '').trim().length > (el.textContent || '').trim().length + 3);
      }).length,
      smallTaps: Array.from(document.querySelectorAll('button, a[href]')).filter((el) => {
        const r = el.getBoundingClientRect();
        if (!(r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44))) return false;
        const inSentence = el.tagName === 'A' && getComputedStyle(el).display === 'inline'
          && el.parentElement && (el.parentElement.textContent || '').trim().length > (el.textContent || '').trim().length + 3;
        return !inSentence;
      }).map((el) => {
        const r = el.getBoundingClientRect();
        return `${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24)}" ${Math.round(r.width)}x${Math.round(r.height)} .${String(el.className).split(' ')[0].slice(0, 36)}`;
      }),
      // The surface the page actually paints, read at its left edge halfway
      // down: the first ancestor with a background. Pure black or pure white is
      // banned (design rule E); every sign-in page was #000 through
      // var(--primary-text) until 28 September, and no grep of the CSS said so.
      pureBg: (() => {
        let el = document.elementFromPoint(4, Math.round(innerHeight / 2));
        while (el) {
          const bg = getComputedStyle(el).backgroundColor;
          if (bg && bg !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(bg)) {
            return /^rgba?\((0, 0, 0|255, 255, 255)(, 1)?\)$/.test(bg)
              ? `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0].slice(0, 40)} ${bg}` : null;
          }
          el = el.parentElement;
        }
        return null;
      })(),
      // Controls past the right edge that nothing can scroll to. A wrapper with
      // overflow-x: hidden keeps scrollWidth equal to the viewport, so the
      // overflow check above sees nothing while a Save button sits at x=760 on
      // a 375px phone (/settings, 28 September). A control inside a
      // horizontal scroller (a tab strip) is reachable and is left alone.
      // Which shell the page drew, and whether it fits it (inbox 414). Under 1024px: the phone
      // header and the bottom menu, no sidebar. From 1024px: the sidebar. `under` counts
      // controls the fixed sidebar covers; `covered` counts controls that sit inside the last
      // 70px of the document, where the fixed bottom menu covers them even fully scrolled.
      shell: (() => {
        const shown = (sel) => Array.from(document.querySelectorAll(sel)).some((el) => {
          const r = el.getBoundingClientRect();
          const st = getComputedStyle(el);
          return r.width > 0 && r.height > 0 && st.display !== 'none' && st.visibility !== 'hidden';
        });
        const sidebar = shown('[class*="desktopSidebar"]');
        const bottomMenu = shown('[class*="bottomMenuContainer"]');
        const fixedAncestor = (el) => {
          for (let p = el; p && p !== document.body; p = p.parentElement) {
            if (getComputedStyle(p).position === 'fixed') return true;
          }
          return false;
        };
        // A control inside a collapsed panel (`max-height: 0; overflow: hidden`) keeps its own
        // size, so its rect says it is there while nobody can see or press it. The rankings
        // row's closed detail drawer read as two buttons under the bottom menu (10 October).
        const clippedAway = (el) => {
          const r = el.getBoundingClientRect();
          for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
            const st = getComputedStyle(p);
            if (st.overflow === 'visible' && st.overflowY === 'visible') continue;
            const pr = p.getBoundingClientRect();
            if (r.bottom <= pr.top || r.top >= pr.bottom || pr.height < 1) return true;
          }
          return false;
        };
        const controls = Array.from(document.querySelectorAll('button, a[href], input, select, textarea'))
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'
              && !fixedAncestor(el) && !clippedAway(el);
          });
        const side = document.querySelector('[class*="desktopSidebar"]');
        const sideRight = sidebar && side ? side.getBoundingClientRect().right : 0;
        const docH = document.documentElement.scrollHeight;
        const name = (el) => `${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('aria-label') || el.name || '').trim().slice(0, 24)}"`;
        return {
          sidebar,
          bottomMenu,
          under: controls.filter((el) => {
            const r = el.getBoundingClientRect();
            return r.right > 0 && r.left < sideRight - 1;
          }).slice(0, 4).map(name),
          covered: bottomMenu
            ? controls.filter((el) => el.getBoundingClientRect().bottom + window.scrollY > docH - 70 + 1).slice(0, 4).map(name)
            : [],
        };
      })(),
      offscreen: (() => {
        const vw = document.documentElement.clientWidth;
        // A closed drawer is a fixed panel parked past the edge on purpose, and
        // a control inside a horizontal scroller can be scrolled to: neither is
        // lost.
        const scrolls = (el) => {
          for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
            const cs = getComputedStyle(p);
            if (cs.position === 'fixed') return true;
            if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && p.scrollWidth > p.clientWidth) return true;
          }
          return false;
        };
        return Array.from(document.querySelectorAll('button, a[href], input, select, textarea'))
          .filter((el) => {
            const r = el.getBoundingClientRect();
            const st = getComputedStyle(el);
            if (!r.width || !r.height || st.visibility === 'hidden' || st.position === 'fixed') return false;
            return r.left >= vw - 1 && !scrolls(el);
          })
          .slice(0, 6)
          .map((el) => `${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('aria-label') || el.name || '').trim().slice(0, 30)}" at x=${Math.round(el.getBoundingClientRect().left)}`);
      })(),
    };
  };

  // A page that redirects (/ to /home, a gated page to /login) can replace
  // its document mid-measurement. Wait for it to settle and measure again;
  // only after three tries is the route recorded as unreadable, and the walk
  // goes on to the next one instead of dying.
  let data = null;
  for (let attempt = 0; attempt < 3 && !data; attempt += 1) {
    try {
      data = await page.evaluate(measure);
    } catch (e) {
      navErr = `measure: ${e.message.slice(0, 100)}`;
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  if (!data) {
    page.off('pageerror', onErr);
    page.off('console', onConsole);
    page.off('response', onResponse);
    return {
      route, url, navErr, title: null, overflow: false, scrollWidth: 0, innerWidth: 0,
      buttons: 0, buttonList: [], links: 0, linkList: [], inputs: 0, deadLinks: [], hashLinks: 0,
      smallTaps: 0, smallTapList: [], offscreen: [], shell: { sidebar: false, bottomMenu: false, under: [], covered: [] },
      shellWrong: null, pureBg: null, strokes: [], glows: [], looksEmpty: false, errorText: false, snippet: '',
      errors: [...new Set(errors)].slice(0, 12), netFails: [...new Set(netFails)].slice(0, 12),
    };
  }

  // dead links: internal hrefs pointing at a route that doesn't exist.
  // Static files under /public (PDFs, images) are valid targets too.
  const norm = (h) => decodeURIComponent(h.split('?')[0].split('#')[0]).replace(/\/$/, '') || '/';
  const known = new Set(allRoutes.map(norm));
  // A dynamic route matches any value in its bracketed segment: /u/[username]
  // is the page for /u/demo_organizer, which the parent-prefix rule below
  // cannot see because nothing lives at /u itself.
  const segment = (seg) => {
    if (seg.startsWith('[...')) return '.+';
    if (seg.startsWith('[') && seg.endsWith(']')) return '[^/]+';
    return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };
  const patterns = allRoutes
    .filter((r) => r.includes('['))
    .map((r) => new RegExp(`^${norm(r).split('/').map(segment).join('/')}$`));
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
        if (patterns.some((re) => re.test(n))) return false;
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
    smallTaps: data.smallTaps.length,
    smallTapList: data.smallTaps.slice(0, 8),
    offscreen: data.offscreen,
    shell: data.shell,
    shellWrong: (() => {
      const w = data.innerWidth;
      const phone = w < 1024;
      const want = phone ? (!data.shell.sidebar && data.shell.bottomMenu) : (data.shell.sidebar && !data.shell.bottomMenu);
      // Pages with no shell at all (sign in, embeds, overlays) draw neither, which is fine.
      const none = !data.shell.sidebar && !data.shell.bottomMenu;
      return want || none ? null : `${phone ? 'phone' : 'desktop'} width ${w} drew sidebar=${data.shell.sidebar} bottomMenu=${data.shell.bottomMenu}`;
    })(),
    pureBg: data.pureBg,
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
  if (VIEW.startsWith('tablet')) await page.setUserAgent(UA_TABLET);
  page.setDefaultTimeout(30000);

  // ---- auth ----
  let authNote = 'anonymous';
  // AS=anon walks signed out: the public site as a stranger arriving from a link.
  if (AS === 'anon') {
    authNote = 'anonymous';
  } else if (AS === 'admin') {
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

    const step1 = await fetch(`${API}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username_or_email: process.env.AUDIT_ADMIN_EMAIL || 'orga@vent.test', password: PASS }),
    });
    const s1 = await step1.json().catch(() => ({}));
    const secret = s1?.data?.secret || process.env.ADMIN_TOTP_SECRET;
    let j = {};
    if (s1?.data?.pending_token && secret) {
      const step2 = await fetch(`${API}/auth/login/2fa/verify/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pending_token: s1.data.pending_token, code: totpCode(secret) }),
      });
      j = await step2.json().catch(() => ({}));
    } else {
      console.error('[audit] admin 2FA: no secret available - set ADMIN_TOTP_SECRET');
    }
    const tok = j?.session_token || j?.data?.session_token;
    const adminObj = j?.user || j?.data?.admin || {};
    if (!tok) { console.error('[audit] admin login FAILED', JSON.stringify(j).slice(0, 300)); }
    // The console reads the site session, so the token goes through the same
    // door a person's does: NextAuth's external-token provider turns it into a
    // session cookie. It is never written to localStorage (R66).
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    const signed = await page.evaluate(async (t) => {
      const csrf = await fetch('/api/auth/csrf').then((r) => r.json());
      const form = new URLSearchParams({ csrfToken: csrf.csrfToken, token: t, json: 'true' });
      const res = await fetch('/api/auth/callback/external-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      });
      const session = await fetch('/api/auth/session').then((r) => r.json()).catch(() => ({}));
      return res.ok && Boolean(session?.user);
    }, tok || '');
    authNote = tok && signed ? `admin(${adminObj.username || USER})` : 'admin-login-FAILED';
  } else if (process.env.SESSION_JWT) {
    // A minted session cookie rather than a typed password.
    //
    // Faster, and it does not depend on the login form still having the same
    // three inputs in the same order - which is a brittle thing for an audit
    // harness to depend on, given the audit exists to find changes.
    await page.goto(`${BASE}/tournaments`, { waitUntil: 'domcontentloaded' });
    await page.setCookie({
      name: 'next-auth.session-token',
      value: process.env.SESSION_JWT,
      domain: new URL(BASE).hostname,
      path: '/',
    });
    authNote = 'user(session-jwt)';
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
      res.offscreen.length ? `OFFSCREEN×${res.offscreen.length}` : '',
      res.shellWrong ? 'SHELL' : '',
      res.shell.under.length ? `UNDERSIDEBAR×${res.shell.under.length}` : '',
      res.shell.covered.length ? `COVERED×${res.shell.covered.length}` : '',
      VIEW !== 'desktop' && VIEW !== 'wide' && res.smallTaps ? `SMALL×${res.smallTaps}` : '',
      res.pureBg ? 'PUREBG' : '',
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
  md.push(`# Audit walk - ${VIEW} · ${AS} (${authNote})`, '');
  md.push('| Route | Btn | Link | Input | Console err | Net 4xx/5xx | Overflow | Dead links | Empty |');
  md.push('|---|---|---|---|---|---|---|---|---|');
  for (const r of results) {
    md.push(`| \`${r.route}\` | ${r.buttons} | ${r.links} | ${r.inputs} | ${r.errors.length} | ${r.netFails.length} | ${r.overflow ? '**YES**' : ''} | ${r.deadLinks.length} | ${r.looksEmpty ? 'YES' : ''} |`);
  }
  md.push('', '## Details (only routes with findings)', '');
  for (const r of results) {
    if (!r.errors.length && !r.netFails.length && !r.overflow && !r.deadLinks.length
        && !r.offscreen.length && !r.pureBg && !r.looksEmpty && !r.navErr && !r.strokes.length && !r.glows.length
        && !r.shellWrong && !r.shell.under.length && !r.shell.covered.length) continue;
    md.push(`### \`${r.route}\``);
    if (r.navErr) md.push(`- navigation: ${r.navErr}`);
    if (r.looksEmpty) md.push(`- **renders near-empty** (text length ${r.snippet.length}): "${r.snippet}"`);
    if (r.overflow) md.push(`- **horizontal overflow**: scrollWidth ${r.scrollWidth} > viewport ${r.innerWidth}`);
    r.offscreen.forEach((o) => md.push(`- **off screen, unreachable**: ${o}`));
    if (r.shellWrong) md.push(`- **wrong shell**: ${r.shellWrong}`);
    if (VIEW !== 'desktop' && VIEW !== 'wide') r.smallTapList.forEach((o) => md.push(`- under 44px: ${o}`));
    r.shell.under.forEach((o) => md.push(`- **under the sidebar**: ${o}`));
    r.shell.covered.forEach((o) => md.push(`- **under the bottom menu at the end of the page**: ${o}`));
    if (r.pureBg) md.push(`- **pure black or white page surface**: ${r.pureBg}`);
    r.errors.forEach((e) => md.push(`- console: \`${e}\``));
    r.netFails.forEach((e) => md.push(`- network: \`${e}\``));
    if (r.deadLinks.length) md.push(`- dead links: ${r.deadLinks.map((d) => `\`${d}\``).join(', ')}`);
    r.strokes.forEach((sK) => md.push(`- hairline: \`${sK}\``));
    r.glows.forEach((g) => md.push(`- glow: \`${g}\``));
    md.push('');
  }
  fs.writeFileSync(path.join(OUT, 'report.md'), md.join('\n'));

  const bad = results.filter((r) => r.errors.length || r.netFails.length || r.overflow
    || r.deadLinks.length || r.offscreen.length || r.pureBg || r.strokes.length || r.glows.length
    || r.shellWrong || r.shell.under.length || r.shell.covered.length);
  console.log(`\n[audit] ${results.length} routes walked · ${bad.length} with findings · report: ${path.join(OUT, 'report.md')}`);
})();
