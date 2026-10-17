'use client';

// How a format works, as a short moving picture with captions (inbox 476).
//
// CEO, 16 October 2026: "we'll need a video explainer for all these
// bracket/format systems, so users can easily understand, it needs to be very
// simple and straightforward explainers." Each format's scene (in
// src/lib/explainers) plays for 30 to 60 seconds: entrants appear, matches play
// out, winners move along the lines, the places land. Three plain sentences
// run underneath in the reader's language, each on screen while the part of
// the picture it describes plays.
//
// It is drawn, not filmed, so it is always the format the page describes, it
// weighs a few kilobytes, and its captions are ordinary translated text.
//
// Play, pause and play again. It ends on a still of the finished bracket. Under
// reduced motion nothing slides: the steps are still frames the reader moves
// through with Previous and Next. Before it is played it shows that finished
// picture, which is the most useful still there is.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { EXPLAINERS, MUSIC_TRACK, explainerKey, sceneFor } from '@/lib/explainers';
import { duration, frames, starts } from '@/lib/explainers/story';
import ExplainerStage from './ExplainerStage';
import styles from './format-explainer.module.css';

// How long a looping explainer (the studio, on a stream) rests on its final
// picture before it starts again.
const LOOP_REST_MS = 6000;

/** An explainer's title and three lines, in the reader's language. */
export function explainerWords(tt, key) {
  const e = EXPLAINERS[key];
  if (!e) return null;
  return {
    title: tt(`explainer.${key}.title`, e.title),
    lines: e.lines.map((english, i) => tt(`explainer.${key}.line${i + 1}`, english)),
  };
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const change = (e) => setReduced(e.matches);
    mq.addEventListener?.('change', change);
    return () => mq.removeEventListener?.('change', change);
  }, []);
  return reduced;
}

/**
 * The clock behind one explainer.
 *
 * Time runs on requestAnimationFrame; the frame on screen changes only when a
 * step starts, so React draws the stage once a step and the progress bar is
 * moved directly. `mode` is idle (the finished still, not yet played),
 * playing, paused, done, or stepping (reduced motion, moved by hand).
 */
