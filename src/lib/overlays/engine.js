/**
 * Designed overlays: one drawing per design, four uses (inbox 390).
 *
 * CEO, 30 September 2026: generic overlays for the production studio,
 * "both animated and static, that can be edited, based of what the user wants
 * to be on it, they can upload a logo and make it the offical logo on the
 * overlay and it will join the animation, or text, or change the color".
 *
 * A design is a `draw(ctx, t, params, prepared)` function onto a 1920x1080
 * canvas, where `t` is milliseconds since the design started. Nothing reads the
 * wall clock, so any moment can be asked for exactly (the seek hook of
 * VIDEOS/MOTION-PLAYBOOK.md), and the same function is:
 *
 *   the browser source OBS or vMix shows   (studio page, played by the clock)
 *   the editor preview                     (same, replayed on every change)
 *   the PNG still                          (one frame, at the resting time)
 *   the video file                         (every frame, recorded with alpha)
 *
 * so the four can never disagree about what the design looks like.
 *
 * Pictures come through `/studio-media/`, a same-origin path the Next server
 * proxies to the API's /media/. A canvas that draws a picture from another
 * origin can no longer be read, which would make the PNG and the video fail
 * with nothing to see on screen.
 */

import fixWebmDuration from 'fix-webm-duration';

export const W = 1920;
export const H = 1080;

/** The canvas a design draws on: 1920x1080 unless the design names another,
 *  as a social post does (1080x1350, 1080x1920, ...; inbox 396). */
export function sizeOf(template, params) {
  const s = typeof template?.size === 'function' ? template.size(params || {}) : null;
  return s && s.w > 0 && s.h > 0 ? s : { w: W, h: H };
}

/** Typefaces a design may use. Self-hosted, so a browser source offline still
 *  draws them. Silkscreen (SIL Open Font License 1.1) stands in for the PSD's
 *  "Gameplay", which is not available: CEO, "use whatever fonts are available". */
export const FONTS = {
  pixel: { family: 'VentOverlayPixel', url: '/fonts/overlay/silkscreen-700.woff2', weight: '700', label: 'Pixel' },
  astronum: { family: 'VentOverlayAstronum', url: '/fonts/rivalry/Astronum-Black.otf', weight: '900', label: 'Astronum' },
  monument: { family: 'VentOverlayMonument', url: '/fonts/rivalry/monumentextended-regular.otf', weight: '400', label: 'Monument Extended' },
  barlow: { family: 'VentOverlayBarlow', url: '/fonts/rivalry/BarlowCondensed-ExtraBold.ttf', weight: '800', label: 'Barlow Condensed' },
  clash: { family: 'VentOverlayClash', url: '/fonts/clash_grotesk/ClashGrotesk-Bold.woff2', weight: '700', label: 'Clash Grotesk' },
};

/** The platform's own white mark, lifted from GENERAL OVERLAYS.psd at its own
 *  1348x372, the logo every design shows until the organiser picks theirs. */
export const DEFAULT_LOGO = '/overlays/v-ent-logo-white.png';

// ---------------------------------------------------------------- numbers

export const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
/** How far through a step that starts at `start` and lasts `dur`, 0 to 1. */
export const step = (t, start, dur) => (dur <= 0 ? (t >= start ? 1 : 0) : clamp((t - start) / dur));
export const ease = {
  out: (x) => 1 - (1 - x) ** 3,
  inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - ((-2 * x + 2) ** 3) / 2),
  in: (x) => x * x * x,
  back: (x) => { const c = 1.70158; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; },
};

/** '#E30613' or '#e36' into [r, g, b]; anything unreadable is null. */
export function rgb(hex) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
/** A colour the canvas will accept, or the fallback. An organiser's typo must
 *  never become a black screen on air. */
