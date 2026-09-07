'use client';

// The Discord channels a tournament or an event announces into.
//
// CEO, 7 September 2026, on webhook announcements: "Simplest by a distance,
// and it covers tournament starting, bracket updated, tickets live."
//
// ## One component, both owners
//
// `kind` is 'tournament' or 'event' and nothing else here differs. Building
// this for tournaments and leaving events until later is the fault with its
// own hard rule, and it has happened seven times on this platform.
//
// ## The URL is a secret and is never displayed
//
// A webhook URL is not a name, it is a capability: anybody holding it can post
// into that channel as V-ENT. The API returns `hint` instead - a label and the
// last four characters - which is enough to tell two apart and useless to
// anybody who reads the response. There is deliberately no way to edit a URL,
// because editing something you cannot see is not a thing anybody can do.

import { useCallback, useEffect, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { formatDateTime } from '@/lib/datetime';
import { useAutoRefresh } from '@/lib/useLiveData';
import styles from './discord-channels.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function DiscordChannels({ kind, reference, token, showToast }) {
  const tt = useT();
  const [rows, setRows] = useState([]);
  const [choices, setChoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);

  const base = `${API}/auth/discord/webhooks/${kind}/${reference}/`;

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!reference || !token) { setLoading(false); return; }
    if (!quiet) setLoading(true);
    try {
      const res = await fetch(base, { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json().catch(() => ({}));
      if (body?.status === 'success') {
        setRows(body.data.webhooks || []);
        setChoices(body.data.choices || []);
        setError('');
      } else if (!quiet) {
        setError(apiMessage(tt, body, 'discord.loadFailed', 'Could not load the Discord channels.'));
      }
    } catch (err) {
      if (!quiet) setError(apiMessage(tt, err, 'discord.loadFailed', 'Could not load the Discord channels.'));
    } finally {
      if (!quiet) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, token, tt]);

  useAutoRefresh(() => load({ quiet: true }), [], { interval: 30000 });

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(base, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), label: label.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (body?.status !== 'success') {
        setError(apiMessage(tt, body, 'discord.addFailed', 'That was not added.'));
        return;
      }
      // The URL leaves the screen the moment it is saved. It is a secret, and
      // an input still holding it is a secret sitting on somebody's monitor.
      setUrl('');
      setLabel('');
      showToast?.(body.message);
      await load({ quiet: true });
    } catch (err) {
      setError(apiMessage(tt, err, 'discord.addFailed', 'That was not added.'));
    } finally {
      setBusy(false);
    }
  };

  const patch = async (id, payload) => {
    try {
      await fetch(`${base}${id}/`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      await load({ quiet: true });
    } catch { /* the next refresh corrects the screen */ }
  };

  const remove = async id => {
    try {
      await fetch(`${base}${id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast?.(tt('discord.removed', 'Removed.'));
      await load({ quiet: true });
    } catch { /* same */ }
  };

  if (loading) return <p className={styles.muted}>{tt('discord.loading', 'Loading...')}</p>;

  return (
    <section className={styles.panel}>
      <h3 className={styles.title}>{tt('discord.title', 'Announce in Discord')}</h3>
      <p className={styles.hint}>
        {tt('discord.hint', 'Post updates straight into a Discord channel. In Discord: Server Settings, Integrations, Webhooks, New Webhook, then Copy Webhook URL and paste it here.')}
      </p>

      {error && <p className={styles.error} role="alert">{error}</p>}

      {rows.length === 0 ? (
        <p className={styles.muted}>
          {tt('discord.none', 'No Discord channel yet. Paste a webhook URL below and a test message is posted straight away, so you know it works before anything real happens.')}
        </p>
      ) : (
        <ul className={styles.list}>
          {rows.map(row => (
            <li key={row.id} className={styles.row}>
              <div className={styles.rowMain}>
                <span className={styles.rowName}>{row.hint}</span>
                {row.last_error
                  ? <span className={styles.badgeBad}>{row.last_error}</span>
                  : row.last_ok_at
                    ? <span className={styles.badgeOk}>
                        {tt('discord.lastOk', 'Last posted {when}')
                          .replace('{when}', formatDateTime(row.last_ok_at))}
                      </span>
                    : null}
              </div>

              <div className={styles.kinds}>
                {choices.map(([value, name]) => {
                  const on = (row.events || []).includes(value);
                  return (
                    <button key={value} type="button"
                            className={on ? styles.kindOn : styles.kind}
                            aria-pressed={on}
                            onClick={() => patch(row.id, {
                              events: on
                                ? (row.events || []).filter(e => e !== value)
                                : [...(row.events || []), value],
                            })}>
                      {tt(`discord.kind.${value}`, name)}
                    </button>
                  );
                })}
              </div>

              <div className={styles.rowActions}>
                <button type="button" className={styles.ghost}
                        onClick={() => patch(row.id, { active: !row.active })}>
                  {row.active ? tt('discord.pause', 'Pause') : tt('discord.resume', 'Resume')}
                </button>
                <button type="button" className={styles.ghost}
                        onClick={() => remove(row.id)}>
                  {tt('discord.remove', 'Remove')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.addRow}>
        <label className={styles.field}>
          <span className={styles.label}>{tt('discord.url', 'Webhook URL')}</span>
          <input className={styles.input} type="url" value={url}
                 placeholder="https://discord.com/api/webhooks/..."
                 onChange={e => setUrl(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{tt('discord.label', 'What to call it')}</span>
          <input className={styles.input} type="text" maxLength={80} value={label}
                 placeholder={tt('discord.labelEg', 'announcements')}
                 onChange={e => setLabel(e.target.value)} />
        </label>
      </div>
      <button type="button" className={styles.save} onClick={add}
              disabled={busy || !url.trim()}>
        {busy ? tt('discord.adding', 'Connecting...') : tt('discord.add', 'Connect this channel')}
      </button>
    </section>
  );
}
