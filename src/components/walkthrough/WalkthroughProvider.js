'use client';

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Walkthrough, { TOUR_VERSION } from './Walkthrough';

// Decides whether the walkthrough runs, and remembers the answer.
//
// The rule that matters: it appears once. Somebody who finished it, or who
// closed it, must never be shown it again by accident - a tour that reappears
// is worse than no tour, because now the product feels broken as well as
// unfamiliar.
//
// So the answer is stored on the account, not in localStorage, and localStorage
// is used only to stop it flashing up during the moment before the account's
// settings have loaded. Somebody who finished it on a laptop and then signs in
// on their phone is not walked through the platform a second time.

const WalkthroughContext = createContext({
  start: () => {},
  available: false,
  seen: false,
});

const LOCAL_KEY = 'vent:walkthrough';

// Pages where a modal over the top would be wrong: the person is mid-task, or
// not signed in, or being asked for money.
// Where the tour is allowed to start itself. It walks people to the page each
// chapter is about, so starting it anywhere else moves somebody off the page
// they asked for.
const homeRoute = (pathname) =>
  (pathname || '').replace(/^\/(fr|pt)(?=\/|$)/, '').replace(/\/$/, '') === '/home';

const NEVER_ON = [
  '/login', '/signup', '/forgot-password', '/reset-password', '/reset-email',
  '/verify-email', '/email-verified', '/claim', '/onboarding', '/admin',
  '/partners/authorize', '/wallet-topup-callback', '/auth/',
];

const readLocal = () => {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeLocal = (value) => {
  try { window.localStorage.setItem(LOCAL_KEY, JSON.stringify(value)); } catch { /* ignore */ }
};

export const WalkthroughProvider = ({ children }) => {
  const { data: session, status } = useSession();
  const pathname = usePathname() || '';
  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  const token = session?.user?.sessionToken;

  const [state, setState] = useState(null);   // null until the account answers
  const [running, setRunning] = useState(false);
  const [startChapter, setStartChapter] = useState(null);
  const askedRef = useRef(false);

  const blocked = NEVER_ON.some((p) => pathname.startsWith(p));

  // What this device last knew, applied immediately so a returning user never
  // sees a flash of the tour while their settings are still in flight.
  useEffect(() => {
    const local = readLocal();
    if (local) setState(local);
  }, []);

  // Then the account, which is the authority.
  useEffect(() => {
    if (!token || askedRef.current) return;
    askedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${apiBase}/setting/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const body = await res.json();
        if (cancelled) return;
        // An account with no walkthrough key has simply never seen it - an
        // older backend, or a user created before this shipped. Treating a
        // missing key as "keep waiting" left `state` null forever and the tour
        // never ran for anybody, which is how this was found.
        const stored = body?.data?.settings?.walkthrough || {
          completed_at: null, skipped: false, version: 0, chapters_seen: [],
        };
        setState(stored);
        writeLocal(stored);
      } catch {
        // Failing to reach settings must not mean showing the tour to somebody
        // who has already done it - so fall back to whatever this device knew,
        // and only to "never seen" when it knew nothing either.
        if (cancelled) return;
        setState((prev) => prev ?? readLocal() ?? {
          completed_at: null, skipped: false, version: 0, chapters_seen: [],
        });
      }
    })();
    return () => { cancelled = true; };
  }, [apiBase, token]);

  const persist = useCallback(async (next) => {
    setState(next);
    writeLocal(next);
    if (!token) return;
    try {
      await fetch(`${apiBase}/setting/update/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ walkthrough: next }),
      });
    } catch {
      // The local copy still holds, so it will not reappear on this device;
      // the next successful save picks it up.
    }
  }, [apiBase, token]);

  const seen = Boolean(state && (state.completed_at || state.skipped)
    && (state.version ?? 0) >= TOUR_VERSION);

  // Run it for somebody signed in who has not seen this version - but only
  // when they are on the home page.
  //
  // The tour walks to the page each chapter is about, and its first chapter is
  // about /home. Auto-starting it anywhere meant it did that to somebody who
  // had just asked for something else: open a shared tournament link with an
  // account that has not seen the tour, and you are pushed to /home before the
  // tournament finishes rendering. That is how it looked to the organiser who
  // reported that their own manage page "just reloads the homepage" - nothing
  // to do with permissions, and no error to read.
  //
  // /home is where signing in lands you, so the tour still meets almost
  // everybody on their first visit. Starting it from Settings still works from
  // anywhere, because that path sets `running` itself rather than going through
  // this effect - somebody who asked for the tour has consented to being walked
  // around.
  const onHome = homeRoute(pathname);
  useEffect(() => {
    if (status !== 'authenticated' || blocked || running) return;
    if (!onHome) return;
    if (state === null) return;            // still waiting on the account
    if (seen) return;
    setStartChapter(null);
    setRunning(true);
  }, [status, blocked, running, state, seen, onHome]);

  const finish = useCallback(() => {
    setRunning(false);
    persist({
      completed_at: new Date().toISOString(),
      skipped: false,
      version: TOUR_VERSION,
      chapters_seen: [],
    });
  }, [persist]);

  const skip = useCallback(() => {
    setRunning(false);
    // Recorded as firmly as finishing it. Somebody who closed it made a
    // decision, and asking again tomorrow ignores that decision.
    persist({
      completed_at: null,
      skipped: true,
      version: TOUR_VERSION,
      chapters_seen: [],
    });
  }, [persist]);

  // Replay, from Settings or from anywhere else that wants to offer it.
  const start = useCallback((chapterId = null) => {
    setStartChapter(chapterId);
    setRunning(true);
  }, []);

  const value = useMemo(() => ({ start, available: true, seen }), [start, seen]);

  return (
    <WalkthroughContext.Provider value={value}>
      {children}
      {running && (
        <Walkthrough onFinish={finish} onSkip={skip} startAtChapter={startChapter} />
      )}
    </WalkthroughContext.Provider>
  );
};

export const useWalkthrough = () => useContext(WalkthroughContext);

export default WalkthroughProvider;
