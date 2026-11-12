'use client';

// The welcome tour, offered rather than started (Apple review S23). A small
// card at the top of /home for a member who has not seen this version of it.

import { useWalkthrough } from './WalkthroughProvider';
import { useT } from '@/i18n/LanguageProvider';
import styles from './tour-offer.module.css';

export default function TourOffer() {
  const tt = useT();
  const tour = useWalkthrough();
  if (!tour?.offered) return null;
  return (
    <section className={styles.card} aria-label={tt('tour.offerLabel', 'A tour of V-ENT')}>
      <p className={styles.text}>
        <strong>{tt('tour.offerTitle', 'New here?')}</strong>{' '}
        {tt('tour.offerBody', 'A one-minute tour shows where tournaments, events, your wallet and your profile live.')}
      </p>
      <div className={styles.actions}>
        <button type="button" className="btn redBTN" onClick={() => tour.start()}>
          {tt('tour.offerStart', 'Take the tour')}
        </button>
        <button type="button" className={styles.quiet} onClick={() => tour.skip()}>
          {tt('tour.offerLater', 'Not now')}
        </button>
      </div>
    </section>
  );
}
