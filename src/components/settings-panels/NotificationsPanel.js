'use client';

/**
 * Settings > Notifications: which notifications reach this person, and how.
 *
 * CEO, 30 September 2026: "All the switches must work as listed or shown in
 * their profiles. If they put on or off something for discord or push or email
 * or in app, it must work as each user set it."
 *
 * The grid used to be drawn from a list typed into this file, saved as a blob
 * the server never read. Now the rows, the channels and each switch's state come
 * from the server (`/setting/notifications/grid/`), which is the same list
 * delivery reads (`vent_auth/notify_prefs.py`), so a switch shown here is a
 * switch that is obeyed. SMS is shown as coming soon, never as a live option;
 * account notices are always on in the inbox and by email, and say so; a module
 * that is closed has no row at all.
 */
import InfoTip from '@/components/info-tip/InfoTip';
import { useCallback, useEffect, useState } from 'react';
import shared from './settingsShared.module.css';
import styles from './NotificationsPanel.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useViewer } from '@/lib/gating';
import { apiMessage } from '@/lib/apiMessage';

const API = process.env.NEXT_PUBLIC_API_URL;

const CHANNEL_LABEL = {
  in_app: ['notif.channel.in_app', 'In-app'],
  email: ['notif.channel.email', 'Email'],
  push: ['notif.channel.push', 'Push'],
  discord: ['notif.channel.discord', 'Discord'],
  sms: ['notif.channel.sms', 'SMS'],
};

const ROW_TEXT = {
  tournaments: ['Tournaments and matches', 'Registrations, results, match times, disputes and prizes.'],
  teams: ['Teams', 'Invites, join requests, new members and role changes.'],
  events: ['Events and tickets', 'Tickets, reminders and messages from organisers.'],
  wallet: ['Wallet', 'Coins received and wallet activity.'],
  mentions: ['Mentions and replies', 'When somebody tags you or replies to you.'],
  followers: ['New followers', 'When somebody follows you.'],
  dms: ['Direct messages', 'New messages sent to you.'],
  marketplace: ['Marketplace orders', 'Order updates and delivery.'],
  anime: ['Anime', 'Reading rooms, new chapters and invites.'],
  account: ['Your account', 'Payouts, identity checks and security. Always in your inbox and by email.'],
};

const keyOf = (row, channel) => `${row}__${channel}`;

