'use client';

import { apiMessage } from '@/lib/apiMessage';

// Connecting a Discord or Steam account, the one way it can be done: by signing
// in to it. Used by Settings, Linked accounts and by Edit profile, Gaming
// accounts, so the two screens cannot drift apart again.
//
// CEO, 8 October 2026 (inbox 417): "for the discord it was only ui, tapping the
// connect just put it on and nothing was triggered." The profile panel had its
// own switch that saved "connected: true" and a text box for the handle; the
// real sign-in lived only in Settings. Both screens now go through here.

export const LINKABLE = ['discord', 'steam'];

const API = () => process.env.NEXT_PUBLIC_API_URL || '';

/** What each outcome the provider sends back means, in the reader's language. */
export const linkOutcome = (tt, outcome) => ({
  linked: tt('msg.linkedAccountConnected', 'Account connected.'),
  already: tt('msg.linkedAccountAlready', 'That account is already connected here.'),
  taken: tt('msg.linkedAccountTaken', 'That account is already connected to another V-ENT profile.'),
  failed: tt('msg.linkedAccountFailed', 'Connecting did not complete. Try again.'),
}[outcome] || tt('msg.linkedAccountFailed', 'Connecting did not complete. Try again.'));

/**
 * Send the browser to Discord or Steam. `back` says which page to come back
 * to ('profile' or 'settings'); the server only accepts those two.
 * Resolves to an error sentence when it could not start, or never returns
 * (the page is leaving).
 */
export async function startLink(id, { token, back = 'settings', tt }) {
  try {
    const res = await fetch(`${API()}/auth/link/${id}/start/?back=${encodeURIComponent(back)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body?.data?.url) {
      return apiMessage(tt, body, 'linked.cannotStart', 'Could not start connecting. Try again.');
    }
    window.location.href = body.data.url;
    return '';
  } catch (err) {
    return apiMessage(tt, err, 'linked.cannotStart', 'Could not start connecting. Try again.');
  }
}

/** Drop a linked account. Resolves to { ok, message }. */
export async function stopLink(id, { token, tt }) {
  try {
    const res = await fetch(`${API()}/auth/link/${id}/disconnect/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    const body = await res.json().catch(() => ({}));
    if (body?.status !== 'success') {
      return { ok: false, message: apiMessage(tt, body, 'linked.cannotDisconnect', 'Could not disconnect. Try again.') };
    }
    return { ok: true, message: tt('linked.disconnected', 'Disconnected.') };
  } catch (err) {
    return { ok: false, message: apiMessage(tt, err, 'linked.cannotDisconnect', 'Could not disconnect. Try again.') };
  }
}

/**
 * The outcome the provider put on the address on the way back, as sentences,
 * with those parameters removed so a reload does not say it twice. Every other
 * parameter stays: `panel` is what keeps the panel open.
 */
export function takeLinkOutcomes(ids, tt) {
  if (typeof window === 'undefined') return [];
  const params = new URLSearchParams(window.location.search);
  const messages = [];
  ids.forEach((id) => {
    const outcome = params.get(id);
    if (!outcome) return;
    messages.push(linkOutcome(tt, outcome));
    params.delete(id);
  });
  if (messages.length) {
    const rest = params.toString();
    window.history.replaceState({}, '', rest ? `?${rest}` : window.location.pathname);
  }
  return messages;
}
