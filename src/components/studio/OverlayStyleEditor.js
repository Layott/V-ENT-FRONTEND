'use client';

// The overlay style: one set of fonts, colours and logos for every designed
// overlay in the broadcast (inbox 393).
//
// CEO, 30 September 2026: "They should be able to also decide on an overlay
// design template that will apply to all overlays, like primary fonts,
// secondary fonts, primary colors, secondary colors, etc."
//
// The previews under it are every designed overlay, drawn with the style being
// edited and each overlay's own saved changes, so the organiser sees at once
// what a new colour does to all of them (inbox 392: previews change live).
// Carried into the next broadcast by the server when one starts.

import { useEffect, useRef, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import DesignedCanvas from './DesignedCanvas';
import { DESIGNS } from '@/lib/overlays';
import { STYLE_ROLES } from '@/lib/overlays/engine';
import { Field, FieldControl, useStudioLibrary } from './designFields';
import panel from './studio-panel.module.css';
import styles from './overlay-designer.module.css';

export default function OverlayStyleEditor({ live, labels, assetsBase, token, onSave }) {
  const tt = useT();
  const saved = live?.style || {};
  const savedKey = JSON.stringify(saved);
  const [draft, setDraft] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const uploadFor = useRef('');
  const fileRef = useRef(null);
  const { assets, upload, uploading, libraryError } = useStudioLibrary(assetsBase, token);
  const dirty = JSON.stringify(draft) !== savedKey;
  useEffect(() => { if (!dirty) setDraft(JSON.parse(savedKey)); }, [savedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (role, value) => setDraft((d) => ({ ...d, [role]: value }));

  const onFile = async (file) => {
    const role = uploadFor.current;
    setError(''); setNote('');
    const { added, error: failed } = await upload(file);
    if (fileRef.current) fileRef.current.value = '';
    if (added && role) {
      set(role, String(added.id));
      setNote(tt('overlay.designer.uploaded', 'Uploaded. It is in the preview; press Save to put it on the overlay.'));
    } else if (failed) {
      setError(failed);
    }
  };

  const save = async () => {
    setBusy(true); setError(''); setNote('');
    const ok = await onSave(draft);
    setBusy(false);
    if (ok) setNote(tt('overlay.style.saved', 'Saved. Every overlay that follows the style has changed, on air too.'));
  };

  return (
    <div className={styles.designer}>
      <h3 className={panel.section}>{tt('overlay.style.heading', 'Overlay style')}</h3>
      <p className={panel.hint}>
        {tt('overlay.style.hint', 'Fonts, colours and logos for every designed overlay in this broadcast. An overlay keeps anything you changed on it; everything else follows this. The next broadcast starts with it.')}
      </p>

      <div className={styles.styleGrid}>
        {Object.keys(DESIGNS).map((kind) => (
          <figure key={kind} className={styles.styleCard}>
            <div className={styles.previewWrap}>
              <DesignedCanvas kind={kind} design={live?.elements?.[kind]?.payload?.design} style={draft}
                              assets={assets} still className={styles.preview} title={labels?.[kind] || kind} />
            </div>
            <figcaption className={styles.timing}>{labels?.[kind] || kind}</figcaption>
          </figure>
        ))}
      </div>

      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden
             onChange={(e) => onFile(e.target.files?.[0])} />

      <div className={panel.fields}>
        {STYLE_ROLES.map((r) => {
          const id = `ov-style-${r.role}`;
          const label = tt(r.label[0], r.label[1]);
          return (
            <Field key={r.role} id={id} type={r.type} label={label}>
              <FieldControl id={id} type={r.type} label={label} value={draft[r.role] ?? r.fallback}
                            assets={assets} uploading={uploading} libraryError={libraryError}
                            onPickFile={() => { uploadFor.current = r.role; fileRef.current?.click(); }}
                            onChange={(v) => set(r.role, v)} />
            </Field>
          );
        })}
      </div>

      {error && <p className={panel.error} role="alert">{error}</p>}
      {note && <p className={styles.note} role="status">{note}</p>}

      <div className={styles.actions}>
        <button type="button" className={panel.primary} disabled={busy || !dirty} onClick={save}>
          {busy ? tt('overlay.saving', 'Saving…') : tt('studio.save', 'Save')}
        </button>
        {dirty && (
          <button type="button" className={panel.ghost} disabled={busy} onClick={() => setDraft(JSON.parse(savedKey))}>
            {tt('ui.cancel.77df', 'Cancel')}
          </button>
        )}
        {Object.keys(draft).length > 0 && (
          <button type="button" className={panel.ghost} disabled={busy} onClick={() => setDraft({})}>
            {tt('overlay.style.reset', 'Back to the V-ENT defaults')}
          </button>
        )}
      </div>
    </div>
  );
}
