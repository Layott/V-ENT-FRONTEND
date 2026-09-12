#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * The admin console, walked as three roles, in its own browser profile.
 *
 * The console was built and its endpoints were swept, and its SCREENS had
 * never been pressed. That is the gap this closes, and it is the gap that
 * matters here: this console has already shipped once with every button
 * enabled and inert, because nested html and body tags broke hydration and
 * nothing on the page threw.
 *
 * Its own profile, because localhost cookies are shared across PORTS and three
 * agents sharing one Chrome kept signing each other out mid-walk.
 *
 *   node scripts/walk-admin-roles.mjs
 *   node scripts/walk-admin-roles.mjs --base http://localhost:3005 --role fin_walk
 *
 * The accounts are local sqlite only and share one authenticator secret, so
 * the code is computed here rather than typed by a person.
 */
import puppeteer from 'puppeteer-core';
import { createHmac } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME_PATH
  || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const BASE = arg('--base', 'http://localhost:3005');
const ONLY = arg('--role', '');

const SECRET = process.env.WALK_TOTP_SECRET || 'IB7TWGVGKHVNQA5BWCJ5FNGWPYRZY6UG';
const PASSWORD = process.env.WALK_PASSWORD || 'VentDemo2026!';

/** RFC 6238, so the walk does not need a phone. */
function totp(secret, step = Math.floor(Date.now() / 1000 / 30)) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const ch of secret.replace(/=+$/, '').toUpperCase()) {
    const v = alphabet.indexOf(ch);
    if (v < 0) continue;
    bits += v.toString(2).padStart(5, '0');
  }
  const bytes = Buffer.from((bits.match(/.{8}/g) || []).map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeUInt32BE(Math.floor(step / 2 ** 32), 0);
  counter.writeUInt32BE(step >>> 0, 4);
  const mac = createHmac('sha1', bytes).update(counter).digest();
  const offset = mac[mac.length - 1] & 0x0f;
  const code = (mac.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  return String(code).padStart(6, '0');
}

/** Who, and what they are allowed to see. */
const ROLES = [
  {
    user: 'demo_temi',
    role: 'super admin',
    allowed: ['/admin', '/admin/users', '/admin/finance', '/admin/content',
              '/admin/admins', '/admin/organizations'],
    refused: [],
  },
  {
    user: 'fin_walk',
    role: 'financial manager',
    allowed: ['/admin', '/admin/finance'],
    refused: ['/admin/admins'],
  },
  {
    user: 'mod_only',
    role: 'moderator',
    allowed: ['/admin', '/admin/content'],
    refused: ['/admin/finance', '/admin/admins'],
  },
];

async function signIn(page, username) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 45000 });
  await page.waitForSelector('input', { timeout: 20000 });

  const typed = await page.evaluate((u, p) => {
    const set = (el, v) => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const inputs = [...document.querySelectorAll('input')];
    const user = inputs.find((i) => i.type !== 'password' && i.type !== 'search');
    const pass = inputs.find((i) => i.type === 'password');
    if (!user || !pass) return false;
    set(user, u);
    set(pass, p);
    return true;
  }, username, PASSWORD);
  if (!typed) throw new Error('the login form has no fields to type into');

  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')]
      .find((b) => /log ?in|sign ?in|continue/i.test(b.textContent) && !b.disabled);
    if (btn) btn.click();
  });

  // The second factor. One door: the code is taken at the ordinary login.
  await new Promise((r) => setTimeout(r, 3500));
  const needsCode = await page.evaluate(() => /code|authenticator|two/i
    .test(document.body.innerText || ''));
  if (needsCode) {
    await page.evaluate((code) => {
      const set = (el, v) => {
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      };
      const boxes = [...document.querySelectorAll('input')]
        .filter((i) => i.type !== 'search' && i.type !== 'password');
      if (boxes.length === 1) set(boxes[0], code);
      else boxes.slice(0, 6).forEach((b, i) => set(b, code[i]));
      const btn = [...document.querySelectorAll('button')]
        .find((b) => /verify|continue|confirm|sign/i.test(b.textContent) && !b.disabled);
      if (btn) btn.click();
    }, totp(SECRET));
    await new Promise((r) => setTimeout(r, 4000));
  }

  return page.evaluate(async () => {
    const s = await fetch('/api/auth/session').then((r) => r.json()).catch(() => null);
    return s && s.user ? (s.user.username || s.user.name || 'signed in') : null;
  });
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  userDataDir: mkdtempSync(join(tmpdir(), 'vent-admin-walk-')),
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

let failures = 0;

for (const who of ROLES) {
  if (ONLY && who.user !== ONLY) continue;
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 140)));

  try {
    const signedIn = await signIn(page, who.user);
    if (!signedIn) {
      failures += 1;
      console.log(`FAIL  ${who.user} (${who.role}) could not sign in`);
      continue;
    }
    console.log(`\n${who.user} (${who.role}) signed in as ${signedIn}`);

    for (const path of who.allowed) {
      await page.goto(BASE + path, { waitUntil: 'networkidle2', timeout: 45000 });
      await new Promise((r) => setTimeout(r, 2500));
      const seen = await page.evaluate(() => ({
        url: location.pathname,
        text: (document.body.innerText || '').length,
        buttons: [...document.querySelectorAll('button')]
          .filter((b) => !b.disabled).length,
        // The console's own wording for a section somebody may not open.
        refused: /not part of your role|not allowed|no permission|forbidden/i
          .test(document.body.innerText || ''),
      }));
      const ok = seen.url.startsWith('/admin') && seen.text > 300 && !seen.refused;
      if (!ok) failures += 1;
      console.log(`  ${ok ? 'ok  ' : 'FAIL'} sees ${path}  (${seen.text} chars, `
        + `${seen.buttons} live controls, at ${seen.url})`);
    }

    for (const path of who.refused) {
      await page.goto(BASE + path, { waitUntil: 'networkidle2', timeout: 45000 });
      await new Promise((r) => setTimeout(r, 2000));
      const seen = await page.evaluate(() => ({
        url: location.pathname,
        refused: /not part of your role|not allowed|no permission|forbidden|denied/i
          .test(document.body.innerText || ''),
        live: [...document.querySelectorAll('button')].filter((b) => !b.disabled).length,
      }));
      // Refused AND offering nothing. A screen that says no and still draws a
      // live write control is the fault this walk exists to catch: on
      // 8 September a moderator reached /admin/admins and was given a live
      // "Give somebody a role" button beside the refusal.
      const quiet = seen.live <= 1;   // the one link back to the dashboard
      const ok = (seen.refused && quiet) || !seen.url.startsWith(path);
      if (!ok) failures += 1;
      console.log(`  ${ok ? 'ok  ' : 'FAIL'} refused ${path}  (at ${seen.url}`
        + `${seen.refused ? ', says so' : ', SILENTLY'}`
        + `, ${seen.live} live control(s))`);
    }

    if (errors.length) {
      console.log(`  console errors: ${errors.length}`);
      errors.slice(0, 3).forEach((e) => console.log(`    ${e}`));
    }
  } catch (err) {
    failures += 1;
    console.log(`FAIL  ${who.user}: ${String(err.message).slice(0, 160)}`);
  } finally {
    // A context that has already gone takes the whole run down on close if
    // this is not guarded, and then a real result is lost to a teardown error.
    await context.close().catch(() => {});
  }
}

await browser.close();
console.log(failures === 0
  ? '\nevery role saw what it may and was refused what it may not'
  : `\n${failures} check(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
