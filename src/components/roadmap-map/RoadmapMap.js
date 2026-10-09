'use client';

import { useState } from 'react';
import Link from 'next/link';
import ImageViewer from '@/components/image-viewer/ImageViewer';
import NotifyWhenOpen from '@/components/coming-soon/NotifyWhenOpen';
import { useT } from '@/i18n/LanguageProvider';
import { LIVE, ROADMAP, STATUS, branchTo } from '@/lib/roadmap';
import styles from './RoadmapMap.module.css';

/**
 * The roadmap as a stepladder bracket (inbox 426, CEO 9 October 2026: "let it
 * look like a bracket system that shows what will be built from this one to
 * that that one").
 *
 * V-ENT today climbs one step per phase; each step is joined by the live
 * feature it builds on, the way a stepladder's next challenger joins. A wide
 * container draws it left to right as a staircase on a grid of 56px rows: every
 * card (100px) spans two rows and each step drops one, so the next card sits centred
 * between the two that lead to it, and an elbow in a 40px column joins them,
 * the same connector the tournament bracket draws. A narrow one (a phone)
 * draws one spine top to bottom with the feature each step builds on joining
 * from the side. The connectors ARE the diagram; every box is a filled surface.
 *
 * Every step's words are in the served HTML (the closed ones `hidden`), so a
 * crawler and a model read all of it; pressing a step shows its own.
 *
 * `focus` draws one module's branch: the climb up to it, the path in red, its
 * details open. Without it, the whole map with the next step open.
 */
const RoadmapMap = ({ focus = null }) => {
  const tt = useT();
  const modules = focus ? branchTo(focus) : ROADMAP;
  const steps = [LIVE, ...modules];
  const [open, setOpen] = useState(focus || (ROADMAP[0] && ROADMAP[0].id));
  const [shot, setShot] = useState(null);
  const lit = (i) => Boolean(focus) && i <= steps.findIndex((s) => s.id === focus);

  const n = steps.length;
  const grid = {
    '--cols': steps.map((_, i) => (i ? '40px minmax(0, 220px)' : 'minmax(0, 220px)')).join(' '),
    '--rows': n + 2,
  };

  return (
    <div className={styles.frame}>
      <ol className={styles.map} style={grid} aria-label={tt('roadmap.mapLabel', 'The roadmap, step by step')}>
        {steps.map((s, i) => {
          const isOpen = open === s.id;
          const phase = s.phase
            ? tt('roadmap.phase', 'Phase {n}').replace('{n}', s.phase)
            : tt('roadmap.now', 'Now');
          const status = tt(STATUS[s.status][0], STATUS[s.status][1]);
          const shots = (s.screenshots || []).map((x) => ({ url: x.src, alt: tt(x.alt[0], x.alt[1]) }));
          return (
            <li key={s.id} className={`${styles.step} ${isOpen ? styles.open : ''}`}>
              {i > 0 && (
                <>
                  <div className={`${styles.feeder} ${lit(i) ? styles.lit : ''}`}
                       style={{ '--c': 2 * i - 1, '--r': i + 2 }}>
                    <span className={styles.chip}>
                      <span className={styles.chipLabel}>{tt('roadmap.buildsOn', 'Builds on')}</span>
                      <span className={styles.chipName}>{tt(s.builds[0], s.builds[1])}</span>
                    </span>
                  </div>
                  <svg className={styles.wire} style={{ '--c': 2 * i, '--r': i }} viewBox="0 0 40 224"
                       preserveAspectRatio="none" aria-hidden="true" focusable="false">
                    <path className={lit(i) ? styles.wireLit : ''} d="M0 50 H20 V106 H40" />
                    <path className={lit(i) ? styles.wireLit : ''} d="M0 162 H20 V106" />
                  </svg>
                </>
              )}
              <button type="button" className={styles.node} style={{ '--c': 2 * i + 1, '--r': i + 1 }}
                      aria-expanded={isOpen} aria-controls={`roadmap-step-${s.id}`}
                      onClick={() => setOpen(isOpen && !focus ? null : s.id)}>
                <span className={styles.nodeTop}>
                  <span className={styles.phase}>{phase}</span>
                  <span className={`${styles.badge} ${s.status === 'live' ? styles.badgeLive : ''}`}>{status}</span>
                </span>
                <span className={styles.name}>{tt(s.title[0], s.title[1])}</span>
              </button>
              {/* On a module's own page its heading and intro are the page's
                  h1 and blurb already, so its step does not say them twice. */}
              <section id={`roadmap-step-${s.id}`} className={styles.detail} hidden={!isOpen}
                       aria-label={tt(s.title[0], s.title[1])}>
                {s.id !== focus && <>
                  <div className={styles.detailTop}>
                    <span className={styles.phase}>{phase}</span>
                    <span className={`${styles.badge} ${s.status === 'live' ? styles.badgeLive : ''}`}>{status}</span>
                  </div>
                  <h2 className={styles.detailTitle}>{tt(s.title[0], s.title[1])}</h2>
                  <p className={styles.blurb}>{tt(s.blurb[0], s.blurb[1])}</p>
                </>}
                <ul className={styles.lines}>
                  {s.features.map(([key, fallback]) => <li key={key}>{tt(key, fallback)}</li>)}
                </ul>
                {shots.length > 0 && (
                  <div className={styles.shots}>
                    {shots.map((x, k) => (
                      <button type="button" key={x.url} className={styles.shot}
                              onClick={() => setShot({ images: shots, start: k })}
                              aria-label={`${x.alt}. ${tt('slots.tapToEnlarge', 'Tap to enlarge')}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={x.url} alt={x.alt} loading="lazy" />
                      </button>
                    ))}
                  </div>
                )}
                {s.id !== 'live' && (
                  <div className={styles.actions}>
                    <NotifyWhenOpen module={s.id} />
                    {!focus && (
                      <Link href={s.href} className={styles.more}>{tt('roadmap.openPage', 'Its page')}</Link>
                    )}
                  </div>
                )}
              </section>
            </li>
          );
        })}
      </ol>
      {shot && <ImageViewer images={shot.images} start={shot.start} onClose={() => setShot(null)} />}
    </div>
  );
};

export default RoadmapMap;
