// Canonical Authorization header helper for V-ENT.
//
// The backend accepts ONE auth scheme: `Authorization: Bearer <login_session_token>`.
// Historically some components fell back to a `Token <...>` prefix, which the
// backend rejects. Every authenticated request in the auth + profile surface
// must build its headers through these helpers so the scheme can never drift.

/**
 * Bearer Authorization header. Returns an empty object when no token is present
 * so it can be spread into a headers object unconditionally.
 * @param {string} [token] login_session_token from session.user.sessionToken
 */
export function authHeader(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Headers for a JSON request body (Content-Type + Bearer).
 * @param {string} [token]
 */
export function jsonHeaders(token) {
  return { 'Content-Type': 'application/json', ...authHeader(token) };
}

/**
 * Headers for a multipart/FormData request. Deliberately does NOT set
 * Content-Type - the browser sets it (with the multipart boundary) from the
 * FormData body. Only the Bearer header is added.
 * @param {string} [token]
 */
export function multipartHeaders(token) {
  return { ...authHeader(token) };
}
