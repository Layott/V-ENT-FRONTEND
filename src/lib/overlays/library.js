/**
 * The asset library families (inbox 396, Esports_Broadcast_Asset_Library.pdf).
 *
 * The PDF lists about 300 graphics across eleven sections, and most of them are
 * the same few shapes with different words: a title card that says GRAND FINAL
 * or HALF TIME or MATCH POINT, an award card that says MVP or BOOYAH!, a post
 * for Instagram that says LIVE NOW. So this file is six designs, each with the
 * PDF's items as presets, rather than three hundred files.
 *
 *   title_card     every stage, round, break and moment card, full screen
 *   versus_card    team v team, player v player, match intro, series score
 *   award_card     champion, MVP, player of the match, kill leader ...
 *   corner_bug     tournament or sponsor logo, social handle, QR code
 *   stat_counter   alive, kills, teams left, possession ... up to four rows
 *   social_post    the social and YouTube items at the PDF's own sizes
 *
 * Which PDF item each one covers, and which ones are live data overlays the
 * studio already draws, is `docs/overlay-coverage.json`, held by
 * scripts/check-overlay-coverage.mjs.
 *
 * The presets carry English words because they are what gets drawn; anybody
 * can type their own words over them in any language.
 */
import { W, H, step, ease, colour, rgba, roundRect, drawPicture } from './engine';
import { plateFields, drawPlate, drawCornerLogos, drawLine, drawLogoIn } from './plate';

// ------------------------------------------------------------ the presets

/** Every preset's words, by key. One list, shared by the three designs. */
export const PRESET_WORDS = {
  custom: '',
  tournament: 'TOURNAMENT',
  match: 'MATCH #',
  round: 'ROUND #',
  day: 'DAY #',
  stage: 'STAGE #',
  game: 'GAME #',
  phase: 'PHASE #',
  group_stage: 'GROUP STAGE',
  knockout: 'KNOCKOUT STAGE',
  playoffs: 'PLAYOFFS',
  round_of_32: 'ROUND OF 32',
  round_of_16: 'ROUND OF 16',
  quarter_final: 'QUARTER FINAL',
  semi_final: 'SEMI FINAL',
  grand_final: 'GRAND FINAL',
  upper_bracket: 'UPPER BRACKET',
  lower_bracket: 'LOWER BRACKET',
  matchday: 'MATCHDAY',
  upcoming: 'UP NEXT',
  current: 'NOW PLAYING',
  previous_result: 'LAST RESULT',
  match_start: 'MATCH START',
  loading: 'LOADING',
  live_now: 'LIVE NOW',
  registration_open: 'REGISTRATION OPEN',
  registration_closing: 'REGISTRATION CLOSING',
  registration_closed: 'REGISTRATION CLOSED',
  completed: 'TOURNAMENT COMPLETE',
  announcement: 'ANNOUNCEMENT',
  break: 'BREAK',
  ad_break: 'AD BREAK',
  sponsor: 'BROUGHT TO YOU BY',
  half_time: 'HALF TIME',
  full_time: 'FULL TIME',
  extra_time: 'EXTRA TIME',
  penalties: 'PENALTY SHOOTOUT',
  goal: 'GOAL!',
  match_point: 'MATCH POINT',
  final_circle: 'FINAL CIRCLE',
  last_team: 'LAST TEAM STANDING',
  clutch: 'CLUTCH',
  upset: 'BIGGEST UPSET',
  qualified: 'QUALIFIED',
  eliminated: 'ELIMINATED',
  prize_pool: 'PRIZE POOL',
  schedule: 'SCHEDULE',
  rules: 'RULES',
  event_date: 'SAVE THE DATE',
  venue: 'VENUE',
  highlights: 'HIGHLIGHTS',
  best_moments: 'BEST MOMENTS',
  match_recap: 'MATCH RECAP',
  recap: 'TOURNAMENT RECAP',
  thank_you: 'THANK YOU',
  sponsor_thanks: 'THANK YOU TO OUR SPONSORS',
  match_result: 'MATCH RESULT',
  daily_results: 'DAILY RESULTS',
  standings: 'STANDINGS',
  leaderboard: 'LEADERBOARD',
  bracket_reveal: 'BRACKET REVEAL',
  team_reveal: 'TEAM REVEAL',
  player_reveal: 'PLAYER REVEAL',
  roster_reveal: 'ROSTER REVEAL',
  prize_pool_reveal: 'PRIZE POOL REVEAL',
  winner_reveal: 'WINNER REVEAL',
  player_spotlight: 'PLAYER SPOTLIGHT',
  matchup: 'MATCHUP',
  top5_players: 'TOP 5 PLAYERS',
  top5_teams: 'TOP 5 TEAMS',
  champion: 'CHAMPIONS',
  runner_up: 'RUNNER UP',
  third_place: 'THIRD PLACE',
  winner: 'WINNER',
  match_winner: 'MATCH WINNER',
  series_winner: 'SERIES WINNER',
  mvp: 'MVP',
  potm: 'PLAYER OF THE MATCH',
  top_fragger: 'TOP FRAGGER',
  kill_leader: 'KILL LEADER',
  damage_leader: 'DAMAGE LEADER',
  most_kills: 'MOST KILLS',
  most_eliminations: 'MOST ELIMINATIONS',
  highest_damage: 'HIGHEST DAMAGE',
  top_placement: 'TOP PLACEMENT',
  biggest_gain: 'BIGGEST POINT GAIN',
  top_team: 'TOP TEAM',
  booyah: 'BOOYAH!',
  chicken_dinner: 'WINNER WINNER CHICKEN DINNER',
  best_support: 'BEST SUPPORT',
  best_tank: 'BEST TANK',
  best_jungler: 'BEST JUNGLER',
};

