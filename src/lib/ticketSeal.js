// The seal on a ticket's QR code.
//
// Every ticket's code is `VT-XXXXXXXX`. The QR code printed on a ticket can
// carry that bare code, or the code with a seal after a dot:
// `VT-XXXXXXXX.<seal>`, where the seal is an ECDSA P-256 signature over the
// text `vent-ticket:` + code. The server holds the private key. The door holds
// only the public half, which `GET /event/door/seal-key/` hands out.
//
// So a code somebody typed up, or copied from a screenshot, or made up, has no
// seal that verifies, and the phone can say so without a network. A code with
// no seal at all is still a ticket, so the bare code goes on as it always did.
//
// Pure functions only. The door page decides what a bad seal means.

const PREFIX = 'vent-ticket:';
const SIGNATURE_BYTES = 64; // raw r || s for P-256, the form WebCrypto uses

const BASE64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** Split what a scanner read into the bare code and its seal ('' when none). */
export function splitScan(text) {
  const raw = String(text ?? '').trim();
  const dot = raw.indexOf('.');
  if (dot < 0) return { code: raw.toUpperCase(), seal: '' };
  return {
    code: raw.slice(0, dot).trim().toUpperCase(),
    seal: raw.slice(dot + 1).trim(),
  };
}

/** base64url without padding, to bytes. Throws on a character outside the alphabet. */
function decodeBase64url(text) {
  const bytes = [];
  let buffer = 0;
  let bits = 0;
  for (const char of text) {
    const value = BASE64URL.indexOf(char);
    if (value < 0) throw new Error('not base64url');
    buffer = ((buffer << 6) | value) & 0xffffff;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(bytes);
}

/**
 * Does `seal` prove that `code` was issued by V-ENT?
 *
 * Resolves false for anything it cannot check, never rejects: a malformed seal,
 * a missing key and a browser without WebCrypto all answer "not proven", and
 * the caller decides what that means.
 */
export async function verifySeal(jwk, code, seal) {
  try {
    if (!jwk || !code || !seal) return false;
    const signature = decodeBase64url(seal);
    if (signature.length !== SIGNATURE_BYTES) return false;
    const key = await crypto.subtle.importKey(
      'jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    return await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' }, key, signature,
      new TextEncoder().encode(PREFIX + code));
  } catch {
    return false;
  }
}
