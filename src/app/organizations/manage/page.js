'use client';

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
const TABS = [{
  id: 'members',
  label: 'Members'
}, {
  id: 'teams',
  label: 'Teams'
}, {
  id: 'verification',
  label: 'Verification'
}];
const formatDate = iso => {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
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
      const [orgRes, memRes, reqRes, teamsRes, allTeamsRes, walletRes] = await Promise.all([fetch(`${API}/organization/${orgId}/`, {
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
    } catch (err) {
      setError(err.message);
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
    router.replace(`/organizations/manage?${params.toString()}`, {
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
          role
        })
      });
      const data = await res.json();
      if (data?.status === 'success') {
        setMembers(prev => prev.map(x => x.user?.id === m.user?.id ? {
          ...x,
          role
        } : x));
        showToast(`${m.user?.full_name || m.user?.username} → ${role}`);
      } else {
        showToast(data?.message || tt("api.failed", "Failed."));
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
        showToast(data?.message || tt("api.failed", "Failed."));
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
        showToast(data?.message || tt("api.failed", "Failed."));
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
        showToast(data?.message || tt("api.failed", "Failed."));
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
        showToast(data?.message || tt("api.couldNotLinkThatTeam", "Could not link that team."));
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
        showToast(data?.message || tt("api.couldNotUnlinkThatTeam", "Could not unlink that team."));
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
        showToast(data?.message || tt("api.failed", "Failed."));
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
                  {tt("ui.owner.only.controls.invite.65de", "Owner-only controls - invite members, link teams, request verification.")}
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
                                <p className={styles.memberName}>{r.user?.full_name}</p>
                                <p className={styles.memberHandle}>@{r.user?.username}</p>
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
                      <button type="button" className={styles.primaryBtn} onClick={() => showToast(tt("msg.inviteFlowComingSoon", "Invite flow coming soon."))}>
                        <LuUserPlus /> {tt("ui.invite.b136", "Invite")}
                      </button>
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
                              </td>
                              <td>{formatDate(m.joined_at)}</td>
                              <td className={styles.alignRight}>
                                {isMemberOwner ? <span className={styles.cellMuted}>-</span> : <div className={styles.menuWrap}>
                                    <button type="button" className={styles.menuBtn} onClick={() => setOpenMenu(openMenu === m.id ? null : m.id)}>
                                      <BsThreeDots />
                                    </button>
                                    {openMenu === m.id && <div className={styles.menuDropdown}>
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
                              </td>
                            </tr>;
                    })}
                      </tbody>
                    </table>
                    {filteredMembers.length === 0 && <div className={styles.sectionEmpty}>{tt("ui.no.members.match.a5a5", "No members match.")}</div>}
                  </div>
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