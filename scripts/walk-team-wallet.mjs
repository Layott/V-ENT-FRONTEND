#!/usr/bin/env node
/**
 * Press the TEAM wallet's controls, in a browser profile of its own.
 *
 * Why this exists. The organisation wallet was walked by hand and the team one
 * was not, and they are the same component (`SharedWallet`) reached with a
 * different `kind`. "Same component" is an argument, not evidence: the two are
 * mounted by different pages, with different props, against different
 * endpoints, and that is exactly the seam where one of a pair gets forgotten.
 *
 * It borrows the cookie jar trick from `walk-console.mjs`. Cookies on localhost
 * are shared across PORTS, so with several agents in one Chrome a sign-in
 * anywhere replaces the session everywhere, and the wallet correctly draws a
 * stranger's view - which reads exactly like a broken wallet. A separate
 * `userDataDir` is a separate cookie jar, and that is the whole fix.
 *
 *   node scripts/walk-team-wallet.mjs --team rs-nigeria --user demo_organizer \
 *        --password 'VentDemo2026!' --pin 5182 --code <six digits> --to demo_chidi
 *
 * The TOTP code is passed in rather than computed here: the secret belongs to
 * the backend and a walk harness has no business holding one. It is valid for
 * one step either side of now, so generate it in the same breath as running
 * this, and warm the routes first or the dev server's first compile will eat
 * the window.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

function arg(name, fallback = '') {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? fallback : (process.argv[at + 1] || '');
}

const SITE = arg('site', 'http://localhost:3005');
const TEAM = arg('team', 'rs-nigeria');
const USER = arg('user', 'demo_organizer');
const PASSWORD = arg('password', 'VentDemo2026!');
const PIN = arg('pin', '5182');
const CODE = arg('code', '');
const TO = arg('to', 'demo_chidi');
const AMOUNT = arg('amount', '1');
const SHOTS = path.join(ROOT, '..', 'tasks', 'audit', 'team-wallet-walk');

const steps = [];
const note = (ok, what, detail = '') => {
  steps.push({ ok, what, detail });
  console.log(`  ${ok ? 'pass' : 'FAIL'}  ${what.padEnd(44)} ${detail}`);
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Type into the first input matching, the way a person would. */
async function fill(page, match, value) {
  const handle = await page.evaluateHandle((m) => {
    const inputs = [...document.querySelectorAll('input')];
    return inputs.find((i) => new RegExp(m, 'i').test(
      `${i.type} ${i.name} ${i.id} ${i.placeholder}`)) || null;
  }, match);
  const el = handle.asElement();
  if (!el) return false;
  await el.click({ clickCount: 3 });
  await el.type(value, { delay: 12 });
  return true;
}

async function press(page, match) {
  return page.evaluate((m) => {
    const found = [...document.querySelectorAll('button')]
      .find((b) => new RegExp(m, 'i').test((b.textContent || '').trim()));
    if (!found || found.disabled) return false;
    found.click();
    return true;
  }, match);
}

