'use client';

// Talking to Vermillion City, and knowing whether it is open.
//
// The marketplace is BUILT and CLOSED. The CEO's instruction: "make sure it is
// built, but still gated, we dont want to release the marketplace yet to the
// public."
//
// Two switches decide it and neither can open it alone: `MARKETPLACE_ENABLED`
// on the server, which defaults to OFF and makes every endpoint answer 503, and
// the console's `marketplace_enabled` module flag. `/auth/platform/modules/`
// publishes the AND of the two, and `useComingSoon` already reads that, so the
// navigation and the pages get their answer from the same place the endpoints
// do.
//
// That is the whole reason this file exists rather than each page fetching for
// itself: a page that decides independently is a page that can show a live
// screen over endpoints that refuse, which is the "control that renders live
// and fails on press" fault the project bans by name.

import { useCallback, useEffect, useState } from 'react';
import { usePlatformFlags } from './platformModules';

const API = process.env.NEXT_PUBLIC_API_URL;

/** The refusal code every endpoint gives while it is closed. */
export const OFF_CODE = 'MARKETPLACE_OFF';

/**
 * Whether Vermillion City is open, as three states rather than two.
 *
 * `null` while the flags are still being fetched, because "closed" and "we
 * have not asked yet" lead to different screens and a single boolean cannot
 * tell them apart. Every caller renders nothing until it is not null.
 */
export function useMarketplaceOpen() {
  const flags = usePlatformFlags();
  if (flags === null || flags === undefined) return null;
  return Boolean(flags.marketplace_enabled);
}

/** One request, with the token when there is one and the envelope unwrapped. */
export async function call(path, { method = 'GET', body, token, isForm } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload = body;
  if (body && !isForm) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(`${API}/marketplace${path}`, {
    method, headers, body: payload,
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.status === 'error') {
    const error = new Error(data.message || 'That did not work.');
    error.code = data.code || `HTTP_${res.status}`;
    error.status = res.status;
    error.field = data.field || null;
    error.data = data.data || {};
    throw error;
  }
  // A listing that was renamed answers 200 with `moved` rather than a 301,
  // because fetch() follows a redirect transparently and would chase a
  // frontend path against the API host.
  if (data.status === 'moved') {
    const error = new Error(data.message || 'This moved.');
    error.code = 'SLUG_CHANGED';
    error.data = data.data || {};
    throw error;
  }
  return data.data ?? {};
}

/** The catalogue: kinds, categories, which fields each kind uses, the limits. */
export function useCatalogue(open) {
  const [catalogue, setCatalogue] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    call('/catalogue/')
      .then(data => { if (alive) setCatalogue(data); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [open]);

  return { catalogue, failed };
}

/** What a listing costs in words, given the catalogue's own pricing keys. */
export function priceLine(tt, listing) {
  if (!listing) return '';
  const amount = tt('mk.coins', '{n} VC').replace('{n}', listing.price ?? 0);
  if (listing.kind === 'service') {
    if (listing.price_kind === 'hourly') return tt('mk.perHour', '{p} an hour').replace('{p}', amount);
    if (listing.price_kind === 'package') return tt('mk.perPackage', '{p} for the package').replace('{p}', amount);
  }
  if (listing.kind === 'swap') return tt('mk.swap', 'A swap');
  return amount;
}

/** Fill `{name}` in a translated string from a plain object. */
export function fill(text, values) {
  return Object.entries(values || {}).reduce(
    (out, [key, value]) => out.split(`{${key}}`).join(String(value)), text);
}
