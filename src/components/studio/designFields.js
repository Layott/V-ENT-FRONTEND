'use client';

// What the overlay editor and the overlay style editor share (inbox 390, 393):
// the studio library (list and upload), and one control per kind of field.
// One copy, so a colour, a typeface or a logo is picked the same way in both.

import { useCallback, useEffect, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { localInputToISO, isoToLocalInput } from '@/lib/datetime';
import DateField from '@/components/date-field/DateField';
import { FONTS } from '@/lib/overlays/engine';
import panel from './studio-panel.module.css';
import styles from './overlay-designer.module.css';

/** The studio's pictures and fonts, and a way to add a picture. */
export function useStudioLibrary(assetsBase, token) {
  const tt = useT();
  const [assets, setAssets] = useState([]);
  const [uploading, setUploading] = useState(false);
  // Said beside the picture pickers when the library could not be read, so an
  // empty list is never mistaken for "nothing uploaded yet".
  const [libraryFailed, setLibraryFailed] = useState(false);

  useEffect(() => {
    if (!token || !assetsBase) return undefined;
    let gone = false;
    const failed = () => { if (!gone) setLibraryFailed(true); };
    fetch(assetsBase, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then((body) => {
        if (gone) return;
        if (body?.status === 'success') { setAssets(body.data?.assets || []); setLibraryFailed(false); } else failed();
      }).catch(failed);
    return () => { gone = true; };
  }, [assetsBase, token]);

  /** Upload a picture; resolves to `{added}` or `{error}` (a sentence). */
  const upload = useCallback(async (file) => {
    if (!file) return { error: '' };
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('name', file.name.replace(/\.[^.]+$/, ''));
      const res = await fetch(assetsBase, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
      const body = await res.json().catch(() => ({}));
      // The library answers with every asset; the new one is the newest picture.
      const list = body?.data?.assets || [];
      const added = list.filter((a) => a.kind === 'image').sort((x, y) => y.id - x.id)[0];
      if (res.ok && body.status === 'success' && added) {
        setAssets(list);
        return { added };
      }
      return { error: apiMessage(tt, body, 'media.addFailed', 'That file was not added.') };
    } catch (err) {
      return { error: apiMessage(tt, err, 'media.addFailed', 'That file was not added.') };
    } finally {
      setUploading(false);
    }
  }, [assetsBase, token, tt]);

  const libraryError = libraryFailed
    ? tt('overlay.libraryFailed', 'Your uploaded pictures could not be loaded. The V-ENT logo still works; try again in a moment.')
    : '';
  return { assets, upload, uploading, libraryError };
}

/**
 * One control. `type` is text, colour, choice, font, picture, datetime or
 * toggle; `onPickFile` opens the shared file input for a picture field.
 */
export function FieldControl({ id, type, value, onChange, choices, assets, onPickFile, uploading, label, libraryError }) {
  const tt = useT();
  const say = (pair) => (Array.isArray(pair) ? tt(pair[0], pair[1]) : pair);
  if (type === 'toggle') {
    return (
      <label className={styles.toggle} htmlFor={id}>
        <input id={id} type="checkbox" className={styles.check} checked={value !== false}
               onChange={(e) => onChange(e.target.checked)} />
        <span>{label}</span>
      </label>
    );
  }
  if (type === 'colour') {
    return (
      <span className={styles.colourRow}>
        <input id={id} type="color" className={styles.swatch} value={/^#[0-9a-f]{6}$/i.test(value || '') ? value : '#000000'}
               onChange={(e) => onChange(e.target.value.toUpperCase())} />
        <input className={panel.input} value={value || ''} maxLength={7} aria-label={label}
               onChange={(e) => onChange(e.target.value)} />
      </span>
    );
  }
  if (type === 'choice') {
    return (
      <select id={id} className={panel.select} value={String(value)} onChange={(e) => onChange(e.target.value)}>
        {choices.map(([v, l]) => <option key={v} value={v}>{say(l)}</option>)}
      </select>
    );
  }
  if (type === 'font') {
    return (
      <select id={id} className={panel.select} value={String(value)} onChange={(e) => onChange(e.target.value)}>
        {Object.entries(FONTS).map(([v, spec]) => <option key={v} value={v}>{spec.label}</option>)}
        {(assets || []).filter((a) => a.kind === 'font').map((a) => <option key={a.id} value={`asset:${a.id}`}>{a.name}</option>)}
      </select>
    );
  }
  if (type === 'picture') {
    return (
      <span className={styles.pictureRow}>
        <select id={id} className={panel.select} value={String(value)} onChange={(e) => onChange(e.target.value)}>
          <option value="default">{tt('overlay.logoVent', 'V-ENT logo')}</option>
          <option value="none">{tt('overlay.logoNone', 'No logo')}</option>
          {(assets || []).filter((a) => a.kind === 'image').map((a) => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
        </select>
        <button type="button" className={panel.ghost} disabled={uploading} onClick={onPickFile}>
          {uploading ? tt('overlay.uploading', 'Uploading…') : tt('overlay.upload', 'Upload')}
        </button>
        {libraryError && <span className={styles.fromStyle} role="alert">{libraryError}</span>}
      </span>
    );
  }
  if (type === 'datetime') {
    return (
      <DateField id={id} withTime value={isoToLocalInput(value) || ''}
                 onChange={(e) => onChange(e.target.value ? localInputToISO(e.target.value) : '')} />
    );
  }
  return <input id={id} className={panel.input} value={value ?? ''} maxLength={60} onChange={(e) => onChange(e.target.value)} />;
}

/** A field with its label, sized for what it holds. */
export function Field({ id, type, label, children, extra }) {
  if (type === 'toggle') return children;
  return (
    <label htmlFor={id} className={`${panel.field} ${type === 'picture' || type === 'colour' ? styles.wide : ''}`}>
      <span className={panel.fieldLabel}>{label}</span>
      {children}
      {extra}
    </label>
  );
}