export const colour = (value, fallback) => (rgb(value) ? `#${String(value).replace('#', '')}` : fallback);
export const rgba = (hex, a) => { const c = rgb(hex) || [0, 0, 0]; return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };
/** Mix toward black (amount < 0) or white (amount > 0). */
export function shade(hex, amount) {
  const c = rgb(hex) || [0, 0, 0];
  const to = amount < 0 ? 0 : 255;
  const k = Math.abs(amount);
  const out = c.map((v) => Math.round(v + (to - v) * k));
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// ------------------------------------------------------------- pictures

/** A media address the canvas may read: same origin, through the proxy. */
export function sameOriginMedia(url) {
  if (!url) return '';
  const text = String(url);
  if (text.startsWith('/') && !text.startsWith('//')) return text;
  try {
    const u = new URL(text);
    if (u.pathname.startsWith('/media/')) return `/studio-media/${u.pathname.slice('/media/'.length)}${u.search}`;
  } catch { /* not a URL */ }
  return '';
}

const images = new Map();
/** A loaded picture, or null. Never throws: a missing logo draws nothing. */
export function loadImage(url) {
  const src = sameOriginMedia(url);
  if (!src) return Promise.resolve(null);
  if (!images.has(src)) {
    images.set(src, new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      // A picture that never answers draws nothing rather than holding the
      // whole design back.
      setTimeout(() => resolve(img.complete && img.naturalWidth ? img : null), 15000);
      img.src = src;
    }));
  }
  return images.get(src);
}

const faces = new Map();
/** Load a typeface once; resolves to the CSS family to draw with. */
export async function loadFont(key, customFonts = []) {
  if (typeof document === 'undefined') return 'sans-serif';
  const custom = String(key || '').startsWith('asset:')
    ? customFonts.find((f) => `asset:${f.id}` === key) : null;
  const spec = custom
    ? { family: `VentOverlayAsset${custom.id}`, url: sameOriginMedia(custom.url), weight: 'normal' }
    : (FONTS[key] || FONTS.pixel);
  if (!spec.url) return 'sans-serif';
  if (!faces.has(spec.family)) {
    const face = new FontFace(spec.family, `url(${spec.url})`, { weight: spec.weight });
    faces.set(spec.family, face.load().then((f) => { document.fonts.add(f); return true; }).catch(() => false));
  }
  const ok = await faces.get(spec.family);
  return ok ? `"${spec.family}"` : 'sans-serif';
}

/** Everything a design needs before its first frame: fonts and pictures. */
export async function prepare(template, params, assets = []) {
  const fonts = assets.filter((a) => a.kind === 'font');
  const byId = new Map(assets.map((a) => [String(a.id), a]));
  const pictureFor = async (value) => {
    if (value === 'none') return null;
    if (!value || value === 'default') return loadImage(DEFAULT_LOGO);
    const a = byId.get(String(value));
    return a && a.kind === 'image' ? loadImage(a.url) : null;
  };
  const pics = {};
  await Promise.all((template.pictures || []).map(async (key) => { pics[key] = await pictureFor(params[key]); }));
  // A picture a design makes for itself, such as a QR code drawn from a link
  // (inbox 396). Made in the browser, so it never taints the canvas.
  if (typeof template.preparePictures === 'function') {
    try { Object.assign(pics, await template.preparePictures(params)); } catch { /* draws without it */ }
  }
  // Every typeface field of the design, loaded by its key: `font` is the
  // primary face and `font2` the secondary one where a design has two.
  const faces = {};
  await Promise.all(template.fields.filter((f) => f.type === 'font')
    .map(async (f) => { faces[f.key] = await loadFont(params[f.key], fonts); }));
  return { images: pics, fonts: faces, family: faces.font || 'sans-serif' };
}

/**
 * What each field is: the value set on this overlay, else the broadcast's
 * overlay style for the role the field follows, else the design's default.
 *
 * CEO, 30 September 2026 (inbox 393): "an overlay design template that will
 * apply to all overlays, like primary fonts, secondary fonts, primary colors,
 * secondary colors". So changing the style changes every overlay, except a
 * field somebody deliberately changed on one overlay.
 */
export function paramsFor(template, design, style = {}) {
  const out = {};
  for (const f of template.fields) {
    const fromStyle = f.role ? style?.[f.role] : undefined;
    out[f.key] = fromStyle !== undefined && fromStyle !== '' ? fromStyle : f.default;
  }
  for (const [k, v] of Object.entries(design || {})) if (v !== undefined && v !== null) out[k] = v;
  return out;
}

/** The style roles, in the order the style editor shows them. */
export const STYLE_ROLES = [
  { role: 'primary', type: 'colour', label: ['overlay.style.primary', 'Primary colour'], fallback: '#EE1510' },
  { role: 'secondary', type: 'colour', label: ['overlay.style.secondary', 'Secondary colour'], fallback: '#720202' },
  { role: 'text', type: 'colour', label: ['overlay.style.text', 'Text colour'], fallback: '#FFFFFF' },
  { role: 'font_primary', type: 'font', label: ['overlay.style.fontPrimary', 'Primary typeface (headlines)'], fallback: 'pixel' },
  { role: 'font_secondary', type: 'font', label: ['overlay.style.fontSecondary', 'Secondary typeface (smaller words)'], fallback: 'pixel' },
  { role: 'logo', type: 'picture', label: ['overlay.style.logo', 'Main logo'], fallback: 'default' },
  { role: 'logo_secondary', type: 'picture', label: ['overlay.style.logoSecondary', 'Second logo'], fallback: 'none' },
];

