/**
 * Forgiving search: the closest matches, not only exact ones (inbox 383).
 *
 * CEO, 30 September 2026: "I need the search option across the entire site to
 * be very very flexible. Any search bar must work the same way that you don't
 * have to type what you're searching for correctly or fully."
 *
 * The same algorithm as vent_auth/fuzzy.py on the backend, for the filters
 * that run in the browser. Both are tested against fuzzy.fixtures.json (a copy
 * in each repo; check-all fails when they differ), so a name found on one
 * screen is found on every screen. Strongest first: exact, the start of the
 * name, the start of any word, anywhere inside, ignoring spaces, every word
 * with a typo allowed, a typo or two, the letters in order. Case and accents
 * never matter.
 */

export const MIN_SCORE = 0.55;

export function normalise(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^0-9a-z]+/g, ' ')
    .trim();
}

/** Edits (insert, delete, change, swap two neighbours) from a to b, or cap + 1 once past cap. */
function distance(a, b, cap) {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  let prev2 = null;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    const cur = [i];
    let low = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        cur[j] = Math.min(cur[j], prev2[j - 2] + 1);
      }
      low = Math.min(low, cur[j]);
    }
    if (low > cap) return cap + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[b.length];
}

/** Typos forgiven for a query word of this length. */
const allowed = (word) => (word.length < 4 ? 0 : word.length <= 6 ? 1 : 2);

function wordFits(qw, tw) {
  const cap = allowed(qw);
  if (tw.startsWith(qw)) return 0;
  let best = distance(qw, tw, cap);
  if (tw.length > qw.length) {
    best = Math.min(best, distance(qw, tw.slice(0, qw.length), cap),
      distance(qw, tw.slice(0, qw.length + 1), cap));
  }
  return best <= cap ? best : null;
}

function inOrder(q, t) {
  let at = 0;
  for (const c of q) {
    at = t.indexOf(c, at);
    if (at === -1) return false;
    at += 1;
  }
  return true;
}

/** 0 (no match) to 1 (exact), for one query against one piece of text. */
export function score(query, text) {
  const q = normalise(query);
  const t = normalise(text);
  if (!q || !t) return 0;
  if (t === q) return 1;
  if (t.startsWith(q)) return 0.95;
  const words = t.split(' ');
  if (words.some((w) => w.startsWith(q))) return 0.9;
  if (t.includes(q)) return 0.85;
  const qFlat = q.replace(/ /g, '');
  const tFlat = t.replace(/ /g, '');
  if (qFlat.length >= 3 && tFlat.includes(qFlat)) return 0.8;
  const qWords = q.split(' ');
  let fits = [];
  for (const qw of qWords) {
    const edits = words.map((tw) => wordFits(qw, tw)).filter((e) => e !== null);
    if (!edits.length) { fits = null; break; }
    fits.push(Math.min(...edits));
  }
  if (fits) {
    // Each typo costs a little, and so does each word the text has beyond
    // the query's, so "walk organser" puts walk_organiser first.
    const extra = Math.max(0, words.length - qWords.length);
    const typos = fits.reduce((a, b) => a + b, 0);
    return Math.max(MIN_SCORE, 0.75 - 0.05 * typos - 0.01 * Math.min(extra, 5));
  }
  if (qFlat.length >= 3 && qFlat[0] === tFlat[0] && inOrder(qFlat, tFlat)) return 0.6;
  return 0;
}

export const bestScore = (query, texts) =>
  texts.reduce((best, t) => (t ? Math.max(best, score(query, t)) : best), 0);

const valueAt = (item, path) => path.split('.').reduce((v, key) => (v == null ? v : v[key]), item);

/**
 * Items ranked by how well any of `fields` matches `query`, best first.
 * `fields` are property paths ('owner.username'), or functions of the item.
 * An empty query returns the list untouched; ties keep the list's own order.
 */
export function fuzzyFilter(items, query, fields, { minScore = MIN_SCORE, limit } = {}) {
  const q = (query || '').trim();
  const list = Array.isArray(items) ? items : [];
  if (!q) return list;
  const ranked = [];
  list.forEach((item, position) => {
    const texts = fields.map((f) => (typeof f === 'function' ? f(item) : valueAt(item, f)));
    const s = bestScore(q, texts);
    if (s >= minScore) ranked.push([s, position, item]);
  });
  ranked.sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  const out = ranked.map((row) => row[2]);
  return limit ? out.slice(0, limit) : out;
}

/**
 * Whether one piece of text matches at all, for a filter that keeps its own
 * order. An empty query matches everything, as `includes('')` did, so a
 * cleared search box shows the whole list again.
 */
export const fuzzyMatches = (query, text) => !normalise(query) || score(query, text) >= MIN_SCORE;

export default fuzzyFilter;
