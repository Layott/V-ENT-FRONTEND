'use client';

// The editor for a designed overlay (inbox 390).
//
// CEO, 30 September 2026: "they can upload a logo and make it the offical logo
// on the overlay and it will join the animation, or text, or change the color
// of the overlay or design to what they want or edit what shows where."
//
// Every change redraws the preview at once, from the same template the browser
// source uses (inbox 392). Nothing reaches the air until Save. The downloads
// are made here, in the organiser's browser: a PNG of the resting frame, and a
// WebM with a real alpha channel, which OBS takes as a stinger transition.
//
// A field that follows the broadcast's overlay style (inbox 393) says so, and
// once changed here it offers the way back: "Use the overlay style" drops this
// overlay's own value, so the style reaches it again.

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useT } from '@/i18n/LanguageProvider';
import { formatNumber } from '@/lib/datetime';
import DesignedCanvas from './DesignedCanvas';
import { DESIGNS } from '@/lib/overlays';
import { paramsFor, prepare, recordWebm, saveBlob, stillPng, timing } from '@/lib/overlays/engine';
import { Field, FieldControl, useStudioLibrary } from './designFields';
import panel from './studio-panel.module.css';
import styles from './overlay-designer.module.css';

// `mayDownload` is the one switch for the downloads. CEO, 30 September 2026
// (inbox 391): downloading these will be a premium feature once the set-up is
// done, so the gate goes in the caller, in one place, when premium is ready.
export default function OverlayDesigner({ kind, element, style, assetsBase, token, name, onSave, onPlayOnAir, live, mayDownload = true }) {
  const tt = useT();
  const template = DESIGNS[kind];
  const saved = element?.payload?.design || {};
  const [draft, setDraft] = useState(saved);
  const [replay, setReplay] = useState(0);
  const [busy, setBusy] = useState('');
  const [progress, setProgress] = useState(0);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const uploadFor = useRef('');
  const fileRef = useRef(null);
  const { assets, upload, uploading, libraryError } = useStudioLibrary(assetsBase, token);

  // A save elsewhere (another operator, a second tab) lands here when nothing
  // has been typed; typed changes are never overwritten under somebody's hands.
  const savedKey = JSON.stringify(saved);
  const dirty = JSON.stringify(draft) !== savedKey;
  useEffect(() => { if (!dirty) setDraft(JSON.parse(savedKey)); }, [savedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const params = useMemo(() => (template ? paramsFor(template, draft, style) : {}), [template, draft, style]);
  if (!template) return null;
  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  const unset = (key) => setDraft((d) => { const next = { ...d }; delete next[key]; return next; });
  const { total, rest } = timing(template, params);

  const onFile = async (file) => {
    const key = uploadFor.current;
    setError(''); setNote('');
    const { added, error: failed } = await upload(file);
    if (fileRef.current) fileRef.current.value = '';
    if (added && key) {
      set(key, String(added.id));
      setNote(tt('overlay.designer.uploaded', 'Uploaded. It is in the preview; press Save to put it on the overlay.'));
    } else if (failed) {
      setError(failed);
    }
  };

  const exportAs = async (what) => {
    setBusy(what); setError(''); setNote(''); setProgress(0);
    try {
      const prepared = await prepare(template, params, assets);
      const base = name || kind;
      if (what === 'png') {
        saveBlob(await stillPng(template, params, prepared), `${base}.png`);
      } else {
        const blob = await recordWebm(template, params, prepared, { onProgress: setProgress });
        saveBlob(blob, `${base}.webm`);
        if (kind === 'transition') {
          setNote(tt('overlay.stingerNote', 'Saved. In OBS: Scene Transitions, add Stinger, pick this file, Transition Point {ms} milliseconds.')
            .replace('{ms}', formatNumber(rest)));
        }
      }
    } catch {
      setError(tt('overlay.exportFailed', 'That could not be made in this browser. Try Chrome, and keep this tab in front while it records.'));
    } finally {
      setBusy('');
    }
  };

  const save = async () => {
    setBusy('save'); setError(''); setNote('');
    const ok = await onSave(draft);
    setBusy('');
    if (ok) setNote(live ? tt('overlay.savedLive', 'Saved. The overlay on air has changed.') : tt('overlay.saved', 'Saved.'));
  };

  const field = (f) => {
    const id = `ov-${kind}-${f.key}`;
    const label = tt(f.label[0], f.label[1]);
    const own = Object.prototype.hasOwnProperty.call(draft, f.key);
    const extra = f.role ? (own
      ? <button type="button" className={styles.linkBtn} onClick={() => unset(f.key)}>
          {tt('overlay.useStyle', 'Use the overlay style')}
        </button>
      : <span className={styles.fromStyle}>{tt('overlay.fromStyle', 'From the overlay style')}</span>) : null;
    return (
      <Field key={f.key} id={id} type={f.type} label={label} extra={extra}>
        <FieldControl id={id} type={f.type} value={params[f.key]} label={label} choices={f.choices}
                      assets={assets} uploading={uploading} libraryError={libraryError}
                      onPickFile={() => { uploadFor.current = f.key; fileRef.current?.click(); }}
                      onChange={(v) => set(f.key, v)} />
      </Field>
    );
  };

  return (
    <div className={styles.designer}>
      <div className={styles.previewWrap}>
        <DesignedCanvas kind={kind} design={draft} style={style} assets={assets} playKey={replay}
                        className={styles.preview} title={tt('overlay.preview', 'Preview')} />
      </div>
      <div className={styles.previewBar}>
        <button type="button" className={panel.ghost} onClick={() => setReplay((n) => n + 1)}>
          {tt('overlay.replay', 'Play again')}
        </button>
        <span className={styles.timing}>
          {kind === 'transition'
            ? tt('overlay.timingTransition', '{total} ms, covers the screen at {rest} ms')
              .replace('{total}', formatNumber(total)).replace('{rest}', formatNumber(rest))
            : tt('overlay.timing', 'Arrives in {total} ms').replace('{total}', formatNumber(total))}
        </span>
      </div>

      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden
             onChange={(e) => onFile(e.target.files?.[0])} />

      <div className={panel.fields}>{template.fields.map(field)}</div>

      {error && <p className={panel.error} role="alert">{error}</p>}
      {note && <p className={styles.note} role="status">{note}</p>}

      <div className={styles.actions}>
        <button type="button" className={panel.primary} disabled={Boolean(busy) || !dirty} onClick={save}>
          {busy === 'save' ? tt('overlay.saving', 'Saving…') : (live ? tt('studio.update', 'Update on air') : tt('studio.save', 'Save'))}
        </button>
        {dirty && (
          <button type="button" className={panel.ghost} disabled={Boolean(busy)} onClick={() => setDraft(JSON.parse(savedKey))}>
            {tt('ui.cancel.77df', 'Cancel')}
          </button>
        )}
        {kind === 'transition' && live && onPlayOnAir && (
          <button type="button" className={panel.ghost} disabled={Boolean(busy)} onClick={onPlayOnAir}>
            {tt('overlay.playOnAir', 'Play it on air')}
          </button>
        )}
        {!mayDownload && (
          <p className={styles.timing}>
            {tt('overlay.downloadsPremium', 'Downloading overlays as pictures and videos is part of V-ENT premium.')}{' '}
            <Link href="/premium" className={styles.linkBtn}>{tt('premium.seeWhatItCosts', 'See what premium costs')}</Link>
          </p>
        )}
        {mayDownload && <>
        <button type="button" className={panel.ghost} disabled={Boolean(busy)} onClick={() => exportAs('png')}>
          {busy === 'png' ? tt('overlay.making', 'Making…') : tt('overlay.downloadPng', 'Download picture (PNG)')}
        </button>
        <button type="button" className={panel.ghost} disabled={Boolean(busy)} onClick={() => exportAs('webm')}>
          {busy === 'webm'
            ? tt('overlay.recording', 'Recording {n}%').replace('{n}', String(Math.round(progress * 100)))
            : tt('overlay.downloadVideo', 'Download video (see-through WebM)')}
        </button>
        </>}
      </div>
    </div>
  );
}
