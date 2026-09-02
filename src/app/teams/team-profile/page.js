'use client';

import { apiMessage } from '@/lib/apiMessage';
import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/sidebar/Sidebar';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import TeamProfileHero from '@/components/team-profile/TeamProfileHero';
import TeamProfileOverview from '@/components/team-profile/TeamProfileOverview';
import TeamProfileMembersTable from '@/components/team-profile/TeamProfileMembersTable';
import TeamRosterManager from '@/components/team-profile/TeamRosterManager';
import TeamProfileTournaments from '@/components/team-profile/TeamProfileTournaments';
import TeamProfileEvents from '@/components/team-profile/TeamProfileEvents';
import TeamProfileStats from '@/components/team-profile/TeamProfileStats';
import TeamProfileRequests from '@/components/team-profile/TeamProfileRequests';
import styles from './team-profile.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
import { sameUser, usernameOf } from '@/lib/gating';
const ALL_TABS = [{
  id: 'overview',
  label: 'Overview'
}, {
  id: 'members',
  label: 'Members'
}, {
  id: 'tournaments',
  label: 'Activity Tournaments'
}, {
  id: 'events',
  label: 'Activity Events'
}, {
  id: 'stats',
  label: 'Stats'
}, {
  id: 'requests',
  label: 'Requests',
  ownerOnly: true
}];
export const TeamProfileContent = ({
  slug
}) => {
  const tx = useTx();
  const tt = useT();
  const searchParams = useSearchParams();
  const router = useRouter();
  // `/teams/lagos-rangers` passes the slug; `?id=` still resolves.
  const teamId = slug || searchParams.get('id') || '';
  const {
    data: session,
    status: sessionStatus
  } = useSession();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [requestState, setRequestState] = useState(null); // 'pending' | 'success' | null
  const [toast, setToast] = useState('');
  const fetchTeam = useCallback(async () => {
    // A team page is public and is in the sitemap, so this must not wait for a
    // token that is never coming. It returned here before `loading` was ever
    // cleared, so a signed-out visitor got "Loading the team..." for ever. The
    // header below is already only added when there is a token, and the server
    // answers the viewer flags as "not you" without one.
    if (sessionStatus === 'loading') return;
    if (!teamId) {
      setLoading(false);
      setError(tt("msg.missingTeamId", "Missing team id"));
      return;
    }
    try {
      setLoading(true);
      const headers = {
        'Content-Type': 'application/json'
      };
      if (session?.user?.sessionToken) headers['Authorization'] = `Bearer ${session.user.sessionToken}`;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/team/view-team/${teamId}/`, {
        headers
      });
      if (!res.ok) throw new Error(`Failed to load team (${res.status})`);
      const data = await res.json();
      // Renamed since this link was shared: send the browser to the address it
      // lives at now rather than reporting it missing.
      if (data?.status === 'moved' && data?.data?.url) {
        router.replace(data.data.url);
        return;
      }
      const t = data?.data?.team ?? data?.data ?? null;
      if (!t) throw new Error('Team not found');
      setTeam(t);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [teamId, session, sessionStatus, router]);
  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);
  const showToast = msg => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2200);
  };

  // The server settles this now. The three-way comparison below it stays as a
  // fallback for a payload that predates viewer_is_owner.
  // Every comparison here was `a?.b === c?.d`, true for a signed-out visitor
  // because both sides are undefined. `sameUser` refuses an absent side.
  const isOwner = !!team && (team?.viewer_is_owner ?? (
    sameUser(team?.owner?.id, session?.user?.id)
    || sameUser(usernameOf(team?.owner), session?.user?.username)
    || sameUser(team?.owner?.user_id, session?.user?.id)));

  // Share used to be a Link back to the page you were already on. It copies a
  // link to this team, and says what the link is if the clipboard is refused.
  const handleShare = async () => {
    const link = `${window.location.origin}/teams/${team?.id ?? teamId}`;
    try {
      await navigator.clipboard.writeText(link);
      showToast?.('Team link copied');
    } catch {
      showToast?.(link);
    }
  };
  const handleRequestJoin = async () => {
    setRequestState('loading');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/team/request-join/${teamId}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.user?.sessionToken && {
            Authorization: `Bearer ${session.user.sessionToken}`
          })
        },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (data?.status === 'success') {
        setRequestState('pending');
        showToast(tt("msg.requestSent", "Request sent"));
      } else {
        setRequestState(null);
        showToast(apiMessage(tt, data, "api.requestFailed", "Request failed"));
      }
    } catch {
      setRequestState(null);
      showToast(tt("msg.networkError", "Network error"));
    }
  };
  const handleLeaveTeam = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/team/leave/${teamId}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.user?.sessionToken && {
            Authorization: `Bearer ${session.user.sessionToken}`
          })
        }
      });
      const data = await res.json();
      if (data?.status === 'success') showToast(tt("msg.leftTeam", "Left team"));else showToast(apiMessage(tt, data, "api.couldNotLeave", "Could not leave"));
    } catch {
      showToast(tt("msg.networkError", "Network error"));
    }
  };
  const visibleTabs = ALL_TABS.filter(t => !t.ownerOnly || isOwner);
  return <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          {loading && <p className={styles.stateText}>{tt("ui.loading.team.b4a7", "Loading team…")}</p>}
          {!loading && error && <p className={styles.errorText}>{error}</p>}

          {!loading && !error && team && <>
              <TeamProfileHero team={team} isOwner={isOwner} requestState={requestState} onRequestJoin={handleRequestJoin} onLeave={handleLeaveTeam} onShare={handleShare} />

              <div className={styles.tabsRow}>
                {visibleTabs.map(t => <button key={t.id} type="button" className={`${styles.tabBTN} ${activeTab === t.id ? styles.activeTab : ''}`} onClick={() => setActiveTab(t.id)}>
                    {tx(t.label)}
                    {t.id === 'requests' && team?._pendingRequestCount ? <span className={styles.tabBadge}>{team._pendingRequestCount}</span> : null}
                  </button>)}
              </div>

              <div className={styles.tabPanel}>
                {activeTab === 'overview' && <TeamProfileOverview team={team} isOwner={isOwner} />}
                {activeTab === 'members' && <>
                  {/* Invites, the join link and roles. Draws nothing for
                      somebody with no power to manage, so an ordinary player
                      sees the roster and not a wall of disabled buttons. */}
                  <TeamRosterManager team={team} onToast={showToast} />
                  <TeamProfileMembersTable team={team} isOwner={isOwner} onToast={showToast} />
                </>}
                {activeTab === 'tournaments' && <TeamProfileTournaments team={team} />}
                {activeTab === 'events' && <TeamProfileEvents team={team} />}
                {activeTab === 'stats' && <TeamProfileStats team={team} />}
                {activeTab === 'requests' && isOwner && <TeamProfileRequests team={team} onToast={showToast} />}
              </div>
            </>}
        </div>
      </main>

      <BottomMenu />

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>;
};
const TeamProfile = () => {
  const tt = useT();
  return <Suspense fallback={<p style={{
    padding: '2rem'
  }}>{tt("ui.loading.33ce", "Loading…")}</p>}>
    <TeamProfileContent />
  </Suspense>;
};
export default TeamProfile;