// A browser push subscription needs the server's public key as bytes.
const keyBytes = (base64) => {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

function PushDevice({ push, token, tt, onChanged }) {
  // unsupported | blocked | off | on | working
  const [state, setState] = useState('checking');
  const [note, setNote] = useState('');

  const check = useCallback(async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)
      || !('Notification' in window)) {
      setState('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setState('blocked');
      return;
    }
    const reg = await navigator.serviceWorker.getRegistration('/');
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    setState(sub ? 'on' : 'off');
  }, []);

  useEffect(() => { check().catch(() => setState('off')); }, [check]);

  const call = async (path, body) => {
    const res = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body || {}),
    });
    return res.json().catch(() => ({}));
  };

  const turnOn = async () => {
    setState('working');
    setNote('');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'blocked' : 'off');
        return;
      }
      const reg = await navigator.serviceWorker.register('/door-sw.js');
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes(push.public_key),
      });
      const out = await call('/auth/push/subscribe/', sub.toJSON());
      if (out.status !== 'success') {
        await sub.unsubscribe().catch(() => {});
        setNote(apiMessage(tt, out, 'notif.push.failed', 'Push could not be turned on. Try again.'));
        setState('off');
        return;
      }
      setState('on');
      setNote(tt('notif.push.nowOn', 'Push is on for this browser. Send yourself a test to see one arrive.'));
      onChanged?.();
    } catch {
      setNote(tt('notif.push.failed', 'Push could not be turned on. Try again.'));
      setState('off');
    }
  };

  const turnOff = async () => {
    setState('working');
    try {
      const reg = await navigator.serviceWorker.getRegistration('/');
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await call('/auth/push/unsubscribe/', { endpoint: sub.endpoint });
        await sub.unsubscribe().catch(() => {});
      }
      setNote(tt('notif.push.nowOff', 'Push is off for this browser.'));
      onChanged?.();
    } finally {
      setState('off');
    }
  };

  const test = async () => {
    setNote('');
    const out = await call('/auth/push/test/');
    setNote(out.status === 'success'
      ? tt('notif.push.testSent', 'Test sent. It should appear in a few seconds.')
      : apiMessage(tt, out, 'notif.push.testFailed', 'The test did not send. Try again.'));
  };

  if (!push?.configured) {
    return <p className={styles.deviceText}>{tt('notif.push.notSetUp', 'Push notifications are not switched on for V-ENT yet. Your choices below are kept and will apply once they are.')}</p>;
  }
  return (
    <div className={styles.device}>
      <div>
        <p className={styles.deviceTitle}>{tt('notif.push.thisBrowser', 'Push on this browser')}</p>
        <p className={styles.deviceText}>
          {state === 'unsupported' && tt('notif.push.unsupported', 'This browser cannot receive push notifications. On an iPhone, add V-ENT to your home screen first.')}
          {state === 'blocked' && tt('notif.push.blocked', 'Notifications are blocked for V-ENT in this browser. Allow them in the browser’s site settings, then come back here.')}
          {state === 'off' && tt('notif.push.offHere', 'Off here. Turn it on to get the Push column below on this device.')}
          {state === 'on' && tt('notif.push.onHere', 'On here. The Push column below decides what arrives.')}
          {(state === 'checking' || state === 'working') && tt('ui.loading.33ce', 'Loading…')}
        </p>
        {note && <p className={styles.deviceNote} role="status">{note}</p>}
      </div>
      <div className={styles.deviceActions}>
        {state === 'off' && <button type="button" className={`${shared.btn} ${shared.btnSm} ${shared.goldBTN}`} onClick={turnOn}>
          {tt('notif.push.turnOn', 'Turn on push')}
        </button>}
        {state === 'on' && <>
          <button type="button" className={`${shared.btn} ${shared.btnSm} ${shared.goldBTN}`} onClick={test}>
            {tt('notif.push.sendTest', 'Send a test')}
          </button>
          <button type="button" className={`${shared.btn} ${shared.btnSm} ${styles.quietBtn}`} onClick={turnOff}>
            {tt('notif.push.turnOff', 'Turn off here')}
          </button>
        </>}
      </div>
    </div>
  );
}