// --------------------------------------------------------------- drawing

/** Size a line so its capitals are `cap` pixels tall, never wider than `maxW`. */
export function fitText(ctx, text, family, cap, maxW) {
  ctx.font = `100px ${family}`;
  const m = ctx.measureText(text || 'H');
  const capAt100 = (ctx.measureText('H').actualBoundingBoxAscent || 72);
  let size = (cap / capAt100) * 100;
  if (maxW && m.width * (size / 100) > maxW) size = (maxW / m.width) * 100;
  return size;
}

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Draw a picture inside a box, keeping its shape, never above its own size. */
export function drawPicture(ctx, img, x, y, w, h, align = 'center') {
  if (!img) return;
  const k = Math.min(w / img.naturalWidth, h / img.naturalHeight, 1);
  const dw = img.naturalWidth * k;
  const dh = img.naturalHeight * k;
  const dx = align === 'left' ? x : align === 'right' ? x + w - dw : x + (w - dw) / 2;
  ctx.drawImage(img, dx, y + (h - dh) / 2, dw, dh);
}

/** One frame of `template` at `t` into `ctx`. */
export function drawFrame(ctx, template, params, t, prepared) {
  ctx.save();
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  template.draw(ctx, t, params, prepared);
  ctx.restore();
}

/** How long a design runs with these settings, and the moment it is at rest
 *  (after its entry; for a transition, the frame where it covers the screen). */
export function timing(template, params) {
  const total = typeof template.duration === 'function' ? template.duration(params) : template.durationMs;
  const rest = typeof template.rest === 'function' ? template.rest(params) : (template.restMs ?? total);
  return { total, rest };
}

/** A PNG of the resting frame. */
export async function stillPng(template, params, prepared) {
  const c = document.createElement('canvas');
  const size = sizeOf(template, params);
  c.width = size.w; c.height = size.h;
  drawFrame(c.getContext('2d'), template, params, timing(template, params).rest, prepared);
  return new Promise((resolve) => c.toBlob(resolve, 'image/png'));
}

/**
 * The whole design as a WebM with a real alpha channel.
 *
 * MediaRecorder on a canvas keeps transparency in VP8 and VP9 (checked on
 * 30 September 2026: alpha_mode 1, a cleared pixel decodes to alpha 0, a drawn
 * one to 255). WebCodecs refused alpha on the same Chrome, which is why this
 * records rather than encodes. It records in real time, so a 2 second
 * transition takes 2 seconds, and the tab has to stay in front while it runs.
 */
export async function recordWebm(template, params, prepared, { fps = 30, onProgress } = {}) {
  const c = document.createElement('canvas');
  const size = sizeOf(template, params);
  c.width = size.w; c.height = size.h;
  const ctx = c.getContext('2d');
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8'].find((m) => MediaRecorder.isTypeSupported(m));
  if (!mime) throw new Error('RECORDING_UNSUPPORTED');
  const total = timing(template, params).total + (template.tailMs || 0);
  drawFrame(ctx, template, params, 0, prepared);
  const rec = new MediaRecorder(c.captureStream(fps), { mimeType: mime, videoBitsPerSecond: 16e6 });
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
  const done = new Promise((resolve) => { rec.onstop = resolve; setTimeout(resolve, 10000); });
  rec.start(250);
  const began = performance.now();
  await new Promise((resolve) => {
    // However the timers are throttled, the recording ends.
    setTimeout(resolve, total + 15000);
    const tick = () => {
      const t = performance.now() - began;
      drawFrame(ctx, template, params, Math.min(t, total), prepared);
      onProgress?.(Math.min(1, t / total));
      if (t >= total + 120) resolve(); else setTimeout(tick, 1000 / fps / 2);
    };
    tick();
  });
  rec.stop();
  await done;
  // A recorded WebM carries no length in its header, and editors and OBS read
  // one from there. Written in afterwards, from the time the recording ran.
  const recorded = new Blob(chunks, { type: 'video/webm' });
  return fixWebmDuration(recorded, performance.now() - began, { logger: false });
}

/** Save a blob under a plain name the organiser will recognise. */
export function saveBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
