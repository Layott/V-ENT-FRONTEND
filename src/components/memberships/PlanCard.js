'use client';

// One membership plan, drawn the same way everywhere it appears.
//
// The organisation page, the plan's own page and the organiser's console all
// render this. Three copies of "what a plan looks like" is how a benefit ends
// up shown on one screen and missing on another, which is the fault the whole
// platform keeps producing: a control built on one of two surfaces.
//
// Not a three-column pricing table. That layout is banned outright, and it is
// also wrong here: an organiser may sell one plan or six, and a grid built for
// exactly three lies about both.

import Link from 'next/link';
import { useT } from '@/i18n/LanguageProvider';
import { formatNgn } from '@/lib/currency';
import { formatDate, formatNumber } from '@/lib/datetime';
import styles from './plan-card.module.css';

/** The English of each benefit key, for a dictionary that has not caught up. */
const BENEFIT_FALLBACK = {
  members_area: 'The members area',
  priority_registration: 'Register before anybody else',
  member_ticket_discount: 'A discount on tickets',
  free_entry: 'No entry fee on open tournaments',
  member_badge: 'A member badge beside your name',
  early_announcements: 'Announcements before they are public',
};

export function benefitLabel(tt, key, value) {
  const label = tt(`billing.benefit.${key}`, BENEFIT_FALLBACK[key] || key);
  if (!value) return label;
  return `${label} (${value}%)`;
}

/** "5 VC a month", said in words rather than as a symbol nobody knows. */
export function priceLabel(tt, plan) {
  if (plan.is_free) return tt('billing.free', 'Free');
  const coins = tt('billing.coins', '{n} VENT COINS')
    .replace('{n}', formatNumber(plan.price_vc));
  return plan.interval === 'yearly'
    ? tt('billing.perYear', '{price} a year').replace('{price}', coins)
    : tt('billing.perMonth', '{price} a month').replace('{price}', coins);
}

const PlanCard = ({
  plan,
  wide = false,
  href,
  children,
  showSeller = true,
  // Which heading this card's name is. A plan's own page makes it the h1,
  // because the page is about that plan; in a list it is an h3 under the
  // section heading. One h1 per page and headings in order is how any reader
  // works out the structure, a search engine and a model included.
  as: Heading = 'h3',
  // Whether the viewer already holds this one. Passed in rather than fetched
  // here: a list of six plans asking six times is six round trips, and
  // `/billing/entitlements/` answers the whole question once.
  mine = null,
}) => {
  const tt = useT();
  if (!plan) return null;

  const benefits = [
    ...(plan.benefits || []),
    // Granted whether the organiser ticked it or not, so a plan with a members
    // area written into it never holds content nobody can see they get.
    ...(plan.implied_benefits || [])
      .filter((k) => !(plan.benefits || []).some((b) => b.key === k))
      .map((key) => ({ key, value: 0 })),
  ];

  const body = (
    <>
      <div className={styles.head}>
        <Heading className={styles.name}>
          {href ? <Link href={href} className={styles.sellerLink}>{plan.name}</Link>
            : plan.name}
        </Heading>
        {plan.tagline ? <p className={styles.tagline}>{plan.tagline}</p> : null}
        {showSeller && plan.seller ? (
          <span className={styles.seller}>
            {tt('billing.soldBy', 'From')}{' '}
            {plan.seller.org_slug ? (
              <Link href={`/organizations/${plan.seller.org_slug}`}
                    className={styles.sellerLink}>
                {plan.seller.name}
              </Link>
            ) : (
              <Link href={`/u/${plan.seller.username}`} className={styles.sellerLink}>
                {plan.seller.name}
              </Link>
            )}
          </span>
        ) : null}

        <div className={styles.priceRow}>
          <span className={styles.price}>{priceLabel(tt, plan)}</span>
          {plan.is_free ? null : (
            <span className={styles.priceNgn}>
              {tt('billing.whichIs', 'which is {ngn}')
                .replace('{ngn}', formatNgn(plan.price_ngn))}
            </span>
          )}
        </div>

        <div className={styles.chipRow}>
          {plan.status === 'draft' ? (
            <span className={`${styles.chip} ${styles.chipDraft}`}>
              {tt('billing.draft', 'Draft, not visible to anybody else')}
            </span>
          ) : null}
          {plan.status === 'retired' ? (
            <span className={styles.chip}>
              {tt('billing.retired', 'Closed to new members')}
            </span>
          ) : null}
          {plan.trial_days ? (
            <span className={styles.chip}>
              {tt('billing.trialDays', '{n} days free first')
                .replace('{n}', plan.trial_days)}
            </span>
          ) : null}
          {mine ? (
            <span className={`${styles.chip} ${styles.chipMine}`}>
              {mine.renews
                ? tt('billing.youAreAMember', 'You are a member')
                : tt('billing.cancelledUntil', 'Cancelled. You keep this until {when}.')
                  .replace('{when}', mine.until ? formatDate(mine.until) : '')}
            </span>
          ) : null}
          {typeof plan.member_count === 'number' && plan.member_count > 0 ? (
            <span className={styles.chip}>
              {/* One and many are separate keys rather than an "s" stuck on the
                  end. The walk on 8 September showed this chip reading "1
                  members", and the languages do not agree on where the plural
                  falls anyway. */}
              {plan.member_count === 1
                ? tt('billing.memberCountOne', '1 member')
                : tt('billing.memberCount', '{n} members')
                  .replace('{n}', formatNumber(plan.member_count))}
            </span>
          ) : null}
        </div>
      </div>

      {benefits.length ? (
        <ul className={styles.benefits}>
          {benefits.map((b) => (
            <li key={b.key} className={styles.benefit}>
              {benefitLabel(tt, b.key, b.value)}
            </li>
          ))}
        </ul>
      ) : null}

      {children}
    </>
  );

  return (
    <article className={wide ? `${styles.card} ${styles.cardWide}` : styles.card}>
      {body}
    </article>
  );
};

export default PlanCard;
export { styles as planStyles };
