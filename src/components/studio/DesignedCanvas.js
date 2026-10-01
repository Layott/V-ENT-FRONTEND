'use client';

// A designed overlay played on a canvas (inbox 390).
//
// The same component draws the browser source OBS shows and the editor
// preview, from the same template in src/lib/overlays, so what the organiser
// edits is what goes on air.
//
// One clock, restarted only when `playKey` or the graphic changes. An edit
// redraws from wherever the clock is, so the preview changes live under the
// organiser's hands without replaying the entrance on every keystroke (CEO,
// 30 September 2026, inbox 392: "previews of all these overlays should be
// changing live during edits"), and a saved change on air updates the graphic
// in place rather than making it arrive again. After the entrance only a
// countdown keeps drawing, because it is information.

import { useEffect, useRef } from 'react';
import { DESIGNS } from '@/lib/overlays';
import { drawFrame, paramsFor, prepare, sizeOf, timing } from '@/lib/overlays/engine';

// `style` is the broadcast's overlay style (inbox 393): every field that
// follows a role reads it unless this overlay changed that field itself.
// `still` draws the resting frame and nothing else: for a small preview of a
// style, where a transition that ends see-through would show nothing.
export default function DesignedCanvas({ kind, design, style, assets, playKey = 0, className, title, still = false }) {
  const ref = useRef(null);
  const began = useRef(0);
  const template = DESIGNS[kind];
  // Compared by value: a feed poll hands over a new object with the same
  // contents every few seconds, and that must not count as an edit.
  const designKey = JSON.stringify(design || {});
  const styleKey = JSON.stringify(style || {});
  const assetKey = JSON.stringify((assets || []).map((a) => [a.id, a.url, a.kind]));
  // The list itself, read through a ref: the key above is only for deciding
  // WHEN to redraw, and handing the key to prepare() instead of the list meant
  // no picture was ever found (30 September 2026, caught on the OBS page).
  const assetsRef = useRef(assets || []);

  // Both declared before the drawing effect, so they have run when it does:
  // the list is current, and a replay has reset the clock.
  useEffect(() => { assetsRef.current = assets || []; });
  useEffect(() => { began.current = performance.now(); }, [kind, playKey]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !template) return undefined;
    const ctx = canvas.getContext('2d');
    const params = paramsFor(template, JSON.parse(designKey), JSON.parse(styleKey));
    const { total, rest } = timing(template, params);
    const end = total + (template.tailMs || 0);
    let stopped = false;
    let frame = 0;
    let timer = 0;

    // Fonts and pictures are cached, so after the first load this resolves at
    // once and an edit costs one frame. Until it does, the last frame stays up.
    prepare(template, params, assetsRef.current).then((prepared) => {
      if (stopped) return;
      if (still) { drawFrame(ctx, template, params, rest, prepared); return; }
      const tick = () => {
        if (stopped) return;
        const t = performance.now() - began.current;
        drawFrame(ctx, template, params, Math.min(t, end), prepared);
        if (t < end) frame = requestAnimationFrame(tick);
        else if (params.countdown_to) timer = setTimeout(tick, 1000);
      };
      tick();
    });
    return () => { stopped = true; cancelAnimationFrame(frame); clearTimeout(timer); };
  }, [template, designKey, styleKey, assetKey, playKey, still]);

  if (!template) return null;
  // The design's own canvas: a social post is 1080x1350 or 1080x1920, not
  // 1920x1080 (inbox 396). The frame around it letterboxes (object-fit).
  const size = sizeOf(template, paramsFor(template, JSON.parse(designKey), JSON.parse(styleKey)));
  return <canvas ref={ref} width={size.w} height={size.h} className={className} role="img" aria-label={title || kind} />;
}
