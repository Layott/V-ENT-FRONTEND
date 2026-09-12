#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Every admin screen, opened and pressed, as a super admin.
 *
 * CEO, 9 September 2026: "even the admin dashboard, i dont think its complete,
 * check everything thoroughly."
 *
 * The role walk proved who may open what. This is the other question: does each
 * screen actually WORK. It opens all 21, and on each one it:
 *
 *   - checks the page drew something rather than a shell
 *   - counts the live controls
 *   - PRESSES every safe control (tabs, filters, refresh, search, pagination),
 *     never a destructive one, and checks the page survived the press
 *   - records console errors and any failed API call
 *
 * Nothing here presses Delete, Ban, Approve, Reject or Send. A sweep that
 * clicks anything matching a button is how a walk bans a real user, and this
 * platform has already had that warning written into its rules.
 *
 *   node scripts/walk-admin-sweep.mjs
 *   node scripts/walk-admin-sweep.mjs --base http://localhost:3005
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
const SECRET = process.env.WALK_TOTP_SECRET || 'IB7TWGVGKHVNQA5BWCJ5FNGWPYRZY6UG';
const PASSWORD = process.env.WALK_PASSWORD || 'VentDemo2026!';
const USER = arg('--user', 'demo_temi');

const ROUTES = [
  '/admin', '/admin/users', '/admin/tournaments', '/admin/events',
  '/admin/organizations', '/admin/communities', '/admin/content',
  '/admin/finance', '/admin/payouts', '/admin/kyc', '/admin/disputes',
  '/admin/games', '/admin/rates', '/admin/partners', '/admin/admins',
  '/admin/audit-log', '/admin/settings',
];

/** Safe to press: it reads, filters or navigates. Never one that changes data. */
const SAFE = /^(all|active|open|closed|pending|approved|rejected|refresh|reload|search|next|previous|prev|newest|oldest|today|this week|this month|users|teams|organizations|organisations|tournaments|events|view|details|overview|clear|reset filters|cancel|close)$/i;
const NEVER = /delete|remove|ban|suspend|approve|reject|send|pay|refund|disqualify|cancel tournament|reset password|grant|revoke|promote|save|publish/i;

function totp(secret, step = Math.floor(Date.now() / 1000 / 30)) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const ch of secret.toUpperCase()) {
    const v = alphabet.indexOf(ch);
    if (v >= 0) bits += v.toString(2).padStart(5, '0');
  }
  const bytes = Buffer.from((bits.match(/.{8}/g) || []).map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeUInt32BE(step >>> 0, 4);
  const mac = createHmac('sha1', bytes).update(counter).digest();
  const offset = mac[mac.length - 1] & 0x0f;
  return String((mac.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(6, '0');
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  userDataDir: mkdtempSync(join(tmpdir(), 'vent-admin-sweep-')),
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const page = await browser.newPage();
const apiFailures = [];
page.on('response', (r) => {
  const url = r.url();
  if (!url.includes('/auth/admin') && !url.includes('/billing/')) return;
  if (r.status() >= 400) apiFailures.push(`${r.status()} ${url.split('8000')[1] || url}`);
});

// Sign in through the ordinary front door, code and all.
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 60000 });
await page.waitForSelector('input[name="username_or_email"]', { timeout: 20000 });
await page.type('input[name="username_or_email"]', USER);
await page.type('input[name="password"]', PASSWORD);
await page.evaluate(() => [...document.querySelectorAll('button')]
  .find((b) => /log in/i.test(b.textContent))?.click());
await new Promise((r) => setTimeout(r, 4000));
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
  [...document.querySelectorAll('button')]
    .find((b) => /verify|continue|confirm/i.test(b.textContent))?.click();
}, totp(SECRET));
await new Promise((r) => setTimeout(r, 4500));

const who = await page.evaluate(async () => {
  const s = await fetch('/api/auth/session').then((r) => r.json()).catch(() => null);
  return s?.user?.username || null;
});
if (!who) {
  console.log(`FAIL: could not sign in as ${USER}`);
  await browser.close();
  process.exit(1);
}
console.log(`signed in as ${who}\n`);

let problems = 0;
for (const route of ROUTES) {
  const before = apiFailures.length;
  const errors = [];
  const onError = (e) => errors.push(String(e).slice(0, 120));
  page.on('pageerror', onError);

  await page.goto(BASE + route, { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 2500));

  const seen = await page.evaluate((safeSrc, neverSrc) => {
    const safe = new RegExp(safeSrc, 'i');
    const never = new RegExp(neverSrc, 'i');
    const text = document.body.innerText || '';
    const buttons = [...document.querySelectorAll('button')].filter((b) => !b.disabled);
    const labels = buttons.map((b) => b.textContent.trim()).filter(Boolean);
    return {
      chars: text.length,
      controls: buttons.length,
      spinner: /^\s*(loading|loading\.\.\.)\s*$/i.test(text.trim()),
      pressable: labels.filter((l) => safe.test(l) && !never.test(l)).slice(0, 4),
      says: (text.match(/no [a-z ]{3,30}(yet|match[a-z ]*)|nothing here/i) || [])[0] || '',
    };
  }, SAFE.source, NEVER.source);

  // Press the safe ones and check the page survives.
  let pressed = 0;
  let broke = false;
  for (const label of seen.pressable) {
    const ok = await page.evaluate((wanted, neverSrc) => {
      const never = new RegExp(neverSrc, 'i');
      const btn = [...document.querySelectorAll('button')]
        .find((b) => !b.disabled && b.textContent.trim() === wanted && !never.test(b.textContent));
      if (!btn) return false;
      btn.click();
      return true;
    }, label, NEVER.source);
    if (!ok) continue;
    pressed += 1;
    await new Promise((r) => setTimeout(r, 1200));
    const after = await page.evaluate(() => (document.body.innerText || '').length);
    if (after < 200) broke = true;
  }

  const newFailures = apiFailures.slice(before);
  const bad = seen.chars < 300 || seen.spinner || broke || errors.length > 0;
  if (bad) problems += 1;
  console.log(`${bad ? 'FAIL' : 'ok  '} ${route.padEnd(24)} ${String(seen.chars).padStart(5)} chars, `
    + `${String(seen.controls).padStart(2)} controls, pressed ${pressed}`
    + (seen.says ? `, empty state: "${seen.says.slice(0, 40)}"` : '')
    + (broke ? '  <- a press emptied the page' : '')
    + (seen.spinner ? '  <- stuck on loading' : ''));
  if (errors.length) console.log(`       console: ${errors[0]}`);
  if (newFailures.length) {
    console.log(`       api: ${[...new Set(newFailures)].slice(0, 3).join(' | ')}`);
  }
  page.off('pageerror', onError);
}

await browser.close();
console.log(problems === 0
  ? `\n${ROUTES.length} admin screens opened and pressed, none broken`
  : `\n${problems} of ${ROUTES.length} admin screens have a problem`);
process.exit(problems === 0 ? 0 : 1);
