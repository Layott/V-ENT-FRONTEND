'use client';

// Shared reading of the studio feed.
//
// Every broadcast graphic asks the same questions of the same payload: which
// fixture is this about, which seat, who is that player, how long until the
// break ends. They lived inside the one page file while there was one file.
// The Rivalry Series pack is thirteen separate graphics drawn to a client's
// finished artwork, so each has its own file now and this is the one place
// those questions are answered.
//
// Pure functions and one component. Nothing here draws a surface.

import { useState } from 'react';

/** Ordinal for a standings place: 1st, 2nd, 3rd. */
const place = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

/** A clock reading for a programme row. */
const clock = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// ------------------------------------------------------- the aggregate tie
//
// The Rivalry Series is a format where a fixture between two nations is TWO
// matches, one per seat, and the tie is decided on total goals across both.
// Everything below reads `data.rivalry`, which the feed sends only for a
// tournament in that format. Absent for every other tournament, so each of
// these helpers answers "nothing" rather than throwing, and each element that
// uses them draws its own empty state.


/** The aggregate branch of the feed, or null for a tournament that is not one. */
const rivalryOf = (data) => (data?.rivalry?.enabled ? data.rivalry : null);

/** A side's short label: the tag if it has one, its name otherwise. */
const tagOf = (side) => side?.tag || side?.name || '';

/** A number the feed sent, or null when it sent nothing usable.
 *
 * Deliberately not `?? 0`. A goal tally that has not been worked out yet and a
 * goal tally of zero look identical once a fallback has been applied, and one
 * of them is a claim this page cannot support.
 */
const count = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/** A yes or no an operator typed.
 *
 * The console's payload fields are text boxes, so a setting arrives as the
 * STRING "false", and `Boolean('false')` is true. Blank means the operator has
 * not decided, which is not the same as no: the contract's rule is that blank
 * means work it out from what is live, and the fallback is what does that.
 */
const optIn = (value, fallback) => {
  if (typeof value === 'boolean') return value;
  const said = String(value ?? '').trim().toLowerCase();
  if (!said) return fallback;
  return said === 'true' || said === '1' || said === 'yes' || said === 'on';
};

/** Which fixture a graphic is about.
 *
 * The operator names one, or leaves it blank and gets whatever is live, which
 * is what they want with a match in front of them and one hand on the mixer.
 *
 * A fixture id that matches nothing resolves to NOTHING, never to a different
 * fixture. Same rule as the scorebar's team names, and for the same reason: a
 * typo that silently becomes another country's result is far worse on air than
 * a card that draws its empty state.
 */
function pickFixture(riv, payload = {}, prefer = 'live') {
  const list = riv?.fixtures || [];
  if (!list.length) return null;

  const named = String(payload.fixture_id || '').trim();
  if (named) return list.find((f) => String(f.id) === named) || null;

  if (prefer === 'decided') {
    const done = list.filter((f) => f.decided || f.status === 'completed');
    if (done.length) return done[done.length - 1];
  }

  const liveId = riv?.now?.fixture_id;
  if (liveId) {
    const hit = list.find((f) => String(f.id) === String(liveId));
    if (hit) return hit;
  }
  return list.find((f) => f.status === 'in_progress')
    || list.find((f) => f.status === 'scheduled')
    || list[list.length - 1];
}

/** Which leg of a fixture, meaning which seat's match. */
function pickLeg(fixture, riv, payload = {}) {
  const legs = fixture?.legs || [];
  if (!legs.length) return null;

  const onThisFixture = String(riv?.now?.fixture_id || '') === String(fixture?.id || '');
  const wanted = Number(payload.seat) || (onThisFixture ? Number(riv?.now?.seat) : 0);
  if (wanted) return legs.find((l) => Number(l.seat) === wanted) || null;

  return legs.find((l) => l.status === 'in_progress')
    || [...legs].reverse().find((l) => l.status === 'completed')
    || legs[0];
}

/** One player, as these graphics need them: name, nation, record and face.
 *
 * Two places hold half the answer each. The players table carries the record a
 * league keeps for a person rather than for their side, and the entrant list
 * carries the picture. Read both, because neither is complete on its own, and
 * invent neither: a player nobody has a record for draws with no numbers under
 * their name rather than with zeroes, which read as a record of nothing.
 */
