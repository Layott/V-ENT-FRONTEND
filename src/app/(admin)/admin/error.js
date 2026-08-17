'use client'

import { useEffect } from 'react'
import styles from './admin-loading.module.css'

export default function AdminError({ error, reset }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className={styles.shell} style={{ flexDirection: 'column', gap: '1rem' }}>
      <p style={{ color: 'var(--v-ent-red)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem' }}>
        Something went wrong.
      </p>
      <button
        onClick={reset}
        style={{
          background: 'rgba(237,28,36,0.15)',
          borderRadius: 5, color: 'var(--v-ent-red)', padding: '0.5rem 1.25rem',
          fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  )
}
