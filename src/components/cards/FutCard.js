'use client';

// One EAFC card, drawn in full.
//
// CEO, 4 September 2026: "also the cards dont carry the full design".
//
// They did not. The first version drew a rating, a position and a name over
// whatever Futbin's CDN returned, and hid the stats at the size the pitch
// actually uses, so every card on the pitch was a flat gold band with a number
// on it. Worse, the whole design was ONE image away from being nothing:
// `frame_url` points at somebody else's CDN, and when that does not answer,
// which is most of the time from Nigeria, the card had nothing of its own.
//
// So the card is DRAWN HERE, from the data, and Futbin's art is a bonus layer
// on top when it happens to load. Everything a card says is text and colour we
// own: rating, position, nation, club, portrait, name and all six stats. Pull
// the network cable out and the squad is still readable, which matters because
// this ends up on a broadcast.
//
// One layout at every size. `--fut-w` sets the width, the font size is derived
// from it, and every measurement inside is in `em`, so the same component is a
// legible 76px card on a phone pitch and a 156px card in a search result with
// no second set of rules to keep in step.

import { useState } from 'react';
import styles from './fut-card.module.css';

/** The band a card sits in. Also the colour of its text. */
function bandFor(card) {
  const kind = String(card?.item_type || '').toLowerCase();
  if (kind === 'icon') return styles.icon;
  if (kind === 'hero') return styles.hero;
  if (kind === 'special') return styles.special;
  if (kind === 'silver') return styles.silver;
  if (kind === 'bronze') return styles.bronze;
  return styles.gold;
}

// A keeper's six numbers are not an outfield player's six, and showing PAC on a
// goalkeeper is the kind of wrong that a viewer notices immediately.
const OUTFIELD = ['pac', 'sho', 'pas', 'dri', 'def', 'phy'];
const KEEPER = ['div', 'han', 'kic', 'ref', 'spe', 'pos'];

/** The six to show, and what to call them. */
function sixOf(card) {
  const stats = card?.stats || {};
  const has = (keys) => keys.filter((k) => stats[k] !== undefined
                                        && stats[k] !== null).length >= 3;
  // The card's own numbers decide, not its position: a card filed as GK with
  // outfield stats should show what it actually has rather than six blanks.
  if (has(KEEPER)) return KEEPER;
  if (has(OUTFIELD)) return OUTFIELD;
  return String(card?.position || '').toUpperCase() === 'GK' ? KEEPER : OUTFIELD;
}

/** A nation as three letters, because there is no flag to draw. */
function shortNation(nation) {
  const text = String(nation || '').trim();
  if (!text) return '';
  if (text.length <= 3) return text.toUpperCase();
  // "Cote d'Ivoire" reads better as CIV than COT, so initials win when there
  // is more than one word.
  const words = text.split(/[\s'-]+/).filter(Boolean);
  if (words.length > 1) {
    return words.map((w) => w[0]).join('').slice(0, 3).toUpperCase();
  }
  return text.slice(0, 3).toUpperCase();
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
  // Drawn under the card, for a pitch that has to say whose slot this is even
  // when it is filled.
  caption,
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
  const six = sixOf(card);
  const nation = shortNation(card.nation);

  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick}
         className={`${box} ${bandFor(card)} ${showFrame ? styles.hasArt : ''}`}
         title={`${card.name} ${card.rating} ${card.position}`}>
      {/* Futbin's own art, when it answers. Underneath everything, and the
          card is complete without it. */}
      {showFrame && (
        <img className={styles.frame} src={card.frame_url} alt=""
             onError={() => setFrameBroken(true)} />
      )}

      <span className={styles.head}>
        <span className={styles.rating}>{card.rating}</span>
        <span className={styles.position}>{card.position}</span>
        {nation && <span className={styles.nation}>{nation}</span>}
      </span>

      {showFace
        ? (
          <img className={styles.face} src={card.image_url}
               alt={`${card.name}, ${card.rating} rated ${card.position}`}
               onError={() => setFaceBroken(true)} />
        )
        : (
          // Never a broken glyph on a stream. Initials, the way Avatar does it.
          <span className={styles.faceless} aria-hidden="true">
            {String(card.name || '?').split(/\s+/).map((w) => w[0])
              .join('').slice(0, 2).toUpperCase()}
          </span>
        )}

      <span className={styles.name}>{card.name}</span>
      {card.club && <span className={styles.club}>{card.club}</span>}

      <span className={styles.stats}>
        {six.map((k) => (
          <span key={k} className={styles.stat}>
            <b>{stats[k] === undefined || stats[k] === null ? '-' : stats[k]}</b>
            <i>{k.toUpperCase()}</i>
          </span>
        ))}
      </span>

      {caption && <span className={styles.caption}>{caption}</span>}

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
