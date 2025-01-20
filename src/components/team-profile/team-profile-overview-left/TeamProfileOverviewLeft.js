import { useState } from 'react';
import Link from 'next/link'
import Image from 'next/image';
import counterStriker from '@/images/counter_striker.png'
import avatarBlackShirt from "@/images/avatar_black_shirt.webp"
import avatarBlackHair from "@/images/avatar_black_hair.webp"
import avatarGreenEye from '@/images/avatar_green_eye.webp'
import avatarYellowRobot from '@/images/avatar_yellow_robot.webp'
import avatarAnkara from '@/images/avatar_ankara.jpg'
import avatarColor from '@/images/avatar_color.webp'
import avatarPaint from '@/images/avatar_paint.webp'
import teamAvatar4 from '@/images/team_avatar_4.jpg'
import teamAvatar3 from '@/images/team_avatar_3.jpg'
import teamAvatar1 from '@/images/team_avatar_1.jpg'
import teamAvatar5 from '@/images/team_avatar_5.jpg'
import avatarRobotPC from '@/images/avatar_robot_pc.jpg'
import { FaFacebook, FaInstagram, FaYoutube, FaArrowRight, FaArrowLeft } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import profileStyles from "@/styles/profile/profile-page.module.css"

const TeamProfileOverviewLeft = () => {
    const [showMoreInterests, setShowMoreInterests] = useState(false)
    const [showAll, setShowAll] = useState(false);
    const [visibleGames, setVisibleGames] = useState(6)

    const interestsData = [
        'Multiplayer', 'Counter Striker', 'Shooting', 'Battle Royale', 'Elden Ring', 
        'Mortal Kombat', 'God of War', 'Manga', 'Black Myth Wukong', 'Cyberpunk 2077',
        'League of Legends', 'The Legend of Zelda', 'Call of Duty'
    ]

    const toggleShowMoreInterests = () => {
        setShowMoreInterests((prev) => !prev);
    }
    
    const membersList = [
        { name: "Lillie Smith", src: avatarBlackShirt },
        { name: "Jane Doe", src: avatarBlackHair },
        { name: "Alice Green", src: avatarGreenEye },
        { name: "Robo Yellow", src: avatarYellowRobot },
        { name: "Ankara Blue", src: avatarAnkara },
        { name: "Color Blaze", src: avatarColor },
        { name: "Paint Splash", src: avatarPaint },
        { name: "Alpha Team", src: teamAvatar4 },
        { name: "Beta Squad", src: teamAvatar3 },
        { name: "Gamma Crew", src: teamAvatar1 },
        { name: "Omega Unit", src: teamAvatar5 },
        { name: "Robo PC", src: avatarRobotPC }
    ];    
      
    const handleSeeMoreAndLess = () => {
        setShowAll(prevState => !prevState);
        setVisibleGames(prevState => (prevState === membersList.length ? 6 : membersList.length)) 
    }
    
  return (
    <div className={`${profileStyles.overviewLeft} ${profileStyles.overviewLeftTeamProfile}`}>
        <div className={`${profileStyles.innerOverviewLeft} ${profileStyles.middleLayerColor}`}>
            <div className={profileStyles.sectionContainer}>
                <h4 className={profileStyles.profileH4Header}>Focus Game</h4>
                <div className={profileStyles.innerFocusGameContainer}>

                    <div className={profileStyles.focusGameImageContainer}>
                        <Image
                            src={counterStriker}
                            alt="Counter Strike"
                            width={55}
                            height={55}
                            className={profileStyles.focusGameImage}
                        />
                    </div>

                    <div className={profileStyles.focusGameDetailsContainer}>
                        <h5 className={profileStyles.focusGameTitle}>Counter Strike</h5>
                        <p className={profileStyles.focusGameDescription}>
                            Multiplayer First Person Shooter
                        </p>
                    </div>

                </div>
            </div>
        </div>

        <div className={`${profileStyles.innerOverviewLeft} ${profileStyles.middleLayerColor}`}>
            <div className={profileStyles.membersHeader}>
                <h4 className={profileStyles.profileH4Header}>
                    Members ({membersList.length})
                </h4>
                <button
                    className={profileStyles.seeMoreBTN}
                    onClick={handleSeeMoreAndLess}
                >
                    {showAll ? 'See less' : 'See more'}
                    {showAll ? <FaArrowLeft className={profileStyles.rightArrowIcon} /> : <FaArrowRight className={profileStyles.rightArrowIcon} /> }
                </button>
            </div>

            <div className={profileStyles.membersContainer}>
                {membersList.slice(0, visibleGames).map((member, index) => (
                <div key={index} className={`${profileStyles.memberCard} ${profileStyles.topMostLayerColor}`}>
                    <div className={`${profileStyles.memberImageContainer}`}>
                        <Image
                            src={member.src}
                            alt={member.name}
                            // className={`${profileStyles.gameOrAchievementImage} ${profileStyles.achievementImage}`}
                        />
                    </div>
                    <p className={profileStyles.memberName}>{member.name}</p>
                </div>
                ))}        
            </div>
        </div>


        <div className={`${profileStyles.innerOverviewLeft} ${profileStyles.middleLayerColor}`}>
            <div className={profileStyles.sectionContainer}>
                <h4 className={profileStyles.profileH4Header}>Interests</h4>
                <div className={profileStyles.interestsListContainer}>
                    {interestsData.slice(0, showMoreInterests ? interestsData.length: 7).map((interest, index) => (
                        <span key={index} className={`${profileStyles.interest} ${profileStyles.topMostLayerColor}`}>
                            {interest}
                        </span>    
                    ))}

                    {interestsData.length > 7 && (
                        <button
                            onClick={toggleShowMoreInterests}
                            className={`${profileStyles.topMostLayerColor} ${profileStyles.showMoreBTN}`}
                        >
                            {showMoreInterests ? 'See less' : `See more + ${interestsData.length - 7}`}
                        </button>
                    )}
                </div>
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
    </div>
  )
}

export default TeamProfileOverviewLeft