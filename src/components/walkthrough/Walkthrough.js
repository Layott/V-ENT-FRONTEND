'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CHAPTERS, TOTAL_MINUTES, TOUR_VERSION, flattenSteps } from './tourChapters';
import { usePathname, useRouter } from 'next/navigation';
import styles from './walkthrough.module.css';
import { useT, useTx } from '@/i18n/LanguageProvider';

// The first-run walkthrough.
//
// Three things decide whether a tour like this is useful or is the thing people
// close before reading:
//
// 1. **It points at the real interface.** A step naming the Tournaments link
//    lights up the actual Tournaments link, so the person learns where things
//    are rather than reading a description of a place they have not seen. When
//    the element is not on screen - the sidebar is a bottom bar on a phone -
//    the step becomes a centred card, so no step depends on its anchor.
// 2. **Leaving is easy and permanent.** Escape closes it, the skip button is
//    always visible and never disguised, and closing it records that so it does
//    not ambush them again tomorrow.
// 3. **It is honest about length.** The chapter list and the time are shown up
//    front. A tour that will not say how long it is gets abandoned.
//
// The animation is movement of the spotlight and the panel between steps, which
// is real feedback about where attention has gone. There is no pulsing, no
// glow, nothing looping - and `prefers-reduced-motion` turns even the movement
// into a plain cut.

const PANEL_GAP = 16; // px between the highlighted element and the panel
const PANEL_W = 380;
const useReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);
  return reduced;
};

