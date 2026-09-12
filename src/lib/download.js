'use client';

// Downloading a file from an endpoint that wants the session token.
//
// This exists because two organiser screens were quietly broken. Both did:
//
//     window.open(`${API}/tournament/${id}/export/?sheet=participants`)
//
// with a comment saying the token was in the address. It was not, and it could
// not have been: `actor_from_request` reads `Authorization: Bearer`, and a
// navigation carries no headers. So pressing Entrants, Results, Standings or
// either of the entry-code downloads opened a new tab showing a JSON refusal.
// The endpoints were fine and had been tested; nothing could reach them.
//
// The events side already did it correctly, in one screen, inline. That is the
// same "two surfaces, one job" fault this project keeps finding, so the working
// half moved here and all three call it.
//
// Why not put the token in the query string instead: it would then sit in the
// server log, in the browser history and in any referrer. A session token is a
// password with a shorter life.

/**
 * Fetch `url` with the token and save the response as a file.
 *
 * Returns null on success, or a short reason. The caller shows the reason:
 * a download that silently does nothing is indistinguishable from a browser
 * that blocked it.
 */
export async function downloadWithToken(url, token, fallbackName = 'download') {
  if (!token) return 'NOT_SIGNED_IN';

  let res;
  try {
    res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  } catch {
    return 'NETWORK';
  }

  if (!res.ok) {
    // The refusal body is JSON even though the success body is a file, so the
    // caller can translate a code rather than saying "download failed".
    try {
      const body = await res.json();
      return body?.code || 'FAILED';
    } catch {
      return 'FAILED';
    }
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filenameFrom(res) || fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
  return null;
}

/** The name the server gave the file, so the extension matches the contents. */
export function filenameFrom(res) {
  const header = res.headers.get('Content-Disposition') || '';
  // `filename*=UTF-8''name` first: it is the one that survives a non-ASCII
  // tournament name, and it is what `documents.py` sends alongside the plain
  // one.
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim());
    } catch {
      return encoded[1].trim();
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain ? plain[1].trim() : '';
}
