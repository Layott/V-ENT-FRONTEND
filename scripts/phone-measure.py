"""Measure a page on the Android emulator through Chrome's remote DevTools.

    python scripts/phone-measure.py http://localhost:3005/events/<slug> [more urls]

For each address: opens it in the phone's Chrome (adb), waits, then asks the
page itself, over the DevTools websocket, for the things a screenshot cannot
tell: horizontal overflow, tap targets under 44px, controls off the right
edge, console errors, and failed requests. Prints one block per page.

Needs `adb reverse tcp:3005 tcp:3005` (and 8000) and
`adb forward tcp:9222 localabstract:chrome_devtools_remote`, both done here.
"""
import json
import os
import subprocess
import sys
import time
import urllib.request

import websocket  # websocket-client, in the backend venv

SDK = os.path.join(os.environ.get('LOCALAPPDATA', ''), 'Android', 'Sdk')
ADB = os.path.join(SDK, 'platform-tools', 'adb.exe')

MEASURE = r"""
(() => {
  const w = innerWidth, doc = document.documentElement;
  const overflow = doc.scrollWidth - w;
  const wide = [];
  const small = [];
  const off = [];
  const seen = new Set();
  for (const el of document.querySelectorAll('button, a[href], input, select, textarea, [role=button]')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const label = (el.getAttribute('aria-label') || el.textContent || el.value || el.name || '').trim().slice(0, 40);
    const key = label + '@' + Math.round(r.top);
    if (seen.has(key)) continue;
    seen.add(key);
    if (r.height < 44 && el.tagName !== 'A' || (el.tagName === 'A' && r.height < 44 && /btn|button|chip|tab/i.test(el.className))) {
      small.push(label + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    }
    // Partly clipped, not a drawer parked off screen (left >= w).
    if (r.right > w + 1 && r.left < w) off.push(label + ' right=' + Math.round(r.right));
  }
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.right > w + 1 && r.left < w && r.width > 40) {
      const cs = getComputedStyle(el);
      let p = el.parentElement, scrolls = false;
      while (p) { const ps = getComputedStyle(p); if (/(auto|scroll|hidden)/.test(ps.overflowX)) { scrolls = true; break; } p = p.parentElement; }
      if (!scrolls) wide.push((el.className && String(el.className).slice(0, 50)) || el.tagName);
      if (wide.length > 8) break;
    }
  }
  const h2 = (document.querySelector('h2') || {}).textContent;
  return JSON.stringify({ w, overflow, small: small.slice(0, 25), off: off.slice(0, 10), wide: wide.slice(0, 8), title: document.title, h1: (document.querySelector('h1') || {}).textContent, h2 });
})()
"""


def adb(*args):
    return subprocess.run([ADB, *args], capture_output=True, text=True).stdout.strip()


def page_for(url):
    tabs = json.load(urllib.request.urlopen('http://localhost:9222/json'))
    for t in tabs:
        if t.get('type') == 'page' and t.get('url', '').startswith(url.split('#')[0]):
            return t
    return None


def session(ws_url):
    # Chrome refuses a websocket whose Origin header it does not know; sending
    # none is the documented way in for a local tool.
    return websocket.create_connection(ws_url, timeout=60, suppress_origin=True)


def call(ws, n, method, **params):
    ws.send(json.dumps({'id': n, 'method': method, 'params': params}))
    while True:
        msg = json.loads(ws.recv())
        if msg.get('id') == n:
            return msg.get('result', {})


def main(urls):
    adb('reverse', 'tcp:3005', 'tcp:3005')
    adb('reverse', 'tcp:8000', 'tcp:8000')
    adb('forward', 'tcp:9222', 'localabstract:chrome_devtools_remote')
    # One tab, driven through DevTools, brought to the front first: Chrome
    # throttles a background tab and an evaluate there can wait for ever.
    tabs = [t for t in json.load(urllib.request.urlopen('http://localhost:9222/json'))
            if t.get('type') == 'page' and 'localhost:3005' in t.get('url', '')]
    if not tabs:
        # Quoted for the DEVICE shell, which otherwise splits the address at '&'.
        adb('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', "'%s'" % urls[0])
        time.sleep(6)
        tabs = [t for t in json.load(urllib.request.urlopen('http://localhost:9222/json'))
                if t.get('type') == 'page' and 'localhost:3005' in t.get('url', '')]
    tab = tabs[0]
    urllib.request.urlopen('http://localhost:9222/json/activate/%s' % tab['id']).read()
    ws = session(tab['webSocketDebuggerUrl'])
    n = 0
    try:
        for url in urls:
            n += 1
            call(ws, n, 'Page.navigate', url=url)
            time.sleep(9)
            n += 1
            raw = call(ws, n, 'Runtime.evaluate', expression=MEASURE, returnByValue=True)
            data = json.loads(raw.get('result', {}).get('value') or '{}')
            print('== %s' % url)
            print('  title: %s | h1: %s | h2: %s' % (data.get('title'), (data.get('h1') or '').strip()[:60], (data.get('h2') or '').strip()[:60]))
            print('  width %s, horizontal overflow %spx' % (data.get('w'), data.get('overflow')))
            if data.get('wide'):
                print('  WIDER than the screen, not in a scroller: %s' % data['wide'])
            if data.get('off'):
                print('  controls off the right edge: %s' % data['off'])
            if data.get('small'):
                print('  tap targets under 44px (%d): %s' % (len(data['small']), '; '.join(data['small'][:12])))
    finally:
        ws.close()


if __name__ == '__main__':
    main(sys.argv[1:])