/** The words a preset draws, with its number where it has one (MATCH 1). */
export function presetWords(key, number) {
  const words = PRESET_WORDS[key] ?? '';
  return words.replace('#', String(number || '1').trim() || '1');
}

/** What a design draws: the words typed over the preset, else the preset's. */
const headlineOf = (p) => String(p.headline || '').trim() || presetWords(p.preset, p.number);

const choicesOf = (keys) => keys.map((k) => [k, [`overlay.preset.${k}`, k === 'custom'
  ? 'Your own words' : PRESET_WORDS[k].replace('#', '1')]]);

export const TITLE_PRESETS = [
  'tournament', 'match', 'round', 'day', 'stage', 'game', 'phase',
  'group_stage', 'knockout', 'playoffs', 'round_of_32', 'round_of_16', 'quarter_final', 'semi_final',
  'grand_final', 'upper_bracket', 'lower_bracket', 'matchday', 'upcoming', 'current', 'previous_result',
  'match_start', 'loading', 'live_now', 'registration_open', 'registration_closing', 'registration_closed',
  'completed', 'announcement', 'break', 'ad_break', 'sponsor', 'half_time', 'full_time', 'extra_time',
  'penalties', 'goal', 'match_point', 'final_circle', 'last_team', 'clutch', 'upset', 'qualified',
  'eliminated', 'prize_pool', 'schedule', 'rules', 'event_date', 'venue', 'thank_you', 'custom',
];

export const AWARD_PRESETS = [
  'champion', 'runner_up', 'third_place', 'winner', 'match_winner', 'series_winner', 'mvp', 'potm',
  'top_fragger', 'kill_leader', 'damage_leader', 'most_kills', 'most_eliminations', 'highest_damage',
  'top_placement', 'biggest_gain', 'top_team', 'booyah', 'chicken_dinner', 'best_support', 'best_tank',
  'best_jungler', 'player_spotlight', 'custom',
];

