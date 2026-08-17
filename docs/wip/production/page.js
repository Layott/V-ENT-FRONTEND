'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  BsBroadcast,
  BsLayers,
  BsCollectionPlay,
  BsDiagram3,
  BsCameraVideo,
  BsHddNetwork,
  BsCopy,
  BsPencilSquare,
  BsPlayFill,
  BsPauseFill,
  BsTrophy,
  BsArrowClockwise,
  BsCheckCircle,
  BsXCircle,
  BsExclamationTriangle,
  BsTrash,
  BsLink45Deg,
  BsActivity,
  BsLightning,
  BsCpu,
  BsWindow,
  BsUiRadiosGrid,
  BsArrowRepeat,
  BsSearch,
  BsHouseDoor,
} from 'react-icons/bs';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import Sidebar from '@/components/sidebar/Sidebar';
import {
  mockOverlayConfigs,
  mockScenesV2,
  mockDataPipelineV2,
  mockProductionClients,
  mockTournaments,
} from '@/lib/mockData';
import styles from './production.module.css';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BsBroadcast },
  { id: 'overlays', label: 'Overlays', icon: BsLayers },
  { id: 'scenes', label: 'Scenes', icon: BsCollectionPlay },
  { id: 'pipeline', label: 'Data Pipeline', icon: BsDiagram3 },
  { id: 'scan', label: 'Scan', icon: BsCameraVideo },
  { id: 'clients', label: 'Clients', icon: BsHddNetwork },
];

const SCENE_ICON_MAP = {
  lobby: BsHouseDoor,
  live: BsPlayFill,
  match: BsPlayFill,
  replay: BsArrowRepeat,
  trophy: BsTrophy,
  winner: BsTrophy,
  pause: BsPauseFill,
  countdown: BsLightning,
};

// ── Static client discovery list (for Scan tab simulation) ───────────────
const DISCOVERABLE_CLIENTS = [
  {
    id: 'disc_obs_main',
    name: 'OBS Studio (MAIN-PC)',
    type: 'OBS',
    host: 'MAIN-PC.local',
    ip: '192.168.1.42',
    version: '30.1.2',
    os: 'Windows 11',
  },
  {
    id: 'disc_vmix_director',
    name: 'vMix (DIRECTOR-LAPTOP)',
    type: 'vMix',
    host: 'DIRECTOR-LAPTOP.local',
    ip: '192.168.1.55',
    version: '26.1.0',
    os: 'Windows 10',
  },
  {
    id: 'disc_streamlabs_caster',
    name: 'Streamlabs Desktop (CASTER-MBP)',
    type: 'Streamlabs',
    host: 'CASTER-MBP.local',
    ip: '192.168.1.71',
    version: '1.18.4',
    os: 'macOS 14.4',
  },
];

// ── Detailed client list for Clients tab ─────────────────────────────────
const FULL_CLIENT_LIST = [
  {
    id: 'cli_obs_1',
    name: 'OBS Studio',
    type: 'OBS',
    version: '30.1.2',
    os: 'Windows 11',
    host: 'MAIN-PC',
    ip: '192.168.1.42',
    status: 'connected',
    last_seen: 'just now',
    latency_ms: 32,
  },
  {
    id: 'cli_vmix_1',
    name: 'vMix',
    type: 'vMix',
    version: '26.1.0',
    os: 'Windows 10',
    host: 'DIRECTOR-LAPTOP',
    ip: '192.168.1.55',
    status: 'connected',
    last_seen: '1 min ago',
    latency_ms: 48,
  },
  {
    id: 'cli_sl_1',
    name: 'Streamlabs Desktop',
    type: 'Streamlabs',
    version: '1.18.4',
    os: 'macOS 14.4',
    host: 'CASTER-MBP',
    ip: '192.168.1.71',
    status: 'disconnected',
    last_seen: '8 mins ago',
    latency_ms: null,
  },
  {
    id: 'cli_obs_2',
    name: 'OBS Studio',
    type: 'OBS',
    version: '29.1.3',
    os: 'Ubuntu 22.04',
    host: 'BACKUP-RIG',
    ip: '192.168.1.88',
    status: 'connected',
    last_seen: '12s ago',
    latency_ms: 56,
  },
];

const CLIENT_TYPE_COLORS = {
  OBS: '#5a9bff',
  vMix: '#D4AF37',
  Streamlabs: '#C084FC',
};

