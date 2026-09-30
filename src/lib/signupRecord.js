// What signup leaves behind for the "resend the link" buttons: the email and
// the username, nothing else. Until 30 September 2026 the whole signup form
// was written to localStorage, password included, where any script on the
// page could read it for as long as the browser kept it (owner rule R66).
//
// readSignupRecord() also scrubs a record written by the old code.

const KEY = 'signupData';

export function rememberSignup({ email, username }) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ email, username }));
  } catch {
    // Private mode or storage full: the resend button asks them to sign up again.
  }
}

export function readSignupRecord() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const record = JSON.parse(raw);
    if (!record || typeof record !== 'object') return null;
    if ('password' in record) {
      const clean = { email: record.email, username: record.username };
      localStorage.setItem(KEY, JSON.stringify(clean));
      return clean;
    }
    return record;
  } catch {
    return null;
  }
}
