'use client';

// Who may enter results for this tournament.
//
// CEO, 3 September 2026: "there will be a place to input results on the
// website inside the tournament and then only those given the access to,
// should be able to."
//
// The organiser names scorekeepers here, by username. A scorekeeper opens the
// console and sees Match Control and nothing else; the API refuses them
// everything else too. Removing somebody revokes it at once. Only the
// organiser sees this panel at all: a scorekeeper may not add another.

import { useCallback, useEffect, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import Avatar from '@/components/avatar/Avatar';
import styles from './results-desk.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function ResultsDesk({ tournamentRef, token }) {
  const tt = useT();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [username, setUsername] = useState('');

  const call = useCallback(async (path, options = {}) => {
    const res = await fetch(`${API}/tournament/${tournamentRef}/staff/${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
    let body = {};
    try { body = await res.json(); } catch { body = {}; }
    return { ok: res.ok && body.status === 'success', body };
  }, [tournamentRef, token]);

  const load = useCallback(async () => {
    if (!token || !tournamentRef) { setLoading(false); return; }
    const { ok, body } = await call('');
    if (ok) {
      setRows(body.data.staff || []);
      setError('');
    } else {
      setError(apiMessage(tt, body, 'desk.loadFailed', 'Could not load who may enter results.'));
    }
    setLoading(false);
  }, [call, token, tournamentRef]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const add = async (e) => {
    e.preventDefault();
    const name = username.trim().replace(/^@/, '');
    if (!name) return;
    setBusy(true);
    setError('');
    setNote('');
    const { ok, body } = await call('', { method: 'POST', body: JSON.stringify({ username: name }) });
    setBusy(false);
    if (ok) {
      setRows(body.data.staff || []);
      setUsername('');
      setNote(body.data.added
        ? tt('desk.added', '{name} can now enter results.').replace('{name}', name)
        : tt('desk.alreadyAdded', '{name} already could.').replace('{name}', name));
    } else {
      setError(apiMessage(tt, body, 'desk.addFailed', 'That did not work.'));
    }
  };

  const remove = async (row) => {
    setBusy(true);
    setError('');
    setNote('');
    const { ok, body } = await call(`${row.user_id ?? row.id}/`, { method: 'DELETE' });
    setBusy(false);
    if (ok) {
      setRows(body.data.staff || []);
      setNote(tt('desk.removed', '{name} can no longer enter results.').replace('{name}', row.username));
    } else {
      setError(apiMessage(tt, body, 'desk.removeFailed', 'That did not work.'));
    }
  };

  return (
    <section className={styles.desk}>
      <h3 className={styles.title}>{tt('desk.title', 'Who may enter results')}</h3>
      <p className={styles.sub}>
        {tt('desk.sub', 'You always can. Anybody you name here can open this console and enter results, and do nothing else: not edit the tournament, not run the studio, not name anybody. The standings, the studio and every overlay read whatever is entered here.')}
      </p>

      {loading && <p className={styles.muted}>{tt('desk.loading', 'Loading...')}</p>}
      {error && <p className={styles.error}>{error}</p>}
      {note && <p className={styles.note}>{note}</p>}

      {!loading && (
        <div className={styles.rows}>
          {rows.length === 0 && (
            <p className={styles.muted}>{tt('desk.nobodyYet', 'Nobody yet. Only you can enter results.')}</p>
          )}
          {rows.map((row) => (
            <div key={row.user_id ?? row.id} className={styles.row}>
              <Avatar src={row.avatar} name={row.username} size={36} />
              <div className={styles.rowMain}>
                <span className={styles.rowName}>@{row.username}</span>
                {row.full_name && row.full_name !== row.username && (
                  <span className={styles.rowMeta}>{row.full_name}</span>
                )}
              </div>
              <span className={styles.roleTag}>{tt('desk.scorekeeper', 'Scorekeeper')}</span>
              <button type="button" className={styles.ghost} disabled={busy}
                      onClick={() => remove(row)}>
                {tt('desk.remove', 'Remove')}
              </button>
            </div>
          ))}
        </div>
      )}

      <form className={styles.addRow} onSubmit={add}>
        <input className={styles.input} value={username}
               placeholder={tt('desk.usernamePlaceholder', 'Username, as on their profile')}
               onChange={(e) => setUsername(e.target.value)} />
        <button type="submit" className={styles.primary} disabled={busy || !username.trim()}>
          {tt('desk.add', 'Let them enter results')}
        </button>
      </form>
    </section>
  );
}
