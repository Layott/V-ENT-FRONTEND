/**
 * A tournament or an event on somebody else's website: which widget, in which
 * look, and the code an organiser pastes (inbox 360, extended by P8).
 *
 * CEO, inbox 480: "we want people to be able to whitelist v-ent on their site
 * or put tournament registrations and brackets system under their own website
 * from v-ent."
 *
 * The look starts from the record's own (an event's website colours, or for a
 * tournament its event's) and a snippet may change it for one placement, the
 * way Challonge and Toornament widgets take theirs: the same bracket can sit
 * on a light page and a dark page of the same site. Only the values that
 * differ from the record travel in the address, so a colour the organiser
 * changes later still reaches every snippet that did not override it.
 *
 * Pure, no React, so scripts/test-embed.mjs can import it.
 */

/** Every tournament widget. `card` is the inbox 360 frame, at the bare address. */
export const WIDGETS = ['card', 'bracket', 'standings', 'schedule'];

/**
 * The widgets drawn in the frame's own colours. The bracket and the standings
 * are the tournament page's own components, which are drawn light on dark;
 * they take the accent and the font, not a light page.
 */
export const THEMED_WIDGETS = ['card', 'schedule'];

export const THEMES = ['dark', 'light'];
export const FONTS = ['clash', 'system'];

const HEX = /^#[0-9a-f]{6}$/i;

/** One value out of an object, URLSearchParams, or Next's searchParams. */
function valueOf(params, key) {
  if (!params) return undefined;
  const raw = typeof params.get === 'function' ? params.get(key) : params[key];
  return Array.isArray(raw) ? raw[0] : raw;
}

/** The base look, every value checked. */
function baseLook(base = {}) {
  return {
    theme: THEMES.includes(base?.theme) ? base.theme : 'dark',
    accent: HEX.test(base?.accent || '') ? base.accent.toLowerCase() : '',
    font: FONTS.includes(base?.font) ? base.font : 'clash',
  };
}

/**
 * The look a frame is drawn in: `params` over `base`, anything unreadable
 * ignored. A value that is not on the list never reaches a style.
 */
export function readLook(params, base = {}) {
  const b = baseLook(base);
  const theme = valueOf(params, 'theme');
  const accent = valueOf(params, 'accent');
  const font = valueOf(params, 'font');
  return {
    theme: THEMES.includes(theme) ? theme : b.theme,
    accent: HEX.test(accent || '') ? accent.toLowerCase() : b.accent,
    font: FONTS.includes(font) ? font : b.font,
  };
}

/** The query that turns `base` into `look`: only what differs, in a fixed order. */
export function lookQuery(look, base = {}) {
  const b = baseLook(base);
  const l = readLook(look, b);
  const query = new URLSearchParams();
  if (l.theme !== b.theme) query.set('theme', l.theme);
  if (l.accent && l.accent !== b.accent) query.set('accent', l.accent);
  if (l.font !== b.font) query.set('font', l.font);
  return query.toString();
}

/**
 * The part of a frame's address worth keeping when the frame moves (a renamed
 * tournament): its look, and `vent_frame`, the name embed.js sizes it by.
 * Nothing else is carried, so a moved frame never repeats an address it was
 * handed.
 */
export function carryQuery(params) {
  const out = new URLSearchParams();
  for (const key of ['theme', 'accent', 'font', 'vent_frame']) {
    const value = valueOf(params, key);
    if (typeof value === 'string' && value && value.length <= 40) out.set(key, value);
  }
  const text = out.toString();
  return text ? `?${text}` : '';
}

/** Where a tournament widget lives. Anything not a widget is the card. */
export function widgetPath(slug, widget) {
  const root = `/embed/tournaments/${encodeURIComponent(slug)}`;
  return WIDGETS.includes(widget) && widget !== 'card' ? `${root}/${widget}` : root;
}

/** Where a frame sends somebody to buy: the event page's own checkout. */
export const checkoutPath = (slug, tierId) =>
  `/events/${encodeURIComponent(slug)}?tab=tickets${tierId ? `&tier=${encodeURIComponent(tierId)}` : ''}`;

const attr = (value) => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;');

/**
 * The code an organiser pastes. `kind` is 'event' or 'tournament'; `origin`
 * is where V-ENT is served, so a snippet copied from a local build points at
 * that build and one copied from v-ent.co points at v-ent.co. `labels.button`
 * is the button's words, already translated by the caller, because the
 * organiser pastes it onto a page in their own language.
 *
 * `options.widget` picks a tournament widget; `options.look` and
 * `options.base` give the look and the record's own, and only the difference
 * is written into the snippet.
 */
export function embedSnippets(kind, slug, origin, labels = {}, options = {}) {
  const { widget = 'card', look = null, base = {} } = options;
  const site = (origin || '').replace(/\/$/, '');
  const tournament = kind === 'tournament';
  const path = tournament ? widgetPath(slug, widget) : `/embed/events/${encodeURIComponent(slug)}`;
  const query = look ? lookQuery(look, base) : '';
  const frame = `${site}${path}${query ? `?${query}` : ''}`;
  // A bracket, a table or a schedule needs the width of the page it is on;
  // the card is a card.
  const wide = tournament && WIDGETS.includes(widget) && widget !== 'card';
  const data = [`data-vent-${kind}="${slug}"`];
  if (wide) data.push(`data-vent-widget="${widget}"`);
  for (const [key, value] of new URLSearchParams(query)) data.push(`data-vent-${key}="${attr(value)}"`);
  return {
    frameUrl: frame,
    script: `<div ${data.join(' ')}></div>\n<script src="${site}/embed.js" async></script>`,
    iframe: `<iframe src="${attr(frame)}" title="V-ENT" width="100%" height="${wide ? 720 : 560}" style="border:0${wide ? '' : ';max-width:640px'}" loading="lazy"></iframe>`,
    button: tournament
      ? `<a href="${site}/tournaments/${encodeURIComponent(slug)}" target="_blank" rel="noopener">${labels.button || ''}</a>`
      : `<a href="${site}${checkoutPath(slug)}" target="_blank" rel="noopener">${labels.button || ''}</a>`,
  };
}
