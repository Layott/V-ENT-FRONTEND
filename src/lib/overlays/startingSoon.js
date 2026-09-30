/**
 * Starting soon, from the STARTING artboard of GENERAL OVERLAYS.psd.
 *
 * Measured off the PSD at 1920x1080 (30 September 2026): a ramp from #720202
 * top left to about #EE1510 bottom right; a grid every 148px; "STREAM IS" with
 * 73px capitals at x 302, y 344; "STARTING" with 226px capitals from y 439,
 * 1306px wide; a panel at 908..1628 x 699..863 under it (a dashed placeholder
 * in the PSD, where the countdown goes); the partner mark top left in 77..294 x
 * 43..126 and the V-ENT mark top right in 1625..1837 x 43..101. White type.
 *
 * The background is there from the first frame: a holding card that flashes
 * in is a fault on air. Then the grid, the first line, the big word letter by
 * letter, the panel, and the logos last, so an uploaded logo arrives WITH the
 * design rather than sitting on it. After the entry nothing moves but the
 * countdown, which is information, not decoration.
 */
import { W, H, step, ease, colour, fitText, roundRect, drawPicture } from './engine';

/** Where each part sits, per layout. `psd` is the artboard as designed. */
function layoutFor(name) {
  if (name === 'center') {
    return {
      align: 'center', x: W / 2, line1Top: 470, line1Cap: 60, line2Top: 552, line2Cap: 190, maxW: 1500,
      bigLogo: { x: W / 2 - 300, y: 150, w: 600, h: 260 }, panel: { cx: W / 2, y: 812, w: 640, h: 140 },
    };
  }
  if (name === 'logo_right') {
    return {
      align: 'left', x: 150, line1Top: 360, line1Cap: 62, line2Top: 446, line2Cap: 180, maxW: 1000,
      bigLogo: { x: 1210, y: 330, w: 580, h: 420 }, panel: { right: 1150, y: 690, w: 560, h: 140 },
    };
  }
  return {
    align: 'left', x: 302, line1Top: 344, line1Cap: 73, line2Top: 439, line2Cap: 226, maxW: 1310,
    bigLogo: null, panel: { right: 1628, y: 699, w: 720, h: 164 },
  };
}

