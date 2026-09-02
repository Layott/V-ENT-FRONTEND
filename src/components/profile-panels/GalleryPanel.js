'use client';

import { apiMessage } from '@/lib/apiMessage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './GalleryPanel.module.css';
import { useT } from '@/i18n/LanguageProvider';

// Two kinds of picture, because they are used for two different things.
//
// CEO, 31 August 2026: "there should be another type of upload for those who
// want to upload their Esports pictures, let them know that the Esports images
// will be used publicly and inside events or tournaments. that they grant use
// of it to organizers for those events."
//
// A personal picture sits on the profile. An esports picture is released: the
// person is granting organisers the right to use it, and that grant is only
// worth something if it is recorded, so the upload will not go through without
// the box being ticked and the API refuses it too. The wording shown here is
// fetched from the API rather than written into this file, so the sentence
// somebody agreed to and the version stored against their picture are the same
// sentence.
const KINDS = ['personal', 'esports'];

const GalleryPanel = ({
  images = [],
  isOwner = false,
  onUploaded,
  apiBase = process.env.NEXT_PUBLIC_API_URL || '',
  sessionToken = null,
}) => {
  const tt = useT();
  const [filter, setFilter] = useState('all');
  const [kind, setKind] = useState('personal');
  const [consent, setConsent] = useState(false);
  const [terms, setTerms] = useState(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const fileRef = useRef(null);

  const kindWord = k => ({
    personal: tt('ui.gallery.personal.5c81', 'Personal'),
    esports: tt('ui.gallery.esports.3f26', 'Esports'),
  }[k] || k);

  useEffect(() => {
    if (!isOwner) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${apiBase}/gallery/release-terms/`);
        const body = await res.json().catch(() => null);
        if (!cancelled && body?.status === 'success') setTerms(body.data);
      } catch { /* the fallback sentence below still says the essential thing */ }
    })();
    return () => { cancelled = true; };
  }, [isOwner, apiBase]);

  const filtered = useMemo(() => {
    if (filter === 'all') return images;
    return images.filter(img => (img.kind || 'personal') === filter);
  }, [images, filter]);

  const counts = useMemo(() => ({
    all: images.length,
    personal: images.filter(i => (i.kind || 'personal') === 'personal').length,
    esports: images.filter(i => i.kind === 'esports').length,
  }), [images]);

  const releaseText = terms
    ? (terms[typeof document !== 'undefined'
        ? (document.documentElement.lang || 'en')
        : 'en'] || terms.en)
    : tt('ui.gallery.release.fallback.9e04',
         'Esports pictures are public. By uploading one you grant V-ENT and the organisers of events and tournaments you take part in the right to show it on those pages and in the promotion of them. You keep the picture and can delete it at any time.');

  const upload = useCallback(async files => {
    if (!files?.length || busy) return;
    if (kind === 'esports' && !consent) {
      setProblem(tt('ui.gallery.consent.needed.4b73',
                    'Tick the box to release the picture before uploading it.'));
      return;
    }
    setBusy(true);
    setProblem('');
    try {
      const body = new FormData();
      [...files].forEach(f => body.append('images', f));
      body.append('kind', kind);
      if (kind === 'esports') body.append('consent', 'true');
      const res = await fetch(`${apiBase}/gallery/upload/`, {
        method: 'POST',
        headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {},
        body,
      });
      const payload = await res.json().catch(() => null);
      if (payload?.status !== 'success') {
        setProblem(apiMessage(tt, payload, 'ui.gallery.upload.failed.2a58', 'That upload did not go through.'));
        return;
      }
      setConsent(false);
      if (fileRef.current) fileRef.current.value = '';
      if (onUploaded) onUploaded(payload.data.images || []);
    } finally {
      setBusy(false);
    }
  }, [busy, kind, consent, apiBase, sessionToken, onUploaded, tt]);

  return (
    <div className={styles.galleryWrap}>
      <div className={styles.galleryHead}>
        <div className={styles.filterChips}>
          {[['all', tt('ui.all.6a72', 'All')],
            ['personal', kindWord('personal')],
            ['esports', kindWord('esports')]].map(([id, label]) => (
            <button type="button" key={id}
                    className={`${styles.chip} ${filter === id ? styles.chipOn : ''}`}
                    onClick={() => setFilter(id)}>
              {label} <span className={styles.chipCount}>{counts[id]}</span>
            </button>
          ))}
        </div>
        <div className={styles.galleryCount}>
          <strong>{filtered.length}</strong> {tt('ui.photos.2e58', 'photos')}
        </div>
      </div>

      {isOwner && (
        <div className={styles.uploader}>
          <div className={styles.kindRow}>
            {KINDS.map(k => (
              <button type="button" key={k}
                      className={`${styles.kindBtn} ${kind === k ? styles.kindBtnOn : ''}`}
                      onClick={() => { setKind(k); setConsent(false); setProblem(''); }}>
                {kindWord(k)}
              </button>
            ))}
          </div>

          <p className={styles.kindNote}>
            {kind === 'esports'
              ? tt('ui.gallery.esports.note.7d19', 'Match photos, team shots, anything from a competition.')
              : tt('ui.gallery.personal.note.1c62', 'Pictures for your profile. They stay here.')}
          </p>

          {kind === 'esports' && (
            <label className={styles.consentRow}>
              <input type="checkbox" checked={consent} className={styles.consentBox}
                     onChange={e => { setConsent(e.target.checked); setProblem(''); }} />
              <span className={styles.consentText}>{releaseText}</span>
            </label>
          )}

          <div className={styles.uploadRow}>
            <input ref={fileRef} type="file" accept="image/*" multiple
                   className={styles.fileInput}
                   disabled={busy || (kind === 'esports' && !consent)}
                   onChange={e => upload(e.target.files)} />
            {busy && <span className={styles.uploadingNote}>
              {tt('ui.gallery.uploading.8f40', 'Uploading…')}
            </span>}
          </div>
          {problem && <p className={styles.problem} role="alert">{problem}</p>}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          {isOwner
            ? tt('ui.gallery.none.yet.6b25', 'Nothing here yet. Add a picture above.')
            : tt('ui.no.photos.show.view.47a9', 'No photos to show in this view.')}
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((img, idx) => (
            <figure className={styles.tile} key={img.id || img.image_id || idx}>
              {(img.url || img.src || img.image)
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={img.url || img.src || img.image} alt={img.caption || ''} loading="lazy" />
                : null}
              <div className={styles.tileOverlay}>
                <div>
                  <span className={`${styles.tileTag} ${img.kind === 'esports' ? styles.tileTagEsports : ''}`}>
                    {kindWord(img.kind || 'personal')}
                  </span>
                  {img.caption && <div className={styles.tileCaption}>{img.caption}</div>}
                </div>
              </div>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
};

export default GalleryPanel;