function usePlayer(scene, { autoPlay, loop, reduced, broadcast, onEnd }) {
  const all = useMemo(() => frames(scene), [scene]);
  const at = useMemo(() => starts(scene), [scene]);
  const total = useMemo(() => duration(scene), [scene]);
  const last = all.length - 1;

  const [now, setNow] = useState(last);
  const [mode, setMode] = useState('idle');
  const [moving, setMoving] = useState(false);

  const raf = useRef(0);
  const rest = useRef(0);
  const elapsed = useRef(0);
  const started = useRef(0);
  const bar = useRef(null);
  const audio = useRef(null);
  const live = useRef({});

  const paint = (ms) => {
    if (bar.current) bar.current.style.transform = `scaleX(${Math.max(0, Math.min(1, ms / total))})`;
  };
  const frameAt = (ms) => {
    let j = 0;
    for (let i = 0; i < at.length; i += 1) if (at[i] <= ms) j = i;
    return j + 1;
  };
  const stopClock = () => {
    cancelAnimationFrame(raf.current);
    clearTimeout(rest.current);
    raf.current = 0;
  };
  const sound = (on) => {
    if (!audio.current) return;
    if (on) audio.current.play().catch(() => {});
    else audio.current.pause();
  };

  // The latest of everything the clock reads, so a frame scheduled before a
  // re-render never acts on an old scene.
  live.current = { total, last, loop, onEnd, reduced, broadcast };

  const tick = useCallback(() => {
    const ms = elapsed.current + (performance.now() - started.current);
    paint(ms);
    if (ms >= live.current.total) {
      elapsed.current = live.current.total;
      setNow(live.current.last);
      setMode('done');
      sound(false);
      live.current.onEnd?.();
      if (live.current.loop) rest.current = setTimeout(() => live.current.restart(), LOOP_REST_MS);
      return;
    }
    setNow(frameAt(ms));
    raf.current = requestAnimationFrame(tick);
  // frameAt and paint read refs and the memoised steps of this scene.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at, total]);

  const run = useCallback(() => {
    started.current = performance.now();
    raf.current = requestAnimationFrame(tick);
  }, [tick]);

  /** From the beginning: the empty stage first, then the steps. */
  const restart = useCallback(() => {
    stopClock();
    elapsed.current = 0;
    paint(0);
    setMoving(false);
    setNow(0);
    if (live.current.reduced && !live.current.broadcast) {
      // Still frames, moved by hand. The first step is the first picture.
      setNow(1);
      setMode('stepping');
      return;
    }
    setMode('playing');
    sound(true);
    // Two frames, so the empty stage is on screen before anything moves into
    // it; otherwise the browser has nothing to animate from.
    raf.current = requestAnimationFrame(() => {
      raf.current = requestAnimationFrame(() => {
        setMoving(!live.current.reduced);
        run();
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);
  live.current.restart = restart;

  const pause = useCallback(() => {
    stopClock();
    elapsed.current += performance.now() - started.current;
    setMode('paused');
    sound(false);
  }, []);

  const resume = useCallback(() => {
    setMode('playing');
    sound(true);
    run();
  }, [run]);

  const go = useCallback((i) => {
    setMoving(false);
    setNow(Math.max(1, Math.min(i, live.current.last)));
  }, []);

  // A new scene starts over; an explainer asked to play does so on arrival.
  useEffect(() => {
    stopClock();
    setMoving(false);
    setNow(last);
    setMode('idle');
    elapsed.current = 0;
    paint(0);
    if (autoPlay) restart();
    return stopClock;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  return { all, now, mode, moving, last, bar, audio, restart, pause, resume, go };
}

/**
 * @param format     a format key, written any way the catalogue accepts
 * @param autoPlay   start playing when shown
 * @param loop       start again after a rest on the final picture (a stream)
 * @param variant    'inline' (controls under it) or 'broadcast' (no controls,
 *                   big captions, for a 1920 x 1080 browser source)
 * @param showLines  list the three lines under the picture, the one playing lit
 */
export default function FormatExplainer({
  format,
  autoPlay = false,
  loop = false,
  variant = 'inline',
  showLines = false,
  onEnd,
  className,
}) {
  const tt = useT();
  const key = explainerKey(format);
  const scene = key ? sceneFor(key) : null;
  const reduced = useReducedMotion();
  const broadcast = variant === 'broadcast';
  // A scene is always needed for the hooks; an unknown format draws nothing.
  const player = usePlayer(scene || sceneFor('single_elimination'), { autoPlay, loop, reduced, broadcast, onEnd });

  if (!scene) return null;
  const words = explainerWords(tt, key);
  const { now, mode, moving, last } = player;
  const line = now === 0 ? 0 : scene.steps[now - 1].line;
  const playing = mode === 'playing';
  const label = `${words.title}. ${words.lines.join(' ')}`;

  const primary = playing
    ? { text: tt('explainer.pause', 'Pause'), act: player.pause }
    : mode === 'paused'
      ? { text: tt('explainer.play', 'Play'), act: player.resume }
      : mode === 'done'
        ? { text: tt('explainer.replay', 'Play again'), act: player.restart }
        : { text: tt('explainer.play', 'Play'), act: player.restart };

  return (
    <div className={`${styles.player} ${broadcast ? styles.broadcast : ''} ${className || ''}`}>
      {broadcast ? <div className={styles.broadcastTitle}>{words.title}</div> : null}
      <div className={styles.stageBox}>
        <ExplainerStage scene={scene} frame={player.all[now]} moving={moving} label={label} tt={tt} />
      </div>

      {/* The line for what is on screen. Polite, so a screen reader hears each
          one as it arrives without being interrupted. */}
      <p className={styles.caption} aria-live={playing ? 'polite' : 'off'}>{words.lines[line]}</p>

      {!broadcast && mode !== 'stepping' && (
        <div className={styles.controls}>
          <button type="button" className={styles.primaryBtn} onClick={primary.act}>{primary.text}</button>
          {(playing || mode === 'paused') && (
            <button type="button" className={styles.quietBtn} onClick={player.restart}>
              {tt('explainer.replay', 'Play again')}
            </button>
          )}
          <span className={styles.track} aria-hidden="true">
            <span ref={player.bar} className={styles.trackFill} />
          </span>
        </div>
      )}

      {!broadcast && mode === 'stepping' && (
        <div className={styles.controls}>
          <button type="button" className={styles.quietBtn} onClick={() => player.go(now - 1)} disabled={now <= 1}>
            {tt('explainer.back', 'Previous')}
          </button>
          <span className={styles.stepCount}>
            {tt('explainer.stepOf', 'Step {n} of {total}').replace('{n}', String(now)).replace('{total}', String(last))}
          </span>
          <button type="button" className={styles.primaryBtn} onClick={() => player.go(now + 1)} disabled={now >= last}>
            {tt('explainer.next', 'Next')}
          </button>
        </div>
      )}

      {showLines && (
        <ol className={styles.lines}>
          {words.lines.map((text, i) => (
            <li key={i} className={mode !== 'idle' && i === line ? styles.lineNow : undefined}>
              <span className={styles.lineNumber} aria-hidden="true">{i + 1}</span>
              <span>{text}</span>
            </li>
          ))}
        </ol>
      )}

      {/* The music bed, once a licensed track is set in src/lib/explainers. */}
      {MUSIC_TRACK ? <audio ref={player.audio} src={MUSIC_TRACK} loop preload="none" /> : null}
    </div>
  );
}
