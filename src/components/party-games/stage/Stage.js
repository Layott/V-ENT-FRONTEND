'use client';

// The stage a party game is played out on (inbox 434 and 439).
//
// A storyboard is a cast of actors and one change per step (src/lib/partyGames/
// stories.js). `states` turns that into the whole picture after each step; the
// player shows one of them, and because every actor is moved by a CSS transform
// the browser animates between two steps by itself. It plays once when the
// explainer opens and stops on the last step. Under reduced motion it moves
// nothing: it shows the first step still, and the step buttons change the frame.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { STORIES } from '@/lib/partyGames/stories';
import { Shape, STAGE } from './shapes';
import styles from './stage.module.css';

const FIRST_STEP_MS = 450;
const STEP_MS = 2600;

export function states(story) {
  const first = {};
  for (const [id, [t, x, y, p]] of Object.entries(story.cast)) {
    first[id] = { t, x, y, r: 0, s: 1, o: 1, ...(p || {}) };
  }
  const all = [first];
  for (const step of story.play) {
    const prev = all[all.length - 1];
    const next = {};
    for (const id of Object.keys(prev)) next[id] = { ...prev[id], ...(step[id] || {}) };
    all.push(next);
  }
  return all;
}

function Actors({ frame, say, moving }) {
  return Object.entries(frame).map(([id, a]) => (
    <g
      key={id}
      className={moving ? styles.actor : undefined}
      style={moving ? { transform: `translate(${a.x}px, ${a.y}px) rotate(${a.r}deg) scale(${a.s})`, opacity: a.o } : undefined}
      transform={moving ? undefined : `translate(${a.x},${a.y}) rotate(${a.r}) scale(${a.s})`}
      opacity={moving ? undefined : a.o}
    >
      <Shape t={a.t} p={a} say={say} />
    </g>
  ));
}

/** One frame of a game, for lists and cards. Draws nothing for an own game. */
export function GameStill({ gameKey, at = 2, label, className, say }) {
  const frame = useMemo(() => {
    const story = STORIES[gameKey];
    if (!story) return null;
    const all = states(story);
    return all[Math.min(at, all.length - 1)];
  }, [gameKey, at]);
  if (!frame) return null;
  return (
    <svg className={className || styles.thumb} viewBox="0 0 320 180" role="img" aria-label={label}>
      <rect width="320" height="180" fill={STAGE} />
      <Actors frame={frame} say={say} moving={false} />
    </svg>
  );
}

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * The playing stage, and the controls the explainer needs: which step is
 * showing, play from the start, jump to a step.
 */
export function useGamePlayer(gameKey) {
  const all = useMemo(() => (STORIES[gameKey] ? states(STORIES[gameKey]) : []), [gameKey]);
  const [now, setNow] = useState(0);
  const [still, setStill] = useState(true);
  const timer = useRef(null);

  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const play = useCallback(() => {
    stop();
    setStill(true);
    setNow(0);
    if (!all.length) return;
    if (prefersReducedMotion()) {
      setNow(1);
      return;
    }
    const advance = (i) => {
      timer.current = setTimeout(() => {
        setStill(false);
        setNow(i);
        if (i < all.length - 1) advance(i + 1);
        else timer.current = null;
      }, i === 1 ? FIRST_STEP_MS : STEP_MS);
    };
    advance(1);
  }, [all, stop]);

  const go = useCallback((i) => {
    stop();
    setStill(prefersReducedMotion());
    setNow(Math.max(0, Math.min(i, all.length - 1)));
  }, [all, stop]);

  useEffect(() => stop, [stop]);

  return { all, now, still, play, go, stop, last: Math.max(0, all.length - 1) };
}

/** The stage itself, drawn from a player. */
export function GameStage({ player, label, say }) {
  const frame = player.all[player.now];
  if (!frame) return null;
  return (
    <svg className={`${styles.stage} ${player.still ? styles.still : ''}`} viewBox="0 0 320 180" role="img" aria-label={label}>
      <rect width="320" height="180" fill={STAGE} />
      <Actors frame={frame} say={say} moving />
    </svg>
  );
}
