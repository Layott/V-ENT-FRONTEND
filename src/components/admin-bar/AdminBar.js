'use client';

// The admin controls, on the page the record actually lives on.
//
// Everything an admin could do to a tournament or an event was in the console,
// which meant seeing a problem on the public page and then going to find the
// row again somewhere else. This puts the same actions where the thing is.
//
// It is the same endpoint the console calls and the same permission check, so
// there is one answer to "may I edit this" rather than two that can drift. The
// bar renders nothing at all for an ordinary reader, and renders only the
// controls this particular admin actually holds - a control that appears and
// then fails on submit is worse than one that was never offered.

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import styles from './admin-bar.module.css';

/** Ask the API what this visitor may administer.
 *
 *  `is_staff` on the session says "some kind of staff" and nothing about what
 *  they may do, so the permissions come from the server that will enforce them.
 */
export function useAdminCapabilities() {
  const {
    data: session,
    status
  } = useSession();
  const [caps, setCaps] = useState(null);

  // Primitives, not the session object: useSession hands back a new object on
  // every render, and depending on it turns this effect into a render loop.
  const token = session?.user?.sessionToken;
  const isStaff = !!session?.user?.isStaff;
  useEffect(() => {
    if (status === 'loading') return undefined;
    if (!isStaff) {
      setCaps({
        is_admin: false,
        permissions: {}
      });
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me/admin/`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (!cancelled && data?.status === 'success') setCaps(data.data);
      } catch {
        // Treated as "not an admin": the controls stay hidden rather than
        // appearing on a guess the server would refuse.
        if (!cancelled) setCaps({
          is_admin: false,
          permissions: {}
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, token, isStaff]);
  return caps;
}

/**
 * @param {string} permission  the permission this record's edit needs
 * @param {string} consoleHref where the console lists this kind of thing
 * @param {array}  fields      [{key, label, type}] shown in the edit form
 * @param {function} load      () => Promise<object> current values
 * @param {function} save      (payload) => Promise<{ok, message}>
 */
export default function AdminBar({
  permission,
  consoleHref,
  title,
  fields,
  load,
  save
}) {
  const tt = useT();
  const caps = useAdminCapabilities();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(null);
  const [loaded, setLoaded] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');
  const mayEdit = !!caps?.permissions?.[permission];

  // The caller passes `load` and `save` as inline arrow functions, so they are
  // a new value on every render. Depending on `load` in the effect below re-ran
  // it after every state change it caused, which is an infinite loop that shows
  // up as a page too busy to paint.
  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setLoadError(false);
    setForm(null);
    (async () => {
      try {
        const values = await loadRef.current();
        if (cancelled) return;
        if (!values) {
          setLoadError(true);
          return;
        }
        setForm(values);
        setLoaded(values);
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);
  if (!caps?.is_admin) return null;
  const set = (k, v) => setForm(f => ({
    ...f,
    [k]: v
  }));
  const submit = async () => {
    // Only what differs, so the audit entry names the field that changed
    // rather than every field the form happened to render.
    const payload = {};
    Object.keys(form || {}).forEach(k => {
      const now = form[k];
      if (now === '' || now == null) return;
      if (loaded && now === loaded[k]) return;
      payload[k] = now;
    });
    if (!Object.keys(payload).length) {
      setNote(tt('admin.nothingChanged', 'Nothing changed.'));
      return;
    }
    setSaving(true);
    setNote('');
    const result = await save(payload);
    setSaving(false);
    setNote(apiMessage(tt, result, 'api.somethingWentWrong', 'Something went wrong. Try again in a moment.'));
    if (result.ok) {
      setOpen(false);
      if (typeof window !== 'undefined') window.location.reload();
    }
  };
  return <div className={styles.bar}>
      <div className={styles.barInner}>
        <span className={styles.badge}>{tt('admin.adminView', 'Admin')}</span>
        <span className={styles.barText}>
          {mayEdit ? tt('admin.barCanEdit', 'You can change this record. Every change is recorded in the audit log.') : tt('admin.barReadOnly', 'You are signed in as an admin, but your role cannot change this record.')}
        </span>
        <div className={styles.barActions}>
          {mayEdit && <button type="button" className={styles.barBtn} onClick={() => setOpen(true)}>
              {tt('admin.editTournament', 'Edit')}
            </button>}
          <Link href={consoleHref} className={styles.barBtn}>
            {tt('admin.openInConsole', 'Open in console')}
          </Link>
        </div>
      </div>

      {open && <div className={styles.overlay} onClick={() => setOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <p className={styles.modalTitle}>{title}</p>
            <p className={styles.modalSub}>
              {tt('admin.barModalSub', 'The organiser is told this changed.')}
            </p>

            {loadError ? <p className={styles.modalSub}>
                {tt('admin.barLoadFailed', 'This could not be loaded, so the form was left closed rather than risk saving over it.')}
              </p> : !form ? <p className={styles.modalSub}>{tt('ui.loading', 'Loading…')}</p> : fields.map(f => <div className={styles.formRow} key={f.key}>
                  <label className={styles.formLabel}>{f.label}</label>
                  <input className={styles.formInput} type={f.type || 'text'} value={form[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} />
                </div>)}

            {note && <p className={styles.note}>{note}</p>}

            <div className={styles.modalBtns}>
              <button type="button" className={styles.barBtn} onClick={() => setOpen(false)}>
                {tt('ui.cancel.77df', 'Cancel')}
              </button>
              <button type="button" className={`${styles.barBtn} ${styles.barBtnPrimary}`} onClick={submit} disabled={saving || !form || loadError}>
                {saving ? tt('ui.saving', 'Saving…') : tt('ui.save', 'Save')}
              </button>
            </div>
          </div>
        </div>}
    </div>;
}

/** The shape AdminBar wants back from `save`, built from an API response. */
export function adminSaveResult(tt, data) {
  if (data?.status === 'success') {
    return {
      ok: true,
      message: tt('admin.savedChange', 'Saved.')
    };
  }
  return {
    ok: false,
    message: apiMessage(tt, data, 'api.failed', 'Failed.')
  };
}
