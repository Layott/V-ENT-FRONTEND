#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Do the nine chipped names actually draw?
 *
 * Nine screens had a person's name written out by hand and now render through
 * `UserChip`. A checker reading 0 proves the source no longer writes a name
 * itself. It does NOT prove the chip drew one, and swapping a `<span>{name}</span>`
 * for a component is exactly the change that can render nothing at all when the
 * object it is handed has a different shape from the one it expects.
 *
 * So this opens the pages in a real browser, in its own profile so it cannot
 * fight the shared Chrome, and counts chips and names on screen.
 *
 *   node scripts/walk-chips.mjs
 *   node scripts/walk-chips.mjs --base http://localhost:3005
 */
import puppeteer from 'puppeteer-core';
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

/** Each page, and what has to be true on it. */
const PAGES = [
  // Each of these shows PEOPLE to a signed out reader, which is what makes
  // them checkable without a session. `least` is the point of the file: a page
  // that finds zero chips has either drawn nobody or matched nothing, and
  // those two look identical unless the check refuses a zero.
  { path: '/events/lagos-anime-con-2026', what: 'the organiser on an event', least: 1 },
  { path: '/tournaments/vermillion-ea-fc-showdown', what: 'the organiser on a tournament', least: 1 },
  { path: '/community', what: 'the feed, post authors', least: 1 },
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  userDataDir: mkdtempSync(join(tmpdir(), 'vent-chips-')),
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

let failures = 0;

for (const entry of PAGES) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });

  try {
    await page.goto(BASE + entry.path, { waitUntil: 'networkidle2', timeout: 45000 });
    // Nearly every page here is 'use client' and fetches its data in an effect,
    // so `networkidle2` returns while the screen is still a shell. Measuring
    // there reports zero chips on a page that draws six, which is a wrong
    // answer that looks like a clean one.
    await page.waitForSelector('[class*="user-chip"]', { timeout: 15000 })
      .catch(() => {});
    await new Promise((r) => setTimeout(r, 1500));
    // The chip renders its own text span, so a chip on screen is a name on
    // screen. Read the drawn text rather than the markup: a component that
    // returns null still leaves its wrapper behind.
    const seen = await page.evaluate(() => {
      const chips = [...document.querySelectorAll('[class*="user-chip"], [class*="userChip"]')];
      const drawn = chips.filter((c) => (c.innerText || '').trim().length > 0);
      return {
        chips: chips.length,
        drawn: drawn.length,
        sample: drawn.slice(0, 3).map((c) => c.innerText.trim().split('\n')[0]),
        bodyLength: (document.body.innerText || '').length,
      };
    });

    const empty = seen.chips - seen.drawn;
    const ok = seen.bodyLength > 200 && empty === 0 && seen.drawn >= entry.least;
    if (!ok) failures += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'}  ${entry.path}  ${entry.what}`);
    console.log(`        chips ${seen.chips}, drawn ${seen.drawn}, empty ${empty}, wanted at least ${entry.least}`
      + (seen.sample.length ? `, e.g. ${seen.sample.join(' | ')}` : ''));
    if (errors.length) {
      console.log(`        console errors: ${errors.length}`);
      errors.slice(0, 2).forEach((e) => console.log(`          ${e}`));
    }
  } catch (err) {
    failures += 1;
    console.log(`FAIL  ${entry.path}  ${String(err.message).slice(0, 120)}`);
  } finally {
    await page.close();
  }
}

await browser.close();
console.log(failures === 0
  ? `${PAGES.length} page(s) walked, every chip on screen drew a name`
  : `${failures} page(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