export const SOCIAL_PRESETS = [
  'announcement', 'registration_open', 'registration_closing', 'prize_pool', 'event_date', 'schedule',
  'matchday', 'upcoming', 'live_now', 'match_result', 'daily_results', 'standings', 'leaderboard',
  'bracket_reveal', 'team_reveal', 'player_reveal', 'roster_reveal', 'prize_pool_reveal', 'matchup',
  'mvp', 'potm', 'top5_players', 'top5_teams', 'highlights', 'best_moments', 'clutch', 'upset',
  'qualified', 'eliminated', 'quarter_final', 'semi_final', 'grand_final', 'winner', 'winner_reveal',
  'runner_up', 'player_spotlight', 'match_recap', 'recap', 'thank_you', 'sponsor_thanks', 'custom',
];

/** The PDF's section 10 sizes, by where the post goes. */
export const SOCIAL_FORMATS = {
  feed: { w: 1080, h: 1350, label: ['overlay.format.feed', 'Instagram feed, 1080 x 1350'] },
  story: { w: 1080, h: 1920, label: ['overlay.format.story', 'Story, 1080 x 1920'] },
  x: { w: 1600, h: 900, label: ['overlay.format.x', 'X, 1600 x 900'] },
  thumbnail: { w: 1280, h: 720, label: ['overlay.format.thumbnail', 'YouTube thumbnail, 1280 x 720'] },
  wide: { w: 1920, h: 1080, label: ['overlay.format.wide', 'YouTube or Discord, 1920 x 1080'] },
};

// --------------------------------------------------------------- helpers

const text = (key, def, label) => ({ key, type: 'text', default: def, label });
const still = (p, t) => (p.animated === false ? 1e9 : t);
const inkOf = (p) => colour(p.text_colour, '#FFFFFF');
const faces = (r) => ({ big: r.fonts.font || r.family, small: r.fonts.font2 || r.family });

/** A filled slot for a picture: a darker step of the plate, no outline. */
function slot(ctx, x, y, w, h, radius = 28) {
  ctx.fillStyle = 'rgba(0,0,0,0.24)';
  roundRect(ctx, x, y, w, h, radius);
  ctx.fill();
}

const CORNERS = [
  ['top_right', ['overlay.where.topRight', 'Top right']], ['top_left', ['overlay.where.topLeft', 'Top left']],
  ['bottom_right', ['overlay.where.right', 'Bottom right']], ['bottom_left', ['overlay.where.left', 'Bottom left']],
];

/** The box of a corner piece `w` x `h`, 48px in from the edges. */
function cornerBox(where, w, h) {
  const right = String(where || 'top_right').endsWith('right');
  const bottom = String(where || '').startsWith('bottom');
  return { x: right ? W - 48 - w : 48, y: bottom ? H - 48 - h : 48, w, h, right };
}

/** The panel colours of the see-through pieces. */
const panelFields = () => [
  { key: 'bg_from', type: 'colour', role: 'secondary', default: '#720202', label: ['overlay.f.barFrom', 'Bar, dark end'] },
  { key: 'bg_to', type: 'colour', role: 'primary', default: '#EE1510', label: ['overlay.f.barTo', 'Bar, bright end'] },
  { key: 'text_colour', type: 'colour', role: 'text', default: '#FFFFFF', label: ['overlay.f.textColour', 'Words'] },
  { key: 'font', type: 'font', role: 'font_primary', default: 'pixel', label: ['overlay.f.fontHeadline', 'Typeface, headline'] },
  { key: 'font2', type: 'font', role: 'font_secondary', default: 'pixel', label: ['overlay.f.fontSmall', 'Typeface, smaller words'] },
  { key: 'animated', type: 'toggle', default: true, label: ['overlay.f.animated', 'Animated (off: a still picture)'] },
];

function panel(ctx, p, x, y, w, h, radius = 18) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, colour(p.bg_from, '#720202'));
  g.addColorStop(1, colour(p.bg_to, '#EE1510'));
  ctx.fillStyle = g;
  roundRect(ctx, x, y, w, h, radius);
  ctx.fill();
}

// ------------------------------------------------------------ title card

