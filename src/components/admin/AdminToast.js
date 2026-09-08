'use client';

import { useMemo, useState, useCallback, createContext, useContext } from 'react';
import styles from './AdminToast.module.css';
import { useT } from '@/i18n/LanguageProvider';
const ToastCtx = createContext({
  push: () => {}
});
let _id = 0;
export function AdminToastProvider({
  children
}) {
  const tt = useT();
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, type = 'info', duration = 3500) => {
    const id = ++_id;
    setToasts(prev => [...prev, {
      id,
      msg,
      type
    }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
    return id;
  }, []);
  const dismiss = useCallback(id => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Memoised, and this is not a micro-optimisation - it is the whole bug.
  //
  // `value={{ push }}` built a NEW OBJECT on every render of this provider.
  // Fourteen admin pages do `useCallback(async () => {...}, [toast])` and then
  // `useEffect(..., [authLoading, admin, fetchThing])`, so a new `toast`
  // rebuilt the callback, which re-ran the effect, which fetched again.
  //
  // On its own that is a wasted request. What made it a loop that never ends is
  // the failure path: a failed fetch calls `toast.push`, which sets state HERE,
  // which re-renders this provider, which hands out another new object, which
  // fetches again, which fails again. The console hammered the API roughly
  // every twelve seconds and told the operator "Failed to load" each time - on
  // every page at once, which is exactly how it was reported.
  //
  // `push` and `dismiss` were already stable. Only the wrapper was not.
  // `success` and `error` beside `push`, because six call sites already used
  // them and the context did not have them. `toast.success(...)` on an object
  // holding only `push` and `dismiss` is a TypeError, thrown on the SUCCESS
  // path, so the organisations console verified an organisation on the server
  // and then died before it could redraw. The catch below it called
  // `toast.error`, which threw again.
  //
  // Added rather than rewritten at the call sites: every one of them is
  // saying the right thing, and a console where half the pages say
  // `push(msg, 'success')` and half say `success(msg)` is the next version of
  // the same fault.
  const value = useMemo(() => ({
    push,
    dismiss,
    success: (msg, duration) => push(msg, 'success', duration),
    error: (msg, duration) => push(msg, 'error', duration),
    info: (msg, duration) => push(msg, 'info', duration),
  }), [push, dismiss]);

  return <ToastCtx.Provider value={value}>
      {children}
      <div className={styles.container}>
        {toasts.map(t => <div key={t.id} className={`${styles.toast} ${styles[`toast_${t.type}`]}`}>
            <span className={styles.dot} />
            <span className={styles.msg}>{t.msg}</span>
            <button className={styles.close} onClick={() => dismiss(t.id)} aria-label={tt("ui.dismiss.70af", "Dismiss")}>×</button>
          </div>)}
      </div>
    </ToastCtx.Provider>;
}
export function useAdminToast() {
  return useContext(ToastCtx);
}