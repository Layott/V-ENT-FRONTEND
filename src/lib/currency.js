/**
 * VENT COINS, in one place.
 *
 * The rate lived as a literal in whichever component happened to need it: the
 * prize panel multiplied by 1,000, the top-up screen wrote "₦1,000 = 1 VC" into
 * its copy, onboarding said it again. Three copies of a number that decides what
 * a user pays is three chances to disagree, and the prize panel had already
 * drifted. The server is the authority (NGN_PER_COIN in the wallet app); this is
 * the display-side mirror of it, overridable for a staging environment that
 * prices coins differently.
 */
export const NGN_PER_COIN = Number(process.env.NEXT_PUBLIC_NGN_PER_COIN) || 1000;

/** What a VENT COIN balance is worth in naira. */
export const coinsToNgn = (coins) => (Number(coins) || 0) * NGN_PER_COIN;

/** How many whole coins a naira amount buys. Rounds down, as the server does. */
export const ngnToCoins = (ngn) => Math.floor((Number(ngn) || 0) / NGN_PER_COIN);

const ngnFormat = new Intl.NumberFormat('en-NG');

/** "₦1,250,000" for a coin amount. */
export const formatNgn = (ngn) => `₦${ngnFormat.format(Math.round(Number(ngn) || 0))}`;

/** "₦1,250,000" for a coin balance. */
export const coinsAsNgn = (coins) => formatNgn(coinsToNgn(coins));

/** "₦1,000 = 1 VC", for copy that quotes the rate. */
export const rateLabel = () => `${formatNgn(NGN_PER_COIN)} = 1 VC`;
