// Where to go after signing in, when somebody arrived wanting a particular page.
//
// Only a path on this site: `/invitations/ri_...`, never `//evil.example` or a
// full address, so a link that sends somebody to sign in cannot send them on to
// another site afterwards (owner rule R85). The login page used to follow any
// `?next=` it was given.
//
// Signing up is several pages (sign up, verify the email, sign in), and the
// `next` an invitation link carries would not survive them in the address, so
// the signup page also keeps it on this device until the first sign in
// (inbox 455: "they can create an account using the link in their mail and
// still accept the invite").

const KEY = 'vent:after-sign-in';

export function safeNext(value, fallback = null) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text.startsWith('/') || text.startsWith('//') || text.startsWith('/\\')) return fallback;
  return text;
}

/** Keep a path to come back to after signing in, on this device. */
export function rememberNext(value) {
  const path = safeNext(value);
  if (!path) return;
  try { window.localStorage.setItem(KEY, path); } catch { /* storage refused */ }
}

/** The path kept by rememberNext, once, or null. */
export function takeNext() {
  try {
    const path = safeNext(window.localStorage.getItem(KEY));
    window.localStorage.removeItem(KEY);
    return path;
  } catch {
    return null;
  }
}
