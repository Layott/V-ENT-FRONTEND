'use client';

import { apiMessage } from '@/lib/apiMessage';
import { mediaUrl } from '@/lib/mediaUrl';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { FaCheckCircle, FaShieldAlt, FaInfoCircle } from 'react-icons/fa';
import { LuUserPlus, LuArrowLeft } from 'react-icons/lu';
import { FiCheck, FiX, FiPlus, FiSearch } from 'react-icons/fi';
import { BsThreeDots } from 'react-icons/bs';
import Sidebar from '@/components/sidebar/Sidebar';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './manage-organization.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
import { appLocale } from '@/lib/appLocale';
import UserChip from '@/components/user-chip/UserChip';
import { sameUser, usernameOf } from '@/lib/gating';
const TABS = [{
  id: 'members',
  label: 'Members'
}, {
  id: 'invites',
  label: 'Invites'
}, {
  id: 'teams',
  label: 'Teams'
}, {
  id: 'clubs',
  label: 'Clubs'
}, {
  id: 'profile',
  label: 'Profile'
}, {
  id: 'verification',
  label: 'Verification'
}];

// The four parts of an organisation a manager can be given. Owners and admins
// hold all of them; the picker only ever applies to a manager.
const SCOPES = ['teams', 'events', 'tournaments', 'clubs'];
const ROLES = ['member', 'manager', 'admin'];
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
const ManageOrgContent = ({
  slug: slugFromPath
}) => {
  const tx = useTx();
  const tt = useT();
  const searchParams = useSearchParams();
  const router = useRouter();
  // No invented default: without ?id= there is no organization to manage.
  const orgId = slugFromPath || searchParams.get('id');
  const {
    data: session
  } = useSession();
  const [org, setOrg] = useState(null);
  const [members, setMembers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [teams, setTeams] = useState([]);
  const [allTeams, setAllTeams] = useState([]);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'members');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [verificationSubmitted, setVerificationSubmitted] = useState(false);
  const [kycVerified, setKycVerified] = useState(false);
  const [invites, setInvites] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [linkableClubs, setLinkableClubs] = useState([]);
  const [me, setMe] = useState(null);
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteScopes, setInviteScopes] = useState([]);
  const [inviteNote, setInviteNote] = useState('');
  const [inviting, setInviting] = useState(false);
  const [profileDraft, setProfileDraft] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [toast, setToast] = useState('');
  const showToast = msg => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2400);
  };

  // Server-computed membership role - the previous check compared against a
  // mock user id, so the real owner was locked out of their own org.
  const isOwner = org?.my_role === 'owner';
  const canManage = ['owner', 'admin', 'manager'].includes(org?.my_role);
  const loadAll = useCallback(async () => {
    // Nothing to load without an organization, and the authed calls 400 before
    // the NextAuth token resolves.
    if (!orgId || !session?.user?.sessionToken) {
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
      const [orgRes, memRes, reqRes, teamsRes, allTeamsRes, walletRes, capRes, invRes, clubRes] =
        await Promise.all([fetch(`${API}/organization/${orgId}/`, {
        headers
      }), fetch(`${API}/organization/${orgId}/members/`, {
        headers
      }), fetch(`${API}/organization/${orgId}/requests/`, {
        headers
      }), fetch(`${API}/organization/${orgId}/teams/`, {
        headers
      }), fetch(`${API}/organization/linkable-teams/`, {
        headers
      }), fetch(`${API}/auth/wallet/balance/`, {
        headers
      }), fetch(`${API}/organization/${orgId}/capabilities/`, {
        headers
      }), fetch(`${API}/organization/${orgId}/invites/`, {
        headers
      }), fetch(`${API}/organization/${orgId}/clubs/`, {
        headers
      })]);
      const orgData = await orgRes.json();
      setOrg(orgData?.data?.organization || null);
      const memData = await memRes.json();
      setMembers(memData?.data?.members || []);
      const reqData = await reqRes.json();
      setRequests(reqData?.data?.requests || []);
      const teamsData = await teamsRes.json();
      setTeams(teamsData?.data?.teams || []);
      const allTeamsData = await allTeamsRes.json();
      setAllTeams(allTeamsData?.data?.teams || []);
      const walletData = await walletRes.json();
      setKycVerified(!!walletData?.data?.kyc_verified);
      const capData = await capRes.json();
      setMe(capData?.data?.me || null);
      const invData = await invRes.json().catch(() => null);
      setInvites(invData?.data?.invites || []);
      const clubData = await clubRes.json().catch(() => null);
      setClubs(clubData?.data?.clubs || []);
      const mineRes = await fetch(`${API}/organization/linkable-clubs/`, { headers });
      const mineData = await mineRes.json().catch(() => null);
      setLinkableClubs(mineData?.data?.clubs || []);
      const o = orgData?.data?.organization;
      if (o) setProfileDraft({
        name: o.name || '',
        tag: o.tag || '',
        bio: o.bio || '',
        focus: o.focus || '',
        location: o.location || '',
        region: o.region || '',
        contact_email: o.contact_email || '',
        mission: o.mission || ''
      });
    } catch (err) {
      setError(apiMessage(tt, err, 'api.somethingWentWrong', 'Something went wrong. Try again in a moment.'));
    } finally {
      setLoading(false);
    }
  }, [orgId, session]);
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Sync tab to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', activeTab);
    // Keep the address we are actually on. This hardcoded
    // `/organizations/manage`, so arriving at `/organizations/<name>/manage`
    // rewrote the URL on the first render and threw the organisation away:
    // there was no slug in the path any more and no `?id=` either, so the page
    // looked itself up with nothing and reported "Organization not found".
    // That is what the CEO saw on every sub-page of an organisation.
    const base = slugFromPath
      ? `/organizations/${encodeURIComponent(slugFromPath)}/manage`
      : '/organizations/manage';
    router.replace(`${base}?${params.toString()}`, {
      scroll: false
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ── Action handlers ──
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
          // Lower case. The menu said "Admin" and posted "Admin", and the API
          // validates against admin / manager / member, so every one of these
          // buttons answered 400 and looked simply inert.
          role: String(role).toLowerCase(),
          scopes: m.scopes || []
        })
      });
      const data = await res.json();
      if (data?.status === 'success') {
        setMembers(prev => prev.map(x => sameUser(x.user?.id, m.user?.id)
          ? (data.data?.member || { ...x, role: String(role).toLowerCase() })
          : x));
        showToast(`${m.user?.full_name || m.user?.username} → ${role}`);
      } else {
        showToast(apiMessage(tt, data, "api.failed", "Failed."));
      }
    } catch {
      showToast(tt("msg.networkError", "Network error"));
    }
  };
  const authed = (extra = {}) => ({
    ...(session?.user?.sessionToken && {
      Authorization: `Bearer ${session.user.sessionToken}`
    }),
    ...extra
  });
  const post = async (path, body, asForm = false) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organization/${orgId}${path}`, {
      method: 'POST',
      headers: asForm ? authed() : authed({ 'Content-Type': 'application/json' }),
      body: asForm ? body : JSON.stringify(body || {})
    });
    const data = await res.json().catch(() => null);
    if (data?.status !== 'success') {
      showToast(apiMessage(tt, data, "api.failed", "Failed."));
      return null;
    }
    return data.data;
  };
  // Literal keys, not tx(). tx() reverse-looks-up a key by its English text,
  // which finds whichever key happened to be defined first: "Teams" had no
  // match at all and stayed English next to three translated words, and an
  // invite's status printed "Pending" in a French page.
  const scopeWord = scope => ({
    teams: tt("ui.scope.teams.6b12", "Teams"),
    events: tt("ui.scope.events.9d47", "Events"),
    tournaments: tt("ui.scope.tournaments.2f83", "Tournaments"),
    clubs: tt("ui.scope.clubs.4a06", "Clubs")
  }[scope] || scope);
  const roleWord = role => ({
    owner: tt("ui.org.role.owner.5d18", "owner"),
    admin: tt("ui.org.role.admin.2c47", "admin"),
    manager: tt("ui.org.role.manager.9b03", "manager"),
    member: tt("ui.org.role.member.7e56", "member")
  }[role] || role);
  const statusWord = status => ({
    pending: tt("ui.invite.pending.7c25", "Pending"),
    accepted: tt("ui.invite.accepted.1e94", "Accepted"),
    declined: tt("ui.invite.declined.3b70", "Declined"),
    cancelled: tt("ui.invite.cancelled.8f31", "Cancelled")
  }[status] || status);
  const toggleScope = scope => setInviteScopes(prev => prev.includes(scope)
    ? prev.filter(s => s !== scope)
    : [...prev, scope]);
  const sendInvite = async e => {
    e.preventDefault();
    const username = inviteName.trim().replace(/^@/, '');
    if (!username || inviting) return;
    setInviting(true);
    const data = await post('/invite/', {
      username,
      role: inviteRole,
      scopes: inviteRole === 'manager' ? inviteScopes : [],
      message: inviteNote.trim()
    });
    setInviting(false);
    if (data) {
      setInvites(prev => [data.invite, ...prev.filter(i => i.token !== data.invite.token)]);
      setInviteName('');
      setInviteNote('');
      setInviteScopes([]);
      showToast(tt("msg.inviteSent", "Invite sent."));
    }
  };
  const cancelInvite = async token => {
    const data = await post(`/invite/${token}/cancel/`);
    if (data) {
      setInvites(prev => prev.map(i => i.token === token ? { ...i, status: 'cancelled' } : i));
      showToast(tt("msg.inviteCancelled", "Invite cancelled."));
    }
  };
  const setMemberScopes = async (m, scopes) => {
    const data = await post('/role/', {
      username: m.user?.username,
      role: 'manager',
      scopes
    });
    if (data) {
      setMembers(prev => prev.map(x => sameUser(x.user?.id, m.user?.id) ? data.member : x));
      showToast(tt("msg.areasUpdated", "Areas updated."));
    }
  };
  const linkClub = async slug => {
    if (!slug) return;
    const data = await post('/link-club/', { club: slug });
    if (data) {
      const added = linkableClubs.find(c => c.slug === slug);
      if (added) setClubs(prev => [...prev, added]);
      setLinkableClubs(prev => prev.filter(c => c.slug !== slug));
      showToast(tt("msg.clubLinked", "Club added to the organization."));
    }
  };
  const unlinkClub = async club => {
    const data = await post('/unlink-club/', { club: club.slug });
    if (data) {
      setClubs(prev => prev.filter(c => c.slug !== club.slug));
      showToast(tt("msg.clubUnlinked", "Club removed from the organization."));
    }
  };
  const saveProfile = async e => {
    e.preventDefault();
    if (savingProfile || !profileDraft) return;
    setSavingProfile(true);
    const body = new FormData();
    Object.entries(profileDraft).forEach(([k, v]) => body.append(k, v ?? ''));
    if (logoFile) body.append('logo', logoFile);
    if (bannerFile) body.append('banner', bannerFile);
    const data = await post('/update/', body, true);
    setSavingProfile(false);
    if (data) {
      setOrg(data.organization);
      setLogoFile(null);
      setBannerFile(null);
      showToast(tt("msg.organizationUpdated", "Organization updated."));
      // The slug follows the name, so the address we are on may have just
      // stopped being the organisation's address.
      if (data.organization?.slug && slugFromPath && data.organization.slug !== slugFromPath) {
        router.replace(`/organizations/${data.organization.slug}/manage?tab=profile`);
      }
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
  const approveRequest = async r => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organization/${orgId}/approve-request/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.user?.sessionToken && {
            Authorization: `Bearer ${session.user.sessionToken}`
          })
        },
        body: JSON.stringify({
          request_id: r.id,
          role: r.role || 'Member'
        })
      });
      const data = await res.json();
      if (data?.status === 'success') {
        setRequests(prev => prev.filter(x => x.id !== r.id));
        setMembers(prev => [...prev, {
          id: `m_${r.id}`,
          org_id: orgId,
          user: r.user,
          role: r.role || 'Member',
          status: 'active',
          joined_at: new Date().toISOString()
        }]);
        showToast(`${r.user?.full_name || r.user?.username} approved.`);
      } else {
        showToast(apiMessage(tt, data, "api.failed", "Failed."));
      }
    } catch {
      showToast(tt("msg.networkError", "Network error"));
    }
  };
  const rejectRequest = async r => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organization/${orgId}/reject-request/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.user?.sessionToken && {
            Authorization: `Bearer ${session.user.sessionToken}`
          })
        },
        body: JSON.stringify({
          request_id: r.id
        })
      });
      const data = await res.json();
      if (data?.status === 'success') {
        setRequests(prev => prev.filter(x => x.id !== r.id));
        showToast(tt("msg.requestRejected", "Request rejected."));
      } else {
        showToast(apiMessage(tt, data, "api.failed", "Failed."));
      }
    } catch {
      showToast(tt("msg.networkError", "Network error"));
    }
  };

  // Linking writes to the server: a team belongs to one org at a time, and
  // only its owner may attach it.
  const linkTeam = async team => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organization/${orgId}/link-team/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.user?.sessionToken && {
            Authorization: `Bearer ${session.user.sessionToken}`
          })
        },
        body: JSON.stringify({
          team_id: team.id ?? team.team_id
        })
      });
      const data = await res.json();
      if (data?.status === 'success') {
        setTeams(prev => prev.find(t => t.id === team.id) ? prev : [...prev, team]);
        setAllTeams(prev => prev.filter(t => (t.id ?? t.team_id) !== (team.id ?? team.team_id)));
        showToast(data.message || `${team.name} linked.`);
      } else {
        showToast(apiMessage(tt, data, "api.couldNotLinkThatTeam", "Could not link that team."));
      }
    } catch {
      showToast(tt("msg.couldNotReachTheServer", "Could not reach the server."));
    }
  };
  const unlinkTeam = async team => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organization/${orgId}/unlink-team/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.user?.sessionToken && {
            Authorization: `Bearer ${session.user.sessionToken}`
          })
        },
        body: JSON.stringify({
          team_id: team.id ?? team.team_id
        })
      });
      const data = await res.json();
      if (data?.status === 'success') {
        setTeams(prev => prev.filter(t => t.id !== team.id));
        setAllTeams(prev => prev.find(t => (t.id ?? t.team_id) === (team.id ?? team.team_id)) ? prev : [...prev, team]);
        showToast(data.message || `${team.name} unlinked.`);
      } else {
        showToast(apiMessage(tt, data, "api.couldNotUnlinkThatTeam", "Could not unlink that team."));
      }
    } catch {
      showToast(tt("msg.couldNotReachTheServer", "Could not reach the server."));
    }
  };
  const submitVerification = async () => {
    if (!kycVerified) {
      showToast(tt("msg.completeKycFirstToRequest", "Complete KYC first to request verification."));
      return;
    }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organization/${orgId}/request-verification/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.user?.sessionToken && {
            Authorization: `Bearer ${session.user.sessionToken}`
          })
        }
      });
      const data = await res.json();
      if (data?.status === 'success') {
        setVerificationSubmitted(true);
        showToast(tt("msg.verificationRequestSubmitted", "Verification request submitted."));
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
            <p className={styles.statusText}>{tt("ui.loading.33ce", "Loading…")}</p>
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
  if (!canManage) {
    return <div className={styles.pageContainer}>
        <Header />
        <MobileHeader />
        <main className={styles.mainContainer}>
          <Sidebar />
          <div className={styles.rightPaneContainer}>
            <div className={styles.lockedCard}>
              <FaShieldAlt className={styles.lockedIcon} />
              <h1 className={styles.lockedTitle}>{tt("ui.owner.only.area.0227", "Owner-only area")}</h1>
              <p className={styles.lockedSub}>{tt("ui.do.not.have.permission.4f06", "You do not have permission to manage this organization.")}</p>
              <Link href={`/organizations/${orgId}`} className={styles.lockedBtn}>
                <LuArrowLeft /> {tt("ui.back.profile.ca6e", "Back to profile")}
              </Link>
            </div>
          </div>
        </main>
        <BottomMenu />
      </div>;
  }

  // Filter helpers
  const filteredMembers = members.filter(m => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return true;
    return (m.user?.full_name || '').toLowerCase().includes(q) || (m.user?.username || '').toLowerCase().includes(q) || (m.role || '').toLowerCase().includes(q);
  });
  const linkedTeamIds = new Set(teams.map(t => t.id));
  const availableTeams = allTeams.filter(t => !linkedTeamIds.has(t.id)).filter(t => {
    const q = teamSearch.trim().toLowerCase();
    if (!q) return true;
    return (t.name || '').toLowerCase().includes(q) || (t.tag || '').toLowerCase().includes(q);
  });
  return <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          {/* ── Header row ── */}
          <div className={styles.headerRow}>
            <div className={styles.headerLeft}>
              <Link href={`/organizations/${orgId}`} className={styles.backChip}>
                <LuArrowLeft /> {tt("ui.back.profile.ca6e", "Back to profile")}
              </Link>
              <div>
                <h1 className={styles.pageTitle}>{tt("ui.manage.bf58", "Manage")} {org.name}</h1>
                <p className={styles.pageSubtitle}>
                  {tt("ui.owner.only.controls.invite.65de", "Invite people, set what each of them runs, link teams and clubs, edit the profile.")}
                </p>
              </div>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className={styles.tabsRow}>
            {TABS.map(t => <button key={t.id} type="button" className={`${styles.tabBTN} ${activeTab === t.id ? styles.activeTab : ''}`} onClick={() => setActiveTab(t.id)}>
                {tx(t.label)}
                {t.id === 'members' && requests.length > 0 && <span className={styles.tabBadge}>{requests.length}</span>}
              </button>)}
          </div>

          {/* ── Tab content ── */}
          <div className={styles.tabPanel}>
            {activeTab === 'members' && <div className={styles.membersWrap}>
                {requests.length > 0 && <section className={styles.panel}>
                    <h2 className={styles.panelTitle}>
                      {tt("ui.pending.requests.d1ae", "Pending requests")} <span className={styles.countPill}>{requests.length}</span>
                    </h2>
                    <ul className={styles.requestList}>
                      {requests.map(r => <li key={r.id} className={styles.requestCard}>
                          <div className={styles.requestHead}>
                            <div className={styles.memberCell}>
                              <div className={styles.memberAvatar}>
                                {r.user?.avatar && <Image src={mediaUrl(r.user.avatar)} alt={r.user.full_name} width={36} height={36} />}
                              </div>
                              <div>
                                <UserChip user={r.user} size={0} secondary
                                          nameClassName={styles.memberName}
                                          handleClassName={styles.memberHandle} />
                              </div>
                            </div>
                            <span className={styles.requestTime}>{formatDate(r.requested_at)}</span>
                          </div>
                          {r.message && <p className={styles.requestMessage}>&ldquo;{r.message}&rdquo;</p>}
                          <div className={styles.requestActions}>
                            <button type="button" className={`${styles.miniBtn} ${styles.miniBtnSuccess}`} onClick={() => approveRequest(r)}>
                              <FiCheck /> {tt("ui.approve.7b2c", "Approve")}
                            </button>
                            <button type="button" className={`${styles.miniBtn} ${styles.miniBtnDanger}`} onClick={() => rejectRequest(r)}>
                              <FiX /> {tt("ui.reject.2b03", "Reject")}
                            </button>
                          </div>
                        </li>)}
                    </ul>
                  </section>}

                <section className={styles.panel}>
                  <div className={styles.panelHeader}>
                    <h2 className={styles.panelTitle}>
                      {tt("ui.members.1cb4", "Members")} <span className={styles.countPill}>{members.length}</span>
                    </h2>
                    <div className={styles.panelHeaderActions}>
                      <div className={styles.searchBar}>
                        <FiSearch className={styles.searchIcon} />
                        <input type="text" placeholder={tt("ui.search.members.bdad", "Search members…")} value={memberSearch} onChange={e => setMemberSearch(e.target.value)} className={styles.searchInput} />
                      </div>
                      {me?.can_invite && <button type="button" className={styles.primaryBtn} onClick={() => setActiveTab('invites')}>
                        <LuUserPlus /> {tt("ui.invite.b136", "Invite")}
                      </button>}
                    </div>
                  </div>

                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>{tt("ui.member.6853", "Member")}</th>
                          <th>{tt("ui.role.c3f1", "Role")}</th>
                          <th>{tt("ui.joined.43a1", "Joined")}</th>
                          <th className={styles.alignRight}>{tt("ui.actions.c3cd", "Actions")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMembers.map(m => {
                      const role = (m.role || '').toLowerCase();
                      const isMemberOwner = role === 'owner';
                      return <tr key={m.id}>
                              <td>
                                <div className={styles.memberCell}>
                                  <div className={styles.memberAvatar}>
                                    {m.user?.avatar && <Image src={mediaUrl(m.user.avatar)} alt={m.user.full_name} width={32} height={32} />}
                                  </div>
                                  <div className={styles.memberText}>
                                    <span className={styles.memberName}>{m.user?.full_name}</span>
                                    <span className={styles.memberHandle}>@{m.user?.username}</span>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className={`${styles.rolePill} ${styles[`role_${role}`] || ''}`}>
                                  {m.role}
                                </span>
                                {role === 'manager' && <div className={styles.scopeRow}>
                                  {SCOPES.map(sc => {
                                    const on = (m.scopes || []).includes(sc);
                                    return <button key={sc} type="button" disabled={!me?.can_manage_roles}
                                                   className={`${styles.scopeChip} ${on ? styles.scopeChipOn : ''}`}
                                                   onClick={() => setMemberScopes(m, on
                                                     ? (m.scopes || []).filter(x => x !== sc)
                                                     : [...(m.scopes || []), sc])}>
                                      {scopeWord(sc)}
                                    </button>;
                                  })}
                                </div>}
                              </td>
                              <td>{formatDate(m.joined_at)}</td>
                              <td className={styles.alignRight}>
                                {isMemberOwner ? <span className={styles.cellMuted}>-</span> : <div className={styles.menuWrap}>
                                    <button type="button" className={styles.menuBtn} onClick={() => setOpenMenu(openMenu === m.id ? null : m.id)}>
                                      <BsThreeDots />
                                    </button>
                                    {openMenu === m.id && <div className={styles.menuDropdown}>
                                        {role !== 'admin' && <button type="button" onClick={() => promoteMember(m, 'admin')}>
                                            {tt("ui.promote.admin.7e73", "Promote to Admin")}
                                          </button>}
                                        {role !== 'manager' && <button type="button" onClick={() => promoteMember(m, 'manager')}>
                                            {tt("ui.promote.manager.310c", "Promote to Manager")}
                                          </button>}
                                        {role !== 'member' && <button type="button" onClick={() => promoteMember(m, 'member')}>
                                            {tt("ui.set.member.8fda", "Set to Member")}
                                          </button>}
                                        <button type="button" className={styles.menuDanger} onClick={() => kickMember(m)}>
                                          {tt("ui.kick.8c5e", "Kick")}
                                        </button>
                                      </div>}
                                  </div>}
                              </td>
                            </tr>;
                    })}
                      </tbody>
                    </table>
                    {filteredMembers.length === 0 && <div className={styles.sectionEmpty}>{tt("ui.no.members.match.a5a5", "No members match.")}</div>}
                  </div>
                </section>
              </div>}

            {activeTab === 'invites' && <div className={styles.membersWrap}>
                {me?.can_invite ? <section className={styles.panel}>
                    <h2 className={styles.panelTitle}>{tt("ui.invite.somebody.4a71", "Invite somebody")}</h2>
                    <p className={styles.panelNote}>
                      {tt("ui.invite.note.6b3c", "Pick the role now. Whoever you invite joins with it in one press, so there is nothing left for you to grade afterwards.")}
                    </p>
                    <form className={styles.inviteForm} onSubmit={sendInvite}>
                      <label className={styles.formField}>
                        <span className={styles.formLabel}>{tt("ui.username.9c30", "Username")}</span>
                        <input className={styles.formInput} value={inviteName} placeholder="@player"
                               onChange={e => setInviteName(e.target.value)} />
                      </label>
                      <label className={styles.formField}>
                        <span className={styles.formLabel}>{tt("ui.role.c3f1", "Role")}</span>
                        <select className={styles.formInput} value={inviteRole}
                                onChange={e => setInviteRole(e.target.value)}>
                          {ROLES.filter(r => r !== 'admin' || me?.role === 'owner')
                            .map(r => <option key={r} value={r}>{roleWord(r)}</option>)}
                        </select>
                      </label>
                      {inviteRole === 'manager' && <div className={styles.formField}>
                        <span className={styles.formLabel}>
                          {tt("ui.areas.they.run.2f18", "Areas they run")}
                        </span>
                        <div className={styles.scopeRow}>
                          {SCOPES.map(sc => <button key={sc} type="button"
                                                    className={`${styles.scopeChip} ${inviteScopes.includes(sc) ? styles.scopeChipOn : ''}`}
                                                    onClick={() => toggleScope(sc)}>
                            {scopeWord(sc)}
                          </button>)}
                        </div>
                      </div>}
                      <label className={styles.formField}>
                        <span className={styles.formLabel}>{tt("ui.message.optional.7d24", "Message (optional)")}</span>
                        <input className={styles.formInput} value={inviteNote} maxLength={280}
                               onChange={e => setInviteNote(e.target.value)} />
                      </label>
                      <button type="submit" className={styles.primaryBtn} disabled={inviting || !inviteName.trim()}>
                        <LuUserPlus /> {inviting ? tt("ui.sending.5e91", "Sending…") : tt("ui.send.invite.1a06", "Send invite")}
                      </button>
                    </form>
                  </section> : <section className={styles.panel}>
                    <p className={styles.sectionEmpty}>
                      {tt("ui.invite.not.allowed.8c52", "Your role in this organization does not allow inviting people.")}
                    </p>
                  </section>}

                <section className={styles.panel}>
                  <h2 className={styles.panelTitle}>
                    {tt("ui.invites.sent.3b90", "Invites sent")} <span className={styles.countPill}>{invites.length}</span>
                  </h2>
                  {invites.length === 0 ? <p className={styles.sectionEmpty}>
                      {tt("ui.no.invites.yet.5e07", "No invites yet.")}
                    </p> : <ul className={styles.requestList}>
                      {invites.map(i => <li key={i.token} className={styles.requestCard}>
                          <div className={styles.requestHead}>
                            <div className={styles.memberCell}>
                              <div className={styles.memberAvatar}>
                                {i.user?.avatar && <Image src={mediaUrl(i.user.avatar)} alt={i.user.username} width={36} height={36} />}
                              </div>
                              <div className={styles.memberText}>
                                <UserChip user={i.user} size={0} nameClassName={styles.memberName} />
                                <span className={styles.memberHandle}>
                                  {roleWord(i.role)}
                                  {i.scopes?.length ? ` · ${i.scopes.map(scopeWord).join(', ')}` : ''}
                                </span>
                              </div>
                            </div>
                            <span className={`${styles.rolePill} ${styles[`invite_${i.status}`] || ''}`}>
                              {statusWord(i.status)}
                            </span>
                          </div>
                          {i.message && <p className={styles.requestMessage}>&ldquo;{i.message}&rdquo;</p>}
                          {i.status === 'pending' && me?.can_invite && <div className={styles.requestActions}>
                            <button type="button" className={`${styles.miniBtn} ${styles.miniBtnDanger}`}
                                    onClick={() => cancelInvite(i.token)}>
                              <FiX /> {tt("ui.cancel.3f11", "Cancel")}
                            </button>
                          </div>}
                        </li>)}
                    </ul>}
                </section>
              </div>}

            {activeTab === 'clubs' && <div className={styles.teamsWrap}>
                <section className={styles.panel}>
                  <h2 className={styles.panelTitle}>
                    {tt("ui.clubs.under.org.9a12", "Clubs under this organization")} <span className={styles.countPill}>{clubs.length}</span>
                  </h2>
                  <p className={styles.panelNote}>
                    {tt("ui.clubs.note.4d80", "Only a club's owner can hand it over, so the list below is the clubs you own that belong to nobody yet.")}
                  </p>
                  {me?.areas?.includes('clubs') && <div className={styles.linkRow}>
                    <select className={styles.formInput} defaultValue=""
                            aria-label={tt("ui.add.club.6d18", "Add a club")}
                            onChange={e => { linkClub(e.target.value); e.target.value = ''; }}>
                      <option value="">
                        {linkableClubs.length
                          ? tt("ui.add.club.6d18", "Add a club")
                          : tt("ui.no.clubs.to.add.9c41", "You own no unattached clubs")}
                      </option>
                      {linkableClubs.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                    </select>
                  </div>}
                  {clubs.length === 0 ? <p className={styles.sectionEmpty}>
                      {tt("ui.no.clubs.linked.7f3b", "No clubs belong to this organization yet.")}
                    </p> : <ul className={styles.teamList}>
                      {clubs.map(c => <li key={c.slug || c.id} className={styles.teamRow}>
                          <div className={styles.teamLogo}>
                            {c.logo && <Image src={mediaUrl(c.logo)} alt={c.name} width={36} height={36} />}
                          </div>
                          <div className={styles.teamMeta}>
                            <Link href={`/community/club/${c.slug}`} className={styles.teamName}>{c.name}</Link>
                            <span className={styles.teamSub}>
                              {c.member_count} {tt("ui.members.lower.51bd", "members")}{c.game ? ` · ${c.game}` : ''}
                            </span>
                          </div>
                          {me?.areas?.includes('clubs') && <button type="button" className={`${styles.miniBtn} ${styles.miniBtnDanger}`}
                                  onClick={() => unlinkClub(c)}>
                            <FiX /> {tt("ui.remove.7b26", "Remove")}
                          </button>}
                        </li>)}
                    </ul>}
                </section>
              </div>}

            {activeTab === 'profile' && <div className={styles.membersWrap}>
                <section className={styles.panel}>
                  <h2 className={styles.panelTitle}>{tt("ui.organization.profile.2c64", "Organization profile")}</h2>
                  {!me?.can_edit_profile ? <p className={styles.sectionEmpty}>
                      {tt("ui.profile.not.allowed.6e29", "Your role in this organization does not allow editing the profile.")}
                    </p> : <form className={styles.profileForm} onSubmit={saveProfile}>
                      <div className={styles.uploadRow}>
                        <div className={styles.uploadBox}>
                          <span className={styles.formLabel}>{tt("ui.logo.83fc", "Logo")}</span>
                          <div className={styles.uploadPreview}>
                            {(logoFile || org.logo) && <Image
                              src={logoFile ? URL.createObjectURL(logoFile) : mediaUrl(org.logo)}
                              alt={org.name} width={72} height={72} unoptimized />}
                          </div>
                          <input type="file" accept="image/*" className={styles.fileInput}
                                 onChange={e => setLogoFile(e.target.files?.[0] || null)} />
                        </div>
                        <div className={styles.uploadBox}>
                          <span className={styles.formLabel}>{tt("ui.banner.4a37", "Banner")}</span>
                          <div className={styles.uploadPreviewWide}>
                            {(bannerFile || org.banner) && <Image
                              src={bannerFile ? URL.createObjectURL(bannerFile) : mediaUrl(org.banner)}
                              alt={org.name} width={240} height={72} unoptimized />}
                          </div>
                          <input type="file" accept="image/*" className={styles.fileInput}
                                 onChange={e => setBannerFile(e.target.files?.[0] || null)} />
                        </div>
                      </div>

                      <div className={styles.formGrid}>
                        {[['name', tt("ui.name.a91c", "Name")], ['tag', tt("ui.tag.5d7e", "Tag")],
                          ['focus', tt("ui.focus.3a1b", "Focus")], ['location', tt("ui.location.9b24", "Location")],
                          ['region', tt("ui.region.7c05", "Region")], ['contact_email', tt("ui.contact.email.4f19", "Contact email")]]
                          .map(([key, label]) => <label key={key} className={styles.formField}>
                            <span className={styles.formLabel}>{label}</span>
                            <input className={styles.formInput} value={profileDraft?.[key] || ''}
                                   onChange={e => setProfileDraft(d => ({ ...d, [key]: e.target.value }))} />
                          </label>)}
                      </div>
                      <label className={styles.formField}>
                        <span className={styles.formLabel}>{tt("ui.bio.8e42", "Bio")}</span>
                        <textarea className={styles.formTextarea} rows={3} maxLength={280}
                                  value={profileDraft?.bio || ''}
                                  onChange={e => setProfileDraft(d => ({ ...d, bio: e.target.value }))} />
                      </label>
                      <label className={styles.formField}>
                        <span className={styles.formLabel}>{tt("ui.mission.1d76", "Mission")}</span>
                        <textarea className={styles.formTextarea} rows={4}
                                  value={profileDraft?.mission || ''}
                                  onChange={e => setProfileDraft(d => ({ ...d, mission: e.target.value }))} />
                      </label>
                      <button type="submit" className={styles.primaryBtn} disabled={savingProfile}>
                        {savingProfile ? tt("ui.saving.2b8f", "Saving…") : tt("ui.save.changes.5c30", "Save changes")}
                      </button>
                    </form>}
                </section>
              </div>}

            {activeTab === 'teams' && <div className={styles.teamsWrap}>
                <section className={styles.panel}>
                  <h2 className={styles.panelTitle}>
                    {tt("ui.linked.teams.0864", "Linked teams")} <span className={styles.countPill}>{teams.length}</span>
                  </h2>
                  {teams.length === 0 ? <p className={styles.bioText}>{tt("ui.no.teams.linked.yet.d22b", "No teams linked yet. Link an existing team below.")}</p> : <ul className={styles.teamList}>
                      {teams.map(t => <li key={t.id} className={styles.teamRow}>
                          <div className={styles.teamLogo}>
                            {t.logo && <Image src={mediaUrl(t.logo)} alt={t.name} width={36} height={36} />}
                          </div>
                          <div className={styles.teamMeta}>
                            <span className={styles.teamName}>{t.name}</span>
                            <span className={styles.teamSub}>{t.game} · {t.members ?? t.member_count ?? 0}{(t.members ?? t.member_count ?? 0) === 1 ? ' member' : ' members'}</span>
                          </div>
                          <button type="button" className={`${styles.miniBtn} ${styles.miniBtnDanger}`} onClick={() => unlinkTeam(t)}>
                            <FiX /> {tt("ui.unlink.0dc2", "Unlink")}
                          </button>
                        </li>)}
                    </ul>}
                </section>

                <section className={styles.panel}>
                  <div className={styles.panelHeader}>
                    <h2 className={styles.panelTitle}>{tt("ui.available.teams.50cd", "Available teams")}</h2>
                    <div className={styles.searchBar}>
                      <FiSearch className={styles.searchIcon} />
                      <input type="text" placeholder={tt("ui.search.teams.07a1", "Search teams…")} value={teamSearch} onChange={e => setTeamSearch(e.target.value)} className={styles.searchInput} />
                    </div>
                  </div>
                  {availableTeams.length === 0 ? <p className={styles.bioText}>{tt("ui.no.teams.available.414a", "No teams available.")}</p> : <ul className={styles.teamList}>
                      {availableTeams.map(t => <li key={t.id} className={styles.teamRow}>
                          <div className={styles.teamLogo}>
                            {t.logo && <Image src={mediaUrl(t.logo)} alt={t.name} width={36} height={36} />}
                          </div>
                          <div className={styles.teamMeta}>
                            <span className={styles.teamName}>{t.name}</span>
                            <span className={styles.teamSub}>{t.game} · {t.members ?? t.member_count ?? 0}{(t.members ?? t.member_count ?? 0) === 1 ? ' member' : ' members'}</span>
                          </div>
                          <button type="button" className={`${styles.miniBtn} ${styles.miniBtnSuccess}`} onClick={() => linkTeam(t)}>
                            <FiPlus /> {tt("ui.link.d051", "Link")}
                          </button>
                        </li>)}
                    </ul>}
                </section>
              </div>}

            {activeTab === 'verification' && <div className={styles.verifyWrap}>
                <section className={styles.panel}>
                  <div className={styles.verifyHead}>
                    <FaCheckCircle className={styles.verifyIcon} />
                    <div>
                      <h2 className={styles.panelTitle}>{tt("ui.verified.status.eb87", "Verified status")}</h2>
                      <p className={styles.bioText}>
                        {tt("ui.verified.orgs.get.blue.a944", "Verified orgs get a blue tick across the platform - required for hosting paid tournaments,\n                        receiving sponsor payouts, and running events with V-ENT branding.")}
                      </p>
                    </div>
                  </div>

                  <div className={styles.verifyChecklist}>
                    <div className={`${styles.verifyItem} ${kycVerified ? styles.verifyItemDone : ''}`}>
                      <span className={styles.verifyTick}>
                        {kycVerified ? <FiCheck /> : <FaInfoCircle />}
                      </span>
                      <div>
                        <p className={styles.verifyItemTitle}>{tt("ui.owner.kyc.66d4", "Owner KYC")}</p>
                        <p className={styles.verifyItemSub}>
                          {kycVerified ? tx("Owner identity verified on V-ENT.") : tx("You must complete KYC on your wallet before requesting verification.")}
                        </p>
                      </div>
                      {!kycVerified && <Link href="/wallets" className={styles.verifyAction}>
                          {tt("ui.go.kyc.0dff", "Go to KYC")}
                        </Link>}
                    </div>

                    <div className={`${styles.verifyItem} ${(org.member_count ?? 0) >= 5 ? styles.verifyItemDone : ''}`}>
                      <span className={styles.verifyTick}>
                        {(org.member_count ?? 0) >= 5 ? <FiCheck /> : <FaInfoCircle />}
                      </span>
                      <div>
                        <p className={styles.verifyItemTitle}>{tt("ui.members.e611", "5+ members")}</p>
                        <p className={styles.verifyItemSub}>
                          {tt("ui.have.799c", "You have")} {org.member_count} {tt("ui.member.6467", "member")}{org.member_count === 1 ? '' : 's'}{tt("ui.verified.orgs.need.at.40b3", ". Verified orgs need at least 5.")}
                        </p>
                      </div>
                    </div>

                    <div className={`${styles.verifyItem} ${(org.tournaments_hosted ?? 0) >= 1 ? styles.verifyItemDone : ''}`}>
                      <span className={styles.verifyTick}>
                        {(org.tournaments_hosted ?? 0) >= 1 ? <FiCheck /> : <FaInfoCircle />}
                      </span>
                      <div>
                        <p className={styles.verifyItemTitle}>{tt("ui.hosted.least.tournament.3383", "Hosted at least 1 tournament")}</p>
                        <p className={styles.verifyItemSub}>
                          {tt("ui.have.hosted.73bd", "You have hosted")} {org.tournaments_hosted || 0} {tt("ui.tournament.cb9d", "tournament")}{org.tournaments_hosted === 1 ? '' : 's'}.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={styles.verifyCta}>
                    {org.verified ? <div className={styles.verifyAlreadyDone}>
                        <FaCheckCircle /> {tt("ui.organization.already.verified.806f", "This organization is already verified.")}
                      </div> : verificationSubmitted ? <div className={styles.verifyAlreadyDone}>
                        <FaCheckCircle /> {tt("ui.verification.request.submitted.review.10de", "Verification request submitted - review takes 3-5 business days.")}
                      </div> : <button type="button" className={styles.primaryBtn} onClick={submitVerification} disabled={!kycVerified}>
                        {tt("ui.request.verification.1766", "Request verification")}
                      </button>}
                  </div>
                </section>
              </div>}
          </div>
        </div>
      </main>

      <BottomMenu />

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>;
};
const ManageOrg = () => {
  const tt = useT();
  return <Suspense fallback={<p style={{
    padding: '2rem',
    color: '#fff'
  }}>{tt("ui.loading.33ce", "Loading…")}</p>}>
    <ManageOrgContent />
  </Suspense>;
};
export default ManageOrg;

// Exported so the slug route can render it. Everything a person
// clicks still lives here; the route file only supplies the address.
export { ManageOrgContent };