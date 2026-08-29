'use client';

// Following a team's join link.
//
// CEO, 29 August 2026: "or get a link players can use to join directly."
//
// The page reads the link BEFORE asking anybody to sign in. Somebody who
// follows a link out of a group chat wants to know which team it is first, and
// a sign-in wall in front of that question is how a shared link stops working:
// people do not make an account to find out what they are being asked to join.
//
// So: the team is shown to everybody, and only the button that actually joins
// requires an account. The API enforces the same thing, which is the part that
// matters; this is the courtesy of not asking somebody to sign in and then
// telling them the link was already used up.

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import { apiMessage } from '@/lib/apiMessage';
import { useT } from '@/i18n/LanguageProvider';
import styles from './join.module.css';

const API = process.env.NEXT_PUBLIC_API_URL || '';

const JoinByLink = ({ token }) => {
  const tt = useT();
  const router = useRouter();
  const { data: session, status } = useSession();

  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [joined, setJoined] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/team/join/${encodeURIComponent(token)}/`);
      const data = await res.json();
      if (data.status === 'success') setInfo(data.data);
      else setError(apiMessage(tt, data, 'team.badLink', 'That link is not valid.'));
    } catch {
      setError(tt('api.NETWORK_UNREACHABLE', 'Could not reach the server.'));
    } finally {
      setLoading(false);
    }
  }, [token, tt]);

  useEffect(() => { load(); }, [load]);

  const join = async () => {
    setJoining(true);
    setError('');
    try {
      const res = await fetch(`${API}/team/join/${encodeURIComponent(token)}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.user?.sessionToken}`,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setJoined(data.data.team);
      } else {
        setError(apiMessage(tt, data, 'team.joinFailed', 'You could not be added.'));
      }
    } catch {
      setError(tt('api.NETWORK_UNREACHABLE', 'Could not reach the server.'));
    } finally {
      setJoining(false);
    }
  };

  const team = info?.team;

  return (
    <div className={styles.page}>
      <Header />
      <MobileHeader />
      <main className={styles.main}>
        <Sidebar />
        <div className={styles.content}>
          <div className={styles.card}>
            {loading && <p className={styles.muted}>{tt('ui.loading', 'Loading...')}</p>}

            {!loading && !team && (
              <>
                <h1 className={styles.title}>{tt('team.badLinkTitle', 'That link does not work')}</h1>
                <p className={styles.muted}>
                  {error || tt('team.badLink', 'That link is not valid. Ask whoever sent it for a new one.')}
                </p>
                <Link href="/teams" className={styles.secondary}>
                  {tt('team.browseTeams', 'Browse teams')}
                </Link>
              </>
            )}

            {!loading && team && joined && (
              <>
                <h1 className={styles.title}>
                  {tt('team.youJoined', 'You joined {team}').replace('{team}', joined.name)}
                </h1>
                <Link href={`/teams/${joined.slug || joined.id}`} className={styles.primary}>
                  {tt('team.openTeam', 'Open the team')}
                </Link>
              </>
            )}

            {!loading && team && !joined && (
              <>
                <h1 className={styles.title}>
                  {tt('team.invitedToJoin', 'You have been invited to join {team}')
                    .replace('{team}', team.name)}
                </h1>
                {info.message && <p className={styles.message}>{info.message}</p>}
                <p className={styles.muted}>
                  {tt('team.joinAsRole', 'You would join as {role}.')
                    .replace('{role}', String(info.role || 'member').replace('_', ' '))}
                </p>

                {info.spent && (
                  <p className={styles.warning}>
                    {tt('team.linkSpent', 'This link has expired or been used up. Ask for a new one.')}
                  </p>
                )}
                {error && <p className={styles.warning}>{error}</p>}

                {/* The one control that needs an account. Everything above is
                    readable signed out on purpose. */}
                {status === 'authenticated' ? (
                  <button type="button" className={styles.primary}
                          disabled={joining || info.spent} onClick={join}>
                    {joining
                      ? tt('team.joining', 'Joining...')
                      : tt('team.joinTeam', 'Join this team')}
                  </button>
                ) : (
                  <>
                    <p className={styles.muted}>
                      {tt('team.signInToJoin', 'Sign in to join. You will come straight back here.')}
                    </p>
                    <button type="button" className={styles.primary}
                            onClick={() => router.push(
                              `/login?next=${encodeURIComponent(`/teams/join/${token}`)}`)}>
                      {tt('ui.log.f7c4', 'Log in')}
                    </button>
                  </>
                )}

                <Link href={`/teams/${team.slug || team.id}`} className={styles.secondary}>
                  {tt('team.lookFirst', 'Look at the team first')}
                </Link>
              </>
            )}
          </div>
        </div>
      </main>
      <BottomMenu />
    </div>
  );
};

const JoinPage = ({ params }) => (
  <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
    <JoinByLink token={decodeURIComponent(params.token)} />
  </Suspense>
);

export default JoinPage;