function countdownText(p, now) {
  const target = Date.parse(p.countdown_to || '');
  if (!Number.isFinite(target)) return '';
  const left = Math.max(0, Math.round((target - now) / 1000));
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  const two = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`;
}

export default {
  kind: 'starting_soon',
  durationMs: 2000,
  restMs: 2000,
  pictures: ['logo', 'partner_logo'],
  fields: [
    { key: 'line1', type: 'text', default: 'STREAM IS', label: ['overlay.f.line1', 'Top line'] },
    { key: 'line2', type: 'text', default: 'STARTING', label: ['overlay.f.line2', 'Big word'] },
    { key: 'note', type: 'text', default: 'SOON', label: ['overlay.f.note', 'In the panel'] },
    { key: 'countdown_to', type: 'datetime', default: '', label: ['overlay.f.countdown', 'Count down to (replaces the panel words)'] },
    { key: 'logo', type: 'picture', default: 'default', label: ['overlay.f.logo', 'Main logo'] },
    { key: 'partner_logo', type: 'picture', default: 'none', label: ['overlay.f.partnerLogo', 'Second logo, top left'] },
    { key: 'layout', type: 'choice', default: 'psd', label: ['overlay.f.layout', 'Layout'],
      choices: [['psd', ['overlay.layout.psd', 'Words left, logos in the corners']],
        ['center', ['overlay.layout.center', 'Big logo on top, words centred']],
        ['logo_right', ['overlay.layout.logoRight', 'Words left, big logo right']]] },
    { key: 'bg_from', type: 'colour', default: '#720202', label: ['overlay.f.bgFrom', 'Background, dark corner'] },
    { key: 'bg_to', type: 'colour', default: '#EE1510', label: ['overlay.f.bgTo', 'Background, bright corner'] },
    { key: 'text_colour', type: 'colour', default: '#FFFFFF', label: ['overlay.f.textColour', 'Words'] },
    { key: 'grid', type: 'toggle', default: true, label: ['overlay.f.grid', 'Grid on the background'] },
    { key: 'font', type: 'font', default: 'pixel', label: ['overlay.f.font', 'Typeface'] },
    { key: 'animated', type: 'toggle', default: true, label: ['overlay.f.animated', 'Animated (off: a still picture)'] },
  ],

  draw(ctx, t, p, r) {
    const T = p.animated === false ? 1e9 : t;
    const L = layoutFor(p.layout);
    const ink = colour(p.text_colour, '#FFFFFF');
    const family = r.family;

    // The plate, whole from the first frame.
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, colour(p.bg_from, '#720202'));
    g.addColorStop(1, colour(p.bg_to, '#EE1510'));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    if (p.grid !== false) {
      ctx.globalAlpha = 0.14 * ease.out(step(T, 0, 700));
      ctx.fillStyle = '#FFFFFF';
      for (let x = 22; x < W; x += 148) ctx.fillRect(x, 0, 2, H);
      for (let y = 22; y < H; y += 148) ctx.fillRect(0, y, W, 2);
      ctx.globalAlpha = 1;
    }

    // Words. Silkscreen spaces its letters wider than the PSD's Gameplay, so
    // the pixel face is drawn a little tighter; other faces as they come.
    ctx.letterSpacing = p.font === 'pixel' || !p.font ? '-0.06em' : '0px';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = ink;
    const line1 = String(p.line1 || '');
    const line2 = String(p.line2 || '');
    const size1 = fitText(ctx, line1, family, L.line1Cap, L.maxW);
    const size2 = fitText(ctx, line2, family, L.line2Cap, L.maxW);

    ctx.font = `${size1}px ${family}`;
    const w1 = ctx.measureText(line1).width;
    const x1 = L.align === 'center' ? L.x - w1 / 2 : L.x;
    const a1 = ease.out(step(T, 150, 500));
    ctx.globalAlpha = a1;
    ctx.fillText(line1, x1, L.line1Top + L.line1Cap + 40 * (1 - a1));
    ctx.globalAlpha = 1;

    ctx.font = `${size2}px ${family}`;
    const w2 = ctx.measureText(line2).width;
    const x2 = L.align === 'center' ? L.x - w2 / 2 : L.x;
    const base2 = L.line2Top + L.line2Cap;
    // Letter by letter, each dropping into place.
    for (let i = 0; i < line2.length; i += 1) {
      const e = ease.out(step(T, 380 + i * 55, 420));
      if (e <= 0) continue;
      const dx = ctx.measureText(line2.slice(0, i)).width;
      ctx.globalAlpha = e;
      ctx.fillText(line2[i], x2 + dx, base2 - 70 * (1 - e));
    }
    ctx.globalAlpha = 1;

    // The panel: a countdown when there is a time, the note when there is not.
    const words = countdownText(p, Date.now()) || String(p.note || '');
    if (words) {
      const P = L.panel;
      const rightEdge = P.cx ? P.cx + P.w / 2 : Math.min(P.right, x2 + w2 + 16);
      const grow = ease.out(step(T, 950, 450));
      const w = P.w * grow;
      const x = P.cx ? P.cx - w / 2 : rightEdge - w;
      if (w > 4) {
        ctx.fillStyle = 'rgba(0,0,0,0.24)';
        roundRect(ctx, x, P.y, w, P.h, 18);
        ctx.fill();
        const size = fitText(ctx, words, family, P.h * 0.42, P.w - 80);
        ctx.font = `${size}px ${family}`;
        const tw = ctx.measureText(words).width;
        ctx.save();
        roundRect(ctx, x, P.y, w, P.h, 18);
        ctx.clip();
        ctx.globalAlpha = ease.out(step(T, 1150, 350));
        ctx.fillStyle = ink;
        const cx = P.cx ? P.cx : rightEdge - P.w / 2;
        ctx.fillText(words, cx - tw / 2, P.y + P.h / 2 + (P.h * 0.42) / 2);
        ctx.restore();
      }
    }

    // Logos last, so an uploaded logo arrives with the design.
    const logoIn = ease.back(step(T, 1250, 550));
    const drawLogo = (img, box, align) => {
      if (!img || logoIn <= 0) return;
      const k = 0.85 + 0.15 * logoIn;
      ctx.save();
      ctx.globalAlpha = Math.min(1, logoIn);
      ctx.translate(box.x + box.w / 2, box.y + box.h / 2);
      ctx.scale(k, k);
      drawPicture(ctx, img, -box.w / 2, -box.h / 2, box.w, box.h, align);
      ctx.restore();
    };
    if (L.bigLogo) drawLogo(r.images.logo, L.bigLogo, 'center');
    else drawLogo(r.images.logo, { x: 1537, y: 43, w: 300, h: 58 }, 'right');
    drawLogo(r.images.partner_logo, { x: 77, y: 43, w: 260, h: 83 }, 'left');
  },
};

