#!/usr/bin/env node
/**
 * Press the studio console's controls, in a browser profile of its own.
 *
 * Why this exists. On 8 September six agents were working in one checkout and
 * sharing one Chrome. Cookies on localhost are shared across PORTS, so a
 * signout or a sign-in anywhere replaced the signed-in session everywhere, and
 * a console walk was interrupted twice. Each time the console correctly drew
 * nothing, because the account it had become did not run that tournament, which
 * reads exactly like a broken console.
 *
 * A separate `userDataDir` is a separate cookie jar. That is the whole fix.
 *
 *   node scripts/walk-console.mjs --slug <tournament> --user <name> \
 *        --password <pw> --code <six digits> [--site http://localhost:3005]
 *
 * The TOTP code is passed in rather than computed here: the secret belongs to
 * the backend and a walk harness has no business holding one. Generate it in
 * the same breath as running this, because it is valid for thirty seconds.
 */
import { execSync } from 'node:child_process';
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
const SLUG = arg('slug', 'vermillion-ea-fc-showdown');
const USER = arg('user', 'demo_organizer');
const PASSWORD = arg('password', 'VentDemo2026!');
const CODE = arg('code', '');
// A command that prints a fresh six digit code. Preferred over --code, because
// a TOTP lives thirty seconds and a dev server can spend longer than that
// compiling the login route: a code generated before the browser starts is
// usually dead by the time the form is ready.
const CODE_CMD = arg('code-cmd', '');
const SHOTS = path.join(ROOT, '..', 'tasks', 'audit', 'console-walk');

const steps = [];
const note = (ok, what, detail = '') => {
  steps.push({ ok, what, detail });
  console.log(`  ${ok ? 'pass' : 'FAIL'}  ${what.padEnd(46)} ${detail}`);
};

/** Type into the first input this page has that matches. */
async function fill(page, match, value) {
  const handle = await page.evaluateHandle((m) => {
    const inputs = [...document.querySelectorAll('input')];
    const wanted = inputs.find((i) => new RegExp(m, 'i').test(
      `${i.type} ${i.name} ${i.id} ${i.placeholder} ${i.getAttribute('aria-label') || ''}`));
    return wanted || null;
  }, match);
  const element = handle.asElement();
  if (!element) return false;
  await element.click({ clickCount: 3 });
  await element.type(value, { delay: 12 });
  return true;
}

/** Press the first button whose text matches. */
async function press(page, match) {
  return page.evaluate((m) => {
    const found = [...document.querySelectorAll('button')]
      .find((b) => new RegExp(m, 'i').test(b.textContent || ''));
    if (!found) return false;
    found.click();
    return true;
  }, match);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  const profile = path.join(ROOT, '.walk-profile');

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    userDataDir: profile,          // its own cookie jar. The point of the file.
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-first-run', '--no-default-browser-check'],
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(120000);
    page.setDefaultNavigationTimeout(120000);

    // domcontentloaded rather than networkidle: this app polls its own API for
    // live data, so the network never goes idle and a walk that waits for it
    // times out on a page that is perfectly fine.
    await page.goto(`${SITE}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => document.querySelectorAll('input').length >= 2, { timeout: 120000 });
    await fill(page, 'text|username|email', USER);
    await fill(page, 'password', PASSWORD);
    await press(page, '^log in$');
    await wait(4000);

    // Two factor, when the account has it. The console is behind it by design.
    const wantsCode = await page.evaluate(() => [...document.querySelectorAll('input')]
      .some((i) => i.maxLength === 6 || i.inputMode === 'numeric'));
    if (wantsCode) {
      const code = CODE_CMD
        ? execSync(CODE_CMD, { encoding: 'utf8' }).trim().split(/\s+/).pop()
        : CODE;
      if (!/^\d{6}$/.test(code || '')) {
        note(false, 'two factor', `no usable code (${code || 'none'})`);
        return;
      }
      await fill(page, 'code|otp|numeric|tel', code);
      await press(page, 'verify|continue|confirm|sign in|log in');
      await wait(6000);
    }

    const who = await page.evaluate(() => fetch('/api/auth/session')
      .then((r) => r.json()).then((s) => s?.user?.username || null).catch(() => null));
    if (who !== USER) {
      // Say WHY rather than just that it failed: the page's own message is the
      // difference between a wrong password, a dead code and a server that is
      // not answering.
      const said = await page.evaluate(() => (document.body.innerText || '')
        .split(String.fromCharCode(10)).filter(Boolean).slice(0, 6).join(' | '));
      note(false, 'signed in', `session says ${who}. Page says: ${said.slice(0, 140)}`);
      return;
    }
    note(true, 'signed in', `session says ${who}`);

    await page.goto(`${SITE}/tournaments/${SLUG}/manage?tab=production`,
                    { waitUntil: 'domcontentloaded' });
    // The console fetches after paint, and a dev server compiles this route on
    // the first hit, so it is waited for by CONTENT rather than by a timer.
    await page.waitForFunction(
      () => /Production studio/i.test(document.body.innerText || ''),
      { timeout: 120000 });
    note(true, 'console open', `${SLUG} production tab`);

    await press(page, '^Graphics$');
    await wait(2500);

    const named = await page.evaluate(() => {
      const text = document.body.innerText || '';
      return {
        raw: (text.match(/desk_lower_third|analyst_desk|play_area/g) || []).length,
        named: (text.match(/Desk lower third|Analyst desk|Play area/g) || []).length,
      };
    });
    note(named.raw === 0 && named.named > 0, 'the four kinds have names',
         `${named.named} named, ${named.raw} raw`);

    await page.screenshot({ path: path.join(SHOTS, 'graphics-list.png') });

    // The payload editor. Open the one for the desk and type a name into it.
    const opened = await press(page, 'Desk lower third');
    await wait(2000);
    const fields = await page.evaluate(() => [...document.querySelectorAll('input')]
      .map((i) => i.placeholder || i.name || i.id).filter(Boolean).slice(0, 12));
    note(opened, 'desk payload editor opens', fields.join(', ').slice(0, 90));

    await page.screenshot({ path: path.join(SHOTS, 'desk-editor.png') });

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