// ── Overlay preview component (mini SVG thumbnail) ───────────────────────
const OverlayThumbnail = ({ overlay }) => {
  const accent = overlay.accent_color;
  const t = overlay.type;

  return (
    <div className={styles.overlayThumb} style={{ borderColor: `${accent}33` }}>
      <div className={styles.overlayThumbScreen}>
        {t === 'lower_third' && (
          <div className={styles.thumbLowerThird} style={{ borderLeftColor: accent }}>
            <span className={styles.thumbLTName}>JAY_O</span>
            <span className={styles.thumbLTSub}>Caster · NG</span>
          </div>
        )}
        {t === 'scoreboard' && (
          <div className={styles.thumbScoreboard} style={{ background: `linear-gradient(135deg, ${accent}, #1a1a1e 80%)` }}>
            <span className={styles.thumbSbTeam}>CRW</span>
            <span className={styles.thumbSbScore}>3 — 2</span>
            <span className={styles.thumbSbTeam}>AR</span>
          </div>
        )}
        {t === 'sponsor_bar' && (
          <div className={styles.thumbSponsor} style={{ borderTopColor: accent }}>
            <span>VERMILLION</span>
            <span>·</span>
            <span>GAMERFUEL</span>
            <span>·</span>
            <span>PIXELFORGE</span>
          </div>
        )}
        {t === 'bracket_overview' && (
          <div className={styles.thumbBracket}>
            {Array.from({ length: 3 }).map((_, col) => (
              <div key={col} className={styles.thumbBracketCol}>
                {Array.from({ length: 3 - col }).map((__, row) => (
                  <span
                    key={row}
                    className={styles.thumbBracketSlot}
                    style={{ borderColor: row === 0 ? accent : 'rgba(255,255,255,0.15)' }}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
        {t === 'team_names' && (
          <div className={styles.thumbTeamNames}>
            <div className={styles.thumbTNCorner} style={{ borderColor: accent }}>CRW</div>
            <div className={styles.thumbTNCorner} style={{ borderColor: accent, alignSelf: 'flex-end' }}>AR</div>
          </div>
        )}
        {t === 'timer' && (
          <div className={styles.thumbTimer} style={{ borderColor: accent, color: accent }}>
            12:34
          </div>
        )}
      </div>
    </div>
  );
};

// ── Scene preview component (mini canvas) ────────────────────────────────
const ScenePreview = ({ scene }) => {
  const colors = {
    lobby: ['#5a9bff', '#212225'],
    match: ['#ED1C24', '#0f0f12'],
    replay: ['#FBC64B', '#1a1a1e'],
    winner: ['#D4AF37', '#0f0f12'],
  };
  const [accent, bg] = colors[scene.type] || colors.match;

  return (
    <div
      className={styles.scenePreview}
      style={{ background: `linear-gradient(135deg, ${accent}22 0%, ${bg} 100%)` }}
    >
      {scene.type === 'lobby' && (
        <>
          <span className={styles.previewBigText} style={{ color: accent }}>STARTING SOON</span>
          <span className={styles.previewSubText}>03:21</span>
        </>
      )}
      {scene.type === 'match' && (
        <>
          <div className={styles.previewSbStrip} style={{ background: accent }}>
            CRW 3 — 2 AR
          </div>
          <span className={styles.previewSubText}>FIFA Pro Cup · R1</span>
        </>
      )}
      {scene.type === 'replay' && (
        <>
          <span className={styles.previewBigText} style={{ color: accent }}>REPLAY</span>
          <span className={styles.previewSubText}>Goal · 67th min</span>
        </>
      )}
      {scene.type === 'winner' && (
        <>
          <BsTrophy size={32} style={{ color: accent }} />
          <span className={styles.previewBigText} style={{ color: accent }}>WINNER</span>
          <span className={styles.previewSubText}>Crimson Wolves</span>
        </>
      )}
    </div>
  );
};

// ── Toggle component ────────────────────────────────────────────────────
const Toggle = ({ on, onClick, ariaLabel }) => (
  <button
    type="button"
    className={`${styles.toggle} ${on ? styles.toggleOn : ''}`}
    onClick={onClick}
    aria-label={ariaLabel}
    aria-pressed={on}
  >
    <span className={styles.toggleKnob} />
  </button>
);

// ── Page ────────────────────────────────────────────────────────────────
const ProductionPage = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [toast, setToast] = useState('');
  const toastTimerRef = useRef(null);

  // local mutable state (mock-driven)
  const [overlays, setOverlays] = useState(() => mockOverlayConfigs.map((o) => ({ ...o })));
  const [scenes, setScenes] = useState(() => mockScenesV2.map((s) => ({ ...s })));
  const [pipelines, setPipelines] = useState(() => mockDataPipelineV2.map((p) => ({ ...p })));
  const [pipelineLoadingId, setPipelineLoadingId] = useState(null);

  // Scan tab state
  const [scanning, setScanning] = useState(false);
  const [discovered, setDiscovered] = useState([]);
  const [scanScannedAt, setScanScannedAt] = useState(null);

  // Scene "going live" countdown
  const [goingLiveScene, setGoingLiveScene] = useState(null);
  const [goingLiveTick, setGoingLiveTick] = useState(0);

  // Overview ticker (5s polling sim)
  const [, setOverviewTick] = useState(0);

  const liveTournament = mockTournaments[0];

  const showToast = useCallback((msg) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), 2200);
  }, []);

  // 5s mock polling: bump latency a touch + last_ping
  useEffect(() => {
    const i = setInterval(() => {
      setPipelines((curr) =>
        curr.map((p) =>
          p.status === 'connected'
            ? { ...p, latency_ms: Math.max(8, (p.latency_ms || 30) + Math.floor(Math.random() * 9 - 4)), last_ping: new Date().toISOString() }
            : p
        )
      );
      setOverviewTick((t) => t + 1);
    }, 5000);
    return () => clearInterval(i);
  }, []);

  // Going-live countdown (3..2..1 then go)
  useEffect(() => {
    if (!goingLiveScene) return;
    setGoingLiveTick(3);
    const t1 = setTimeout(() => setGoingLiveTick(2), 700);
    const t2 = setTimeout(() => setGoingLiveTick(1), 1400);
    const t3 = setTimeout(() => {
      setScenes((curr) => curr.map((s) => ({ ...s, is_active: s.id === goingLiveScene })));
      const sceneName = scenes.find((s) => s.id === goingLiveScene)?.name || '';
      showToast(`Now live: ${sceneName}`);
      setGoingLiveScene(null);
    }, 2100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [goingLiveScene, scenes, showToast]);

  // ── Derived stats for Overview ───────────────────────────────────────
  const stats = useMemo(() => {
    const activeOverlays = overlays.filter((o) => o.is_visible).length;
    const obsConnected = pipelines.filter((p) => p.type === 'broadcast_software' && p.name.includes('OBS') && p.status === 'connected').length;
    const vmixConnected = pipelines.filter((p) => p.name.includes('vMix') && p.status === 'connected').length;
    const slConnected = pipelines.filter((p) => p.name.includes('Streamlabs') && p.status === 'connected').length;
    const totalConnected = obsConnected + vmixConnected + slConnected;
    const activeScene = scenes.find((s) => s.is_active);
    return {
      activeOverlays,
      total: overlays.length,
      obsConnected,
      vmixConnected,
      slConnected,
      totalConnected,
      activeSceneName: activeScene?.name || '—',
      lastSceneChange: activeScene?.last_used,
      liveTournamentsUsing: 1,
    };
  }, [overlays, pipelines, scenes]);

  // ── Actions ──────────────────────────────────────────────────────────
  const copyOverlayUrl = async (overlay) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/tournaments/overlay?id=${liveTournament.id}&config=${overlay.id}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      // non-fatal in mock mode
    }
    showToast('Overlay URL copied');
  };

  const toggleOverlay = (id) => {
    setOverlays((curr) =>
      curr.map((o) => (o.id === id ? { ...o, is_visible: !o.is_visible } : o))
    );
  };

  const reloadAllOverlays = () => {
    setOverlays((curr) => curr.map((o) => ({ ...o, updated_at: new Date().toISOString() })));
    showToast('Reloaded all overlays');
  };

  const testSponsorRotation = () => {
    showToast('Sponsor rotation test pushed to clients');
  };

  const setSceneLive = (sceneId) => {
    setGoingLiveScene(sceneId);
  };

  const testPipeline = (id) => {
    setPipelineLoadingId(id);
    setTimeout(() => {
      setPipelines((curr) =>
        curr.map((p) => {
          if (p.id !== id) return p;
          const success = Math.random() > 0.15;
          return {
            ...p,
            status: success ? 'connected' : 'error',
            latency_ms: success ? 18 + Math.floor(Math.random() * 60) : null,
            last_ping: new Date().toISOString(),
          };
        })
      );
      setPipelineLoadingId(null);
      const tested = pipelines.find((p) => p.id === id);
      showToast(`Tested ${tested?.name || 'pipeline'}`);
    }, 1200);
  };

  const restartPipeline = (id) => {
    setPipelines((curr) =>
      curr.map((p) =>
        p.id === id
          ? { ...p, status: 'connected', latency_ms: 25 + Math.floor(Math.random() * 50), last_ping: new Date().toISOString() }
          : p
      )
    );
    showToast('Pipeline restarted');
  };

  const startScan = () => {
    setScanning(true);
    setDiscovered([]);
    setTimeout(() => {
      setDiscovered(DISCOVERABLE_CLIENTS);
      setScanScannedAt(new Date());
      setScanning(false);
      showToast('Scan complete · 3 clients discovered');
    }, 2000);
  };

  const connectDiscovered = (id) => {
    const c = DISCOVERABLE_CLIENTS.find((x) => x.id === id);
    showToast(`Connected to ${c?.name || 'client'}`);
  };

  const disconnectClient = (id) => {
    showToast('Client disconnected');
  };

  // ── Helpers ──────────────────────────────────────────────────────────
  const formatRelative = (iso) => {
    if (!iso) return 'never';
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 5000) return 'just now';
    if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    return `${Math.floor(diff / 3_600_000)}h ago`;
  };

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          {/* Page header */}
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>Production</h1>
              <p className={styles.pageSubtitle}>
                Stream control for OBS, vMix and Streamlabs. Configure overlays, scenes and live data.
              </p>
            </div>
            <div className={styles.headerRight}>
              <span className={styles.liveBadge}>
                <span className={styles.liveDot} />
                Live · {liveTournament?.name || 'FIFA Pro Cup'}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className={styles.tabsBar} role="tablist">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={activeTab === t.id}
                  className={`${styles.tabBtn} ${activeTab === t.id ? styles.tabBtnActive : ''}`}
                  onClick={() => setActiveTab(t.id)}
                >
                  <Icon style={{ marginRight: '0.4rem', verticalAlign: '-2px' }} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* ─── OVERVIEW ─── */}
          {activeTab === 'overview' && (
            <>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statHeader}>
                    <BsLayers className={styles.statIcon} />
                    <span className={styles.statLabel}>Active Overlays</span>
                  </div>
                  <div className={styles.statValueRow}>
                    <p className={styles.statValue}>{stats.activeOverlays}</p>
                    <span className={styles.statDelta}>of {stats.total}</span>
                  </div>
                  <p className={styles.statMeta}>Visible to viewers right now</p>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statHeader}>
                    <BsHddNetwork className={styles.statIcon} />
                    <span className={styles.statLabel}>Connected Clients</span>
                  </div>
                  <div className={styles.statValueRow}>
                    <p className={styles.statValue}>{stats.totalConnected}</p>
                    <span className={styles.statDelta}>online</span>
                  </div>
                  <div className={styles.clientPills}>
                    <span className={styles.clientPill} style={{ '--c': CLIENT_TYPE_COLORS.OBS }}>
                      OBS · {stats.obsConnected}
                    </span>
                    <span className={styles.clientPill} style={{ '--c': CLIENT_TYPE_COLORS.vMix }}>
                      vMix · {stats.vmixConnected}
                    </span>
                    <span className={styles.clientPill} style={{ '--c': CLIENT_TYPE_COLORS.Streamlabs }}>
                      Streamlabs · {stats.slConnected}
                    </span>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statHeader}>
                    <BsCollectionPlay className={styles.statIcon} />
                    <span className={styles.statLabel}>Active Scene</span>
                  </div>
                  <div className={styles.statValueRow}>
                    <p className={styles.statValue} style={{ fontSize: '1.25rem' }}>{stats.activeSceneName}</p>
                  </div>
                  <p className={styles.statMeta}>Changed {formatRelative(stats.lastSceneChange)}</p>
                </div>

                <div className={styles.statCard}>
                  <div className={styles.statHeader}>
                    <BsBroadcast className={styles.statIcon} />
                    <span className={styles.statLabel}>Live Tournaments</span>
                  </div>
                  <div className={styles.statValueRow}>
                    <p className={styles.statValue}>{stats.liveTournamentsUsing}</p>
                    <span className={styles.statDelta}>using production</span>
                  </div>
                  <p className={styles.statMeta}>{liveTournament?.name || '—'}</p>
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.cardTitle}>Quick Actions</h3>
                    <p className={styles.cardSubtle}>Push commands to all connected production clients.</p>
                  </div>
                </div>
                <div className={styles.actionGrid}>
                  <button type="button" className={styles.actionTile} onClick={startScan}>
                    <BsSearch className={styles.actionIcon} style={{ color: '#5a9bff' }} />
                    <span className={styles.actionTitle}>Start Scan</span>
                    <span className={styles.actionSub}>Discover OBS / vMix / Streamlabs on your network</span>
                  </button>
                  <button type="button" className={styles.actionTile} onClick={reloadAllOverlays}>
                    <BsArrowClockwise className={styles.actionIcon} style={{ color: '#D4AF37' }} />
                    <span className={styles.actionTitle}>Reload All Overlays</span>
                    <span className={styles.actionSub}>Refresh all browser sources at once</span>
                  </button>
                  <button type="button" className={styles.actionTile} onClick={testSponsorRotation}>
                    <BsLightning className={styles.actionIcon} style={{ color: '#FBC64B' }} />
                    <span className={styles.actionTitle}>Test Sponsor Rotation</span>
                    <span className={styles.actionSub}>Trigger sponsor cycle on the bottom bar</span>
                  </button>
                </div>
              </div>

              <div className={styles.twoCol}>
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div>
                      <h3 className={styles.cardTitle}>Pipeline Health</h3>
                      <p className={styles.cardSubtle}>Live latency from data sources.</p>
                    </div>
                    <button
                      type="button"
                      className={styles.smallBtnGhost}
                      onClick={() => setActiveTab('pipeline')}
                    >
                      View all
                    </button>
                  </div>
                  <div className={styles.miniList}>
                    {pipelines.slice(0, 4).map((p) => (
                      <div key={p.id} className={styles.miniRow}>
                        <span
                          className={`${styles.miniDot} ${
                            p.status === 'connected' ? styles.miniDotOn : p.status === 'error' ? styles.miniDotErr : styles.miniDotOff
                          }`}
                        />
                        <div className={styles.miniInfo}>
                          <p className={styles.miniName}>{p.name}</p>
                          <p className={styles.miniSub}>{p.type.replace('_', ' ')}</p>
                        </div>
                        <span className={styles.miniLatency}>
                          {p.latency_ms != null ? `${p.latency_ms}ms` : 'offline'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div>
                      <h3 className={styles.cardTitle}>Active Overlays</h3>
                      <p className={styles.cardSubtle}>Toggle visibility from the Overlays tab.</p>
                    </div>
                    <button
                      type="button"
                      className={styles.smallBtnGhost}
                      onClick={() => setActiveTab('overlays')}
                    >
                      Manage
                    </button>
                  </div>
                  <div className={styles.miniList}>
                    {overlays.filter((o) => o.is_visible).slice(0, 5).map((o) => (
                      <div key={o.id} className={styles.miniRow}>
                        <span className={styles.miniDot} style={{ backgroundColor: o.accent_color }} />
                        <div className={styles.miniInfo}>
                          <p className={styles.miniName}>{o.name}</p>
                          <p className={styles.miniSub}>{o.position}</p>
                        </div>
                        <span className={styles.miniLatency}>{formatRelative(o.updated_at)}</span>
                      </div>
                    ))}
                    {overlays.filter((o) => o.is_visible).length === 0 && (
                      <p className={styles.emptyText}>No overlays visible</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ─── OVERLAYS ─── */}
          {activeTab === 'overlays' && (
            <>
              <div className={styles.cardHeaderStandalone}>
                <div>
                  <h3 className={styles.cardTitle}>Overlay Configurations</h3>
                  <p className={styles.cardSubtle}>
                    Six overlay templates. Use as Browser Source in OBS, vMix or Streamlabs.
                  </p>
                </div>
                <button type="button" className={styles.smallBtnGhost} onClick={reloadAllOverlays}>
                  <BsArrowClockwise /> Reload all
                </button>
              </div>

              <div className={styles.overlayGrid}>
                {overlays.map((o) => (
                  <div key={o.id} className={styles.overlayCard}>
                    <OverlayThumbnail overlay={o} />
                    <div className={styles.overlayBody}>
                      <div className={styles.overlayHeadRow}>
                        <p className={styles.overlayName}>{o.name}</p>
                        <Toggle
                          on={o.is_visible}
                          onClick={() => toggleOverlay(o.id)}
                          ariaLabel={`Toggle ${o.name}`}
                        />
                      </div>
                      <p className={styles.overlayDesc}>
                        {o.position.replace('-', ' ')} · updated {formatRelative(o.updated_at)}
                      </p>
                      <div className={styles.overlayActions}>
                        <button
                          type="button"
                          className={styles.smallBtnGhost}
                          onClick={() => router.push(`/production/overlay-editor?id=${o.id}`)}
                        >
                          <BsPencilSquare />
                          Edit
                        </button>
                        <button
                          type="button"
                          className={`${styles.smallBtn} goldBTN`}
                          onClick={() => copyOverlayUrl(o)}
                        >
                          <BsCopy />
                          Copy URL
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ─── SCENES ─── */}
          {activeTab === 'scenes' && (
            <>
              <div className={styles.cardHeaderStandalone}>
                <div>
                  <h3 className={styles.cardTitle}>Scenes</h3>
                  <p className={styles.cardSubtle}>
                    Four production scenes. Click &quot;Set live&quot; to switch the active stream scene.
                  </p>
                </div>
              </div>

              <div className={styles.scenesGrid}>
                {scenes.map((s) => {
                  const Icon = SCENE_ICON_MAP[s.icon] || BsPlayFill;
                  return (
                    <div key={s.id} className={`${styles.sceneCard} ${s.is_active ? styles.sceneCardLive : ''}`}>
                      {s.is_active && (
                        <span className={styles.sceneLiveBadge}>
                          <span className={styles.liveDot} /> ON AIR
                        </span>
                      )}
                      <ScenePreview scene={s} />
                      <div className={styles.sceneCardBody}>
                        <div className={styles.sceneHeadRow}>
                          <div className={styles.sceneIcon}>
                            <Icon />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p className={styles.sceneName}>{s.name}</p>
                            <p className={styles.sceneSub}>
                              {s.assets?.length || 0} assets · last used {formatRelative(s.last_used)}
                            </p>
                          </div>
                        </div>
                        <div className={styles.sceneActions}>
                          <button
                            type="button"
                            className={styles.smallBtnGhost}
                            onClick={() => router.push(`/production/scene-editor?id=${s.id}`)}
                          >
                            <BsPencilSquare /> Edit
                          </button>
                          <button
                            type="button"
                            className={`${styles.smallBtn} ${s.is_active ? styles.smallBtnDisabled : 'redBTN'}`}
                            disabled={s.is_active}
                            onClick={() => setSceneLive(s.id)}
                          >
                            <BsPlayFill /> {s.is_active ? 'On Air' : 'Set Live'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ─── DATA PIPELINE ─── */}
          {activeTab === 'pipeline' && (
            <>
              <div className={styles.cardHeaderStandalone}>
                <div>
                  <h3 className={styles.cardTitle}>Data Pipeline</h3>
                  <p className={styles.cardSubtle}>
                    WebSocket and broadcast software endpoints. Test or restart to verify connectivity.
                  </p>
                </div>
                <span className={styles.healthBadge}>
                  <BsActivity /> {pipelines.filter((p) => p.status === 'connected').length} / {pipelines.length} healthy
                </span>
              </div>

              <div className={styles.pipelineList}>
                {pipelines.map((p) => {
                  const tag = p.name.includes('OBS') ? 'OBS' : p.name.includes('vMix') ? 'vMix' : p.name.includes('Streamlabs') ? 'Streamlabs' : null;
                  const tagColor = tag ? CLIENT_TYPE_COLORS[tag] : '#5a9bff';
                  return (
                    <div key={p.id} className={styles.pipelineCard}>
                      <div className={styles.pipelineLeft}>
                        <div className={styles.pipelineIconWrap}>
                          {p.type === 'websocket' ? <BsLink45Deg /> : p.type === 'api' ? <BsCpu /> : p.type === 'overlay' ? <BsLayers /> : <BsBroadcast />}
                        </div>
                        <div className={styles.pipelineInfo}>
                          <div className={styles.pipelineNameRow}>
                            <p className={styles.pipelineName}>{p.name}</p>
                            {tag && (
                              <span className={styles.targetTag} style={{ '--c': tagColor }}>
                                {tag}
                              </span>
                            )}
                          </div>
                          <code className={styles.pipelineUrl}>{p.url}</code>
                          <div className={styles.pipelineMetaRow}>
                            <span className={styles.metaItem}>
                              {p.status === 'connected' ? (
                                <BsCheckCircle style={{ color: 'var(--v-ent-gold)' }} />
                              ) : p.status === 'error' ? (
                                <BsExclamationTriangle style={{ color: '#FBC64B' }} />
                              ) : (
                                <BsXCircle style={{ color: 'rgba(255,255,255,0.45)' }} />
                              )}
                              {p.status}
                            </span>
                            <span className={styles.metaItem}>
                              {p.latency_ms != null ? `${p.latency_ms}ms` : '— ms'}
                            </span>
                            <span className={styles.metaItem}>last event {formatRelative(p.last_ping)}</span>
                          </div>
                        </div>
                      </div>

                      <div className={styles.pipelineActions}>
                        <button
                          type="button"
                          className={styles.smallBtnGhost}
                          disabled={pipelineLoadingId === p.id}
                          onClick={() => testPipeline(p.id)}
                        >
                          {pipelineLoadingId === p.id ? (
                            <>
                              <BsArrowClockwise className={styles.spinning} /> Testing
                            </>
                          ) : (
                            <>
                              <BsActivity /> Test
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          className={styles.smallBtnGhost}
                          onClick={() => restartPipeline(p.id)}
                        >
                          <BsArrowRepeat /> Restart
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ─── SCAN ─── */}
          {activeTab === 'scan' && (
            <>
              <div className={styles.scanHero}>
                <div className={styles.scanHeroIconWrap}>
                  <BsSearch size={28} />
                </div>
                <h3 className={styles.scanHeroTitle}>Network Scan</h3>
                <p className={styles.scanHeroSub}>
                  Discover OBS Studio, vMix and Streamlabs Desktop running on your network. Browser-source clients are auto-detected.
                </p>
                <button
                  type="button"
                  className={`${styles.scanBtn} ${scanning ? '' : 'redBTN'}`}
                  onClick={startScan}
                  disabled={scanning}
                >
                  {scanning ? (
                    <>
                      <BsArrowClockwise className={styles.spinning} /> Scanning your network…
                    </>
                  ) : (
                    <>
                      <BsCameraVideo /> Scan for OBS clients
                    </>
                  )}
                </button>
                {scanScannedAt && !scanning && (
                  <p className={styles.scanFootnote}>
                    Last scanned {formatRelative(scanScannedAt.toISOString())}
                  </p>
                )}
              </div>

              {discovered.length > 0 && (
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div>
                      <h3 className={styles.cardTitle}>Discovered Clients</h3>
                      <p className={styles.cardSubtle}>{discovered.length} clients found on your network</p>
                    </div>
                  </div>

                  <div className={styles.discoveredList}>
                    {discovered.map((c) => (
                      <div key={c.id} className={styles.discoveredRow}>
                        <div
                          className={styles.discoveredIcon}
                          style={{ backgroundColor: `${CLIENT_TYPE_COLORS[c.type]}22`, color: CLIENT_TYPE_COLORS[c.type] }}
                        >
                          <BsHddNetwork />
                        </div>
                        <div className={styles.discoveredInfo}>
                          <p className={styles.discoveredName}>{c.name}</p>
                          <p className={styles.discoveredMeta}>
                            {c.host} · {c.ip} · v{c.version} · {c.os}
                          </p>
                        </div>
                        <span
                          className={styles.targetTag}
                          style={{ '--c': CLIENT_TYPE_COLORS[c.type] }}
                        >
                          {c.type}
                        </span>
                        <button
                          type="button"
                          className={`${styles.smallBtn} goldBTN`}
                          onClick={() => connectDiscovered(c.id)}
                        >
                          <BsLink45Deg /> Connect
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ─── CLIENTS ─── */}
          {activeTab === 'clients' && (
            <>
              <div className={styles.cardHeaderStandalone}>
                <div>
                  <h3 className={styles.cardTitle}>Connected Production Clients</h3>
                  <p className={styles.cardSubtle}>
                    All broadcast software currently bound to this account.
                  </p>
                </div>
                <button type="button" className={styles.smallBtnGhost} onClick={() => setActiveTab('scan')}>
                  <BsSearch /> Scan for new
                </button>
              </div>

              <div className={styles.clientsTableWrap}>
                <table className={styles.clientsTable}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Version</th>
                      <th>OS</th>
                      <th>Status</th>
                      <th>Last seen</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {FULL_CLIENT_LIST.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <div className={styles.clientCellLeft}>
                            <div
                              className={styles.clientCellIcon}
                              style={{ backgroundColor: `${CLIENT_TYPE_COLORS[c.type]}22`, color: CLIENT_TYPE_COLORS[c.type] }}
                            >
                              <BsWindow />
                            </div>
                            <div>
                              <p className={styles.clientCellName}>{c.name}</p>
                              <p className={styles.clientCellSub}>{c.host} · {c.ip}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={styles.targetTag} style={{ '--c': CLIENT_TYPE_COLORS[c.type] }}>
                            {c.type}
                          </span>
                        </td>
                        <td className={styles.tdMuted}>v{c.version}</td>
                        <td className={styles.tdMuted}>{c.os}</td>
                        <td>
                          <span
                            className={`${styles.statusPill} ${
                              c.status === 'connected' ? styles.statusPillConnected : styles.statusPillDisconnected
                            }`}
                          >
                            <span className={styles.statusPillDot} />
                            {c.status}
                          </span>
                        </td>
                        <td className={styles.tdMuted}>{c.last_seen}</td>
                        <td>
                          <button
                            type="button"
                            className={styles.iconDangerBtn}
                            onClick={() => disconnectClient(c.id)}
                            aria-label="Disconnect"
                            disabled={c.status !== 'connected'}
                          >
                            <BsTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile card view */}
                <div className={styles.clientsMobileList}>
                  {FULL_CLIENT_LIST.map((c) => (
                    <div key={c.id} className={styles.clientMobileCard}>
                      <div className={styles.clientCellLeft}>
                        <div
                          className={styles.clientCellIcon}
                          style={{ backgroundColor: `${CLIENT_TYPE_COLORS[c.type]}22`, color: CLIENT_TYPE_COLORS[c.type] }}
                        >
                          <BsWindow />
                        </div>
                        <div>
                          <p className={styles.clientCellName}>{c.name}</p>
                          <p className={styles.clientCellSub}>{c.host} · v{c.version} · {c.os}</p>
                        </div>
                      </div>
                      <div className={styles.clientMobileMeta}>
                        <span className={styles.targetTag} style={{ '--c': CLIENT_TYPE_COLORS[c.type] }}>
                          {c.type}
                        </span>
                        <span
                          className={`${styles.statusPill} ${
                            c.status === 'connected' ? styles.statusPillConnected : styles.statusPillDisconnected
                          }`}
                        >
                          <span className={styles.statusPillDot} />
                          {c.status}
                        </span>
                        <span className={styles.miniLatency}>{c.last_seen}</span>
                      </div>
                      <button
                        type="button"
                        className={styles.smallBtnGhost}
                        onClick={() => disconnectClient(c.id)}
                        disabled={c.status !== 'connected'}
                      >
                        <BsTrash /> Disconnect
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <BottomMenu />

      {/* Going-live overlay */}
      {goingLiveScene && (
        <div className={styles.goingLiveOverlay} role="alert" aria-live="assertive">
          <div className={styles.goingLiveCard}>
            <p className={styles.goingLiveLabel}>Going live in</p>
            <p className={styles.goingLiveCount}>{goingLiveTick}</p>
            <p className={styles.goingLiveScene}>
              {scenes.find((s) => s.id === goingLiveScene)?.name}
            </p>
          </div>
        </div>
      )}

      {toast && (
        <div className={styles.toast} role="status" aria-live="polite">
          <span className={styles.toastDot} />
          {toast}
        </div>
      )}
    </div>
  );
};

export default ProductionPage;
