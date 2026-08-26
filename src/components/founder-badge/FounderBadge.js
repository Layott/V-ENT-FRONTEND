'use client';

import styles from './founder-badge.module.css';
import { useT, useTx } from '@/i18n/LanguageProvider';

// The founder mark, shown beside a name.
//
// It animates, which the house rules allow only where the motion means
// something and never as a glow, a pulse or a halo. So: the V mark draws itself
// once when it appears, in a single sweep, and then stops. Nothing throbs,
// nothing breathes, nothing loops. A person scrolling past sees a mark; a
// person landing on the profile sees it drawn.
//
// It respects prefers-reduced-motion by rendering the finished state directly.

const FounderBadge = ({
  size = 'md',
  label,
  title
}) => {
  const t = useT();
  const tx = useTx();
  // The word on the badge itself. It was a default prop rendered straight into
  // the markup, so the tooltip translated and the visible word did not: a
  // French reader saw "Membre fondateur de V-ENT" on hover and "Founder" on
  // the badge. `profile.founder` was already translated and simply unused.
  const word = label || t('profile.founder', 'Founder');
  return <span className={`${styles.badge} ${styles[size] || styles.md}`} title={title || tx("Founding member of V-ENT")}>
    <svg className={styles.mark} viewBox="0 0 24 24" aria-hidden="true">
      {/* The V-ENT chevron, drawn rather than filled, so the stroke can sweep. */}
      <path className={styles.stroke} d="M4 5.5 L12 19 L20 5.5" fill="none" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span className={styles.text}>{word}</span>
  </span>;
};
export default FounderBadge;