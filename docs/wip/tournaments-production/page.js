'use client'

import { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  LuRadio, LuPlay, LuPause, LuCheck, LuMonitor, LuExternalLink,
  LuRefreshCw, LuCopy, LuEye, LuArrowRight,
} from 'react-icons/lu';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import { mockTournaments, mockMatches, mockOverlayConfigs, mockProductionClients } from '@/lib/mockData';
import styles from './production.module.css';

const ProductionContent = () => {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const tournament = useMemo(() => mockTournaments.find((t) => t.id === id) || mockTournaments[0], [id]);

  const [matches, setMatches] = useState(() => mockMatches.slice(0, 6));
  const [activeId, setActiveId] = useState(matches[0]?.id);
  const active = matches.find((m) => m.id === activeId) || matches[0];

  const [scoreA, setScoreA] = useState(active?.score_a ?? 0);
  const [scoreB, setScoreB] = useState(active?.score_b ?? 0);
  const [overlays, setOverlays] = useState(mockOverlayConfigs);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [toast, setToast] = useState(null);
  const [copied, setCopied] = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  // Avoid hydration mismatch: render the path on the server, upgrade to the
  // full URL on the client after mount.
  const [overlayUrl, setOverlayUrl] = useState(`/tournaments/overlay?id=${tournament.id}`);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOverlayUrl(`${window.location.origin}/tournaments/overlay?id=${tournament.id}`);
    }
  }, [tournament.id]);

  useEffect(() => {
    setScoreA(active?.score_a ?? 0);
    setScoreB(active?.score_b ?? 0);
  }, [activeId, active]);

  const updateScore = (delta, side) => {
    if (side === 'a') setScoreA(Math.max(0, scoreA + delta));
    else setScoreB(Math.max(0, scoreB + delta));
  };

  const pushScore = () => {
    setMatches(matches.map((m) => m.id === activeId ? { ...m, score_a: scoreA, score_b: scoreB } : m));
    showToast('Score pushed to overlay');
  };

  const startStream = () => {
    setMatches(matches.map((m) => m.id === activeId ? { ...m, status: 'live' } : m));
    showToast('Stream started');
  };

  const stopStream = () => {
    setMatches(matches.map((m) => m.id === activeId ? { ...m, status: 'completed' } : m));
    showToast('Stream stopped');
  };

  const toggleOverlay = (oid) => {
    setOverlays(overlays.map((o) => o.id === oid ? { ...o, is_visible: !o.is_visible } : o));
  };

  const startScan = () => {
    setScanning(true);
    setScanResult(null);
    setTimeout(() => {
      setScanning(false);
      setScanResult({
        resolution: '1920×1080',
        fps: 60,
        capture_card: 'Elgato HD60 X',
        signal: 'HDMI 2.0',
        status: 'connected',
      });
      showToast('Screen-share scan complete');
    }, 1400);
  };

  const copyOverlayUrl = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(overlayUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <div className={styles.pageHeader}>
            <div>
              <Link href={`/tournaments/manage?id=${tournament.id}`} className={styles.backLink}>← Manage Tournament</Link>
              <h1 className={styles.pageTitle}>Production Panel</h1>
              <p className={styles.pageSub}>{tournament.name} · Match control, overlays, screen-share</p>
            </div>
            <div className={styles.headerActions}>
              <Link href={`/tournaments/overlay?id=${tournament.id}`} target="_blank">
                <button className={styles.outlineBtn}><LuExternalLink /> Open Overlay</button>
              </Link>
            </div>
          </div>

          <div className={styles.layout}>
            {/* LEFT — Match selector */}
            <section className={styles.column}>
              <h3 className={styles.colTitle}>Live Match Selector</h3>
              <div className={styles.matchList}>
                {matches.map((m) => (
                  <button
                    key={m.id}
                    className={`${styles.matchItem} ${activeId === m.id ? styles.matchItemActive : ''}`}
                    onClick={() => setActiveId(m.id)}
                  >
                    <div className={styles.matchTop}>
                      <span className={styles.matchRound}>{m.bracket_round || `R${m.round}`}</span>
                      <span className={`${styles.matchStatus} ${styles[`status_${m.status}`]}`}>{m.status}</span>
                    </div>
                    <p className={styles.matchTeams}>{m.team_a.name} <span className={styles.vsTag}>vs</span> {m.team_b.name}</p>
                    {m.status !== 'scheduled' && (
                      <p className={styles.matchScore}>{m.score_a} — {m.score_b}</p>
                    )}
                  </button>
                ))}
              </div>
            </section>

            {/* CENTER — Score input + scoreboard preview */}
            <section className={styles.column}>
              <h3 className={styles.colTitle}>Score Input</h3>
              <div className={styles.scoreCard}>
                <div className={styles.scoreSide}>
                  <p className={styles.sideTeam}>{active.team_a.name}</p>
                  <p className={styles.sideTag}>{active.team_a.tag}</p>
                  <div className={styles.scoreCounter}>
                    <button className={styles.scoreBtn} onClick={() => updateScore(-1, 'a')}>−</button>
                    <span className={styles.scoreValue}>{scoreA}</span>
                    <button className={styles.scoreBtn} onClick={() => updateScore(1, 'a')}>+</button>
                  </div>
                </div>

                <div className={styles.scoreSep}>VS</div>

                <div className={styles.scoreSide}>
                  <p className={styles.sideTeam}>{active.team_b.name}</p>
                  <p className={styles.sideTag}>{active.team_b.tag}</p>
                  <div className={styles.scoreCounter}>
                    <button className={styles.scoreBtn} onClick={() => updateScore(-1, 'b')}>−</button>
                    <span className={styles.scoreValue}>{scoreB}</span>
                    <button className={styles.scoreBtn} onClick={() => updateScore(1, 'b')}>+</button>
                  </div>
                </div>
              </div>

              <div className={styles.scoreActions}>
                {active.status === 'scheduled' && (
                  <button className={`${styles.btn} goldBTN`} onClick={startStream}><LuPlay /> Start Stream</button>
                )}
                {active.status === 'live' && (
                  <button className={`${styles.btn} ${styles.dangerBtn}`} onClick={stopStream}><LuPause /> Stop Stream</button>
                )}
                <button className={`${styles.btn} ${styles.outlineBtn}`} onClick={pushScore}>
                  <LuCheck /> Push Score
                </button>
              </div>

              <h3 className={styles.colTitle} style={{ marginTop: '1.5rem' }}>Scoreboard Preview</h3>
              <div className={styles.scoreboardPreview}>
                <div className={styles.sbInner}>
                  <div className={styles.sbTeamPreview}>
                    <span className={styles.sbTag}>{active.team_a.tag}</span>
                    <strong className={styles.sbScore}>{scoreA}</strong>
                  </div>
                  <span className={styles.sbDot}>●</span>
                  <div className={styles.sbTeamPreview}>
                    <strong className={styles.sbScore}>{scoreB}</strong>
                    <span className={styles.sbTag}>{active.team_b.tag}</span>
                  </div>
                </div>
                <p className={styles.previewHint}>Live overlay preview · This is what viewers see</p>
              </div>
            </section>

            {/* RIGHT — Overlay config + screen scan + clients */}
            <section className={styles.column}>
              <h3 className={styles.colTitle}>Overlay URL for OBS</h3>
              <div className={styles.urlCard}>
                <code className={styles.urlText}>{overlayUrl}</code>
                <button className={styles.copyBtn} onClick={copyOverlayUrl}>
                  {copied ? <LuCheck /> : <LuCopy />} {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <Link href={`/tournaments/overlay?id=${tournament.id}`} target="_blank">
                <button className={`${styles.btn} ${styles.outlineBtn}`} style={{ width: '100%' }}>
                  <LuEye /> Preview Overlay
                </button>
              </Link>

              <h3 className={styles.colTitle} style={{ marginTop: '1.5rem' }}>Overlays</h3>
              <div className={styles.overlayList}>
                {overlays.map((o) => (
                  <div key={o.id} className={styles.overlayRow}>
                    <span className={styles.overlayDot} style={{ backgroundColor: o.accent_color }} />
                    <div className={styles.overlayInfo}>
                      <p className={styles.overlayName}>{o.name}</p>
                      <p className={styles.overlayMeta}>{o.position}</p>
                    </div>
                    <button
                      className={`${styles.toggle} ${o.is_visible ? styles.toggleOn : ''}`}
                      onClick={() => toggleOverlay(o.id)}
                      aria-label={`Toggle ${o.name}`}
                    >
                      <span className={styles.toggleKnob} />
                    </button>
                  </div>
                ))}
              </div>

              <h3 className={styles.colTitle} style={{ marginTop: '1.5rem' }}>Screen-share Scan</h3>
              <div className={styles.scanCard}>
                <button className={`${styles.btn} ${styles.outlineBtn}`} onClick={startScan} disabled={scanning} style={{ width: '100%' }}>
                  {scanning ? (
                    <><LuRefreshCw className={styles.spinning} /> Scanning…</>
                  ) : (
                    <><LuMonitor /> Scan for Capture Devices</>
                  )}
                </button>
                {scanResult && (
                  <div className={styles.scanResult}>
                    <div className={styles.scanRow}><span>Capture Card</span><strong>{scanResult.capture_card}</strong></div>
                    <div className={styles.scanRow}><span>Signal</span><strong>{scanResult.signal}</strong></div>
                    <div className={styles.scanRow}><span>Resolution</span><strong>{scanResult.resolution}</strong></div>
                    <div className={styles.scanRow}><span>FPS</span><strong>{scanResult.fps}</strong></div>
                    <div className={styles.scanRow}><span>Status</span>
                      <strong style={{ color: 'var(--v-ent-gold)' }}>● {scanResult.status}</strong>
                    </div>
                  </div>
                )}
              </div>

              <h3 className={styles.colTitle} style={{ marginTop: '1.5rem' }}>Production Clients</h3>
              <div className={styles.clientList}>
                {mockProductionClients.map((c) => (
                  <div key={c.id} className={styles.clientRow}>
                    <span className={`${styles.clientDot} ${c.status === 'connected' ? styles.clientDotOn : styles.clientDotOff}`} />
                    <div className={styles.clientInfo}>
                      <p className={styles.clientName}>{c.name}</p>
                      <p className={styles.clientHost}>{c.host}</p>
                    </div>
                    <span className={styles.clientLatency}>
                      {c.latency_ms ? `${c.latency_ms}ms` : 'Offline'}
                    </span>
                  </div>
                ))}
              </div>

              <Link href="/production" className={styles.deepLink}>
                Open V-ENT Production Hub <LuArrowRight />
              </Link>
            </section>
          </div>
        </div>
      </main>

      <BottomMenu />

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
};

const Production = () => (
  <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
    <ProductionContent />
  </Suspense>
);

export default Production;
