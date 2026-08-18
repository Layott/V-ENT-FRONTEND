'use client'

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { mockTournaments, mockMatches, mockOverlayConfigs } from '@/lib/mockData';
import styles from './overlay.module.css';

const OverlayContent = () => {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const tournament = useMemo(() => mockTournaments.find((t) => t.id === id) || mockTournaments[0], [id]);

  // Pick the first live match for this tournament (or fall back).
  const liveMatch = useMemo(() => {
    return mockMatches.find((m) => m.status === 'live') || mockMatches[0];
  }, []);

  const config = useMemo(() => ({
    scoreboard: mockOverlayConfigs.find((o) => o.type === 'scoreboard'),
    timer: mockOverlayConfigs.find((o) => o.type === 'timer'),
    sponsor: mockOverlayConfigs.find((o) => o.type === 'sponsor_bar'),
    lower_third: mockOverlayConfigs.find((o) => o.type === 'lower_third'),
  }), []);

  const [tick, setTick] = useState(0);
  const [scoreA, setScoreA] = useState(liveMatch?.score_a ?? 0);
  const [scoreB, setScoreB] = useState(liveMatch?.score_b ?? 0);

  useEffect(() => {
    // Make body transparent for OBS Browser source.
    if (typeof document === 'undefined') return;
    const prevBg = document.body.style.backgroundColor;
    const prevHtmlBg = document.documentElement.style.backgroundColor;
    document.body.style.backgroundColor = 'transparent';
    document.documentElement.style.backgroundColor = 'transparent';
    return () => {
      document.body.style.backgroundColor = prevBg;
      document.documentElement.style.backgroundColor = prevHtmlBg;
    };
  }, []);

  // Mock live match clock.
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, []);

  const minutes = String(Math.floor((tick + 124) / 60) % 60).padStart(2, '0');
  const seconds = String((tick + 124) % 60).padStart(2, '0');

  const sponsors = ['VERMILLION ENCORE', 'V-ENT STUDIOS', 'GAMERFUEL NG', 'PIXELFORGE'];

  return (
    <div className={styles.root}>
      {/* Visually-hidden heading for a11y — overlay page is transparent for
          OBS Browser source, so we keep a screen-reader-only title. */}
      <h1 style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
        {tournament?.name || 'Tournament'} live overlay
      </h1>
      {/* Top scoreboard */}
      {config.scoreboard?.is_visible && (
        <div className={styles.scoreboard} style={{ '--accent': config.scoreboard.accent_color }}>
          <div className={styles.sbBlock}>
            <div className={styles.sbLogo}>{liveMatch?.team_a?.name?.charAt(0) || 'A'}</div>
            <div className={styles.sbInfo}>
              <span className={styles.sbTag}>{liveMatch?.team_a?.tag || 'TM-A'}</span>
              <span className={styles.sbName}>{liveMatch?.team_a?.name || 'Team A'}</span>
            </div>
            <div className={styles.sbScore}>{scoreA}</div>
          </div>

          <div className={styles.sbCenter}>
            {config.timer?.is_visible && (
              <div className={styles.timerCard}>
                <span className={styles.timerLabel}>LIVE</span>
                <span className={styles.timerValue}>{minutes}:{seconds}</span>
              </div>
            )}
            <div className={styles.matchLabel}>{liveMatch?.bracket_round || 'R1'} · {tournament.name}</div>
          </div>

          <div className={styles.sbBlock}>
            <div className={styles.sbScore}>{scoreB}</div>
            <div className={styles.sbInfo} style={{ alignItems: 'flex-end', textAlign: 'right' }}>
              <span className={styles.sbTag}>{liveMatch?.team_b?.tag || 'TM-B'}</span>
              <span className={styles.sbName}>{liveMatch?.team_b?.name || 'Team B'}</span>
            </div>
            <div className={styles.sbLogo}>{liveMatch?.team_b?.name?.charAt(0) || 'B'}</div>
          </div>
        </div>
      )}

      {/* Lower third — caster card */}
      {config.lower_third?.is_visible && (
        <div className={styles.lowerThird} style={{ '--accent': config.lower_third.accent_color }}>
          <div className={styles.lowerLogo}>VC</div>
          <div className={styles.lowerInfo}>
            <span className={styles.lowerName}>Casters: jay_o &amp; ada_a</span>
            <span className={styles.lowerSub}>{tournament.game} · Live · v-ent.co</span>
          </div>
          <div className={styles.liveDot} />
        </div>
      )}

      {/* Sponsor bar */}
      {config.sponsor?.is_visible && (
        <div className={styles.sponsorBar} style={{ '--accent': config.sponsor.accent_color }}>
          <span className={styles.sponsorLabel}>POWERED BY</span>
          <div className={styles.sponsorTrack}>
            {sponsors.concat(sponsors).map((s, i) => (
              <span key={i} className={styles.sponsorItem}>{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Hidden interactive layer (only shows on hover when previewing) */}
      <div className={styles.previewControls}>
        <span className={styles.previewBadge}>OBS PREVIEW</span>
        <div className={styles.previewControlsInner}>
          <button onClick={() => setScoreA(Math.max(0, scoreA - 1))}>A −</button>
          <button onClick={() => setScoreA(scoreA + 1)}>A +</button>
          <button onClick={() => setScoreB(Math.max(0, scoreB - 1))}>B −</button>
          <button onClick={() => setScoreB(scoreB + 1)}>B +</button>
        </div>
        <span className={styles.previewHint}>Hover to test scores · This UI is hidden in OBS</span>
      </div>
    </div>
  );
};

const Overlay = () => (
  <Suspense fallback={null}>
    <OverlayContent />
  </Suspense>
);

export default Overlay;
