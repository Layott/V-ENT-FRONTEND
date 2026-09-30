/**
 * Transition: the diagonal bar wipe of OVERLAYS-ELEMENTS/TRANSITION.mp4,
 * rebuilt so it can be any colour and carry the organiser's logo.
 *
 * The MP4 is 4 seconds of dark and red bands crossing on a diagonal, covering
 * the frame, then clearing. Its last frames are the grey checkerboard design
 * software uses to MEAN transparent (CEO, 30 September 2026), which an MP4
 * cannot carry, so here the end is transparent for real, and the video export
 * is a WebM with an alpha channel that OBS reads as a stinger.
 *
 * Bands slide in along the diagonal one after another until the frame is
 * covered, the logo shows on the cover, and they slide out the far side.
 * `rest` is the covered frame: it is the moment to cut the scene underneath,
 * the "transition point" OBS asks for, and what the still export shows.
 */
import { W, H, step, ease, colour, shade, drawPicture, clamp } from './engine';

const DIAGONAL = Math.hypot(W, H);

const durationOf = (p) => clamp(Number(p.duration_ms) || 1800, 800, 4000);

export default {
  kind: 'transition',
  duration: durationOf,
  rest: (p) => Math.round(durationOf(p) / 2),
  tailMs: 150,
  pictures: ['logo'],
  fields: [
    { key: 'colour_a', type: 'colour', default: '#C8102E', label: ['overlay.f.colourA', 'First colour'] },
    { key: 'colour_b', type: 'colour', default: '#141416', label: ['overlay.f.colourB', 'Second colour'] },
    { key: 'bands', type: 'choice', default: '5', label: ['overlay.f.bands', 'How many bands'],
      choices: [['3', ['overlay.bands.3', '3 bands']], ['5', ['overlay.bands.5', '5 bands']], ['7', ['overlay.bands.7', '7 bands']]] },
    { key: 'direction', type: 'choice', default: 'ltr', label: ['overlay.f.direction', 'Direction'],
      choices: [['ltr', ['overlay.dir.ltr', 'Left to right']], ['rtl', ['overlay.dir.rtl', 'Right to left']]] },
    { key: 'duration_ms', type: 'choice', default: '1800', label: ['overlay.f.speed', 'Length'],
      choices: [['1200', ['overlay.speed.fast', 'Fast, 1.2 seconds']], ['1800', ['overlay.speed.normal', 'Normal, 1.8 seconds']],
        ['2600', ['overlay.speed.slow', 'Slow, 2.6 seconds']], ['4000', ['overlay.speed.long', 'Long, 4 seconds']]] },
    { key: 'logo', type: 'picture', default: 'default', label: ['overlay.f.logo', 'Main logo'] },
  ],

  draw(ctx, t, p, r) {
    const total = durationOf(p);
    const mid = total / 2;
    const n = Number(p.bands) || 5;
    const a = colour(p.colour_a, '#C8102E');
    const b = colour(p.colour_b, '#141416');
    const dir = p.direction === 'rtl' ? -1 : 1;

    // Every band is in by `mid`, and out by `total`.
    const stagger = (mid * 0.32) / Math.max(1, n - 1);
    const travel = mid * 0.68;
    const bandH = DIAGONAL / n;

    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-0.56);
    for (let i = 0; i < n; i += 1) {
      const inE = ease.inOut(step(t, i * stagger, travel));
      const outE = ease.inOut(step(t, mid + i * stagger, travel));
      if (inE <= 0 || outE >= 1) continue;
      const offset = dir * DIAGONAL * (outE - (1 - inE));
      const y = -DIAGONAL / 2 + i * bandH;
      const c = i % 2 === 0 ? a : b;
      // Depth across the band rather than a flat fill, the way the MP4 reads.
      const g = ctx.createLinearGradient(0, y, 0, y + bandH);
      g.addColorStop(0, shade(c, -0.28));
      g.addColorStop(0.55, c);
      g.addColorStop(1, shade(c, 0.1));
      ctx.fillStyle = g;
      // A hair of overlap so the bands never show a seam of the scene.
      ctx.fillRect(-DIAGONAL / 2 + offset, y - 1, DIAGONAL, bandH + 2);
    }
    ctx.restore();

    // The logo on the cover: in as the last band lands, out as the first leaves.
    const img = r.images.logo;
    if (img) {
      const show = ease.back(step(t, mid * 0.72, mid * 0.28));
      const hide = ease.in(step(t, mid + mid * 0.05, mid * 0.25));
      const alpha = Math.min(1, show) * (1 - hide);
      if (alpha > 0) {
        const k = 0.8 + 0.2 * show;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(W / 2, H / 2);
        ctx.scale(k, k);
        drawPicture(ctx, img, -330, -170, 660, 340, 'center');
        ctx.restore();
      }
    }
  },
};
