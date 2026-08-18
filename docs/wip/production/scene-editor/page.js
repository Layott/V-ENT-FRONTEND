'use client';

import { useState, useMemo, useCallback, useRef, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  BsArrowLeft,
  BsCheckCircle,
  BsTrash,
  BsArrowClockwise,
  BsLayers,
  BsPlay,
  BsType,
  BsImage,
  BsClock,
  BsAward,
  BsUiRadiosGrid,
  BsCollectionPlay,
} from 'react-icons/bs';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import Sidebar from '@/components/sidebar/Sidebar';
import { mockScenesV2, mockOverlayConfigs } from '@/lib/mockData';
import styles from './scene-editor.module.css';

const CANVAS_W = 1280;
const CANVAS_H = 720;
const GRID_SIZE = 40;

const TOOLBOX_ITEMS = [
  { id: 'scoreboard', label: 'Scoreboard', icon: BsLayers, w: 540, h: 90, defaultText: 'CRW 3 — 2 AR' },
  { id: 'lower_third', label: 'Lower Third', icon: BsType, w: 380, h: 80, defaultText: 'JAY_O · Caster' },
  { id: 'sponsor_bar', label: 'Sponsor Bar', icon: BsUiRadiosGrid, w: CANVAS_W, h: 60, defaultText: 'POWERED BY' },
  { id: 'team_names', label: 'Team Tag', icon: BsAward, w: 160, h: 64, defaultText: 'CRW' },
  { id: 'timer', label: 'Match Timer', icon: BsClock, w: 180, h: 70, defaultText: '14:22' },
  { id: 'image', label: 'Image / Logo', icon: BsImage, w: 180, h: 180, defaultText: 'IMG' },
  { id: 'text', label: 'Text', icon: BsType, w: 280, h: 60, defaultText: 'Custom Text' },
];

const snapToGrid = (val) => Math.round(val / GRID_SIZE) * GRID_SIZE;

const SceneEditorContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams?.get('id') || 'sc_match';

  const scene = useMemo(() => mockScenesV2.find((s) => s.id === id) || mockScenesV2[0], [id]);

  // Build initial elements based on scene type
  const initialElements = useMemo(() => {
    const t = scene.type;
    if (t === 'lobby') {
      return [
        { id: 'el1', type: 'timer', x: 540, y: 320, w: 200, h: 80, text: '03:21', color: '#5a9bff' },
        { id: 'el2', type: 'text', x: 480, y: 220, w: 320, h: 60, text: 'STARTING SOON', color: '#5a9bff' },
        { id: 'el3', type: 'sponsor_bar', x: 0, y: 660, w: CANVAS_W, h: 60, text: 'POWERED BY', color: '#FBC64B' },
      ];
    }
    if (t === 'replay') {
      return [
        { id: 'el1', type: 'text', x: 540, y: 280, w: 200, h: 80, text: 'REPLAY', color: '#FBC64B' },
        { id: 'el2', type: 'lower_third', x: 60, y: 540, w: 380, h: 80, text: 'Goal · 67th min', color: '#FBC64B' },
      ];
    }
    if (t === 'winner') {
      return [
        { id: 'el1', type: 'text', x: 460, y: 200, w: 360, h: 80, text: 'WINNER', color: '#D4AF37' },
        { id: 'el2', type: 'team_names', x: 540, y: 320, w: 200, h: 90, text: 'CRW', color: '#D4AF37' },
        { id: 'el3', type: 'sponsor_bar', x: 0, y: 660, w: CANVAS_W, h: 60, text: 'POWERED BY', color: '#FBC64B' },
      ];
    }
    // Default match scene
    return [
      { id: 'el1', type: 'scoreboard', x: 360, y: 40, w: 540, h: 90, text: 'CRW 3 — 2 AR', color: '#ED1C24' },
      { id: 'el2', type: 'lower_third', x: 60, y: 540, w: 380, h: 80, text: 'JAY_O · Caster', color: '#D4AF37' },
      { id: 'el3', type: 'sponsor_bar', x: 0, y: 660, w: CANVAS_W, h: 60, text: 'POWERED BY', color: '#FBC64B' },
      { id: 'el4', type: 'timer', x: 560, y: 160, w: 180, h: 70, text: '14:22', color: '#ED1C24' },
    ];
  }, [scene.type]);

  const [elements, setElements] = useState(initialElements);
  const [selectedId, setSelectedId] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [toast, setToast] = useState('');
  const [showGrid, setShowGrid] = useState(true);
  const [snap, setSnap] = useState(true);
  const [bgType, setBgType] = useState(scene.type === 'match' ? 'match' : scene.type);

  const canvasRef = useRef(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 1800);
  }, []);

  const selected = elements.find((e) => e.id === selectedId);

  // ── Drag handling ──
  const onElementMouseDown = (e, id) => {
    e.stopPropagation();
    const el = elements.find((x) => x.id === id);
    if (!el) return;
    setSelectedId(id);
    setDraggingId(id);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    setDragOffset({
      x: (e.clientX - rect.left) * scaleX - el.x,
      y: (e.clientY - rect.top) * scaleY - el.y,
    });
  };

  useEffect(() => {
    if (!draggingId) return;
    const onMove = (e) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const scaleX = CANVAS_W / rect.width;
      const scaleY = CANVAS_H / rect.height;
      let nx = (e.clientX - rect.left) * scaleX - dragOffset.x;
      let ny = (e.clientY - rect.top) * scaleY - dragOffset.y;
      const el = elements.find((x) => x.id === draggingId);
      if (!el) return;
      nx = Math.max(0, Math.min(CANVAS_W - el.w, nx));
      ny = Math.max(0, Math.min(CANVAS_H - el.h, ny));
      if (snap) {
        nx = snapToGrid(nx);
        ny = snapToGrid(ny);
      }
      setElements((curr) => curr.map((x) => (x.id === draggingId ? { ...x, x: nx, y: ny } : x)));
    };
    const onUp = () => setDraggingId(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [draggingId, dragOffset, snap, elements]);

  // ── Add element from toolbox ──
  const addElement = (toolboxItem) => {
    const newEl = {
      id: `el_${Date.now()}`,
      type: toolboxItem.id,
      x: snap ? snapToGrid((CANVAS_W - toolboxItem.w) / 2) : (CANVAS_W - toolboxItem.w) / 2,
      y: snap ? snapToGrid((CANVAS_H - toolboxItem.h) / 2) : (CANVAS_H - toolboxItem.h) / 2,
      w: toolboxItem.w,
      h: toolboxItem.h,
      text: toolboxItem.defaultText,
      color: '#ED1C24',
    };
    setElements([...elements, newEl]);
    setSelectedId(newEl.id);
    showToast(`Added ${toolboxItem.label}`);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setElements(elements.filter((e) => e.id !== selectedId));
    setSelectedId(null);
    showToast('Element deleted');
  };

  const updateProp = (key, value) => {
    if (!selectedId) return;
    setElements((curr) => curr.map((e) => (e.id === selectedId ? { ...e, [key]: value } : e)));
  };

  const saveScene = () => {
    showToast('Scene saved');
  };

  const setLive = () => {
    showToast(`${scene.name} set live`);
  };

  // Background style for scene preview
  const bgStyle = useMemo(() => {
    const map = {
      lobby: 'linear-gradient(135deg, rgba(90,155,255,0.18) 0%, #0a0a0d 100%)',
      match: 'linear-gradient(135deg, rgba(237,28,36,0.12) 0%, #0a0a0d 100%)',
      replay: 'linear-gradient(135deg, rgba(251,198,75,0.16) 0%, #0a0a0d 100%)',
      winner: 'linear-gradient(135deg, rgba(212, 175, 55,0.18) 0%, #0a0a0d 100%)',
    };
    return map[bgType] || map.match;
  }, [bgType]);

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
                  <BsCollectionPlay style={{ marginRight: '0.55rem', verticalAlign: '-3px' }} />
                  {scene.name} Scene
                </h1>
                <p className={styles.pageSubtitle}>
                  Drag overlays onto the 1280×720 canvas. Snap-to-grid keeps things aligned.
                </p>
              </div>
              <div className={styles.headerActions}>
                <button type="button" className={styles.smallBtnGhost} onClick={() => setShowGrid(!showGrid)}>
                  <BsUiRadiosGrid /> {showGrid ? 'Hide grid' : 'Show grid'}
                </button>
                <button
                  type="button"
                  className={`${styles.smallBtnGhost} ${snap ? styles.btnActive : ''}`}
                  onClick={() => setSnap(!snap)}
                >
                  Snap {snap ? 'on' : 'off'}
                </button>
                <button type="button" className={styles.smallBtnGhost} onClick={setLive}>
                  <BsPlay /> Set live
                </button>
                <button type="button" className={`${styles.saveBtn} goldBTN`} onClick={saveScene}>
                  <BsCheckCircle /> Save
                </button>
              </div>
            </div>
          </div>

          {/* Editor layout */}
          <div className={styles.editorLayout}>
            {/* Toolbox (left) */}
            <aside className={styles.toolbox}>
              <h4 className={styles.panelTitle}>Toolbox</h4>
              <p className={styles.panelSub}>Click to add to canvas</p>
              <div className={styles.toolboxList}>
                {TOOLBOX_ITEMS.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={styles.toolboxItem}
                      onClick={() => addElement(t)}
                    >
                      <span className={styles.toolboxIcon}>
                        <Icon />
                      </span>
                      <span className={styles.toolboxLabel}>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className={styles.layersSection}>
                <h4 className={styles.panelTitle}>Layers</h4>
                <p className={styles.panelSub}>{elements.length} elements</p>
                <div className={styles.layerList}>
                  {elements.map((el) => (
                    <button
                      key={el.id}
                      type="button"
                      className={`${styles.layerRow} ${selectedId === el.id ? styles.layerRowActive : ''}`}
                      onClick={() => setSelectedId(el.id)}
                    >
                      <span className={styles.layerDot} style={{ backgroundColor: el.color }} />
                      <span className={styles.layerName}>{el.type.replace('_', ' ')}</span>
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            {/* Canvas (center) */}
            <section className={styles.canvasArea}>
              <div className={styles.canvasMeta}>
                <span>{CANVAS_W} × {CANVAS_H}</span>
                <span className={styles.metaDot}>·</span>
                <span>{elements.length} elements</span>
                {selected && (
                  <>
                    <span className={styles.metaDot}>·</span>
                    <span>x: {Math.round(selected.x)}, y: {Math.round(selected.y)}</span>
                  </>
                )}
              </div>
              <div
                ref={canvasRef}
                className={styles.canvas}
                style={{ background: bgStyle }}
                onClick={() => setSelectedId(null)}
              >
                {showGrid && (
                  <div
                    className={styles.canvasGrid}
                    style={{
                      backgroundSize: `${(GRID_SIZE / CANVAS_W) * 100}% ${(GRID_SIZE / CANVAS_H) * 100}%`,
                    }}
                  />
                )}
                {elements.map((el) => {
                  const isSelected = selectedId === el.id;
                  return (
                    <div
                      key={el.id}
                      className={`${styles.canvasEl} ${isSelected ? styles.canvasElSelected : ''}`}
                      style={{
                        left: `${(el.x / CANVAS_W) * 100}%`,
                        top: `${(el.y / CANVAS_H) * 100}%`,
                        width: `${(el.w / CANVAS_W) * 100}%`,
                        height: `${(el.h / CANVAS_H) * 100}%`,
                        borderColor: isSelected ? el.color : 'rgba(255,255,255,0.18)',
                        backgroundColor: `${el.color}14`,
                      }}
                      onMouseDown={(e) => onElementMouseDown(e, el.id)}
                    >
                      <div className={styles.canvasElInner} style={{ borderLeftColor: el.color }}>
                        <span className={styles.canvasElType}>{el.type.replace('_', ' ')}</span>
                        <span className={styles.canvasElText} style={{ color: el.color }}>{el.text}</span>
                      </div>
                    </div>
                  );
                })}
                {elements.length === 0 && (
                  <div className={styles.emptyCanvas}>
                    <p>Empty scene · click a tool to add an overlay</p>
                  </div>
                )}
              </div>
            </section>

            {/* Properties (right) */}
            <aside className={styles.properties}>
              <h4 className={styles.panelTitle}>Properties</h4>
              {selected ? (
                <>
                  <p className={styles.panelSub}>{selected.type.replace('_', ' ')}</p>

                  <div className={styles.propSection}>
                    <label className={styles.propLabel}>Text</label>
                    <input
                      type="text"
                      className={styles.propInput}
                      value={selected.text}
                      onChange={(e) => updateProp('text', e.target.value)}
                    />
                  </div>

                  <div className={styles.propSection}>
                    <label className={styles.propLabel}>Color</label>
                    <div className={styles.colorRow}>
                      {['#ED1C24', '#D4AF37', '#FBC64B', '#5a9bff', '#C084FC'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={`${styles.colorSwatch} ${selected.color === c ? styles.colorSwatchActive : ''}`}
                          style={{ backgroundColor: c }}
                          onClick={() => updateProp('color', c)}
                        />
                      ))}
                      <input
                        type="color"
                        value={selected.color}
                        onChange={(e) => updateProp('color', e.target.value)}
                        className={styles.colorPicker}
                      />
                    </div>
                  </div>

                  <div className={styles.propSection}>
                    <label className={styles.propLabel}>Position</label>
                    <div className={styles.propRow}>
                      <div className={styles.propField}>
                        <span className={styles.propFieldLabel}>X</span>
                        <input
                          type="number"
                          className={styles.propInput}
                          value={Math.round(selected.x)}
                          onChange={(e) => updateProp('x', Number(e.target.value))}
                        />
                      </div>
                      <div className={styles.propField}>
                        <span className={styles.propFieldLabel}>Y</span>
                        <input
                          type="number"
                          className={styles.propInput}
                          value={Math.round(selected.y)}
                          onChange={(e) => updateProp('y', Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className={styles.propSection}>
                    <label className={styles.propLabel}>Size</label>
                    <div className={styles.propRow}>
                      <div className={styles.propField}>
                        <span className={styles.propFieldLabel}>W</span>
                        <input
                          type="number"
                          className={styles.propInput}
                          value={Math.round(selected.w)}
                          onChange={(e) => updateProp('w', Number(e.target.value))}
                        />
                      </div>
                      <div className={styles.propField}>
                        <span className={styles.propFieldLabel}>H</span>
                        <input
                          type="number"
                          className={styles.propInput}
                          value={Math.round(selected.h)}
                          onChange={(e) => updateProp('h', Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>

                  <button type="button" className={styles.deleteBtn} onClick={deleteSelected}>
                    <BsTrash /> Delete element
                  </button>
                </>
              ) : (
                <>
                  <p className={styles.panelSub}>Scene background</p>
                  <div className={styles.bgGrid}>
                    {['lobby', 'match', 'replay', 'winner'].map((b) => (
                      <button
                        key={b}
                        type="button"
                        className={`${styles.bgChip} ${bgType === b ? styles.bgChipActive : ''}`}
                        onClick={() => setBgType(b)}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                  <p className={styles.emptyHint}>Select an element on the canvas to edit it</p>
                </>
              )}
            </aside>
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

const SceneEditorPage = () => (
  <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
    <SceneEditorContent />
  </Suspense>
);

export default SceneEditorPage;
