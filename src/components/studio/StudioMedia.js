'use client';

// The studio's media library: clips and pictures, uploaded once, played later.
//
// CEO, 3 September 2026: "i want to be able use player brolls on the site if
// possible maybe the videos are uploaded to a place in the studio and then can
// be called on whenever, same for other videos or images that can be uploaded
// and then linked to differnet things like mayabe particular teams or players,
// or texts or IDS etc, then when those things are needed, can be triggered
// into a live overlay."
//
// So: upload with a name and whatever words the operator will actually reach
// for at 9pm with a match starting, and then one press to put any of it on
// air. Tags are free text on purpose; a dropdown of somebody else's categories
// is no use to the person holding the show together.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import styles from './studio-media.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

const mb = (bytes) => `${Math.round((Number(bytes) || 0) / (1024 * 1024))} MB`;

export default function StudioMedia({ kind = 'tournament', ownerRef, token, onPlay, live }) {
  const tt = useT();
  const fileRef = useRef(null);

  const [assets, setAssets] = useState([]);
  const [used, setUsed] = useState(0);
  const [limit, setLimit] = useState(0);
  const [maxFile, setMaxFile] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [draft, setDraft] = useState({ name: '', tags: '', team_tag: '', player: '' });

  const base = `${API}/${kind}/${ownerRef}/studio/assets/`;

  const take = (body) => {
    setAssets(body.data.assets || []);
    setUsed(body.data.used_bytes || 0);
    setLimit(body.data.limit_bytes || 0);
    setMaxFile(body.data.max_file_bytes || 0);
  };

  const load = useCallback(async () => {
    if (!token || !ownerRef) { setLoading(false); return; }
    try {
      const res = await fetch(base, { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') { take(body); setError(''); }
      else setError(apiMessage(tt, body, 'media.loadFailed', 'Could not load your media.'));
    } catch (err) {
      setError(apiMessage(tt, err, 'media.loadFailed', 'Could not load your media.'));
    } finally {
      setLoading(false);
    }
  }, [base, token, ownerRef]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    setError('');
    setNote('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('name', draft.name.trim() || file.name);
      if (draft.tags.trim()) form.append('tags', draft.tags.trim());
      if (draft.team_tag.trim()) form.append('team_tag', draft.team_tag.trim());
      if (draft.player.trim()) form.append('player', draft.player.trim());
      // How long a clip runs, read here rather than on the server: the browser
      // already has the file, and the console uses it to take a finished clip
      // off air by itself.
      if (file.type.startsWith('video/')) {
        const seconds = await new Promise((resolve) => {
          const probe = document.createElement('video');
          probe.preload = 'metadata';
          probe.onloadedmetadata = () => resolve(probe.duration || 0);
          probe.onerror = () => resolve(0);
          probe.src = URL.createObjectURL(file);
        });
        if (seconds) form.append('duration_ms', String(Math.round(seconds * 1000)));
      }
      const res = await fetch(base, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        take(body);
        setDraft({ name: '', tags: '', team_tag: '', player: '' });
        if (fileRef.current) fileRef.current.value = '';
        setNote(tt('media.added', 'Added. Press Play to put it on air.'));
      } else {
        setError(apiMessage(tt, body, 'media.addFailed', 'That file was not added.'));
      }
    } catch (err) {
      setError(apiMessage(tt, err, 'media.addFailed', 'That file was not added.'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (asset) => {
    setBusy(true);
    setError('');
    setNote('');
    try {
      const res = await fetch(`${base}${asset.id}/`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        take(body);
        setNote(tt('media.removed', '{name} removed.').replace('{name}', asset.name));
      } else {
        setError(apiMessage(tt, body, 'media.removeFailed', 'That was not removed.'));
      }
    } catch (err) {
      setError(apiMessage(tt, err, 'media.removeFailed', 'That was not removed.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={styles.wrap}>
      <h3 className={styles.title}>{tt('media.title', 'Clips and pictures')}</h3>
      <p className={styles.sub}>
        {tt('media.sub', 'Upload a player b-roll, a walk-on, a highlight or a still once, and put it on air whenever you need it. Give it words you will reach for in a hurry: a team tag, a player, or anything you will remember.')}
      </p>

      {error && <p className={styles.error}>{error}</p>}
      {note && <p className={styles.note}>{note}</p>}

      {loading && <p className={styles.muted}>{tt('media.loading', 'Loading...')}</p>}

      {!loading && (
        <>
          <div className={styles.rows}>
            {assets.length === 0 && (
              <p className={styles.muted}>
                {tt('media.nothingYet', 'Nothing here yet.')}
              </p>
            )}
            {assets.map((a) => (
              <div key={a.id} className={styles.row}>
                <div className={styles.thumb}>
                  {a.kind === 'video'
                    ? <video className={styles.thumbMedia} src={a.url} muted playsInline preload="metadata" />
                    : <img className={styles.thumbMedia} src={a.url} alt="" />}
                </div>
                <div className={styles.rowMain}>
                  <span className={styles.rowName}>{a.name}</span>
                  <span className={styles.rowMeta}>
                    {[a.kind === 'video' ? tt('media.clip', 'Clip') : tt('media.picture', 'Picture'),
                      mb(a.size_bytes),
                      a.duration_ms ? `${Math.round(a.duration_ms / 1000)}s` : null,
                      a.team_tag || null,
                      a.player ? `@${a.player}` : null,
                      ...(a.tags || []),
                    ].filter(Boolean).join(' · ')}
                  </span>
                </div>
                <button type="button" className={styles.primary} disabled={busy || !live}
                        title={live ? undefined : tt('media.startFirst', 'Start a broadcast first.')}
                        onClick={() => onPlay?.(a)}>
                  {tt('media.play', 'Play on air')}
                </button>
                <button type="button" className={styles.ghost} disabled={busy}
                        onClick={() => remove(a)}>
                  {tt('media.remove', 'Remove')}
                </button>
              </div>
            ))}
          </div>

          <div className={styles.add}>
            <div className={styles.fields}>
              <label className={styles.field}>
                <span className={styles.label}>{tt('media.name', 'Name it')}</span>
                <input className={styles.input} value={draft.name}
                       placeholder={tt('media.namePlaceholder', 'Zainab walk-on')}
                       onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>{tt('media.tags', 'Words to find it by')}</span>
                <input className={styles.input} value={draft.tags}
                       placeholder={tt('media.tagsPlaceholder', 'walkon final hype')}
                       onChange={(e) => setDraft((d) => ({ ...d, tags: e.target.value }))} />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>{tt('media.teamTag', 'About which team')}</span>
                <input className={styles.input} value={draft.team_tag}
                       placeholder="ALPHA"
                       onChange={(e) => setDraft((d) => ({ ...d, team_tag: e.target.value }))} />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>{tt('media.player', 'About which player')}</span>
                <input className={styles.input} value={draft.player}
                       placeholder="demo_zainab"
                       onChange={(e) => setDraft((d) => ({ ...d, player: e.target.value }))} />
              </label>
            </div>
            <div className={styles.addRow}>
              <input ref={fileRef} className={styles.file} type="file" disabled={busy}
                     accept="video/mp4,video/webm,video/quicktime,image/png,image/jpeg,image/webp,image/gif"
                     onChange={(e) => upload(e.target.files?.[0])} />
              <span className={styles.muted}>
                {tt('media.limits', 'Up to {file} a file, {total} in all. {used} used.')
                  .replace('{file}', mb(maxFile))
                  .replace('{total}', `${Math.round((limit || 0) / (1024 ** 3))} GB`)
                  .replace('{used}', mb(used))}
              </span>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
