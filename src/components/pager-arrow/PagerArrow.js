'use client';

// Previous and next on a pager, as icons with their words for a screen reader
// (inbox 447: arrows drawn as the characters "‹" and "›" read as text and
// announced as nothing useful). The button keeps its own class.

import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import { useT } from '@/i18n/LanguageProvider';
import styles from './pager-arrow.module.css';

export default function PagerArrow({ dir = 'prev' }) {
  const tt = useT();
  const next = dir === 'next';
  const Icon = next ? LuChevronRight : LuChevronLeft;
  return (
    <>
      <Icon aria-hidden="true" />
      <span className={styles.hidden}>
        {next ? tt('pager.next', 'Next page') : tt('pager.previous', 'Previous page')}
      </span>
    </>
  );
}