export const titleCard = {
  kind: 'title_card',
  durationMs: 1700,
  pictures: ['logo', 'partner_logo'],
  fields: [
    { key: 'preset', type: 'choice', default: 'grand_final', label: ['overlay.f.preset', 'What it says'], choices: choicesOf(TITLE_PRESETS) },
    text('number', '1', ['overlay.f.number', 'Number, for MATCH 1 or DAY 2']),
    text('headline', '', ['overlay.f.headline', 'Your own words (over the preset)']),
    text('subtitle', 'V-ENT CUP', ['overlay.f.subtitle', 'Line above']),
    text('detail', '', ['overlay.f.detail', 'Line below, a date or a time']),
    ...plateFields(),
  ],
  draw(ctx, t, p, r) {
    const T = still(p, t);
    const ink = inkOf(p);
    const f = faces(r);
    drawPlate(ctx, T, p);
    const sub = String(p.subtitle || '').trim();
    const detail = String(p.detail || '').trim();
    const mid = 540 - (detail ? 40 : 0) + (sub ? 30 : 0);
    if (sub) drawLine(ctx, sub, { family: f.small, face: p.font2, cap: 54, maxW: 1400, x: W / 2, top: mid - 190, align: 'center', e: ease.out(step(T, 100, 450)), ink });
    // The headline arrives from below, the PSD's big-word entrance.
    drawLine(ctx, headlineOf(p), { family: f.big, face: p.font, cap: 170, maxW: 1700, x: W / 2, top: mid - 85, align: 'center', e: ease.out(step(T, 300, 550)), rise: 80, ink });
    if (detail) drawLine(ctx, detail, { family: f.small, face: p.font2, cap: 48, maxW: 1300, x: W / 2, top: mid + 150, align: 'center', e: ease.out(step(T, 650, 450)), ink });
    drawCornerLogos(ctx, T, r, 900);
  },
};

// ----------------------------------------------------------- versus card

export const versusCard = {
  kind: 'versus_card',
  durationMs: 2000,
  pictures: ['logo', 'partner_logo', 'left_logo', 'right_logo'],
  fields: [
    text('left_name', 'TEAM ONE', ['overlay.f.leftName', 'Left side, name']),
    { key: 'left_logo', type: 'picture', default: 'none', label: ['overlay.f.leftLogo', 'Left side, logo or photo'] },
    text('right_name', 'TEAM TWO', ['overlay.f.rightName', 'Right side, name']),
    { key: 'right_logo', type: 'picture', default: 'none', label: ['overlay.f.rightLogo', 'Right side, logo or photo'] },
    text('left_score', '', ['overlay.f.leftScore', 'Left score (empty: VS)']),
    text('right_score', '', ['overlay.f.rightScore', 'Right score (empty: VS)']),
    text('top_line', 'GRAND FINAL', ['overlay.f.topLine', 'Line above']),
    text('bottom_line', 'MATCH 1', ['overlay.f.bottomLine', 'Line below']),
    ...plateFields(),
  ],
  draw(ctx, t, p, r) {
    const T = still(p, t);
    const ink = inkOf(p);
    const f = faces(r);
    drawPlate(ctx, T, p);
    drawLine(ctx, p.top_line, { family: f.small, face: p.font2, cap: 50, maxW: 1200, x: W / 2, top: 150, align: 'center', e: ease.out(step(T, 100, 450)), ink });
    // Each side slides in from its own edge.
    [['left', 170, -1], ['right', 1150, 1]].forEach(([side, x, dir], i) => {
      const e = ease.out(step(T, 250 + i * 120, 600));
      ctx.save();
      ctx.translate(dir * 260 * (1 - e), 0);
      const logo = r.images[`${side}_logo`];
      if (logo) {
        ctx.globalAlpha = Math.min(1, e);
        slot(ctx, x, 290, 600, 460, 32);
        ctx.globalAlpha = 1;
        drawPicture(ctx, logo, x + 40, 320, 520, 400, 'center');
        drawLine(ctx, p[`${side}_name`], { family: f.small, face: p.font2, cap: 56, maxW: 600, x: x + 300, top: 790, align: 'center', e, rise: 0, ink });
      } else {
        // No logo: the name is the side, drawn large where the logo would be.
        // An empty slot reads as a picture that failed to load.
        drawLine(ctx, p[`${side}_name`], { family: f.big, face: p.font, cap: 110, maxW: 600, x: x + 300, top: 465, align: 'center', e, rise: 0, ink });
      }
      ctx.restore();
    });
    const scored = String(p.left_score ?? '').trim() !== '' && String(p.right_score ?? '').trim() !== '';
    const middle = scored ? `${String(p.left_score).trim()} - ${String(p.right_score).trim()}` : 'VS';
    drawLine(ctx, middle, { family: f.big, face: p.font, cap: scored ? 110 : 140, maxW: 330, x: W / 2, top: scored ? 465 : 450, align: 'center', e: ease.back(step(T, 700, 500)), rise: 0, ink });
    drawLine(ctx, p.bottom_line, { family: f.small, face: p.font2, cap: 44, maxW: 1000, x: W / 2, top: 930, align: 'center', e: ease.out(step(T, 900, 450)), ink });
    drawCornerLogos(ctx, T, r, 1100);
  },
};