/** Where the highlighted element is, in viewport coordinates. */
const measure = anchor => {
  if (!anchor || typeof document === 'undefined') return null;
  const el = document.querySelector(`[data-tour="${anchor}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  // An element scrolled out of view, or collapsed to nothing, is not a usable
  // anchor - better a centred card than a spotlight on the corner of the page.
  if (r.width < 4 || r.height < 4) return null;
  if (r.bottom < 0 || r.top > window.innerHeight) {
    el.scrollIntoView({
      block: 'center',
      behavior: 'smooth'
    });
    return null;
  }
  return {
    top: r.top,
    left: r.left,
    width: r.width,
    height: r.height
  };
};

/** Put the panel beside the spotlight, or centre it when there is none. */
const placePanel = box => {
  if (typeof window === 'undefined') return {
    centred: true
  };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (!box || vw < 760) return {
    centred: true
  };
  const rightRoom = vw - (box.left + box.width) - PANEL_GAP;
  const leftRoom = box.left - PANEL_GAP;
  if (rightRoom >= PANEL_W) {
    return {
      centred: false,
      left: box.left + box.width + PANEL_GAP,
      top: Math.min(Math.max(16, box.top), vh - 260)
    };
  }
  if (leftRoom >= PANEL_W) {
    return {
      centred: false,
      left: box.left - PANEL_W - PANEL_GAP,
      top: Math.min(Math.max(16, box.top), vh - 260)
    };
  }
  // Nothing fits beside it: sit under it if there is room, otherwise centre.
  const below = vh - (box.top + box.height) - PANEL_GAP;
  if (below >= 240) {
    return {
      centred: false,
      left: Math.min(Math.max(16, box.left), vw - PANEL_W - 16),
      top: box.top + box.height + PANEL_GAP
    };
  }
  return {
    centred: true
  };
};
const Walkthrough = ({
  onFinish,
  onSkip,
  startAtChapter = null
}) => {
  const tx = useTx();
  const tt = useT();
  const router = useRouter();
  const pathname = usePathname();
  const steps = useMemo(() => flattenSteps(CHAPTERS), []);
  const firstIndex = useMemo(() => {
    if (!startAtChapter) return 0;
    const i = steps.findIndex(s => s.chapterId === startAtChapter);
    return i === -1 ? 0 : i;
  }, [steps, startAtChapter]);
  const [index, setIndex] = useState(firstIndex);
  const [box, setBox] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const reduced = useReducedMotion();
  const panelRef = useRef(null);
  const step = steps[index];
  const isLast = index === steps.length - 1;

  // Walk to the page the chapter is about.
  //
  // Without this the tour explained tournament entry fees, wallet top-ups and
  // team roles while the reader sat on whatever page they happened to open it
  // from, describing cards that were not on the screen. Every step then fell
  // back to a centred card, which is the documented behaviour for a missing
  // anchor and reads as the tour being broken.
  //
  // Only on a chapter boundary, never per step: re-pushing the same route on
  // every Next would fight the reader if they scrolled, and a chapter's steps
  // all live on one page by construction.
  const wantedRoute = step?.chapterRoute || null;
  useEffect(() => {
    if (!wantedRoute) return;
    // The locale prefix is the router's business, so compare what is left.
    const here = pathname.replace(/^\/(fr|pt)(?=\/|$)/, '') || '/';
    if (here === wantedRoute) return;
    router.push(wantedRoute);
  }, [wantedRoute, pathname, router]);

  // Re-measure on step change, and whenever the page moves under us.
  useEffect(() => {
    let raf = 0;
    const update = () => setBox(measure(step?.anchor));
    update();
    // One extra frame after a step change: a sidebar item that just became
    // visible has not been laid out at the moment the step advances.
    raf = requestAnimationFrame(update);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
    // `pathname` is in here because the anchor for a step usually lives on the
    // page the tour just walked to, and it does not exist at the moment the
    // step advances - only after that page has rendered.
  }, [step?.anchor, index, pathname]);
  const finish = useCallback(() => onFinish?.(), [onFinish]);
  const skip = useCallback(() => onSkip?.(), [onSkip]);
  const next = useCallback(() => {
    if (isLast) finish();else setIndex(i => i + 1);
  }, [isLast, finish]);
  const back = useCallback(() => setIndex(i => Math.max(0, i - 1)), []);

  // Keyboard: arrows move, Escape leaves. A modal that traps somebody is worse
  // than no modal.
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') {
        e.preventDefault();
        skip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        back();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, back, skip]);

  // Move focus to the panel on each step so a screen reader announces it and
  // the arrow keys work without clicking first.
  useEffect(() => {
    panelRef.current?.focus({
      preventScroll: true
    });
  }, [index]);

  // The page behind must not scroll while this is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  const panelPos = placePanel(box);
  const progress = Math.round((index + 1) / steps.length * 100);
  return <div className={`${styles.root} ${reduced ? styles.noMotion : ''}`} role="dialog" aria-modal="true" aria-label={tt("ui.getting.started.walkthrough.9f73", "Getting started walkthrough")}>
      {/* The dim. Four panels around the highlighted element rather than one
          box-shadow, so the element itself is genuinely uncovered and stays
          clickable, and so there is no glow around it. */}
      {box ? <>
          <div className={styles.shade} style={{
        top: 0,
        left: 0,
        right: 0,
        height: box.top
      }} />
          <div className={styles.shade} style={{
        top: box.top + box.height,
        left: 0,
        right: 0,
        bottom: 0
      }} />
          <div className={styles.shade} style={{
        top: box.top,
        left: 0,
        width: box.left,
        height: box.height
      }} />
          <div className={styles.shade} style={{
        top: box.top,
        left: box.left + box.width,
        right: 0,
        height: box.height
      }} />
          <div className={styles.spotlight} style={{
        top: box.top,
        left: box.left,
        width: box.width,
        height: box.height
      }} />
        </> : <div className={`${styles.shade} ${styles.shadeFull}`} />}

      <div ref={panelRef} tabIndex={-1} className={`${styles.panel} ${panelPos.centred ? styles.panelCentred : ''}`} style={panelPos.centred ? undefined : {
      top: panelPos.top,
      left: panelPos.left
    }}>
        <div className={styles.panelHead}>
          <button type="button" className={styles.chapterBtn} onClick={() => setShowMenu(v => !v)} aria-expanded={showMenu}>
            {tx(step.chapterTitle)}
            <span className={styles.chapterCount}>
              {tt('walk.stepOf', '{n} of {total}')
                .replace('{n}', step.stepIndex + 1)
                .replace('{total}', step.stepsInChapter)}
            </span>
          </button>
          <button type="button" className={styles.skipBtn} onClick={skip}>
            {tt("ui.skip.3da4", "Skip")}
          </button>
        </div>

        {showMenu && <ul className={styles.chapterMenu}>
            {CHAPTERS.map(c => {
          const target = steps.findIndex(s => s.chapterId === c.id);
          const done = target < index;
          return <li key={c.id}>
                  <button type="button" className={`${styles.chapterMenuItem} ${c.id === step.chapterId ? styles.chapterMenuItemOn : ''}`} onClick={() => {
              setIndex(target);
              setShowMenu(false);
            }}>
                    <span>{tx(c.title)}</span>
                    <span className={styles.chapterMenuMeta}>
                      {done
                        ? tt('walk.seen', 'seen')
                        : c.minutes
                          ? tt('walk.minutes', '{n} min').replace('{n}', c.minutes)
                          : ''}
                    </span>
                  </button>
                </li>;
        })}
          </ul>}

        <h2 className={styles.heading}>{tx(step.heading)}</h2>
        <p className={styles.body}>{tx(step.body)}</p>
        {step.aside && <p className={styles.aside}>{tx(step.aside)}</p>}

        <div className={styles.progressTrack} aria-hidden="true">
          <div className={styles.progressFill} style={{
          width: `${progress}%`
        }} />
        </div>

        <div className={styles.actions}>
          <span className={styles.count}>
            {index + 1} / {steps.length}
          </span>
          <div className={styles.actionBtns}>
            {index > 0 && <button type="button" className={styles.ghostBtn} onClick={back}>
                {tt("ui.back.b52b", "Back")}
              </button>}
            <button type="button" className={styles.primaryBtn} onClick={next}>
              {isLast ? tt('walk.finish', 'Finish') : tt('walk.next', 'Next')}
            </button>
          </div>
        </div>
      </div>
    </div>;
};
export { TOUR_VERSION, TOTAL_MINUTES };
export default Walkthrough;