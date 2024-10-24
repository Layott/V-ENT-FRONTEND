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
import { FaFacebook, FaInstagram, FaYoutube, FaArrowLeft } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { HiPlus } from "react-icons/hi";
import { MdDelete } from "react-icons/md";
import profileStyles from "@/styles/profile/profile-page.module.css"

const UserProfileOverviewLeft = () => {
    const [showMoreInterests, setShowMoreInterests] = useState(false)
    const [showMoreGamingAccounts, setShowMoreGamingAccounts] = useState(false)

    // Simulating Database
    // Interests Data

    const interestsList = [
        'Anime', 'Uncharted', 'FIFA', 'Elden Ring', 'Mortal Kombat',
        'God of War', 'Manga', 'Black Myth Wukong', 'Battle Royale',
        'Cyberpunk 2077', 'League of Legends', 'The Legend of Zelda', 'Call of Duty'
    ]

    // Gaming Accounts Data
    const gamingAccountsList = [
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
    <div className={`${profileStyles.overviewLeft} ${profileStyles.middleLayerColor}`}>
        <div className={profileStyles.sectionContainer}>
            <h4 className={profileStyles.profileH4Header}>Interests</h4>
            <div className={profileStyles.interestsListContainer}>
                {interestsList.slice(0, showMoreInterests ? interestsList.length: 9).map((interest, index) => (
                    <span key={index} className={`${profileStyles.interest} ${profileStyles.topMostLayerColor}`}>
                        {interest}
                    </span>    
                ))}

                <button
                    onClick={() => setShowMoreInterests(prev => !prev)}
                    className={`${profileStyles.topMostLayerColor} ${profileStyles.showMoreBTN}`}
                >
                    {showMoreInterests ? (
                        <>
                            <FaArrowLeft className={profileStyles.rightOrLeftArrowIcon} /> See less
                        </>
                    ) : (
                        `See more +${interestsList.length - 9}`
                    )}
                </button>

            </div>
        </div>

        <hr className={profileStyles.sectionHr} />

        <div className={profileStyles.sectionContainer}>
            <div className={profileStyles.sectionHeader}>
                <h4 className={profileStyles.profileH4Header}>Gaming Accounts</h4>
                <button className={`${profileStyles.addGameAccountBTN}`}>
                    <HiPlus  className={profileStyles.profileH4Icons} /> Add
                </button>
            </div>
            <div className={profileStyles.gamingAccountsListContainer}>
                {gamingAccountsList.slice(0, showMoreGamingAccounts ? gamingAccountsList.length : 4).map((account, index) => (
                    <div key={index} className={profileStyles.gamingAccount}>
                        <div>
                            <div className={profileStyles.gameLogoAndName}>
                                <div className={profileStyles.gameLogo}>
                                    <Image
                                        src={account.logo}
                                        alt={account.name}
                                    />
                                </div>
                                <div className={profileStyles.gameName}>
                                    <h4>{account.name}</h4>
                                    <p>{account.handle}</p>
                                </div>
                            </div>
                        </div>
                        <div
                            className={`${profileStyles.topMostLayerColor} ${profileStyles.gamingAccountIcon}`}
                            onClick={() => deleteGamingAccount(index)}
                        >
                            <MdDelete className={profileStyles.profileH4Icons} />
                        </div>
                    </div>
                ))}                
            </div>

            <button
                onClick={() => setShowMoreGamingAccounts(prev => !prev)}
                className={`${profileStyles.topMostLayerColor} ${profileStyles.seeMoreAccountsBTN}`}
            >
                {showMoreGamingAccounts ? (
                    <>
                        <FaArrowLeft className={profileStyles.rightOrLeftArrowIcon} /> See less
                    </>
                ) : (
                    `See more +${gamingAccountsList.length - 4}`
                )}
            </button>

        </div>

        <hr className={profileStyles.sectionHr} />

        <div className={profileStyles.sectionContainer}>
            <h4 className={profileStyles.sectionHeader}>Social Links</h4>
            <div className={profileStyles.socialLinksListContainer}>
                <Link href={'./'} className={`${profileStyles.socialLink} ${profileStyles.topMostLayerColor}`}>
                    <FaFacebook className={profileStyles.socialIcon} /> Facebook
                </Link>
                <Link href={'./'} className={`${profileStyles.socialLink} ${profileStyles.topMostLayerColor}`}>
                    <FaInstagram className={profileStyles.socialIcon} /> Instagram
                </Link>
                <Link href={'./'} className={`${profileStyles.socialLink} ${profileStyles.topMostLayerColor}`}>
                    <FaXTwitter className={profileStyles.socialIcon} /> X (Twitter)
                </Link>
                <Link href={'./'} className={`${profileStyles.socialLink} ${profileStyles.topMostLayerColor}`}>
                    <FaYoutube  className={profileStyles.socialIcon} /> YouTube
                </Link>
            </div>
        </div>

  </div>
  )
}

export default UserProfileOverviewLeft