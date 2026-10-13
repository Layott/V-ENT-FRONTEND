// The reference a payment page sends somebody back with. Every page that reads
// a return reads it here.
//
// Paystack comes back with `reference` (and `trxref`). Our server puts
// `reference` on Flutterwave's return address too (vent_auth/flutterwave.py
// `_with_reference`), and Flutterwave adds its own `status`, `tx_ref` (which
// is our reference again) and `transaction_id` beside it. Pages read the
// names three ways and removed them two ways: the root layout's verify took
// `reference` out and left `tx_ref` and `status` in the address, so the next
// reader saw half a return (walk of 13 October 2026). One reader, one remover.
// scripts/check-pay-return.mjs keeps every page on this file.

const OURS = ['reference', 'trxref', 'tx_ref'];
// What Flutterwave adds on its way back, removed with the reference once read.
const FLUTTERWAVE = ['tx_ref', 'transaction_id', 'status'];

/**
 * Pages that confirm their own return. The root layout's verify
 * (components/pay/PaystackReturn.js) leaves these alone: taken from under the
 * tournament registration, the reference was gone before the registration
 * loaded, and a paid card trip came back to "pick up where you left off"
 * instead of the ticket it paid for (13 October 2026). A page that reads a
 * return is on this list or named, with its reason, in check-pay-return.mjs.
 */
export const OWN_RETURN_PAGES = [
  /\/wallet-topup-callback(\/|$)/,
  /\/events\/ticket-confirmed(\/|$)/,
  /\/tournaments\/[^/]+\/register(\/|$)/,
  /\/tournaments\/register-tournament(\/|$)/,
];

export function confirmsItsOwnReturn(pathname) {
  return OWN_RETURN_PAGES.some((page) => page.test(pathname || ''));
}

/** The payment reference in these search params (URLSearchParams or Next's), or ''. */
export function returnReference(params) {
  if (!params || typeof params.get !== 'function') return '';
  for (const name of OURS) {
    const value = params.get(name);
    if (value) return value;
  }
  return '';
}

/** The reference in the address the page is on, or ''. */
export function returnReferenceHere() {
  if (typeof window === 'undefined') return '';
  return returnReference(new URLSearchParams(window.location.search));
}

/**
 * The address without the return's parameters, once the reference has been
 * spent. `status` goes only when Flutterwave put it there, so a page that uses
 * its own `?status=` keeps it.
 */
export function withoutReturn(href) {
  const url = new URL(href);
  const fromFlutterwave = url.searchParams.has('tx_ref') || url.searchParams.has('transaction_id');
  url.searchParams.delete('reference');
  url.searchParams.delete('trxref');
  if (fromFlutterwave) FLUTTERWAVE.forEach((name) => url.searchParams.delete(name));
  return url.toString();
}
