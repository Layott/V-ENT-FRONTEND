import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link';
import { LuGamepad2 } from "react-icons/lu";
import { AiOutlineTeam } from "react-icons/ai";
import { GoDotFill } from "react-icons/go";
import { FiPlus } from "react-icons/fi";
import { cardsData } from './cardDataList';
import menuContentStyles from '@/styles/menu/menu-content.module.css'
import styles from './all-teams.module.css'

const AllTeams = () => {
    const [activeTab, setActiveTab] = useState('all');

    const handleTabClick = (tab) => {
        setActiveTab(tab);
    }

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

        <div className={styles.tabsContainer}>
            <button
                className={`${styles.btn} ${activeTab === 'all' ? styles.active : ''}`}
                onClick={() => handleTabClick('all')}
            >
                All
            </button>

            <button
                className={`${styles.btn} ${activeTab === 'owned-by-me' ? styles.active : ''}`}
                onClick={() => handleTabClick('owned-by-me')}
            >
                Owned by me
            </button>

            <button
                className={`${styles.btn} ${activeTab === 'other-teams' ? styles.active : ''}`}
                onClick={() => handleTabClick('other-teams')}
            >
                Other teams
            </button>
        </div>

        <div className={styles.cardsContainer}>
            {cardsData.map((cardData, index) => (
            <div key={index} className={styles.cardContainer}>
                <div className={styles.imageContainer}>
                    <Image
                        src={cardData.bannerImage}
                        alt={cardData.bannerName}
                    />
                </div>
                <div className={styles.badgeContainer}>
                    <Image
                        src={cardData.teamAvatar}
                        alt={cardData.teamAvatarName}
                    />
                </div>
                <div className={styles.descriptionContainer}>
                    <h4 className={styles.teamName}>{cardData.teamName}</h4>
                    <div className={styles.gameMemberContainer}>
                        <p className={menuContentStyles.gameParagraphHalf}>
                            <span className={menuContentStyles.padIconSpan}><LuGamepad2 className={menuContentStyles.padIcon} /></span>
                            <span className={menuContentStyles.gameNameSpan}>{cardData.game}</span>
                        </p>
                        <GoDotFill className={styles.dotIcon} />
                        <p className={menuContentStyles.memberParagraphHalf}>
                            <span className={menuContentStyles.participantIconSpan}><AiOutlineTeam className={menuContentStyles.teamsIcon} /></span>
                            <span className={menuContentStyles.gameNameSpan}>{cardData.numberOfMembers} Members</span>
                        </p>
                    </div>
                    <div className={styles.viewProfileContainer}>
                        {/* <button className={styles.viewProfileBTN}>View Profile</button> */}
                        <Link href={'/team-profile'} className={styles.viewProfileBTN}>View Profile</Link>
                        <button className={styles.threeDotsBTN}>
                            <GoDotFill className={styles.dotIcon} />
                            <GoDotFill className={styles.dotIcon} />
                            <GoDotFill className={styles.dotIcon} />
                        </button>
                    </div>
                </div>
            </div>
            ))}
        </div>

    </div>
  )
}

export default AllTeams