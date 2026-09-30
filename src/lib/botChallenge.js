'use client';

// The bot check on signup, feedback and the waitlist (owner rule R68).
//
// The server hands out a puzzle (GET /auth/challenge/): a salt, and the
// SHA-256 of that salt plus a secret number. This file finds the number, the
// way ALTCHA does, and the form sends the answer back as `challenge`. The
// server checks its own signature on the puzzle, the arithmetic, the expiry
// and that it was never used before (vent_auth/bot_check.py).
//
// A person never sees any of it: the puzzle is fetched and solved while they
// are still typing, so pressing the button costs nothing extra. Each answer is
// good for one submission, so a second press gets a fresh one.
//
// `website` is the honeypot. Forms render <BotTrap />, which a person cannot
// see or reach, and send its value; a script that fills every input fills it.

import { useCallback, useEffect, useRef } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL;

function hex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256(text) {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}

// Numbers are tried in batches so the page stays responsive on a slow phone.
async function solve(puzzle) {
  const { salt, challenge, maxnumber } = puzzle;
  const BATCH = 500;
  for (let start = 0; start <= maxnumber; start += BATCH) {
    const end = Math.min(start + BATCH, maxnumber + 1);
    const tries = [];
    for (let n = start; n < end; n += 1) tries.push(sha256(`${salt}${n}`));
    const found = (await Promise.all(tries)).indexOf(challenge);
    if (found !== -1) return start + found;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return null;
}

/** One solved answer, or null when the puzzle could not be fetched. */
export async function fetchSolvedChallenge() {
  try {
    const res = await fetch(`${API}/auth/challenge/`, { cache: 'no-store' });
    const body = await res.json();
    if (!res.ok || body.status !== 'success') return null;
    const number = await solve(body.data);
    if (number === null) return null;
    return { ...body.data, number };
  } catch {
    return null;
  }
}

/**
 * `take()` hands over a solved answer (waiting for it if it is not ready yet)
 * and starts the next one, since each answer is good once.
 *
 * `eager` (the default) starts solving when the form mounts, for pages whose
 * whole point is the form. A form most visitors never touch (the landing
 * waitlist) passes `{ eager: false }` and calls `prime()` on focus, so a
 * visitor who only scrolls past spends nothing on it.
 */
export function useBotChallenge({ eager = true } = {}) {
  const pending = useRef(null);

  const prime = useCallback(() => {
    if (!pending.current) pending.current = fetchSolvedChallenge();
  }, []);

  useEffect(() => {
    if (eager) prime();
  }, [eager, prime]);

  const take = useCallback(async () => {
    const answer = await (pending.current || fetchSolvedChallenge());
    pending.current = fetchSolvedChallenge();
    return answer;
  }, []);

  return { take, prime };
}

export const HONEYPOT_FIELD = 'website';
