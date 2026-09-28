'use client';
/**
 * "Something changed": told to every live view on the page the moment a write
 * succeeds, so nothing waits for its next timer or for a reload.
 *
 * CEO, 28 September 2026 (inbox 312), on Match Control saying "no bracket"
 * after a draw made from the Actions tab: "fix this so it automatically loads,
 * infact all page should be like this." Wiring one panel to its parent fixed
 * that panel. This fixes the class: any successful POST, PUT, PATCH or DELETE
 * to the API, from any component, wakes every useLiveData and useAutoRefresh
 * on the page at once, and drops the shared GET cache, which is now stale.
 *
 * Installed once, on first import, by wrapping window.fetch. Reads (GET, HEAD)
 * never signal, and a failed write never signals: nothing changed.
 */
import { invalidate } from '@/lib/apiCache';

export const CHANGED_EVENT = 'vent:changed';

const WRITES = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function apiBase() {
  return (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
}

function isApiWrite(input, init) {
  const base = apiBase();
  if (!base) return false;
  const url = typeof input === 'string' ? input : (input && input.url) || '';
  const method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
  return WRITES.has(method) && url.startsWith(base);
}

export function installChangeSignal() {
  if (typeof window === 'undefined' || window.__ventChangeSignal) return;
  window.__ventChangeSignal = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const response = await original(input, init);
    try {
      if (response.ok && isApiWrite(input, init)) {
        invalidate();
        const url = typeof input === 'string' ? input : input.url;
        // After the caller has had the response, so its own state lands first.
        setTimeout(() => window.dispatchEvent(new CustomEvent(CHANGED_EVENT, { detail: { url } })), 0);
      }
    } catch {
      /* the signal is a courtesy; the write itself has already succeeded */
    }
    return response;
  };
}

/**
 * Listen for changes. `onChange` is called at most once per `minGap` ms, and
 * never while `busy()` says the listener's own refresh is running, which is
 * what stops a fetcher that happens to write from waking itself for ever.
 */
export function onChanged(onChange, { busy = () => false, minGap = 1000 } = {}) {
  if (typeof window === 'undefined') return () => {};
  let last = 0;
  const handler = () => {
    const now = Date.now();
    if (busy() || now - last < minGap) return;
    last = now;
    onChange();
  };
  window.addEventListener(CHANGED_EVENT, handler);
  return () => window.removeEventListener(CHANGED_EVENT, handler);
}
