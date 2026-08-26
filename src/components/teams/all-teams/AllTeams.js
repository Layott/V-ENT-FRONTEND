'use client';

import { apiMessage } from '@/lib/apiMessage';
import { mediaUrl, teamLogo } from '@/lib/mediaUrl';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { CiSearch } from 'react-icons/ci';
import { TiArrowSortedDown } from 'react-icons/ti';
import { FiPlus } from 'react-icons/fi';
import { LuGamepad2, LuMapPin } from 'react-icons/lu';
import { AiOutlineTeam } from 'react-icons/ai';
import { GoDotFill } from 'react-icons/go';
import { HiOutlineTrophy } from 'react-icons/hi2';
import styles from './all-teams.module.css';
import useGames from '@/hooks/useGames';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const TABS = [{
  id: 'all',
  label: 'All'
}, {
  id: 'owned',
  label: 'Owned by me'
}, {
  id: 'joined',
  label: 'Joined'
}, {
  id: 'invited',
  label: 'Invited'
}];
const REGIONS = ['Nigeria', 'Ghana', 'Kenya', 'South Africa'];
const AllTeams = () => {
  const tx = useTx();
  const tt = useT();
  const {
    gameTitles
  } = useGames();
  const {
    data: session
  } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'all');
  const [game, setGame] = useState(searchParams.get('game') || '');
  const [region, setRegion] = useState(searchParams.get('region') || '');
  const [openToJoin, setOpenToJoin] = useState(searchParams.get('open_to_join') || '');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingRequests, setPendingRequests] = useState({});
  const [toast, setToast] = useState('');
  const fetchTeams = useCallback(async () => {
    if (!session?.user?.sessionToken) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (activeTab && activeTab !== 'all') params.set('tab', activeTab);
      if (game) params.set('game', game);
      if (region) params.set('region', region);
      if (openToJoin) params.set('open_to_join', openToJoin);
      if (search) params.set('search', search);
      const headers = {
        'Content-Type': 'application/json'
      };
      if (session?.user?.sessionToken) {
        headers['Authorization'] = `Bearer ${session.user.sessionToken}`;
      }
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/team/get-all-teams/?${params.toString()}`, {
        headers
      });
      if (!res.ok) throw new Error(`Failed to load teams (${res.status})`);
      const data = await res.json();
      const list = data?.data?.teams ?? data?.data ?? data ?? [];
      setTeams(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message);
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, game, region, openToJoin, search, session]);
  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  // Sync URL with filters / tab
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab && activeTab !== 'all') params.set('tab', activeTab);
    if (game) params.set('game', game);
    if (region) params.set('region', region);
    if (openToJoin) params.set('open_to_join', openToJoin);
    if (search) params.set('search', search);
    const qs = params.toString();
    router.replace(`/teams${qs ? `?${qs}` : ''}`, {
      scroll: false
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, game, region, openToJoin, search]);
  const showToast = msg => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2400);
  };
  const requestJoin = async teamId => {
    setPendingRequests(s => ({
      ...s,
      [teamId]: 'loading'
    }));
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
        setPendingRequests(s => ({
          ...s,
          [teamId]: 'pending'
        }));
        showToast(tt("msg.requestSentPendingApproval", "Request sent - pending approval"));
      } else {
        setPendingRequests(s => ({
          ...s,
          [teamId]: null
        }));
        showToast(apiMessage(tt, data, "api.requestFailed", "Request failed"));
      }
    } catch {
      setPendingRequests(s => ({
        ...s,
        [teamId]: null
      }));
      showToast(tt("msg.networkError", "Network error"));
    }
  };
  const getImageUrl = (path) => mediaUrl(path);
  const isOwner = team => team?.owner?.id === session?.user?.id || team?.owner?.username === session?.user?.username;
  // Real win rate only. This used to add a flat +30 and clamp to 8-95, so a
  // team that had never played a match still advertised "30%".
  const winRate = team => {
    const played = Number(team.tournaments_played || 0);
    if (!played) return null;
    return Math.round(Number(team.tournaments_won || 0) / played * 100);
  };
  return <div className={styles.allTeamsContainer}>
      <div className={styles.headerRow}>
        <div>
          <h3 className={styles.pageTitle}>{tt("ui.teams.cbfd", "Teams")}</h3>
          <p className={styles.pageSub}>{tt("ui.browse.join.manage.competitive.1fc5", "Browse, join and manage competitive squads.")}</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/teams/create-team" className={`${styles.createTeamBTN}`}>
            <FiPlus className={styles.plusIcon} />
            {tt("ui.create.team.8d82", "Create team")}
          </Link>
        </div>
      </div>

      <div className={styles.tabsRow}>
        {TABS.map(t => <button key={t.id} type="button" className={`${styles.tabBTN} ${activeTab === t.id ? styles.activeTab : ''}`} onClick={() => setActiveTab(t.id)}>
            {tx(t.label)}
          </button>)}
      </div>

      <div className={styles.filtersRow}>
        <div className={styles.searchBar}>
          <CiSearch className={styles.searchIcon} />
          <input type="text" placeholder={tt("ui.search.teams.07a1", "Search teams…")} value={search} onChange={e => setSearch(e.target.value)} className={styles.searchInput} />
        </div>

        <div className={styles.filterSelect}>
          <select value={game} onChange={e => setGame(e.target.value)} className={styles.select}>
            <option value="">{tt("ui.all.games.f0ae", "All games")}</option>
            {gameTitles.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <TiArrowSortedDown className={styles.selectCaret} />
        </div>

        <div className={styles.filterSelect}>
          <select value={region} onChange={e => setRegion(e.target.value)} className={styles.select}>
            <option value="">{tt("ui.all.regions.3fc0", "All regions")}</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <TiArrowSortedDown className={styles.selectCaret} />
        </div>

        <div className={styles.filterSelect}>
          <select value={openToJoin} onChange={e => setOpenToJoin(e.target.value)} className={styles.select}>
            <option value="">{tt("ui.open.join.any.677a", "Open to join · Any")}</option>
            <option value="yes">{tt("ui.yes.5397", "Yes")}</option>
            <option value="no">{tt("ui.no.816c", "No")}</option>
          </select>
          <TiArrowSortedDown className={styles.selectCaret} />
        </div>
      </div>

      {loading && <div className={styles.cardGrid}>
          {Array.from({
        length: 6
      }).map((_, i) => <div key={i} className={`${styles.card} ${styles.skeleton}`}>
              <div className={styles.cardBanner} />
              <div className={styles.cardLogo} />
              <div className={styles.cardBody}>
                <div className={styles.skeletonLine} style={{
            width: '60%'
          }} />
                <div className={styles.skeletonLine} style={{
            width: '40%'
          }} />
              </div>
            </div>)}
        </div>}

      {!loading && error && <p className={styles.errorText}>{error}</p>}

      {!loading && !error && teams.length === 0 && <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>{tt("ui.no.teams.found.197b", "No teams found")}</p>
          <p className={styles.emptySub}>{tt("ui.try.different.filter.create.1b20", "Try a different filter, or create your own team.")}</p>
          <Link href="/teams/create-team" className={`${styles.createTeamBTN} ${styles.emptyCta}`}>
            <FiPlus className={styles.plusIcon} /> {tt("ui.create.team.8d82", "Create team")}
          </Link>
        </div>}

      {!loading && !error && teams.length > 0 && <div className={styles.cardGrid}>
          {teams.map(team => {
        const teamId = team.id || team.team_id;
        const bannerUrl = getImageUrl(team.banner || team.banner_url || team.team_banner);
        const logoUrl = teamLogo(team);
        const owned = isOwner(team);
        const open = team.is_accepting_members ?? team.open_to_join ?? false;
        const reqState = pendingRequests[teamId];
        return <div key={teamId} className={styles.card}>
                <div className={styles.cardBanner}>
                  {bannerUrl ? <Image src={mediaUrl(bannerUrl)} alt={team.name} fill style={{
              objectFit: 'cover'
            }} sizes="400px" /> : <div className={styles.placeholderBanner} />}
                  {open && !owned && <span className={styles.openBadge}>{tt("ui.open.cf9b", "Open")}</span>}
                  {owned && <span className={styles.ownedBadge}>{tt("ui.owner.89ff", "Owner")}</span>}
                </div>

                <div className={styles.cardLogoWrap}>
                  {logoUrl ? <Image src={mediaUrl(logoUrl)} alt="" aria-hidden="true" width={56} height={56} className={styles.cardLogo} /> : <div className={`${styles.cardLogo} ${styles.placeholderLogo}`} />}
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.cardHeader}>
                    <h4 className={styles.teamName}>{team.name}</h4>
                    <span className={styles.teamTag}>{team.tag}</span>
                  </div>

                  <div className={styles.cardMeta}>
                    <span className={styles.metaItem}>
                      <LuGamepad2 className={styles.metaIcon} />
                      {team.game || team.core_game || 'N/A'}
                    </span>
                    <GoDotFill className={styles.dotIcon} />
                    <span className={styles.metaItem}>
                      <AiOutlineTeam className={styles.metaIcon} />
                      {team.member_count ?? 0} {tt("ui.members.f13e", "members")}
                    </span>
                  </div>

                  <div className={styles.statsRow}>
                    <div className={styles.statBlock}>
                      <span className={styles.statValue}>
                        {winRate(team) === null ? '-' : `${winRate(team)}%`}
                      </span>
                      <span className={styles.statLabel}>{tt("ui.win.rate.79bc", "Win rate")}</span>
                    </div>
                    <div className={styles.statBlock}>
                      <span className={styles.statValue}>
                        <HiOutlineTrophy className={styles.trophyIcon} />
                        {team.tournaments_won || 0}
                      </span>
                      <span className={styles.statLabel}>{tt("ui.wins.b6c0", "Wins")}</span>
                    </div>
                  </div>

                  <div className={styles.cardActions}>
                    {owned || reqState === 'pending' ? <button type="button" className={`${styles.actionBtn} ${styles.actionDisabled}`} disabled>
                        {owned ? tx("Manage") : tx("Pending request")}
                      </button> : open ? <button type="button" className={`${styles.actionBtn} ${styles.actionPrimary}`} disabled={reqState === 'loading'} onClick={() => requestJoin(teamId)}>
                        {reqState === 'loading' ? tx("Requesting…") : tx("Request to join")}
                      </button> : <Link href={`/teams/${teamId}`} className={`${styles.actionBtn} ${styles.actionSecondary}`}>
                        {tt("ui.view.69bd", "View")}
                      </Link>}

                    <Link href={`/teams/${teamId}`} className={`${styles.actionBtn} ${styles.actionGhost}`}>
                      {tt("ui.profile.ff4f", "Profile")}
                    </Link>
                  </div>
                </div>
              </div>;
      })}
        </div>}

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>;
};
export default AllTeams;