const NotificationsPanel = ({ onSave }) => {
  const tt = useT();
  const { token, loading: sessionLoading } = useViewer();
  const [grid, setGrid] = useState(null);
  const [status, setStatus] = useState('loading');
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setStatus('loading');
    try {
      const res = await fetch(`${API}/setting/notifications/grid/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (body.status !== 'success') throw new Error('grid');
      setGrid(body.data);
      setStatus('ready');
    } catch {
      setStatus('failed');
    }
  }, [token]);

  useEffect(() => { if (!sessionLoading) load(); }, [sessionLoading, load]);

  const save = async (changes) => {
    const before = grid;
    // Shown at once, put back if the server refuses.
    setGrid((g) => ({
      ...g,
      rows: g.rows.map((r) => ({
        ...r,
        channels: Object.fromEntries(Object.entries(r.channels).map(([c, v]) => {
          const k = keyOf(r.id, c);
          return [c, k in changes ? changes[k] : v];
        })),
      })),
    }));
    setSaving(true);
    setProblem('');
    const out = await onSave?.(changes);
    setSaving(false);
    if (out?.status === 'success' && out.data?.grid) {
      setGrid((g) => ({ ...g, ...out.data.grid }));
    } else if (out && out.status !== 'success') {
      setGrid(before);
      setProblem(apiMessage(tt, out, 'api.saveFailed', 'Save failed'));
    }
  };

  const toggle = (row, channel, value) => save({ [keyOf(row, channel)]: value });

  const setColumn = (channel, value) => {
    const changes = {};
    grid.rows.forEach((r) => {
      if (!r.locked.includes(channel)) changes[keyOf(r.id, channel)] = value;
    });
    save(changes);
  };

  const columnAllOn = (channel) => grid.rows.every((r) => r.channels[channel]);
  const label = (channel) => tt(...CHANNEL_LABEL[channel]);

  return (
    <div className={shared.formStack}>
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>
          {tt('ui.notification.preferences.0ead', 'Notification preferences')}<InfoTip id="notificationPrefs" />
        </h3>
        <p className={shared.cardSub}>
          {tt('notif.intro', 'Choose how you hear about each thing. Every switch is followed exactly as you set it, and changes save straight away')}{saving ? '…' : '.'}
        </p>

        {status === 'loading' && <p className={styles.deviceText}>{tt('ui.loading.33ce', 'Loading…')}</p>}
        {status === 'failed' && <p className={styles.problem} role="alert">
          {tt('notif.loadFailed', 'Your notification settings could not be loaded.')}{' '}
          <button type="button" className={styles.linkBtn} onClick={load}>{tt('ui.retry.9f5c', 'Retry')}</button>
        </p>}
        {problem && <p className={styles.problem} role="alert">{problem}</p>}

        {status === 'ready' && grid && <>
          <PushDevice push={grid.push} token={token} tt={tt} onChanged={load} />

          <div className={styles.tableWrap}>
            <table className={styles.matrix}>
              <thead>
                <tr>
                  <th className={styles.eventCol}>{tt('notif.whatCol', 'What')}</th>
                  {grid.channels.map((c) => <th key={c} className={styles.chanCol}>
                    <div className={styles.chanHead}>
                      <span>{label(c)}</span>
                      <button type="button" className={styles.allBtn} onClick={() => setColumn(c, !columnAllOn(c))}>
                        {columnAllOn(c) ? tt('notif.allOff', 'All off') : tt('notif.allOn', 'All on')}
                      </button>
                    </div>
                  </th>)}
                  {grid.coming_soon.map((c) => <th key={c} className={styles.chanCol}>
                    <div className={styles.chanHead}>
                      <span className={styles.soonLabel}>{label(c)}</span>
                      <span className={styles.soonChip}>{tt('notif.comingSoon', 'Coming soon')}</span>
                    </div>
                  </th>)}
                </tr>
              </thead>
              <tbody>
                {grid.rows.map((r) => {
                  const [name, sub] = ROW_TEXT[r.id] || [r.id, ''];
                  return <tr key={r.id}>
                    <td className={styles.eventCol}>
                      <div className={styles.eventLabel}>{tt(`notif.row.${r.id}`, name)}</div>
                      <div className={styles.eventSub}>{tt(`notif.row.${r.id}.sub`, sub)}</div>
                    </td>
                    {grid.channels.map((c) => {
                      const locked = r.locked.includes(c);
                      return <td key={c} className={styles.toggleCell}>
                        <label className={shared.toggle} title={locked ? tt('notif.alwaysOn', 'Always on') : undefined}>
                          <input type="checkbox" checked={!!r.channels[c]} disabled={locked}
                            onChange={(e) => toggle(r.id, c, e.target.checked)}
                            aria-label={`${tt(`notif.row.${r.id}`, name)}: ${label(c)}`} />
                          <span className={shared.toggleSlider} />
                        </label>
                      </td>;
                    })}
                    {grid.coming_soon.map((c) => <td key={c} className={styles.toggleCell}>
                      <span className={styles.soonCell}>{tt('notif.soon', 'Soon')}</span>
                    </td>)}
                  </tr>;
                })}
              </tbody>
            </table>
          </div>

          <p className={styles.footnote}>
            {tt('notif.discordNote', 'Discord messages arrive only once your Discord account is connected, with direct messages on, in Linked accounts.')}
          </p>
        </>}
      </div>
    </div>
  );
};

export default NotificationsPanel;