function findPlayer(name, data) {
  const wanted = String(name || '').trim().toLowerCase();
  if (!wanted) return null;

  const riv = rivalryOf(data);
  const row = (riv?.table_players || []).find(
    (p) => String(p.name || '').toLowerCase() === wanted) || null;

  let face = null;
  let side = '';
  for (const team of data?.teams || []) {
    const hit = (team.players || []).find(
      (p) => String(p.ign || '').toLowerCase() === wanted);
    if (hit) {
      face = hit.img || null;
      side = hit.represents || team.name || '';
      if (!row && hit.record) {
        return { ...hit.record, name: hit.ign, nation: side, img: face };
      }
      break;
    }
  }
  if (row) return { ...row, nation: row.nation || side, img: face };
  if (face || side) return { name, nation: side, img: face };
  // A name typed for somebody the tournament has never heard of. Still drawn,
  // because an exhibition guest is ordinary and typing their name should work.
  return { name };
}

// A clip or a picture the organiser uploaded, called on by name or by tag.
//
// CEO, 3 September: "player brolls ... uploaded to a place in the studio and
// then can be called on whenever ... then when those things are needed, can be
// triggered into a live overlay."
//
// The feed resolves which asset this is, so the page never looks anything up:
// a browser source gets one request, and a second round trip to turn a tag
// into a URL is a second chance to fail with a clip half on screen.
/** One value out of the feed, by its dotted name. The runtime's rule, in React.
 *
 * `team.name`, `tournament.title`, `asset.hero`. Used by the media graphic so
 * an organiser can put live data on top of a picture they uploaded, rather than
 * having to bake the text into the image and upload it again every time the
 * number changes.
 */
function readFeed(path, data) {
  const parts = String(path || '').trim().split('.');
  if (!parts[0]) return '';
  let root = data;
  if (parts[0] === 'tournament') { root = data.tournament; parts.shift(); }
  else if (parts[0] === 'event') { root = data.event; parts.shift(); }
  else if (parts[0] === 'team') { root = (data.teams || [])[0]; parts.shift(); }
  else if (parts[0] === 'asset') { root = data.asset; parts.shift(); }
  let value = root;
  for (const part of parts) {
    if (value === null || value === undefined) return '';
    value = value[part];
  }
  return value === null || value === undefined ? '' : String(value);
}

/** A picture that must never leave a broken glyph on air.
 *
 * Its own component because the fallback is state, and a face that fails and a
 * face that has not been uploaded have to look the same: absent. The squad
 * card learned this the hard way, with the browser's broken-image icon on a
 * graphic that was live.
 */
function Face({ src, className }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) return null;
  return (
    <img className={className} src={src} alt=""
         onError={() => setBroken(true)} />
  );
}

/** Seconds until an ISO time, or null when there is no usable one. */
function secondsUntil(iso) {
  if (!iso) return null;
  const at = new Date(iso).getTime();
  if (Number.isNaN(at)) return null;
  return Math.max(0, Math.round((at - Date.now()) / 1000));
}

/** A countdown as a clock: 4:32, and 1:04:32 once it is over an hour. */
function countdown(secs) {
  const two = (n) => String(n).padStart(2, '0');
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h ? `${h}:${two(m)}:${two(secs % 60)}` : `${m}:${two(secs % 60)}`;
}

/** A nation as the broadcast pack writes it: NG, GH, KN, SN, CIV.
 *
 * Two of these are not the ISO code. The pack uses KN for Kenya and SN for
 * Senegal, and its boards, its lower thirds and its tables all agree with each
 * other, so a graphic drawing KE beside four that draw KN would be the odd one
 * out on air rather than the correct one.
 *
 * Written here rather than in a graphic because two of them had an identical
 * copy within an hour of each other, which is how two boards start disagreeing
 * about what to call Ivory Coast.
 *
 * Anything the map has never heard of is cut to three letters rather than given
 * an invented code: a wrong code on air reads as a different country.
 */
const NATION_CODES = {
  nigeria: 'NG',
  ghana: 'GH',
  kenya: 'KN',
  senegal: 'SN',
  ivorycoast: 'CIV',
  cotedivoire: 'CIV',
};

const nationCode = (nation) => {
  const said = String(nation || '').trim();
  if (!said) return '';
  // Folded to bare letters so "Cote d'Ivoire", "Ivory Coast" and an accented
  // spelling all reach the same entry.
  const key = said.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '');
  if (NATION_CODES[key]) return NATION_CODES[key];
  return (said.length <= 3 ? said : said.slice(0, 3)).toUpperCase();
};

export {
  place, clock, rivalryOf, tagOf, count, optIn,
  pickFixture, pickLeg, findPlayer, readFeed,
  secondsUntil, countdown, Face,
  nationCode,
};
