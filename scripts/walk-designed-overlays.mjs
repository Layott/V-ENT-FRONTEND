#!/usr/bin/env node
/**
 * Walk the designed overlays (inbox 390): edit, upload a logo, save, download
 * the PNG and the see-through video, and shoot the OBS pages.
 *
 * A headless Chrome of its own, with its own cookie jar (see walk-console.mjs),
 * because the video export records in real time and a hidden tab records at a
 * trickle. The downloads land in --out; check them with ffprobe afterwards:
 *
 *   node scripts/walk-designed-overlays.mjs --tournament a5-organiser-view \
 *        --user demo_temi --code-cmd "<command printing a fresh TOTP code>" \
 *        --logo <a png to upload> --out <folder>
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const arg = (name, fallback = '') => {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? fallback : (process.argv[at + 1] || '');
};
const SITE = arg('site', 'http://localhost:3005');
const TOURNAMENT = arg('tournament', 'a5-organiser-view');
const USER = arg('user', 'demo_temi');
const PASSWORD = arg('password', 'VentDemo2026!');
const CODE_CMD = arg('code-cmd', '');
const LOGO = arg('logo', '');
const OUT = path.resolve(arg('out', path.join(ROOT, '.walk-overlays')));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const note = (ok, what, detail = '') => {
  results.push({ ok, what, detail });
  console.log(`  ${ok ? 'pass' : 'FAIL'}  ${what.padEnd(46)} ${detail}`);
};

async function fill(page, match, value) {
  const el = (await page.evaluateHandle((m) => [...document.querySelectorAll('input')]
    .find((i) => new RegExp(m, 'i').test(`${i.type} ${i.name} ${i.id} ${i.placeholder}`)) || null, match)).asElement();
  if (!el) return false;
  await el.click({ clickCount: 3 });
  await el.type(value, { delay: 10 });
  return true;
}
const press = (page, match, within = null) => page.evaluate((m, w) => {
  const root = w ? [...document.querySelectorAll('div')].filter((d) => d.textContent.includes(w)
    && d.querySelector('canvas[role=img]')).sort((a, b) => a.textContent.length - b.textContent.length)[0] : document;
  const b = [...(root || document).querySelectorAll('button')].find((x) => new RegExp(m, 'i').test((x.textContent || '').trim()));
  if (!b || b.disabled) return false;
  b.click();
  return true;
}, match, within);

/** Open one graphic's card in the console by its (English) name. */
const openCard = (page, label) => page.evaluate((l) => {
  const cards = [...document.querySelectorAll('div')].filter((d) => d.textContent.includes(l)
    && [...d.querySelectorAll('button')].some((b) => /^(Open|Close)$/.test(b.textContent.trim())));
  const card = cards.sort((a, b) => a.textContent.length - b.textContent.length)[0];
  const open = card && [...card.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Open');
  if (open) open.click();
  return Boolean(card);
}, label);

/** Wait for a new file in OUT that is not still being written. */
async function download(before, ext, ms = 60000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const now = fs.readdirSync(OUT).filter((f) => f.endsWith(ext) && !before.includes(f));
    if (now.length) { await wait(800); return now[0]; }
    await wait(400);
  }
  return null;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  for (const f of fs.readdirSync(OUT)) fs.rmSync(path.join(OUT, f), { force: true, recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new', userDataDir: path.join(ROOT, '.walk-profile-overlays'),
    defaultViewport: { width: 1440, height: 1000 },
    args: ['--no-first-run', '--no-default-browser-check'],
  });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(120000);
    const cdp = await page.createCDPSession();
    await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: OUT });

    await page.goto(`${SITE}/login`, { waitUntil: 'domcontentloaded' });
    let who = await page.evaluate(() => fetch('/api/auth/session').then((r) => r.json()).then((s) => s?.user?.username).catch(() => null));
    if (who !== USER) {
      await page.waitForFunction(() => document.querySelectorAll('input').length >= 2);
      await fill(page, 'text|username|email', USER);
      await fill(page, 'password', PASSWORD);
      await press(page, '^log in$');
      await wait(3500);
      if (CODE_CMD && await page.evaluate(() => /six digits|authenticator/i.test(document.body.innerText))) {
        await fill(page, '000000|code|one-time|otp|numeric', execSync(CODE_CMD).toString().trim());
        await press(page, '^(verify|confirm|continue|sign in|log in)');
        await wait(4000);
      }
      who = await page.evaluate(() => fetch('/api/auth/session').then((r) => r.json()).then((s) => s?.user?.username).catch(() => null));
    }
    note(who === USER, 'signed in', String(who));
    if (who !== USER) return;

    await page.goto(`${SITE}/tournaments/${TOURNAMENT}/manage?tab=production`, { waitUntil: 'domcontentloaded' });
    // The cards, not just the words: a slot list can say "Starting soon" before
    // the graphics list has drawn its cards.
    await page.waitForFunction(() => [...document.querySelectorAll('button')]
      .filter((b) => b.textContent.trim() === 'Open').length > 10);
    note(await openCard(page, 'Starting soon'), 'Starting soon card opens');
    await page.waitForSelector('canvas[role=img]');
    await wait(2500);

    // Edit: words and a colour, then a logo upload.
    const edited = await page.evaluate(() => {
      const set = (el, v) => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      };
      const byLabel = (t) => [...document.querySelectorAll('label')].find((l) => l.textContent.trim().startsWith(t));
      const top = byLabel('Top line')?.querySelector('input');
      const from = byLabel('Background, dark corner')?.querySelectorAll('input')[1];
      if (!top || !from) return false;
      set(top, 'MATCHDAY IS');
      set(from, '#0A2A6B');
      return true;
    });
    note(edited, 'typed words and a colour');
    // Inbox 392: the preview changes live, and the edit does not replay the
    // entrance (the grid, drawn in the first 0.7 s, must still be there).
    await wait(300);
    const live = await page.evaluate(() => {
      const c = document.querySelector('canvas[role=img]');
      const x = c.getContext('2d');
      const bg = x.getImageData(60, 60, 1, 1).data;
      const grid = x.getImageData(23, 300, 1, 1).data;
      const beside = x.getImageData(40, 300, 1, 1).data;
      return { bg: [...bg], blue: bg[2] > bg[0], gridShows: grid[0] + grid[1] + grid[2] > beside[0] + beside[1] + beside[2] + 12 };
    });
    note(live.blue && live.gridShows, 'preview changed live, no replay', JSON.stringify(live));
    if (LOGO) {
      await press(page, '^Upload$');
      const input = await page.$('input[type=file][accept*="image/png"]');
      await input.uploadFile(LOGO);
      await page.waitForFunction(() => /Uploaded\./.test(document.body.innerText), { timeout: 60000 }).catch(() => {});
      note(await page.evaluate(() => /Uploaded\./.test(document.body.innerText)), 'uploaded a logo, picked for the overlay');
    }
    await wait(2500);
    await page.screenshot({ path: path.join(OUT, 'console-starting-soon.png') });
    note(await press(page, '^Save$'), 'Save pressed');
    await page.waitForFunction(() => /^Saved\./m.test(document.body.innerText), { timeout: 30000 }).catch(() => {});
    note(await page.evaluate(() => /Saved\./.test(document.body.innerText)), 'saved');

    let before = fs.readdirSync(OUT);
    await press(page, '^Download picture');
    const png = await download(before, '.png');
    note(Boolean(png), 'PNG downloaded', png || '');
    before = fs.readdirSync(OUT);
    await press(page, '^Download video');
    const vid1 = await download(before, '.webm', 90000);
    note(Boolean(vid1), 'Starting soon video downloaded', vid1 || '');

    // Its browser source address, read while the card is open.
    const soonUrl = await page.evaluate(() => [...document.querySelectorAll('p')].map((p) => p.textContent)
      .find((t) => /\/studio\/.*\/starting_soon\//.test(t)) || '');

    // The transition.
    await press(page, '^Close$');
    await wait(800);
    note(await openCard(page, 'Transition'), 'Transition card opens');
    await wait(2500);
    await page.evaluate(() => {
      const byLabel = (t) => [...document.querySelectorAll('label')].find((l) => l.textContent.trim().startsWith(t));
      const a = byLabel('First colour')?.querySelectorAll('input')[1];
      if (a) {
        // A colour other than the one saved, so Save has something to save.
        const next = a.value.toUpperCase() === '#FFD602' ? '#00B3FF' : '#FFD602';
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(a, next);
        a.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await wait(500);
    note(await press(page, '^Save$'), 'transition recoloured and saved');
    await wait(1500);
    before = fs.readdirSync(OUT);
    await press(page, '^Download video');
    const vid2 = await download(before, '.webm', 90000);
    note(Boolean(vid2), 'transition video downloaded', vid2 || '');
    note(await page.evaluate(() => /Transition Point \d/.test(document.body.innerText)), 'OBS stinger note shown');
    // Read while the transition card is open, before the walk moves on.
    const urls = await page.evaluate(() => [...document.querySelectorAll('p')].map((p) => p.textContent)
      .filter((t) => /\/studio\//.test(t)));

    // The overlay style (inbox 393): a primary colour set once in Look reaches
    // every overlay field that follows it, live in the previews and on air
    // after Save, while a field changed on one overlay (the dark corner above)
    // keeps its own value.
    await press(page, '^Close$');
    note(await press(page, '^Look$'), 'Look section opens');
    await page.waitForFunction(() => /Overlay style/i.test(document.body.innerText), { timeout: 30000 }).catch(() => {});
    await wait(1500);
    const styled = await page.evaluate(async () => {
      const byLabel = (t) => [...document.querySelectorAll('label')].find((l) => l.textContent.trim().startsWith(t));
      const box = byLabel('Primary colour')?.querySelectorAll('input')[1];
      if (!box) return { ok: false };
      // Green or a darker green, whichever is not saved, so Save has work.
      const next = box.value.toUpperCase() === '#00A86B' ? '#10C070' : '#00A86B';
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(box, next);
      box.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 400));
      const c = document.querySelector('canvas[role=img]');
      const px = c.getContext('2d').getImageData(1900, 1060, 1, 1).data;
      return { ok: true, corner: [...px], green: px[1] > px[0] };
    });
    note(styled.ok && styled.green, 'style preview turned green at once', JSON.stringify(styled.corner || ''));
    note(await press(page, '^Save$'), 'style saved');
    await page.waitForFunction(() => /Every overlay that follows the style has changed/.test(document.body.innerText), { timeout: 30000 }).catch(() => {});
    note(await page.evaluate(() => /Every overlay that follows the style has changed/.test(document.body.innerText)), 'style save confirmed');

    // The browser sources, as OBS would load them.
    const find = (k) => (k === 'starting_soon' ? soonUrl : urls.find((u) => u.includes(`/${k}/`)));
    for (const [kind, at] of [['starting_soon', 2600], ['transition', 900]]) {
      const url = find(kind);
      if (!url) { note(false, `${kind} URL on the card`); continue; }
      const obs = await browser.newPage();
      await obs.setViewport({ width: 1920, height: 1080 });
      // The uploaded logo has to reach the browser source, not just the
      // console's own exports (the list-versus-key fault of 30 September).
      const pictures = [];
      obs.on('response', (r) => { if (/\/studio-media\//.test(r.url())) pictures.push(r.status()); });
      await obs.goto(`${url}?preview=1`, { waitUntil: 'domcontentloaded' });
      await obs.waitForSelector('canvas', { timeout: 30000 }).catch(() => {});
      await wait(at);
      await obs.screenshot({ path: path.join(OUT, `obs-${kind}.png`), omitBackground: true });
      note(Boolean(await obs.$('canvas')), `${kind} browser source draws`);
      if (kind === 'starting_soon' && LOGO) note(pictures.some((s) => s === 200 || s === 304), 'browser source loads the uploaded logo', pictures.join(','));
      if (kind === 'starting_soon') {
        // The bright corner follows the style's primary (green); the dark
        // corner was changed on this overlay (blue) and must stay blue.
        const corners = await obs.evaluate(() => {
          const x = document.querySelector('canvas').getContext('2d');
          return { bright: [...x.getImageData(1900, 1060, 1, 1).data], dark: [...x.getImageData(20, 20, 1, 1).data] };
        });
        note(corners.bright[1] > corners.bright[0] && corners.dark[2] > corners.dark[0],
          'on air: style colour followed, own colour kept', JSON.stringify(corners));
      }
      await obs.close();
    }
    // Every other design of the set (inbox 394) draws on its browser source:
    // pixels on the canvas once its entrance is over.
    const base = find('transition');
    for (const kind of ['brb', 'stream_ended', 'champions', 'streamer_single', 'streamer_double',
      'streamer_gameplay', 'name_tag', 'match_lower_third']) {
      if (!base) break;
      const obs = await browser.newPage();
      await obs.setViewport({ width: 1920, height: 1080 });
      await obs.goto(`${base.replace('/transition/', `/${kind}/`)}?preview=1`, { waitUntil: 'domcontentloaded' });
      await obs.waitForSelector('canvas', { timeout: 30000 }).catch(() => {});
      await wait(3600);
      const inked = await obs.evaluate(() => {
        const c = document.querySelector('canvas');
        if (!c) return 0;
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        let n = 0;
        for (let i = 3; i < d.length; i += 4 * 97) if (d[i] > 0) n += 1;
        return n;
      });
      note(inked > 50, `${kind} browser source draws`, `${inked} sampled pixels`);
      await obs.close();
    }
  } finally {
    await browser.close();
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`${results.length - failed}/${results.length} steps passed, files in ${OUT}`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
