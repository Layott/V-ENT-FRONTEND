'use client';

import { useEffect } from 'react';
import styles from './admin-loading.module.css';
import { useT } from '@/i18n/LanguageProvider';
export default function AdminError({
  error,
  reset
}) {
  const tt = useT();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return <div className={styles.shell} style={{
    flexDirection: 'column',
    gap: '1rem'
  }}>
      <p style={{
      color: 'var(--v-ent-red)',
      fontFamily: 'Inter, sans-serif',
      fontSize: '0.9rem'
    }}>
        {tt("ui.something.went.wrong.bee5", "Something went wrong.")}
      </p>
      <button onClick={reset} style={{
      background: 'rgba(237,28,36,0.15)',
      borderRadius: 5,
      color: 'var(--v-ent-red)',
      padding: '0.5rem 1.25rem',
      fontFamily: 'Inter, sans-serif',
      fontSize: '0.85rem',
      cursor: 'pointer'
    }}>
        {tt("ui.try.again.042c", "Try again")}
      </button>
    </div>;
}