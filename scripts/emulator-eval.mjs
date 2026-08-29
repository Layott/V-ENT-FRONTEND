#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Run an expression in the page that is open on the Android emulator.
 *
 * A screenshot shows what something looks like. It cannot show whether a strip
 * can be scrolled, whether a tap target is 44px, or whether the page overflows
 * its viewport by three pixels. Those are measurements, and the device is the
 * only place they are true: the emulator has a real address bar, a real status
 * bar, a real device pixel ratio and a real touch target size.
 *
 * Needs `adb forward tcp:9222 localabstract:chrome_devtools_remote` first.
 *
 * Usage:
 *   node scripts/emulator-eval.mjs "document.title"
 *   node scripts/emulator-eval.mjs --file probe.js
 */

import fs from 'node:fs';

const PORT = process.env.CDP_PORT || 9222;

const args = process.argv.slice(2);

// Which tab. The emulator accumulates tabs, and `/json/list` does not promise
// the visible one is first - a probe once measured a page loaded before the
// change it was checking, and reported the old numbers as the new ones.
let want = '';
const urlAt = args.indexOf('--url');
if (urlAt !== -1) {
  want = args[urlAt + 1];
  args.splice(urlAt, 2);
}

let expression;
if (args[0] === '--file') expression = fs.readFileSync(args[1], 'utf8');
else expression = args.join(' ');

if (!expression) {
  console.error('nothing to evaluate');
  process.exit(2);
}

const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
const pages = list.filter((t) => t.type === 'page' && !t.url.startsWith('devtools://'));

/** Evaluate an expression against one target and return its value. */
async function evaluateOn(target, source) {
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { ws.close(); reject(new Error('timeout')); }, 20000);
    ws.onopen = () => ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: { expression: source, returnByValue: true, awaitPromise: true },
    }));
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id !== 1) return;
      clearTimeout(timer);
      ws.close();
      if (msg.result?.exceptionDetails) {
        reject(new Error(msg.result.exceptionDetails.text + ' '
          + (msg.result.exceptionDetails.exception?.description || '')));
        return;
      }
      resolve(msg.result?.result?.value);
    };
    ws.onerror = (e) => { clearTimeout(timer); reject(new Error(String(e.message || e))); };
  });
}

// Chrome on the emulator restores every tab it has ever had, and neither the
// order of `/json/list` nor a URL match identifies the one on screen: there are
// commonly several tabs at the same address, all but one of them from before
// the change being measured. `visibilityState` is the only thing that answers
// which one a person is actually looking at.
let page = null;
const candidates = want ? pages.filter((t) => t.url.includes(want)) : pages;
for (const target of candidates) {
  try {
    if (await evaluateOn(target, 'document.visibilityState') === 'visible') {
      page = target;
      break;
    }
  } catch { /* a tab that will not answer is not the visible one */ }
}
if (!page) page = candidates[0];
if (!page) {
  if (want) {
    console.error(`no tab open at ${want}. Open tabs:`);
    for (const t of pages) console.error(`  ${t.url}`);
  } else {
    console.error('no page open on the emulator');
  }
  process.exit(1);
}
console.error(`# ${page.url}`);

const socket = new WebSocket(page.webSocketDebuggerUrl);
const result = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('the page did not answer in 20s')), 20000);
  socket.onopen = () => socket.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: { expression, returnByValue: true, awaitPromise: true },
  }));
  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id !== 1) return;
    clearTimeout(timer);
    socket.close();
    if (msg.result?.exceptionDetails) {
      reject(new Error(msg.result.exceptionDetails.text
        + ' ' + (msg.result.exceptionDetails.exception?.description || '')));
      return;
    }
    resolve(msg.result?.result?.value);
  };
  socket.onerror = (e) => { clearTimeout(timer); reject(new Error(String(e.message || e))); };
});

console.log(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
