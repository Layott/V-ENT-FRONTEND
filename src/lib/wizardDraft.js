// Which tournament the half-finished wizard on this browser belongs to.
//
// The wizard keeps its work in `localStorage.createTournamentData` so a reload
// does not lose it. That store had no idea WHICH tournament it held, and the
// two ways into the wizard share it:
//
//   /tournaments/create-tournament?draft_id=26   continue draft 26
//   /tournaments/create-tournament               start a new one
//
// Opening the first wrote draft 26 into the store. Opening the second read it
// straight back, so "start a new tournament" came up pre-filled with draft 26,
// title and all, and pressing save POSTed it as a NEW tournament, because
// `draftId` was null on that route.
//
// That is how production ended up with:
//
//   id=26  draft=False  rivalvry-series-s2
//   id=28  draft=True   rivalvry-series-s2-2
//
// One tournament, two rows, the second carrying a slug suffix because the
// title collided with its own original. Nothing warned anybody, because from
// the wizard's side both were ordinary saves.
//
// The fix is to stamp the store with the id it belongs to and refuse to hand
// it back to anybody else. A draft is only ever restored into the wizard that
// asked for that draft; a new tournament always starts empty.

export const STORAGE_KEY = 'createTournamentData';

// Kept out of the payload the wizard reads, so a stray `__draft_id` can never
// be submitted as a field.
const STAMP = '__draft_id';

// `null` for a new tournament, a string id for a draft. Normalised so that
// 26, '26' and null compare the way a reader expects.
const normalise = (id) => (id === null || id === undefined || id === '' ? null : String(id));

/**
 * Wrap the wizard's data with the tournament it belongs to.
 */
export function stampDraft(data, draftId) {
  return { ...(data || {}), [STAMP]: normalise(draftId) };
}

/**
 * The data this wizard may open with, or `{}`.
 *
 * Returns `{}` whenever the stored work belongs to a different tournament, so
 * neither route can inherit the other's form.
 */
export function draftFor(stored, draftId) {
  if (!stored || typeof stored !== 'object') return {};

  // Whether it is stamped AT ALL has to be asked before comparing, because a
  // new tournament stamps `null` and unstamped data also reads as `null`.
  // Comparing without this hands leftover data from before the stamp existed
  // straight to a new tournament, which is precisely the bug.
  const stamped = Object.prototype.hasOwnProperty.call(stored, STAMP);
  if (!stamped) return {};

  if (normalise(stored[STAMP]) !== normalise(draftId)) return {};

  const out = { ...stored };
  delete out[STAMP];
  return out;
}

/**
 * Read from a Storage-like object. Never throws: private windows and blocked
 * site data both make `localStorage` itself raise.
 */
export function readDraft(storage, draftId) {
  try {
    const raw = storage?.getItem?.(STORAGE_KEY);
    return draftFor(raw ? JSON.parse(raw) : null, draftId);
  } catch {
    return {};
  }
}

export function writeDraft(storage, data, draftId) {
  try {
    storage?.setItem?.(STORAGE_KEY, JSON.stringify(stampDraft(data, draftId)));
  } catch {
    // Nothing to do. Losing the autosave is survivable; throwing here would
    // take the keystroke that triggered it with it.
  }
}

export function clearDraft(storage) {
  try {
    storage?.removeItem?.(STORAGE_KEY);
  } catch {
    // As above.
  }
}
