'use client';

// /invitations/<token>: one invitation, opened from the email it came in.
//
// CEO, 13 October 2026 (inbox 455): somebody invited to help run an event, a
// tournament or an organisation "even if the person does not have an account
// they should be able to get the mail in their email and then, they can create
// an account using the link in their mail and still accept the invite."
//
// The page answers for whoever holds the link. Signed out: what it is, and
// "Create an account" or "Sign in", each bringing them back here. Signed in as
// the person it was sent to: Accept or Decline. Signed in as somebody else: it
// says so, with the address hinted, rather than refusing on the press.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useViewer } from '@/lib/gating';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { formatDate } from '@/lib/datetime';
import { useAutoRefresh } from '@/lib/useLiveData';
import { roleWord, whatLine } from '@/components/invitations/inviteWords';
import styles from '../invitations.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function InvitationPage() {
  const tt = useT();
  const { token: inviteToken } = useParams() || {};
  // Decided on the session's STATUS: "signed out" and "still asking" look
  // the same in its data (R26).
  const viewer = useViewer();
  const sessionToken = viewer.signedIn ? viewer.token : null;
  const [invitation, setInvitation] = useState(null);
  const [state, setState] = useState('loading');   // loading | ready | missing | failed
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [said, setSaid] = useState('');
  const here = `/invitations/${encodeURIComponent(inviteToken || '')}`;

  // `quiet` for the refresh: a dropped connection while somebody reads the
  // invitation must not replace it with an error.
  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!inviteToken) return;
    try {
      const res = await fetch(`${API}/auth/invitations/${encodeURIComponent(inviteToken)}/`, {
        headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {},
      });
      const body = await res.json().catch(() => null);
      if (res.status === 404) { setState('missing'); return; }
      if (body?.status !== 'success') { if (!quiet) setState('failed'); return; }
      setInvitation(body.data.invitation);
      setState('ready');
    } catch {
      if (!quiet) setState('failed');
    }
  }, [inviteToken, sessionToken]);

  // Decided once the session has answered: "signed out" and "still asking"
  // look the same in the data.
  useEffect(() => {
    if (viewer.loading) return;
    load();
  }, [viewer.loading, load]);
  // Withdrawn or answered on another device while this is open: it says so.
  useAutoRefresh(() => load({ quiet: true }));

  const answer = async (accept) => {
    setBusy(true);
    setProblem('');
    setSaid('');
    try {
      const res = await fetch(`${API}/auth/invitations/${encodeURIComponent(inviteToken)}/respond/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({ accept }),
      });
      const body = await res.json().catch(() => ({}));
      if (body?.status !== 'success') {
        setProblem(apiMessage(tt, body, 'invite.answerFailed', 'That did not go through. Try again.'));
        return;
      }
      setInvitation(body.data.invitation);
      setSaid(accept
        ? tt('invite.acceptedSaid', 'Done. You are in.')
        : tt('invite.declinedSaid', 'Declined. Nothing was added.'));
    } catch {
      setProblem(tt('api.NETWORK_UNREACHABLE', 'Could not reach the server. Check the connection and try again.'));
    } finally {
      setBusy(false);
    }
  };

  const by = invitation?.invited_by ? `@${invitation.invited_by}` : 'V-ENT';
  const pending = invitation?.status === 'pending';

  return (
    <div className={styles.pageContainer}>
      <Header /><MobileHeader />
      <main className={styles.mainContainer}>
        <Sidebar />
        <div className={styles.rightPaneContainer}>
          {state === 'loading' && <div className={styles.skeletonCard} aria-busy="true" />}

          {state === 'missing' && (
            <div className={styles.emptyState}>
              <h1 className={styles.emptyTitle}>{tt('invite.missingTitle', 'This invitation does not exist.')}</h1>
              <p className={styles.muted}>{tt('invite.missingText', 'The link may be incomplete. Ask whoever invited you to send it again.')}</p>
            </div>
          )}

          {state === 'failed' && (
            <div className={styles.emptyState}>
              <h1 className={styles.emptyTitle}>{tt('invite.failedTitle', 'The invitation could not be loaded.')}</h1>
              <button type="button" className={styles.secondary} onClick={() => { setState('loading'); load(); }}>
                {tt('ui.tryAgain', 'Try again')}
              </button>
            </div>
          )}

          {state === 'ready' && invitation && (
            <>
              <h1 className={styles.pageTitle}>
                {tt('invitation.title', '{who} invited you to {what}')
                  .replace('{who}', by).replace('{what}', whatLine(tt, invitation))}
              </h1>
              <section className={styles.card}>
                <span className={styles.kicker}>{tt('invite.asRole', 'Your role')}</span>
                <span className={styles.role}>{roleWord(tt, invitation.role)}</span>
                <p className={styles.muted}>
                  {tt('invite.sentTo', 'Sent to {email} on {date}.')
                    .replace('{email}', invitation.email_hint || '')
                    .replace('{date}', formatDate(invitation.created_at))}
                </p>

                {said && <p className={styles.said} role="status">{said}</p>}
                {problem && <p className={styles.problem} role="alert">{problem}</p>}

                {!pending && (
                  <>
                    <p className={styles.muted}>
                      {invitation.status === 'accepted'
                        ? tt('invite.statusAccepted', 'This invitation has been accepted.')
                        : invitation.status === 'declined'
                          ? tt('invite.statusDeclined', 'This invitation was declined.')
                          : tt('invite.statusCancelled', 'This invitation was withdrawn by whoever sent it.')}
                    </p>
                    {invitation.status === 'accepted' && invitation.for_you && (
                      <div className={styles.actions}>
                        <Link href={invitation.path} className={styles.primary}>
                          {tt('invite.open', 'Open {name}').replace('{name}', invitation.name)}
                        </Link>
                      </div>
                    )}
                  </>
                )}

                {pending && !viewer.signedIn && (
                  <>
                    <p className={styles.muted}>
                      {tt('invite.signedOutText', 'Create an account with that email address, or sign in if you already have one, and you can accept it here.')}
                    </p>
                    <div className={styles.actions}>
                      <Link href={`/signup?next=${encodeURIComponent(here)}`} className={styles.primary}>
                        {tt('invite.createAccount', 'Create an account')}
                      </Link>
                      <Link href={`/login?next=${encodeURIComponent(here)}`} className={styles.secondary}>
                        {tt('invite.signIn', 'Sign in')}
                      </Link>
                    </div>
                  </>
                )}

                {pending && viewer.signedIn && invitation.for_you && (
                  <div className={styles.actions}>
                    <button type="button" className={styles.primary} disabled={busy} onClick={() => answer(true)}>
                      {tt('invite.accept', 'Accept')}
                    </button>
                    <button type="button" className={styles.secondary} disabled={busy} onClick={() => answer(false)}>
                      {tt('invite.decline', 'Decline')}
                    </button>
                  </div>
                )}

                {pending && viewer.signedIn && !invitation.for_you && (
                  <>
                    <p className={styles.muted}>
                      {tt('invite.otherAccount', 'You are signed in as @{name}, and this invitation was sent to {email}. Sign in with the account for that address to accept it.')
                        .replace('{name}', viewer.username || '')
                        .replace('{email}', invitation.email_hint || '')}
                    </p>
                    <div className={styles.actions}>
                      <button type="button" className={styles.secondary}
                              onClick={() => signOut({ callbackUrl: `/login?next=${encodeURIComponent(here)}` })}>
                        {tt('invite.switchAccount', 'Use another account')}
                      </button>
                    </div>
                  </>
                )}
              </section>
              {viewer.signedIn && (
                <Link href="/invitations" className={styles.allLink}>
                  {tt('invite.allMine', 'All your invitations')}
                </Link>
              )}
            </>
          )}
        </div>
      </main>
      <BottomMenu />
    </div>
  );
}
