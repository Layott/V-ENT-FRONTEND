import { useState } from "react";
import Image from "next/image"
import { GrTrophy } from "react-icons/gr"
import { FaArrowRight, FaArrowLeft } from "react-icons/fa";
import killSpreeBadge from "@/images/killing_spree_badge.webp"
import mortalKombatBadge from "@/images/mortal_kombat_badge.webp"
import marioKartBadge from '@/images/mario_kart_badge.webp'
import nbaThreeKWinBadge from '@/images/nba_three_k_wins_badge.webp'
import icarusBadge from '@/images/counter_striker_icarus_badge.webp'
import profileStyles from "@/styles/profile/profile-page.module.css"

const UserProfileAchievements = () => {
  const [showAll, setShowAll] = useState(false);
  const [visibleGames, setVisibleGames] = useState(6)

  const achievementsList = [
    { name: "Killing Spree 2024", src: killSpreeBadge },
    { name: "Counter Strike - King Cache", src: killSpreeBadge },
    { name: "Mortal Kombat - Premium", src: mortalKombatBadge },
    { name: "Mario Kart - King Banana", src: marioKartBadge },
    { name: "NBA 2k2024 - 3K wins", src: nbaThreeKWinBadge },
    { name: "Counter Strike - Icarus", src: icarusBadge },
    { name: "Call of Duty - Double Kill Master", src: killSpreeBadge },
    { name: "Mortal Kombat - Fatality Legend", src: mortalKombatBadge },
    { name: "Mario Kart - Speed Demon", src: marioKartBadge },
    { name: "NBA 2k2024 - Slam Dunk Champion", src: nbaThreeKWinBadge },
    { name: "Counter Strike - Eagle Eye", src: icarusBadge },
    { name: "Mario Kart - Drift King", src: marioKartBadge },
    { name: "Mortal Kombat - Flawless Victory", src: mortalKombatBadge },
    { name: "NBA 2k2024 - MVP 5K Wins", src: nbaThreeKWinBadge },
    { name: "Counter Strike - Stealth Assassin", src: icarusBadge }
  ];
  
  const handleSeeMoreAndLess = () => {
    setShowAll(prevState => !prevState);
    setVisibleGames(prevState => (prevState === achievementsList.length ? 6 : achievementsList.length)) 
  }

  
  return (
    <div className={`${profileStyles.achievementsContainer} ${profileStyles.middleLayerColor}`} style={{ position: 'relative' }}>
      
        <div className={profileStyles.achievementsHeader}>
          <h4 className={profileStyles.profileH4Header}>
              <GrTrophy className={profileStyles.achievementsIcon} />Achievements ({achievementsList.length})
          </h4>
          <button
            className={profileStyles.seeMoreBTN}
            onClick={handleSeeMoreAndLess}
            disabled
          >
            {showAll ? 'See less' : 'See more'}
            {showAll ? <FaArrowLeft className={profileStyles.rightArrowIcon} /> : <FaArrowRight className={profileStyles.rightArrowIcon} /> }
          </button>
        </div>

        <div className={profileStyles.blurredContainer}>

        <div className={profileStyles.gameOrAchievementContainer}>
          {achievementsList.slice(0, visibleGames).map((achievement, index) => (
            <div key={index} className={`${profileStyles.gameOrAchievementCard} ${profileStyles.achievementCard}`}>
                <div className={`${profileStyles.gameOrAchievementImageContainer} ${profileStyles.achievementImageContainer} ${profileStyles.topMostLayerColor}`}>
                  <Image
                    src={achievement.src}
                    alt={achievement.name}
                    className={`${profileStyles.gameOrAchievementImage} ${profileStyles.achievementImage}`}
                  />
                </div>
                <p className={profileStyles.gameOrAchievementName}>{achievement.name}</p>     
            </div>

          ))}        
        </div>
      </div>
      
      <div className={profileStyles.notAvailableOverlay}>
        <span>Coming soon</span>
      </div>
    </div>
  )
}

export default UserProfileAchievements;