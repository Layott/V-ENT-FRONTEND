import { appLocale } from '@/lib/appLocale';
/**
 * A sentence that depends on a number, in the reader's language.
 *
 * "{n} change(s) not saved yet" is a sentence nobody finished writing, and it
 * reads worse in French and Portuguese, where the adjective agrees too. Two
 * keys, one for exactly one and one for everything else, chosen here so no
 * component picks a key by hand.
 *
 *   plural(tt, n, 'tEdit.pendingOne', '{n} change not saved yet',
 *                 'tEdit.pending',    '{n} changes not saved yet')
 *
 * `n` is substituted for `{n}` already formatted; pass `formatNumber(n)` as
 * `shown` when the number should carry the reader's thousands separator.
 * `scripts/check-plurals.mjs` refuses a "(s)" in any dictionary entry or
 * component string, which is what makes this the only way to write one.
 */
// The language decides which form a number takes: French says "0 personne"
// and "1 personne", English "0 people" and "1 person" (30 September 2026, a
// French page read "0 personnes").
function isOne(count) {
  try {
    return new Intl.PluralRules(appLocale()).select(count) === 'one';
  } catch {
    return count === 1;
  }
}

export function plural(tt, n, oneKey, oneFallback, manyKey, manyFallback, shown) {
  const count = Number(n) || 0;
  const text = isOne(count) ? tt(oneKey, oneFallback) : tt(manyKey, manyFallback);
  return text.replace('{n}', shown !== undefined ? String(shown) : String(count));
}
