/**
 * The camera and game frames of GENERAL OVERLAYS.psd (inbox 394), measured
 * off their artboards at 1920x1080. The windows are cut through the plate, so
 * OBS shows the camera or the game underneath.
 *
 *   SINGLE STREAMER         window 324..1587 x 198..913; name tag
 *                           608..1311 x 924..1018
 *   DOUBLE STREAMER         windows 74..944 and 976..1846 x 331..825; tags
 *                           236..813 and 1106..1683 x 860..938
 *   STREAMER AND GAME PLAY  camera 88..928 x 269..987; game 955..1812 x
 *                           385..872 (no tag in the PSD; one can be shown)
 */
import { step, ease, colour } from './engine';
import { plateFields, drawPlate, drawCornerLogos, drawNameTag } from './plate';

const tagFields = [
  { key: 'tag_colour', type: 'colour', role: 'text', default: '#FFFFFF', label: ['overlay.f.tagColour', 'Name tag'] },
  { key: 'tag_text', type: 'colour', role: 'primary', default: '#D60201', label: ['overlay.f.tagText', 'Name on the tag'] },
];

const tagStyle = (p, r) => ({
  family: r.fonts.font2 || r.family, face: p.font2,
  fill: colour(p.tag_colour, '#FFFFFF'), ink: colour(p.tag_text, '#D60201'),
});

const plate = plateFields({ only: ['logo', 'partner_logo', 'bg_from', 'bg_to', 'grid', 'font2', 'animated'] });

export const streamerSingle = {
  kind: 'streamer_single',
  durationMs: 1500,
  pictures: ['logo', 'partner_logo'],
  fields: [
    { key: 'name', type: 'text', default: 'STREAMER NAME', label: ['overlay.f.name', 'Name'] },
    { key: 'show_tag', type: 'toggle', default: true, label: ['overlay.f.showTag', 'Show the name tag'] },
    ...tagFields, ...plate,
  ],
  draw(ctx, t, p, r) {
    const T = p.animated === false ? 1e9 : t;
    drawPlate(ctx, T, p, [{ x: 324, y: 198, w: 1263, h: 715 }]);
    if (p.show_tag !== false) drawNameTag(ctx, { x: 608, y: 924, w: 703, h: 94 }, p.name, { ...tagStyle(p, r), e: ease.out(step(T, 400, 500)) });
    drawCornerLogos(ctx, T, r, 800);
  },
};

export const streamerDouble = {
  kind: 'streamer_double',
  durationMs: 1600,
  pictures: ['logo', 'partner_logo'],
  fields: [
    { key: 'name_left', type: 'text', default: 'STREAMER NAME', label: ['overlay.f.nameLeft', 'Name on the left'] },
    { key: 'name_right', type: 'text', default: 'STREAMER NAME', label: ['overlay.f.nameRight', 'Name on the right'] },
    { key: 'show_tag', type: 'toggle', default: true, label: ['overlay.f.showTags', 'Show the name tags'] },
    ...tagFields, ...plate,
  ],
  draw(ctx, t, p, r) {
    const T = p.animated === false ? 1e9 : t;
    drawPlate(ctx, T, p, [{ x: 74, y: 331, w: 870, h: 494 }, { x: 976, y: 331, w: 870, h: 494 }]);
    if (p.show_tag !== false) {
      drawNameTag(ctx, { x: 236, y: 860, w: 577, h: 78 }, p.name_left, { ...tagStyle(p, r), e: ease.out(step(T, 400, 500)) });
      drawNameTag(ctx, { x: 1106, y: 860, w: 577, h: 78 }, p.name_right, { ...tagStyle(p, r), e: ease.out(step(T, 550, 500)) });
    }
    drawCornerLogos(ctx, T, r, 900);
  },
};

export const streamerGameplay = {
  kind: 'streamer_gameplay',
  durationMs: 1500,
  pictures: ['logo', 'partner_logo'],
  fields: [
    { key: 'name', type: 'text', default: 'STREAMER NAME', label: ['overlay.f.name', 'Name'] },
    { key: 'show_tag', type: 'toggle', default: false, label: ['overlay.f.showTagCamera', 'Show a name tag under the camera'] },
    { key: 'swap', type: 'toggle', default: false, label: ['overlay.f.swap', 'Camera on the right, game on the left'] },
    ...tagFields, ...plate,
  ],
  draw(ctx, t, p, r) {
    const T = p.animated === false ? 1e9 : t;
    // The PSD puts the camera left; `swap` mirrors the two windows.
    const cam = p.swap ? { x: 992, y: 269, w: 840, h: 718 } : { x: 88, y: 269, w: 840, h: 718 };
    const game = p.swap ? { x: 108, y: 385, w: 857, h: 487 } : { x: 955, y: 385, w: 857, h: 487 };
    drawPlate(ctx, T, p, [cam, game]);
    if (p.show_tag) {
      drawNameTag(ctx, { x: cam.x + 120, y: 1000 - 12, w: 600, h: 70 }, p.name, { ...tagStyle(p, r), e: ease.out(step(T, 400, 500)) });
    }
    drawCornerLogos(ctx, T, r, 800);
  },
};
