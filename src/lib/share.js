'use client';

// Sharing, in one place, because it was in four and two of them did nothing.
//
// The order matters. On a phone the native sheet is what people expect, and it
// offers WhatsApp, which is how most of this audience actually shares anything.
// On a desktop the clipboard is right. When both are refused - an insecure
// context, a browser that blocks it, a permission denied - the link itself is
// shown, because "Copied!" when nothing was copied is worse than no button.

/** Absolute URL for a path on this site. */
export const absoluteUrl = (path) => {
  if (!path) return typeof window !== 'undefined' ? window.location.href : '';
  if (/^https?:\/\//i.test(path)) return path;
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://v-ent.co';
  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
};

/**
 * Share a link, and say honestly what happened.
 *
 * @param {object} options
 * @param {string} options.path   where to point, e.g. `/tournaments/naija-weekly`
 * @param {string} [options.title] what the thing is called
 * @param {string} [options.text]  a line of context for the native sheet
 * @param {(message: string) => void} [options.notify] how to tell the person
 * @returns {Promise<'shared'|'copied'|'shown'>}
 */
export async function shareLink({ path, title, text, notify }) {
  const url = absoluteUrl(path);

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch (error) {
      // Cancelling the sheet is not a failure and must not fall through to a
      // clipboard write the person did not ask for.
      if (error?.name === 'AbortError') return 'shared';
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    notify?.('Link copied');
    return 'copied';
  } catch {
    notify?.(url);
    return 'shown';
  }
}

/** Where each kind of thing lives, so links are built once and read the same. */
export const linkTo = {
  tournament: (t) => `/tournaments/${t?.slug || t?.tournament_id || t?.id || ''}`,
  event: (e) => `/events/${e?.slug || e?.event_id || e?.id || ''}`,
  team: (t) => `/teams/${t?.slug || t?.team_id || t?.id || ''}`,
  profile: (u) => `/user-profile?id=${u?.user_id || u?.id || ''}`,
};
