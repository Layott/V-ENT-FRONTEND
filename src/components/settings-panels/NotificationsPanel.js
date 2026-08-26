'use client';

import InfoTip from '@/components/info-tip/InfoTip';
import { useState, useEffect } from 'react';
import shared from './settingsShared.module.css';
import styles from './NotificationsPanel.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';

// Channels (columns).
const CHANNELS = [{
  id: 'push',
  label: 'Push'
}, {
  id: 'email',
  label: 'Email'
}, {
  id: 'sms',
  label: 'SMS'
}, {
  id: 'in_app',
  label: 'In-app'
}];

// Event rows. Each row stores per-channel keys derived from id+channel.
const ROWS = [{
  id: 'tournament_invite',
  label: 'Tournament invites',
  sub: 'When someone invites you to compete.'
}, {
  id: 'tournament_result',
  label: 'Tournament results',
  sub: 'Match outcomes and bracket progression.'
}, {
  id: 'event_reminder',
  label: 'Event reminders',
  sub: 'Upcoming events on your calendar.'
}, {
  id: 'wallet_activity',
  label: 'Wallet activity',
  sub: 'Top-ups, sends, and withdrawals.'
}, {
  id: 'marketplace_orders',
  label: 'Marketplace orders',
  sub: 'Order updates and delivery status.'
}, {
  id: 'wager_updates',
  label: 'Wager updates',
  sub: 'Wager match results and payouts.'
}, {
  id: 'dms',
  label: 'Direct messages',
  sub: 'New private messages.'
}, {
  id: 'mentions',
  label: 'Mentions',
  sub: 'When you are tagged in a post or comment.'
}, {
  id: 'followers',
  label: 'New followers',
  sub: 'When someone follows you.'
}, {
  id: 'newsletter',
  label: 'Newsletter',
  sub: 'Monthly recap, product news, releases.'
}];

// Sensible defaults: mostly push + in-app on, email on for important rows, SMS off.
const DEFAULT_KEY = (rowId, channel) => `${rowId}__${channel}`;
const buildDefaults = () => {
  const out = {};
  ROWS.forEach(r => {
    out[DEFAULT_KEY(r.id, 'push')] = true;
    out[DEFAULT_KEY(r.id, 'in_app')] = true;
    out[DEFAULT_KEY(r.id, 'email')] = ['tournament_result', 'wallet_activity', 'marketplace_orders', 'newsletter'].includes(r.id);
    out[DEFAULT_KEY(r.id, 'sms')] = false;
  });
  return out;
};
const buildMatrixFromBackend = n => {
  // Best-effort map from the flat shape in mockSettingsState.notifications
  // (push_enabled / email_enabled / sms_enabled toggles) onto the matrix.
  const matrix = buildDefaults();
  if (!n || typeof n !== 'object') return matrix;
  // If matrix-shaped fields exist (rowId__channel keys), use them directly.
  let usedDirect = false;
  Object.keys(n).forEach(k => {
    if (k.includes('__')) {
      matrix[k] = !!n[k];
      usedDirect = true;
    }
  });
  if (usedDirect) return matrix;

  // Otherwise apply channel-wide masters.
  const pushOn = n.push_enabled !== false;
  const emailOn = n.email_enabled !== false;
  const smsOn = n.sms_enabled === true;
  ROWS.forEach(r => {
    matrix[DEFAULT_KEY(r.id, 'push')] = pushOn && matrix[DEFAULT_KEY(r.id, 'push')];
    matrix[DEFAULT_KEY(r.id, 'email')] = emailOn && matrix[DEFAULT_KEY(r.id, 'email')];
    matrix[DEFAULT_KEY(r.id, 'sms')] = smsOn;
  });
  return matrix;
};
const NotificationsPanel = ({
  notifications = {},
  onSave
}) => {
  const tx = useTx();
  const tt = useT();
  const [matrix, setMatrix] = useState(() => buildMatrixFromBackend(notifications));
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setMatrix(buildMatrixFromBackend(notifications));
  }, [notifications]);
  const toggle = async (rowId, channel) => {
    const key = DEFAULT_KEY(rowId, channel);
    const next = {
      ...matrix,
      [key]: !matrix[key]
    };
    setMatrix(next);
    setSaving(true);
    try {
      await onSave?.(next);
    } finally {
      setSaving(false);
    }
  };
  const toggleAllInColumn = (channel, value) => {
    const next = {
      ...matrix
    };
    ROWS.forEach(r => {
      next[DEFAULT_KEY(r.id, channel)] = value;
    });
    setMatrix(next);
    onSave?.(next);
  };
  const allOn = channel => ROWS.every(r => matrix[DEFAULT_KEY(r.id, channel)]);
  return <div className={shared.formStack}>
      <div className={shared.card}>
        <h3 className={shared.cardTitle}>{tt("ui.notification.preferences.0ead", "Notification preferences")}<InfoTip id="notificationPrefs" /></h3>
        <p className={shared.cardSub}>
          {tt("ui.choose.how.want.be.3aaa", "Choose how you want to be notified for each event. Changes save automatically")}{saving ? '…' : '.'}
        </p>

        <div className={styles.tableWrap}>
          <table className={styles.matrix}>
            <thead>
              <tr>
                <th className={styles.eventCol}>{tt("ui.event.ad89", "Event")}</th>
                {CHANNELS.map(c => <th key={c.id} className={styles.chanCol}>
                    <div className={styles.chanHead}>
                      <span>{tx(c.label)}</span>
                      <button type="button" className={styles.allBtn} onClick={() => toggleAllInColumn(c.id, !allOn(c.id))} title={allOn(c.id) ? tx("Disable all") : tx("Enable all")}>
                        {allOn(c.id) ? tx("All off") : tx("All on")}
                      </button>
                    </div>
                  </th>)}
              </tr>
            </thead>
            <tbody>
              {ROWS.map(r => <tr key={r.id}>
                  <td className={styles.eventCol}>
                    <div className={styles.eventLabel}>{tx(r.label)}</div>
                    <div className={styles.eventSub}>{tx(r.sub)}</div>
                  </td>
                  {CHANNELS.map(c => {
                const key = DEFAULT_KEY(r.id, c.id);
                return <td key={c.id} className={styles.toggleCell}>
                        <label className={shared.toggle}>
                          <input type="checkbox" checked={!!matrix[key]} onChange={() => toggle(r.id, c.id)} aria-label={`${tx(r.label)} via ${tx(c.label)}`} />
                          <span className={shared.toggleSlider} />
                        </label>
                      </td>;
              })}
                </tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>;
};
export default NotificationsPanel;