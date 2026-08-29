#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Does an uploaded HTML overlay actually fill itself from a live tournament?
 *
 * CEO, 29 August 2026: could any HTML file uploaded here have its player
 * images, team logos and standings driven by live data, and produce a URL to
 * paste into OBS.
 *
 * Reading the code does not answer that. What answers it is opening the URL in
 * a real browser, the way OBS does, and reading what is on the screen. So this
 * loads the overlay URL, waits for the runtime to say it has drawn, and
 * compares the rendered text against the feed the runtime fetched.
 *
 * It is deliberately end to end: Django serves the uploaded file, injects the
 * runtime, the runtime fetches the feed over HTTP, and Chrome renders it.
 * Nothing here is stubbed, because a stub would answer a different question.
 *
 * Usage:
 *   node scripts/overlay-probe.mjs <overlayUrl> [feedUrl]
 * With no arguments it reads OVERLAY_URL and FEED_URL from the environment.
 */

import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const OVERLAY = process.argv[2] || process.env.OVERLAY_URL;
const FEED = process.argv[3] || process.env.FEED_URL;

if (!OVERLAY || !FEED) {
  console.error('usage: node scripts/overlay-probe.mjs <overlayUrl> <feedUrl>');
  process.exit(2);
}

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.CHROME_PATH,
].filter(Boolean).find((p) => fs.existsSync(p));

if (!CHROME) {
  console.error('no Chrome found; set CHROME_PATH');
  process.exit(2);
}

const feed = await fetch(FEED).then((r) => r.json());
if (feed?.status !== 'success') {
  console.error('the feed did not answer');
  process.exit(1);
}
const data = feed.data;

// Which team the overlay is about. The runtime honours the overlay's own `?t=`,
// so the expectation has to as well: an earlier run of this compared against
// the first team, reported a mismatch, and the mismatch was the overlay
// correctly picking the team it had been pointed at.
const want = (new URL(OVERLAY).searchParams.get('t') || '').toUpperCase();
const chosen = data.teams.find((t) => String(t.tag).toUpperCase() === want)
  || data.teams[0] || {};

const expected = {
  title: data.tournament.title,
  teams: data.teams.length,
  topTag: chosen.tag || '',
  topName: chosen.name || '',
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--allow-insecure-localhost'],
});

const problems = [];
try {
  const page = await browser.newPage();
  // The size OBS uses, so a layout that only works at some other width is not
  // quietly passing here.
  await page.setViewport({ width: 1920, height: 1080 });

  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(String(e.message)));

  await page.goto(OVERLAY, { waitUntil: 'networkidle2', timeout: 30000 });
  // The runtime sets this once it has drawn from real data.
  await page.waitForSelector('html[data-vent-ready="1"]', { timeout: 20000 });

  const seen = await page.evaluate(() => {
    const text = (sel) => (document.querySelector(sel)?.textContent || '').trim();
    const rows = [...document.querySelectorAll('[data-vent-repeat] tr')];
    return {
      title: text('[data-vent="tournament.title"]'),
      tag: text('[data-vent="team.tag"]'),
      name: text('[data-vent="team.name"]'),
      rows: rows.length,
      firstRow: rows[0] ? [...rows[0].children].map((c) => c.textContent.trim()) : [],
      logo: document.querySelector('[data-vent-src="team.logo"]')?.getAttribute('src') || '',
      runtime: typeof window.VENTOverlay === 'object',
      ventData: typeof window.VENT === 'object',
    };
  });

  console.log('overlay URL:', OVERLAY);
  console.log('');
  console.log('  from the feed          rendered in the browser');
  console.log('  ---------------------  ---------------------------');
  console.log(`  ${expected.title.padEnd(21)}  ${seen.title}`);
  console.log(`  ${String(expected.teams).padEnd(21)}  ${seen.rows} rows in the repeat`);
  console.log(`  ${expected.topTag.padEnd(21)}  ${seen.tag}`);
  console.log(`  ${expected.topName.padEnd(21)}  ${seen.name}`);
  console.log('');
  console.log('  first standings row:', JSON.stringify(seen.firstRow));
  console.log('  window.VENT present:', seen.ventData);
  console.log('');

  if (seen.title !== expected.title) {
    problems.push(`the title rendered as "${seen.title}", the feed says "${expected.title}"`);
  }
  if (seen.rows !== expected.teams) {
    problems.push(`the repeat drew ${seen.rows} rows, the feed has ${expected.teams} teams`);
  }
  if (expected.topTag && seen.tag !== expected.topTag) {
    problems.push(`the team tag rendered as "${seen.tag}", the feed says "${expected.topTag}"`);
  }
  if (!seen.ventData) problems.push('window.VENT was never published');
  if (consoleErrors.length) {
    problems.push(`the page threw: ${consoleErrors.join('; ')}`);
  }
} finally {
  await browser.close();
}

if (problems.length) {
  console.log('PROBLEMS:');
  for (const p of problems) console.log(`  ${p}`);
  process.exit(1);
}
console.log('the overlay rendered from V-ENT data');
