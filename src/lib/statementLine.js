/**
 * A wallet history line in the reader's language (inbox 388).
 *
 * CEO, 30 September 2026: history lines such as "Sent to @walk_organiser"
 * were English sentences written on the server, so French and Portuguese
 * readers saw English. "convert for the different languages".
 *
 * The server keeps writing the English sentence to `description` and sends
 * beside it `line: {code, params, suffixes}`, read back by
 * vent_auth/statement_lines.py. This draws `txn.<code>` from the dictionaries
 * with the names, titles and numbers put back in. A row with no `line` is a
 * person's own note or an admin's reason, and is shown as it was written.
 */
import { formatNumber } from '@/lib/datetime';
import { plural } from '@/lib/plural';

/** English for each code, the fallback when a dictionary lacks the key. */
export const STATEMENT_ENGLISH = {
  sent: 'Sent to {to}',
  received: 'Received from {from}',
  transferTo: 'To {to}',
  transferFrom: 'From {from}',
  topupProvider: 'Top up via {provider}',
  topupProviderNgn: 'Top up via {provider}, ₦{ngn}',
  topupCard: 'Top up with {brand} ending {last4}',
  cardCharge: '{brand} ending {last4}',
  premiumOne: 'V-ENT premium, {n} month',
  premium: 'V-ENT premium, {n} months',
  refundTournamentCancelled: 'Refund, tournament cancelled: {title}',
  refundNoCheckin: 'Refund, did not check in: {title}',
  refundEventCancelled: 'Refund, {event} cancelled: {code}',
  refund: 'Refund: {what}',
  withdrawal: 'Withdrawal to {bank} {account}',
  membership: 'Membership: {plan}',
  membershipsSettled: 'Memberships paid out: {plan}',
  settlement: 'Settlement: {name}',
  prizeTopup: 'Prize top-up: {title}',
  prizePayout: 'Prize, position {position}: {title}',
  registrationFee: 'Registration fee: {title}',
  entryFee: 'Entry fee: {title}',
  runnerUpPrize: 'Runner-up prize: {title}',
  marketplaceSale: 'Marketplace sale: {title}',
  marketplaceRefund: 'Marketplace refund: {title}',
  marketplace: 'Marketplace: {title}',
  animeSubscription: 'Anime subscription: {series}',
  animeChapter: 'Anime: {series}, chapter {number}',
  demoCoinsRemoved: 'Removed: coins that were never bought (demo account)',
  tickets: '{quantity} x {tier}, {event}',
  orderAt: 'Order at {vendor}',
  saleAt: 'Sale at {vendor}',
  orderCancelledAt: 'Order {code} cancelled at {stall}',
  orderCancelled: 'Order {code} cancelled',
  slotRefunded: '{slot} at {event}, refunded',
  slotSold: '{slot} sold at {event}',
  slotBought: '{slot} at {event}',
  returned: 'returned',
  returnedReason: 'returned: {reason}',
  serviceFee: 'includes a {fee} VC service fee',
  platformFee: 'after a {fee} VC V-ENT fee',
  withNote: '{line}: {note}',
};

/** Numbers shown in the reader's own format; names and titles untouched. */
const NUMBERS = new Set(['ngn', 'fee', 'quantity', 'position']);

const fill = (text, params) => Object.entries(params || {}).reduce(
  (out, [key, value]) => out.split(`{${key}}`).join(
    NUMBERS.has(key) && value !== '' && !Number.isNaN(Number(String(value).replace(/,/g, '')))
      ? formatNumber(Number(String(value).replace(/,/g, '')))
      : String(value)),
  text);

const say = (tt, key, params) => fill(tt(`txn.${key}`, STATEMENT_ENGLISH[key]), params);

/** The whole line for one statement row, in the reader's language. */
export function statementLine(tt, row) {
  const line = row?.line;
  if (!line || !STATEMENT_ENGLISH[line.code]) return row?.description || row?.name || '-';
  const params = { ...(line.params || {}) };
  let main;
  if (line.code === 'premium') {
    const months = Number(params.months) || 1;
    main = plural(tt, months, 'txn.premiumOne', 'V-ENT premium, {n} month',
      'txn.premium', 'V-ENT premium, {n} months', formatNumber(months));
  } else if (line.code === 'topupProvider' && params.ngn) {
    main = say(tt, 'topupProviderNgn', params);
  } else {
    main = say(tt, line.code, params);
  }
  // A person's own note on a send is theirs, and is shown as they wrote it.
  if (params.note && (line.code === 'sent' || line.code === 'received')) {
    main = tt('txn.withNote', STATEMENT_ENGLISH.withNote).replace('{line}', main).replace('{note}', params.note);
  }
  const extras = (line.suffixes || []).map(({ code, params: p }) => (
    code === 'returned' && p?.reason ? say(tt, 'returnedReason', p) : say(tt, code, p)));
  return extras.length ? `${main} (${extras.join(', ')})` : main;
}
