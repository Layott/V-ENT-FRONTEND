import Image from "next/image"
import { GrGamepad } from "react-icons/gr"
import { FiPlus } from "react-icons/fi"
import eldenRing from "@/images/elden_ring.jpg"
import godOfWarRagnarok from "@/images/god_of_war.jpg"
import callOfDuty from "@/images/call_of_duty.jpg"
import tekken from "@/images/tekken_8.jpg"
import playerUnknowns from "@/images/playerunknowns_battlegrounds.png"
import profileStyles from "@/styles/user-profile/profile-page.module.css"
import styles from './favourite-game.module.css'


const FavouriteGame = () => {
  return (
    <div className={`${styles.favouriteGamesContainer} ${profileStyles.middleLayerColor}`}>
        <h4 className={styles.statsHeader}>
            <GrGamepad className={styles.statsIcon} />Favourite Games
        </h4>
        <div className={styles.favouriteGameContainer}>
            <div className={`${styles.favouriteGameCard} ${styles.addFavouriteGameCard}`}>
                <div className={`${styles.addGameIcons} ${profileStyles.topMostLayerColor}`}>
                    <span className={styles.plusIcon}><FiPlus /></span>
                    <span className={styles.addGameText}>Add Game</span>
                </div>
            </div>

        <div className={`${styles.favouriteGameCard}`}>
            <div className={styles.gameImageContainer}>
                <Image
                    src={eldenRing}
                    alt="Elden Ring"
                    className={styles.gameImage}
                    />
                <p className={styles.gameName}>Elden Ring</p>
            </div>
        </div>
        
        <div className={`${styles.favouriteGameCard}`}>
          <div className={styles.gameImageContainer}>
            <Image
              src={godOfWarRagnarok}
              alt="God of War Ragnarok"
              className={styles.gameImage}
            />
            <p className={styles.gameName}>God of WarRagnarök</p>
          </div>
        </div>

        <div className={`${styles.favouriteGameCard}`}>
          <div className={styles.gameImageContainer}>
            <Image
              src={callOfDuty}
              alt="Call of Duty, Black Ops III"
              className={styles.gameImage}
            />
            <p className={styles.gameName}>Call of Duty, Black Ops III</p>
          </div>
        </div>

        <div className={`${styles.favouriteGameCard}`}>
          <div className={styles.gameImageContainer}>
            <Image
              src={tekken}
              alt="Tekken 8"
              className={styles.gameImage}
            />
            <p className={styles.gameName}>Tekken 8</p>
          </div>
        </div>
        
        <div className={`${styles.favouriteGameCard}`}>
          <div className={styles.gameImageContainer}>
            <Image
              src={playerUnknowns}
              alt="Playerunknown’s Battleground"
              className={styles.gameImage}
            />
            <p className={styles.gameName}>Playerunknown’s Battleground</p>
          </div>
        </div>
        
      </div>

    </div>
  )
}

export default FavouriteGame