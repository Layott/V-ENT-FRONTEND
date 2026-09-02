'use client';

// Asking a named player or a named team to enter.
//
// CEO, 29 August 2026: "tournament organizers, should be able to invite people
// or teams to their events."
//
// There were already invite codes, and they are a different thing: sixty-four
// strings an organiser hands out, spendable by whoever holds one. That works
// for "the Lagos lot" and not for "I want these four teams", where the organiser
// ends up keeping a spreadsheet of which code went to whom.
//
// This is addressed. It names who it is for, tells them, and shows what they
// said. The list is the answer to "who have I asked and what came back", which
// is the question an organiser actually has.

import { apiMessage } from '@/lib/apiMessage';
import { useCallback, useEffect, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import styles from './invitations-panel.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function InvitationsPanel({ tournamentRef, token, showToast }) {
  const tt = useT();
  const [rows, setRows] = useState([]);
  const [who, setWho] = useState('');
  const [asTeam, setAsTeam] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!tournamentRef || !token) return;
    try {
      const res = await fetch(`${API}/tournament/${tournamentRef}/invitations/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (data?.status === 'success') setRows(data.data?.invitations || []);
    } catch {
      // The list not loading is worth nothing next to the form still working.
    }
  }, [tournamentRef, token]);

  useEffect(() => { load(); }, [load]);

  const send = async () => {
    const name = who.trim();
    if (!name) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`${API}/tournament/${tournamentRef}/invitations/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...(asTeam ? { team: name } : { username: name }),
          message: message.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.status !== 'success') {
        setError(apiMessage(tt, data, 'invite.failed', 'That did not go through.'));
        return;
      }
      setWho('');
      setMessage('');
      showToast?.(data.data?.reminded
        ? tt('invite.reminded', 'They have been reminded.')
        : tt('invite.sent', 'Invitation sent.'));
      await load();
    } catch {
      setError(tt('invite.failed', 'That did not go through.'));
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async (id) => {
    setBusy(true);
    try {
      await fetch(`${API}/tournament/${tournamentRef}/invitations/${id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const label = {
    pending: tt('invite.pending', 'Waiting for an answer'),
    accepted: tt('invite.accepted', 'Accepted'),
    declined: tt('invite.declined', 'Declined'),
    withdrawn: tt('invite.withdrawn', 'Withdrawn'),
  };

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>{tt('invite.title', 'Invite players and teams')}</h3>
      <p className={styles.hint}>
        {tt('invite.hint',
          'Ask somebody by name. They are told, and they accept or decline here. Accepting does not register them: they still go through registration, which is where the entry requirements are checked and the entry fee is taken.')}
      </p>

      {/* Two chips rather than a select: it is one choice between two things,
          and a select on a phone hides the option not chosen. */}
      <div className={styles.kindRow}>
        <button
          type="button"
          className={`${styles.kindChip} ${!asTeam ? styles.kindChipOn : ''}`}
          aria-pressed={!asTeam}
          onClick={() => setAsTeam(false)}
        >{tt('invite.aPlayer', 'A player')}</button>
        <button
          type="button"
          className={`${styles.kindChip} ${asTeam ? styles.kindChipOn : ''}`}
          aria-pressed={asTeam}
          onClick={() => setAsTeam(true)}
        >{tt('invite.aTeam', 'A team')}</button>
      </div>

      <input
        className={styles.input}
        value={who}
        onChange={(e) => setWho(e.target.value)}
        placeholder={asTeam
          ? tt('invite.teamName', 'Team name')
          : tt('invite.username', 'Username')}
        aria-label={asTeam
          ? tt('invite.teamName', 'Team name')
          : tt('invite.username', 'Username')}
      />
      <input
        className={styles.input}
        maxLength={280}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={tt('invite.message', 'A line to go with it (optional)')}
        aria-label={tt('invite.message', 'A line to go with it (optional)')}
      />

      {error && <p className={styles.error} role="alert">{error}</p>}

      <button
        type="button"
        className={styles.send}
        disabled={busy || !who.trim()}
        onClick={send}
      >{tt('invite.send', 'Send the invitation')}</button>

      <h4 className={styles.subTitle}>{tt('invite.sentTitle', 'Who you have asked')}</h4>
      {rows.length === 0
        ? <p className={styles.muted}>{tt('invite.none', 'Nobody yet.')}</p>
        : <div className={styles.rows}>
            {rows.map((row) => (
              <div key={row.id} className={styles.row}>
                <span className={styles.name}>
                  {row.team ? row.team.name : `@${row.player?.username}`}
                </span>
                <span className={`${styles.status} ${styles[`status_${row.status}`] || ''}`}>
                  {label[row.status] || row.status}
                </span>
                {row.status === 'pending' && (
                  <button
                    type="button"
                    className={styles.withdraw}
                    disabled={busy}
                    onClick={() => withdraw(row.id)}
                  >{tt('invite.withdrawIt', 'Withdraw')}</button>
                )}
              </div>
            ))}
          </div>}
    </div>
  );
}
