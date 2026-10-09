'use client';

import { useRef, useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiPlus, FiX } from 'react-icons/fi';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { mediaUrl } from '@/lib/mediaUrl';
import { pictureAlt } from './SlotPictures';
import styles from './slot-pictures.module.css';

// The organiser's side of inbox 419: add up to six pictures of what a pitch or
// stall will look like, put them in order (the first is the cover buyers see),
// and remove one. Every change is saved as it is made, through
// /event/<event>/slots/<id>/pictures/, and answers with the slot as it now is.

const MAX = 6;
const ACCEPT = 'image/png,image/jpeg,image/webp';
const API = () => process.env.NEXT_PUBLIC_API_URL || '';

const SlotPicturesEditor = ({ eventRef, slot, token, onChanged, onNotice }) => {
  const tt = useT();
  const [busy, setBusy] = useState(false);
  // Which picture is one press from being removed: removing asks first, as
  // every destructive control here does.
  const [removing, setRemoving] = useState(null);
  const fileRef = useRef(null);
  const pictures = slot.pictures || [];
  const base = `${API()}/event/${eventRef}/slots/${slot.id}/pictures/`;

  const send = async (url, options, done) => {
    setBusy(true);
    try {
      const res = await fetch(url, { ...options, headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) } });
      const body = await res.json().catch(() => ({}));
      if (body?.status !== 'success') {
        onNotice?.(apiMessage(tt, body, 'api.saveFailed', 'Save failed'));
        return;
      }
      if (body.data?.slot) onChanged?.(body.data.slot);
      if (done) onNotice?.(done);
    } catch (err) {
      onNotice?.(apiMessage(tt, err, 'api.saveFailed', 'Save failed'));
    } finally {
      setBusy(false);
    }
  };

  const add = (file) => {
    if (!file) return;
    const form = new FormData();
    form.append('image', file);
    send(base, { method: 'POST', body: form }, tt('slots.pictureAdded', 'Picture added.'));
  };

  const remove = (picture) => send(`${API()}/event/${eventRef}/slots/${slot.id}/pictures/${picture.id}/`, { method: 'DELETE' },
    tt('slots.pictureRemoved', 'Picture removed.'));

  const move = (from, to) => {
    const order = pictures.map((p) => p.id);
    const [moved] = order.splice(from, 1);
    order.splice(to, 0, moved);
    send(`${API()}/event/${eventRef}/slots/${slot.id}/pictures/order/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order }),
    });
  };

  return (
    <div className={styles.editor}>
      <p className={styles.editorTitle}>
        {tt('slots.pictures', 'Pictures')}
        <span className={styles.count}>
          {tt('slots.pictureCount', '{n} of {max}').replace('{n}', pictures.length).replace('{max}', MAX)}
        </span>
      </p>
      <p className={styles.help}>{tt('slots.picturesHelp', 'Up to 6. The first is the cover buyers see.')}</p>
      <div className={styles.tiles}>
        {pictures.map((p, i) => (
          <div key={p.id} className={styles.tile}>
            {p.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaUrl(p.url)} alt={pictureAlt(tt, slot.name, i + 1, pictures.length)} />
            )}
            {i === 0 && <span className={styles.coverBadge}>{tt('slots.cover', 'Cover')}</span>}
            {removing === p.id ? (
              <div className={styles.tileConfirm}>
                <button type="button" className={styles.confirmDanger} disabled={busy}
                        onClick={() => { setRemoving(null); remove(p); }}>
                  {tt('slots.removePictureConfirm', 'Remove it')}
                </button>
                <button type="button" className={styles.confirmKeep} onClick={() => setRemoving(null)}>
                  {tt('slots.keepPicture', 'Keep it')}
                </button>
              </div>
            ) : (
            <div className={styles.tileActions}>
              <button type="button" className={styles.tileBtn} disabled={busy || i === 0}
                      onClick={() => move(i, i - 1)} aria-label={tt('slots.moveEarlier', 'Move earlier')}>
                <FiChevronLeft aria-hidden="true" />
              </button>
              <button type="button" className={styles.tileBtn} disabled={busy}
                      onClick={() => setRemoving(p.id)} aria-label={tt('slots.removePicture', 'Remove this picture')}>
                <FiX aria-hidden="true" />
              </button>
              <button type="button" className={styles.tileBtn} disabled={busy || i === pictures.length - 1}
                      onClick={() => move(i, i + 1)} aria-label={tt('slots.moveLater', 'Move later')}>
                <FiChevronRight aria-hidden="true" />
              </button>
            </div>
            )}
          </div>
        ))}
        {pictures.length < MAX && (
          <button type="button" className={styles.addTile} disabled={busy}
                  onClick={() => fileRef.current?.click()}>
            <FiPlus aria-hidden="true" />
            <span>{busy ? tt('slots.uploading', 'Uploading...') : tt('slots.addPicture', 'Add a picture')}</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept={ACCEPT} className={styles.hiddenInput}
               aria-label={tt('slots.addPicture', 'Add a picture')}
               onChange={(e) => { add(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
    </div>
  );
};

/** The organiser's venue layout picture: upload, replace or remove. */
export const VenueLayoutEditor = ({ eventRef, url, token, onChanged, onNotice }) => {
  const tt = useT();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const fileRef = useRef(null);
  const endpoint = `${API()}/event/${eventRef}/venue-layout/`;

  const send = async (options, done) => {
    setBusy(true);
    try {
      const res = await fetch(endpoint, { ...options, headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json().catch(() => ({}));
      if (body?.status !== 'success') {
        onNotice?.(apiMessage(tt, body, 'api.saveFailed', 'Save failed'));
        return;
      }
      onChanged?.(body.data?.venue_layout || null);
      onNotice?.(done);
    } catch (err) {
      onNotice?.(apiMessage(tt, err, 'api.saveFailed', 'Save failed'));
    } finally {
      setBusy(false);
    }
  };

  const upload = (file) => {
    if (!file) return;
    const form = new FormData();
    form.append('image', file);
    send({ method: 'POST', body: form }, tt('slots.layoutSaved', 'Layout saved.'));
  };

  return (
    <div className={styles.editor}>
      <p className={styles.editorTitle}>{tt('slots.layoutTitle', 'Venue layout')}</p>
      <p className={styles.help}>
        {tt('slots.layoutHelp', 'One picture showing where the pitches and stalls are. Buyers see it above the pitches for sale.')}
      </p>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.layoutPreview} src={mediaUrl(url)}
             alt={tt('slots.layoutAlt', 'Where the pitches and stalls are at {event}').replace('{event}', '')} />
      )}
      <div className={styles.layoutActions}>
        <button type="button" className={styles.ghostBtn} disabled={busy}
                onClick={() => fileRef.current?.click()}>
          {busy ? tt('slots.uploading', 'Uploading...')
            : url ? tt('slots.replaceLayout', 'Replace') : tt('slots.uploadLayout', 'Upload a layout')}
        </button>
        {url && !confirming && (
          <button type="button" className={styles.ghostBtn} disabled={busy}
                  onClick={() => setConfirming(true)}>
            {tt('slots.removeLayout', 'Remove')}
          </button>
        )}
        {url && confirming && (
          <>
            <button type="button" className={styles.confirmDanger} disabled={busy}
                    onClick={() => { setConfirming(false); send({ method: 'DELETE' }, tt('slots.layoutRemoved', 'Layout removed.')); }}>
              {tt('slots.removeLayoutConfirm', 'Remove the layout?')}
            </button>
            <button type="button" className={styles.ghostBtn} onClick={() => setConfirming(false)}>
              {tt('slots.keepLayout', 'Keep it')}
            </button>
          </>
        )}
        <input ref={fileRef} type="file" accept={ACCEPT} className={styles.hiddenInput}
               aria-label={tt('slots.uploadLayout', 'Upload a layout')}
               onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
    </div>
  );
};

export default SlotPicturesEditor;
