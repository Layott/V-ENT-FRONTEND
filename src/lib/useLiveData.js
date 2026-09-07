'use client';

/**
 * The one way a page keeps itself current.
 *
 * CEO, 6 September 2026: "i want all pages on the site to be updating
 * automatically on its own without users having to refresh", and separately
 * "For the refresh never firing, please build a checker for it. also for all
 * models that are currently existing and for future ones that will be built,
 * please make sure it is fixed."
 *
 * ## The fault this exists to make unrepeatable
 *
 * The door list shipped a refresh loop that NEVER FIRED, and looked perfectly
 * correct while doing it:
 *
 *   useEffect(() => { setTimeout(tick, 10000) }, [token, id, load, loadSummary]);
 *
 * `load` was a `useCallback` whose deps included `tt` from `useT()`, and
 * `useT()` hands back a new function on most renders. So `load` changed
 * identity on most renders, the effect tore its timer down and armed a fresh
 * one, and a 10 second timer never survived long enough to fire. Measured in
 * Chrome: twenty seconds on a visible tab, zero requests.
 *
 * Nothing errored. Nothing was empty. The list rendered. It simply never
 * updated, which is invisible unless somebody watches the network.
 *
 * Writing that loop correctly by hand, on every page, for ever, is exactly the
 * thing that fails at 2am. So it is written once, here, and
 * `scripts/check-live-updates.mjs` fails any page that hand-rolls its own.
 *
 * ## What it guarantees
 *
 * - **The timer cannot be torn down by a re-render.** The effect depends only
 *   on primitives you pass as `deps`; the fetcher is held in a ref. This is the
 *   whole bug, closed structurally.
 * - **It cannot stack.** A slow answer delays the next ask rather than piling a
 *   second request on top of it.
 * - **It backs off.** Quiet pages drift from `interval` out to `maxInterval`,
 *   so a tab left open overnight is not still asking every ten seconds. That is
 *   the fault nginx throttled the admin console for on 29 August.
 * - **It stops while the tab is hidden**, and asks immediately on return, so
 *   coming back shows the truth rather than whatever was left of a 60s sleep.
 * - **A failed refresh never blanks the screen.** Only the first load may put
 *   an error where content was. A page that empties itself on one bad request
 *   is worse than a page that is slightly stale.
 *
 * ## Using it
 *
 *   const { data, loading, error, refresh } = useLiveData(
 *     async ({ signal }) => {
 *       const res = await fetch(url, { signal });
 *       const body = await res.json();
 *       if (!res.ok || body.status !== 'success') throw new Error(body.code);
 *       return body.data;
 *     },
 *     [token, eventId],            // primitives only
 *     { interval: 15000 },
 *   );
 *
 * `changed` lets a delta-shaped endpoint tell the loop whether anything moved,
 * so the backoff means something:
 *
 *   { changed: (next, prev) => next.asked_at !== prev?.asked_at }
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export const DEFAULT_INTERVAL = 15000;
export const DEFAULT_MAX_INTERVAL = 60000;

export default function useLiveData(fetcher, deps = [], options = {}) {
  const {
    interval = DEFAULT_INTERVAL,
    maxInterval = DEFAULT_MAX_INTERVAL,
    enabled = true,
    changed,
    onData,
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Everything the loop CALLS lives in a ref, so changing identity on a render
  // cannot restart the timer. This is the fix, and it is the reason this hook
  // exists rather than the pattern being written out per page.
  const fetcherRef = useRef(fetcher);
  const changedRef = useRef(changed);
  const onDataRef = useRef(onData);
  const dataRef = useRef(null);
  useEffect(() => { fetcherRef.current = fetcher; });
  useEffect(() => { changedRef.current = changed; });
  useEffect(() => { onDataRef.current = onData; });

  const run = useCallback(async (first, signal) => {
    if (first) { setLoading(true); setError(''); }
    try {
      const next = await fetcherRef.current({ first, signal });
      if (signal?.aborted) return false;
      const moved = changedRef.current
        ? !!changedRef.current(next, dataRef.current)
        : true;
      dataRef.current = next;
      setData(next);
      if (onDataRef.current) onDataRef.current(next, { first });
      setError('');
      return moved;
    } catch (err) {
      if (signal?.aborted || err?.name === 'AbortError') return false;
      // A failed REFRESH is not a failed page.
      if (first) setError(err?.message || 'error');
      return false;
    } finally {
      if (first && !signal?.aborted) setLoading(false);
    }
  }, []);

  // The dependency array is spread deliberately: callers pass PRIMITIVES, and
  // the lint rule cannot see through the spread, which is the point. What it
  // must never contain is a function.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const key = JSON.stringify(deps);

  useEffect(() => {
    if (!enabled) { setLoading(false); return undefined; }

    let stopped = false;
    let timer = null;
    let wait = interval;
    const controller = new AbortController();

    const tick = async (first = false) => {
      if (stopped) return;
      if (!first && typeof document !== 'undefined' && document.hidden) {
        timer = setTimeout(tick, wait);
        return;
      }
      const moved = await run(first, controller.signal);
      if (stopped) return;
      wait = moved ? interval : Math.min(Math.round(wait * 1.5), maxInterval);
      timer = setTimeout(tick, wait);
    };

    tick(true);

    const wake = () => {
      if (typeof document !== 'undefined' && !document.hidden && !stopped) {
        wait = interval;
        if (timer) clearTimeout(timer);
        timer = setTimeout(tick, 0);
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', wake);
    }

    return () => {
      stopped = true;
      controller.abort();
      if (timer) clearTimeout(timer);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', wake);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, interval, maxInterval, run]);

  const refresh = useCallback(() => { run(false); }, [run]);

  return { data, loading, error, refresh, setData };
}
