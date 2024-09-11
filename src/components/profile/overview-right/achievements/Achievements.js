import { useState } from "react";
import Image from "next/image"
import { GrTrophy } from "react-icons/gr"
import { FaArrowRight } from "react-icons/fa";
import killSpree from "@/images/badge.webp"
import kingCache from "@/images/champion_arena.webp"
import trophy from "@/images/trophy.webp"
import premium from "@/images/champion_arena.webp"
import silver from "@/images/champion_arena.webp"
import threeKWins from "@/images/champion_arena.webp"
import icarus from "@/images/champion_arena.webp"
import goldenEagle from "@/images/champion_arena.webp"
import masterTactician from "@/images/champion_arena.webp"
import championArena from "@/images/champion_arena.webp"
import ultimateSurvivor from "@/images/champion_arena.webp"
import legendaryStreak from "@/images/champion_arena.webp"
import conqueror from "@/images/champion_arena.webp"
import profileStyles from "@/styles/profile/profile-page.module.css"
import styleGame from './../favourite-game/favourite-game.module.css'
import styles from './achievements.module.css'

const Achievements = () => {
  const [visibleGames, setVisibleGames] = useState(6)

  const achievementsData = [
    { name: "Killing Spree 2024", src: killSpree },
    { name: "King Cache", src: kingCache },
    { name: "Premium 2024", src: premium },
    { name: "Trophy", src: trophy },
    { name: "Silver", src: silver },
    { name: "3K Wins", src: threeKWins },
    { name: "Icarus", src: icarus },
    { name: "Golden Eagle", src: goldenEagle },
    { name: "Master Tactician", src: masterTactician },
    { name: "Champion of the Arena", src: championArena },
    { name: "Ultimate Survivor", src: ultimateSurvivor },
    { name: "Legendary Streak", src: legendaryStreak },
    { name: "Conqueror", src: conqueror },
  ];
  
  const handleSeeMore = () => {
    setVisibleGames(prevCount => prevCount + 5)     // Show 5 more games on click
  }
  
  return (
    <div className={`${styles.achievementsContainer} ${profileStyles.middleLayerColor}`}>
      <div className={styles.achievementsHeader}>
        <h4 className={styles.achievementsHeaderH4}>
            <GrTrophy className={styles.achievementsIcon} />Achievements ({achievementsData.length})
        </h4>
        <button
          className={styles.seeMoreBTN}
          onClick={handleSeeMore}
        >
          See more <FaArrowRight className={styles.rightArrowIcon} />
        </button>
      </div>

      <div className={styles.achievementContainer}>
        <div className={styleGame.favouriteGameContainer}>
          {achievementsData.slice(0, visibleGames).map((achievement, index) => (
            <div key={index} className={`${styleGame.favouriteGameCard} ${styles.favouriteAchievementCard}`}>
                <div className={`${styleGame.gameImageContainer} ${styles.achievementImageContainer} ${profileStyles.topMostLayerColor}`}>
                  <Image
                    src={achievement.src}
                    alt={achievement.name}
                    className={`${styleGame.gameImage} ${styles.achievementImage}`}
                  />
                </div>
                <p className={styleGame.gameName}>{achievement.name}</p>     
            </div>
          ))}        
        </div>

      </div>

    </div>
  )
}

export default Achievements