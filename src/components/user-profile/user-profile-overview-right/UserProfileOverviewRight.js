import WalletPenalty from "./user-profile-wallet-penalty/UserProfileWalletPenalty";
import Stats from "./user-profile-stats/UserProfileStats";
import FavouriteGame from "./user-profile-favourite-games/UserProfileFavouriteGames";
import Achievements from "./user-profile-achievements/UserProfileAchievements";
import styles from './user-profile-overview-right.module.css'

const UserProfileOverviewRight = () => {
  return (
    <div className={styles.overviewRight}>
      <WalletPenalty />
      <Stats />
      <FavouriteGame />
      <Achievements />
  </div>
  )
}

export default UserProfileOverviewRight