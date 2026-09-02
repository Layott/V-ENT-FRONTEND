'use client';

import { apiMessage } from '@/lib/apiMessage';
import { mediaUrl } from '@/lib/mediaUrl';
import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { FaCheckCircle, FaUsers, FaTrophy, FaCoins, FaTwitter, FaInstagram, FaDiscord, FaTwitch, FaYoutube, FaFacebook, FaGlobe, FaEnvelope } from 'react-icons/fa';
import { AiOutlineTeam } from 'react-icons/ai';
import { LuMapPin, LuUserPlus } from 'react-icons/lu';
import { MdBusiness, MdOutlineEvent } from 'react-icons/md';
import { FiEdit3, FiCalendar } from 'react-icons/fi';
import { BsThreeDots } from 'react-icons/bs';
import Sidebar from '@/components/sidebar/Sidebar';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './org-profile.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
import { appLocale } from '@/lib/appLocale';
import UserChip from '@/components/user-chip/UserChip';
import { sameUser, useViewer, usernameOf } from '@/lib/gating';
import NeedsAccount from '@/components/needs-account/NeedsAccount';
const TABS = [{
  id: 'overview',
  label: 'Overview'
}, {
  id: 'teams',
  label: 'Teams'
}, {
  id: 'tournaments',
  label: 'Tournaments'
}, {
  id: 'events',
  label: 'Events'
}, {
  id: 'clubs',
  label: 'Clubs'
}, {
  id: 'members',
  label: 'Members'
}, {
  id: 'about',
  label: 'About'
}];
const SOCIAL_ICONS = {
  twitter: FaTwitter,
  instagram: FaInstagram,
  discord: FaDiscord,
  twitch: FaTwitch,
  youtube: FaYoutube,
  facebook: FaFacebook,
  website: FaGlobe
};
const formatDate = iso => {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(appLocale(), {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return '-';
  }
};
const socialIconFor = (titleOrKey = '') => {
  const k = String(titleOrKey).toLowerCase();
  for (const key of Object.keys(SOCIAL_ICONS)) {
    if (k.includes(key)) return SOCIAL_ICONS[key];
  }
  return FaGlobe;
};
const OrgProfileContent = ({
  slug: slugFromPath
}) => {
  const tx = useTx();
  const tt = useT();
  const searchParams = useSearchParams();
  const router = useRouter();
  // No invented default: without ?id= there is no organization to show.
  const orgId = slugFromPath || searchParams.get('id');
  const {
    data: session
  } = useSession();
  const tabsRef = useRef({});
  const [org, setOrg] = useState(null);
  const [teams, setTeams] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [events, setEvents] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [members, setMembers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [following, setFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [scrollByTab, setScrollByTab] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [applyState, setApplyState] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const [toast, setToast] = useState('');
  const showToast = msg => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2400);
  };

  // The server decides: `my_role` is computed from real membership. (This used
  // to compare against a mock user id, so ownership never resolved.)
  const viewer = useViewer();
  // Signed in AND the owner. `my_role` is absent for a stranger so the
  // second half alone is already false, but a control that needs an
  // account says so where it is written.
  const isOwner = viewer.signedIn && org?.my_role === 'owner';
  const isMember = !!org?.my_role;

  // ── Data fetch ──
  const loadAll = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const headers = {
        'Content-Type': 'application/json'
      };
      if (session?.user?.sessionToken) {
        headers['Authorization'] = `Bearer ${session.user.sessionToken}`;
      }
      const API = process.env.NEXT_PUBLIC_API_URL;
      const [orgRes, teamsRes, tmtRes, evRes, memRes, actRes, clubRes] = await Promise.all([fetch(`${API}/organization/${orgId}/`, {
        headers
      }), fetch(`${API}/organization/${orgId}/teams/`, {
        headers
      }), fetch(`${API}/organization/${orgId}/tournaments/`, {
        headers
      }), fetch(`${API}/organization/${orgId}/events/`, {
        headers
      }), fetch(`${API}/organization/${orgId}/members/`, {
        headers
      }), fetch(`${API}/organization/${orgId}/activity/`, {
        headers
      }), fetch(`${API}/organization/${orgId}/clubs/`, {
        headers
      })]);
      const orgData = await orgRes.json();
      const orgRow = orgData?.data?.organization || null;
      setOrg(orgRow);
      setFollowing(Boolean(orgRow?.is_following));
      const teamsData = await teamsRes.json();
      setTeams(teamsData?.data?.teams || []);
      const tmtData = await tmtRes.json();
      setTournaments(tmtData?.data?.tournaments || []);
      const evData = await evRes.json();
      setEvents(evData?.data?.events || []);
      const memData = await memRes.json();
      setMembers(memData?.data?.members || []);
      const actData = await actRes.json();
      setActivity(actData?.data?.activity || []);
      const clubData = await clubRes.json().catch(() => null);
      setClubs(clubData?.data?.clubs || []);
    } catch (err) {
      setError(apiMessage(tt, err, 'api.somethingWentWrong', 'Something went wrong. Try again in a moment.'));
    } finally {
      setLoading(false);
    }
  }, [orgId, session]);
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Tab click - preserve scroll for previous tab, restore for new
  const switchTab = tab => {
    setScrollByTab(s => ({
      ...s,
      [activeTab]: window.scrollY
    }));
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    // Same fault as the manage screen: hardcoding the path dropped the slug
    // and the page lost the organisation it was showing.
    const base = slugFromPath
      ? `/organizations/${encodeURIComponent(slugFromPath)}`
      : '/organizations/org-profile';
    router.replace(`${base}?${params.toString()}`, {
      scroll: false
    });
  };
  useEffect(() => {
    const y = scrollByTab[activeTab];
    if (typeof y === 'number') {
      window.scrollTo({
        top: y,
        behavior: 'instant'
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ── Actions ──
  const handleFollow = async () => {
    if (!session?.user?.sessionToken) {
      showToast(tt("msg.logInToFollowAn", "Log in to follow an organization."));
      return;
    }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organization/${orgId}/follow/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.user.sessionToken}`
        }
      });
      const data = await res.json();
      if (data?.status === 'success') {
        // Trust the server's answer rather than a local guess.
        setFollowing(Boolean(data.data.is_following));
        setOrg(o => o ? {
          ...o,
          follower_count: data.data.follower_count
        } : o);
        showToast(data.data.is_following ? tt("msg.nowFollowing", "Following. You will get updates.") : tt("msg.unfollowed", "Unfollowed."));
      } else {
        showToast(apiMessage(tt, data, "api.couldNotUpdateFollow", "Could not update follow."));
      }
    } catch {
      showToast(tt("msg.couldNotReachTheServer", "Could not reach the server."));
    }
  };
  const handleApply = async () => {
    setApplyState('loading');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organization/${orgId}/apply/`, {
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
        setApplyState('pending');
        showToast(tt("msg.applicationSubmittedAwaitingApproval", "Application submitted - awaiting approval."));
      } else {
        setApplyState(null);
        showToast(apiMessage(tt, data, "api.applicationFailed", "Application failed."));
      }
    } catch {
      setApplyState(null);
      showToast(tt("msg.networkError", "Network error"));
    }
  };
  const promoteMember = async (m, role) => {
    setOpenMenu(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organization/${orgId}/promote/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.user?.sessionToken && {
            Authorization: `Bearer ${session.user.sessionToken}`
          })
        },
        body: JSON.stringify({
          user_id: m.user?.id,
          role
        })
      });
      const data = await res.json();
      if (data?.status === 'success') {
        setMembers(prev => prev.map(x => sameUser(x.user?.id, m.user?.id) ? {
          ...x,
          role
        } : x));
        showToast(`${m.user?.full_name || m.user?.username} → ${role}`);
      } else {
        showToast(apiMessage(tt, data, "api.failed", "Failed."));
      }
    } catch {
      showToast(tt("msg.networkError", "Network error"));
    }
  };
  const kickMember = async m => {
    setOpenMenu(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organization/${orgId}/kick/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.user?.sessionToken && {
            Authorization: `Bearer ${session.user.sessionToken}`
          })
        },
        body: JSON.stringify({
          user_id: m.user?.id
        })
      });
      const data = await res.json();
      if (data?.status === 'success') {
        setMembers(prev => prev.filter(x => x.user?.id !== m.user?.id));
        showToast(`${m.user?.full_name || m.user?.username} removed.`);
      } else {
        showToast(apiMessage(tt, data, "api.failed", "Failed."));
      }
    } catch {
      showToast(tt("msg.networkError", "Network error"));
    }
  };
  if (loading) {
    return <div className={styles.pageContainer}>
        <Header />
        <MobileHeader />
        <main className={styles.mainContainer}>
          <Sidebar />
          <div className={styles.rightPaneContainer}>
            <p className={styles.statusText}>{tt("ui.loading.organization.5a5d", "Loading organization…")}</p>
          </div>
        </main>
        <BottomMenu />
      </div>;
  }
  if (!org) {
    return <div className={styles.pageContainer}>
        <Header />
        <MobileHeader />
        <main className={styles.mainContainer}>
          <Sidebar />
          <div className={styles.rightPaneContainer}>
            <p className={styles.statusText}>
              {error || tx("Organization not found.")}{' '}
              <Link href="/organizations" className={styles.backLink}>{tt("ui.back.list.747f", "Back to list")}</Link>
            </p>
          </div>
        </main>
        <BottomMenu />
      </div>;
  }
  const socials = Array.isArray(org.social_links) ? org.social_links : Object.entries(org.social_links || {}).map(([k, v]) => ({
    title: k,
    url: v
  }));
  return <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          {/* ── Hero ── */}
          <section className={styles.heroCard}>
            <div className={styles.bannerWrap}>
              {org.banner ? <Image src={mediaUrl(org.banner)} alt={`${org.name} banner`} fill sizes="100vw" style={{
              objectFit: 'cover'
            }} priority /> : <div className={styles.bannerFallback} />}
              <div className={styles.bannerOverlay} />
            </div>

            <div className={styles.heroBody}>
              <div className={styles.heroLogoWrap}>
                {org.logo ? <Image src={mediaUrl(org.logo)} alt={`${org.name} logo`} width={96} height={96} /> : <MdBusiness />}
              </div>

              <div className={styles.heroInfo}>
                <div className={styles.heroNameRow}>
                  <h1 className={styles.orgName}>{org.name}</h1>
                  {org.tag && <span className={styles.heroTag}>{org.tag}</span>}
                  {org.verified && <span className={styles.verifiedBadge}>
                      <FaCheckCircle /> {tt("ui.verified.aed3", "Verified")}
                    </span>}
                </div>
                <div className={styles.orgMeta}>
                  <span className={styles.metaItem}>
                    <LuMapPin className={styles.metaIcon} /> {org.region}
                  </span>
                  {org.focus && <span className={styles.focusPill}>{org.focus}</span>}
                  {org.founded && <span className={styles.metaItem}>
                      <FiCalendar className={styles.metaIcon} /> {tt("ui.founded.7cfb", "Founded")} {formatDate(org.founded)}
                    </span>}
                </div>
                <p className={styles.orgBio}>{org.bio}</p>
              </div>

              {/* Manage belongs to the owner. Apply and Follow need an
                  account, so a stranger is told that instead of being handed a
                  button that answers 401. Message is gone entirely: CEO,
                  2 September, "There is no need for the option to message an
                  org." An organisation is not a person and a DM to its owner
                  was never the right shape. */}
              <div className={styles.heroActions}>
                {isOwner && <Link href={`/organizations/${orgId}/manage`} className={`${styles.heroBtn} ${styles.heroBtnPrimary}`}>
                    <FiEdit3 /> {tt("ui.manage.bf58", "Manage")}
                  </Link>}

                {!isOwner && !isMember && <NeedsAccount compact action={tt('org.applyAction', 'apply to an organisation')}>
                    <button type="button" className={`${styles.heroBtn} ${styles.heroBtnPrimary}`} onClick={handleApply} disabled={applyState === 'loading' || applyState === 'pending'}>
                      <LuUserPlus />
                      {applyState === 'pending' ? 'Pending' : applyState === 'loading' ? tx("Sending…") : 'Apply'}
                    </button>
                  </NeedsAccount>}

                <NeedsAccount compact action={tt('org.followAction', 'follow an organisation')}>
                  <button type="button" className={`${styles.heroBtn} ${styles.heroBtnGhost}`} onClick={handleFollow}>
                    {following
                      ? tt('org.following', 'Following')
                      : tt('org.follow', 'Follow')}
                  </button>
                </NeedsAccount>
              </div>
            </div>
          </section>

          {/* ── Tabs ── */}
          <div className={styles.tabsRow}>
            {TABS.map(t => <button key={t.id} ref={el => {
            tabsRef.current[t.id] = el;
          }} type="button" className={`${styles.tabBTN} ${activeTab === t.id ? styles.activeTab : ''}`} onClick={() => switchTab(t.id)}>
                {tx(t.label)}
              </button>)}
          </div>

          {/* ── Tab content ── */}
          <div className={styles.tabPanel}>
            {activeTab === 'overview' && <div className={styles.overviewGrid}>
                <div className={styles.overviewLeft}>
                  <section className={styles.panel}>
                    <h2 className={styles.panelTitle}>{tt("ui.bio.b31f", "Bio")}</h2>
                    <p className={styles.bioText}>{org.bio || tx("No bio added yet.")}</p>
                  </section>

                  <section className={styles.panel}>
                    <h2 className={styles.panelTitle}>{tt("ui.key.stats.bbd0", "Key stats")}</h2>
                    <div className={styles.statsGrid}>
                      <div className={styles.statCard}>
                        <FaUsers className={styles.statCardIcon} />
                        <div>
                          <span className={styles.statLabel}>{tt("ui.members.1cb4", "Members")}</span>
                          <span className={styles.statNumber}>{org.member_count}</span>
                        </div>
                      </div>
                      <div className={styles.statCard}>
                        <AiOutlineTeam className={styles.statCardIcon} />
                        <div>
                          <span className={styles.statLabel}>{tt("ui.teams.cbfd", "Teams")}</span>
                          <span className={styles.statNumber}>{org.team_count}</span>
                        </div>
                      </div>
                      <div className={styles.statCard}>
                        <FaTrophy className={styles.statCardIcon} />
                        <div>
                          <span className={styles.statLabel}>{tt("ui.tournaments.fee2", "Tournaments")}</span>
                          <span className={styles.statNumber}>{org.total_tournaments_hosted ?? org.tournaments_hosted}</span>
                        </div>
                      </div>
                      <div className={styles.statCard}>
                        <MdOutlineEvent className={styles.statCardIcon} />
                        <div>
                          <span className={styles.statLabel}>{tt("ui.events.c549", "Events")}</span>
                          <span className={styles.statNumber}>{org.events_hosted}</span>
                        </div>
                      </div>
                      <div className={styles.statCard}>
                        <FaCoins className={styles.statCardIcon} />
                        <div>
                          <span className={styles.statLabel}>{tt("ui.prize.pool.e9b1", "Prize pool")}</span>
                          <span className={styles.statNumber}>
                            {(org.total_prize_pool ?? org.prize_pool_awarded_vc ?? 0).toLocaleString()} VC
                          </span>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className={styles.panel}>
                    <h2 className={styles.panelTitle}>{tt("ui.recent.activity.72d5", "Recent activity")}</h2>
                    {activity.length === 0 ? <p className={styles.bioText}>{tt("ui.no.recent.activity.yet.5179", "No recent activity yet.")}</p> : <ul className={styles.activityList}>
                        {activity.map(a => <li key={a.id} className={styles.activityRow}>
                            <span className={styles.activityDot} />
                            <div className={styles.activityText}>
                              <span>{tx(a.title)}</span>
                              <span className={styles.activityTime}>{formatDate(a.at)}</span>
                            </div>
                          </li>)}
                      </ul>}
                  </section>
                </div>

                <div className={styles.overviewRight}>
                  <section className={styles.panel}>
                    <h2 className={styles.panelTitle}>{tt("ui.founders.9a7f", "Founders")}</h2>
                    {(org.founders || []).length === 0 ? <p className={styles.bioText}>-</p> : <ul className={styles.founderList}>
                        {(org.founders || []).map((name, i) => <li key={`${name}_${i}`} className={styles.founderRow}>
                            <div className={styles.founderAvatar}>
                              {name.split(' ').map(p => p[0]).join('').slice(0, 2)}
                            </div>
                            <span className={styles.founderName}>{name}</span>
                          </li>)}
                      </ul>}
                  </section>

                  <section className={styles.panel}>
                    <h2 className={styles.panelTitle}>{tt("ui.social.41a5", "Social")}</h2>
                    {socials.length === 0 ? <p className={styles.bioText}>{tt("ui.no.links.added.0dff", "No links added.")}</p> : <div className={styles.socialList}>
                        {socials.map(({
                    title,
                    url
                  }) => {
                    const Icon = socialIconFor(title);
                    return <a key={title + url} href={url} target="_blank" rel="noopener noreferrer" className={styles.socialItem}>
                              <Icon className={styles.socialIcon} />
                              <span>{title}</span>
                            </a>;
                  })}
                      </div>}
                  </section>
                </div>
              </div>}

            {activeTab === 'teams' && <div className={styles.cardGridSm}>
                {teams.map(team => <Link key={team.id} href={`/teams/${team.slug || team.id}`} className={styles.miniCard}>
                    <div className={styles.miniBanner}>
                      {team.banner && <Image src={mediaUrl(team.banner)} alt={`${team.name} banner`} fill sizes="(max-width: 768px) 100vw, 33vw" style={{
                  objectFit: 'cover'
                }} />}
                    </div>
                    <div className={styles.miniLogo}>
                      {team.logo && <Image src={mediaUrl(team.logo)} alt={`${team.name} logo`} width={44} height={44} />}
                    </div>
                    <div className={styles.miniBody}>
                      <h2 className={styles.miniTitle}>{team.name}</h2>
                      <p className={styles.miniMeta}>
                        {team.game} · {team.members ?? team.member_count ?? 0}{' '}
                        {(team.members ?? team.member_count ?? 0) === 1 ? 'member' : 'members'}
                      </p>
                    </div>
                  </Link>)}
                {teams.length === 0 && <div className={styles.sectionEmpty}>{tt("ui.no.teams.under.org.2f9f", "No teams under this org yet.")}</div>}
              </div>}

            {activeTab === 'clubs' && <div className={styles.cardGridSm}>
                {clubs.map(club => <Link key={club.slug || club.id} href={`/community/club/${club.slug}`} className={styles.miniCard}>
                    <div className={styles.miniBanner}>
                      {club.banner && <Image src={mediaUrl(club.banner)} alt={`${club.name} banner`} fill sizes="(max-width: 768px) 100vw, 33vw" style={{
                  objectFit: 'cover'
                }} />}
                    </div>
                    <div className={styles.miniLogo}>
                      {club.logo && <Image src={mediaUrl(club.logo)} alt={`${club.name} logo`} width={44} height={44} />}
                    </div>
                    <div className={styles.miniBody}>
                      <h2 className={styles.miniTitle}>{club.name}</h2>
                      <p className={styles.miniMeta}>
                        {club.game ? `${club.game} · ` : ''}{club.member_count ?? 0}{' '}
                        {tt("ui.members.lower.51bd", "members")}
                      </p>
                    </div>
                  </Link>)}
                {clubs.length === 0 && <div className={styles.sectionEmpty}>{tt("ui.no.clubs.under.org.3b57", "No clubs under this org yet.")}</div>}
              </div>}

            {activeTab === 'tournaments' && <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{tt("ui.name.709a", "Name")}</th>
                      <th>{tt("ui.game.e3e8", "Game")}</th>
                      <th>{tt("ui.status.bae7", "Status")}</th>
                      <th>{tt("ui.prize.pool.e9b1", "Prize pool")}</th>
                      <th>{tt("ui.start.952f", "Start")}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tournaments.map(t => <tr key={t.id}>
                        <td>{t.name}</td>
                        <td>{t.game}</td>
                        <td>
                          <span className={`${styles.statusPill} ${styles[`status_${t.status}`] || ''}`}>
                            {(t.status || '').replace('_', ' ')}
                          </span>
                        </td>
                        <td>{(t.prize_pool ?? 0).toLocaleString()} VC</td>
                        <td>{formatDate(t.start_date)}</td>
                        <td>
                          <Link href={`/tournaments/${t.slug || t.id}`} className={styles.smallBtn}>
                            {tt("ui.view.69bd", "View")}
                          </Link>
                        </td>
                      </tr>)}
                  </tbody>
                </table>
                {tournaments.length === 0 && <div className={styles.sectionEmpty}>{tt("ui.no.tournaments.hosted.yet.345e", "No tournaments hosted yet.")}</div>}
              </div>}

            {activeTab === 'events' && <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{tt("ui.name.709a", "Name")}</th>
                      <th>{tt("ui.type.3deb", "Type")}</th>
                      <th>{tt("ui.location.d219", "Location")}</th>
                      <th>{tt("ui.status.bae7", "Status")}</th>
                      <th>{tt("ui.start.952f", "Start")}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map(e => <tr key={e.id}>
                        <td>{e.name}</td>
                        <td>{e.event_type}</td>
                        <td>{e.location}</td>
                        <td>
                          <span className={`${styles.statusPill} ${styles[`status_${e.status}`] || ''}`}>
                            {(e.status || '').replace('_', ' ')}
                          </span>
                        </td>
                        <td>{formatDate(e.start_date)}</td>
                        <td>
                          <Link href={`/events/${e.slug || e.id}`} className={styles.smallBtn}>
                            {tt("ui.view.69bd", "View")}
                          </Link>
                        </td>
                      </tr>)}
                  </tbody>
                </table>
                {events.length === 0 && <div className={styles.sectionEmpty}>{tt("ui.no.events.hosted.yet.8ef6", "No events hosted yet.")}</div>}
              </div>}

            {activeTab === 'members' && <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{tt("ui.member.6853", "Member")}</th>
                      <th>{tt("ui.role.c3f1", "Role")}</th>
                      <th>{tt("ui.joined.43a1", "Joined")}</th>
                      {isOwner && <th className={styles.alignRight}>{tt("ui.actions.c3cd", "Actions")}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map(m => {
                  const role = (m.role || '').toLowerCase();
                  const isMemberOwner = role === 'owner';
                  return <tr key={m.id}>
                          <td>
                            <div className={styles.memberCell}>
                              <div className={styles.memberAvatar}>
                                {m.user?.avatar && <Image src={mediaUrl(m.user.avatar)} alt={m.user.full_name} width={32} height={32} />}
                              </div>
                              <div className={styles.memberText}>
                                <UserChip user={m.user} size={0} secondary
                                          nameClassName={styles.memberName}
                                          handleClassName={styles.memberHandle} />
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`${styles.rolePill} ${styles[`role_${role}`] || ''}`}>
                              {m.role}
                            </span>
                          </td>
                          <td>{formatDate(m.joined_at)}</td>
                          {isOwner && <td className={styles.alignRight}>
                              {isMemberOwner ? <span className={styles.cellMuted}>-</span> : <div className={styles.menuWrap}>
                                  <button type="button" className={styles.menuBtn} onClick={() => setOpenMenu(openMenu === m.id ? null : m.id)}>
                                    <BsThreeDots />
                                  </button>
                                  {openMenu === m.id && viewer.signedIn && <div className={styles.menuDropdown}>
                                      {role !== 'admin' && <button type="button" onClick={() => promoteMember(m, 'Admin')}>
                                          {tt("ui.promote.admin.7e73", "Promote to Admin")}
                                        </button>}
                                      {role !== 'manager' && <button type="button" onClick={() => promoteMember(m, 'Manager')}>
                                          {tt("ui.promote.manager.310c", "Promote to Manager")}
                                        </button>}
                                      {role !== 'member' && <button type="button" onClick={() => promoteMember(m, 'Member')}>
                                          {tt("ui.set.member.8fda", "Set to Member")}
                                        </button>}
                                      <button type="button" className={styles.menuDanger} onClick={() => kickMember(m)}>
                                        {tt("ui.kick.8c5e", "Kick")}
                                      </button>
                                    </div>}
                                </div>}
                            </td>}
                        </tr>;
                })}
                  </tbody>
                </table>
                {members.length === 0 && <div className={styles.sectionEmpty}>{tt("ui.no.members.yet.ea27", "No members yet.")}</div>}
              </div>}

            {activeTab === 'about' && <div className={styles.aboutGrid}>
                <section className={styles.panel}>
                  <h2 className={styles.panelTitle}>{tt("ui.about.6b21", "About")}</h2>
                  <dl className={styles.aboutList}>
                    <div className={styles.aboutRow}>
                      <dt><FiCalendar /> {tt("ui.founded.7cfb", "Founded")}</dt>
                      <dd>{org.founded ? formatDate(org.founded) : tx("Not set")}</dd>
                    </div>
                    <div className={styles.aboutRow}>
                      <dt><LuMapPin /> {tt("ui.location.d219", "Location")}</dt>
                      <dd>{org.location || org.region}</dd>
                    </div>
                    <div className={styles.aboutRow}>
                      <dt><FaEnvelope /> {tt("ui.email.84ad", "Email")}</dt>
                      <dd>
                        {org.contact_email ? <a href={`mailto:${org.contact_email}`} className={styles.linkAccent}>{org.contact_email}</a> : '-'}
                      </dd>
                    </div>
                    <div className={styles.aboutRow}>
                      <dt><MdBusiness /> {tt("ui.focus.fe7f", "Focus")}</dt>
                      <dd className={styles.capitalize}>{org.focus || '-'}</dd>
                    </div>
                  </dl>
                </section>

                <section className={styles.panel}>
                  <h2 className={styles.panelTitle}>{tt("ui.mission.e469", "Mission")}</h2>
                  <p className={styles.bioText}>{org.mission || '-'}</p>
                </section>

                <section className={styles.panel}>
                  <h2 className={styles.panelTitle}>{tt("ui.social.41a5", "Social")}</h2>
                  {socials.length === 0 ? <p className={styles.bioText}>{tt("ui.no.links.added.0dff", "No links added.")}</p> : <div className={styles.socialList}>
                      {socials.map(({
                  title,
                  url
                }) => {
                  const Icon = socialIconFor(title);
                  return <a key={title + url} href={url} target="_blank" rel="noopener noreferrer" className={styles.socialItem}>
                            <Icon className={styles.socialIcon} />
                            <span>{title}</span>
                          </a>;
                })}
                    </div>}
                </section>
              </div>}
          </div>
        </div>
      </main>

      <BottomMenu />

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>;
};
const OrgProfile = () => {
  const tt = useT();
  return <Suspense fallback={<p style={{
    padding: '2rem',
    color: '#fff'
  }}>{tt("ui.loading.33ce", "Loading…")}</p>}>
    <OrgProfileContent />
  </Suspense>;
};
export default OrgProfile;

// Exported so the slug route can render it. Everything a person
// clicks still lives here; the route file only supplies the address.
export { OrgProfileContent };