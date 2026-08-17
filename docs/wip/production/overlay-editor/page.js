'use client';

import { useState, useMemo, useCallback, useRef, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  BsArrowLeft,
  BsCheckCircle,
  BsTrash,
  BsCloudUpload,
  BsArrowClockwise,
  BsCopy,
  BsLayers,
} from 'react-icons/bs';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import Sidebar from '@/components/sidebar/Sidebar';
import { mockOverlayConfigs, mockTournaments } from '@/lib/mockData';
import styles from './overlay-editor.module.css';

const THEMES = [
  { id: 'dark', label: 'Dark', bg: '#0f0f12' },
  { id: 'glass', label: 'Glass', bg: 'rgba(20,20,24,0.55)' },
  { id: 'broadcast', label: 'Broadcast', bg: '#1a1a1e' },
  { id: 'minimal', label: 'Minimal', bg: 'transparent' },
];

const ACCENTS = [
  { id: '#ED1C24', label: 'V-ENT Red' },
  { id: '#D4AF37', label: 'V-ENT Grn' },
  { id: '#FBC64B', label: 'Sponsor Amber' },
  { id: '#5a9bff', label: 'Cool Blue' },
  { id: '#C084FC', label: 'Purple' },
  { id: '#FF6B6B', label: 'Coral' },
];

const FONTS = [
  { id: 'clash', label: 'Clash Grotesk', stack: '"Inter", sans-serif' },
  { id: 'inter', label: 'Inter', stack: 'Inter, sans-serif' },
  { id: 'mono', label: 'Mono', stack: '"Consolas", monospace' },
];

const OverlayEditorContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams?.get('id') || 'ov_sb';

  const overlay = useMemo(() => mockOverlayConfigs.find((o) => o.id === id) || mockOverlayConfigs[0], [id]);
  const tournament = mockTournaments[0];

  // ── Settings state ──
  const [theme, setTheme] = useState('dark');
  const [primaryColor, setPrimaryColor] = useState(overlay.accent_color);
  const [showSponsors, setShowSponsors] = useState(true);
  const [sponsors, setSponsors] = useState(['VERMILLION', 'GAMERFUEL', 'PIXELFORGE']);
  const [font, setFont] = useState('clash');
  const [scale, setScale] = useState(100);
  const [showTeamLogos, setShowTeamLogos] = useState(true);
  const [showLowerThird, setShowLowerThird] = useState(overlay.type === 'lower_third');
  const [showTimer, setShowTimer] = useState(overlay.type === 'timer');
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);

  const showToast = useCallback((m) => {
    setToast(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2000);
  }, []);

  const onAddSponsor = (e) => {
    e.preventDefault();
    const inp = e.target.elements.s;
    if (inp.value.trim()) {
      setSponsors([...sponsors, inp.value.trim().toUpperCase()]);
      inp.value = '';
    }
  };

  const removeSponsor = (i) => {
    setSponsors(sponsors.filter((_, idx) => idx !== i));
  };

  const fakeUploadLogo = () => {
    const fake = `LOGO-${Math.floor(Math.random() * 999)}`;
    setSponsors([...sponsors, fake]);
    showToast('Logo uploaded');
  };

  const themeBg = THEMES.find((t) => t.id === theme)?.bg || '#0f0f12';
  const fontStack = FONTS.find((f) => f.id === font)?.stack;

  // Avoid hydration mismatch: render the path on the server, upgrade to the
  // full URL on the client after mount.
  const [overlayUrl, setOverlayUrl] = useState(`/tournaments/overlay?id=${tournament.id}&config=${overlay.id}`);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOverlayUrl(`${window.location.origin}/tournaments/overlay?id=${tournament.id}&config=${overlay.id}`);
    }
  }, [overlay.id, tournament.id]);

  const copyUrl = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(overlayUrl);
      }
    } catch {
      // non-fatal
    }
    showToast('URL copied');
  };

  const saveConfig = () => {
    showToast('Saved · pushed to all clients');
  };

  const resetDefaults = () => {
    setTheme('dark');
    setPrimaryColor(overlay.accent_color);
    setShowSponsors(true);
    setSponsors(['VERMILLION', 'GAMERFUEL', 'PIXELFORGE']);
    setFont('clash');
    setScale(100);
    setShowTeamLogos(true);
    showToast('Reset to defaults');
  };

  // ── Render preview content based on overlay type ──
  const renderPreview = () => {
    const t = overlay.type;
    return (
      <div className={styles.canvasInner} style={{ background: themeBg, fontFamily: fontStack, transform: `scale(${scale / 100})` }}>
        {t === 'scoreboard' && (
          <div className={styles.pvScoreboard} style={{ borderColor: primaryColor }}>
            <div className={styles.pvSbBlock}>
              {showTeamLogos && (
                <div className={styles.pvSbLogo} style={{ backgroundColor: primaryColor }}>C</div>
              )}
              <div className={styles.pvSbInfo}>
                <span className={styles.pvSbTag}>CRW</span>
                <span className={styles.pvSbName}>Crimson Wolves</span>
              </div>
              <div className={styles.pvSbScore} style={{ color: primaryColor }}>3</div>
            </div>
            <div className={styles.pvSbCenter}>
              {showTimer && (
                <div className={styles.pvTimerCard} style={{ borderColor: primaryColor, color: primaryColor }}>
                  <span className={styles.pvTimerLabel}>LIVE</span>
                  <span className={styles.pvTimerValue}>14:22</span>
                </div>
              )}
              <div className={styles.pvMatchLabel}>R1 · {tournament.name}</div>
            </div>
            <div className={styles.pvSbBlock}>
              <div className={styles.pvSbScore} style={{ color: primaryColor }}>2</div>
              <div className={styles.pvSbInfo} style={{ alignItems: 'flex-end', textAlign: 'right' }}>
                <span className={styles.pvSbTag}>AR</span>
                <span className={styles.pvSbName}>Alpha Reapers</span>
              </div>
              {showTeamLogos && (
                <div className={styles.pvSbLogo} style={{ backgroundColor: primaryColor }}>A</div>
              )}
            </div>
          </div>
        )}

        {t === 'lower_third' && showLowerThird && (
          <div className={styles.pvLowerThird} style={{ borderLeftColor: primaryColor }}>
            <div className={styles.pvLowerLogo} style={{ backgroundColor: primaryColor }}>VC</div>
            <div className={styles.pvLowerInfo}>
              <span className={styles.pvLowerName}>JAY_O & ADA_A</span>
              <span className={styles.pvLowerSub}>Casters · {tournament.name}</span>
            </div>
            <span className={styles.pvLiveDot} style={{ backgroundColor: primaryColor }} />
          </div>
        )}

        {t === 'sponsor_bar' && showSponsors && (
          <div className={styles.pvSponsorBar} style={{ borderTopColor: primaryColor }}>
            <span className={styles.pvSponsorLabel} style={{ color: primaryColor }}>POWERED BY</span>
            <div className={styles.pvSponsorTrack}>
              {sponsors.concat(sponsors).map((s, i) => (
                <span key={i} className={styles.pvSponsorItem}>{s}</span>
              ))}
            </div>
          </div>
        )}

        {t === 'bracket_overview' && (
          <div className={styles.pvBracket}>
            {[4, 2, 1].map((count, col) => (
              <div key={col} className={styles.pvBracketCol}>
                {Array.from({ length: count }).map((_, i) => (
                  <div
                    key={i}
                    className={styles.pvBracketSlot}
                    style={{ borderColor: i === 0 && col < 2 ? primaryColor : 'rgba(255,255,255,0.18)' }}
                  >
                    <span>Team {col}-{i + 1}</span>
                    <span style={{ color: primaryColor }}>3</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {t === 'team_names' && (
          <div className={styles.pvTeamNames}>
            <div className={styles.pvTNCorner} style={{ borderColor: primaryColor }}>
              <span style={{ color: primaryColor }}>CRW</span>
              <span>Crimson Wolves</span>
            </div>
            <div className={styles.pvTNCorner} style={{ borderColor: primaryColor, alignSelf: 'flex-end' }}>
              <span style={{ color: primaryColor }}>AR</span>
              <span>Alpha Reapers</span>
            </div>
          </div>
        )}

        {t === 'timer' && showTimer && (
          <div className={styles.pvTimerLarge} style={{ borderColor: primaryColor, color: primaryColor }}>
            <span className={styles.pvTimerLabel}>LIVE</span>
            <span className={styles.pvTimerValueLarge}>14:22</span>
          </div>
        )}
      </div>
    );
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
            <button type="button" className={styles.backBtn} onClick={() => router.push('/production')}>
              <BsArrowLeft /> Back to Production
            </button>
            <div className={styles.titleRow}>
              <div>
                <h1 className={styles.pageTitle}>
                  <BsLayers style={{ marginRight: '0.55rem', verticalAlign: '-3px' }} />
                  {overlay.name}
                </h1>
                <p className={styles.pageSubtitle}>
                  Overlay configuration · {overlay.type.replace('_', ' ')} · {overlay.position}
                </p>
              </div>
              <div className={styles.headerActions}>
                <button type="button" className={styles.smallBtnGhost} onClick={resetDefaults}>
                  <BsArrowClockwise /> Reset
                </button>
                <button type="button" className={styles.smallBtnGhost} onClick={copyUrl}>
                  <BsCopy /> Copy URL
                </button>
                <button type="button" className={`${styles.saveBtn} goldBTN`} onClick={saveConfig}>
                  <BsCheckCircle /> Save & Push
                </button>
              </div>
            </div>
          </div>

          {/* Editor layout */}
          <div className={styles.editorLayout}>
            {/* Left — settings panel */}
            <aside className={styles.settingsPanel}>
              <div className={styles.section}>
                <h4 className={styles.sectionTitle}>Theme</h4>
                <div className={styles.themeGrid}>
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`${styles.themeChip} ${theme === t.id ? styles.themeChipActive : ''}`}
                      onClick={() => setTheme(t.id)}
                    >
                      <span className={styles.themeSwatch} style={{ background: t.bg }} />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.section}>
                <h4 className={styles.sectionTitle}>Primary Color</h4>
                <div className={styles.colorRow}>
                  {ACCENTS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`${styles.colorSwatch} ${primaryColor === c.id ? styles.colorSwatchActive : ''}`}
                      style={{ backgroundColor: c.id }}
                      onClick={() => setPrimaryColor(c.id)}
                      aria-label={c.label}
                      title={c.label}
                    />
                  ))}
                  <label className={styles.customColorWrap} title="Custom">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className={styles.customColor}
                    />
                  </label>
                </div>
              </div>

              <div className={styles.section}>
                <h4 className={styles.sectionTitle}>Font</h4>
                <select
                  className={styles.select}
                  value={font}
                  onChange={(e) => setFont(e.target.value)}
                >
                  {FONTS.map((f) => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
              </div>

              <div className={styles.section}>
                <h4 className={styles.sectionTitle}>Scale</h4>
                <div className={styles.sliderRow}>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    step="5"
                    value={scale}
                    onChange={(e) => setScale(Number(e.target.value))}
                    className={styles.slider}
                    style={{ '--accent': primaryColor }}
                  />
                  <span className={styles.sliderValue}>{scale}%</span>
                </div>
              </div>

              <div className={styles.section}>
                <h4 className={styles.sectionTitle}>Visibility</h4>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>Show team logos</span>
                  <button
                    type="button"
                    className={`${styles.toggle} ${showTeamLogos ? styles.toggleOn : ''}`}
                    onClick={() => setShowTeamLogos(!showTeamLogos)}
                  >
                    <span className={styles.toggleKnob} />
                  </button>
                </div>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>Show timer</span>
                  <button
                    type="button"
                    className={`${styles.toggle} ${showTimer ? styles.toggleOn : ''}`}
                    onClick={() => setShowTimer(!showTimer)}
                  >
                    <span className={styles.toggleKnob} />
                  </button>
                </div>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>Show lower third</span>
                  <button
                    type="button"
                    className={`${styles.toggle} ${showLowerThird ? styles.toggleOn : ''}`}
                    onClick={() => setShowLowerThird(!showLowerThird)}
                  >
                    <span className={styles.toggleKnob} />
                  </button>
                </div>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>Show sponsor bar</span>
                  <button
                    type="button"
                    className={`${styles.toggle} ${showSponsors ? styles.toggleOn : ''}`}
                    onClick={() => setShowSponsors(!showSponsors)}
                  >
                    <span className={styles.toggleKnob} />
                  </button>
                </div>
              </div>

              <div className={styles.section}>
                <h4 className={styles.sectionTitle}>Sponsor Logos</h4>
                <div className={styles.sponsorList}>
                  {sponsors.map((s, i) => (
                    <div key={`${s}-${i}`} className={styles.sponsorChip}>
                      <span>{s}</span>
                      <button
                        type="button"
                        className={styles.sponsorRemove}
                        onClick={() => removeSponsor(i)}
                        aria-label={`Remove ${s}`}
                      >
                        <BsTrash />
                      </button>
                    </div>
                  ))}
                </div>
                <form className={styles.addSponsorForm} onSubmit={onAddSponsor}>
                  <input
                    name="s"
                    type="text"
                    placeholder="Add sponsor name"
                    className={styles.textInput}
                  />
                  <button type="submit" className={styles.smallBtnGhost}>Add</button>
                </form>
                <button type="button" className={styles.uploadBtn} onClick={fakeUploadLogo}>
                  <BsCloudUpload /> Upload logo
                </button>
              </div>
            </aside>

            {/* Right — live preview */}
            <section className={styles.previewPanel}>
              <div className={styles.previewHeader}>
                <span className={styles.previewLabel}>LIVE PREVIEW · 1280×720</span>
                <span className={styles.previewMeta}>
                  Updates as you edit
                </span>
              </div>
              <div className={styles.canvasWrap}>
                <div className={styles.canvas}>{renderPreview()}</div>
              </div>
              <div className={styles.urlCard}>
                <code className={styles.urlText}>{overlayUrl}</code>
                <button type="button" className={styles.smallBtnGhost} onClick={copyUrl}>
                  <BsCopy /> Copy
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>

      <BottomMenu />

      {toast && (
        <div className={styles.toast} role="status" aria-live="polite">
          <span className={styles.toastDot} />
          {toast}
        </div>
      )}
    </div>
  );
};

const OverlayEditorPage = () => (
  <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
    <OverlayEditorContent />
  </Suspense>
);

export default OverlayEditorPage;
