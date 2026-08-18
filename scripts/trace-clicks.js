#!/usr/bin/env node
/* eslint-disable no-console */
// Trace sidebar navigation: after demo-login, click each sidebar link and log
// the final URL. Helps diagnose "pages take me back to landing" bug.

const puppeteer = require('puppeteer-core');

const BASE = process.env.SMOKE_BASE || 'http://localhost:3001';
const CHROME = process.env.CHROME_BIN ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const LINKS = [
  '/home',
  '/user-profile',
  '/tournaments',
  '/events',
  '/teams',
  '/rankings',
  '/wallets',
  '/production',
  '/anime',
  '/community',
  '/organizations',
  '/marketplace',
  '/shop',
  '/wager',
  '/settings',
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();

  // Log in via demo
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('button', { timeout: 5000 });
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button'))
      .find((b) => b.textContent?.toLowerCase().includes('try demo account'));
    if (btn) btn.click();
  });
  await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 20000 }).catch(() => {});

  console.log('Starting URL after login:', page.url());
  console.log('---');

  for (const href of LINKS) {
    try {
      await page.goto(`${BASE}${href}`, { waitUntil: 'networkidle0', timeout: 20000 });
      await new Promise((r) => setTimeout(r, 800));
      const finalUrl = page.url();
      const reached = finalUrl.endsWith(href) || finalUrl.includes(href + '?') || finalUrl.includes(href + '#');
      const tag = reached ? 'OK ' : 'XX ';
      console.log(`${tag} ${href.padEnd(20)} → ${finalUrl.replace(BASE, '')}`);
    } catch (e) {
      console.log(`ER ${href.padEnd(20)} → ${e.message}`);
    }
  }

  await browser.close();
})();
