'use client';

// What the door sees about the person holding a ticket, under the result card:
// how they got it, what they hold, the tournaments they play in at this event,
// and what they bought at this event's stalls (with the ones waiting for them).
//
// Renders nothing without a story. An offline scan has none, so it shows what
// it always showed.

import Link from 'next/link';
import { useT } from '@/i18n/LanguageProvider';
import styles from './door-story.module.css';

export default function DoorStory({ story }) {
  const tt = useT();
  if (!story) return null;

  const { origin, tier, perks, plays_in: playsIn = [], orders = [] } = story;
  const perkList = Array.isArray(perks)
    ? perks
    : String(perks || '').split(',').map(p => p.trim()).filter(Boolean);
  const hasOrigin = Boolean(origin?.label);

  if (!hasOrigin && !tier && perkList.length === 0 && playsIn.length === 0 && orders.length === 0) {
    return null;
  }

  return (
    <div className={styles.story}>
      {hasOrigin && (
        <div className={styles.block}>
          <p className={styles.heading}>{tt('scan.howGot', 'How they got it')}</p>
          <p className={styles.line}>{tt(`scan.origin.${origin.kind}`, origin.label)}</p>
          {origin.detail && <p className={styles.muted}>{origin.detail}</p>}
        </div>
      )}

      {(tier || perkList.length > 0) && (
        <div className={styles.block}>
          <p className={styles.heading}>{tt('scan.ticketType', 'Ticket')}</p>
          {tier && <p className={styles.line}>{tier}</p>}
          {perkList.length > 0 && <p className={styles.muted}>{perkList.join(' · ')}</p>}
        </div>
      )}

      {playsIn.length > 0 && (
        <div className={styles.block}>
          <p className={styles.heading}>{tt('scan.playsIn', 'Plays in')}</p>
          <ul className={styles.list}>
            {playsIn.map(t => (
              <li key={t.slug} className={styles.line}>
                <Link href={`/tournaments/${t.slug}`} className={styles.link}>{t.title}</Link>
                {t.team && <span className={styles.muted}> · {t.team}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {orders.length > 0 && (
        <div className={styles.block}>
          <p className={styles.heading}>{tt('scan.atStalls', 'Bought at the stalls')}</p>
          <ul className={styles.list}>
            {orders.map(o => (
              <li key={o.code} className={styles.order}>
                <span className={styles.line}>{o.stall}</span>
                <ul className={styles.items}>
                  {(o.items || []).map((item, idx) => (
                    <li key={`${item.name}:${item.variant || ''}:${idx}`} className={styles.muted}>
                      {item.quantity} × {item.name}{item.variant ? ` (${item.variant})` : ''}
                    </li>
                  ))}
                </ul>
                {o.waiting && (
                  <p className={styles.waiting}>
                    {tt('scan.waitingAt', 'Waiting at {stall}').replace('{stall}', o.stall)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
