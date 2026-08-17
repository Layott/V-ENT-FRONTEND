#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Focused smoke test for the V-ENT wallet rebuild. Walks every wallet route
 * after a demo login and prints any console errors / failed requests.
 *
 * Usage: SMOKE_BASE=http://localhost:3005 node scripts/smoke-wallet.js
 */
const puppeteer = require('puppeteer-core');

const BASE = process.env.SMOKE_BASE || 'http://localhost:3000';
const CHROME = process.env.CHROME_BIN ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const ROUTES = [
  { path: '/wallets', label: 'Wallet overview' },
  { path: '/wallets/topup', label: 'Top up flow' },
  { path: '/wallets/send', label: 'Send flow' },
  { path: '/wallets/withdraw', label: 'Withdraw flow' },
  { path: '/wallets/history', label: 'Transaction history' },
];

const IGNORE = [
  'favicon', 'Download the React DevTools', 'next-auth][warn][DEBUG_ENABLED',
  'preloaded using link preload', 'was preloaded using', 'Images loaded lazily',
  'react-scan', 'Hydration failed',
];
const isIgnorable = (t) => !t || IGNORE.some((p) => t.includes(p));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  page.setDefaultTimeout(30000);

  const perPage = {};
  let current = { path: '', label: '' };
  const record = (kind, detail) => {
    if (isIgnorable(detail)) return;
    const key = current.path || 'pre-test';
    perPage[key] = perPage[key] || { label: current.label, errors: [], warns: [], fails: [] };
    perPage[key][kind].push(detail);
  };

  page.on('pageerror', (err) => record('errors', `pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') record('errors', `console.error: ${msg.text()}`);
    else if (msg.type() === 'warning') record('warns', `console.warn: ${msg.text()}`);
  });
  page.on('requestfailed', (req) => record('fails', `requestfailed: ${req.url()} — ${req.failure()?.errorText || '?'}`));
  page.on('response', (res) => {
    const url = res.url();
    const s = res.status();
    if (s >= 400 && !url.includes('/favicon') && !url.includes('hot-update')) {
      record('fails', `HTTP ${s}: ${url}`);
    }
  });

  // Login as demo. We don't wait for navigation to /home because /home has a
  // pre-existing webpack chunk issue in dev that's unrelated to wallet work.
  // After clicking demo login we just wait a beat for the auth cookie to land.
  current = { path: '/login', label: 'Demo login' };
  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 1500));
    await page.waitForSelector('button', { timeout: 10000 });
    const clicked = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button'))
        .find((b) => b.textContent && b.textContent.trim().toLowerCase().includes('try demo account'));
      if (btn) { btn.click(); return true; }
      return false;
    });
    if (!clicked) record('errors', 'No demo button on /login');
    // Give auth a beat — don't wait for /home redirect (pre-existing issue).
    await new Promise((r) => setTimeout(r, 4000));
  } catch (e) {
    record('errors', `login: ${e.message}`);
  }

  // Walk each wallet route. Use domcontentloaded — networkidle0 hangs in dev
  // when there's an open WebSocket for HMR.
  for (const r of ROUTES) {
    current = { path: r.path, label: r.label };
    try {
      await page.goto(`${BASE}${r.path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await new Promise((res) => setTimeout(res, 2500));
      // Quick health check: is the page object visible?
      const titleVisible = await page.evaluate(() => {
        return !!document.querySelector('h1, h2, [class*="balanceNumber"], [class*="formCardTitle"]');
      });
      if (!titleVisible) record('errors', `Page rendered no recognisable wallet UI`);
    } catch (e) {
      record('errors', `nav: ${e.message}`);
    }
  }

  await browser.close();

  const keys = Object.keys(perPage);
  if (!keys.length) {
    console.log('All wallet pages clean.');
    process.exit(0);
  }

  let hasErrors = false;
  for (const k of keys) {
    const p = perPage[k];
    if (!p.errors.length && !p.fails.length && !p.warns.length) continue;
    console.log(`\n> ${k}  (${p.label})`);
    for (const e of p.errors) { hasErrors = true; console.log(`  X ${e}`); }
    for (const f of p.fails) { hasErrors = true; console.log(`  X ${f}`); }
    for (const w of p.warns) { console.log(`  ! ${w}`); }
  }

  process.exit(hasErrors ? 1 : 0);
})().catch((err) => { console.error('smoke-wallet failed:', err); process.exit(2); });