// ------------------------------------------------------------ award card

export const awardCard = {
  kind: 'award_card',
  durationMs: 2100,
  pictures: ['logo', 'partner_logo', 'photo'],
  fields: [
    { key: 'preset', type: 'choice', default: 'mvp', label: ['overlay.f.award', 'The award'], choices: choicesOf(AWARD_PRESETS) },
    text('headline', '', ['overlay.f.headline', 'Your own words (over the preset)']),
    text('name', 'PLAYER NAME', ['overlay.f.name', 'Name']),
    text('team', 'TEAM NAME', ['overlay.f.team', 'Team, or the line under the name']),
    text('stat', '24 KILLS', ['overlay.f.stat', 'The number, such as 24 KILLS']),
    { key: 'photo', type: 'picture', default: 'none', label: ['overlay.f.photo', 'Photo or team logo'] },
    ...plateFields(),
  ],
  draw(ctx, t, p, r) {
    const T = still(p, t);
    const ink = inkOf(p);
    const f = faces(r);
    drawPlate(ctx, T, p);
    // The picture on the left, in a filled slot. With no picture the words
    // take the frame: an empty slot reads as a photo that failed to load.
    const photo = r.images.photo;
    if (photo) {
      const e0 = ease.out(step(T, 150, 600));
      ctx.save();
      ctx.translate(-200 * (1 - e0), 0);
      ctx.globalAlpha = Math.min(1, e0);
      slot(ctx, 120, 190, 700, 760, 36);
      ctx.globalAlpha = 1;
      drawPicture(ctx, photo, 150, 220, 640, 700, 'center');
      ctx.restore();
    }
    const x = photo ? 900 : 200;
    const maxW = photo ? 920 : 1520;
    drawLine(ctx, headlineOf(p), { family: f.big, face: p.font, cap: 150, maxW, x, top: 250, e: ease.out(step(T, 400, 550)), rise: 70, ink });
    drawLine(ctx, p.name, { family: f.small, face: p.font2, cap: 84, maxW, x, top: 520, e: ease.out(step(T, 700, 450)), ink });
    drawLine(ctx, p.team, { family: f.small, face: p.font2, cap: 44, maxW, x, top: 650, e: ease.out(step(T, 850, 450)), ink: rgba(colour(p.text_colour, '#FFFFFF'), 0.8) });
    const stat = String(p.stat || '').trim();
    if (stat) {
      const e = ease.back(step(T, 1050, 500));
      if (e > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, e);
        ctx.fillStyle = colour(p.text_colour, '#FFFFFF');
        roundRect(ctx, x, 770, 620, 120, 16);
        ctx.fill();
        ctx.restore();
        drawLine(ctx, stat, { family: f.small, face: p.font2, cap: 52, maxW: 560, x: x + 310, top: 804, align: 'center', e: Math.min(1, e), rise: 0, ink: colour(p.bg_to, '#EE1510') });
      }
    }
    drawCornerLogos(ctx, T, r, 1300);
  },
};

