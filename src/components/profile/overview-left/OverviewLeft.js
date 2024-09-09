import { useState } from 'react';
import Link from 'next/link'
import Image from 'next/image';
import playStation from '@/images/playstation.webp'
import xBox from '@/images/Xbox_logo.webp'
import godOfWar from '@/images/god_of_war.webp'
import fc25 from '@/images/fc25.webp'
import steam from '@/images/steam.webp'
import epicGames from '@/images/EpicGames.webp'
import nintendoSwitch from '@/images/NintendoSwitch.webp'
import { FaFacebook, FaInstagram, FaYoutube  } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { HiPlus } from "react-icons/hi";
import { MdDelete } from "react-icons/md";
import profileStyles from "@/styles/profile/profile-page.module.css"
import styles from './overview-left.module.css'

const OverviewLeft = () => {
    const [showMoreInterests, setShowMoreInterests] = useState(false)
    const [showMoreGamingAccounts, setShowMoreGamingAccounts] = useState(false)

    // Simulating Database
    // Interests Data
    const interestsData = [
        'Anime', 'Uncharted', 'FIFA', 'Elden Ring', 'Mortal Kombat',
        'God of War', 'Manga', 'Black Myth Wukong', 'Battle Royale',
        'Cyberpunk 2077', 'League of Legends', 'The Legend of Zelda', 'Call of Duty'
    ]

    // Gaming Accounts Data
    const gamingAccountsData = [
        { logo: playStation, name: 'PlayStation', handle: '@frostbite_psn' },
        { logo: xBox, name: 'XBox', handle: '@frostbite_xbox' },
        { logo: godOfWar, name: 'God of War', handle: '@frostbite_gow' },
        { logo: fc25, name: 'FC25', handle: '@frostbiteFC' },
        { logo: steam, name: 'Steam', handle: '@frostbite_steam' },
        { logo: epicGames, name: 'Epic Games', handle: '@frostbite_eg' },
        { logo: nintendoSwitch, name: 'Nintendo Switch', handle: '@frostbite_ns' }
    ]
    
    // Deleting/Remove Gaming Accounts
    const deleteGamingAccount = (index) => {
        console.log(`Removing gamin account at index: ${index}`)
    }

  return (
    <div className={`${styles.overviewLeft} ${profileStyles.middleLayerColor}`}>
        <div className={`${styles.interestsContainer} ${styles.sectionContainer}`}>
            <h4 className={styles.sectionHeader}>Interests</h4>
            <div className={`${styles.interestsListContainer} ${styles.contentListContainer}`}>
                {interestsData.slice(0, showMoreInterests ? interestsData.length: 9).map((interest, index) => (
                    <span key={index} className={`${styles.interest} ${profileStyles.topMostLayerColor}`}>
                        {interest}
                    </span>    
                ))}

                {!showMoreInterests && interestsData.length > 9 && (
                    <button
                        onClick={() => setShowMoreInterests(true)}
                        className={`${profileStyles.topMostLayerColor} ${styles.showMoreBTN}`}
                    >
                        See more +{interestsData.length - 9}
                    </button>
                )}

            </div>
        </div>

        <hr className={styles.sectionHr} />

        <div className={`${styles.gamingAccountsContainer} ${styles.sectionContainer}`}>
            <div className={styles.sectionHeader}>
                <h4>Gaming Accounts</h4>
                <button className={`${styles.addGameAccountBTN}`}>
                    <HiPlus  className={styles.plusIcon} /> Add
                </button>
            </div>
            <div className={`${styles.gamingAccountsListContainer} ${styles.contentListContainer}`}>
                {gamingAccountsData.slice(0, showMoreGamingAccounts ? gamingAccountsData.length : 4).map((account, index) => (
                    <div key={index} className={styles.gamingAccount}>
                        <div className={styles.gameDetails}>
                            <div className={styles.gameLogoAndName}>
                                <div className={styles.gameLogo}>
                                    <Image
                                        src={account.logo}
                                        alt={account.name}
                                    />
                                </div>
                                <div className={styles.gameName}>
                                    <h4>{account.name}</h4>
                                    <p className={styles.gamingAccountHandle}>{account.handle}</p>
                                </div>
                            </div>
                        </div>
                        <div
                            className={`${profileStyles.topMostLayerColor} ${styles.gamingAccountIcon}`}
                            onClick={() => deleteGamingAccount(index)}
                        >
                            {/* <TbUnlink className={styles.deleteIcon} /> */}
                            <MdDelete className={styles.deleteIcon} />
                        </div>
                    </div>
                ))}                
            </div>

            {!showMoreGamingAccounts && gamingAccountsData.length > 4 && (
                <button
                    className={`${styles.seeMoreAccountsBTN} ${profileStyles.topMostLayerColor}`}
                    onClick={() => setShowMoreGamingAccounts(true)}
                >
                    See more +{gamingAccountsData.length - 4}
                </button>
            )}

        </div>

        <hr className={styles.sectionHr} />

        <div className={`${styles.socialLinksContainer} ${styles.sectionContainer}`}>
            <h4 className={styles.sectionHeader}>Social Links</h4>
            <div className={`${styles.socialLinksListContainer} ${styles.contentListContainer}`}>
                <Link href={'./'} className={`${styles.socialLink} ${profileStyles.topMostLayerColor}`}>
                    <FaFacebook className={styles.socialIcon} /> Facebook
                </Link>
                <Link href={'./'} className={`${styles.socialLink} ${profileStyles.topMostLayerColor}`}>
                    <FaInstagram className={styles.socialIcon} /> Instagram
                </Link>
                <Link href={'./'} className={`${styles.socialLink} ${profileStyles.topMostLayerColor}`}>
                    <FaXTwitter className={styles.socialIcon} /> X (Twitter)
                </Link>
                <Link href={'./'} className={`${styles.socialLink} ${profileStyles.topMostLayerColor}`}>
                    <FaYoutube  className={styles.socialIcon} /> YouTube
                </Link>
            </div>
        </div>

  </div>
  )
}

export default OverviewLeft