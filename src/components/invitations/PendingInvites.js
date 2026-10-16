'use client';

// People invited by email who have not accepted yet (inbox 455), as the
// organiser sees them: the address they typed, the role, whether the person
// has made an account yet, and a way to withdraw it. The same list on an
// event's Team tab and a tournament's "who may enter results".

import { useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { roleWord } from './inviteWords';
import styles from './pending-invites.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

/**
 * @param invites   [{token, email, role, claimed}] from the managers or staff answer
 * @param token     the session token
 * @param onChanged called after a withdrawal, to load the list again
 */
export default function PendingInvites({ invites, token, onChanged }) {
  const tt = useT();
  const [busy, setBusy] = useState('');
  const [problem, setProblem] = useState('');
  // Said after a withdrawal. The row vanishing was the only sign it worked,
  // and when it was the last row the whole block went with it.
  const [said, setSaid] = useState('');
  if (!invites?.length && !said) return null;

  const withdraw = async (invite) => {
    setBusy(invite.token);
    setProblem('');
    setSaid('');
    try {
      const res = await fetch(`${API}/auth/invitations/${encodeURIComponent(invite.token)}/cancel/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: '{}',
      });
      const body = await res.json().catch(() => ({}));
      if (body?.status !== 'success') {
        setProblem(apiMessage(tt, body, 'invite.withdrawFailed', 'That invitation was not withdrawn.'));
        return;
      }
      setSaid(tt('invite.withdrawnFor', 'Withdrawn: {email} can no longer use that link.').replace('{email}', invite.email));
      await onChanged?.();
    } catch {
      setProblem(tt('api.NETWORK_UNREACHABLE', 'Could not reach the server. Check the connection and try again.'));
    } finally {
      setBusy('');
    }
  };

  return (
    <div className={styles.block}>
      <p className={styles.title}>{tt('invite.waitingTitle', 'Invited, not here yet')}</p>
      {problem && <p className={styles.problem} role="alert">{problem}</p>}
      {said && <p className={styles.said} role="status">{said}</p>}
      {!!invites?.length && <ul className={styles.list}>
        {invites.map((invite) => (
          <li key={invite.token} className={styles.row}>
            <span className={styles.text}>
              <span className={styles.email}>{invite.email}</span>
              <span className={styles.meta}>
                {roleWord(tt, invite.role)} · {invite.claimed
                  ? tt('invite.waitingClaimed', 'has an account now, has not accepted yet')
                  : tt('invite.waitingSignup', 'emailed; joins once they make an account and accept')}
              </span>
            </span>
            <button type="button" className={styles.withdraw} disabled={busy === invite.token}
                    onClick={() => withdraw(invite)}>
              {tt('invite.withdraw', 'Withdraw')}
            </button>
          </li>
        ))}
      </ul>}
    </div>
  );
}
