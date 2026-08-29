// Remembering which influencer link somebody arrived through.
//
// CEO, 29 August 2026: "apart from the code for influencers, having an option
// for links also that can be tracked, is good."
//
// The link is `/events/<slug>?ref=CODE`. Two things have to happen and they are
// minutes apart: the arrival is counted when the page opens, and the sale is
// credited when they eventually reach checkout, having read the page, picked a
// tier, typed their details and possibly gone away to a card form and come
// back. So the code cannot live in a variable on one screen; it is held here.
//
// Held per event, deliberately. Somebody who arrives at one event through a
// streamer's link and later buys a ticket to a different event has not been
// sent to that second event by anybody, and crediting the streamer for it
// would make every organiser's numbers a little bit fictional.
//
// It expires. A code that lasted forever would credit an influencer for a sale
// six months later that they had nothing to do with, and thirty days is longer
// than the gap between reading about an event and buying a ticket to it.

const KEY = 'vent.ref';
const DAYS = 30;

function read() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    // A private window, cleared site data, or storage refused outright. An
    // attribution is worth nothing next to the page rendering, so this never
    // throws upward.
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

function fresh(entry) {
  if (!entry || !entry.at) return false;
  return Date.now() - entry.at < DAYS * 24 * 60 * 60 * 1000;
}

/** The code this browser arrived at this event through, or ''. */
export function refFor(eventRef) {
  if (typeof window === 'undefined' || !eventRef) return '';
  const entry = read()[String(eventRef)];
  return fresh(entry) ? entry.code : '';
}

/**
 * Called when an event page opens. Reads `?ref=` off the address, remembers it
 * against this event, and tells the server one person arrived.
 *
 * `first_time` is whether this browser had not been sent to this event by this
 * link before. The browser is the only party that knows, and it is the only
 * party that needs to: nothing about the person is stored server side to work
 * it out.
 */
export function recordArrival(eventRef, apiBase) {
  if (typeof window === 'undefined' || !eventRef) return '';

  let code = '';
  try {
    code = new URLSearchParams(window.location.search).get('ref') || '';
  } catch {
    return '';
  }
  code = code.trim().slice(0, 40);
  if (!code) return refFor(eventRef);

  const all = read();
  const key = String(eventRef);
  const seen = all[key];
  const firstTime = !(fresh(seen) && seen.code === code);

  all[key] = { code, at: Date.now() };
  write(all);

  // Fire and forget. A failed count must never be visible to the person
  // reading the page, and there is nothing useful to do about it.
  try {
    fetch(`${apiBase}/event/${encodeURIComponent(eventRef)}/ref/${encodeURIComponent(code)}/visit/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_time: firstTime }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* see above */
  }

  return code;
}
