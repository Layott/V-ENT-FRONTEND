/**
 * What the GENERAL OVERLAYS.psd screens share (inbox 394): the red ramp with
 * its 148px grid, the two corner logos, the see-through windows for a camera
 * or the game, and the white name tag with red letters.
 *
 * Measured off the PSD at 1920x1080, 30 September 2026. The white boxes in the
 * PSD are where video goes, so here they are holes cut through the plate: OBS
 * shows whatever sits under this browser source through them.
 *
 * Field keys and roles match startingSoon.js, so one overlay style (inbox 393)
 * dresses every screen alike.
 */
import { W, H, step, ease, colour, fitText, roundRect, drawPicture } from './engine';

/** The fields every plate design has. `only` picks a subset by key. */
export function plateFields({ only } = {}) {
  const all = [
    { key: 'logo', type: 'picture', role: 'logo', default: 'default', label: ['overlay.f.logo', 'Main logo'] },
    { key: 'partner_logo', type: 'picture', role: 'logo_secondary', default: 'none', label: ['overlay.f.partnerLogo', 'Second logo, top left'] },
    { key: 'bg_from', type: 'colour', role: 'secondary', default: '#720202', label: ['overlay.f.bgFrom', 'Background, dark corner'] },
    { key: 'bg_to', type: 'colour', role: 'primary', default: '#EE1510', label: ['overlay.f.bgTo', 'Background, bright corner'] },
    { key: 'text_colour', type: 'colour', role: 'text', default: '#FFFFFF', label: ['overlay.f.textColour', 'Words'] },
    { key: 'grid', type: 'toggle', default: true, label: ['overlay.f.grid', 'Grid on the background'] },
    { key: 'font', type: 'font', role: 'font_primary', default: 'pixel', label: ['overlay.f.fontHeadline', 'Typeface, headline'] },
    { key: 'font2', type: 'font', role: 'font_secondary', default: 'pixel', label: ['overlay.f.fontSmall', 'Typeface, smaller words'] },
    { key: 'animated', type: 'toggle', default: true, label: ['overlay.f.animated', 'Animated (off: a still picture)'] },
  ];
  return only ? all.filter((f) => only.includes(f.key)) : all;
}

/** Silkscreen spaces wider than the PSD's Gameplay; drawn a little tighter. */
export const tight = (face) => (face === 'pixel' || !face ? '-0.06em' : '0px');

/** The whole-frame plate, with rounded holes cut where video shows through. */
export function drawPlate(ctx, T, p, holes = []) {
  // The canvas's own size: a social post is not 1920x1080 (inbox 396).
  const cw = ctx.canvas?.width || W;
  const ch = ctx.canvas?.height || H;
  const g = ctx.createLinearGradient(0, 0, cw, ch);
  g.addColorStop(0, colour(p.bg_from, '#720202'));
  g.addColorStop(1, colour(p.bg_to, '#EE1510'));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cw, ch);
  if (p.grid !== false) {
    ctx.globalAlpha = 0.14 * ease.out(step(T, 0, 700));
    ctx.fillStyle = '#FFFFFF';
    for (let x = 22; x < cw; x += 148) ctx.fillRect(x, 0, 2, ch);
    for (let y = 22; y < ch; y += 148) ctx.fillRect(0, y, cw, 2);
    ctx.globalAlpha = 1;
  }
  if (holes.length) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    for (const h of holes) { roundRect(ctx, h.x, h.y, h.w, h.h, 14); ctx.fill(); }
    ctx.restore();
  }
}

/** A logo arriving with the design: a small rise in scale, then still. */
export function drawLogoIn(ctx, img, box, e, align = 'center') {
  if (!img || e <= 0) return;
  const k = 0.85 + 0.15 * e;
  ctx.save();
  ctx.globalAlpha = Math.min(1, e);
  ctx.translate(box.x + box.w / 2, box.y + box.h / 2);
  ctx.scale(k, k);
  drawPicture(ctx, img, -box.w / 2, -box.h / 2, box.w, box.h, align);
  ctx.restore();
}

/** The two corner marks of every PSD screen. */
export function drawCornerLogos(ctx, T, r, start = 900) {
  const e = ease.back(step(T, start, 550));
  drawLogoIn(ctx, r.images.logo, { x: 1537, y: 43, w: 300, h: 58 }, e, 'right');
  drawLogoIn(ctx, r.images.partner_logo, { x: 77, y: 43, w: 260, h: 83 }, e, 'left');
}

/**
 * One line of words with capitals `cap` tall and its top at `top`, never
 * wider than `maxW`. `align` left, center or right about `x`. Returns the
 * width drawn.
 */
export function drawLine(ctx, text, { family, face, cap, maxW, x, top, align = 'left', e = 1, rise = 40, ink }) {
  const words = String(text || '');
  if (!words) return 0;
  ctx.letterSpacing = tight(face);
  const size = fitText(ctx, words, family, cap, maxW);
  ctx.font = `${size}px ${family}`;
  const w = ctx.measureText(words).width;
  const left = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  ctx.globalAlpha = Math.max(0, Math.min(1, e));
  ctx.fillStyle = ink;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(words, left, top + cap + rise * (1 - e));
  ctx.globalAlpha = 1;
  return w;
}

/**
 * The PSD's name tag: a white pill with the name in the plate's red, centred
 * in `box`, rising into place as `e` goes from 0 to 1.
 */
export function drawNameTag(ctx, box, text, { family, face, fill, ink, e = 1 }) {
  if (e <= 0 || !text) return;
  const dy = 24 * (1 - e);
  ctx.save();
  ctx.globalAlpha = Math.min(1, e);
  ctx.fillStyle = fill;
  roundRect(ctx, box.x, box.y + dy, box.w, box.h, Math.min(18, box.h / 2));
  ctx.fill();
  ctx.restore();
  drawLine(ctx, text, {
    family, face, cap: box.h * 0.46, maxW: box.w - 60, x: box.x + box.w / 2,
    top: box.y + dy + (box.h - box.h * 0.46) / 2, align: 'center', e: Math.min(1, e), rise: 0, ink,
  });
}
