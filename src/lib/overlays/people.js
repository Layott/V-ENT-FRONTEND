/**
 * The small pieces of GENERAL OVERLAYS.psd (inbox 394): the streamer name tag
 * and the lower third. Both are see-through everywhere else, so they sit over
 * the game or the camera.
 *
 *   STREAMER NAME TAG  white pill 609..1311 x 909..1002, name in the red
 *   LOWER 3RD          a bar 1344..1920 x 945..1080 on the plate's ramp: the
 *                      event logo in 1414..1562 x 993..1050 and MATCH 1 with
 *                      48px capitals from x 1629. The PSD's thin line between
 *                      logo and words is space here (no divider lines).
 */
import { W, step, ease, colour, roundRect, drawPicture } from './engine';
import { drawNameTag, drawLine } from './plate';

const WHERE = [['center', ['overlay.where.center', 'Bottom centre']], ['left', ['overlay.where.left', 'Bottom left']],
  ['right', ['overlay.where.right', 'Bottom right']]];

export const nameTag = {
  kind: 'name_tag',
  durationMs: 800,
  pictures: [],
  fields: [
    { key: 'name', type: 'text', default: 'STREAMER NAME', label: ['overlay.f.name', 'Name'] },
    { key: 'where', type: 'choice', default: 'center', label: ['overlay.f.where', 'Where it sits'], choices: WHERE },
    { key: 'tag_colour', type: 'colour', role: 'text', default: '#FFFFFF', label: ['overlay.f.tagColour', 'Name tag'] },
    { key: 'tag_text', type: 'colour', role: 'primary', default: '#D60201', label: ['overlay.f.tagText', 'Name on the tag'] },
    { key: 'font2', type: 'font', role: 'font_secondary', default: 'pixel', label: ['overlay.f.font', 'Typeface'] },
    { key: 'animated', type: 'toggle', default: true, label: ['overlay.f.animated', 'Animated (off: a still picture)'] },
  ],
  draw(ctx, t, p, r) {
    const T = p.animated === false ? 1e9 : t;
    const x = p.where === 'left' ? 80 : p.where === 'right' ? W - 80 - 702 : 609;
    drawNameTag(ctx, { x, y: 909, w: 702, h: 93 }, p.name, {
      family: r.fonts.font2 || r.family, face: p.font2,
      fill: colour(p.tag_colour, '#FFFFFF'), ink: colour(p.tag_text, '#D60201'), e: ease.out(step(T, 0, 500)),
    });
  },
};

export const matchLowerThird = {
  kind: 'match_lower_third',
  durationMs: 1100,
  pictures: ['logo'],
  fields: [
    { key: 'label', type: 'text', default: 'MATCH 1', label: ['overlay.f.label', 'Words'] },
    { key: 'logo', type: 'picture', role: 'logo', default: 'default', label: ['overlay.f.logo', 'Main logo'] },
    { key: 'side', type: 'choice', default: 'right', label: ['overlay.f.side', 'Side'],
      choices: [['right', ['overlay.where.right', 'Bottom right']], ['left', ['overlay.where.left', 'Bottom left']]] },
    { key: 'bg_from', type: 'colour', role: 'secondary', default: '#720202', label: ['overlay.f.barFrom', 'Bar, dark end'] },
    { key: 'bg_to', type: 'colour', role: 'primary', default: '#EE1510', label: ['overlay.f.barTo', 'Bar, bright end'] },
    { key: 'text_colour', type: 'colour', role: 'text', default: '#FFFFFF', label: ['overlay.f.textColour', 'Words'] },
    { key: 'font2', type: 'font', role: 'font_secondary', default: 'pixel', label: ['overlay.f.font', 'Typeface'] },
    { key: 'animated', type: 'toggle', default: true, label: ['overlay.f.animated', 'Animated (off: a still picture)'] },
  ],
  draw(ctx, t, p, r) {
    const T = p.animated === false ? 1e9 : t;
    const left = p.side === 'left';
    const barW = 576;
    const e = ease.out(step(T, 0, 450));
    const x = left ? -barW * (1 - e) : W - barW + barW * (1 - e);
    const g = ctx.createLinearGradient(x, 0, x + barW, 0);
    g.addColorStop(0, colour(p.bg_from, '#720202'));
    g.addColorStop(1, colour(p.bg_to, '#EE1510'));
    ctx.fillStyle = g;
    // Squared on the screen edge, rounded on the inside edge.
    roundRect(ctx, left ? x - 20 : x, 945, barW + 20, 135, 18);
    ctx.fill();
    const inner = left ? x + 40 : x + 70;
    if (r.images.logo) {
      ctx.globalAlpha = ease.out(step(T, 300, 400));
      drawPicture(ctx, r.images.logo, inner, 993, 148, 57, 'left');
      ctx.globalAlpha = 1;
    }
    drawLine(ctx, p.label, {
      // Inside the bar: it ends at the screen edge, 1863 in the PSD.
      family: r.fonts.font2 || r.family, face: p.font2, cap: 44, maxW: r.images.logo ? 230 : 440,
      x: inner + (r.images.logo ? 215 : 0), top: 990, e: ease.out(step(T, 450, 400)), rise: 0,
      ink: colour(p.text_colour, '#FFFFFF'),
    });
  },
};