// ------------------------------------------------------------ corner bug

/** A QR code drawn in the browser from the link typed into the overlay. */
async function qrPicture(link) {
  const url = String(link || '').trim();
  if (!/^https?:\/\//i.test(url) || typeof document === 'undefined') return null;
  const QRCode = (await import('qrcode')).default;
  const data = await QRCode.toDataURL(url, { margin: 1, width: 512, color: { dark: '#141416', light: '#FFFFFF' } });
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    // A data URL decodes at once; the deadline is so a design never waits on it.
    setTimeout(() => resolve(img.complete && img.naturalWidth ? img : null), 10000);
    img.src = data;
  });
}

export const cornerBug = {
  kind: 'corner_bug',
  durationMs: 900,
  pictures: ['logo'],
  async preparePictures(p) {
    return p.show === 'qr' ? { qr: await qrPicture(p.link) } : {};
  },
  fields: [
    { key: 'show', type: 'choice', default: 'logo', label: ['overlay.f.show', 'What it shows'], choices: [
      ['logo', ['overlay.bug.logo', 'A logo (tournament or sponsor)']],
      ['social', ['overlay.bug.social', 'A social handle']],
      ['qr', ['overlay.bug.qr', 'A QR code to a link']],
    ] },
    { key: 'where', type: 'choice', default: 'top_right', label: ['overlay.f.where', 'Where it sits'], choices: CORNERS },
    { key: 'logo', type: 'picture', role: 'logo', default: 'default', label: ['overlay.f.logo', 'Main logo'] },
    text('caption', '', ['overlay.f.caption', 'Small words, such as SPONSORED BY']),
    text('handle', '@VENT', ['overlay.f.handle', 'Social handle']),
    text('link', 'https://v-ent.co', ['overlay.f.link', 'Link for the QR code']),
    { key: 'backing', type: 'toggle', default: true, label: ['overlay.f.backing', 'Coloured panel behind it'] },
    ...panelFields(),
  ],
  draw(ctx, t, p, r) {
    const T = still(p, t);
    const ink = inkOf(p);
    const f = faces(r);
    const caption = String(p.caption || '').trim();
    const show = p.show || 'logo';
    const size = show === 'qr' ? { w: 300, h: caption ? 370 : 300 } : show === 'social' ? { w: 520, h: caption ? 150 : 104 } : { w: 360, h: caption ? 180 : 130 };
    const box = cornerBox(p.where, size.w, size.h);
    const e = ease.out(step(T, 0, 450));
    ctx.save();
    ctx.globalAlpha = Math.min(1, e);
    ctx.translate(0, (String(p.where || '').startsWith('bottom') ? 30 : -30) * (1 - e));
    if (p.backing !== false || show === 'qr') panel(ctx, p, box.x, box.y, box.w, box.h, 16);
    let top = box.y + 22;
    if (caption) {
      drawLine(ctx, caption, { family: f.small, face: p.font2, cap: 20, maxW: box.w - 40, x: box.x + box.w / 2, top, align: 'center', rise: 0, ink });
      top += 46;
    }
    const rest = box.y + box.h - top - 20;
    if (show === 'qr') {
      ctx.fillStyle = '#FFFFFF';
      roundRect(ctx, box.x + 20, top, box.w - 40, box.w - 40, 10);
      ctx.fill();
      if (r.images.qr) ctx.drawImage(r.images.qr, box.x + 30, top + 10, box.w - 60, box.w - 60);
    } else if (show === 'social') {
      drawLine(ctx, p.handle, { family: f.big, face: p.font, cap: 44, maxW: box.w - 48, x: box.x + box.w / 2, top: top + (rest - 44) / 2, align: 'center', rise: 0, ink });
    } else if (r.images.logo) {
      drawLogoIn(ctx, r.images.logo, { x: box.x + 24, y: top, w: box.w - 48, h: rest }, 1, 'center');
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------- stat counter

export const statCounter = {
  kind: 'stat_counter',
  durationMs: 1000,
  pictures: [],
  fields: [
    { key: 'where', type: 'choice', default: 'top_right', label: ['overlay.f.where', 'Where it sits'], choices: CORNERS },
    text('title', 'MATCH 1', ['overlay.f.title', 'Title (can be empty)']),
    text('label1', 'ALIVE', ['overlay.f.label1', 'First row, words']),
    text('value1', '64', ['overlay.f.value1', 'First row, number']),
    text('label2', 'TEAMS LEFT', ['overlay.f.label2', 'Second row, words']),
    text('value2', '16', ['overlay.f.value2', 'Second row, number']),
    text('label3', 'KILLS', ['overlay.f.label3', 'Third row, words']),
    text('value3', '12', ['overlay.f.value3', 'Third row, number']),
    text('label4', '', ['overlay.f.label4', 'Fourth row, words']),
    text('value4', '', ['overlay.f.value4', 'Fourth row, number']),
    ...panelFields(),
  ],
  draw(ctx, t, p, r) {
    const T = still(p, t);
    const ink = inkOf(p);
    const f = faces(r);
    const rows = [1, 2, 3, 4].map((i) => [String(p[`label${i}`] || '').trim(), String(p[`value${i}`] ?? '').trim()])
      .filter(([l, v]) => l || v);
    const title = String(p.title || '').trim();
    const rowH = 92;
    const h = 24 + (title ? 62 : 0) + rows.length * rowH + 14;
    const box = cornerBox(p.where, 420, h);
    const e = ease.out(step(T, 0, 450));
    ctx.save();
    ctx.globalAlpha = Math.min(1, e);
    ctx.translate((box.right ? 1 : -1) * 120 * (1 - e), 0);
    panel(ctx, p, box.x, box.y, box.w, box.h, 16);
    let y = box.y + 24;
    if (title) {
      drawLine(ctx, title, { family: f.small, face: p.font2, cap: 26, maxW: box.w - 56, x: box.x + 28, top: y, rise: 0, ink });
      y += 62;
    }
    rows.forEach(([label, value], i) => {
      // Zebra rows, a step darker, in place of lines between them.
      if (i % 2 === 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        roundRect(ctx, box.x + 12, y - 6, box.w - 24, rowH - 8, 10);
        ctx.fill();
      }
      drawLine(ctx, label, { family: f.small, face: p.font2, cap: 24, maxW: 220, x: box.x + 28, top: y + 24, rise: 0, ink: rgba(colour(p.text_colour, '#FFFFFF'), 0.85) });
      drawLine(ctx, value, { family: f.big, face: p.font, cap: 50, maxW: 140, x: box.x + box.w - 28, top: y + 12, align: 'right', rise: 0, ink });
      y += rowH;
    });
    ctx.restore();
  },
};

// ----------------------------------------------------------- social post

const formatOf = (p) => SOCIAL_FORMATS[p.format] || SOCIAL_FORMATS.feed;

export const socialPost = {
  kind: 'social_post',
  durationMs: 1800,
  size: (p) => ({ w: formatOf(p).w, h: formatOf(p).h }),
  pictures: ['logo', 'partner_logo', 'photo'],
  fields: [
    { key: 'format', type: 'choice', default: 'feed', label: ['overlay.f.format', 'Size'],
      choices: Object.entries(SOCIAL_FORMATS).map(([k, v]) => [k, v.label]) },
    { key: 'preset', type: 'choice', default: 'announcement', label: ['overlay.f.preset', 'What it says'], choices: choicesOf(SOCIAL_PRESETS) },
    text('headline', '', ['overlay.f.headline', 'Your own words (over the preset)']),
    text('subtitle', 'V-ENT CUP', ['overlay.f.subtitle', 'Line above']),
    text('detail', '12 OCTOBER, 18:00 WAT', ['overlay.f.detail', 'Line below, a date or a time']),
    text('row1', '', ['overlay.f.row1', 'List, first line']),
    text('row2', '', ['overlay.f.row2', 'List, second line']),
    text('row3', '', ['overlay.f.row3', 'List, third line']),
    text('row4', '', ['overlay.f.row4', 'List, fourth line']),
    text('row5', '', ['overlay.f.row5', 'List, fifth line']),
    { key: 'photo', type: 'picture', default: 'none', label: ['overlay.f.photo', 'Photo or team logo'] },
    ...plateFields(),
  ],
  draw(ctx, t, p, r) {
    const T = still(p, t);
    const ink = inkOf(p);
    const f = faces(r);
    const { w: cw, h: ch } = formatOf(p);
    const wide = cw > ch;
    const pad = Math.round(Math.min(cw, ch) * 0.07);
    drawPlate(ctx, T, p);
    const eLogo = ease.back(step(T, 700, 500));
    drawLogoIn(ctx, r.images.logo, { x: cw - pad - 260, y: pad, w: 260, h: 70 }, eLogo, 'right');
    drawLogoIn(ctx, r.images.partner_logo, { x: pad, y: pad, w: 240, h: 76 }, eLogo, 'left');

    const rows = [1, 2, 3, 4, 5].map((i) => String(p[`row${i}`] || '').trim()).filter(Boolean);
    const photo = r.images.photo;
    // Wide formats put the photo on the right; tall ones put it in the middle.
    const textW = wide && photo ? cw * 0.55 : cw - pad * 2;
    const cap = Math.round(Math.min(cw, ch) * (wide ? 0.12 : 0.11));
    // With nothing under them, the words sit in the middle of the frame
    // rather than at the top of an empty one.
    const bare = !photo && !rows.length;
    let y = bare ? ch * (wide ? 0.3 : 0.36) : wide ? ch * 0.3 : ch * 0.2;
    drawLine(ctx, p.subtitle, { family: f.small, face: p.font2, cap: Math.round(cap * 0.32), maxW: textW, x: pad, top: y, e: ease.out(step(T, 100, 450)), ink });
    y += cap * 0.6;
    drawLine(ctx, headlineOf(p), { family: f.big, face: p.font, cap, maxW: textW, x: pad, top: y, e: ease.out(step(T, 250, 550)), rise: 60, ink });
    y += cap * 1.45;
    drawLine(ctx, p.detail, { family: f.small, face: p.font2, cap: Math.round(cap * 0.3), maxW: textW, x: pad, top: y, e: ease.out(step(T, 500, 450)), ink });
    y += cap * 0.8;

    if (photo) {
      const box = wide
        ? { x: cw * 0.6, y: ch * 0.2, w: cw * 0.4 - pad, h: ch * 0.68 }
        : { x: pad, y, w: cw - pad * 2, h: Math.max(0, ch - y - pad - (rows.length ? rows.length * 70 + 20 : 0)) };
      if (box.h > 120) {
        const e = ease.out(step(T, 600, 500));
        ctx.save();
        ctx.globalAlpha = Math.min(1, e);
        slot(ctx, box.x, box.y, box.w, box.h, 28);
        drawPicture(ctx, photo, box.x + 20, box.y + 20, box.w - 40, box.h - 40, 'center');
        ctx.restore();
        if (!wide) y += box.h + 20;
      }
    }
    // The list: filled rows, a step off the plate, never lines between them.
    const rowH = Math.round(Math.min(cw, ch) * 0.06);
    rows.forEach((row, i) => {
      if (y + rowH > ch - pad / 2) return;
      const e = ease.out(step(T, 800 + i * 90, 400));
      ctx.save();
      ctx.globalAlpha = Math.min(1, e);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.26)' : 'rgba(0,0,0,0.14)';
      roundRect(ctx, pad, y, textW, rowH - 8, 10);
      ctx.fill();
      ctx.restore();
      drawLine(ctx, row, { family: f.small, face: p.font2, cap: Math.round(rowH * 0.36), maxW: textW - 40, x: pad + 20, top: y + (rowH - 8 - rowH * 0.36) / 2, e, rise: 0, ink });
      y += rowH;
    });
  },
};
