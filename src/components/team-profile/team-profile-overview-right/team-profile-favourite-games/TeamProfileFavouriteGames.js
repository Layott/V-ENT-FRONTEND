import { useState } from "react";
import Image from "next/image"
import { GrGamepad } from "react-icons/gr"
import { FiPlus } from "react-icons/fi"
import { FaArrowRight } from "react-icons/fa";
import eldenRing from "@/images/elden_ring.webp"
import godOfWarRagnarok from "@/images/god_of_war.webp"
import callOfDuty from "@/images/call_of_duty.jpg"
import tekken from "@/images/tekken_8.webp"
import playerUnknowns from "@/images/playerunknowns_battlegrounds.webp"
import witcher3 from "@/images/witcher_3.webp"
import mortalKombat from "@/images/mortal_kombat_11.webp"
import apexLegends from "@/images/apex_legends.webp"
import profileStyles from "@/styles/profile/profile-page.module.css"
import styles from './team-profile-favourite-games.module.css'

const TeamProfileFavouriteGames = () => {
  const [visibleGames, setVisibleGames] = useState(5)

  const favouriteGameData = [
    { name: "Elden Ring", src: eldenRing },
    { name: "God of War Ragnarok", src: godOfWarRagnarok },
    { name: "Call of Duty, Black Ops III", src: callOfDuty },
    { name: "Tekken 8", src: tekken },
    { name: "Playerunknown\u0027s Battleground", src: playerUnknowns },
    { name: "The Witcher 3: Wild Hunt", src: witcher3 },
    { name: "Mortal Kombat 11", src: mortalKombat },
    { name: "Apex Legends", src: apexLegends },
  ]
  
  const handleSeeMore = () => {
    setVisibleGames(prevCount => prevCount + 5)     // Show 5 more games on click
  }
  
  return (
    <div className={`${styles.favouriteGamesContainer} ${profileStyles.middleLayerColor}`}>
        <div className={styles.statsHeader}>
          <h4 className={profileStyles.profileH4Header}>
              <GrGamepad className={profileStyles.profileH4Icons} />Favourite Games
          </h4>
          <button
            className={styles.seeMoreBTN}
            onClick={handleSeeMore}
          >
            See more <FaArrowRight className={styles.rightArrowIcon} />
          </button>
        </div>

        <div className={profileStyles.gameOrAchievementContainer}>
          <div className={`${profileStyles.gameOrAchievementCard} ${styles.addFavouriteGameCard}`}>
              <div className={`${styles.addGameIcons} ${profileStyles.topMostLayerColor}`}>
                  <span className={styles.plusIcon}><FiPlus /></span>
                  <span className={styles.addGameText}>Add Game</span>
              </div>
          </div>
          {favouriteGameData.slice(0, visibleGames).map((favouriteGame, index) => (
            <div key={index} className={`${profileStyles.gameOrAchievementCard}`}>
                <div className={profileStyles.gameOrAchievementImageContainer}>
                  <Image
                    src={favouriteGame.src}
                    alt={favouriteGame.name}
                    className={profileStyles.gameOrAchievementImage}
                  />
                  <p className={profileStyles.gameOrAchievementName}>{favouriteGame.name}</p>
                </div>     
            </div>
          ))}        
        </div>

    </div>
  )
}

export default TeamProfileFavouriteGames