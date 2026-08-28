'use client';

// Who is behind an event: sponsors and partners, edited after the event exists.
//
// They could only be set inside the creation wizard, so an event was frozen the
// moment it was made. A sponsor who signed on in week three could not be added,
// one who pulled out could not be removed, and a logo uploaded at the wrong
// size could not be replaced. The event page rendered them and nothing could
// write them.
//
// A partner is a sponsor with a different word on it, so this is one list with
// a `kind` on each row rather than two editors that would drift apart.

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiMessage } from '@/lib/apiMessage';
import { useT } from '@/i18n/LanguageProvider';
import styles from './sponsor-editor.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function SponsorEditor({ eventRef, token }) {
  const tt = useT();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState({ name: '', kind: 'sponsor', website: '' });
  const [logo, setLogo] = useState(null);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    if (!eventRef || !token) { setLoading(false); return; }
    try {
      const res = await fetch(`${API}/event/${eventRef}/sponsors/manage/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') setRows(body.data.sponsors || []);
      else setError(apiMessage(tt, body, 'api.failed', 'Failed.'));
    } catch {
      setError(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
    } finally {
      // Cleared whatever happened. A guard that returns early without this is
      // how a page ends up spinning for ever.
      setLoading(false);
    }
  }, [eventRef, token, tt]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  const add = async () => {
    if (!draft.name.trim()) return;
    setBusy(true);
    setError('');
    try {
      // multipart, because a logo is a file. The organiser is uploading real
      // artwork here rather than pasting a URL to somebody else's server.
      const form = new FormData();
      form.append('name', draft.name.trim());
      form.append('kind', draft.kind);
      if (draft.website.trim()) form.append('website', draft.website.trim());
      if (logo) form.append('logo', logo);

      const res = await fetch(`${API}/event/${eventRef}/sponsors/manage/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setRows(prev => [...prev, body.data.sponsor]);
        setDraft({ name: '', kind: 'sponsor', website: '' });
        setLogo(null);
        if (fileRef.current) fileRef.current.value = '';
        setNotice(tt('sponsors.added', 'Added.'));
      } else {
        setError(apiMessage(tt, body, 'api.failed', 'Failed.'));
      }
    } catch {
      setError(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async row => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`${API}/event/${eventRef}/sponsors/${row.id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setRows(prev => prev.filter(r => r.id !== row.id));
        setNotice(tt('sponsors.removed', 'Removed.'));
      } else {
        setError(apiMessage(tt, body, 'api.failed', 'Failed.'));
      }
    } catch {
      setError(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
    } finally {
      setBusy(false);
    }
  };

  const replaceLogo = async (row, file) => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.append('logo', file);
      const res = await fetch(`${API}/event/${eventRef}/sponsors/${row.id}/`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setRows(prev => prev.map(r => (r.id === row.id ? body.data.sponsor : r)));
        setNotice(tt('sponsors.logoSaved', 'Logo replaced.'));
      } else {
        setError(apiMessage(tt, body, 'api.failed', 'Failed.'));
      }
    } catch {
      setError(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={styles.wrap}>
      <h3 className={styles.title}>{tt('sponsors.title', 'Sponsors and partners')}</h3>
      <p className={styles.hint}>
        {tt('sponsors.hint', 'These appear on the event page. A partner is listed under its own heading; everything else is the same.')}
      </p>

      {loading ? <p className={styles.muted}>{tt('ui.loading', 'Loading…')}</p>
        : rows.length === 0
          ? <p className={styles.muted}>
              {tt('sponsors.none', 'Nobody added yet. Whoever you add here shows on the event page.')}
            </p>
          : <ul className={styles.rows}>
              {rows.map(row => (
                <li key={row.id} className={styles.row}>
                  <span className={styles.logoBox}>
                    {row.logo
                      ? <img src={row.logo} alt={row.name} className={styles.logo} />
                      : <span className={styles.noLogo}>
                          {tt('sponsors.noLogo', 'No logo')}
                        </span>}
                  </span>
                  <span className={styles.rowMain}>
                    <strong className={styles.rowName}>{row.name}</strong>
                    <span className={styles.rowKind}>
                      {row.kind === 'partner'
                        ? tt('sponsors.kindPartner', 'Partner')
                        : tt('sponsors.kindSponsor', 'Sponsor')}
                    </span>
                    {row.website && <span className={styles.rowUrl}>{row.website}</span>}
                  </span>
                  <span className={styles.rowActions}>
                    <label className={styles.replaceBtn}>
                      {tt('sponsors.replaceLogo', 'Replace logo')}
                      <input type="file" accept="image/*" hidden disabled={busy}
                             onChange={e => replaceLogo(row, e.target.files?.[0])} />
                    </label>
                    <button type="button" className={styles.removeBtn} disabled={busy}
                            onClick={() => remove(row)}>
                      {tt('sponsors.remove', 'Remove')}
                    </button>
                  </span>
                </li>
              ))}
            </ul>}

      <div className={styles.newRow}>
        <input className={styles.input} value={draft.name}
               placeholder={tt('sponsors.namePlaceholder', 'Their name')}
               onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
        <select className={styles.input} value={draft.kind}
                onChange={e => setDraft(d => ({ ...d, kind: e.target.value }))}>
          <option value="sponsor">{tt('sponsors.kindSponsor', 'Sponsor')}</option>
          <option value="partner">{tt('sponsors.kindPartner', 'Partner')}</option>
        </select>
        <input className={styles.input} value={draft.website}
               placeholder={tt('sponsors.sitePlaceholder', 'Their website (optional)')}
               onChange={e => setDraft(d => ({ ...d, website: e.target.value }))} />
        <label className={styles.fileBtn}>
          {logo ? logo.name.slice(0, 24) : tt('sponsors.pickLogo', 'Choose a logo')}
          <input ref={fileRef} type="file" accept="image/*" hidden
                 onChange={e => setLogo(e.target.files?.[0] || null)} />
        </label>
        <button type="button" className={styles.addBtn} disabled={busy || !draft.name.trim()}
                onClick={add}>
          {tt('sponsors.add', 'Add them')}
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {notice && <p className={styles.notice}>{notice}</p>}
    </section>
  );
}
