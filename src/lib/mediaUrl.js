// One place that turns whatever the API said into a URL a browser can load.
//
// This existed sixteen times, privately, inside sixteen components, and the
// copies did not agree. One appended the path straight onto the API base, so a
// value with no leading slash produced `https://apiteams_logos/x.png`. Another
// inserted the missing slash. Several render sites used no helper at all and
// passed the raw field to <Image src>, which works only if that particular
// endpoint happened to return an absolute URL.
//
// It does not, everywhere. `vent_team` and `vent_event` build absolute URLs;
// `vent_auth` (users, organisations, clubs, posts) and the vendor endpoints
// return Django's relative `/media/...`. So the same team crest rendered on the
// teams list and broke on the home page, which is what was reported.
//
// Being liberal here is deliberate. The frontend cannot know which serializer
// produced a value, and it should not have to: an absolute URL passes through,
// a data or blob URL passes through, a relative path is resolved against the
// API host, and anything empty comes back null so the caller can draw its own
// fallback rather than render a broken image.

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

/** A loadable URL, or null when there is nothing to load. */
export const mediaUrl = (value) => {
  if (!value) return null;

  // Anything that is not a string is already something next/image understands
  // and this function must not touch: a static import arrives as an object
  // carrying { src, width, height }, and an upload preview can be a File or a
  // Blob. Returning null for those would blank out every bundled logo on the
  // site, which is the opposite of the bug being fixed.
  if (typeof value !== 'string') return value;

  const path = value.trim();
  if (!path) return null;

  // Already loadable: an absolute URL, an inline image, an object URL from a
  // file the person just chose, or a file already served from this origin.
  if (/^(https?:)?\/\//i.test(path)) return path;
  if (/^(data:|blob:)/i.test(path)) return path;

  // A bundled asset - next/image static imports arrive as objects, not
  // strings, so anything starting /_next or /images is our own public file.
  if (path.startsWith('/_next/') || path.startsWith('/images/')) return path;

  if (!API_BASE) return path;
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
};

/** The first of several field names that actually holds something.
 *
 *  Serializers here publish the same image under several aliases - a team logo
 *  arrives as `logo`, `logo_url`, `team_logo` and `image` - and different
 *  endpoints publish different subsets. Reading one name is how a logo goes
 *  missing on one screen and not another.
 */
export const pickMedia = (record, ...names) => {
  if (!record) return null;
  for (const name of names) {
    const found = mediaUrl(record[name]);
    if (found) return found;
  }
  return null;
};

/** A media value that may arrive as a bare filename, resolved inside `folder`.
 *
 *  Seventeen components carried their own version of this, and most of them
 *  wrote `${API_BASE}${path}` with no separator, which is the missing-slash bug
 *  mediaUrl exists to fix - it produced `https://apiteams_logos/x.png` whenever
 *  a serializer returned a path without a leading slash.
 *
 *  The bare-filename branch is kept because some older rows really do store
 *  just `banner.png`, and those files live in a known folder. A value that
 *  already looks like a path or a URL is left for mediaUrl to resolve.
 */
export const mediaIn = (value, folder) => {
  if (typeof value !== 'string') return mediaUrl(value);
  const path = value.trim();
  if (!path) return null;
  const looksResolved = path.startsWith('/')
    || /^(https?:)?\/\//i.test(path)
    || /^(data:|blob:)/i.test(path);
  return looksResolved ? mediaUrl(path) : mediaUrl(`${folder.replace(/\/$/, '')}/${path}`);
};

/** The grey box shown while there is no image to show.
 *
 *  This was pasted into eight components as a literal data URI, seven of them
 *  filling `#f3f4f6` - a near-white rectangle on a dark page, which reads as a
 *  broken image rather than a placeholder. AllEvents had already been corrected
 *  to the surface colour; the rest had not, so the same list showed light boxes
 *  on one tab and dark on another.
 */
export const imagePlaceholder = (label, width = 300, height = 180) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`
    + `<rect width="100%" height="100%" fill="#212225"/>`
    + `<text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#797B86"`
    + ` font-family="sans-serif" font-size="16">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

/** The crest for a team, whichever alias this endpoint used. */
export const teamLogo = (team) => pickMedia(team, 'logo', 'logo_url', 'team_logo', 'image');

/** The wide image behind a team, an event or an organisation. */
export const bannerOf = (record) =>
  pickMedia(record, 'banner', 'banner_image', 'banner_url', 'cover', 'cover_image',
            'tournament_banner', 'event_banner', 'team_banner');

/** Somebody's picture, under any of the names the API uses for it. */
export const avatarOf = (user) =>
  pickMedia(user, 'avatar', 'avatar_url', 'profile_picture', 'profile_pic', 'image');

export default mediaUrl;
