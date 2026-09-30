'use client';

// The editor for a designed overlay (inbox 390).
//
// CEO, 30 September 2026: "they can upload a logo and make it the offical logo
// on the overlay and it will join the animation, or text, or change the color
// of the overlay or design to what they want or edit what shows where."
//
// Every change redraws the preview at once, from the same template the browser
// source uses, so there is no round trip between typing and seeing. Nothing
// reaches the air until Save. The downloads are made here, in the organiser's
// browser: a PNG of the resting frame, and a WebM with a real alpha channel,
// which is what OBS takes as a stinger transition.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { localInputToISO, isoToLocalInput, formatNumber } from '@/lib/datetime';
import DateField from '@/components/date-field/DateField';
import DesignedCanvas from './DesignedCanvas';
import { DESIGNS } from '@/lib/overlays';
import { FONTS, paramsFor, prepare, recordWebm, saveBlob, stillPng, timing } from '@/lib/overlays/engine';
import panel from './studio-panel.module.css';
import styles from './overlay-designer.module.css';

// `mayDownload` is the one switch for the downloads. CEO, 30 September 2026
// (inbox 391): downloading these will be a premium feature once the set-up is
// done, so the gate goes in the caller, in one place, when premium is ready.
export default function OverlayDesigner({ kind, element, assetsBase, token, name, onSave, onPlayOnAir, live, mayDownload = true }) {
  const tt = useT();
  const template = DESIGNS[kind];
  const saved = element?.payload?.design || {};
  const [draft, setDraft] = useState(saved);
  const [assets, setAssets] = useState([]);
  const [replay, setReplay] = useState(0);
  const [busy, setBusy] = useState('');
  const [progress, setProgress] = useState(0);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const uploadFor = useRef('');
  const fileRef = useRef(null);

  // A save elsewhere (another operator, a second tab) lands here when nothing
  // has been typed; typed changes are never overwritten under somebody's hands.
  const savedKey = JSON.stringify(saved);
  const dirty = JSON.stringify(draft) !== savedKey;
  useEffect(() => { if (!dirty) setDraft(JSON.parse(savedKey)); }, [savedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!token || !assetsBase) return undefined;
    let gone = false;
    fetch(assetsBase, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then((body) => {
        if (!gone && body?.status === 'success') setAssets(body.data?.assets || []);
      }).catch(() => {});
    return () => { gone = true; };
  }, [assetsBase, token]);

  const params = useMemo(() => (template ? paramsFor(template, draft) : {}), [template, draft]);
  if (!template) return null;
  const pictures = assets.filter((a) => a.kind === 'image');
  const fonts = assets.filter((a) => a.kind === 'font');
  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  const say = ([key, fallback]) => tt(key, fallback);
  const { total, rest } = timing(template, params);

  const upload = async (file) => {
    const key = uploadFor.current;
    if (!file || !key) return;
    setBusy('upload'); setError(''); setNote('');
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
        set(key, String(added.id));
        setNote(tt('overlay.designer.uploaded', 'Uploaded. It is in the preview; press Save to put it on the overlay.'));
      } else {
        setError(apiMessage(tt, body, 'media.addFailed', 'That file was not added.'));
      }
    } catch (err) {
      setError(apiMessage(tt, err, 'media.addFailed', 'That file was not added.'));
    } finally {
      setBusy('');
      if (fileRef.current) fileRef.current.value = '';
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
    const value = params[f.key];
    if (f.type === 'toggle') {
      return (
        <label key={f.key} className={styles.toggle} htmlFor={id}>
          <input id={id} type="checkbox" className={styles.check} checked={value !== false} onChange={(e) => set(f.key, e.target.checked)} />
          <span>{say(f.label)}</span>
        </label>
      );
    }
    let control;
    if (f.type === 'colour') {
      control = (
        <span className={styles.colourRow}>
          <input id={id} type="color" className={styles.swatch} value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'}
                 onChange={(e) => set(f.key, e.target.value.toUpperCase())} />
          <input className={panel.input} value={value || ''} maxLength={7} aria-label={say(f.label)}
                 onChange={(e) => set(f.key, e.target.value)} />
        </span>
      );
    } else if (f.type === 'choice') {
      control = (
        <select id={id} className={panel.select} value={String(value)} onChange={(e) => set(f.key, e.target.value)}>
          {f.choices.map(([v, label]) => <option key={v} value={v}>{say(label)}</option>)}
        </select>
      );
    } else if (f.type === 'font') {
      control = (
        <select id={id} className={panel.select} value={String(value)} onChange={(e) => set(f.key, e.target.value)}>
          {Object.entries(FONTS).map(([v, spec]) => <option key={v} value={v}>{spec.label}</option>)}
          {fonts.map((a) => <option key={a.id} value={`asset:${a.id}`}>{a.name}</option>)}
        </select>
      );
    } else if (f.type === 'picture') {
      control = (
        <span className={styles.pictureRow}>
          <select id={id} className={panel.select} value={String(value)} onChange={(e) => set(f.key, e.target.value)}>
            <option value="default">{tt('overlay.logoVent', 'V-ENT logo')}</option>
            <option value="none">{tt('overlay.logoNone', 'No logo')}</option>
            {pictures.map((a) => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
          </select>
          <button type="button" className={panel.ghost} disabled={Boolean(busy)}
                  onClick={() => { uploadFor.current = f.key; fileRef.current?.click(); }}>
            {busy === 'upload' && uploadFor.current === f.key ? tt('overlay.uploading', 'Uploading…') : tt('overlay.upload', 'Upload')}
          </button>
        </span>
      );
    } else if (f.type === 'datetime') {
      control = (
        <DateField id={id} withTime value={isoToLocalInput(value) || ''}
                   onChange={(e) => set(f.key, e.target.value ? localInputToISO(e.target.value) : '')} />
      );
    } else {
      control = (
        <input id={id} className={panel.input} value={value ?? ''} maxLength={60} onChange={(e) => set(f.key, e.target.value)} />
      );
    }
    return (
      <label key={f.key} htmlFor={id}
             className={`${panel.field} ${f.type === 'picture' || f.type === 'colour' ? styles.wide : ''}`}>
        <span className={panel.fieldLabel}>{say(f.label)}</span>
        {control}
      </label>
    );
  };

  return (
    <div className={styles.designer}>
      <div className={styles.previewWrap}>
        <DesignedCanvas kind={kind} design={draft} assets={assets} playKey={replay} className={styles.preview}
                        title={tt('overlay.preview', 'Preview')} />
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
             onChange={(e) => upload(e.target.files?.[0])} />

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
