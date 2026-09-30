/**
 * The full screens of GENERAL OVERLAYS.psd (inbox 394): BRB, ENDED and the
 * WINNER SCREEN, measured off their artboards at 1920x1080.
 *
 *   BRB     window 72..1134 x 298..900 (a clip or the camera); STREAM WILL BE,
 *           73px capitals, right edge 1805 at y 350; RIGHT and BACK stacked
 *           in 1164..1818 x 434..833.
 *   ENDED   STREAM HAS 105px capitals at y 338; ENDED 325px at y 475;
 *           THANKS FOR WATCHING 54px at y 831; all centred.
 *   WINNER  CHAMPIONS! three times, 251px each, at y 209, 474 and 749, full
 *           width; a white slot 695..1225 x 275..847 for the champion's logo.
 */
import { W, step, ease, colour, roundRect, drawPicture } from './engine';
import { plateFields, drawPlate, drawCornerLogos, drawLine } from './plate';

const text = (key, def, label) => ({ key, type: 'text', default: def, label });

export const brb = {
  kind: 'brb',
  durationMs: 1900,
  pictures: ['logo', 'partner_logo'],
  fields: [
    text('line1', 'STREAM WILL BE', ['overlay.f.line1', 'Top line']),
    text('line2', 'RIGHT', ['overlay.f.bigLine1', 'Big word, first line']),
    text('line3', 'BACK', ['overlay.f.bigLine2', 'Big word, second line']),
    { key: 'window', type: 'toggle', default: true, label: ['overlay.f.window', 'Window for a clip or the camera, on the left'] },
    ...plateFields(),
  ],
  draw(ctx, t, p, r) {
    const T = p.animated === false ? 1e9 : t;
    const ink = colour(p.text_colour, '#FFFFFF');
    const win = p.window !== false;
    drawPlate(ctx, T, p, win ? [{ x: 72, y: 298, w: 1062, h: 602 }] : []);
    const x = win ? 1812 : W / 2;
    const align = win ? 'right' : 'center';
    const maxW = win ? 650 : 1500;
    const f1 = r.fonts.font2 || r.family;
    const f2 = r.fonts.font || r.family;
    drawLine(ctx, p.line1, { family: f1, face: p.font2, cap: 60, maxW, x, top: 350, align, e: ease.out(step(T, 150, 500)), ink });
    drawLine(ctx, p.line2, { family: f2, face: p.font, cap: 170, maxW, x, top: 440, align, e: ease.out(step(T, 400, 500)), rise: 70, ink });
    drawLine(ctx, p.line3, { family: f2, face: p.font, cap: 170, maxW, x, top: 650, align, e: ease.out(step(T, 560, 500)), rise: 70, ink });
    drawCornerLogos(ctx, T, r, 1100);
  },
};

export const streamEnded = {
  kind: 'stream_ended',
  durationMs: 2000,
  pictures: ['logo', 'partner_logo'],
  fields: [
    text('line1', 'STREAM HAS', ['overlay.f.line1', 'Top line']),
    text('line2', 'ENDED', ['overlay.f.line2', 'Big word']),
    text('line3', 'THANKS FOR WATCHING', ['overlay.f.line3', 'Under it']),
    ...plateFields(),
  ],
  draw(ctx, t, p, r) {
    const T = p.animated === false ? 1e9 : t;
    const ink = colour(p.text_colour, '#FFFFFF');
    drawPlate(ctx, T, p);
    const f1 = r.fonts.font2 || r.family;
    const f2 = r.fonts.font || r.family;
    drawLine(ctx, p.line1, { family: f1, face: p.font2, cap: 90, maxW: 1100, x: W / 2, top: 338, align: 'center', e: ease.out(step(T, 150, 500)), ink });
    drawLine(ctx, p.line2, { family: f2, face: p.font, cap: 300, maxW: 1400, x: W / 2, top: 475, align: 'center', e: ease.out(step(T, 400, 600)), rise: 80, ink });
    drawLine(ctx, p.line3, { family: f1, face: p.font2, cap: 48, maxW: 1000, x: W / 2, top: 831, align: 'center', e: ease.out(step(T, 900, 500)), ink });
    drawCornerLogos(ctx, T, r, 1250);
  },
};

export const champions = {
  kind: 'champions',
  durationMs: 2300,
  pictures: ['logo', 'partner_logo', 'champion_logo'],
  fields: [
    text('word', 'CHAMPIONS!', ['overlay.f.word', 'The word']),
    // Empty until the champion's logo is uploaded: the white V-ENT mark on a
    // white slot would be invisible.
    { key: 'champion_logo', type: 'picture', default: 'none', label: ['overlay.f.championLogo', 'The champion’s logo'] },
    { key: 'slot_colour', type: 'colour', role: 'text', default: '#FFFFFF', label: ['overlay.f.slotColour', 'Logo slot'] },
    ...plateFields(),
  ],
  draw(ctx, t, p, r) {
    const T = p.animated === false ? 1e9 : t;
    const ink = colour(p.text_colour, '#FFFFFF');
    drawPlate(ctx, T, p);
    const f = r.fonts.font || r.family;
    // Three lines, the middle one arriving from the other side.
    [209, 474, 749].forEach((top, i) => {
      const e = ease.out(step(T, 150 + i * 180, 600));
      ctx.save();
      ctx.translate((i === 1 ? 1 : -1) * 220 * (1 - e), 0);
      drawLine(ctx, p.word, { family: f, face: p.font, cap: 230, maxW: 1760, x: W / 2, top, align: 'center', e, rise: 0, ink });
      ctx.restore();
    });
    // The slot, over the words, and the champion's logo in it.
    const s = ease.back(step(T, 900, 700));
    if (s > 0) {
      ctx.save();
      ctx.translate(960, 561);
      ctx.scale(s, s);
      // The PSD frames the slot in the plate's red; a band, not a hairline.
      ctx.fillStyle = colour(p.bg_to, '#EE1510');
      roundRect(ctx, -277, -298, 554, 596, 40);
      ctx.fill();
      ctx.fillStyle = colour(p.slot_colour, '#FFFFFF');
      roundRect(ctx, -265, -286, 530, 572, 34);
      ctx.fill();
      ctx.restore();
      if (r.images.champion_logo && s >= 0.98) {
        ctx.globalAlpha = ease.out(step(T, 1400, 500));
        drawPicture(ctx, r.images.champion_logo, 735, 320, 450, 482, 'center');
        ctx.globalAlpha = 1;
      }
    }
    drawCornerLogos(ctx, T, r, 1500);
  },
};
