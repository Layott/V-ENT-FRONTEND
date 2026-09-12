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
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from './apiMessage';

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
  // `error` is a sentence for the person in front of the page, in their
  // language, from the API's CODE. The server's own message is written for
  // the log and is only ever English.
  const tt = useT();
  const ttRef = useRef(tt);
  useEffect(() => { ttRef.current = tt; });

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
      if (first) {
        setError(apiMessage(ttRef.current, err, 'api.thatDidNotWork',
          'That did not go through.'));
      }
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

/**
 * The same loop, driving a page's EXISTING loader.
 *
 * CEO, 7 September 2026: "useLiveData is imported by nothing ... your actual
 * ask, every page updating on its own, is not met."
 *
 * That was true, and the reason it was true is worth writing down: 73 pages on
 * this site fetch, and `useLiveData` OWNS the data it fetches. Adopting it
 * means restructuring a page around it, and 67 restructures is a job nobody
 * ever starts. So the primitive sat there, imported by nothing, while the
 * pages it was written for carried on not refreshing.
 *
 * This is the other door into the same loop. A page that already has a
 * `load()` and its own state opts in with ONE line:
 *
 *   useAutoRefresh(() => loadAttendees(), [token, eventId]);
 *
 * It shares every guarantee above, because it is the same code: cannot stack,
 * backs off, stops while hidden, wakes on return, and CANNOT be torn down by a
 * re-render because what it calls lives in a ref.
 *
 * ## It never fires on mount
 *
 * The page's own effect already did the first load. Firing here as well would
 * double every page's opening request, which is a real cost on a listing that
 * fans out. So the first tick is one `interval` away, not immediate.
 *
 * ## What must NOT use this
 *
 * Anything with a form in it. Refreshing underneath somebody who is typing
 * replaces what they wrote with what the server still thinks, and a wizard
 * three steps in loses all three. `scripts/check-live-updates.mjs` knows which
 * routes those are and never asks them to refresh.
 */
export function useAutoRefresh(refresh, deps = [], options = {}) {
  const {
    interval = DEFAULT_INTERVAL,
    maxInterval = DEFAULT_MAX_INTERVAL,
    enabled = true,
    changed,
  } = options;

  // The ref is the entire point. `refresh` is nearly always an arrow written
  // inline at the call site, so it is a new function on every single render.
  // Naming it in the effect's deps is the fault this file exists to stop.
  const refreshRef = useRef(refresh);
  const changedRef = useRef(changed);
  useEffect(() => { refreshRef.current = refresh; });
  useEffect(() => { changedRef.current = changed; });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const key = JSON.stringify(deps);

  useEffect(() => {
    if (!enabled) return undefined;

    let stopped = false;
    let timer = null;
    let wait = interval;

    const tick = async () => {
      if (stopped) return;
      if (typeof document !== 'undefined' && document.hidden) {
        timer = setTimeout(tick, wait);
        return;
      }
      let moved = true;
      try {
        const result = await refreshRef.current();
        if (changedRef.current) moved = !!changedRef.current(result);
        else if (result === false) moved = false;
      } catch {
        // A failed refresh is not a failed page. The page keeps what it has.
        moved = false;
      }
      if (stopped) return;
      wait = moved ? interval : Math.min(Math.round(wait * 1.5), maxInterval);
      timer = setTimeout(tick, wait);
    };

    // Deliberately NOT immediate. See the note above.
    timer = setTimeout(tick, wait);

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
      if (timer) clearTimeout(timer);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', wake);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, interval, maxInterval]);
}
