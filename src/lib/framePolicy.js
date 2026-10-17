/**
 * Who may frame an embed: the approved sites of its tournament or event (P8,
 * design 14c, level 2). Read by the middleware on every embed request.
 *
 * CEO, inbox 480: "we want people to be able to whitelist v-ent on their site
 * or put tournament registrations and brackets system under their own website
 * from v-ent."
 *
 * The answer lives on the API (`/sites/frame/<kind>/<ref>/`) and changes
 * rarely, so it is kept for a minute per record, in memory, for at most 500
 * records. Three things it is careful about, because a wrong answer here is a
 * frame refused on somebody's live page, or a lock that does not hold:
 *
 *   - the API down: the last answer it had is kept, however old; with none at
 *     all, anywhere, which is how every embed behaved before P8
 *   - the API slow: never waited on for more than 1.5 seconds
 *   - what it answers: only sources that can be sources reach the header
 *     ('self' and https://host or https://*.host); a lock whose every source
 *     is unreadable frames on V-ENT alone rather than anywhere
 *
 * No React, no Next: scripts/test-embed.mjs proves it with a stand-in API.
 */

const EMBED = /^\/(?:(?:fr|pt)\/)?embed\/(tournaments|events)\/([^/?#]+)/;
const SOURCE = /^(?:'self'|https:\/\/(?:\*\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+)$/;

/** {kind, ref} for an embed address, else null. */
export function embedTarget(pathname) {
  const match = EMBED.exec(pathname || '');
  if (!match) return null;
  let ref;
  try {
    ref = decodeURIComponent(match[2]);
  } catch {
    return null;
  }
  return { kind: match[1] === 'tournaments' ? 'tournament' : 'event', ref };
}

/** A signal that aborts after `ms`, in runtimes with and without AbortSignal.timeout. */
function deadline(ms) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

function cleaned(list) {
  if (!Array.isArray(list) || !list.length) return [];
  const kept = list.filter((s) => typeof s === 'string' && SOURCE.test(s));
  return kept.length ? kept : ["'self'"];
}

/**
 * A function (target) => Promise<sources>, [] meaning anywhere. `fetchImpl`,
 * `now`, `ttl`, `timeout` and `most` are there for the test.
 */
export function createFramePolicy({
  api, fetchImpl = (...args) => fetch(...args), now = () => Date.now(),
  ttl = 60000, timeout = 1500, most = 500,
} = {}) {
  const memory = new Map();
  const remember = (key, sources) => {
    memory.delete(key);
    memory.set(key, { sources, at: now() });
    while (memory.size > most) memory.delete(memory.keys().next().value);
  };

  return async function ancestorsFor(target) {
    if (!target || !api) return [];
    const key = `${target.kind}:${target.ref}`;
    const known = memory.get(key);
    if (known && now() - known.at < ttl) return known.sources;
    try {
      const res = await fetchImpl(
        `${api}/sites/frame/${target.kind}/${encodeURIComponent(target.ref)}/`,
        { signal: deadline(timeout), headers: { Accept: 'application/json' }, cache: 'no-store' },
      );
      let sources;
      if (res.status === 404) {
        sources = [];
      } else if (!res.ok) {
        throw new Error(`frame policy answered ${res.status}`);
      } else {
        const body = await res.json();
        sources = cleaned(body?.data?.ancestors);
      }
      remember(key, sources);
      return sources;
    } catch {
      return known ? known.sources : [];
    }
  };
}
