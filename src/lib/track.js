// Counting what nearly happened, so an organiser can see where they lose people.
//
// CEO, 7 September 2026: "organizers hsould be able o see mad metric for thier
// events and tickets, how many clicks, how many people opened it up, how many
// tapped buy, how many check out vendor, stuff like that, very detailed stuff."
//
// The tickets table already says what was SOLD. It cannot say that two hundred
// people opened the page and forty tapped Buy, and the gap between any two of
// those is the only thing that says WHERE the event is losing people. Nine
// tickets from forty taps is a checkout problem; nine from eleven opens is a
// marketing problem, and the tickets table reads identically in both cases.
//
// Built on the same shape as referral.js next door, deliberately: fire and
// forget, per event, held in localStorage, and nothing about the person is sent
// anywhere. `first_time` is this browser saying it had not done this step on
// this event before, which the browser knows and the server does not need to.
//
// ## The revisit window, which is not an optimisation
//
// Landing on `/events/x` with a language set redirects to `/fr/events/x`, which
// is a second page load and would be a second count: one human visit reported
// as two, for every francophone and lusophone arrival. React also double-runs
// effects in development. So anything fired FROM AN EFFECT carries a short
// window per event and step, long enough to swallow a redirect, a refresh or a
// back button, short enough that somebody genuinely returning in the evening is
// counted again.
//
// A deliberate tap does not get one. Somebody who taps Buy twice really did tap
// twice, and `people` still counts them once.

const KEY = 'vent.funnel';
const EFFECT_WINDOW_MS = 30 * 60 * 1000;

function read() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    // A private window, cleared site data, or storage refused outright. A
    // count is worth nothing next to the page rendering, so this never throws
    // upward.
    return {};
  }
}

function write(all) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* see read() */
  }
}

/**
 * Tell the server one person did one thing on one event.
 *
 * @param {string} eventRef  the event slug, or its id for a link shared before
 *                           a rename
 * @param {string} step      page_open | ticket_open | buy_tap | checkout_start
 *                           | vendor_open | vendor_stall | share | directions
 * @param {object} options
 *        api        the API base. Defaults to NEXT_PUBLIC_API_URL
 *        ref        the sub-thing, today only the stall slug on vendor_stall
 *        fromEffect true when this fires on render rather than on a tap, which
 *                   turns on the revisit window described above
 */
export function track(eventRef, step, options = {}) {
  if (typeof window === 'undefined' || !eventRef || !step) return;

  const api = options.api || process.env.NEXT_PUBLIC_API_URL;
  if (!api) return;

  const ref = String(options.ref || '').slice(0, 80);
  const key = `${eventRef}|${step}${ref ? `|${ref}` : ''}`;

  const all = read();
  const seen = all[key];
  const firstTime = !seen;

  if (options.fromEffect && seen && typeof seen.hit === 'number'
      && Date.now() - seen.hit < EFFECT_WINDOW_MS) {
    return;
  }

  all[key] = { hit: Date.now() };
  write(all);

  try {
    fetch(`${api}/event/${encodeURIComponent(eventRef)}/track/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step, first_time: firstTime, ref }),
      // The page may be navigating away as this fires, which is precisely the
      // case for a tap that opens something else.
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Fire and forget. A failed count must never be visible to the person
    // reading the page, and there is nothing useful to do about it.
  }
}

export default track;
