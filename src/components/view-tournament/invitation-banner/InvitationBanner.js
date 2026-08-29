'use client';

// "You have been invited", with the two buttons that answer it.
//
// The organiser could send an invitation and the person receiving it had
// nowhere to say yes. `tools/endpoint-callers.py` caught it: the accept and
// decline endpoint had no caller, which is the machine-readable form of a
// feature that is half built. The notification links to the tournament, so the
// tournament is where the answer belongs.
//
// Accepting deliberately does not register anybody. Registration is the path
// that checks the entry requirements and takes the entry fee, and an
// invitation that quietly did both would be one that quietly charged somebody.
// So a yes sends them to registration with the reason stated.

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/i18n/LanguageProvider';
import styles from './invitation-banner.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function InvitationBanner({ tournamentRef, token }) {
  const tt = useT();
  const router = useRouter();
  const [invitation, setInvitation] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');

  const load = useCallback(async () => {
    if (!tournamentRef || !token) return;
    try {
      const res = await fetch(`${API}/tournament/${tournamentRef}/invitations/mine/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (data?.status === 'success') setInvitation(data.data?.invitation || null);
    } catch {
      // No banner is the right failure: it is an addition to the page, not the
      // page.
    }
  }, [tournamentRef, token]);

  useEffect(() => { load(); }, [load]);

  if (!invitation || done === 'declined') return null;

  const answer = async (choice) => {
    setBusy(true);
    try {
      const res = await fetch(
        `${API}/tournament/${tournamentRef}/invitations/${invitation.id}/respond/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ answer: choice }),
        });
      const data = await res.json().catch(() => ({}));
      if (data?.status !== 'success') return;
      setDone(choice === 'accept' ? 'accepted' : 'declined');
      const next = data.data?.next;
      if (choice === 'accept' && next) router.push(next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.banner}>
      <div className={styles.words}>
        <strong className={styles.title}>
          {invitation.team
            ? tt('invite.bannerTeam', 'The organiser invited {team} to this tournament')
              .replace('{team}', invitation.team.name)
            : tt('invite.bannerYou', 'The organiser invited you to this tournament')}
        </strong>
        {invitation.message && <p className={styles.message}>{invitation.message}</p>}
        <p className={styles.note}>
          {tt('invite.bannerNote',
            'Saying yes does not enter you. You still go through registration, which is where the entry requirements are checked and any entry fee is taken.')}
        </p>
      </div>

      {done === 'accepted'
        ? <span className={styles.done}>{tt('invite.accepted', 'Accepted')}</span>
        : <div className={styles.actions}>
            <button type="button" className={styles.decline} disabled={busy}
                    onClick={() => answer('decline')}>
              {tt('invite.declineIt', 'No thanks')}
            </button>
            <button type="button" className={styles.accept} disabled={busy}
                    onClick={() => answer('accept')}>
              {tt('invite.acceptIt', 'Yes, I am in')}
            </button>
          </div>}
    </div>
  );
}
