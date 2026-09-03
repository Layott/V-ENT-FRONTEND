'use client';

// One EAFC card.
//
// Two layers, both from Futbin: the frame is the card art, the portrait is the
// player's face on top of it. Over that, the numbers.
//
// The fallback is the important half. A card whose images have not loaded, or
// whose art Futbin has moved, still has to be READABLE: a rating, a position, a
// name and a colour that says what kind of card it is. A broken image glyph on
// a broadcast is the failure this component exists to make impossible, and it
// is a designed state rather than an accident, for the same reason Banner and
// Avatar draw a filled surface instead of letting the browser draw its
// question mark.

import { useState } from 'react';
import styles from './fut-card.module.css';

/** The band a card sits in when there is no art to draw. */
function bandFor(card) {
  const kind = String(card?.item_type || '').toLowerCase();
  if (kind === 'icon') return styles.icon;
  if (kind === 'hero') return styles.hero;
  if (kind === 'special') return styles.special;
  if (kind === 'silver') return styles.silver;
  if (kind === 'bronze') return styles.bronze;
  return styles.gold;
}

export default function FutCard({
  card,
  size = 'md',
  onClick,
  onRemove,
  removeLabel,
  slotLabel,
  empty,
  emptyLabel,
}) {
  // Tracked per image, because the frame and the portrait fail separately and
  // a missing portrait over a good frame still looks like a card.
  const [frameBroken, setFrameBroken] = useState(false);
  const [faceBroken, setFaceBroken] = useState(false);

  const box = `${styles.card} ${styles[size] || styles.md}`;

  if (empty || !card) {
    const Tag = onClick ? 'button' : 'div';
    return (
      <Tag type={onClick ? 'button' : undefined} onClick={onClick}
           className={`${box} ${styles.empty}`}
           aria-label={emptyLabel || slotLabel}>
        <span className={styles.emptySlot}>{slotLabel || '+'}</span>
      </Tag>
    );
  }

  const showFrame = card.frame_url && !frameBroken;
  const showFace = card.image_url && !faceBroken;
  const stats = card.stats || {};

  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick}
         className={`${box} ${showFrame ? '' : bandFor(card)}`}
         title={`${card.name} ${card.rating}`}>
      {showFrame && (
        <img className={styles.frame} src={card.frame_url} alt=""
             onError={() => setFrameBroken(true)} />
      )}
      {showFace && (
        <img className={styles.face} src={card.image_url} alt=""
             onError={() => setFaceBroken(true)} />
      )}

      <span className={styles.rating}>{card.rating}</span>
      <span className={styles.position}>{card.position}</span>
      <span className={styles.name}>{card.name}</span>

      {size !== 'sm' && (
        <span className={styles.stats}>
          {['pac', 'sho', 'pas', 'dri', 'def', 'phy']
            .filter((k) => stats[k] !== undefined && stats[k] !== null)
            .map((k) => (
              <span key={k} className={styles.stat}>
                <b>{stats[k]}</b>{k.toUpperCase()}
              </span>
            ))}
        </span>
      )}

      {onRemove && (
        <span className={styles.remove}
              role="button"
              tabIndex={0}
              aria-label={removeLabel}
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemove();
                }
              }}>
          &times;
        </span>
      )}
    </Tag>
  );
}
