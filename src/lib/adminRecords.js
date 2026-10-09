// The admin console's records (inbox 420): one call, one address and one way
// of showing a value, shared by the four records screens.
//
// The server (vent_auth/records.py) describes every field: its kind, whether it
// may be edited, whether it is hidden. These screens draw from that
// description and know nothing about any one model, which is how a model added
// next month gets its screen without a line of code here.

import { adminToken } from '@/lib/adminToken';
import { formatDate, formatDateTime } from '@/lib/datetime';

/** One request to /auth/admin/records..., never throwing: {ok, body}. */
export async function recordsCall(path, options = {}) {
  let res;
  try {
    res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/admin/records${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${adminToken()}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
    });
  } catch {
    return { ok: false, body: { status: 'error', code: 'NETWORK_UNREACHABLE', message: 'Could not reach the server.' } };
  }
  let body = {};
  try {
    body = await res.json();
  } catch {
    body = {};
  }
  return { ok: res.ok && body.status === 'success', body };
}

/** The console address of one record. Keys are model labels; a key never holds a slash. */
export const recordHref = (model, pk) => `/admin/records/${model}/${encodeURIComponent(pk)}`;
export const kindHref = (model) => `/admin/records/${model}`;

/** A field's value as text a person can read, or null for "empty". */
export function readable(field, tt) {
  const v = field.value;
  if (v === null || v === undefined || v === '') return null;
  if (v && typeof v === 'object' && v.hidden) return tt('adminRecords.hiddenValue', 'Hidden: never leaves the server');
  if (field.kind === 'boolean') return v ? tt('adminRecords.yes', 'Yes') : tt('adminRecords.no', 'No');
  if (field.kind === 'datetime') return formatDateTime(v);
  if (field.kind === 'date') return formatDate(v);
  if (field.kind === 'json') return JSON.stringify(v, null, 2);
  if (field.kind === 'file') return v.file || null;
  if (field.kind === 'link') return v.label || String(v.pk);
  if (field.choices) {
    const hit = field.choices.find(([key]) => String(key) === String(v));
    if (hit) return `${hit[1]} (${hit[0]})`;
  }
  return String(v);
}

/** What an edit box starts with, for a field's current value. */
export function editStart(field) {
  const v = field.value;
  if (v === null || v === undefined) return '';
  if (field.kind === 'link') return v.pk ? String(v.pk) : '';
  if (field.kind === 'json') return JSON.stringify(v, null, 2);
  if (field.kind === 'boolean') return v ? 'true' : 'false';
  return String(v);
}
