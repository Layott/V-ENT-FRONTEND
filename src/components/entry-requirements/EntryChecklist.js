'use client';

// What the person entering still owes, shown BEFORE they pay anything.
//
// Telling somebody they are not eligible after they have filled in a form and
// pressed pay is how a registration flow loses people, and a refusal that says
// only "not eligible" sends them to support. So every row here names the one
// thing to do, and the ones they can answer here have the box to answer in.

import { useCallback, useEffect, useState } from 'react';
import { LuCheck, LuClock, LuTriangleAlert } from 'react-icons/lu';
import { apiMessage } from '@/lib/apiMessage';
import { useT } from '@/i18n/LanguageProvider';
import styles from './entry-checklist.module.css';

const base = () => `${process.env.NEXT_PUBLIC_API_URL}/tournament`;

export default function EntryChecklist({ tournamentId, token, onStatus }) {
  const tt = useT();

  const [rows, setRows] = useState(null);
  const [mayEnter, setMayEnter] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState({});
  const [sending, setSending] = useState(null);

  const load = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`${base()}/${tournamentId}/requirements/mine/`,
        { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setRows(body.data.requirements || []);
        setMayEnter(Boolean(body.data.may_enter));
        if (onStatus) onStatus(body.data);
        return;
      }
      setError(apiMessage(tt, body, 'api.requirementsLoadFailed',
        'Could not load the entry requirements.'));
    } catch {
      setError(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
    } finally {
      setLoading(false);
    }
  }, [tournamentId, token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const send = async row => {
    const value = drafts[row.kind];
    if (!value || (typeof value === 'string' && !value.trim())) return;
    setSending(row.kind);
    try {
      const res = await fetch(
        `${base()}/${tournamentId}/requirements/${row.id}/submit/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ value }),
        });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setDrafts(d => ({ ...d, [row.kind]: '' }));
        load();
        return;
      }
      setError(apiMessage(tt, body, 'api.submitFailed', 'Could not send that.'));
    } catch {
      setError(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
    } finally {
      setSending(null);
    }
  };

  if (loading) return <p className={styles.state}>{tt('ui.loading.33ce', 'Loading…')}</p>;
  if (!rows || rows.length === 0) return null;

  return (
    <div className={styles.wrap}>
      <h3 className={styles.title}>
        {mayEnter
          ? tt('entry.allDone', 'You have everything this tournament asks for')
          : tt('entry.todo', 'Before you can enter')}
      </h3>

      <ul className={styles.list}>
        {rows.map(row => (
          <li key={row.kind} className={styles.row}>
            <span className={row.met ? styles.markMet : styles.markTodo} aria-hidden="true">
              {row.met ? <LuCheck /> : row.needs_submission ? <LuTriangleAlert /> : <LuClock />}
            </span>

            <div className={styles.body}>
              <span className={row.met ? styles.labelMet : styles.label}>
                {row.met ? row.label : row.reason || row.label}
              </span>

              {!row.required && (
                <span className={styles.optional}>{tt('entry.optional', 'Optional')}</span>
              )}

              {row.config?.help && <span className={styles.help}>{row.config.help}</span>}

              {row.config?.url && (
                <a className={styles.link} href={row.config.url}
                   target="_blank" rel="noopener noreferrer">
                  {tt('entry.open', 'Open the download')}
                </a>
              )}

              {Array.isArray(row.config?.links) && row.config.links.map(url => (
                <a key={url} className={styles.link} href={url}
                   target="_blank" rel="noopener noreferrer">{url}</a>
              ))}

              {!row.met && row.needs_submission && (
                <div className={styles.sendRow}>
                  <input
                    className={styles.text}
                    value={drafts[row.kind] || ''}
                    onChange={e => setDrafts(d => ({ ...d, [row.kind]: e.target.value }))}
                    placeholder={row.config?.field_label
                      || tt('entry.yourAnswer', 'Your answer')}
                    aria-label={row.config?.field_label || row.label}
                  />
                  <button type="button" className={styles.send} disabled={sending === row.kind}
                          onClick={() => send(row)}>
                    {sending === row.kind
                      ? tt('ui.sending.4a1c', 'Sending…')
                      : tt('entry.send', 'Send')}
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