/** What the wallet panel currently says it holds. */
async function balance(page) {
  return page.evaluate(() => {
    const m = (document.body.innerText || '').match(/([\d,]+)\s*VC/);
    return m ? Number(m[1].replace(/,/g, '')) : null;
  });
}

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    userDataDir: path.join(ROOT, '.walk-profile-wallet'),
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-first-run', '--no-default-browser-check'],
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(120000);
    page.setDefaultNavigationTimeout(120000);

    // domcontentloaded, not networkidle: this app polls its own API, so the
    // network never goes idle and a walk that waits for it times out on a page
    // that is perfectly fine.
    await page.goto(`${SITE}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => document.querySelectorAll('input').length >= 2, { timeout: 120000 });
    await fill(page, 'text|username|email', USER);
    await fill(page, 'password', PASSWORD);
    await press(page, '^log in$');
    await wait(5000);

    const who = await page.evaluate(() => fetch('/api/auth/session')
      .then((r) => r.json()).then((s) => s?.user?.username || null).catch(() => null));
    note(who === USER, 'signed in', `session says ${who}`);
    if (who !== USER) return;

    // The team page, reached by its slug. No numeric id.
    //
    // The wallet tab is NOT addressable: this page keeps the active tab in
    // `useState('overview')` and never reads the URL, unlike the organisation
    // console which honours `?tab=`. So the walk has to press the tab, and a
    // link to somebody's team wallet cannot be shared. Worth fixing, but it is
    // this page's business rather than the wallet's.
    await page.goto(`${SITE}/teams/${TEAM}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => [...document.querySelectorAll('button')]
        .some((b) => /^Wallet$/i.test((b.textContent || '').trim())),
      { timeout: 120000 });
    note(true, 'team page open', TEAM);

    await press(page, '^Wallet$');
    await page.waitForFunction(
      () => /this team holds/i.test(document.body.innerText || ''),
      { timeout: 60000 });
    await wait(1200);

    const before = await balance(page);
    note(before !== null, 'team wallet panel open', `holds ${before} VC`);
    await page.screenshot({ path: path.join(SHOTS, 'team-wallet.png') });

    // Set the PIN through the SCREEN. Whoever holds the PIN holds the wallet,
    // so this is a spend control and only the right people should reach it.
    const hasSetPin = await fill(page, 'sw-newpin|new.*pin', PIN);
    if (hasSetPin) {
      await press(page, 'save|set.*pin');
      await wait(2500);
      note(true, 'PIN set from the screen', `set to ${PIN}`);
    } else {
      note(true, 'PIN already set', 'no set-pin field rendered');
    }

    // The send form: recipient, amount, PIN, and the code when the person has
    // enrolled a factor.
    await fill(page, 'sw-to', TO);
    await fill(page, 'sw-amount', AMOUNT);
    await fill(page, 'sw-note', 'Team wallet walk');
    await fill(page, 'sw-pin$', PIN);

    const wantsCode = await page.evaluate(() => !!document.querySelector('#sw-code'));
    if (wantsCode) {
      if (!CODE) {
        note(false, 'two factor', 'this account asks for a code and none was passed');
        return;
      }
      await fill(page, 'sw-code', CODE);
    }
    note(true, 'send form filled', wantsCode ? 'with a code' : 'no code asked for');

    // Enabled is not working. Press it, and read what it did.
    const enabled = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')]
        .find((x) => (x.textContent || '').trim() === 'Send');
      return b ? !b.disabled : null;
    });
    note(enabled === true, 'Send is enabled once the form is filled');

    const pressed = await press(page, '^Send$');
    await wait(4000);
    note(pressed, 'Send pressed');

    const after = await balance(page);
    const text = await page.evaluate(() => document.body.innerText || '');
    const moved = before !== null && after !== null && after === before - Number(AMOUNT);
    note(moved, 'the money actually moved',
         `${before} VC to ${after} VC, expected ${before - Number(AMOUNT)}`);
    note(/Team wallet walk/.test(text), 'the statement gained the line');

    await page.screenshot({ path: path.join(SHOTS, 'team-wallet-after.png') });

    // Mobile, because most people are on a phone and a wallet that overflows
    // its viewport is a wallet nobody can use.
    await page.setViewport({ width: 390, height: 844 });
    await wait(1500);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    note(overflow <= 1, 'no horizontal scroll at 390px', `overflow ${overflow}px`);
    await page.screenshot({ path: path.join(SHOTS, 'team-wallet-mobile.png') });

    const failed = steps.filter((s) => !s.ok).length;
    console.log(failed === 0
      ? `\n${steps.length} step(s), all passed`
      : `\n${failed} of ${steps.length} step(s) FAILED`);
    process.exitCode = failed === 0 ? 0 : 1;
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('walk failed:', err.message);
  process.exitCode = 1;
});
