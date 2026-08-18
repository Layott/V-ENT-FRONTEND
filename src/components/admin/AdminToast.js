'use client'

import { useEffect, useState, useCallback, createContext, useContext } from 'react'
import styles from './AdminToast.module.css'

const ToastCtx = createContext({ push: () => {} })

let _id = 0

export function AdminToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const push = useCallback((msg, type = 'info', duration = 3500) => {
    const id = ++_id
    setToasts((prev) => [...prev, { id, msg, type }])
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, duration)
    }
    return id
  }, [])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className={styles.container}>
        {toasts.map((t) => (
          <div key={t.id} className={`${styles.toast} ${styles[`toast_${t.type}`]}`}>
            <span className={styles.dot} />
            <span className={styles.msg}>{t.msg}</span>
            <button className={styles.close} onClick={() => dismiss(t.id)} aria-label="Dismiss">×</button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useAdminToast() {
  return useContext(ToastCtx)
}
