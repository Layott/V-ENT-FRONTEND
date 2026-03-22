'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link';
import { LuGamepad2 } from "react-icons/lu";
import { AiOutlineTeam } from "react-icons/ai";
import { GoDotFill } from "react-icons/go";
import { FiPlus } from "react-icons/fi";
import menuContentStyles from '@/styles/menu/menu-content.module.css'
import tabStyles from '@/styles/modules/tabs/tabs.module.css';
import styles from './all-teams.module.css'

const AllTeams = () => {
    const [activeTab, setActiveTab] = useState('all');
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { data: session } = useSession();

    const handleTabClick = (tab) => {
        setActiveTab(tab);
    }

    useEffect(() => {
        const fetchTeams = async () => {
            try {
                const headers = { 'Content-Type': 'application/json' };
                if (session?.user?.sessionToken) {
                    headers['Authorization'] = `Bearer ${session.user.sessionToken}`;
                }
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/team/get-all-teams/`,
                    { method: 'GET', headers }
                );
                if (!response.ok) {
                    throw new Error(`Failed to load teams (${response.status})`);
                }
                const data = await response.json();
                const list = data?.data?.teams ?? data?.data ?? data ?? [];
                setTeams(Array.isArray(list) ? list : []);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchTeams();
    }, [session]);

    const getImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return `${process.env.NEXT_PUBLIC_API_URL}${path}`;
    };

  return (
    <div className={styles.allTeamsContainer}>
        <div className={styles.header}>
            <div>
                <h3>All Teams</h3>
            </div>
            <div>
                <button className={styles.createTeamBTN}><FiPlus className={styles.plusIcon} />Create Team</button>
            </div>
        </div>

        <div className={tabStyles.borderTabBTNContainer}>
            <button
                className={`${tabStyles.borderTabBTN} ${activeTab === 'all' ? tabStyles.active : ''}`}
                onClick={() => handleTabClick('all')}
            >
                All
            </button>

            <button
                className={`${tabStyles.borderTabBTN} ${activeTab === 'owned-by-me' ? tabStyles.active : ''}`}
                onClick={() => handleTabClick('owned-by-me')}
            >
                Owned by me
            </button>

            <button
                className={`${tabStyles.borderTabBTN} ${activeTab === 'other-teams' ? tabStyles.active : ''}`}
                onClick={() => handleTabClick('other-teams')}
            >
                Other teams
            </button>
        </div>

        {loading && <p>Loading teams...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}

        <div className={styles.cardsContainer}>
            {!loading && !error && teams.map((team) => {
                const teamId = team.id || team.team_id;
                const bannerUrl = getImageUrl(team.banner_url);
                const logoUrl = getImageUrl(team.logo_url);
                return (
                    <div key={teamId} className={styles.cardContainer}>
                        <div className={styles.imageContainer}>
                            {bannerUrl ? (
                                <Image src={bannerUrl} alt={team.name} fill style={{ objectFit: 'cover' }} />
                            ) : (
                                <div className={styles.placeholderBanner} />
                            )}
                        </div>
                        <div className={styles.badgeContainer}>
                            {logoUrl ? (
                                <Image src={logoUrl} alt={`${team.name} logo`} width={48} height={48} />
                            ) : (
                                <div className={styles.placeholderAvatar} />
                            )}
                        </div>
                        <div className={styles.descriptionContainer}>
                            <h4 className={styles.teamName}>{team.name}</h4>
                            <div className={styles.gameMemberContainer}>
                                <p className={menuContentStyles.gameParagraphHalf}>
                                    <span className={menuContentStyles.padIconSpan}><LuGamepad2 className={menuContentStyles.padIcon} /></span>
                                    <span className={menuContentStyles.gameNameSpan}>{team.core_game || 'N/A'}</span>
                                </p>
                                <GoDotFill className={styles.dotIcon} />
                                <p className={menuContentStyles.memberParagraphHalf}>
                                    <span className={menuContentStyles.participantIconSpan}><AiOutlineTeam className={menuContentStyles.teamsIcon} /></span>
                                    <span className={menuContentStyles.gameNameSpan}>{team.member_count || 0} Members</span>
                                </p>
                            </div>
                            <div className={styles.viewProfileContainer}>
                                <Link href={`/teams/team-profile?id=${teamId}`} className={styles.viewProfileBTN}>View Profile</Link>
                                <button className={styles.threeDotsBTN}>
                                    <GoDotFill className={styles.dotIcon} />
                                    <GoDotFill className={styles.dotIcon} />
                                    <GoDotFill className={styles.dotIcon} />
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
            {!loading && !error && teams.length === 0 && (
                <p>No teams found.</p>
            )}
        </div>

    </div>
  )
}

export default AllTeams
